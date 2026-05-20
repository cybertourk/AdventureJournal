import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { NPC_TABLES } from './data-npc.js';

// --- FAERÛN REGION TO ARCHETYPE MAPPING ---
// Updated to exactly match the new Roll Table syntax (e.g. "Forest & Wildland")
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

// --- HELPER FUNCTIONS ---

const isAlignmentCompatible = (npcAlignment, deityAlignment) => {
    if (!npcAlignment || !deityAlignment) return true;
    const alignMap = { "Lawful Good": "LG", "Neutral Good": "NG", "Chaotic Good": "CG", "Lawful Neutral": "LN", "True Neutral": "N", "Chaotic Neutral": "CN", "Lawful Evil": "LE", "Neutral Evil": "NE", "Chaotic Evil": "CE" };
    
    const normalizedNpcAlignment = npcAlignment.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    const npcAbbr = alignMap[normalizedNpcAlignment];
    if (!npcAbbr) return false; 
    
    const normalizedDeityAlignment = deityAlignment.toUpperCase();
    
    const npcEthos = npcAbbr.includes('L') ? -1 : npcAbbr.includes('C') ? 1 : 0;
    const deityEthos = normalizedDeityAlignment.includes('L') ? -1 : normalizedDeityAlignment.includes('C') ? 1 : 0;
    
    const npcMorals = npcAbbr.includes('G') ? -1 : npcAbbr.includes('E') ? 1 : 0;
    const deityMorals = normalizedDeityAlignment.includes('G') ? -1 : normalizedDeityAlignment.includes('E') ? 1 : 0;
    
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
                    break; 
                } else {
                    return res.text;
                }
            }
        }
    }
    
    return filterFn ? "Unaligned" : table.results[0].text;
};

// A highly robust cascade resolver that tries multiple naming variations found in your JSON
const cascadeRoll = (patterns) => {
    const validPatterns = patterns.filter(Boolean);
    for (const p of validPatterns) {
        const result = rollTable(p);
        if (result) return result;
    }
    return null;
};

// --- CORE GENERATOR ENGINE ---

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
    let faithTableToUse = null;
    const faithTables = [`Faith (${subrace})`, `Faith (${race})`, `Faith (Default ${race})`, `Faith (Master List)`].filter(Boolean);
    for (const t of faithTables) {
        if (NPC_TABLES[t]) { faithTableToUse = t; break; }
    }

    let faith = null;
    if (faithTableToUse) {
        const faithFilter = (res) => {
            let deityAlignment = null;
            const match = (res.text || "").match(/\(\s*(LG|NG|CG|LN|CN|LE|NE|CE|N)/i);
            if (match && match[1]) deityAlignment = match[1].toUpperCase();
            return isAlignmentCompatible(alignment, deityAlignment);
        };
        faith = rollTable(faithTableToUse, faithFilter);
        if (faith && faith !== "Unaligned") {
            faith = faith.replace(/\s*\(\s*(LG|NG|CG|LN|CN|LE|NE|CE|N).*/i, '').trim();
        } else {
            faith = "Unaligned";
        }
    } else {
        faith = "Unaligned";
    }

    // 3. Birthplace Archetype Routing
    const birthRegion = cascadeRoll([`Birth Region (${subrace})`, `Birth Region (Human - ${subrace})`, `Birth Region (${race})`, `Birth Region (Master)`]);
    let birthplace = cascadeRoll([`Birthplace (${subrace})`, `Birthplace (${race})`]);
    
    if (!birthplace && birthRegion) {
        const archetype = REGION_ARCHETYPE_MAP[birthRegion.trim()] || "Generic Fallback";
        birthplace = cascadeRoll([`Birthplace (${archetype})`, `Birthplace (Default)`]);
    }

    // 4. Physical Traits (Using the robust cascade resolver)
    const age = cascadeRoll([`Age (${subrace})`, `Physical - Age (${subrace})`, `${subrace} Age`, `Age (${race})`, `Physical - Age (${race})`, `${race} Age`, `${race} Age (Default)`, `Age (Default ${race})`, `Age (Default)`]);
    const height = cascadeRoll([`Height (${subrace})`, `Physical - Height (${subrace})`, `${subrace} Height`, `Height (${race})`, `Physical - Height (${race})`, `${race} Height (Default)`, `Height (Default ${race})`, `Height (Default)`]);
    const weight = cascadeRoll([`Weight (${subrace})`, `Physical - Weight (${subrace})`, `${subrace} Weight`, `Weight (${race})`, `Physical - Weight (${race})`, `${race} Weight (Default)`, `Weight (Default ${race})`, `Weight (Default)`]);
    const hair = cascadeRoll([`Hair Color (${subrace})`, `Hair (${subrace})`, `Physical - Hair Color (${subrace})`, `${subrace} Hair Color`, `Hair Color (${race})`, `Hair (${race})`, `Physical - Hair Color (${race})`, `${race} Hair Color (Default)`, `Hair Color (Default ${race})`, `Hair (Default)`]);
    const eyes = cascadeRoll([`Eye Color (${subrace})`, `Physical - Eye Color (${subrace})`, `${subrace} Eye Color`, `Eye Color (${race})`, `Physical - Eye Color (${race})`, `${race} Eye Color (Default)`, `Eye Color (Default ${race})`, `Eye Color (Default)`]);
    const skin = cascadeRoll([`Skin Tone (${subrace})`, `Physical - Skin Tone (${subrace})`, `${subrace} Skin Tone`, `Skin Tone (${race})`, `Physical - Skin Tone (${race})`, `${race} Skin Tone (Default)`, `Skin Tone (Default ${race})`, `Skin Tone (Default)`]);
    const build = cascadeRoll([`Build (${subrace})`, `Build (${race})`, `Build (Default ${race})`, `Build (Default)`]);
    const feature = cascadeRoll([`Feature (${subrace})`, `Feature (${race})`, `Feature (Default ${race})`, `Distinguishing Feature (Default)`, `Feature (Default)`]);

    // 5. Names
    const firstNameBase = gender === 'Male' ? 'Male Name' : 'Female Name';
    const altNameBase = gender === 'Male' ? 'Male' : 'Female';
    
    let firstName = cascadeRoll([
        `${firstNameBase} (${subrace})`,
        `Names (${altNameBase}, ${subrace})`,
        `${subrace} First Name - ${gender}`,
        `${firstNameBase} (${race})`,
        `Names (${altNameBase}, ${race})`,
        `${firstNameBase} (Default ${race})`
    ]);

    let lastName = cascadeRoll([
        `Last Name (${subrace})`,
        `Names (Last, ${subrace})`,
        `Names (Tribe, ${subrace})`,
        `${subrace} Last Name`,
        `Last Name (${race})`,
        `Names (Last, ${race})`,
        `Last Name (Default ${race})`
    ]);
    
    let fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!fullName) fullName = `Unidentified ${race}`;

    // Assemble the Markdown Biography for the final Codex Entry
    let desc = `**Gender:** ${gender} | **Age:** ${age || '?'} | **Alignment:** ${alignment}\n`;
    desc += `**Profession:** ${profession} | **Faith:** ${faith || 'Unaligned'}\n\n`;
    
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

    // Filter and map the physical and background traits
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
    
    await saveCampaign(camp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    
    window.appData.tempNpcData = null;
    window.appData.tempNpcLocks = null;

    notify(`${npcData.name} successfully added to the Codex.`, "success");
    
    if (window.appActions.reRender) window.appActions.reRender(true);
};

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.executeNpcGeneration = executeNpcGeneration;
    window.appActions.regenerateNpc = regenerateNpc;
    window.appActions.confirmNpcGeneration = confirmNpcGeneration;
}
