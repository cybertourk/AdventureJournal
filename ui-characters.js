import { renderSmartField } from './ui-core.js';
import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// --- HELPER FOR BIRTHDAY BOONS ---
const boonOptionsData = [
    {val: "Mark of the Hero", label: "Mark of the Hero (+1 Ability Score)"},
    {val: "Fortify", label: "Fortify (+15 Temp HP as BA once/adv)"},
    {val: "Skillful", label: "Skillful (1 Skill + 1 Language/Tool)"},
    {val: "Well-trained", label: "Well-trained (1 Weapon Prof)"},
    {val: "Weave Child", label: "Weave Child (1 Cantrip)"},
    {val: "Aggressive", label: "Aggressive (+1 Action once/adv)"},
    {val: "Capable", label: "Capable (1 Save Prof)"},
    {val: "Quickened", label: "Quickened (+10ft Movement)"},
    {val: "On Edge", label: "On Edge (+4 Initiative)"}
];

const renderBoonSelect = (id, selectedVal, extraClass="") => {
    let html = `<select id="${id}" class="w-full p-2 border border-amber-300 rounded-sm text-sm font-bold text-stone-900 shadow-sm outline-none focus:border-amber-600 bg-white ${extraClass}">`;
    html += `<option value="">-- No Boon Unlocked --</option>`;
    boonOptionsData.forEach(b => {
        html += `<option value="${b.val}" ${selectedVal === b.val ? 'selected' : ''}>${b.label}</option>`;
    });
    html += `</select>`;
    return html;
};

export function getPCManagerHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    
    // NEW FILTER LOGIC: Hide Private Heroes from unauthorized players
    const allPcs = camp.playerCharacters || [];
    const pcs = allPcs.filter(pc => {
        if (!pc.isPrivate) return true; // Public, everyone sees
        if (isDM) return true; // DM sees all
        if (pc.playerId === myUid) return true; // Owner sees their own private hero
        return false;
    });

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Party Manifest</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic">Heroes of ${camp.name}</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                ${isDM ? `
                <button onclick="window.appActions.openDndBeyondImportModal()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-stone-800 text-amber-50 border border-stone-900 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-file-import mr-2"></i> Import Hero
                </button>
                <button onclick="window.appActions.openPCEdit(null)" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-950 text-amber-50 border border-red-950 rounded-sm hover:bg-red-900 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-user-plus mr-2"></i> Enroll Hero
                </button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
    `;

    if (pcs.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-users-slash text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The tavern is currently empty.</p>
            </div>
        `;
    } else {
        pcs.forEach(pc => {
            const classLevel = pc.classLevel || "Unknown Class";
            const race = pc.race || "Unknown Race";
            
            // Determine permissions
            const isOwner = pc.playerId === myUid;
            const canEdit = isDM || isOwner;

            // --- BOON & RESOURCE CALCULATIONS ---
            let maxInsp = 0;
            if (pc.boonBackstory) maxInsp += 1;
            if (pc.boon2ndBday) maxInsp += 1;
            
            // Legacy support: if inspiration was saved as a boolean previously, convert it to 1 or 0 for display
            const currentInsp = pc.inspiration === true ? 1 : (parseInt(pc.inspiration) || 0);
            
            // The badge only shows if the player has unlocked the feature AND it is currently available to use!
            const hasAutoSuccess = pc.automaticSuccess === true && pc.unlockAutoSuccess === true;
            
            const downtimeDays = parseInt(pc.availableDowntime) || 0;

            const activeBoons = [];
            if (pc.boon1stBday) activeBoons.push(`1st B-Day: ${pc.boon1stBday}`);
            if (pc.boon2ndBday) activeBoons.push(`2nd B-Day: ${pc.boon2ndBday}`);
            
            // Render any additional boons past the 2nd
            if (pc.extraBdayBoons && Array.isArray(pc.extraBdayBoons)) {
                pc.extraBdayBoons.forEach((boon, idx) => {
                    if (boon) {
                        const boonNum = idx + 3;
                        const suffix = boonNum === 3 ? 'rd' : 'th';
                        activeBoons.push(`${boonNum}${suffix} B-Day: ${boon}`);
                    }
                });
            }

            let resourceBadge = `
            <div class="mt-3 flex gap-2 flex-wrap">
                <div class="bg-amber-100 border border-amber-300 text-amber-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm" title="Inspiration (Max: ${maxInsp})">
                    <i class="fa-solid fa-dice-d20 mr-1.5 text-amber-600"></i> Insp: ${currentInsp} / ${maxInsp}
                </div>
                ${hasAutoSuccess ? `
                <div class="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm" title="Automatic Success Available">
                    <i class="fa-solid fa-check-double mr-1.5 text-emerald-600"></i> Auto-Success
                </div>
                ` : ''}
                <div class="bg-blue-100 border border-blue-300 text-blue-800 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm" title="Available Downtime Days">
                    <i class="fa-solid fa-hourglass-half mr-1.5 text-blue-600"></i> ${downtimeDays} Days
                </div>
            </div>
            `;

            let boonsHtml = '';
            if (activeBoons.length > 0) {
                boonsHtml = `
                <div class="mt-3 pt-3 border-t border-[#d4c5a9]/50 text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-tight">
                    ${activeBoons.map(b => `<div class="mt-1 flex items-start"><i class="fa-solid fa-gift text-amber-500 mr-1.5 mt-0.5"></i> <span class="text-stone-700">${b}</span></div>`).join('')}
                </div>
                `;
            }

            const privateBadge = pc.isPrivate ? `<span class="bg-red-900 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold shadow-sm ml-2 align-middle whitespace-nowrap" title="Hidden from other players"><i class="fa-solid fa-user-secret mr-1"></i> Private</span>` : '';

            html += `
            <div class="bg-[#fdfbf7] p-0 sm:p-0 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col group relative overflow-hidden hover:shadow-md transition">
                <div class="absolute top-0 left-0 w-1 h-full ${canEdit ? 'bg-red-900 group-hover:bg-red-700' : 'bg-stone-400 group-hover:bg-amber-600'} transition-colors z-20"></div>
                
                ${pc.image ? `<div class="h-32 sm:h-48 w-full overflow-hidden border-b border-[#d4c5a9] bg-stone-900"><img src="${pc.image}" alt="${pc.name}" class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none'"></div>` : ''}
                
                <div class="p-4 sm:p-5 pl-5 sm:pl-6 flex flex-col justify-between flex-grow">
                    <div>
                        <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-900 truncate leading-tight flex items-center">${pc.name} ${privateBadge}</h3>
                        <p class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1 sm:mt-2">
                            ${race} <span class="mx-1">•</span> ${classLevel}
                        </p>
                        ${resourceBadge}
                        ${boonsHtml}
                    </div>
                    <div class="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#d4c5a9]/50 flex flex-wrap gap-4">
                        ${canEdit ? `
                        <button onclick="window.appActions.openPCEdit('${pc.id}')" class="text-stone-700 hover:text-red-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition relative">
                            <i class="fa-solid fa-book-open mr-1.5"></i> Private Journal
                        </button>
                        ${pc.ddbId ? `
                        <button onclick="window.appActions.quickSyncDDB('${pc.id}')" class="text-stone-700 hover:text-emerald-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition relative" title="Sync with D&D Beyond">
                            <i class="fa-solid fa-cloud-arrow-down mr-1.5"></i> Sync
                        </button>
                        ` : ''}
                        ` : ''}
                        <button onclick="window.appActions.viewCodex('${pc.id}')" class="text-stone-700 hover:text-amber-600 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition">
                            <i class="fa-solid fa-address-card mr-1.5"></i> Public Profile
                        </button>
                    </div>
                </div>
            </div>
            `;
        });
    }

    html += `
        </div>
    `;

    // --- CONNECTED PLAYERS UI (DM ONLY) ---
    if (isDM) {
        const activePlayerUIDs = camp.activePlayers || [];
        const playerNames = camp.playerNames || {};
        const connectedPlayers = activePlayerUIDs.filter(uid => uid !== camp.dmId);

        html += `
        <div class="mt-12 border-t-2 border-stone-800 pt-8 mb-8">
            <h3 class="text-xl font-serif font-bold text-amber-50 mb-4 flex items-center">
                <i class="fa-solid fa-users mr-3 text-red-900"></i> Connected Players
            </h3>
            <div class="bg-[#f4ebd8] p-4 sm:p-6 rounded-sm border border-[#d4c5a9] shadow-inner">
        `;

        if (connectedPlayers.length === 0) {
            html += `<p class="text-stone-500 italic text-sm font-serif text-center py-4">No players have joined this campaign yet.</p>`;
        } else {
            html += `<ul class="space-y-3">`;
            connectedPlayers.forEach(uid => {
                const pName = playerNames[uid] || "Unknown Player / Deleted Account";
                html += `
                <li class="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#fdfbf7] p-3 sm:p-4 border border-[#d4c5a9] rounded-sm shadow-sm gap-3">
                    <div>
                        <span class="font-bold text-stone-900 text-base block">${pName}</span>
                        <span class="text-[10px] text-stone-500 font-mono uppercase tracking-widest block mt-0.5">ID: ${uid}</span>
                    </div>
                    <button onclick="window.appActions.kickPlayer('${uid}')" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-800 hover:text-red-500 border border-red-800/30 hover:border-red-500 bg-red-900/10 px-3 py-2 rounded-sm transition flex items-center justify-center sm:justify-start shadow-sm w-full sm:w-auto">
                        <i class="fa-solid fa-user-minus mr-2"></i> Kick Player
                    </button>
                </li>
                `;
            });
            html += `</ul>`;
        }
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

export function getPCEditHTML(state) {
    const camp = state.activeCampaign;
    const isNew = !state.activePcId;
    
    // Updated default structure to hold stats, equipment, patternLog, and ddbId
    const pc = !isNew && camp?.playerCharacters 
        ? camp.playerCharacters.find(p => p.id === state.activePcId) 
        : { name: '', race: '', classLevel: '', background: '', alignment: '', faith: '', gender: '', age: '', size: '', height: '', weight: '', eyes: '', hair: '', skin: '', traits: '', ideals: '', bonds: '', flaws: '', appearance: '', backstory: '', organizations: '', allies: '', enemies: '', dmNotes: '', playerId: '', image: '', boonBackstory: false, boon1stBday: '', boon2ndBday: '', extraBdayBoons: [], unlockAutoSuccess: false, availableDowntime: 0, downtimeLog: '', patternLog: '', str: '', dex: '', con: '', int: '', wis: '', cha: '', san: '', saves: '', skills: '', proficiencies: '', wealth: '', equipped: '', backpack: '', ddbId: '', isPrivate: false };

    if (!pc && !isNew) return `<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Hero not found in the archives.</div>`;

    const isDM = camp._isDM;
    const isOwner = pc.playerId === state.currentUserUid;
    const canEdit = isDM || isOwner;

    // HARD SECURITY BLOCK: If you are neither the DM nor the owner, you cannot see this screen at all.
    if (!isNew && !canEdit) {
        return `
        <div class="animate-in fade-in flex flex-col items-center justify-center min-h-[50vh] text-center">
            <i class="fa-solid fa-shield-halved text-6xl text-red-900 mb-4 drop-shadow-md"></i>
            <h2 class="text-3xl font-serif font-black text-stone-900 mb-2">Access Denied</h2>
            <p class="text-stone-600 font-sans max-w-md">The contents of this private hero journal are sealed. Only the Dungeon Master and the player controlling this hero may view or edit it. Please view their Public Profile in the Codex instead.</p>
            <button onclick="window.appActions.setView('pc-manager')" class="mt-6 px-6 py-2 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-stone-800 transition shadow-md">Return to Party Manifest</button>
        </div>`;
    }

    const coreClass = 'bg-white focus:border-red-900';
    const title = isNew ? "Enroll New Hero" : `Private Journal: ${pc.name}`;

    // DM assigns the hero to a player UID, fetching Display Names from the campaign map
    let playerAssignHTML = '';
    if (isDM) {
        const activePlayerUIDs = camp.activePlayers || [];
        const playerNames = camp.playerNames || {};
        
        // SECURITY FILTER: Remove the DM from the list, and remove any orphaned/deleted test UIDs that lack a display name
        const validPlayerUIDs = activePlayerUIDs.filter(uid => 
            uid !== camp.dmId && playerNames[uid]
        );
        
        const options = validPlayerUIDs.map(uid => {
            const displayName = playerNames[uid];
            return `<option value="${uid}" ${pc.playerId === uid ? 'selected' : ''}>Player: ${displayName}</option>`;
        }).join('');
        
        playerAssignHTML = `
            <div class="col-span-full border-b-2 border-stone-300 pb-4 mb-2 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end">
                <div class="w-full sm:w-auto flex-grow">
                    <label class="block text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5"><i class="fa-solid fa-link mr-1"></i> DM Override: Assigned Player</label>
                    <select id="pc-edit-player-id" class="w-full sm:w-2/3 p-2 border border-blue-300 rounded-sm text-sm bg-blue-50 font-bold text-blue-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- DM Controlled (NPC / Unassigned) --</option>
                        ${options}
                    </select>
                    <p class="text-[10px] text-stone-500 mt-1 italic">Assigning a player allows them to edit this hero's backstory and traits.</p>
                </div>
                <div class="w-full sm:w-auto bg-red-50 border border-red-200 p-3 rounded-sm shadow-sm flex items-center gap-2 shrink-0">
                    <input type="checkbox" id="pc-edit-is-private" ${pc.isPrivate ? 'checked' : ''} class="w-4 h-4 text-red-900 rounded-sm cursor-pointer shadow-sm border-red-400 focus:ring-red-500">
                    <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-900 cursor-pointer" for="pc-edit-is-private"><i class="fa-solid fa-user-secret mr-1"></i> Keep Hero Private</label>
                </div>
            </div>
        `;
    } else {
        playerAssignHTML = `<input type="hidden" id="pc-edit-player-id" value="${pc.playerId || ''}">`;
    }

    // --- DM ONLY: ANNIVERSARY MATH ENGINE ---
    let calculatedBirthdays = 0;
    let effMonth = null;
    let effDay = null;
    let isAccountLinked = false;
    
    if (isDM) {
        const playerBirthdays = camp.playerBirthdays || {};
        const pBday = playerBirthdays[pc.playerId]; 
        
        // 1. Determine Effective Birthday (Account > DM Manual Entry)
        if (pBday && pBday.month && pBday.day) {
            effMonth = pBday.month;
            effDay = pBday.day;
            isAccountLinked = true;
        } else {
            effMonth = pc.birthMonth || null;
            effDay = pc.birthDay || null;
        }
        
        // 2. Perform the exact math
        if (effMonth && effDay && pc.joinDate) {
            const joinDate = new Date(pc.joinDate);
            if (!isNaN(joinDate.getTime())) {
                const today = new Date();
                let count = 0;
                
                for (let y = joinDate.getFullYear(); y <= today.getFullYear(); y++) {
                    const bDateThisYear = new Date(y, effMonth - 1, effDay);
                    if (bDateThisYear >= joinDate && bDateThisYear <= today) {
                        count++;
                    }
                }
                calculatedBirthdays = count;
            }
        }
    }

    // Month Selector Options
    const monthOptionsHtml = [
        {v: '', l: 'Month...'}, {v: 1, l: 'January'}, {v: 2, l: 'February'}, {v: 3, l: 'March'},
        {v: 4, l: 'April'}, {v: 5, l: 'May'}, {v: 6, l: 'June'}, {v: 7, l: 'July'},
        {v: 8, l: 'August'}, {v: 9, l: 'September'}, {v: 10, l: 'October'}, {v: 11, l: 'November'}, {v: 12, l: 'December'}
    ].map(m => `<option value="${m.v}" ${effMonth === m.v ? 'selected' : ''}>${m.l}</option>`).join('');

    // --- EXTRA BOONS GENERATOR ---
    let extraBoonsHtml = '';
    const extraBoonsData = pc.extraBdayBoons || [];
    
    for (let i = 0; i < 10; i++) {
        const boonNumber = i + 3; // Starts at 3rd Birthday
        const suffix = boonNumber === 3 ? 'rd' : 'th';
        
        const isVisible = boonNumber <= calculatedBirthdays || i < extraBoonsData.length;
        const hiddenClass = isVisible ? '' : 'hidden';
        const selectedVal = extraBoonsData[i] || '';

        extraBoonsHtml += `
        <div id="extra-boon-slot-${boonNumber}" class="col-span-1 sm:col-span-2 ${hiddenClass}">
            <label class="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">${boonNumber}${suffix} Birthday Boon (+1 Boon Choice)</label>
            ${renderBoonSelect(`pc-edit-boon-${boonNumber}`, selectedVal)}
        </div>
        `;
    }

    const downtimeDays = parseInt(pc.availableDowntime) || 0;

    // --- DYNAMIC DOWNTIME LOG PARSER (Accordion View) ---
    const logText = pc.downtimeLog || '';
    const safeDTLog = logText.replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
    
    let categorizedLogs = {};
    const entries = logText.split(/\n*---\n*/).map(e => e.trim()).filter(e => e);
    
    entries.forEach(entry => {
        let category = "Other / Legacy";
        // Attempt to extract the category from our standard log formats
        const match = entry.match(/\*\*(?:Downtime|DM Assignment|Downtime Activity):\s*([^*]+)\*\*/i) || entry.match(/\*\*Downtime:\s*(.*?)\*\*/i);
        
        if (match) {
            category = match[1].trim();
            // Clean up appended specific info (like "Carousing (Lower Class)" -> "Carousing")
            if (category.toLowerCase().startsWith('carousing')) category = 'Carousing';
            if (category.toLowerCase().startsWith('crime')) category = 'Crime';
            if (category.toLowerCase().startsWith('work')) category = 'Work';
        }
        
        // Catch our favor logic
        if (entry.includes('**Downtime: Favor Used**') || 
            entry.includes('**Downtime: Hindrance Suffered**') || 
            entry.includes('**Downtime: Favor Reactivated**') || 
            entry.includes('**Downtime: Enemy Reactivated**')) {
            category = 'Favors & Hindrances';
        }
        
        if (!categorizedLogs[category]) categorizedLogs[category] = [];
        categorizedLogs[category].push(entry);
    });

    const sortedCategories = Object.keys(categorizedLogs).sort();

    let dtAccordionHtml = '';
    if (entries.length === 0) {
        dtAccordionHtml = `<p class="text-stone-400 italic text-sm p-4 text-center">No downtime activities recorded yet.</p>`;
    } else {
        sortedCategories.forEach(cat => {
            // Reverse so newest entries within the category appear at the top
            const catEntries = categorizedLogs[cat].reverse(); 
            const badgeCount = `<span class="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">${catEntries.length}</span>`;
            
            let entriesHtml = catEntries.map(e => {
                const parsed = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(e) : e.replace(/\n/g, '<br>');
                return `<div class="p-3 sm:p-4 border border-blue-200 bg-white rounded-sm shadow-sm text-sm font-serif text-stone-800 leading-relaxed mb-3 last:mb-0">${parsed}</div>`;
            }).join('');

            dtAccordionHtml += `
            <div class="mb-3 bg-blue-50/50 border border-blue-200 rounded-sm overflow-hidden shadow-sm">
                <button type="button" class="w-full flex items-center justify-between p-3 sm:p-4 bg-blue-100/50 hover:bg-blue-100 transition-colors text-blue-900 border-b border-transparent focus:outline-none" onclick="const content = this.nextElementSibling; content.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180'); this.classList.toggle('border-blue-200');">
                    <div class="flex items-center font-bold text-xs sm:text-sm uppercase tracking-widest">
                        <i class="fa-solid fa-folder-open mr-2 text-blue-600"></i> ${cat} ${badgeCount}
                    </div>
                    <i class="fa-solid fa-chevron-down text-blue-600 transition-transform duration-200"></i>
                </button>
                <div class="hidden p-3 sm:p-4 bg-blue-50/30">
                    ${entriesHtml}
                </div>
            </div>`;
        });
    }

    const dmEditBtn = isDM ? `
        <button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-500 transition flex items-center bg-amber-50 px-3 py-1.5 rounded border border-amber-200 shadow-sm shrink-0" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('input-pc-edit-downtimelog', 'Downtime Activity Log')">
            <i class="fa-solid fa-pen mr-1.5"></i> <span class="hidden sm:inline">Edit Raw Log (DM)</span><span class="sm:hidden">Edit</span>
        </button>
    ` : '';

    const dtSectionHtml = `
    <div class="mt-6 bg-white border border-[#d4c5a9] shadow-inner rounded-sm p-4 sm:p-6 flex flex-col">
        <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-3 mb-5 gap-2">
            <div>
                <h3 class="text-sm sm:text-base font-bold text-stone-800 font-serif flex items-center"><i class="fa-solid fa-clock-rotate-left text-blue-600 mr-2"></i> Downtime Activity Log</h3>
                <p class="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">Activities are sorted by type and ordered newest to oldest.</p>
            </div>
            ${dmEditBtn}
        </div>
        
        <input type="hidden" id="input-pc-edit-downtimelog" value="${safeDTLog}">
        
        <div class="w-full text-stone-800">
            ${dtAccordionHtml}
        </div>
    </div>
    `;

    // --- DYNAMIC PATTERN MAGIC LOG PARSER ---
    const hasPatternAccess = pc.patternMagicUnlocked === true || Object.values(pc.patternMagic || {}).some(v => typeof v === 'number' && v > 0);
    let pmSectionHtml = '';

    if (hasPatternAccess) {
        const pmLogText = pc.patternLog || '';
        const safePMLog = pmLogText.replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
        
        let pmCategorizedLogs = {};
        const pmEntries = pmLogText.split(/\n*---\n*/).map(e => e.trim()).filter(e => e);
        
        pmEntries.forEach(entry => {
            let category = "General Casts";
            const match = entry.match(/\*\*Pattern:\s*(.*?)\*\*/i);
            if (match) category = match[1].trim();
            
            if (!pmCategorizedLogs[category]) pmCategorizedLogs[category] = [];
            pmCategorizedLogs[category].push(entry);
        });

        const pmSortedCategories = Object.keys(pmCategorizedLogs).sort();

        let pmAccordionHtml = '';
        if (pmEntries.length === 0) {
            pmAccordionHtml = `<p class="text-stone-500 italic text-sm p-4 text-center">No spells have been woven yet.</p>`;
        } else {
            pmSortedCategories.forEach(cat => {
                const catEntries = pmCategorizedLogs[cat].reverse(); 
                const badgeCount = `<span class="bg-cyan-200 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 border border-cyan-300">${catEntries.length}</span>`;
                
                let entriesHtml = catEntries.map(e => {
                    const parsed = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(e) : e.replace(/\n/g, '<br>');
                    return `<div class="p-3 sm:p-4 border border-cyan-200 bg-white rounded-sm shadow-sm text-sm font-serif text-stone-800 leading-relaxed mb-3 last:mb-0">${parsed}</div>`;
                }).join('');

                pmAccordionHtml += `
                <div class="mb-3 bg-cyan-50/50 border border-cyan-200 rounded-sm overflow-hidden shadow-sm">
                    <button type="button" class="w-full flex items-center justify-between p-3 sm:p-4 bg-cyan-100/50 hover:bg-cyan-100 transition-colors text-cyan-900 border-b border-transparent focus:outline-none" onclick="const content = this.nextElementSibling; content.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180'); this.classList.toggle('border-cyan-200');">
                        <div class="flex items-center font-bold text-xs sm:text-sm uppercase tracking-widest font-mono">
                            <i class="fa-solid fa-sparkles mr-2 text-cyan-600"></i> ${cat} ${badgeCount}
                        </div>
                        <i class="fa-solid fa-chevron-down text-cyan-600 transition-transform duration-200"></i>
                    </button>
                    <div class="hidden p-3 sm:p-4 bg-cyan-50/30">
                        ${entriesHtml}
                    </div>
                </div>`;
            });
        }

        const dmPmEditBtn = isDM ? `
            <button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-700 hover:text-cyan-600 transition flex items-center bg-cyan-50 px-3 py-1.5 rounded border border-cyan-200 shadow-sm shrink-0" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('input-pc-edit-patternlog', 'Pattern Magic Casting Log')">
                <i class="fa-solid fa-pen mr-1.5"></i> <span class="hidden sm:inline">Edit Raw Log (DM)</span><span class="sm:hidden">Edit</span>
            </button>
        ` : '';

        pmSectionHtml = `
        <div class="mt-6 bg-white border border-[#d4c5a9] shadow-inner rounded-sm p-4 sm:p-6 flex flex-col">
            <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-3 mb-5 gap-2">
                <div>
                    <h3 class="text-sm sm:text-base font-bold text-cyan-700 font-mono flex items-center"><i class="fa-solid fa-book-journal-whills text-cyan-600 mr-2"></i> Casting Log</h3>
                    <p class="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1 font-mono">Spells are sorted by Primary Pattern.</p>
                </div>
                ${dmPmEditBtn}
            </div>
            
            <input type="hidden" id="input-pc-edit-patternlog" value="${safePMLog}">
            
            <div class="w-full text-stone-800">
                ${pmAccordionHtml}
            </div>
        </div>
        `;
    }

    return `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#f4ebd8] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-4xl mx-auto mb-8">
        
        <div class="bg-stone-900 p-4 border-b-4 border-red-900 text-amber-500 flex justify-between items-center relative shrink-0">
            <h2 class="text-xl sm:text-2xl font-serif font-bold z-10 flex items-center">
                <i class="fa-solid fa-user-pen mr-3 text-red-700"></i> ${title}
            </h2>
            <div class="absolute right-0 top-0 bottom-0 w-24 sm:w-32 opacity-10 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
                <i class="fa-solid fa-shield-halved text-5xl sm:text-6xl text-amber-50"></i>
            </div>
        </div>

        <div class="p-4 sm:px-6 lg:px-8 pt-4 pb-0 shrink-0">
            <div class="bg-blue-900/10 border-l-4 border-blue-600 p-4 rounded-sm text-sm text-stone-800 italic flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                    <i class="fa-solid fa-circle-info text-blue-600 mr-2"></i> When you save this journal, a <strong>Public Profile</strong> will automatically be generated (or updated) in the Codex so the rest of the party can read what your hero looks like!
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex bg-[#e8dec7] border-b-2 border-stone-300 shrink-0 px-2 sm:px-4 pt-4 gap-1 overflow-x-auto hide-scrollbar z-10 relative mt-4 mx-4 sm:mx-6 lg:mx-8">
            <button type="button" id="pc-tab-btn-identity" class="pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition bg-[#fdfbf7] text-red-900 border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900" onclick="window.switchPCEditTab('identity')">Identity & Stats</button>
            <button type="button" id="pc-tab-btn-lore" class="pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-t-2 border-l border-r border-transparent hover:text-stone-800" onclick="window.switchPCEditTab('lore')">Lore & Persona</button>
            <button type="button" id="pc-tab-btn-inventory" class="pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-t-2 border-l border-r border-transparent hover:text-stone-800" onclick="window.switchPCEditTab('inventory')">Inventory & Logs</button>
            ${isDM ? `<button type="button" id="pc-tab-btn-dm" class="pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-t-2 border-l border-r border-transparent hover:text-stone-800" onclick="window.switchPCEditTab('dm')"><i class="fa-solid fa-crown mr-1"></i> DM Overview</button>` : ''}
        </div>

        <div class="p-4 sm:p-6 lg:p-8 bg-[#fdfbf7] flex-grow">
            
            <!-- TAB 1: IDENTITY & STATS -->
            <div id="pc-tab-content-identity" class="pc-tab-content space-y-6 sm:space-y-8 animate-in">
                <!-- CORE IDENTIFIERS -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-white p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                    ${playerAssignHTML}
                    <div class="col-span-1 sm:col-span-2 lg:col-span-1">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Hero Name *</label>
                        <input type="text" id="pc-edit-name" value="${pc.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-sm outline-none font-serif ${coreClass}" placeholder="e.g. Eldrin">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Race / Lineage</label>
                        <input type="text" id="pc-edit-race" value="${pc.race || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Wood Elf">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Class & Level</label>
                        <input type="text" id="pc-edit-class" value="${pc.classLevel || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Ranger 4">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Background</label>
                        <input type="text" id="pc-edit-background" value="${pc.background || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Acolyte">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Alignment</label>
                        <input type="text" id="pc-edit-alignment" value="${pc.alignment || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Chaotic Good">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Faith / Deity</label>
                        <input type="text" id="pc-edit-faith" value="${pc.faith || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Corellon Larethian">
                    </div>
                    <div class="col-span-1 sm:col-span-2 lg:col-span-3 mt-2 border-t border-[#d4c5a9] pt-4">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Portrait Image URL</label>
                        <input type="text" id="pc-edit-image" value="${pc.image || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="https://example.com/portrait.jpg">
                    </div>
                    <div class="col-span-1 sm:col-span-2 lg:col-span-3 mt-2 flex gap-2 items-end">
                        <div class="flex-grow">
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">D&D Beyond Character ID / URL</label>
                            <input type="text" id="pc-edit-ddb-id" value="${pc.ddbId || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. 12345678 or full URL">
                        </div>
                        <button type="button" id="btn-sync-stats" onclick="window.appActions.quickSyncDDB('${pc.id}')" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm whitespace-nowrap h-[38px] flex items-center">
                            <i class="fa-solid fa-cloud-arrow-down sm:mr-2"></i> <span class="hidden sm:inline">Sync Stats</span>
                        </button>
                    </div>
                </div>

                <!-- CHARACTERISTICS -->
                <div class="bg-white p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1">Characteristics</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Gender</label>
                            <input type="text" id="pc-edit-gender" value="${pc.gender || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Age</label>
                            <input type="text" id="pc-edit-age" value="${pc.age || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Size</label>
                            <input type="text" id="pc-edit-size" value="${pc.size || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="Medium">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Height</label>
                            <input type="text" id="pc-edit-height" value="${pc.height || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Weight</label>
                            <input type="text" id="pc-edit-weight" value="${pc.weight || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Eyes</label>
                            <input type="text" id="pc-edit-eyes" value="${pc.eyes || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Hair</label>
                            <input type="text" id="pc-edit-hair" value="${pc.hair || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Skin</label>
                            <input type="text" id="pc-edit-skin" value="${pc.skin || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                        </div>
                    </div>
                </div>

                <!-- CORE ATTRIBUTES SECTION -->
                <div class="bg-white p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner mt-4 sm:mt-6">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dumbbell mr-2 text-stone-500"></i> Core Attributes & Proficiencies</h3>
                    <div class="grid grid-cols-3 sm:grid-cols-7 gap-4 mb-4">
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">STR</label><input type="number" id="pc-edit-str" value="${pc.str || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">DEX</label><input type="number" id="pc-edit-dex" value="${pc.dex || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">CON</label><input type="number" id="pc-edit-con" value="${pc.con || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">INT</label><input type="number" id="pc-edit-int" value="${pc.int || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">WIS</label><input type="number" id="pc-edit-wis" value="${pc.wis || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 text-center">CHA</label><input type="number" id="pc-edit-cha" value="${pc.cha || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none text-center ${coreClass}"></div>
                        <div>
                            <label class="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 text-center">SAN</label>
                            <input type="number" id="pc-edit-san" value="${pc.san || ''}" class="w-full p-2 border border-red-300 rounded-sm text-sm font-bold text-red-900 shadow-sm outline-none text-center bg-red-50 focus:border-red-600">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#d4c5a9] pt-4">
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Saving Throws</label><input type="text" id="pc-edit-saves" value="${pc.saves || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. STR, CON"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Skills</label><input type="text" id="pc-edit-skills" value="${pc.skills || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Athletics, Perception"></div>
                        <div><label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Other Proficiencies</label><input type="text" id="pc-edit-proficiencies" value="${pc.proficiencies || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="Languages, Tools, Weapons"></div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: LORE & PERSONA -->
            <div id="pc-tab-content-lore" class="pc-tab-content hidden space-y-6 sm:space-y-8 animate-in">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    ${renderSmartField('pc-edit-traits', 'Personality Traits', pc.traits || '', 'What are their unique quirks?', 3, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                    ${renderSmartField('pc-edit-ideals', 'Ideals', pc.ideals || '', 'What drives them?', 3, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                    ${renderSmartField('pc-edit-bonds', 'Bonds', pc.bonds || '', 'Who or what do they care about?', 3, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                    ${renderSmartField('pc-edit-flaws', 'Flaws', pc.flaws || '', 'What are their weaknesses?', 3, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                </div>

                ${renderSmartField('pc-edit-appearance', `<i class="fa-solid fa-user text-stone-500 mr-2"></i> Appearance`, pc.appearance || '', "Detailed physical description, scars, tattoos, clothing...", 4, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                ${renderSmartField('pc-edit-backstory', `<i class="fa-solid fa-book-open text-stone-500 mr-2"></i> Backstory`, pc.backstory || '', "The hero's origins...", 5, 'bg-white border border-[#d4c5a9] shadow-inner', false)}
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-4">
                    ${renderSmartField('pc-edit-organizations', `<i class="fa-solid fa-users-rectangle text-stone-500 mr-2"></i> Organizations`, pc.organizations || '', "Factions, guilds, orders...", 3, 'bg-white border border-[#d4c5a9] shadow-inner h-full flex-grow', false)}
                    ${renderSmartField('pc-edit-allies', `<i class="fa-solid fa-handshake text-stone-500 mr-2"></i> Allies`, pc.allies || '', "Friends, contacts...", 3, 'bg-white border border-[#d4c5a9] shadow-inner h-full flex-grow', false)}
                    ${renderSmartField('pc-edit-enemies', `<i class="fa-solid fa-skull-crossbones text-stone-500 mr-2"></i> Enemies`, pc.enemies || '', "Rivals, villains...", 3, 'bg-white border border-[#d4c5a9] shadow-inner h-full flex-grow', false)}
                </div>
            </div>

            <!-- TAB 3: INVENTORY & LOGS -->
            <div id="pc-tab-content-inventory" class="pc-tab-content hidden space-y-6 sm:space-y-8 animate-in">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-sm shadow-inner flex flex-wrap gap-4 items-center justify-between">
                    <div>
                        <h3 class="text-xs font-bold text-blue-900 uppercase tracking-widest mb-1"><i class="fa-solid fa-hourglass-half mr-1"></i> Available Downtime</h3>
                        <p class="text-[10px] text-blue-700 italic">Used for resting, crafting, researching, and other off-screen activities.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${isDM ? `<input type="number" id="pc-edit-downtime" value="${downtimeDays}" class="w-20 p-2 border border-blue-300 rounded-sm text-sm font-bold text-blue-900 bg-white text-center shadow-inner focus:outline-none focus:border-blue-600"> <span class="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Days</span>` : `<span class="text-2xl font-black text-blue-600">${downtimeDays}</span> <span class="text-[10px] font-bold uppercase text-blue-800 tracking-wider mt-1">Days</span>`}
                    </div>
                </div>

                <!-- EQUIPMENT & WEALTH SECTION -->
                <div class="bg-white p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner mt-4 sm:mt-6 mb-4 sm:mb-6">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-sack-dollar mr-2 text-stone-500"></i> Equipment & Wealth</h3>
                    <div class="mb-4 sm:mb-6">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Wealth & Currency</label>
                        <input type="text" id="pc-edit-wealth" value="${pc.wealth || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. 150 gp, 20 sp...">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        ${renderSmartField('pc-edit-equipped', `<i class="fa-solid fa-shield-halved text-stone-500 mr-2"></i> Equipped Items`, pc.equipped || '', "Armor, weapons, and readied gear...", 3, 'bg-white border border-[#d4c5a9] shadow-inner h-full flex-grow', false)}
                        ${renderSmartField('pc-edit-backpack', `<i class="fa-solid fa-sack-xmark text-stone-500 mr-2"></i> Backpack / Inventory`, pc.backpack || '', "Other items, rations, torches...", 3, 'bg-white border border-[#d4c5a9] shadow-inner h-full flex-grow', false)}
                    </div>
                </div>
                
                ${dtSectionHtml}
                ${pmSectionHtml}
            </div>

            <!-- TAB 4: DM OVERVIEW -->
            ${isDM ? `
            <div id="pc-tab-content-dm" class="pc-tab-content hidden space-y-6 sm:space-y-8 animate-in">
                <div class="bg-stone-100 p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-cake-candles mr-2 text-pink-600"></i> Player Anniversary & Birthday</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 flex items-center">
                                Player's Birthday 
                                ${isAccountLinked ? '<span class="ml-2 text-[9px] text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-sm lowercase tracking-normal flex items-center shadow-sm"><i class="fa-solid fa-link mr-1"></i> Account Linked</span>' : ''}
                            </label>
                            <div class="flex gap-2">
                                <select id="pc-edit-birth-month" onchange="if(window.appActions.calculateBirthdaysLive) window.appActions.calculateBirthdaysLive()" class="w-2/3 p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white shadow-sm outline-none focus:border-pink-600" ${isAccountLinked ? 'disabled title="Managed by player account"' : ''}>
                                    ${monthOptionsHtml}
                                </select>
                                <input type="number" id="pc-edit-birth-day" value="${effDay || ''}" min="1" max="31" oninput="if(window.appActions.calculateBirthdaysLive) window.appActions.calculateBirthdaysLive()" class="w-1/3 p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white shadow-sm outline-none focus:border-pink-600 text-center" placeholder="Day" ${isAccountLinked ? 'disabled title="Managed by player account"' : ''}>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Date Joined Campaign</label>
                            <input type="date" id="pc-edit-join-date" value="${pc.joinDate || ''}" onchange="if(window.appActions.calculateBirthdaysLive) window.appActions.calculateBirthdaysLive()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white shadow-sm outline-none focus:border-pink-600">
                        </div>
                    </div>
                    <div class="bg-pink-50 border border-pink-200 p-3 rounded-sm flex items-center justify-between shadow-sm">
                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-pink-800">Birthdays Since Joining:</span>
                        <span id="pc-edit-bday-count" class="text-lg font-black text-pink-600">${calculatedBirthdays}</span>
                    </div>
                    <p class="text-[9px] text-stone-500 italic mt-2">Saving a Start Date automatically tracks how many Birthday Boons this player has earned!</p>
                </div>

                <div class="bg-amber-50 p-4 sm:p-5 rounded-sm border border-amber-300 shadow-inner">
                    <h3 class="text-xs sm:text-sm font-bold text-amber-900 font-serif mb-3 border-b border-amber-300 pb-1"><i class="fa-solid fa-lock-open mr-2"></i> Player Unlocks & Boons</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="col-span-1 sm:col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="pc-edit-boon-backstory" ${pc.boonBackstory ? 'checked' : ''} class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                            <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-900 cursor-pointer" for="pc-edit-boon-backstory">Backstory Completed (+1 Max Inspiration)</label>
                        </div>
                        <div class="col-span-1 sm:col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="pc-edit-unlock-auto-success" ${pc.unlockAutoSuccess ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-emerald-400 focus:ring-emerald-500">
                            <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-900 cursor-pointer" for="pc-edit-unlock-auto-success">Chronicle Contributor (Unlocks 1 Auto-Success per Arc)</label>
                        </div>
                        <div class="col-span-1 sm:col-span-2">
                            <label class="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">1st Birthday Boon (Custom Ability)</label>
                            <input type="text" id="pc-edit-boon-1st" value="${pc.boon1stBday || ''}" class="w-full p-2 border border-amber-300 rounded-sm text-sm font-bold text-stone-900 shadow-sm outline-none focus:border-amber-600 bg-white" placeholder="e.g. Minor Pyromancy...">
                        </div>
                        <div class="col-span-1 sm:col-span-2">
                            <label class="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">2nd Birthday Boon (+1 Max Inspiration & Choice)</label>
                            ${renderBoonSelect('pc-edit-boon-2nd', pc.boon2ndBday)}
                        </div>
                        
                        ${extraBoonsHtml}

                    </div>
                </div>

                <!-- PATTERN MAGIC CONFIGURATION (DM ONLY) -->
                <div class="bg-stone-900 text-stone-100 p-4 sm:p-5 rounded-sm border border-stone-800 shadow-inner">
                    <h3 class="text-xs sm:text-sm font-bold text-cyan-400 font-mono mb-3 border-b border-stone-800 pb-1 flex items-center">
                        <i class="fa-solid fa-compass-drafting mr-2 animate-pulse"></i> Pattern Magic Configuration (DM Override)
                    </h3>
                    <div class="flex items-center gap-2 mb-4 bg-stone-950 p-2.5 rounded border border-stone-850">
                        <input type="checkbox" id="pc-edit-pm-unlocked" ${pc.patternMagicUnlocked ? 'checked' : ''} class="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500 bg-stone-800 border-stone-700 cursor-pointer">
                        <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-cyan-400 cursor-pointer font-mono" for="pc-edit-pm-unlocked">Unlock Dimensional Pattern Access</label>
                    </div>
                    <div class="mb-4">
                        <label class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 font-mono">Unspent Pattern Points</label>
                        <input type="number" id="pc-edit-pm-points" value="${pc.patternMagic?.patternPoints || 0}" min="0" class="w-24 p-2 bg-stone-950 border border-stone-850 rounded text-sm text-center font-bold text-stone-200 focus:border-cyan-500/40 font-mono outline-none">
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        ${['spatia', 'wyird', 'dynamis', 'vitar', 'formus', 'mentis', 'arcani', 'umbrus', 'tempus'].map(d => {
                            const val = pc.patternMagic?.[d] || 0;
                            return `
                            <div class="bg-stone-950/50 border border-stone-850 p-2.5 rounded flex flex-col">
                                <label class="text-[9px] font-bold text-stone-400 uppercase tracking-wider font-mono capitalize" for="pc-edit-pm-${d}">${d}</label>
                                <input type="number" id="pc-edit-pm-${d}" value="${val}" min="0" max="5" class="w-full mt-1.5 p-1.5 bg-stone-950 border border-stone-850 rounded text-center text-xs font-bold text-cyan-400 focus:border-cyan-500/40 font-mono outline-none">
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                ${renderSmartField('pc-edit-dmnotes', `<i class="fa-solid fa-eye text-red-900 mr-2"></i> DM's Secret Notes`, pc.dmNotes || '', 'Hooks, secrets, curses, or background ties...', 4, 'bg-stone-200 border border-[#d4c5a9] shadow-inner border-l-4 border-l-red-900', false)}
            </div>
            ` : ''}

        </div>

        <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between items-center gap-4 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
            <div>
                ${(!isNew && isDM) ? `<button onclick="window.appActions.deletePC('${pc.id}')" class="px-4 py-2 text-stone-500 hover:text-red-700 hover:bg-red-900/10 rounded-sm transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center"><i class="fa-solid fa-skull mr-2"></i> Remove Hero</button>` : '<div></div>'}
            </div>
            <div class="flex gap-2 w-full sm:w-auto justify-end">
                <button onclick="window.appActions.setView('pc-manager')" class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-[#fdfbf7] text-stone-700 border border-[#d4c5a9] rounded-sm hover:bg-white transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm">Cancel</button>
                <button onclick="window.appActions.savePCEdit()" class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-stone-900 text-amber-50 border border-stone-950 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider flex items-center justify-center text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-floppy-disk mr-2"></i> Inscribe
                </button>
            </div>
        </div>
    </div>
    `;
}

export const savePCEdit = async () => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp) return;

  const isDM = camp._isDM;
  const myUid = window.appData.currentUserUid;
  const pcId = window.appData.activePcId || generateId();

  const existingPC = camp.playerCharacters?.find(p => p.id === pcId) || {
      inspiration: 0,
      automaticSuccess: false,
      playerId: '',
      birthMonth: null,
      birthDay: null,
      extraBdayBoons: [],
      availableDowntime: 0,
      downtimeLog: '',
      patternLog: '',
      str: '', dex: '', con: '', int: '', wis: '', cha: '', san: '',
      saves: '', skills: '', proficiencies: '',
      wealth: '', equipped: '', backpack: '', ddbId: '',
      isPrivate: false
  };

  const isOwner = existingPC.playerId === myUid;

  if (!isDM && !isOwner) {
      notify("You do not have permission to modify this hero.", "error");
      return;
  }

  const nameInput = document.getElementById('pc-edit-name')?.value.trim();
  if (!nameInput) {
      notify("Hero must have a name.", "error");
      return;
  }

  // Handle DM's manual birthday entry vs Account linkage
  const bMonthEl = document.getElementById('pc-edit-birth-month');
  const bDayEl = document.getElementById('pc-edit-birth-day');

  const localBMonth = isDM ? ((bMonthEl && !bMonthEl.disabled) ? (parseInt(bMonthEl.value) || null) : existingPC.birthMonth) : existingPC.birthMonth;
  const localBDay = isDM ? ((bDayEl && !bDayEl.disabled) ? (parseInt(bDayEl.value) || null) : existingPC.birthDay) : existingPC.birthDay;
  
  const isPrivateFlag = isDM ? (document.getElementById('pc-edit-is-private')?.checked || false) : (existingPC.isPrivate || false);

  // Gather Extra Birthday Boons (3rd+)
  const extraBdayBoons = [];
  if (isDM) {
      for (let i = 3; i <= 12; i++) {
          const select = document.getElementById(`pc-edit-boon-${i}`);
          if (select) {
              extraBdayBoons.push(select.value);
          }
      }
      while (extraBdayBoons.length > 0 && extraBdayBoons[extraBdayBoons.length - 1] === '') {
          extraBdayBoons.pop();
      }
  }

  // Helper to gracefully extract values, allowing empty strings to overwrite existing data
  const getVal = (id, fallback) => {
      const el = document.getElementById(id);
      if (el) return el.value; 
      return fallback || '';
  };

  // Gather Pattern Magic Configuration (DM Only)
  let pmUnlockedFlag = existingPC.patternMagicUnlocked || false;
  let pmData = existingPC.patternMagic || {
      spatia: 0, wyird: 0, dynamis: 0, vitar: 0, formus: 0,
      mentis: 0, arcani: 0, umbrus: 0, tempus: 0,
      essentia: 0, patternPoints: 0, rotes: []
  };

  if (isDM) {
      pmUnlockedFlag = document.getElementById('pc-edit-pm-unlocked')?.checked || false;
      
      const spatiaVal = parseInt(document.getElementById('pc-edit-pm-spatia')?.value) || 0;
      const wyirdVal = parseInt(document.getElementById('pc-edit-pm-wyird')?.value) || 0;
      const dynamisVal = parseInt(document.getElementById('pc-edit-pm-dynamis')?.value) || 0;
      const vitarVal = parseInt(document.getElementById('pc-edit-pm-vitar')?.value) || 0;
      const formusVal = parseInt(document.getElementById('pc-edit-pm-formus')?.value) || 0;
      const mentisVal = parseInt(document.getElementById('pc-edit-pm-mentis')?.value) || 0;
      const arcaniVal = parseInt(document.getElementById('pc-edit-pm-arcani')?.value) || 0;
      const umbrusVal = parseInt(document.getElementById('pc-edit-pm-umbrus')?.value) || 0;
      const tempusVal = parseInt(document.getElementById('pc-edit-pm-tempus')?.value) || 0;
      const pmPointsVal = parseInt(document.getElementById('pc-edit-pm-points')?.value) || 0;

      pmData = {
          ...pmData,
          spatia: spatiaVal,
          wyird: wyirdVal,
          dynamis: dynamisVal,
          vitar: vitarVal,
          formus: formusVal,
          mentis: mentisVal,
          arcani: arcaniVal,
          umbrus: umbrusVal,
          tempus: tempusVal,
          patternPoints: pmPointsVal
      };

      // Recalculate max Essentia dynamically just in case DM changed ranks: Total Ranks * 4
      const totalRanks = spatiaVal + wyirdVal + dynamisVal + vitarVal + formusVal + mentisVal + arcaniVal + umbrusVal + tempusVal;
      const maxEssentia = totalRanks * 4;
      pmData.essentia = Math.min(pmData.essentia || 0, maxEssentia);
  }

  // Gather Inputs safely based on access level
  const updatedPC = {
      ...existingPC,
      id: pcId,
      isPrivate: isPrivateFlag,
      // Core Identity
      name: nameInput,
      race: getVal('pc-edit-race', existingPC.race),
      classLevel: getVal('pc-edit-class', existingPC.classLevel),
      background: getVal('pc-edit-background', existingPC.background),
      image: getVal('pc-edit-image', existingPC.image),
      ddbId: getVal('pc-edit-ddb-id', existingPC.ddbId),
      // Characteristics
      alignment: getVal('pc-edit-alignment', existingPC.alignment),
      faith: getVal('pc-edit-faith', existingPC.faith),
      gender: getVal('pc-edit-gender', existingPC.gender),
      age: getVal('pc-edit-age', existingPC.age),
      size: getVal('pc-edit-size', existingPC.size),
      height: getVal('pc-edit-height', existingPC.height),
      weight: getVal('pc-edit-weight', existingPC.weight),
      eyes: getVal('pc-edit-eyes', existingPC.eyes),
      hair: getVal('pc-edit-hair', existingPC.hair),
      skin: getVal('pc-edit-skin', existingPC.skin),
      // Core Stats
      str: getVal('pc-edit-str', existingPC.str),
      dex: getVal('pc-edit-dex', existingPC.dex),
      con: getVal('pc-edit-con', existingPC.con),
      int: getVal('pc-edit-int', existingPC.int),
      wis: getVal('pc-edit-wis', existingPC.wis),
      cha: getVal('pc-edit-cha', existingPC.cha),
      san: getVal('pc-edit-san', existingPC.san),
      saves: getVal('pc-edit-saves', existingPC.saves),
      skills: getVal('pc-edit-skills', existingPC.skills),
      proficiencies: getVal('pc-edit-proficiencies', existingPC.proficiencies),
      // Personality & Roleplay
      traits: getVal('input-pc-edit-traits', existingPC.traits),
      ideals: getVal('input-pc-edit-ideals', existingPC.ideals),
      bonds: getVal('input-pc-edit-bonds', existingPC.bonds),
      flaws: getVal('input-pc-edit-flaws', existingPC.flaws),
      appearance: getVal('input-pc-edit-appearance', existingPC.appearance),
      backstory: getVal('input-pc-edit-backstory', existingPC.backstory),
      organizations: getVal('input-pc-edit-organizations', existingPC.organizations),
      allies: getVal('input-pc-edit-allies', existingPC.allies),
      enemies: getVal('input-pc-edit-enemies', existingPC.enemies),
      // Equipment & Wealth
      wealth: getVal('pc-edit-wealth', existingPC.wealth),
      equipped: getVal('input-pc-edit-equipped', existingPC.equipped),
      backpack: getVal('input-pc-edit-backpack', existingPC.backpack),

      // Logs
      downtimeLog: getVal('input-pc-edit-downtimelog', existingPC.downtimeLog),
      patternLog: getVal('input-pc-edit-patternlog', existingPC.patternLog),

      // DM Restricted Administrative Fields
      playerId: isDM ? getVal('pc-edit-player-id', existingPC.playerId) : (existingPC.playerId || ''),
      dmNotes: isDM ? getVal('input-pc-edit-dmnotes', existingPC.dmNotes) : (existingPC.dmNotes || ''),
      joinDate: isDM ? getVal('pc-edit-join-date', existingPC.joinDate) : (existingPC.joinDate || ''), 
      birthMonth: localBMonth,
      birthDay: localBDay,
      boonBackstory: isDM ? (document.getElementById('pc-edit-boon-backstory')?.checked || false) : (existingPC.boonBackstory || false),
      unlockAutoSuccess: isDM ? (document.getElementById('pc-edit-unlock-auto-success')?.checked || false) : (existingPC.unlockAutoSuccess || false),
      boon1stBday: isDM ? getVal('pc-edit-boon-1st', existingPC.boon1stBday) : (existingPC.boon1stBday || ''),
      boon2ndBday: isDM ? getVal('pc-edit-boon-2nd', existingPC.boon2ndBday) : (existingPC.boon2ndBday || ''),
      extraBdayBoons: isDM ? extraBdayBoons : (existingPC.extraBdayBoons || []),
      availableDowntime: isDM ? (parseInt(document.getElementById('pc-edit-downtime')?.value) || 0) : (parseInt(existingPC.availableDowntime) || 0),
      
      // Pattern Magic Bindings
      patternMagicUnlocked: pmUnlockedFlag,
      patternMagic: pmData
  };

  const isNew = !camp.playerCharacters?.some(p => p.id === pcId);
  const newPCs = isNew ? [...(camp.playerCharacters || []), updatedPC] : camp.playerCharacters.map(p => p.id === pcId ? updatedPC : p);

  // --- Auto-Generate / Update Linked Codex Entry for the Hero ---
  let codexVisibility = { mode: 'public', visibleTo: [] };
  if (isPrivateFlag) {
      if (updatedPC.playerId) {
          codexVisibility = { mode: 'specific', visibleTo: [updatedPC.playerId] };
      } else {
          codexVisibility = { mode: 'hidden', visibleTo: [] };
      }
  }

  let updatedCodexArray = [...(camp.codex || [])];
  const existingCodexEntry = updatedCodexArray.find(c => c.id === pcId);

  // Core generated tags for the Hero
  const baseTags = ['Hero', updatedPC.race, updatedPC.classLevel].filter(Boolean);
  
  if (!existingCodexEntry) {
      updatedCodexArray.push({
          id: pcId,
          name: updatedPC.name,
          type: 'PC',
          tags: baseTags,
          desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
          visibility: codexVisibility,
          image: updatedPC.image
      });
  } else {
      // PRESERVE CUSTOM TAGS: Get any tags currently on the codex entry, merge with the base tags, and deduplicate.
      // This is the Safe Tag Merge logic ensuring manual adjustments to PC tags are retained safely.
      const existingTags = existingCodexEntry.tags || [];
      const mergedTags = [...new Set([...baseTags, ...existingTags])];

      updatedCodexArray = updatedCodexArray.map(c => {
          if (c.id === pcId) {
              return {
                  ...c,
                  name: updatedPC.name,
                  type: 'PC',
                  tags: mergedTags,
                  visibility: codexVisibility,
                  image: updatedPC.image
              };
          }
          return c;
      });
  }

  let updatedCamp = { ...camp, playerCharacters: newPCs, codex: updatedCodexArray };

  // Track Player Edits!
  if (!isDM) {
      updatedCamp = logPlayerActivity(updatedCamp, myUid, `updated the private journal for <span class="font-bold text-amber-700">${updatedPC.name}</span>.`, 'fa-user-pen');
  }

  // Local Optimistic Update
  window.appData.activeCampaign = updatedCamp;
  reRender();

  await saveCampaign(updatedCamp);

  window.appActions.setView('pc-manager');
  notify("Hero profile inscribed.", "success");
};

export const deletePC = async (pcId) => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) {
    notify("Only the DM can remove heroes.", "error");
    return;
  }
  
  const updatedCamp = {
    ...camp,
    playerCharacters: camp.playerCharacters.filter(pc => pc.id !== pcId),
    codex: (camp.codex || []).filter(c => c.id !== pcId) 
  };
  
  await saveCampaign(updatedCamp);
  notify("Hero removed.", "success");
  
  if (window.appData.activePcId === pcId) {
      window.appActions.setView('pc-manager');
  } else {
      reRender(true);
  }
};

export const kickPlayer = async (uid) => {
  updateDerivedState();
  const camp = window.appData.activeCampaign;
  if (!camp || !camp._isDM) return;
  
  const updatedPlayers = (camp.activePlayers || []).filter(id => id !== uid);
  
  const updatedNames = { ...camp.playerNames };
  delete updatedNames[uid];
  
  const updatedBirthdays = { ...camp.playerBirthdays };
  delete updatedBirthdays[uid];
  
  const updatedPCs = (camp.playerCharacters || []).map(pc => {
    if (pc.playerId === uid) return { ...pc, playerId: '' };
    return pc;
  });
  
  const updatedCamp = {
    ...camp,
    activePlayers: updatedPlayers,
    playerNames: updatedNames,
    playerBirthdays: updatedBirthdays,
    playerCharacters: updatedPCs
  };
  
  await saveCampaign(updatedCamp);
  notify("Player exiled from the campaign.", "success");
  reRender(true);
};

// ============================================================================
// --- D&D BEYOND IMPORT ENGINE ---
// ============================================================================

const parseDDBCharacter = (charData) => {
    const statModMap = { 'strength-score': 1, 'dexterity-score': 2, 'constitution-score': 3, 'intelligence-score': 4, 'wisdom-score': 5, 'charisma-score': 6 };
    const skillAbilities = {
        'athletics': 1, 'acrobatics': 2, 'sleight-of-hand': 2, 'stealth': 2,
        'arcana': 4, 'history': 4, 'indigo-success': 4, 'nature': 4, 'religion': 4,
        'animal-handling': 5, 'insight': 5, 'medicine': 5, 'perception': 5, 'survival': 5,
        'deception': 6, 'intimidation': 6, 'performance': 6, 'persuasion': 6
    };
    
    const formatName = (str) => str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

    const alignmentMap = { 1: 'Lawful Good', 2: 'Neutral Good', 3: 'Chaotic Good', 4: 'Lawful Neutral', 5: 'True Neutral', 6: 'Chaotic Neutral', 7: 'Lawful Evil', 8: 'Neutral Evil', 9: 'Chaotic Evil' };
    const sizeMap = { 2: 'Tiny', 3: 'Small', 4: 'Medium', 5: 'Large', 6: 'Huge', 7: 'Gargantuan' };

    const stats = { 1: {base: 10, bonus: 0, override: 0}, 2: {base: 10, bonus: 0, override: 0}, 3: {base: 10, bonus: 0, override: 0}, 4: {base: 10, bonus: 0, override: 0}, 5: {base: 10, bonus: 0, override: 0}, 6: {base: 10, bonus: 0, override: 0} };
    charData.stats?.forEach(s => { if(stats[s.id]) stats[s.id].base = s.value; });
    charData.overrideStats?.forEach(s => { if(stats[s.id] && s.value) stats[s.id].override = s.value; });
    
    let proficiencies = { saves: {}, skills: {}, weapons: [], armor: [], tools: [], languages: [] };

    Object.values(charData.modifiers || {}).forEach(modArr => {
        if (Array.isArray(modArr)) {
            modArr.forEach(mod => {
                const subType = mod.subType || '';
                const type = mod.type || '';
                const friendlyName = mod.friendlySubtypeName || formatName(subType);

                if (type === 'bonus' && statModMap[subType]) {
                    stats[statModMap[subType]].bonus += mod.value;
                }
                
                if (type === 'proficiency' || type === 'expertise') {
                    const profVal = type === 'expertise' ? 2 : 1;
                    if (subType.includes('saving-throws')) {
                        const statId = statModMap[subType.replace('-saving-throws', '-score')];
                        if (statId) proficiencies.saves[statId] = profVal;
                    } else if (skillAbilities[subType]) {
                        proficiencies.skills[subType] = Math.max(proficiencies.skills[subType] || 0, profVal);
                    } else if (type === 'language') {
                         proficiencies.languages.push(friendlyName);
                    } else if (subType.includes('armor') || subType === 'shields') {
                        proficiencies.armor.push(friendlyName);
                    } else if (subType.includes('weapons') || subType.includes('sword') || subType.includes('bow') || subType.includes('axe') || subType.includes('hammer') || subType.includes('mace') || subType.includes('crossbow')) {
                         proficiencies.weapons.push(friendlyName);
                    } else if (subType.includes('tools') || subType.includes('kit') || subType.includes('supplies') || subType.includes('instrument') || subType.includes('vehicles') || subType.includes('utensils')) {
                         proficiencies.tools.push(friendlyName);
                    } else {
                        if (friendlyName.includes('Armor') || friendlyName.includes('Shield')) proficiencies.armor.push(friendlyName);
                        else if (friendlyName.includes('Weapons') || friendlyName.includes('Sword') || friendlyName.includes('Bow')) proficiencies.weapons.push(friendlyName);
                    }
                } else if (type === 'language') {
                     proficiencies.languages.push(friendlyName);
                }
            });
        }
    });

    for(let i=1; i<=6; i++) {
        stats[i].total = stats[i].override || (stats[i].base + stats[i].bonus);
    }

    const equippedItems = [];
    const backpackItems = [];
    let wealth = charData.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    
    if (charData.inventory && Array.isArray(charData.inventory)) {
        charData.inventory.forEach(item => {
            const name = item.definition?.name || 'Unknown Item';
            const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
            if (item.equipped) equippedItems.push(`${name}${qty}`);
            else backpackItems.push(`${name}${qty}`);
        });
    }

    const savesArr = [];
    const statNames = {1:'STR', 2:'DEX', 3:'CON', 4:'INT', 5:'WIS', 6:'CHA'};
    for (let i = 1; i <= 6; i++) { if (proficiencies.saves[i]) savesArr.push(statNames[i]); }

    const skillsArr = [];
    Object.keys(skillAbilities).forEach(skillKey => {
        if (proficiencies.skills[skillKey]) skillsArr.push(formatName(skillKey));
    });

    const sizeId = charData.race?.sizeId || charData.sizeId;
    const finalSize = sizeMap[sizeId] || charData.size || '';

    return {
        name: charData.name || 'Unknown',
        race: charData.race?.fullName || charData.race?.baseName || '',
        classLevel: charData.classes?.map(c => `${c.definition?.name} ${c.level}`).join(' / ') || '',
        background: charData.background?.definition?.name || (charData.background?.customBackground ? charData.background.customBackground.name : ''),
        alignment: alignmentMap[charData.alignmentId] || '', 
        faith: charData.faith || '',
        gender: charData.gender || '',
        age: charData.age || '',
        size: finalSize,
        height: charData.height || '',
        weight: charData.weight || '',
        eyes: charData.eyes || '',
        hair: charData.hair || '',
        skin: charData.skin || '',
        image: '', 
        str: stats[1].total, dex: stats[2].total, con: stats[3].total, 
        int: stats[4].total, wis: stats[5].total, cha: stats[6].total,
        saves: savesArr.join(', '),
        skills: skillsArr.join(', '),
        proficiencies: [...new Set([...proficiencies.weapons, ...proficiencies.armor, ...proficiencies.tools, ...proficiencies.languages])].join(', '),
        wealth: `${wealth.cp}cp, ${wealth.sp}sp, ${wealth.ep}ep, ${wealth.gp}gp, ${wealth.pp}pp`,
        equipped: equippedItems.join('\n'),
        backpack: backpackItems.join('\n'),
        traits: stripHtml(charData.traits?.personalityTraits),
        ideals: stripHtml(charData.traits?.ideals),
        bonds: stripHtml(charData.traits?.bonds),
        flaws: stripHtml(charData.traits?.flaws),
        appearance: stripHtml(charData.traits?.appearance),
        backstory: stripHtml(charData.notes?.backstory),
        organizations: stripHtml(charData.notes?.organizations),
        allies: stripHtml(charData.notes?.allies),
        enemies: stripHtml(charData.notes?.enemies)
    };
};

const fetchWithProxyCascade = async (targetUrl) => {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    let lastError = null;
    for (const proxy of proxies) {
        try {
            console.log(`Attempting D&D Beyond fetch via: ${proxy.split('/')[2]}`);
            const response = await fetch(proxy, { headers: { 'Cache-Control': 'no-cache' } });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (err) {
            console.warn(`Proxy failed: ${proxy.split('/')[2]}`, err);
            lastError = err;
        }
    }
    
    throw new Error("All CORS proxies failed. D&D Beyond might be down, or you are being rate-limited. Please try again later.");
};


export const openDndBeyondImportModal = () => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-4xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-stone-900 p-4 border-b-4 border-red-900 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-file-import mr-2 text-red-500"></i> D&D Beyond Importer</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] flex flex-col gap-4">
                    <div class="bg-amber-50 border border-amber-200 p-4 rounded-sm shadow-sm text-amber-900 text-sm leading-snug">
                        <i class="fa-solid fa-circle-info mr-1 text-amber-600"></i> Paste the full URL to your public D&D Beyond character sheet. The app will fetch the data and extract your hero's attributes, classes, and lore automatically.
                    </div>
                    
                    <div class="flex gap-2 w-full max-w-2xl mx-auto mt-2">
                        <input type="text" id="ddb-url-input" class="flex-grow p-3 border border-[#d4c5a9] rounded-sm text-sm font-bold bg-white shadow-inner focus:border-red-900 outline-none" placeholder="e.g. https://www.dndbeyond.com/characters/12345678">
                        <button id="ddb-fetch-btn" onclick="window.appActions.fetchAndAnalyzeDndBeyond()" class="px-6 py-3 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-xs shadow-md shrink-0 whitespace-nowrap"><i class="fa-solid fa-cloud-arrow-down mr-2"></i> Fetch & Analyze</button>
                    </div>

                    <div id="ddb-analysis-output" class="hidden flex-grow bg-stone-900 text-green-400 p-4 rounded-sm font-mono text-[10px] sm:text-xs overflow-auto custom-scrollbar min-h-[300px] border border-stone-700 shadow-inner whitespace-pre-wrap mt-4"></div>
                </div>
            </div>
        </div>
    `;
};

export const fetchAndAnalyzeDndBeyond = async () => {
    const input = document.getElementById('ddb-url-input').value.trim();
    const output = document.getElementById('ddb-analysis-output');
    const btn = document.getElementById('ddb-fetch-btn');
    
    if (!input) {
        notify("Please enter a valid D&D Beyond character URL.", "error");
        return;
    }

    const match = input.match(/\/characters?\/(\d+)/i) || input.match(/^(\d+)$/);
    if (!match) {
        notify("Could not find a character ID. Please ensure it looks like dndbeyond.com/characters/12345678", "error");
        return;
    }
    const characterId = match[1];

    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Fetching...';
    btn.disabled = true;
    output.classList.add('hidden');

    try {
        const cacheBust = new Date().getTime();
        const apiUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}?cb=${cacheBust}`;
        
        const ddbData = await fetchWithProxyCascade(apiUrl);
        
        if (!ddbData || !ddbData.success || !ddbData.data) {
            throw new Error("D&D Beyond returned an unexpected data structure. Ensure the character is set to Public.");
        }

        const parsedData = parseDDBCharacter(ddbData.data);
        
        window.appData.tempDdbImport = {
            ...parsedData,
            id: generateId(),
            ddbId: characterId,
            playerId: '', inspiration: 0, automaticSuccess: false, availableDowntime: 0, downtimeLog: ''
        };

        let analysis = `✅ Character Successfully Fetched via API.\n\n`;
        analysis += `Name: ${parsedData.name}\n`;
        analysis += `Race: ${parsedData.race}\n`;
        analysis += `Class: ${parsedData.classLevel}\n\n`;
        
        analysis += `STR: ${parsedData.str} | DEX: ${parsedData.dex} | CON: ${parsedData.con}\n`;
        analysis += `INT: ${parsedData.int} | WIS: ${parsedData.wis} | CHA: ${parsedData.cha}\n\n`;
        
        analysis += `Saving Throws: ${parsedData.saves || 'None'}\n`;
        analysis += `Skills: ${parsedData.skills || 'None'}\n`;
        analysis += `Proficiencies: ${parsedData.proficiencies || 'None'}\n\n`;
        
        analysis += `Wealth: ${parsedData.wealth}\n`;
        
        const eqCount = parsedData.equipped ? parsedData.equipped.split('\n').length : 0;
        const bpCount = parsedData.backpack ? parsedData.backpack.split('\n').length : 0;
        analysis += `Equipment: ${eqCount} items equipped, ${bpCount} in backpack.\n`;

        output.innerHTML = `
            <div class="text-green-400 whitespace-pre-wrap mb-4">${analysis}</div>
            <button onclick="window.appActions.executeDndBeyondImport()" class="w-full py-3 bg-emerald-700 text-white rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                <i class="fa-solid fa-user-check mr-2"></i> Import ${parsedData.name} into Campaign
            </button>
        `;
        
        output.classList.remove('hidden');
        output.classList.remove('text-red-500');
        output.classList.add('text-green-400');
        
    } catch (e) {
        output.textContent = "Error parsing D&D Beyond data: \n" + e.message;
        output.classList.remove('hidden');
        output.classList.remove('text-green-400');
        output.classList.add('text-red-500');
    } finally {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
    }
};

export const executeDndBeyondImport = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const newPC = window.appData.tempDdbImport;
    if (!newPC) {
        notify("No character data found to import.", "error");
        return;
    }

    const newPCs = [...(camp.playerCharacters || []), newPC];

    let updatedCodexArray = [...(camp.codex || [])];
    updatedCodexArray.push({
        id: newPC.id,
        name: newPC.name,
        type: 'PC',
        tags: ['Hero', newPC.race, newPC.classLevel].filter(Boolean),
        desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
        visibility: { mode: 'public' },
        image: newPC.image
    });

    let updatedCamp = { ...camp, playerCharacters: newPCs, codex: updatedCodexArray };
    updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `imported a new hero: <span class="font-bold text-amber-700">${newPC.name}</span>.`, 'fa-file-import');

    await saveCampaign(updatedCamp);

    document.getElementById('global-popup-container').innerHTML = '';
    window.appData.tempDdbImport = null;
    notify("Hero imported successfully.", "success");
    reRender(true);
};

export const quickSyncDDB = async (pcId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    let ddbIdToUse = "";
    const isEditView = window.appData.currentView === 'pc-edit';
    
    if (isEditView) {
        const inputEl = document.getElementById('pc-edit-ddb-id');
        if (inputEl && inputEl.value.trim()) {
            ddbIdToUse = inputEl.value.trim();
        }
    } 
    
    if (!ddbIdToUse) {
        const pc = camp.playerCharacters?.find(p => p.id === pcId);
        if (pc && pc.ddbId) {
            ddbIdToUse = pc.ddbId;
        }
    }

    if (!ddbIdToUse) {
        notify("No D&D Beyond ID or URL found for this hero. Enter one and try again.", "error");
        return;
    }

    const match = ddbIdToUse.match(/\/characters?\/(\d+)/i) || ddbIdToUse.match(/^(\d+)$/);
    if (!match) {
        notify("Invalid D&D Beyond ID or URL format.", "error");
        return;
    }
    const characterId = match[1];

    notify("Syncing with D&D Beyond...", "info");

    try {
        const cacheBust = new Date().getTime();
        const apiUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}?cb=${cacheBust}`;
        
        const ddbData = await fetchWithProxyCascade(apiUrl);

        if (!ddbData || !ddbData.success || !ddbData.data) {
            throw new Error("D&D Beyond returned an unexpected data structure.");
        }

        const parsedData = parseDDBCharacter(ddbData.data);
        parsedData.ddbId = characterId;

        if (isEditView) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
            
            setVal('pc-edit-name', parsedData.name);
            setVal('pc-edit-race', parsedData.race);
            setVal('pc-edit-class', parsedData.classLevel);
            setVal('pc-edit-background', parsedData.background);
            setVal('pc-edit-alignment', parsedData.alignment);
            setVal('pc-edit-faith', parsedData.faith);
            setVal('pc-edit-gender', parsedData.gender);
            setVal('pc-edit-age', parsedData.age);
            setVal('pc-edit-size', parsedData.size);
            setVal('pc-edit-height', parsedData.height);
            setVal('pc-edit-weight', parsedData.weight);
            setVal('pc-edit-eyes', parsedData.eyes);
            setVal('pc-edit-hair', parsedData.hair);
            setVal('pc-edit-skin', parsedData.skin);
            
            setVal('pc-edit-str', parsedData.str);
            setVal('pc-edit-dex', parsedData.dex);
            setVal('pc-edit-con', parsedData.con);
            setVal('pc-edit-int', parsedData.int);
            setVal('pc-edit-wis', parsedData.wis);
            setVal('pc-edit-cha', parsedData.cha);
            
            setVal('pc-edit-saves', parsedData.saves);
            setVal('pc-edit-skills', parsedData.skills);
            setVal('pc-edit-proficiencies', parsedData.proficiencies);
            setVal('pc-edit-wealth', parsedData.wealth);
            
            setVal('input-pc-edit-traits', parsedData.traits);
            setVal('input-pc-edit-ideals', parsedData.ideals);
            setVal('input-pc-edit-bonds', parsedData.bonds);
            setVal('input-pc-edit-flaws', parsedData.flaws);
            setVal('input-pc-edit-appearance', parsedData.appearance);
            setVal('input-pc-edit-backstory', parsedData.backstory);
            setVal('input-pc-edit-organizations', parsedData.organizations);
            setVal('input-pc-edit-allies', parsedData.allies);
            setVal('input-pc-edit-enemies', parsedData.enemies);
            setVal('input-pc-edit-equipped', parsedData.equipped);
            setVal('input-pc-edit-backpack', parsedData.backpack);
            
            notify("Fields populated! Click 'Inscribe' when ready to save.", "success");
            
            const zenDivs = ['traits', 'ideals', 'bonds', 'flaws', 'appearance', 'backstory', 'organizations', 'allies', 'enemies', 'equipped', 'backpack'];
            zenDivs.forEach(z => {
                const viewDiv = document.getElementById(`view-input-pc-edit-${z}`);
                if (viewDiv) viewDiv.innerHTML = parsedData[z] ? window.appActions.parseSmartText(parsedData[z]) : '<span class="text-stone-400 italic">No entry provided...</span>';
            });
        } 
        else {
            const pc = camp.playerCharacters?.find(p => p.id === pcId);
            if (!pc) return;

            const mergedPC = {
                ...pc,
                ...parsedData,
                image: pc.image || '', 
                appearance: parsedData.appearance || pc.appearance || '',
                backstory: parsedData.backstory || pc.backstory || '',
            };

            const updatedPCs = camp.playerCharacters.map(p => p.id === pcId ? mergedPC : p);
            
            let updatedCamp = { ...camp, playerCharacters: updatedPCs };
            updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `synced <span class="font-bold text-amber-700">${mergedPC.name}</span> with D&D Beyond.`, 'fa-cloud-arrow-down');

            await saveCampaign(updatedCamp);
            notify(`${mergedPC.name} synced perfectly.`, "success");
            reRender(true);
        }

    } catch (e) {
        console.error(e);
        notify("Failed to sync: " + e.message, "error");
    }
};

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.switchPCEditTab = (tabId) => {
        const tabs = ['identity', 'lore', 'inventory', 'dm'];
        tabs.forEach(t => {
            const btn = document.getElementById(`pc-tab-btn-${t}`);
            const content = document.getElementById(`pc-tab-content-${t}`);
            if (!btn || !content) return;

            if (t === tabId) {
                btn.className = "pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition bg-[#fdfbf7] text-red-900 border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900";
                content.classList.remove('hidden');
            } else {
                btn.className = "pc-tab-btn whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-t-2 border-l border-r border-transparent hover:text-stone-800";
                content.classList.add('hidden');
            }
        });
    };

    // Bind General Actions
    window.appActions.savePCEdit = savePCEdit;
    window.appActions.deletePC = deletePC;
    window.appActions.kickPlayer = kickPlayer;
    
    // DDB Integration Imports
    window.appActions.openDndBeyondImportModal = openDndBeyondImportModal;
    window.appActions.fetchAndAnalyzeDndBeyond = fetchAndAnalyzeDndBeyond;
    window.appActions.executeDndBeyondImport = executeDndBeyondImport;
    window.appActions.quickSyncDDB = quickSyncDDB;
}
