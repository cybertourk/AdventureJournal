import { generateId, updateDerivedState, reRender, getUnifiedCatalog } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// --- DATABASE MANAGERS (FIRESTORE SYNC) ---


/**
 * Saves a dynamic roll table to the active campaign's subcollection.
 * @param {Object} tableData - The compiled roll table schema.
 */
export async function saveRollTable(tableData) {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    if (!tableData.id) tableData.id = 'table_' + generateId();
    
    // Safety check: ensure arrays exist
    if (!camp.rollTables) camp.rollTables = [];

    const isNew = !camp.rollTables.some(t => t.id === tableData.id);
    const updatedTables = isNew
        ? [...camp.rollTables, tableData]
        : camp.rollTables.map(t => t.id === tableData.id ? tableData : t);

    // Optimistic UI Update
    camp.rollTables = updatedTables;
    reRender(true);

    try {
        // Deep surgical save using our granular firebase-manager config
        const { doc, setDoc, db, appId } = await import('./firebase-config.js');
        const docRef = doc(db, 'artifacts', appId, 'campaigns', camp.id, 'rollTables', tableData.id);
        await setDoc(docRef, tableData, { merge: true });
        notify(`Table '${tableData.name}' saved to the archives.`, "success");
    } catch (e) {
        console.error("Failed to save roll table:", e);
        notify("Failed to sync roll table to the vault.", "error");
    }
}

/**
 * Deletes a dynamic roll table from the campaign.
 * @param {string} tableId - The unique ID of the table to destroy.
 */
export async function deleteRollTable(tableId) {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    if (!confirm("Are you sure you want to permanently delete this roll table? Any merchants assigned to it will lose their stocking source.")) return;

    camp.rollTables = (camp.rollTables || []).filter(t => t.id !== tableId);
    reRender(true);

    try {
        const { doc, deleteDoc, db, appId } = await import('./firebase-config.js');
        const docRef = doc(db, 'artifacts', appId, 'campaigns', camp.id, 'rollTables', tableId);
        await deleteDoc(docRef);
        notify("Roll table destroyed.", "success");
    } catch (e) {
        console.error("Failed to delete roll table:", e);
        notify("Failed to purge table from servers.", "error");
    }
}

// --- FOUNDRY VTT IMPORT ENGINE ---


/**
 * Parses raw JSON exported from Foundry VTT and transforms it into our lightweight system schema.
 * Supports document links (Items, NPCs, Journal entries), weights, custom ranges, and image paths.
 * @param {string} jsonString - The raw JSON text pasted by the DM.
 */
export async function importFoundryTable(jsonString) {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) {
        notify("Only the Dungeon Master can import dynamic libraries.", "error");
        return;
    }

    try {
        const parsed = JSON.parse(jsonString.trim());
        
        // Validate core structure
        if (!parsed.name || !Array.isArray(parsed.results)) {
            throw new Error("Missing table name or results array. Verify this is a Foundry export.");
        }

        const results = parsed.results.map(res => {
            // Determine if the item is a referenced document (VTT Item, Actor, etc.) or plain text
            let resultType = "text";
            let entityUuid = "";

            if (res.type === "document" || res.type === 1) {
                resultType = "document";
                entityUuid = res.documentUuid || res.collection || "";
            }

            return {
                id: res._id || generateId(),
                name: res.name || res.text || "Unnamed Result",
                type: resultType,
                documentUuid: entityUuid,
                image: res.img || "",
                weight: parseInt(res.weight) || 1,
                range: Array.isArray(res.range) ? [parseInt(res.range[0]), parseInt(res.range[1])] : [1, 1],
                description: res.description || ""
            };
        });

        const newTable = {
            id: 'table_' + generateId(),
            name: parsed.name,
            desc: parsed.description || "Imported from Foundry VTT.",
            formula: parsed.formula || `1d${results.length}`,
            image: parsed.img || "https://assets.forge-vtt.com/bazaar/core/icons/environment/settlement/market-stall.webp",
            results: results,
            sourceCompendium: parsed._stats?.exportSource?.uuid || ""
        };

        await saveRollTable(newTable);
    } catch (err) {
        console.error("Foundry Import Failure:", err);
        notify("Failed to parse Foundry JSON. Please ensure it is a valid export.", "error");
    }
}

// --- ROLLING & PROBABILITY ENGINE ---


/**
 * Executes a mathematically rigorous weighted rolling sequence on a table.
 * It tallies individual item weights, simulates a d(Total Weight) roll,
 * and walks through the probability brackets to determine the selected result.
 * @param {string} tableId - The ID of the table to roll on.
 * @returns {Promise<Object>} The resolved result entity containing metadata and full stats.
 */
export async function rollOnTable(tableId) {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return null;

    const table = (camp.rollTables || []).find(t => t.id === tableId);
    if (!table || !table.results || table.results.length === 0) {
        notify("Roll table is empty or missing.", "error");
        return null;
    }

    // 1. Calculate cumulative probability bounds
    let totalWeight = 0;
    const items = table.results.map(res => {
        const weight = parseInt(res.weight) || 1;
        const start = totalWeight + 1;
        const end = totalWeight + weight;
        totalWeight += weight;
        return { ...res, weight, rangeStart: start, rangeEnd: end };
    });

    // 2. Perform roll
    const rollValue = Math.floor(Math.random() * totalWeight) + 1;

    // 3. Find matching bracket
    const winner = items.find(item => rollValue >= item.rangeStart && rollValue <= item.rangeEnd);
    if (!winner) return null;

    // 4. Resolve winner properties dynamically
    const resolvedWinner = await resolveTableResult(winner);

    return {
        rolledValue: rollValue,
        totalWeight: totalWeight,
        formulaUsed: `1d${totalWeight}`,
        result: resolvedWinner
    };
}

// --- DYNAMIC RESULTS RESOLVER (FUTUREPROOF INTEGRATION) ---


/**
 * Dynamically resolves rolled results. If an item matches by name in the
 * local 16k static catalog (data-bazaar.js), customItems, or is a Codex entry,
 * it returns the full details, prices, stats, and custom images.
 * @param {Object} rawResult - The raw table result picked by the rolling engine.
 * @returns {Promise<Object>} The completed item or entity schema.
 */
export async function resolveTableResult(rawResult) {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return rawResult;

    const cleanName = rawResult.name.trim();
    const lowerName = cleanName.toLowerCase();

    // A. Check Codex Entries ( RACES, NPCS, FACTIONS, LORE, REGIONS )
    const codexMatch = (camp.codex || []).find(c => c.name.toLowerCase() === lowerName);
    if (codexMatch) {
        return {
            ...rawResult,
            resolvedType: 'codex',
            codexId: codexMatch.id,
            codexType: codexMatch.type,
            name: codexMatch.name,
            description: codexMatch.desc || rawResult.description,
            image: codexMatch.image || rawResult.image
        };
    }

    // B. Check Hero Manifest (PCs)
    const pcMatch = (camp.playerCharacters || []).find(p => p.name.toLowerCase() === lowerName);
    if (pcMatch) {
        return {
            ...rawResult,
            resolvedType: 'character',
            characterId: pcMatch.id,
            name: pcMatch.name,
            description: pcMatch.appearance || rawResult.description,
            image: pcMatch.image || rawResult.image
        };
    }

    // C. Check Unified Item Catalog (Local data-bazaar.js + Firestore customItems)
    const catalog = await getUnifiedCatalog();
    const catalogMatch = catalog.find(i => i.name.toLowerCase() === lowerName);
    if (catalogMatch) {
        return {
            ...rawResult,
            resolvedType: 'item',
            name: catalogMatch.name,
            type: catalogMatch.type || 'equipment',
            price: catalogMatch.price || 0,
            rarity: catalogMatch.rarity || 'common',
            isMagic: catalogMatch.isMagic || false,
            description: catalogMatch.description || rawResult.description,
            image: catalogMatch.image || rawResult.image,
            folder: catalogMatch.folder || ""
        };
    }

    // D. Generic Fallback (Return raw result as-is)
    return {
        ...rawResult,
        resolvedType: 'text',
        price: 0,
        rarity: 'custom',
        isMagic: false
    };
}
