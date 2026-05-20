import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { NPC_TABLES } from './data-npc.js';

// --- FAERÛN REGION TO ARCHETYPE MAPPING ---
const REGION_ARCHETYPE_MAP = {
    "Aglarond": "forest-and-wildland", "Alaron": "coastal-and-swamp", "Amn": "metropolis-and-urban",
    "Amphail": "rural-and-village", "Athalantar": "rural-and-village", "Baldur's Gate": "metropolis-and-urban",
    "Berdusk": "town-and-keep", "Besilmer": "mountain-and-underdark", "Beyond the Trackless Sea": "exotic-and-planar",
    "Blingdenstone": "mountain-and-underdark", "Boareskyr Bridge": "town-and-keep", "Calimshan": "desert-and-arid",
    "Candlekeep": "town-and-keep", "Chessenta": "metropolis-and-urban", "Chult": "forest-and-wildland",
    "Citadel Adbar": "mountain-and-underdark", "Citadel Felbarr": "mountain-and-underdark", "The Cold Lands": "arctic-and-tundra",
    "Cormyr": "metropolis-and-urban", "Daggerford": "town-and-keep", "The Dalelands": "rural-and-village",
    "Damara": "arctic-and-tundra", "Dambrath": "rural-and-village", "Darkhold": "town-and-keep",
    "Delzoun": "mountain-and-underdark", "Dragonspear Castle": "town-and-keep", "Eaerlann": "forest-and-wildland",
    "Elfharrow": "desert-and-arid", "Elturgard": "metropolis-and-urban", "Elturel": "metropolis-and-urban",
    "Evereska": "forest-and-wildland", "Evermeet": "exotic-and-planar", "Fields of the Dead": "rural-and-village",
    "Forest of Wyrms": "mountain-and-underdark", "Fort Tamal": "town-and-keep", "Gauntlgrym": "mountain-and-underdark",
    "Gharraghaur": "mountain-and-underdark", "Gracklstugh": "mountain-and-underdark", "Gundarlun": "coastal-and-swamp",
    "Gwynneth": "coastal-and-swamp", "Halruaa": "metropolis-and-urban", "Hardbuckler": "rural-and-village",
    "Hartsvale": "mountain-and-underdark", "Haungdannar": "coastal-and-swamp", "Helm's Hold": "town-and-keep",
    "High Forest": "forest-and-wildland", "High Moor": "rural-and-village", "The Hordelands": "desert-and-arid",
    "Icewind Dale": "arctic-and-tundra", "Illefarn": "forest-and-wildland", "Impiltur": "metropolis-and-urban",
    "Ironmaster": "mountain-and-underdark", "Kara-Tur": "exotic-and-planar", "Kingdom of Man": "rural-and-village",
    "Korinn Archipelago": "coastal-and-swamp", "The Lake of Steam": "coastal-and-swamp", "Lantan": "coastal-and-swamp",
    "Longsaddle": "rural-and-village", "The Lords' Alliance": "generic", "Luiren": "rural-and-village",
    "Luskan": "metropolis-and-urban", "Mantol-Derith": "mountain-and-underdark", "Marsh of Chelimber": "coastal-and-swamp",
    "Menzoberranzan": "mountain-and-underdark", "Mintarn": "coastal-and-swamp", "Mirabar": "mountain-and-underdark",
    "Mithral Hall": "mountain-and-underdark", "The Moonsea": "metropolis-and-urban", "The Moonshaes": "forest-and-wildland",
    "Moray": "coastal-and-swamp", "Mulhorand": "desert-and-arid", "Najara": "coastal-and-swamp",
    "Narfell": "arctic-and-tundra", "Nelanther Isles": "coastal-and-swamp", "Netheril": "desert-and-arid",
    "Neverwinter": "metropolis-and-urban", "Nimbral": "exotic-and-planar", "Norland": "coastal-and-swamp",
    "Northlander Isles": "arctic-and-tundra", "Oman's Isle": "coastal-and-swamp", "Orlumbor": "coastal-and-swamp",
    "Phalorm": "rural-and-village", "Purple Rocks": "coastal-and-swamp", "Rashemen": "arctic-and-tundra",
    "Rhymanthiin": "forest-and-wildland", "Ruathym": "arctic-and-tundra", "Scornubel": "town-and-keep",
    "Secomber": "rural-and-village", "Sembia": "metropolis-and-urban", "Serpent Hills": "rural-and-village",
    "Silverymoon": "metropolis-and-urban", "Skadaurak": "coastal-and-swamp", "Snowdown": "coastal-and-swamp",
    "Sossal": "arctic-and-tundra", "Soubar": "town-and-keep", "Sundabar": "mountain-and-underdark",
    "Ten-Towns": "arctic-and-tundra", "Tethyr": "metropolis-and-urban", "Thay": "metropolis-and-urban",
    "The Halfway Inn": "rural-and-village", "The Underdark": "mountain-and-underdark", "The Whalebones": "arctic-and-tundra",
    "Thornhold": "town-and-keep", "Trielta Hills": "rural-and-village", "Trollclaws": "mountain-and-underdark",
    "Tuern": "coastal-and-swamp", "Tymanther": "metropolis-and-urban", "Unther": "desert-and-arid",
    "Uthgardt Lands": "forest-and-wildland", "Vaasa": "arctic-and-tundra", "Warlock's Crypt": "exotic-and-planar",
    "Waterdeep": "metropolis-and-urban", "Westgate": "metropolis-and-urban", "Yartar": "town-and-keep",
    "Zakhara": "exotic-and-planar"
};

// --- HELPER FUNCTIONS ---

const isAlignmentCompatible = (npcAlignment, deityAlignment) => {
    if (!npcAlignment || !deityAlignment) return true;
    const alignMap = { "Lawful Good": "LG", "Neutral Good": "NG", "Chaotic Good": "CG", "Lawful Neutral": "LN", "True Neutral": "N", "Chaotic Neutral": "CN", "Lawful Evil": "LE", "Neutral Evil": "NE", "Chaotic Evil": "CE" };
    
    // Normalize string (e.g. "lawful good" -> "Lawful Good")
    const normalizedNpcAlignment = npcAlignment.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    const npcAbbr = alignMap[normalizedNpcAlignment];
    if (!npcAbbr) return false; 
    
    const normalizedDeityAlignment = deityAlignment.toUpperCase();
    
    // Ethos (Law/Chaos) distance
    const npcEthos = npcAbbr.includes('L') ? -1 : npcAbbr.includes('C') ? 1 : 0;
    const deityEthos = normalizedDeityAlignment.includes('L') ? -1 : normalizedDeityAlignment.includes('C') ? 1 : 0;
    
    // Morals (Good/Evil) distance
    const npcMorals = npcAbbr.includes('G') ? -1 : npcAbbr.includes('E') ? 1 : 0;
    const deityMorals = normalizedDeityAlignment.includes('G') ? -1 : normalizedDeityAlignment.includes('E') ? 1 : 0;
    
    // Must be within 1 step on the alignment grid
    return Math.abs(npcEthos - deityEthos) <= 1 && Math.abs(npcMorals - deityMorals) <= 1;
};

const rollTable = (tableName, filterFn = null) => {
    const table = NPC_TABLES[tableName];
    if (!table || !table.results || table.results.length === 0) return null;
    
    const maxAttempts = filterFn ? 20 : 1;
    
    for (let i = 0; i < maxAttempts; i++) {
        const totalWeight = table.results.reduce((sum, res) => sum + (res.weight || 1), 0);
        let roll = Math.floor(Math.random() * totalWeight);
        
        for (const res of table.results) {
            roll -= (res.weight || 1);
            if (roll < 0) {
                if (filterFn) {
                    if (filterFn(res)) return res.text;
                    break; // break inner loop, try again
                } else {
                    return res.text;
                }
            }
        }
    }
    
    return filterFn ? "Unaligned" : table.results[0].text;
};

// A smart resolver that tries to find the most specific table possible
const smartRoll = (traitName, race, subrace) => {
    let result = null;
    // 1. Try Sub-Race specific
    if (subrace) result = rollTable(`${traitName} (${subrace})`);
    // 2. Try Race specific
    if (!result && race) result = rollTable(`${traitName} (${race})`);
    // 3. Try Generic fallback
    if (!result) result = rollTable(traitName);
    return result;
};

// --- CORE GENERATOR ENGINE ---

/**
 * Generates all data for an NPC based on optional locks.
 * Exported so it can be called programmatically (e.g. by Carousing) without UI interaction.
 */
export const generateNpcData = (locks = {}) => {
    // 1. Core Identity
    const race = locks.race && locks.race !== 'random' ? locks.race : (rollTable("NPC Race") || "Human");
    let subrace = locks.subrace && locks.subrace !== 'random' ? locks.subrace : "";
    if (!subrace) {
        const subRolled = rollTable(`Sub-Race (${race})`);
        if (subRolled && subRolled !== 'None Available') subrace = subRolled;
    }
    const finalRaceStr = subrace ? `${race} (${subrace})` : race;

    const gender = locks.gender && locks.gender !== 'random' ? locks.gender : (rollTable("Gender") || "Female");
    const profession = locks.profession && locks.profession !== 'random' ? locks.profession : (rollTable("Profession") || "Commoner");
    const alignment = locks.alignment && locks.alignment !== 'random' ? locks.alignment : (rollTable("Alignment") || "True Neutral");

    // 2. Faith (Filtered by Alignment)
    const faithTable = `Faith (${subrace})` in NPC_TABLES ? `Faith (${subrace})` : (`Faith (${race})` in NPC_TABLES ? `Faith (${race})` : "Faith");
    const faithFilter = (res) => {
        let deityAlignment = null;
        const match = (res.text || "").match(/\(\s*(LG|NG|CG|LN|CN|LE|NE|CE|N)/i);
        if (match && match[1]) deityAlignment = match[1].toUpperCase();
        return isAlignmentCompatible(alignment, deityAlignment);
    };
    let faith = rollTable(faithTable, faithFilter);
    if (faith && faith !== "Unaligned") {
        // Strip out the alignment tags from the final string
        faith = faith.replace(/\s*\(\s*(LG|NG|CG|LN|CN|LE|NE|CE|N).*/i, '').trim();
    } else {
        faith = "Unaligned";
    }

    // 3. Birthplace Archetype Routing
    const birthRegion = smartRoll("Birth Region", race, subrace) || rollTable("Birth Region (Master)");
    let birthplace = null;
    
    // Check for a specific birthplace table first
    let specificBirthplaceTable = `Birthplace (${subrace})`;
    if (!NPC_TABLES[specificBirthplaceTable]) specificBirthplaceTable = `Birthplace (${race})`;

    if (NPC_TABLES[specificBirthplaceTable]) {
        birthplace = rollTable(specificBirthplaceTable);
    } else if (birthRegion) {
        // Map region to archetype
        const archetype = REGION_ARCHETYPE_MAP[birthRegion.trim()] || "generic";
        birthplace = rollTable(`Birthplace Archetype (${archetype})`) || rollTable(`Birthplace Archetype (generic)`);
    }

    // 4. Physical Traits
    const age = smartRoll("Age", race, subrace);
    const height = smartRoll("Height", race, subrace);
    const weight = smartRoll("Weight", race, subrace);
    const hair = smartRoll("Hair Color", race, subrace);
    const eyes = smartRoll("Eye Color", race, subrace);
    const skin = smartRoll("Skin Tone", race, subrace);
    const build = smartRoll("Build", race, subrace);
    const feature = smartRoll("Distinguishing Feature", race, subrace);

    // 5. Names
    let nameTableName = `Names, ${gender} (${race})`;
    if (!NPC_TABLES[nameTableName]) nameTableName = `First Names, ${gender} (${race})`; // Try alternate phrasing
    if (!NPC_TABLES[nameTableName]) nameTableName = `Names (${race})`;
    
    let firstName = rollTable(nameTableName);
    let lastName = smartRoll("Last Names", race, subrace) || smartRoll("Clan Names", race, subrace) || smartRoll("Surnames", race, subrace);
    
    let fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!fullName) fullName = `Unidentified ${race}`;

    // Assemble the Markdown Biography for the final Codex Entry
    let desc = `**Gender:** ${gender} | **Age:** ${age || '?'} | **Alignment:** ${alignment}\n`;
    desc += `**Profession:** ${profession} | **Faith:** ${faith}\n\n`;
    
    desc += `### Appearance\n`;
    desc += `**Height:** ${height || '?'} | **Weight:** ${weight || '?'} | **Build:** ${build || 'Average'}\n`;
    desc += `**Hair:** ${hair || '?'} | **Eyes:** ${eyes || '?'} | **Skin:** ${skin || '?'}\n`;
    if (feature) desc += `**Distinguishing Feature:** ${feature}\n`;
    
    desc += `\n### Background\n`;
    if (birthRegion) desc += `**Birth Region:** ${birthRegion}\n`;
    if (birthplace) desc += `**Birthplace:** ${birthplace}\n`;

    return {
        name: fullName,
        desc: desc,
        race: finalRaceStr,
        gender: gender,
        alignment: alignment,
        age: age,
        height: height,
        weight: weight,
        hair: hair,
        eyes: eyes,
        skin: skin,
        build: build,
        feature: feature,
        profession: profession,
        faith: faith,
        birthplace: birthplace,
        birthRegion: birthRegion,
        tags: ['Generated', finalRaceStr, profession].filter(Boolean)
    };
};

// --- UI EVENT HANDLERS ---

const renderNpcPreviewModal = (data) => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    // Filter and map the physical and background traits to match the Foundry preview exactly
    const listItems = [
        { label: "Race", val: data.race },
        { label: "Gender", val: data.gender },
        { label: "Alignment", val: data.alignment },
        { label: "Age", val: data.age },
        { label: "Height", val: data.height },
        { label: "Weight", val: data.weight },
        { label: "Hair", val: data.hair },
        { label: "Eyes", val: data.eyes },
        { label: "Skin", val: data.skin },
        { label: "Build", val: data.build },
        { label: "Feature", val: data.feature },
        { label: "Profession", val: data.profession },
        { label: "Faith", val: data.faith },
        { label: "Birthplace", val: data.birthplace },
        { label: "Birth Region", val: data.birthRegion }
    ].filter(item => item.val).map(item => `<li class="pb-1"><strong class="text-stone-900">${item.label}:</strong> <span class="text-stone-700">${item.val}</span></li>`).join('');

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-md border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-fuchsia-600 shadow-md flex justify-between items-center text-amber-50 shrink-0">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-clipboard-user mr-2 text-fuchsia-400"></i> NPC Preview</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div class="p-5 sm:p-6 bg-[#fdfbf7] overflow-y-auto custom-scrollbar flex-grow">
                    <p class="text-sm text-stone-700 italic mb-4 border-b border-[#d4c5a9] pb-4">The following NPC has been generated. How would you like to proceed?</p>
                    
                    <h3 class="text-xl font-serif font-bold text-red-900 mb-3 border-b border-[#d4c5a9] pb-1">${data.name}</h3>
                    
                    <ul class="text-sm space-y-1 ml-4 list-disc marker:text-stone-400 font-serif leading-snug">
                        ${listItems}
                    </ul>
                </div>
                
                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex flex-wrap sm:flex-nowrap justify-between gap-3 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="window.appActions.regenerateNpc()" class="w-full sm:w-auto px-4 py-2 bg-white text-stone-700 border border-stone-400 rounded-sm hover:bg-stone-100 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm flex justify-center items-center"><i class="fa-solid fa-dice mr-2"></i> Re-Generate</button>
                    
                    <div class="flex gap-2 w-full sm:w-auto justify-end">
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                        <button onclick="window.appActions.confirmNpcGeneration()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-user-plus mr-2"></i> Create NPC</button>
                    </div>
                </div>
                
            </div>
        </div>
    `;
};

export const executeNpcGeneration = () => {
    // Gather locks from the DOM if triggered from the main UI
    const race = document.getElementById('npc-gen-race')?.value;
    const subrace = document.getElementById('npc-gen-subrace')?.value;
    const gender = document.getElementById('npc-gen-gender')?.value;
    const profession = document.getElementById('npc-gen-prof')?.value;

    const locks = {};
    if (race && race !== 'random') locks.race = race;
    if (subrace && subrace !== 'random' && subrace !== 'None Available') locks.subrace = subrace;
    if (gender && gender !== 'random') locks.gender = gender;
    if (profession && profession !== 'random') locks.profession = profession;

    window.appData.tempNpcLocks = locks;
    
    const npcData = generateNpcData(locks);
    window.appData.tempNpcData = npcData;

    renderNpcPreviewModal(npcData);
};

export const regenerateNpc = () => {
    // Use the saved locks to re-roll
    const locks = window.appData.tempNpcLocks || {};
    const npcData = generateNpcData(locks);
    window.appData.tempNpcData = npcData;
    
    renderNpcPreviewModal(npcData);
};

export const confirmNpcGeneration = async () => {
    const npcData = window.appData.tempNpcData;
    if (!npcData) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const newEntry = {
        id: generateId(),
        name: npcData.name,
        type: 'NPC',
        tags: npcData.tags,
        desc: npcData.desc,
        authorId: window.appData.currentUserUid,
        visibility: { mode: 'public' },
        race: npcData.race,
        gender: npcData.gender,
        profession: npcData.profession
    };

    // Append to Codex
    camp.codex = [...(camp.codex || []), newEntry];
    
    // Save to Firestore
    await saveCampaign(camp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    
    // Clean up temp state
    window.appData.tempNpcData = null;
    window.appData.tempNpcLocks = null;

    notify(`${npcData.name} successfully added to the Codex.`, "success");
    
    // Force a re-render so the new NPC appears in the library instantly
    if (window.appActions.reRender) window.appActions.reRender(true);
};

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.executeNpcGeneration = executeNpcGeneration;
    window.appActions.regenerateNpc = regenerateNpc;
    window.appActions.confirmNpcGeneration = confirmNpcGeneration;
}
