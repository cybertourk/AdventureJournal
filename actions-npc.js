import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { NPC_TABLES } from './data-npc.js';

// --- FAERÛN REGION TO ARCHETYPE MAPPING ---
const REGION_ARCHETYPE_MAP = {
    "Aglarond": "Forest & Wildland", "Alaron": "Coastal & Swamp", "Amn": "Metropolis & Urban",
    "Amphail": "Rural & Village", "Athalantar": "Rural & Village", "Baldur's Gate": "Metropolis & Urban",
    "Berdusk": "Town & Keep", "Besilmer": "Mountain & Underdark", "Beyond the Trackless Sea": "Exotic & Planar",
    "Blingdenstone": "Mountain & Underdark", "Boareskyr Bridge": "Town & Keep", "Calimshan": "Desert & Arid",
    "Candlekeep": "Town & Keep", "Chessenta": "Metropolis & Urban", "Chult": "Forest & Wildland",
    "Citadel Adbar": "Mountain & Underdark", "Citadel Felbarr": "Mountain & Underdark", "The Cold Lands": "Arctic & Tundra",
    "Cormyr": "Metropolis & Urban", "Daggerford": "Town & Keep", "The Dalelands": "Rural & Village",
    "Damara": "Arctic & Tundra", "Dambrath": "Rural & Village", "Darkhold": "Town & Keep",
    "Delzoun": "Mountain & Underdark", "Dragonspear Castle": "Town & Keep", "Eaerlann": "Forest & Wildland",
    "Elfharrow": "Desert & Arid", "Elturgard": "Metropolis & Urban", "Elturel": "Metropolis & Urban",
    "Evereska": "Forest & Wildland", "Evermeet": "Exotic & Planar", "Fields of the Dead": "Rural & Village",
    "Forest of Wyrms": "Mountain & Underdark", "Fort Tamal": "Town & Keep", "Gauntlgrym": "Mountain & Underdark",
    "Gharraghaur": "Mountain & Underdark", "Gracklstugh": "Mountain & Underdark", "Gundarlun": "Coastal & Swamp",
    "Gwynneth": "Coastal & Swamp", "Halruaa": "Metropolis & Urban", "Hardbuckler": "Rural & Village",
    "Hartsvale": "Mountain & Underdark", "Haungdannar": "Coastal & Swamp", "Helm's Hold": "Town & Keep",
    "High Forest": "Forest & Wildland", "High Moor": "Rural & Village", "The Hordelands": "Desert & Arid",
    "Icewind Dale": "Arctic & Tundra", "Illefarn": "Forest & Wildland", "Impiltur": "Metropolis & Urban",
    "Ironmaster": "Mountain & Underdark", "Kara-Tur": "Exotic & Planar", "Kingdom of Man": "Rural & Village",
    "Korinn Archipelago": "Coastal & Swamp", "The Lake of Steam": "Coastal & Swamp", "Lantan": "Coastal & Swamp",
    "Longsaddle": "Rural & Village", "The Lords' Alliance": "Generic Fallback", "Luiren": "Rural & Village",
    "Luskan": "Metropolis & Urban", "Mantol-Derith": "Mountain & Underdark", "Marsh of Chelimber": "Coastal & Swamp",
    "Menzoberranzan": "Mountain & Underdark", "Mintarn": "Coastal & Swamp", "Mirabar": "Mountain & Underdark",
    "Mithral Hall": "Mountain & Underdark", "The Moonsea": "Metropolis & Urban", "The Moonshaes": "Forest & Wildland",
    "Moray": "Coastal & Swamp", "Mulhorand": "Desert & Arid", "Najara": "Coastal & Swamp",
    "Narfell": "Arctic & Tundra", "Nelanther Isles": "Coastal & Swamp", "Netheril": "Desert & Arid",
    "Neverwinter": "Metropolis & Urban", "Nimbral": "Exotic & Planar", "Norland": "Coastal & Swamp",
    "Northlander Isles": "Arctic & Tundra", "Oman's Isle": "Coastal & Swamp", "Orlumbor": "Coastal & Swamp",
    "Phalorm": "Rural & Village", "Purple Rocks": "Coastal & Swamp", "Rashemen": "Arctic & Tundra",
    "Rhymanthiin": "Forest & Wildland", "Ruathym": "Arctic & Tundra", "Scornubel": "Town & Keep",
    "Secomber": "Rural & Village", "Sembia": "Metropolis & Urban", "Serpent Hills": "Rural & Village",
    "Silverymoon": "Metropolis & Urban", "Skadaurak": "Coastal & Swamp", "Snowdown": "Coastal & Swamp",
    "Sossal": "Arctic & Tundra", "Soubar": "Town & Keep", "Sundabar": "Mountain & Underdark",
    "Ten-Towns": "Arctic & Tundra", "Tethyr": "Metropolis & Urban", "Thay": "Metropolis & Urban",
    "The Halfway Inn": "Rural & Village", "The Underdark": "Mountain & Underdark", "The Whalebones": "Arctic & Tundra",
    "Thornhold": "Town & Keep", "Trielta Hills": "Rural & Village", "Trollclaws": "Mountain & Underdark",
    "Tuern": "Coastal & Swamp", "Tymanther": "Metropolis & Urban", "Unther": "Desert & Arid",
    "Uthgardt Lands": "Forest & Wildland", "Vaasa": "Arctic & Tundra", "Warlock's Crypt": "Exotic & Planar",
    "Waterdeep": "Metropolis & Urban", "Westgate": "Metropolis & Urban", "Yartar": "Town & Keep",
    "Zakhara": "Exotic & Planar"
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
                    break;
                } else return res.text;
            }
        }
    }
    return filterFn ? "Unaligned" : table.results[0].text;
};

const cascadeRoll = (patterns) => {
    for (const p of patterns.filter(Boolean)) {
        const result = rollTable(p);
        if (result) return result;
    }
    return null;
};

export const generateNpcData = (locks = {}) => {
    const race = locks.race && locks.race !== 'random' ? locks.race : (rollTable("NPC Race") || "Human");
    let subrace = locks.subrace && locks.subrace !== 'random' ? locks.subrace : "";
    if (!subrace) {
        const subRolled = rollTable(`Sub-Race (${race})`);
        if (subRolled && subRolled !== 'None Available') subrace = subRolled;
    }
    const gender = locks.gender && locks.gender !== 'random' ? locks.gender : (rollTable("Gender") || "Female");
    const profession = locks.profession && locks.profession !== 'random' ? locks.profession : (rollTable("Profession") || "Commoner");
    const alignment = locks.alignment && locks.alignment !== 'random' ? locks.alignment : (rollTable("Alignment") || "True Neutral");

    const birthRegion = cascadeRoll([`Birth Region (${subrace})`, `Birth Region (Human - ${subrace})`, `Birth Region (${race})`, `Birth Region (Master)`]);
    let birthplace = cascadeRoll([`Birthplace (${subrace})`, `Birthplace (${race})`]);
    if (!birthplace && birthRegion) {
        const archetype = REGION_ARCHETYPE_MAP[birthRegion.trim()] || "Generic Fallback";
        birthplace = cascadeRoll([`Birthplace (${archetype})`, `Birthplace (Default)`]);
    }

    const age = cascadeRoll([`Age (${subrace})`, `Physical - Age (${subrace})`, `${subrace} Age`, `Age (${race})`, `Physical - Age (${race})`, `${race} Age`, `${race} Age (Default)`, `Age (Default ${race})`, `Age (Default)`]);
    const height = cascadeRoll([`Height (${subrace})`, `Physical - Height (${subrace})`, `${subrace} Height`, `Height (${race})`, `Physical - Height (${race})`, `${race} Height (Default)`, `Height (Default ${race})`, `Height (Default)`]);
    const weight = cascadeRoll([`Weight (${subrace})`, `Physical - Weight (${subrace})`, `${subrace} Weight`, `Weight (${race})`, `Physical - Weight (${race})`, `${race} Weight (Default)`, `Weight (Default ${race})`, `Weight (Default)`]);
    const hair = cascadeRoll([`Hair Color (${subrace})`, `Hair (${subrace})`, `Physical - Hair Color (${subrace})`, `${subrace} Hair Color`, `Hair Color (${race})`, `Hair (${race})`, `Physical - Hair Color (${race})`, `${race} Hair Color (Default)`, `Hair Color (Default ${race})`, `Hair (Default)`]);
    const eyes = cascadeRoll([`Eye Color (${subrace})`, `Physical - Eye Color (${subrace})`, `${subrace} Eye Color`, `Eye Color (${race})`, `Physical - Eye Color (${race})`, `${race} Eye Color (Default)`, `Eye Color (Default ${race})`, `Eye Color (Default)`]);
    const skin = cascadeRoll([`Skin Tone (${subrace})`, `Physical - Skin Tone (${subrace})`, `${subrace} Skin Tone`, `Skin Tone (${race})`, `Physical - Skin Tone (${race})`, `${race} Skin Tone (Default)`, `Skin Tone (Default ${race})`, `Skin Tone (Default)`]);
    const build = cascadeRoll([`Build (${subrace})`, `Build (${race})`, `Build (Default ${race})`, `Build (Default)`]);
    const feature = cascadeRoll([`Feature (${subrace})`, `Feature (${race})`, `Feature (Default ${race})`, `Distinguishing Feature (Default)`, `Feature (Default)`]);

    const firstName = cascadeRoll([`${gender === 'Male' ? 'Male Name' : 'Female Name'} (${subrace})`, `Names (${gender === 'Male' ? 'Male' : 'Female'}, ${subrace})`, `${firstNameBase = gender === 'Male' ? 'Male Name' : 'Female Name'} (${race})`, `Names (${gender === 'Male' ? 'Male' : 'Female'}, ${race})`]);
    const lastName = cascadeRoll([`Last Name (${subrace})`, `Names (Last, ${subrace})`, `Last Name (${race})`, `Names (Last, ${race})`]);
    
    return {
        name: [firstName, lastName].filter(Boolean).join(" ") || `Unidentified ${race}`,
        race: subrace ? `${race} (${subrace})` : race,
        gender, alignment, age, height, weight, hair, eyes, skin, build, feature, profession,
        birthplace, birthRegion, tags: ['Generated', race, profession].filter(Boolean)
    };
};

const renderNpcPreviewModal = (data) => {
    const container = document.getElementById('global-popup-container');
    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-md shadow-2xl relative">
                <div class="bg-stone-900 p-4 border-b-4 border-fuchsia-600 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-bold">NPC Preview</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = ''" class="text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    <h3 class="text-xl font-serif font-bold text-red-900 mb-2">${data.name}</h3>
                    <ul class="text-sm space-y-1">
                        ${Object.entries(data).filter(([k,v])=>['race','gender','alignment','age','profession'].includes(k)).map(([k,v])=>`<li><strong>${k}:</strong> ${v}</li>`).join('')}
                    </ul>
                </div>
                <div class="bg-[#e8dec7] p-4 flex justify-between gap-2">
                    <button onclick="window.appActions.regenerateNpc()" class="px-4 py-2 bg-white border border-stone-400 rounded-sm hover:bg-stone-100">Re-Generate</button>
                    <button onclick="window.appActions.confirmNpcGeneration()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm">Create NPC</button>
                </div>
            </div>
        </div>
    `;
};

export const regenerateNpc = () => {
    const data = generateNpcData(window.appData.tempNpcLocks || {});
    window.appData.tempNpcData = data;
    renderNpcPreviewModal(data);
};

export const confirmNpcGeneration = async () => {
    const npcData = window.appData.tempNpcData;
    if (!npcData) return;
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;
    camp.codex = [...(camp.codex || []), { ...npcData, id: generateId(), type: 'NPC', authorId: window.appData.currentUserUid }];
    await saveCampaign(camp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("NPC added to the Codex.", "success");
    if (window.appActions.reRender) window.appActions.reRender(true);
};

// Force global exposure
window.appActions = {
    ...window.appActions,
    regenerateNpc,
    confirmNpcGeneration,
    executeNpcGeneration: () => {
        const data = generateNpcData({});
        window.appData.tempNpcData = data;
        renderNpcPreviewModal(data);
    }
};
