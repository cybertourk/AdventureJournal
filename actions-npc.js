import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { NPC_TABLES } from './data-npc.js';

/**
 * NPC Generator Logic
 * Handles the weighted roll mechanics and Codex persistence.
 */

export const executeNpcGeneration = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const race = document.getElementById('npc-gen-race').value;
    const subrace = document.getElementById('npc-gen-subrace').value;
    const gender = document.getElementById('npc-gen-gender').value;
    const profession = document.getElementById('npc-gen-prof').value;

    // Helper: Simple Roll
    const rollTable = (tableName) => {
        const table = NPC_TABLES[tableName];
        if (!table || !table.results || table.results.length === 0) return "Unknown";
        
        // Simple weighted roll logic
        const totalWeight = table.results.reduce((sum, res) => sum + (res.weight || 1), 0);
        let roll = Math.floor(Math.random() * totalWeight);
        
        for (const res of table.results) {
            roll -= (res.weight || 1);
            if (roll < 0) return res.text;
        }
        return table.results[0].text;
    };

    // Determine final values (Targeting your specific table names!)
    const finalRace = race === 'random' ? rollTable("NPC Race") : race;
    const finalGender = gender === 'random' ? rollTable("Gender") : gender;
    const finalProf = profession === 'random' ? rollTable("Profession") : profession;
    
    // Sub-race selection
    let finalSubrace = "";
    if (subrace !== 'random' && subrace !== 'None Available') {
        finalSubrace = subrace;
    } else {
        // Try to roll for it if a table exists
        const subtableName = `Sub-Race (${finalRace})`;
        if (NPC_TABLES[subtableName]) {
            finalSubrace = rollTable(subtableName);
        }
    }

    // Name generation (Fallback if a specific name table isn't found)
    let name = rollTable(`Names (${finalRace})`);
    if (name === "Unknown") {
        name = `Unidentified ${finalRace}`; 
    }
    
    const newEntry = {
        id: generateId(),
        name: name,
        type: 'NPC',
        tags: ['Generated', finalRace, finalProf].filter(Boolean),
        desc: `A ${finalGender} ${finalRace} ${finalSubrace ? `(${finalSubrace})` : ''} working as a ${finalProf}.`,
        authorId: window.appData.currentUserUid,
        visibility: { mode: 'public' },
        race: finalRace,
        subrace: finalSubrace,
        gender: finalGender,
        profession: finalProf
    };

    // Append to Codex
    camp.codex = [...(camp.codex || []), newEntry];
    
    // Save to Firestore
    await saveCampaign(camp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`${name} successfully added to the Codex.`, "success");
    
    if (window.appActions.reRender) window.appActions.reRender();
};

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.executeNpcGeneration = executeNpcGeneration;
}
