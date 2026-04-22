```javascript
import { renderSmartField, renderLevelOptions } from './ui-core.js';

export function getSessionEditHTML(state) {
    const adv = state.activeAdventure;
    const session = state.activeSession;
    const camp = state.activeCampaign;
    if (!adv || !camp) return '';

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    
    const draftName = session ? session.name : `Log from ${new Date().toLocaleDateString()}`;
    const draftStartLevel = adv.startLevel;
    const draftEndLevel = adv.endLevel;
    const draftNumPlayers = adv.numPlayers;

    const draftLootText = session ? session.lootText : '';
    const draftNotes = session ? session.notes : '';

    // --- FOG OF WAR FILTER ---
    const isVisibleToPlayer = (item) => {
        if (isDM) return true; // DM sees all
        const vis = item.visibility || { mode: 'public' }; // Default to public for older legacy data
        if (vis.mode === 'public') return true;
        if (vis.mode === 'hidden') return false;
        if (vis.mode === 'specific' && vis.visibleTo && vis.visibleTo.includes(myUid)) return true;
        return false;
    };

    const visibleScenes = (session?.scenes || [{id:1, text:''}]).filter(isVisibleToPlayer);
    const visibleClues = (session?.clues || [{id:1, text:''}]).filter(isVisibleToPlayer);

    // --- VISIBILITY UI HELPER ---
    const getVisStatus = (item) => {
        const mode = item?.visibility?.mode || 'public';
        const players = (item?.visibility?.visibleTo || []).join(',');
        
        let icon = 'fa-eye';
        let color = 'text-emerald-600 hover:text-emerald-500';
        let label = 'Public';
        
        if (mode === 'hidden') {
            icon = 'fa-eye-slash';
            color = 'text-red-700 hover:text-red-600';
            label = 'Hidden';
        } else if (mode === 'specific') {
            icon = 'fa-user-lock';
            color = 'text-blue-600 hover:text-blue-500';
            label = 'Shared';
        }
        
        return { mode, players, icon, color, label };
    };

    const clueRow = (c, idx) => {
        const vis = getVisStatus(c);
        return `
        <div class="mb-2 flex gap-2 items-center clue-row bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm group">
            <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
            <input type="hidden" class="vis-mode-input" value="${vis.mode}">
            <input type="hidden" class="vis-players-input" value="${vis.players}">
            
            <input type="text" ${!isDM ? 'readonly' : ''} class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400 ${!isDM ? 'opacity-70' : ''}" placeholder="Quest update, clue, or objective..." value="${(c.text || '').replace(/"/g, '&quot;')}">
            
            ${isDM ? `
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="${vis.color} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="window.appActions.openVisibilityMenu(this)">
                    <i class="fa-solid ${vis.icon}"></i>
                </button>
                <button class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            ` : ''}
        </div>`;
    };

    let html = `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#f4ebd8] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col" style="min-height: calc(100vh - 120px);">
        <!-- Header -->
        <div class="bg-stone-900 p-3 sm:p-4 border-b-4 border-red-900 text-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 relative">
            <div class="flex-grow w-full sm:w-auto z-10">
                <input type="text" id="draft-name" value="${draftName}" ${!isDM ? 'readonly disabled' : ''} class="bg-stone-800 text-amber-400 px-3 py-1.5 sm:py-2 rounded-sm border border-stone-600 focus:border-amber-500 focus:outline-none w-full sm:w-80 font-serif font-bold text-lg sm:text-xl shadow-inner" placeholder="Session Title...">
            </div>
            <div class="flex flex-wrap gap-2 w-full sm:w-auto self-end z-10">
                <button onclick="window.appActions.setView('adventure')" class="px-4 sm:px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 border border-stone-500 rounded-sm transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex-1 sm:flex-none text-center shadow-md">${isDM ? 'Cancel' : 'Back'}</button>
                ${isDM ? `
                <button onclick="window.appActions.saveSession()" class="px-4 sm:px-5 py-2 bg-red-900 hover:bg-red-800 text-amber-50 border border-red-950 rounded-sm transition font-bold uppercase tracking-wider flex items-center justify-center text-[10px] sm:text-xs flex-1 sm:flex-none shadow-md">
                    <i class="fa-solid fa-pen-nib mr-1 sm:mr-2"></i> Record
                </button>
                ` : ''}
            </div>
            <div class="absolute right-0 top-0 bottom-0 w-24 sm:w-32 opacity-10 pointer-events-none overflow-hidden flex items-center justify-end pr-2 sm:pr-4">
                <i class="fa-solid fa-scroll text-5xl sm:text-6xl text-amber-50"></i>
            </div>
        </div>

        <!-- Scrollable Tabs for Mobile -->
        <div class="flex overflow-x-auto hide-scrollbar border-b border-[#d4c5a9] bg-[#e8dec7] px-2 sm:px-4 pt-2">
            <button id="tab-btn-session" onclick="window.appActions.switchSessionTab('session')" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition">Session Events</button>
            <button id="tab-btn-pcs" onclick="window.appActions.switchSessionTab('pcs')" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition">Hero Status</button>
            <button id="tab-btn-preview" onclick="window.appActions.switchSessionTab('preview')" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition">Live Journal</button>
        </div>

        <!-- Content Area -->
        <div class="flex-grow overflow-y-auto p-3 sm:p-6 bg-[#f4ebd8]">
            
            <!-- TAB: SESSION -->
            <div id="tab-content-session" class="hidden">
                <!-- Top Settings Bar (DM ONLY FOR BUDGET/LOOT/LEVELS) -->
                ${isDM ? `
                <div class="bg-[#fdfbf7] p-3 sm:p-4 rounded-sm border border-[#d4c5a9] shadow-sm mb-4 sm:mb-6 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-end">
                    <div class="flex flex-wrap gap-4 sm:gap-6">
                        <div>
                            <label class="block text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 sm:mb-1.5">Level Range</label>
                            <div class="flex items-center gap-1 sm:gap-2">
                                <select id="draft-start-level" class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" onchange="window.appActions.updateSessionBudget()">
                                    ${renderLevelOptions(draftStartLevel)}
                                </select>
                                <span class="text-stone-400 font-serif italic text-xs sm:text-sm">to</span>
                                <select id="draft-end-level" class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" onchange="window.appActions.updateSessionBudget()">
                                    ${renderLevelOptions(draftEndLevel)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 sm:mb-1.5">Party Size</label>
                            <input type="number" min="1" id="draft-num-players" value="${draftNumPlayers}" class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm w-16 sm:w-20 text-center font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" oninput="window.appActions.updateSessionBudget()">
                        </div>
                    </div>

                    <!-- Budget Display -->
                    <div class="ml-auto w-full lg:w-auto bg-stone-900 border border-stone-700 p-2 sm:p-3 rounded-sm flex flex-wrap sm:flex-nowrap gap-2 sm:gap-6 text-center items-center justify-between sm:justify-start shadow-inner mt-2 lg:mt-0">
                        <div class="flex-1 sm:flex-none">
                            <div class="text-[8px] sm:text-[10px] text-stone-400 font-bold uppercase tracking-widest">Treasury</div>
                            <div id="budget-total" class="text-xs sm:text-sm font-bold text-amber-500">... gp</div>
                        </div>
                        <div class="w-px h-6 sm:h-8 bg-stone-700 hidden sm:block"></div>
                        <div class="flex-1 sm:flex-none">
                            <div class="text-[8px] sm:text-[10px] text-stone-400 font-bold uppercase tracking-widest">Hoard</div>
                            <div id="budget-loot" class="text-xs sm:text-sm font-bold text-amber-500">... gp</div>
                        </div>
                        <div class="w-px h-6 sm:h-8 bg-stone-700 hidden sm:block"></div>
                        <div class="flex-1 sm:flex-none">
                            <div class="text-[8px] sm:text-[10px] text-stone-400 font-bold uppercase tracking-widest">Remain</div>
                            <div id="budget-remain" class="text-xs sm:text-sm font-bold text-emerald-400">... gp</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Modular Layout Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                    
                    <!-- Left Col: Scenes -->
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-1 mb-2">
                            <label class="text-xs sm:text-sm font-bold text-stone-800 font-serif">Scenes & Encounters</label>
                            ${isDM ? `<button onclick="window.appActions.addLogScene()" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition"><i class="fa-solid fa-plus mr-1"></i> Add Scene</button>` : ''}
                        </div>
                        <div id="container-scenes">
                            ${visibleScenes.length === 0 ? `<p class="text-stone-500 italic text-sm font-serif">No scenes revealed.</p>` : ''}
                            ${visibleScenes.map((s, idx) => {
                                const vis = getVisStatus(s);
                                return `
                                <div class="mb-4 scene-row bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col group ${!isDM ? '' : 'cursor-text'}" ${!isDM ? '' : `onclick="window.appActions.openUniversalEditor('scene-input-${idx}', 'Scene ${idx + 1}')"`}>
                                    <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
                                        <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${idx + 1}</span>
                                        ${isDM ? `
                                        <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                                            <button class="${vis.color} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="event.stopPropagation(); window.appActions.openVisibilityMenu(this)">
                                                <i class="fa-solid ${vis.icon} mr-1"></i> ${vis.label}
                                            </button>
                                            <div class="w-px h-3 bg-stone-300"></div>
                                            <button class="text-[10px] text-stone-500 hover:text-blue-600 uppercase font-bold transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('scene-input-${idx}', 'Scene ${idx + 1}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                            <button class="text-[10px] text-red-800 hover:text-red-600 uppercase font-bold transition" onclick="event.stopPropagation(); this.closest('.scene-row').remove()"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                        ` : ''}
                                    </div>
                                    <input type="hidden" class="vis-mode-input" value="${vis.mode}">
                                    <input type="hidden" class="vis-players-input" value="${vis.players}">
                                    <input type="hidden" id="scene-input-${idx}" class="scene-hidden-input" value="${(s.text || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}">
                                    <div id="view-scene-input-${idx}" class="w-full text-stone-800 text-xs sm:text-sm p-3 min-h-[4rem] leading-relaxed whitespace-pre-wrap font-serif ${!isDM ? '' : 'group-hover:bg-white'} transition">
                                        ${(s.text && window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(s.text) : '<span class="text-stone-400 italic font-sans">No entry.</span>'}
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Right Col: Clues, Loot, Notes -->
                    <div class="space-y-4 sm:space-y-6">
                        <div>
                            <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-1 mb-2">
                                <label class="text-xs sm:text-sm font-bold text-stone-800 font-serif">Investigation & Clues</label>
                                ${isDM ? `<button onclick="window.appActions.addLogClue()" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition"><i class="fa-solid fa-plus mr-1"></i> Add</button>` : ''}
                            </div>
                            <div id="container-clues">
                                ${visibleClues.length === 0 ? `<p class="text-stone-500 italic text-sm font-serif">No clues revealed.</p>` : ''}
                                ${visibleClues.map((c, i) => clueRow(c, i)).join('')}
                            </div>
                        </div>
                        
                        <!-- DM ONLY: LOOT FIELD -->
                        ${isDM ? `
                        <div>
                            ${renderSmartField('draft-loot', 'Loot <span id="budget-live-calc" class="font-sans font-bold text-red-900 text-[10px] sm:text-xs ml-2">Calc: 0 gp</span>', draftLootText, 'e.g. 50 gp, 2 pp, +1 Longsword...', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', false)}
                        </div>
                        ` : ''}
                        
                        <div>
                            ${renderSmartField('draft-notes', 'General / DM Notes', draftNotes, 'Overall summary of the session...', 4, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', !isDM)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB: PCs -->
            <div id="tab-content-pcs" class="hidden">
    `;

    // Filter PCs down to ONLY the ones active in this specific adventure
    const activePcIds = adv?.activePcIds || camp?.playerCharacters?.map(p => p.id) || [];
    const pcs = (camp?.playerCharacters || []).filter(pc => activePcIds.includes(pc.id));
    
    if (pcs.length === 0) {
        html += `
            <div class="text-center p-8 sm:p-12 bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-users text-5xl sm:text-6xl text-stone-300 mx-auto mb-3 sm:mb-4"></i>
                <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-700">No Heroes Participating</h3>
                <p class="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6 font-sans">Return to the adventure overview and manage the Arc Roster to include heroes in this session.</p>
            </div>
        `;
    } else {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" id="pc-draft-list">`;
        pcs.forEach(pc => {
            const pcNote = session?.pcNotes ? (session.pcNotes[pc.id] || '') : '';
            html += `
                <div class="bg-[#fdfbf7] p-3 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col relative overflow-hidden pc-draft-item" data-id="${pc.id}">
                    <div class="absolute top-0 left-0 w-1 h-full bg-stone-400"></div>
                    <div class="flex justify-between items-center pb-2 sm:pb-3 pl-2 border-b border-stone-200">
                        <span class="font-serif font-bold text-base sm:text-xl text-stone-900 truncate pr-2">${pc.name}</span>
                        <div class="flex gap-2 sm:gap-4 flex-shrink-0">
                            <!-- Inspiration Toggle -->
                            <label class="flex items-center gap-1 sm:gap-1.5 ${!isDM ? 'cursor-not-allowed opacity-70' : 'cursor-pointer group'}" title="Inspiration">
                                <input type="checkbox" id="pc-insp-${pc.id}" class="peer hidden" ${pc.inspiration ? 'checked' : ''} ${!isDM ? 'disabled' : ''} />
                                <div class="p-1 sm:p-1.5 rounded-sm border transition-colors peer-checked:bg-amber-100 peer-checked:border-amber-400 peer-checked:text-amber-600 peer-checked:shadow-inner bg-stone-100 border-stone-200 text-stone-300 ${!isDM ? '' : 'group-hover:bg-stone-200 group-hover:text-stone-400'}">
                                    <i class="fa-solid fa-fire w-4 h-4 sm:w-5 sm:h-5"></i>
                                </div>
                                <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest peer-checked:text-amber-700 text-stone-400">Insp</span>
                            </label>
                            
                            <!-- Auto-Success Toggle -->
                            <label class="flex items-center gap-1 sm:gap-1.5 ${!isDM ? 'cursor-not-allowed opacity-70' : 'cursor-pointer group'}" title="Auto-Success">
                                <input type="checkbox" id="pc-auto-${pc.id}" class="peer hidden" ${pc.automaticSuccess ? 'checked' : ''} ${!isDM ? 'disabled' : ''} />
                                <div class="p-1 sm:p-1.5 rounded-sm border transition-colors peer-checked:bg-blue-50 peer-checked:border-blue-300 peer-checked:text-blue-600 peer-checked:shadow-inner bg-stone-100 border-stone-200 text-stone-300 ${!isDM ? '' : 'group-hover:bg-stone-200 group-hover:text-stone-400'}">
                                    <i class="fa-solid fa-shield-halved w-4 h-4 sm:w-5 sm:h-5"></i>
                                </div>
                                <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest peer-checked:text-blue-700 text-stone-400">Auto</span>
                            </label>
                        </div>
                    </div>
                    ${renderSmartField(`pc-note-${pc.id}`, 'Session Notes', pcNote, 'Heroic deeds or flaws...', 3, 'mt-2 flex-grow', !isDM)}
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `
            </div>

            <!-- TAB: PREVIEW -->
            <div id="tab-content-preview" class="hidden h-full">
                <div class="bg-stone-900 p-2 sm:p-3 rounded-t-sm border-b-2 border-red-900 flex justify-between items-center text-amber-500 shrink-0 shadow-md w-full">
                    <h3 class="text-xs sm:text-sm font-serif font-bold flex items-center">
                        <i class="fa-solid fa-scroll mr-2 text-red-700"></i> Live Preview
                    </h3>
                </div>
                <div id="draft-preview-text" class="w-full flex-grow p-4 sm:p-6 bg-[#fdfbf7] border border-[#d4c5a9] border-t-0 rounded-b-sm text-stone-900 font-serif text-[10px] sm:text-sm leading-relaxed shadow-inner h-[50vh] sm:h-[60vh] min-h-[300px] sm:min-h-[400px] overflow-y-auto custom-scrollbar"></div>
            </div>

        </div>
    </div>
    `;
    return html;
}

// --- UI HELPER FUNCTIONS ---

export function updateSessionTabUI(tabId) {
    const tabs = ['session', 'pcs', 'preview'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const content = document.getElementById(`tab-content-${t}`);
        if (!btn || !content) return;

        if (t === tabId) {
            btn.className = "whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900";
            content.classList.remove('hidden');
            if (t === 'preview') content.classList.add('flex', 'flex-col'); 
        } else {
            btn.className = "whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-transparent hover:text-stone-800";
            content.classList.add('hidden');
            if (t === 'preview') content.classList.remove('flex', 'flex-col');
        }
    });
}

export function updateBudgetUI(totalBudget, totalLoot, remaining, calculatedLootVal) {
    const budgetEl = document.getElementById('budget-total');
    const lootEl = document.getElementById('budget-loot');
    const remainEl = document.getElementById('budget-remain');
    const liveCalcEl = document.getElementById('budget-live-calc');
    
    if (budgetEl) budgetEl.textContent = `${totalBudget.toLocaleString()} gp`;
    if (lootEl) lootEl.textContent = `${totalLoot.toLocaleString(undefined, {minimumFractionDigits: 2})} gp`;
    
    if (remainEl) {
        remainEl.textContent = `${remaining.toLocaleString(undefined, {minimumFractionDigits: 2})} gp`;
        if (remaining >= 0) {
            remainEl.className = 'text-xs sm:text-sm font-bold text-emerald-400';
        } else {
            remainEl.className = 'text-xs sm:text-sm font-bold text-red-500';
        }
    }

    if (liveCalcEl) {
        liveCalcEl.textContent = `Calc: ${calculatedLootVal.toLocaleString()} gp`;
    }
}


```
