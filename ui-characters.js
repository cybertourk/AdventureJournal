import { renderSmartField } from './ui-core.js';

export function getPCManagerHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    const pcs = camp.playerCharacters || [];
    const isDM = camp._isDM;
    const myUid = state.currentUserUid;

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Party Manifest</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic">Heroes of ${camp.name}</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                ${isDM ? `
                <button onclick="window.appActions.openPCEdit(null)" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-900 text-amber-50 border border-red-950 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
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

            html += `
            <div class="bg-[#fdfbf7] p-0 sm:p-0 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col group relative overflow-hidden hover:shadow-md transition">
                <div class="absolute top-0 left-0 w-1 h-full ${canEdit ? 'bg-red-900 group-hover:bg-red-700' : 'bg-stone-400 group-hover:bg-amber-600'} transition-colors z-20"></div>
                
                ${pc.image ? `<div class="h-32 sm:h-48 w-full overflow-hidden border-b border-[#d4c5a9] bg-stone-900"><img src="${pc.image}" alt="${pc.name}" class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none'"></div>` : ''}
                
                <div class="p-4 sm:p-5 pl-5 sm:pl-6 flex flex-col justify-between flex-grow">
                    <div>
                        <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-900 truncate">${pc.name}</h3>
                        <p class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1 sm:mt-2">
                            ${race} <span class="mx-1">•</span> ${classLevel}
                        </p>
                    </div>
                    <div class="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#d4c5a9]/50 flex flex-wrap gap-4">
                        ${canEdit ? `
                        <button onclick="window.appActions.openPCEdit('${pc.id}')" class="text-stone-700 hover:text-red-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition relative">
                            <i class="fa-solid fa-book-open mr-1.5"></i> Private Journal
                        </button>
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
            <h3 class="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center">
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
    
    const pc = !isNew && camp?.playerCharacters 
        ? camp.playerCharacters.find(p => p.id === state.activePcId) 
        : { name: '', race: '', classLevel: '', background: '', alignment: '', faith: '', gender: '', age: '', size: '', height: '', weight: '', eyes: '', hair: '', skin: '', traits: '', ideals: '', bonds: '', flaws: '', appearance: '', backstory: '', dmNotes: '', playerId: '', image: '' };

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

    const coreReadonlyAttr = !isDM ? 'readonly disabled' : '';
    const coreClass = !isDM ? 'opacity-70 bg-[#e8dec7] cursor-not-allowed' : 'bg-white focus:border-red-900';

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
            <div class="col-span-full border-b-2 border-stone-300 pb-4 mb-2">
                <label class="block text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5"><i class="fa-solid fa-link mr-1"></i> DM Override: Assigned Player</label>
                <select id="pc-edit-player-id" class="w-full sm:w-1/2 p-2 border border-blue-300 rounded-sm text-sm bg-blue-50 font-bold text-blue-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- DM Controlled (NPC / Unassigned) --</option>
                    ${options}
                </select>
                <p class="text-[10px] text-stone-500 mt-1 italic">Assigning a player allows them to edit this hero's backstory and traits.</p>
            </div>
        `;
    } else {
        playerAssignHTML = `<input type="hidden" id="pc-edit-player-id" value="${pc.playerId || ''}">`;
    }

    return `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#f4ebd8] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-4xl mx-auto mb-8">
        
        <!-- Header -->
        <div class="bg-stone-900 p-4 border-b-4 border-red-900 text-amber-500 flex justify-between items-center relative">
            <h2 class="text-xl sm:text-2xl font-serif font-bold z-10 flex items-center">
                <i class="fa-solid fa-user-pen mr-3 text-red-700"></i> ${title}
            </h2>
            <div class="absolute right-0 top-0 bottom-0 w-24 sm:w-32 opacity-10 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
                <i class="fa-solid fa-shield-halved text-5xl sm:text-6xl text-amber-50"></i>
            </div>
        </div>

        <!-- Form Content -->
        <div class="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            
            <div class="bg-blue-900/10 border-l-4 border-blue-600 p-4 rounded-sm text-sm text-stone-800 italic">
                <i class="fa-solid fa-circle-info text-blue-600 mr-2"></i> When you save this journal, a <strong>Public Profile</strong> will automatically be generated (or updated) in the Codex so the rest of the party can read what your hero looks like!
            </div>

            <!-- Basic Info Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                ${playerAssignHTML}
                <div class="col-span-1 sm:col-span-2 lg:col-span-1">
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Hero Name *</label>
                    <input type="text" id="pc-edit-name" value="${pc.name}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-sm outline-none font-serif ${coreClass}" placeholder="e.g. Eldrin">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Race / Lineage</label>
                    <input type="text" id="pc-edit-race" value="${pc.race || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Wood Elf">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Class & Level</label>
                    <input type="text" id="pc-edit-class" value="${pc.classLevel || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Ranger 4">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Background</label>
                    <input type="text" id="pc-edit-background" value="${pc.background || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Acolyte">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Alignment</label>
                    <input type="text" id="pc-edit-alignment" value="${pc.alignment || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Chaotic Good">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Faith / Deity</label>
                    <input type="text" id="pc-edit-faith" value="${pc.faith || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="e.g. Corellon Larethian">
                </div>
                <div class="col-span-1 sm:col-span-2 lg:col-span-3 mt-2 border-t border-[#d4c5a9] pt-4">
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Portrait Image URL</label>
                    <input type="text" id="pc-edit-image" value="${pc.image || ''}" ${coreReadonlyAttr} class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="https://example.com/portrait.jpg">
                </div>
            </div>

            <!-- Characteristics Grid -->
            <div class="bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1">Characteristics</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Gender</label>
                        <input type="text" id="pc-edit-gender" value="${pc.gender || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Age</label>
                        <input type="text" id="pc-edit-age" value="${pc.age || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Size</label>
                        <input type="text" id="pc-edit-size" value="${pc.size || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}" placeholder="Medium">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Height</label>
                        <input type="text" id="pc-edit-height" value="${pc.height || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Weight</label>
                        <input type="text" id="pc-edit-weight" value="${pc.weight || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Eyes</label>
                        <input type="text" id="pc-edit-eyes" value="${pc.eyes || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Hair</label>
                        <input type="text" id="pc-edit-hair" value="${pc.hair || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Skin</label>
                        <input type="text" id="pc-edit-skin" value="${pc.skin || ''}" ${coreReadonlyAttr} class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-700 shadow-sm outline-none ${coreClass}">
                    </div>
                </div>
            </div>

            <!-- Roleplay Grid (Universal Editor Linked) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                ${renderSmartField('pc-edit-traits', 'Personality Traits', pc.traits || '', 'What are their unique quirks?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                ${renderSmartField('pc-edit-ideals', 'Ideals', pc.ideals || '', 'What drives them?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                ${renderSmartField('pc-edit-bonds', 'Bonds', pc.bonds || '', 'Who or what do they care about?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                ${renderSmartField('pc-edit-flaws', 'Flaws', pc.flaws || '', 'What are their weaknesses?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
            </div>

            <!-- Detailed Notes & Checklist -->
            <div class="space-y-4 sm:space-y-6">
                ${renderSmartField('pc-edit-appearance', `<i class="fa-solid fa-user text-stone-500 mr-2"></i> Appearance`, pc.appearance || '', "Detailed physical description, scars, tattoos, clothing...", 4, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                ${renderSmartField('pc-edit-backstory', `<i class="fa-solid fa-book-open text-stone-500 mr-2"></i> Backstory`, pc.backstory || '', "The hero's origins...", 5, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                
                <!-- DM ONLY -->
                ${isDM ? renderSmartField('pc-edit-dmnotes', `<i class="fa-solid fa-eye text-red-900 mr-2"></i> DM's Secret Notes`, pc.dmNotes || '', 'Hooks, secrets, curses, or background ties...', 4, 'bg-stone-200 border border-[#d4c5a9] shadow-inner border-l-4 border-l-red-900', false) : ''}
            </div>

        </div>

        <!-- Footer Actions -->
        <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between items-center gap-4">
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
