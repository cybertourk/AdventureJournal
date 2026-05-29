import { setView, openCampaign, openAdventure } from './actions-campaign.js';
import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// --- CONSTANTS & HELPERS ---
export const BUDGET_BY_LEVEL = { 
    1: 0, 2: 100, 3: 200, 4: 400, 5: 700, 6: 3000, 7: 5400, 8: 8600, 
    9: 12000, 10: 17000, 11: 21000, 12: 30000, 13: 39000, 14: 57000, 
    15: 75000, 16: 103000, 17: 130000, 18: 214000, 19: 383000, 20: 552000, 21: 805000 
};

// --- SECURITY HELPER: Prevent HTML Attribute Corruption ---
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export function renderLevelOptions(selected) {
    return Object.keys(BUDGET_BY_LEVEL).map(lvl => 
        `<option value="${lvl}" ${parseInt(lvl) === parseInt(selected) ? 'selected' : ''}>Level ${lvl === '21' ? '20+' : lvl}</option>`
    ).join('');
}

// --- SMART TEXT FIELD GENERATOR (ZEN MODE) ---
export function renderSmartField(id, labelHtml, value, placeholderText, rows, wrapperClass = '', isReadonly = false) {
    const hasText = value && value.trim().length > 0;
    const viewContent = (hasText && window.appActions && window.appActions.parseSmartText) 
        ? window.appActions.parseSmartText(value) 
        : `<span class="text-stone-400 italic font-sans">${placeholderText || "No entry provided."}</span>`;

    const plainLabel = labelHtml.replace(/<[^>]*>?/gm, '').trim().replace(/'/g, "\\'");
    const safeValue = (value || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');

    const onClickAttr = isReadonly ? '' : `onclick="window.appActions.openUniversalEditor('input-${id}', '${plainLabel}')"`;
    const cursorClass = isReadonly ? '' : 'cursor-text';
    const hoverClass = isReadonly ? '' : 'group-hover:bg-white';
    const editBtnHtml = isReadonly ? '' : `<button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-500 transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('input-${id}', '${plainLabel}')"><i class="fa-solid fa-pen"></i> Edit</button>`;

    return `
    <div class="scene-row flex flex-col ${wrapperClass} group ${cursorClass}" ${onClickAttr}>
        <div class="flex justify-between items-baseline border-b border-[#d4c5a9] pb-1 mb-1 mt-1">
            <label class="flex-grow text-xs sm:text-sm font-bold text-stone-800 font-serif flex items-center justify-between pr-4 pointer-events-none">${labelHtml}</label>
            <div class="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                ${editBtnHtml}
            </div>
        </div>
        
        <input type="hidden" id="input-${id}" value="${safeValue}">
        
        <div id="view-input-${id}" class="w-full p-2 sm:p-3 border border-transparent bg-transparent text-stone-800 text-xs sm:text-sm min-h-[${rows * 1.5}rem] leading-relaxed whitespace-pre-wrap font-serif ${hoverClass} transition rounded-sm">
            ${viewContent}
        </div>
    </div>
    `;
}

export function getLibraryTabsHTML(activeTab) {
    const isCodex = activeTab === 'codex';
    const isRules = activeTab === 'rules';
    const isWebs = activeTab === 'webs';
    const isBazaar = activeTab === 'bazaar';
    const isTome = activeTab === 'tome';
    const isDatabases = activeTab === 'databases';

    return `
    <div class="flex bg-stone-200 p-1 sm:p-1.5 rounded-sm border border-[#d4c5a9] shadow-inner mb-6 w-full max-w-5xl mx-auto shrink-0 overflow-x-auto hide-scrollbar">
        <button onclick="window.appActions.setView('codex')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isCodex ? 'bg-white shadow-sm text-red-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-book-journal-whills text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Codex</span>
        </button>
        <button onclick="window.appActions.openBazaar()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isBazaar ? 'bg-white shadow-sm text-emerald-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-store text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Bazaar</span>
        </button>
        <button onclick="window.appActions.openRulesGlossary()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isRules ? 'bg-white shadow-sm text-amber-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scale-balanced text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Rules</span>
        </button>
        <button onclick="window.appActions.setView('webs')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isWebs ? 'bg-white shadow-sm text-purple-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-diagram-project text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Webs</span>
        </button>
        <button onclick="window.appActions.openJournal('campaign')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isTome ? 'bg-white shadow-sm text-stone-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scroll text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Tome</span>
        </button>
        ${window.appData.activeCampaign?._isDM ? `
        <button onclick="window.appActions.setView('databases')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isDatabases ? 'bg-white shadow-sm text-teal-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-box-archive text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Data</span>
        </button>
        ` : ''}
        <button onclick="window.appActions.openChecklistMenu()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition text-stone-500 hover:text-blue-800 border border-transparent text-[9px] sm:text-[10px] uppercase tracking-wider relative group">
            <i class="fa-solid fa-list-check text-sm sm:text-base mb-0.5 sm:mb-0 group-hover:text-blue-600 transition-colors"></i> <span>Tasks</span>
            <span id="lib-tab-badge-tasks" class="hidden absolute top-1 right-2 sm:right-6 w-2 h-2 bg-red-500 rounded-full border border-stone-200 animate-pulse"></span>
        </button>
    </div>
    `;
}

export function updateChecklistUI(state) {
    const dockBadge = document.getElementById('dock-badge-tasks');
    const sheetBadge = document.getElementById('sheet-badge-tasks');
    const libTabBadge = document.getElementById('lib-tab-badge-tasks');
    const container = document.getElementById('checklist-content-container');
    
    if (!container) return; 

    const camp = state.activeCampaign;
    if (!camp || state.currentView === 'home') {
        if (dockBadge) dockBadge.classList.add('hidden');
        if (sheetBadge) sheetBadge.classList.add('hidden');
        if (libTabBadge) libTabBadge.classList.add('hidden');
        return;
    }

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    const activeTab = state.activeChecklistTab || 'tasks';

    // --- Dynamic Header & Navigation Alignment ---
    const modal = document.getElementById('checklist-modal');
    if (modal) {
        const h2 = modal.querySelector('h2');
        const p = modal.querySelector('p');
        if (h2 && p) {
            if (activeTab === 'quests') {
                h2.innerHTML = `<i class="fa-solid fa-compass mr-3 text-amber-700"></i> Quest Log`;
                p.textContent = "Track campaign objectives, main story progression, and personal character motivations.";
            } else {
                h2.innerHTML = `<i class="fa-solid fa-list-check mr-3 text-amber-700"></i> Sheet Updates`;
                p.textContent = "Track loot, feats, or stats that need to be manually added to the official character sheet.";
            }
        }
    }

    // Tab Switcher HTML Header
    const switcherHtml = `
    <div class="flex border-b border-[#d4c5a9] mb-4 shrink-0 bg-[#f4ebd8] rounded-t-sm">
        <button onclick="window.appActions.switchChecklistTab('tasks')" class="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center transition ${activeTab === 'tasks' ? 'border-b-2 border-amber-700 text-stone-900 font-black' : 'text-stone-500 hover:text-stone-700'}">Sheet Updates</button>
        <button onclick="window.appActions.switchChecklistTab('quests')" class="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center transition ${activeTab === 'quests' ? 'border-b-2 border-amber-700 text-stone-900 font-black' : 'text-stone-500 hover:text-stone-700'}">Quest Log</button>
    </div>
    `;

    if (activeTab === 'tasks') {
        const updates = camp.sheetUpdates || [];
        const visibleUpdates = updates.filter(item => {
            if (isDM || item.authorId === myUid) return true;
            const vis = item.visibility || { mode: 'public' };
            if (vis.mode === 'public') return true;
            if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
            return false;
        });

        // Badge counters updates
        const pendingCount = visibleUpdates.filter(u => !(u.resolvedBy || []).includes(myUid)).length;
        if (pendingCount > 0) {
            if (dockBadge) dockBadge.classList.remove('hidden');
            if (libTabBadge) libTabBadge.classList.remove('hidden');
            if (sheetBadge) {
                sheetBadge.textContent = pendingCount;
                sheetBadge.classList.remove('hidden');
            }
        } else {
            if (dockBadge) dockBadge.classList.add('hidden');
            if (sheetBadge) mapBadgeHide();
            if (libTabBadge) libTabBadge.classList.add('hidden');
        }

        function mapBadgeHide() {
            sheetBadge.classList.add('hidden');
        }

        const sorted = [...visibleUpdates].sort((a, b) => {
            const aRes = (a.resolvedBy || []).includes(myUid);
            const bRes = (b.resolvedBy || []).includes(myUid);
            if (aRes === bRes) return (b.timestamp || 0) - (a.timestamp || 0);
            return aRes ? 1 : -1;
        });

        let listHtml = '';
        if (sorted.length === 0) {
            listHtml = `<div class="text-xs text-stone-500 italic mb-2 text-center py-6">No active tasks or reminders.</div>`;
        } else {
            sorted.forEach(item => {
                const isResolvedByMe = (item.resolvedBy || []).includes(myUid);
                const isAuthor = item.authorId === myUid;
                const canEdit = isDM || isAuthor;

                const statusIcon = isResolvedByMe 
                    ? '<i class="fa-solid fa-circle-check text-emerald-600"></i>' 
                    : '<i class="fa-regular fa-circle text-stone-400"></i>';
                const statusTextClass = isResolvedByMe ? 'text-stone-400 line-through' : 'text-stone-800 font-bold';

                let authorTag = '';
                if (item.authorId && item.authorId !== camp.dmId) {
                    const aName = camp.playerNames[item.authorId] || 'Player';
                    authorTag = `<span class="text-[8px] uppercase tracking-widest text-stone-400 font-bold ml-2 border border-stone-200 px-1 rounded-sm shadow-sm align-middle whitespace-nowrap">From: ${aName}</span>`;
                }

                const resolveBtn = `
                    <button type="button" onclick="window.appActions.toggleSheetUpdateResolved('${item.id}')" class="text-[10px] font-bold uppercase tracking-wider border px-3 py-1.5 rounded-sm transition shadow-sm whitespace-nowrap ${isResolvedByMe ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' : 'bg-white border-amber-300/50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'}">
                        ${isResolvedByMe ? '<i class="fa-solid fa-check mr-1"></i> Completed' : 'Mark Complete'}
                    </button>
                `;

                let controlsHtml = '';
                if (canEdit) {
                    const vis = item.visibility || { mode: 'public' };
                    let eyeIcon = 'fa-eye text-emerald-600';
                    let visLabel = 'Public';
                    if (vis.mode === 'hidden') { eyeIcon = 'fa-eye-slash text-red-700'; visLabel = 'Hidden'; }
                    if (vis.mode === 'specific') { eyeIcon = 'fa-user-lock text-blue-600'; visLabel = 'Shared'; }
                    
                    const resolvedUids = item.resolvedBy || [];
                    const playerNames = camp.playerNames || {};
                    const resolvedNames = resolvedUids.map(uid => playerNames[uid] || 'Unknown Player').join(', ');
                    
                    const resolvedText = resolvedNames 
                        ? `<span class="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded mr-auto truncate max-w-[140px] sm:max-w-[200px]" title="Completed by: ${resolvedNames}"><i class="fa-solid fa-check-double mr-1"></i> ${resolvedNames}</span>` 
                        : `<span class="text-[9px] text-stone-400 italic mr-auto">No completions yet</span>`;

                    let visBtnHtml = '';
                    if (isDM) {
                        visBtnHtml = `<button type="button" onclick="window.appActions.openVisibilityMenu(this, 'checklist', '${item.id}')" class="text-[10px] flex items-center justify-center hover:bg-stone-200 px-2 py-1 rounded transition text-stone-600 font-bold uppercase tracking-widest border border-transparent hover:border-stone-300" title="Visibility Settings"><i class="fa-solid ${eyeIcon} sm:mr-1"></i> <span class="hidden sm:inline">${visLabel}</span></button>`;
                    } else {
                        visBtnHtml = `<span class="text-[10px] flex items-center justify-center px-2 py-1 rounded text-red-800/60 font-bold uppercase tracking-widest border border-transparent" title="Private task (DM & You)"><i class="fa-solid fa-user-secret sm:mr-1"></i> <span class="hidden sm:inline">Private</span></span>`;
                    }

                    controlsHtml = `
                        ${resolvedText}
                        <div class="flex items-center gap-1 ml-auto">
                            ${resolveBtn}
                            <div class="w-px h-4 bg-stone-300 mx-1"></div>
                            ${visBtnHtml}
                            <button type="button" onclick="window.appActions.deleteSheetUpdate('${item.id}')" class="text-[10px] w-6 h-6 flex items-center justify-center text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                } else {
                    controlsHtml = `
                        <div class="flex items-center justify-end w-full">
                            ${resolveBtn}
                        </div>
                    `;
                }

                const safeText = item.text.replace(/"/g, '&quot;');

                listHtml += `
                <div class="flex flex-col bg-[#fdfbf7] p-3 border border-amber-600/20 rounded-sm shadow-sm gap-2 mb-3 hover:border-amber-400/50 transition-colors">
                    <div class="flex items-start sm:items-center gap-3">
                        <div class="flex-shrink-0 text-base mt-0.5 sm:mt-0">${statusIcon}</div>
                        <span class="text-sm ${statusTextClass} break-words leading-tight">${safeText} ${authorTag}</span>
                    </div>
                    <div class="flex items-center justify-between w-full pt-2 border-t border-stone-200 mt-1 min-h-[28px]">
                        ${controlsHtml}
                    </div>
                </div>
                `;
            });
        }

        const addHtml = `
        <div class="flex gap-2 mt-4 pt-4 border-t border-amber-700/20 sticky bottom-0 bg-[#f4ebd8] pb-2 z-10">
            <input type="text" id="new-sheet-update-text" class="flex-grow p-2 border border-amber-600/30 rounded-sm text-xs sm:text-sm focus:border-red-900 outline-none shadow-inner bg-white font-sans placeholder:text-stone-400 placeholder:italic" placeholder="Add a task or reminder..." onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.appActions.addSheetUpdate(); }">
            <button type="button" onclick="window.appActions.addSheetUpdate()" class="px-4 py-2 bg-amber-700 text-amber-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-sm shadow-md hover:bg-amber-600 transition whitespace-nowrap"><i class="fa-solid fa-plus sm:mr-1"></i> <span class="hidden sm:inline">Add</span></button>
        </div>
        `;

        container.innerHTML = switcherHtml + listHtml + addHtml;

    } else if (activeTab === 'quests') {
        const quests = camp.quests || [];
        const formId = state.activeQuestFormId;
        const expandedQuests = state.expandedQuests || new Set();

        if (formId !== null && formId !== undefined) {
            // --- RENDER QUEST FORM (INLINE MODE) ---
            const questToEdit = formId === 'new' ? { name: '', category: 'current', giverName: '', giverLocation: '', status: 'active', objectives: '', rewards: '', clues: '', hasTracker: false, trackerLabel: '', trackerCurrent: 0, trackerTarget: 1 } : quests.find(q => q.id === formId);

            let formHtml = `
            <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm space-y-4 animate-in fade-in duration-200">
                <input type="hidden" id="quest-form-id" value="${formId === 'new' ? '' : questToEdit.id}">
                <h3 class="font-serif font-bold text-base text-amber-900 border-b border-[#d4c5a9] pb-1.5 flex items-center"><i class="fa-solid fa-compass mr-1.5"></i> ${formId === 'new' ? 'Forge Quest' : 'Amend Quest'}</h3>
                
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Quest Name *</label>
                    <input type="text" id="quest-form-name" value="${questToEdit.name.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-inner">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Category</label>
                        <select id="quest-form-category" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-sm">
                            <option value="current" ${questToEdit.category === 'current' ? 'selected' : ''}>Current Arc</option>
                            <option value="general" ${questToEdit.category === 'general' ? 'selected' : ''}>General Quest</option>
                            <option value="personal" ${questToEdit.category === 'personal' ? 'selected' : ''}>Personal Motivation</option>
                            <option value="previous" ${questToEdit.category === 'previous' ? 'selected' : ''}>Previous Arc</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Status</label>
                        <select id="quest-form-status" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-sm">
                            <option value="active" ${questToEdit.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${questToEdit.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="failed" ${questToEdit.status === 'failed' ? 'selected' : ''}>Failed</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">The Giver (Name)</label>
                        <input type="text" id="quest-form-giver" value="${questToEdit.giverName.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-inner" placeholder="e.g. Elara">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Assigning Location</label>
                        <input type="text" id="quest-form-loc" value="${questToEdit.giverLocation.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-inner" placeholder="e.g. Waterdeep">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Objectives</label>
                    <textarea id="quest-form-objectives" class="w-full p-2.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 bg-stone-50 font-serif h-20 outline-none focus:border-amber-600 shadow-inner resize-none" placeholder="1. Travel to high forest&#10;2. Find the ruins...">${questToEdit.objectives}</textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rewards</label>
                        <input type="text" id="quest-form-rewards" value="${questToEdit.rewards.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-inner" placeholder="e.g. 500 gp, renown">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Important Clues</label>
                        <input type="text" id="quest-form-clues" value="${questToEdit.clues.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 bg-stone-50 outline-none focus:border-amber-600 shadow-inner" placeholder="e.g. Password is 'Gryphon'">
                    </div>
                </div>

                <!-- Progressive Tracker Configurations -->
                <div class="bg-stone-50 p-3 rounded-sm border border-[#d4c5a9] shadow-inner space-y-3">
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" id="quest-form-has-tracker" ${questToEdit.hasTracker ? 'checked' : ''} onchange="document.getElementById('quest-form-tracker-fields').classList.toggle('hidden', !this.checked)" class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-[#d4c5a9]">
                        <span class="text-[10px] uppercase text-stone-600 font-bold tracking-widest group-hover:text-amber-700 transition">Enable Progressive Tracker</span>
                    </label>
                    <div id="quest-form-tracker-fields" class="${questToEdit.hasTracker ? '' : 'hidden'} grid grid-cols-3 gap-2">
                        <div class="col-span-1">
                            <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Label</label>
                            <input type="text" id="quest-form-tracker-label" value="${questToEdit.trackerLabel.replace(/"/g, '&quot;')}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] text-stone-900 bg-white" placeholder="e.g. Collected">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Current</label>
                            <input type="number" id="quest-form-tracker-current" value="${questToEdit.trackerCurrent}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] text-stone-900 bg-white text-center">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Target</label>
                            <input type="number" id="quest-form-tracker-target" value="${questToEdit.trackerTarget}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] text-stone-900 bg-white text-center">
                        </div>
                    </div>
                </div>

                <!-- Footer buttons -->
                <div class="flex justify-end gap-2 border-t border-stone-200 pt-3">
                    <button type="button" onclick="window.appActions.closeQuestForm()" class="px-4 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-100 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                    <button type="button" onclick="window.appActions.saveQuest()" class="px-5 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Quest</button>
                </div>
            </div>
            `;
            container.innerHTML = switcherHtml + formHtml;

        } else {
            const cats = [
                { id: 'current', label: 'Current Arc Objectives', icon: 'fa-compass' },
                { id: 'general', label: 'General Table Quests', icon: 'fa-scroll' },
                { id: 'personal', label: 'Personal Motivations', icon: 'fa-user' },
                { id: 'previous', label: 'Previous Arc Records', icon: 'fa-book' }
            ];

            let questLogHtml = '';

            cats.forEach(cat => {
                const filtered = quests.filter(q => q.category === cat.id);
                if (filtered.length === 0) return;

                let categoryCards = '';
                filtered.forEach(q => {
                    const isExpanded = expandedQuests.has(q.id);
                    
                    // Status Badge Styling
                    let statusBadge = `<span class="bg-blue-100 border border-blue-200 text-blue-800 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-spinner fa-spin mr-1 text-[7px]"></i> Active</span>`;
                    if (q.status === 'completed') {
                        statusBadge = `<span class="bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-check mr-1"></i> Completed</span>`;
                    } else if (q.status === 'failed') {
                        statusBadge = `<span class="bg-red-100 border border-red-300 text-red-800 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-xmark mr-1"></i> Failed</span>`;
                    }

                    // Progress bar math
                    let trackerHtml = '';
                    if (q.hasTracker) {
                        const pct = Math.min(100, Math.max(0, (parseInt(q.trackerCurrent || 0) / parseInt(q.trackerTarget || 1)) * 100));
                        trackerHtml = `
                        <div class="mt-3 bg-stone-200 rounded-full h-2 w-full overflow-hidden border border-stone-300 relative">
                            <div class="bg-amber-600 h-full rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-1.5 text-[10px] text-stone-600">
                            <span>${escapeHTML(q.trackerLabel || 'Progress')}: <strong class="text-stone-800">${q.trackerCurrent} / ${q.trackerTarget}</strong></span>
                            ${isDM ? `
                            <div class="flex gap-1" onclick="event.stopPropagation()">
                                <button onclick="window.appActions.adjustQuestTracker('${q.id}', -1)" class="w-5 h-5 bg-stone-200 rounded border border-stone-300 hover:bg-stone-300 flex items-center justify-center font-bold text-stone-700 active:scale-95 transition">-</button>
                                <button onclick="window.appActions.adjustQuestTracker('${q.id}', 1)" class="w-5 h-5 bg-stone-200 rounded border border-stone-300 hover:bg-stone-300 flex items-center justify-center font-bold text-stone-700 active:scale-95 transition">+</button>
                            </div>
                            ` : ''}
                        </div>`;
                    }

                    // Expansion Body
                    let bodyHtml = '';
                    if (isExpanded) {
                        const objectivesParsed = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(q.objectives) : q.objectives.replace(/\n/g, '<br>');
                        
                        bodyHtml = `
                        <div class="mt-4 pt-3 border-t border-stone-200/50 space-y-3">
                            <div>
                                <span class="block text-[8px] uppercase tracking-widest text-stone-400 font-bold mb-1">Objectives & Directives</span>
                                <div class="text-xs text-stone-700 font-serif leading-relaxed">${objectivesParsed}</div>
                            </div>
                            ${q.rewards ? `
                            <div class="flex gap-4">
                                <div class="flex-1">
                                    <span class="block text-[8px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Renown & Rewards</span>
                                    <span class="text-xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block"><i class="fa-solid fa-coins mr-1 text-amber-500"></i> ${escapeHTML(q.rewards)}</span>
                                </div>
                            </div>` : ''}
                            ${q.clues ? `
                            <div class="bg-stone-100 p-2 border-l-2 border-amber-600 rounded-sm">
                                <span class="block text-[8px] uppercase tracking-widest text-stone-500 font-bold mb-0.5"><i class="fa-solid fa-key text-[7px] mr-1"></i> Critical Discoveries</span>
                                <span class="text-xs text-stone-700 italic font-serif leading-snug break-words">${escapeHTML(q.clues)}</span>
                            </div>` : ''}
                            
                            ${isDM ? `
                            <div class="flex justify-end gap-1.5 pt-3 border-t border-stone-200">
                                <button onclick="event.stopPropagation(); window.appActions.openQuestForm('${q.id}')" class="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-[9px] font-bold uppercase tracking-wider hover:bg-stone-200 transition"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button onclick="event.stopPropagation(); window.appActions.deleteQuest('${q.id}')" class="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[9px] font-bold uppercase tracking-wider hover:bg-red-100 transition"><i class="fa-solid fa-trash"></i></button>
                            </div>` : ''}
                        </div>`;
                    }

                    const safeGiver = escapeHTML(q.giverName || 'Unknown');
                    const safeLoc = escapeHTML(q.giverLocation || 'Unknown');

                    categoryCards += `
                    <div onclick="window.appActions.toggleQuestExpanded('${q.id}')" class="bg-white p-3 border border-[#d4c5a9] rounded-sm shadow-sm hover:border-amber-400 transition-colors cursor-pointer group">
                        <div class="flex justify-between items-start gap-2">
                            <div class="min-w-0 flex-grow pr-2">
                                <h4 class="font-serif font-bold text-sm text-stone-900 group-hover:text-amber-800 transition-colors leading-tight truncate" title="${escapeHTML(q.name)}">${escapeHTML(q.name)}</h4>
                                <span class="text-[9px] text-stone-500 italic block mt-0.5">Assigned by <span class="font-bold">${safeGiver}</span> in <span class="font-bold">${safeLoc}</span></span>
                            </div>
                            <div class="shrink-0 flex items-center gap-1.5">
                                ${statusBadge}
                                <i class="fa-solid fa-chevron-down text-[10px] text-stone-400 group-hover:text-stone-600 transition-transform ${isExpanded ? 'rotate-180' : ''}"></i>
                            </div>
                        </div>
                        ${trackerHtml}
                        ${bodyHtml}
                    </div>
                    `;
                });

                questLogHtml += `
                <div class="mb-5 bg-[#fcf8ee]/40 border border-amber-800/10 rounded p-3">
                    <h4 class="text-[10px] uppercase font-bold text-amber-900 tracking-widest mb-3 flex items-center gap-1.5 border-b border-amber-800/10 pb-1">
                        <i class="fa-solid ${cat.icon} text-amber-700"></i> ${cat.label}
                    </h4>
                    <div class="space-y-3">
                        ${categoryCards}
                    </div>
                </div>
                `;
            });

            if (quests.length === 0) {
                questLogHtml = `
                <div class="text-center py-12 bg-white border border-dashed border-[#d4c5a9] rounded-sm">
                    <i class="fa-solid fa-compass text-4xl text-stone-300 mb-3 animate-pulse"></i>
                    <p class="font-serif text-sm italic text-stone-500">The Quest Board is currently empty.</p>
                </div>
                `;
            }

            const forgeBtnHtml = isDM ? `
            <div class="flex gap-2 mt-4 pt-4 border-t border-amber-700/20 sticky bottom-0 bg-[#f4ebd8] pb-2 z-10">
                <button onclick="window.appActions.openQuestForm('new')" class="w-full py-2.5 bg-stone-900 text-amber-50 hover:bg-stone-800 rounded shadow-md font-bold uppercase tracking-wider text-xs flex items-center justify-center transition active:scale-95"><i class="fa-solid fa-plus-circle mr-2 text-amber-400"></i> Forge New Quest</button>
            </div>` : '';

            container.innerHTML = switcherHtml + questLogHtml + forgeBtnHtml;
        }
    }
}

export function updateBudgetUI(totalPartyBudget, currentTotalLoot, remainingBudget, newLootValue) {
    const totalEl = document.getElementById('budget-total');
    const lootEl = document.getElementById('budget-loot');
    const remainEl = document.getElementById('budget-remain');
    const liveEl = document.getElementById('budget-live-calc');
    
    if (totalEl) totalEl.textContent = `${Math.round(totalPartyBudget).toLocaleString()} gp`;
    if (lootEl) lootEl.textContent = `${Math.round(currentTotalLoot).toLocaleString()} gp`;
    if (remainEl) {
        remainEl.textContent = `${Math.round(remainingBudget).toLocaleString()} gp`;
        if (remainingBudget < 0) {
            remainEl.className = "font-bold text-sm sm:text-base text-red-500";
        } else {
            remainEl.className = "font-bold text-sm sm:text-base text-emerald-400";
        }
    }
    if (liveEl) liveEl.textContent = `Calc: ${Math.round(newLootValue).toLocaleString()} gp`;
}

export function updateSessionTabUI(tabId) {
    ['session', 'pcs', 'preview'].forEach(t => {
        const content = document.getElementById(`tab-content-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (content) {
            if (t === tabId) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        }
        if (btn) {
            if (t === tabId) {
                btn.className = "whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900";
            } else {
                btn.className = "whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-transparent hover:text-stone-800";
            }
        }
    });
}

export function renderApp(state) {
    const container = document.getElementById('app-container');
    if (!container) return;

    if (state.currentView !== 'atlas') {
        container.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (state.currentView === 'atlas' && document.getElementById('map-container')) {
        if (window.appActions && window.appActions.refreshAtlasEntities) {
            window.appActions.refreshAtlasEntities();
        }
        updateHeaderUI(state);
        updateDockUI(state);
        updateChecklistUI(state);
        updatePlayerResourceBar(state);
        return; 
    }

    let html = '';
    switch (state.currentView) {
        case 'home': html = getHomeHTML(state); break;
        case 'campaign': html = getCampaignHTML(state); break;
        case 'adventure': html = getAdventureHTML(state); break;
        case 'adv-roster': html = getAdvRosterHTML(state); break;
        case 'pc-manager': html = getPCManagerHTML(state); break;
        case 'pc-edit': html = getPCEditHTML(state); break;
        case 'session-edit': html = getSessionEditHTML(state); break;
        case 'journal': html = getJournalHTML(state); break;
        case 'codex': html = getCodexHTML(state); break;
        case 'bazaar': html = getBazaarHTML(state); break;
        case 'storefront': html = getStorefrontHTML(state); break;
        case 'shop-backroom': html = getShopBackroomHTML(state); break;
        case 'calendar': html = getCalendarHTML(state); break;
        case 'rules': html = getRulesHTML(state); break;
        case 'webs': html = getWebsHTML(state); break; 
        case 'databases': html = getDatabasesHTML(state); break;
        case 'activity-log': html = getActivityLogHTML(state); break;
        default: html = `<div class="text-center text-red-500">Unknown View: ${state.currentView}</div>`;
    }

    container.innerHTML = html;

    updateHeaderUI(state);
    updateDockUI(state);
    updateChecklistUI(state);
    updatePlayerResourceBar(state);

    if (state.currentView === 'session-edit') {
        updateSessionTabUI('session');
        if (window.appActions && window.appActions.updateSessionBudget) {
            window.appActions.updateSessionBudget();
        }
    }
}

function updateHeaderUI(state) {
    const title = document.getElementById('header-title');
    const breadcrumb = document.getElementById('header-breadcrumb');
    const backBtn = document.getElementById('header-back-btn');
    const icon = document.getElementById('header-icon');

    if (!title || !breadcrumb || !backBtn || !icon) return;

    // Default library icons
    icon.innerHTML = `<i class="fa-solid fa-scroll text-xl"></i>`;
    backBtn.classList.remove('hidden');

    switch (state.currentView) {
        case 'home':
            title.textContent = "Adventure Journal";
            breadcrumb.textContent = "Vault Library";
            backBtn.classList.add('hidden');
            icon.innerHTML = `<i class="fa-solid fa-book-journal-whills text-xl"></i>`;
            break;
        case 'campaign':
            title.textContent = state.activeCampaign?.name || "Campaign";
            breadcrumb.textContent = "Tome Hub";
            break;
        case 'adventure':
            title.textContent = state.activeAdventure?.name || "Adventure";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Story Arc`;
            break;
        case 'adv-roster':
            title.textContent = "Roster Setup";
            breadcrumb.textContent = `${state.activeAdventure?.name || "Arc"} • Configuration`;
            break;
        case 'pc-manager':
            title.textContent = "Party Manifest";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Heroes`;
            icon.innerHTML = `<i class="fa-solid fa-users text-lg"></i>`;
            break;
        case 'pc-edit':
            title.textContent = "Hero's Journal";
            breadcrumb.textContent = "Party Manifest • Edits";
            icon.innerHTML = `<i class="fa-solid fa-user-pen text-lg"></i>`;
            break;
        case 'session-edit':
            title.textContent = "Scribing Session";
            breadcrumb.textContent = `${state.activeAdventure?.name || "Arc"} • Logs`;
            break;
        case 'journal':
            title.textContent = "Scroll Presentation";
            breadcrumb.textContent = "Grand Chronicle Timeline";
            break;
        case 'codex':
            title.textContent = "World Codex";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Library`;
            icon.innerHTML = `<i class="fa-solid fa-book text-lg"></i>`;
            break;
        case 'bazaar':
            title.textContent = "Bazaar District";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Market`;
            icon.innerHTML = `<i class="fa-solid fa-store text-lg"></i>`;
            break;
        case 'storefront':
            title.textContent = "Storefront Wares";
            breadcrumb.textContent = "Bazaar District • Stall";
            icon.innerHTML = `<i class="fa-solid fa-shop text-lg"></i>`;
            break;
        case 'shop-backroom':
            title.textContent = "GM Backroom Ledger";
            breadcrumb.textContent = "Bazaar District • Supply";
            icon.innerHTML = `<i class="fa-solid fa-warehouse text-lg"></i>`;
            break;
        case 'calendar':
            title.textContent = "Grand Chronicle Timeline";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Calendar`;
            icon.innerHTML = `<i class="fa-regular fa-calendar-days text-xl"></i>`;
            break;
        case 'rules':
            title.textContent = "Glossary of Rulings";
            breadcrumb.textContent = "Archives • References";
            icon.innerHTML = `<i class="fa-solid fa-scale-balanced text-lg"></i>`;
            break;
        case 'webs':
            title.textContent = "Relationship Webs";
            breadcrumb.textContent = `${state.activeCampaign?.name || "Campaign"} • Schematics`;
            icon.innerHTML = `<i class="fa-solid fa-diagram-project text-lg"></i>`;
            break;
        case 'databases':
            title.textContent = "Master Item Encyclopedia";
            breadcrumb.textContent = "GM Administrative Core • Data";
            icon.innerHTML = `<i class="fa-solid fa-box-archive text-lg"></i>`;
            break;
        case 'activity-log':
            title.textContent = "Campaign Activity Feed";
            breadcrumb.textContent = "GM Logs • Archives";
            icon.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-lg"></i>`;
            break;
    }
}

function updateDockUI(state) {
    document.querySelectorAll('.dock-tab').forEach(tab => {
        tab.classList.remove('text-amber-500', 'font-bold');
        tab.classList.add('text-stone-400');
    });

    const activeView = state.currentView;
    const isCampaignScope = ['campaign', 'adventure', 'adv-roster', 'session-edit', 'journal'].includes(activeView);
    const isCalendarScope = ['calendar'].includes(activeView);
    const isPartyScope = ['pc-manager', 'pc-edit'].includes(activeView);
    const isLibraryScope = ['codex', 'bazaar', 'storefront', 'shop-backroom', 'rules', 'webs', 'databases', 'activity-log'].includes(activeView);

    let activeTabId = '';
    if (isCampaignScope) activeTabId = 'dock-tab-campaign';
    else if (isCalendarScope) activeTabId = 'dock-tab-calendar';
    else if (isPartyScope) activeTabId = 'dock-tab-pc-manager';
    else if (isLibraryScope) activeTabId = 'dock-tab-codex';

    const activeTab = document.getElementById(activeTabId);
    if (activeTab) {
        activeTab.classList.remove('text-stone-400');
        activeTab.classList.add('text-amber-500', 'font-bold');
    }

    // Toggle DM assignments buttons on the actions sheet
    const assignBtn = document.getElementById('dm-assign-downtime-btn');
    const npcGenBtn = document.getElementById('dm-npc-gen-btn');
    const camp = state.activeCampaign;
    if (camp && camp._isDM) {
        if (assignBtn) assignBtn.classList.remove('hidden');
        if (npcGenBtn) npcGenBtn.classList.remove('hidden');
    } else {
        if (assignBtn) assignBtn.classList.add('hidden');
        if (npcGenBtn) npcGenBtn.classList.add('hidden');
    }
}

function updatePlayerResourceBar(state) {
    const bar = document.getElementById('player-resource-bar');
    if (!bar) return;

    const camp = state.activeCampaign;
    const myUid = state.currentUserUid;
    if (!camp || state.currentView === 'home' || camp._isDM) {
        bar.innerHTML = '';
        return;
    }

    // Check if player has an active PC in the active campaign
    const myPc = camp.playerCharacters?.find(pc => pc.playerId === myUid);
    if (!myPc) {
        bar.innerHTML = '';
        return;
    }

    let maxInsp = 0;
    if (myPc.boonBackstory) maxInsp += 1;
    if (myPc.boon2ndBday) maxInsp += 1;
    const currentInsp = myPc.inspiration === true ? 1 : (parseInt(myPc.inspiration) || 0);
    const hasAutoSuccess = myPc.automaticSuccess === true && myPc.unlockAutoSuccess === true;
    const downtimeDays = parseInt(myPc.availableDowntime) || 0;

    bar.innerHTML = `
    <div class="w-full bg-stone-900 border-b border-amber-700/50 py-1.5 px-4 text-amber-100 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider relative overflow-hidden thematic-bg shadow-md">
        <div class="flex items-center gap-1">
            <span class="text-stone-400">Hero:</span>
            <span class="text-amber-400 font-serif normal-case text-xs font-black">${escapeHTML(myPc.name)}</span>
        </div>
        <div class="flex gap-3 items-center">
            <div class="flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/30">
                <i class="fa-solid fa-dice-d20 text-amber-500"></i> Insp: ${currentInsp}/${maxInsp}
            </div>
            ${hasAutoSuccess ? `
            <div class="flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-600/30 text-emerald-300">
                <i class="fa-solid fa-circle-check"></i> Auto-Success
            </div>` : ''}
            <div class="flex items-center gap-1 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-600/30 text-blue-300">
                <i class="fa-solid fa-hourglass-half"></i> ${downtimeDays} Days
            </div>
        </div>
    </div>
    `;
}

// --- VIEW WRAPPER ROUTINES (DELEGATING TO INDIVIDUAL MODULES) ---
function getHomeHTML(state) {
    const { getHomeHTML } = require('./ui-campaign.js');
    return getHomeHTML(state);
}

function getCampaignHTML(state) {
    const { getCampaignHTML } = require('./ui-campaign.js');
    return getCampaignHTML(state);
}

function getAdventureHTML(state) {
    const { getAdventureHTML } = require('./ui-campaign.js');
    return getAdventureHTML(state);
}

function getAdvRosterHTML(state) {
    const { getAdvRosterHTML } = require('./ui-campaign.js');
    return getAdvRosterHTML(state);
}

function getPCManagerHTML(state) {
    const { getPCManagerHTML } = require('./ui-characters.js');
    return getPCManagerHTML(state);
}

function getPCEditHTML(state) {
    const { getPCEditHTML } = require('./ui-characters.js');
    return getPCEditHTML(state);
}

function getSessionEditHTML(state) {
    const { getSessionEditHTML } = require('./ui-session.js');
    return getSessionEditHTML(state);
}

function getJournalHTML(state) {
    const { getJournalHTML } = require('./ui-codex.js');
    return getJournalHTML(state);
}

function getCodexHTML(state) {
    const { getCodexHTML } = require('./ui-codex.js');
    return getCodexHTML(state);
}

function getBazaarHTML(state) {
    const { getBazaarHTML } = require('./ui-shops.js');
    return getBazaarHTML(state);
}

function getStorefrontHTML(state) {
    const { getStorefrontHTML } = require('./ui-shops.js');
    return getStorefrontHTML(state);
}

function getShopBackroomHTML(state) {
    const { getShopBackroomHTML } = require('./ui-shops.js');
    return getShopBackroomHTML(state);
}

function getCalendarHTML(state) {
    const { getCalendarHTML } = require('./ui-calendar.js');
    return getCalendarHTML(state);
}

function getRulesHTML(state) {
    const { getRulesHTML } = require('./ui-rules.js');
    return getRulesHTML(state);
}

function getWebsHTML(state) {
    const { getWebsHTML } = require('./ui-webs.js');
    return getWebsHTML(state);
}

function getDatabasesHTML(state) {
    const { getDatabasesHTML } = require('./ui-databases.js');
    return getDatabasesHTML(state);
}

function getActivityLogHTML(state) {
    const { getActivityLogHTML } = require('./ui-campaign.js');
    return getActivityLogHTML(state);
}
