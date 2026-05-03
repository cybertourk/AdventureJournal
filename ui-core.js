import { getHomeHTML, getCampaignHTML, getAdventureHTML, getAdvRosterHTML, getActivityLogHTML } from './ui-campaign.js';
import { getPCManagerHTML, getPCEditHTML } from './ui-characters.js';
import { getSessionEditHTML } from './ui-session.js';
import { getCodexHTML, getJournalHTML } from './ui-codex.js';
import { getCalendarHTML } from './ui-calendar.js';
import { getRulesHTML } from './ui-rules.js';

// --- CONSTANTS & HELPERS ---
export const BUDGET_BY_LEVEL = { 
    1: 0, 2: 100, 3: 200, 4: 400, 5: 700, 6: 3000, 7: 5400, 8: 8600, 
    9: 12000, 10: 17000, 11: 21000, 12: 30000, 13: 39000, 14: 57000, 
    15: 75000, 16: 103000, 17: 130000, 18: 214000, 19: 383000, 20: 552000, 21: 805000 
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

    // Strip HTML from label to pass as plain text to the editor modal title, and escape apostrophes safely
    const plainLabel = labelHtml.replace(/<[^>]*>?/gm, '').trim().replace(/'/g, "\\'");
    
    // Ensure hidden input preserves both double quotes AND newlines
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

// --- LIBRARY NAVIGATION TABS ---
export function getLibraryTabsHTML(activeTab) {
    const isCodex = activeTab === 'codex';
    const isRules = activeTab === 'rules';
    const isTome = activeTab === 'tome';

    return `
    <div class="flex bg-stone-200 p-1 sm:p-1.5 rounded-sm border border-[#d4c5a9] shadow-inner mb-6 w-full max-w-3xl mx-auto shrink-0">
        <button onclick="window.appActions.setView('codex')" class="flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isCodex ? 'bg-white shadow-sm text-red-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-book-journal-whills text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Codex</span>
        </button>
        <button onclick="window.appActions.openRulesGlossary()" class="flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isRules ? 'bg-white shadow-sm text-amber-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scale-balanced text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Rules</span>
        </button>
        <button onclick="window.appActions.openJournal('campaign')" class="flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isTome ? 'bg-white shadow-sm text-stone-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scroll text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Tome</span>
        </button>
        <button onclick="window.appActions.openChecklistMenu()" class="flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition text-stone-500 hover:text-blue-800 border border-transparent text-[9px] sm:text-[10px] uppercase tracking-wider relative group">
            <i class="fa-solid fa-list-check text-sm sm:text-base mb-0.5 sm:mb-0 group-hover:text-blue-600 transition-colors"></i> <span>Tasks</span>
            <span id="lib-tab-badge-tasks" class="hidden absolute top-1 right-2 sm:right-6 w-2 h-2 bg-red-500 rounded-full border border-stone-200 animate-pulse"></span>
        </button>
    </div>
    `;
}


// --- GLOBAL HEADER & NAVIGATION VISIBILITY ---
export function updateHeaderUI(state) {
    const titleEl = document.getElementById('header-title');
    const breadcrumbEl = document.getElementById('header-breadcrumb');
    const backBtn = document.getElementById('header-back-btn');
    const iconEl = document.getElementById('header-icon');
    const settingsBtn = document.getElementById('settings-btn');
    const dockContainer = document.getElementById('floating-dock-container');

    if (!titleEl) return;

    // Hide dock & show default branding on home screen
    if (state.currentView === 'home' || !state.activeCampaign) {
        if (dockContainer) dockContainer.classList.add('translate-y-32', 'opacity-0');
        titleEl.textContent = 'Adventure Journal';
        if (breadcrumbEl) breadcrumbEl.textContent = 'The Lobby';
        if (backBtn) backBtn.classList.add('hidden');
        if (iconEl) iconEl.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
        return;
    }

    // Show dock and set campaign branding
    if (dockContainer) dockContainer.classList.remove('translate-y-32', 'opacity-0');
    titleEl.textContent = state.activeCampaign.name;
    if (settingsBtn) settingsBtn.classList.add('hidden'); // Hide settings when in a campaign

    let breadcrumbText = 'Story Arcs';
    let showBack = false;

    // Smart logic for breadcrumb text and deciding if we need the back button
    switch (state.currentView) {
        case 'campaign': breadcrumbText = 'Story Arcs'; showBack = true; break;
        case 'adventure': breadcrumbText = state.activeAdventure?.name || 'Adventure Arc'; showBack = true; break;
        case 'adv-roster': breadcrumbText = 'Arc Roster'; showBack = true; break;
        case 'session-edit': breadcrumbText = state.activeSessionId ? 'Amend Record' : 'New Record'; showBack = true; break;
        case 'pc-manager': breadcrumbText = 'Party Manifest'; showBack = true; break;
        case 'pc-edit': breadcrumbText = state.activePcId ? 'Edit Hero' : 'New Hero'; showBack = true; break;
        case 'codex': breadcrumbText = 'Library • Codex'; showBack = true; break;
        case 'rules': breadcrumbText = 'Library • Rules'; showBack = true; break;
        case 'calendar': breadcrumbText = 'Chronicle Timeline'; showBack = true; break;
        case 'journal': 
            breadcrumbText = state.activeSessionId ? 'Session Scroll' : (state.activeAdventureId ? 'Arc Scroll' : 'Library • Tome'); 
            showBack = true; 
            break;
        case 'activity-log': breadcrumbText = 'Activity Log'; showBack = true; break;
    }

    if (breadcrumbEl) breadcrumbEl.textContent = breadcrumbText;

    if (showBack) {
        if (backBtn) backBtn.classList.remove('hidden');
        if (iconEl) iconEl.classList.add('hidden');
    } else {
        if (backBtn) backBtn.classList.add('hidden');
        if (iconEl) iconEl.classList.remove('hidden');
    }
}

export function updateDockUI(state) {
    const tabs = ['campaign', 'calendar', 'pc-manager', 'codex'];
    
    // Reset all tabs to inactive color
    tabs.forEach(tab => {
        const el = document.getElementById(`dock-tab-${tab}`);
        if (el) {
            el.classList.remove('text-amber-500', 'hover:text-amber-300');
            el.classList.add('text-stone-400', 'hover:text-amber-300');
        }
    });

    // Determine which "Pill" tab should be highlighted based on the current deep view
    let activeTab = 'campaign';
    if (['calendar'].includes(state.currentView)) activeTab = 'calendar';
    if (['pc-manager', 'pc-edit'].includes(state.currentView)) activeTab = 'pc-manager';
    if (['codex', 'rules'].includes(state.currentView)) activeTab = 'codex';
    
    // The Grand Tome is now officially part of the Library Hub, so keep the Library dock icon highlighted
    if (state.currentView === 'journal' && !state.activeAdventureId && !state.activeSessionId) {
        activeTab = 'codex'; 
    }

    const activeEl = document.getElementById(`dock-tab-${activeTab}`);
    if (activeEl) {
        activeEl.classList.remove('text-stone-400', 'hover:text-amber-300');
        activeEl.classList.add('text-amber-500');
    }
}

// --- NAVIGATION & ACTION MENU HOOKS ---
export const navigateBack = () => {
    const state = window.appData;
    if (!state) return;
    
    switch(state.currentView) {
        case 'campaign': 
        case 'pc-manager':
        case 'codex':
        case 'rules': 
        case 'calendar':
            window.appActions.setView('home'); 
            break;
        case 'adventure': window.appActions.setView('campaign'); break;
        case 'adv-roster': window.appActions.setView('adventure'); break;
        case 'session-edit': window.appActions.setView('adventure'); break;
        case 'pc-edit': window.appActions.setView('pc-manager'); break;
        case 'activity-log': window.appActions.setView('campaign'); break;
        case 'journal': 
            if (state.activeSessionId) { 
                window.appData.activeSessionId = null; 
                window.appActions.setView('adventure'); 
            } else if (state.activeAdventureId) { 
                window.appActions.setView('adventure'); 
            } else { 
                window.appActions.setView('home'); 
            }
            break;
    }
};

export const toggleActionMenu = () => {
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    const icon = document.getElementById('center-action-icon');
    
    if (!sheet || !overlay || !icon) return;
    
    if (sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        overlay.style.opacity = '0';
        icon.className = 'fa-solid fa-pen-nib text-xl transition-all duration-300';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        sheet.classList.add('open');
        overlay.classList.remove('hidden');
        icon.className = 'fa-solid fa-xmark text-xl transition-all duration-300 rotate-90';
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
};

// --- PLAYER RESOURCE BAR ---
export function updatePlayerResourceBar(state) {
    const bar = document.getElementById('player-resource-bar');
    if (!bar) return;

    const camp = state.activeCampaign;
    
    // Only display this bar if we are in a campaign and the user is a Player (not the DM)
    if (!camp || state.currentView === 'home' || camp._isDM) {
        bar.innerHTML = '';
        return;
    }

    // Find the player's active hero
    const myPc = camp.playerCharacters?.find(p => p.playerId === state.currentUserUid);
    if (!myPc) {
        bar.innerHTML = '';
        return;
    }

    // Calculate Resources
    let maxInsp = 0;
    if (myPc.boonBackstory) maxInsp += 1;
    if (myPc.boon2ndBday) maxInsp += 1;
    
    const currentInsp = myPc.inspiration === true ? 1 : (parseInt(myPc.inspiration) || 0);
    const autoSuccess = myPc.automaticSuccess ? 1 : 0;

    // Get the most relevant/latest Adventure Name
    let advName = "Current Adventure";
    if (state.activeAdventure) {
        advName = state.activeAdventure.name;
    } else if (camp.adventures && camp.adventures.length > 0) {
        // Sort alphanumerically to match the dashboard logic, grabbing the very last one
        const sortedAdventures = [...camp.adventures].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        advName = sortedAdventures[sortedAdventures.length - 1].name;
    }

    // Pulse FX
    const inspPulse = currentInsp > 0 ? 'animate-pulse text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-stone-600';
    const autoPulse = autoSuccess > 0 ? 'animate-pulse text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-stone-600';

    bar.innerHTML = `
        <div class="bg-[#292524] border-b-2 border-stone-800 p-3 px-5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-inner bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
            <div class="font-serif font-bold text-amber-500 text-sm sm:text-base truncate flex items-center">
                <i class="fa-solid fa-book-journal-whills text-amber-700 mr-2 sm:mr-3"></i> ${advName}
            </div>
            <div class="flex items-center gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-stone-900 px-4 py-2 rounded-sm border border-stone-700 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                <div class="flex items-center gap-2" title="Inspiration Available">
                    <i class="fa-solid fa-dice-d20 ${inspPulse} text-sm sm:text-lg transition-all duration-300"></i>
                    <span class="${currentInsp > 0 ? 'text-amber-500' : 'text-stone-600'}">Insp <span class="text-white">${currentInsp}</span><span class="text-stone-600">/${maxInsp}</span></span>
                </div>
                <div class="w-px h-5 bg-stone-800"></div>
                <div class="flex items-center gap-2" title="Auto-Success Available">
                    <i class="fa-solid fa-check-double ${autoPulse} text-sm sm:text-lg transition-all duration-300"></i>
                    <span class="${autoSuccess > 0 ? 'text-emerald-500' : 'text-stone-600'}">Auto <span class="text-white">${autoSuccess}</span></span>
                </div>
            </div>
        </div>
    `;
}

// --- GLOBAL CHECKLIST GENERATOR (MODAL UI) ---
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
    const updates = camp.sheetUpdates || [];

    // Filter for this user
    const visibleUpdates = updates.filter(item => {
        if (isDM) return true;
        const vis = item.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
        return false;
    });

    // Badge logic for players
    if (!isDM) {
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
            if (sheetBadge) sheetBadge.classList.add('hidden');
            if (libTabBadge) libTabBadge.classList.add('hidden');
        }
    } else {
        if (dockBadge) dockBadge.classList.add('hidden');
        if (sheetBadge) sheetBadge.classList.add('hidden'); 
        if (libTabBadge) libTabBadge.classList.add('hidden');
    }

    // Sort: Tasks I haven't resolved float to top. Then sort by newest.
    const sorted = [...visibleUpdates].sort((a, b) => {
        const aRes = (a.resolvedBy || []).includes(myUid);
        const bRes = (b.resolvedBy || []).includes(myUid);
        if (aRes === bRes) return (b.timestamp || 0) - (a.timestamp || 0);
        return aRes ? 1 : -1;
    });

    let listHtml = '';
    if (sorted.length === 0 && isDM) {
        listHtml = `<div class="text-xs text-stone-500 italic mb-2 text-center py-6">No active tasks assigned to the party.</div>`;
    } else {
        sorted.forEach(item => {
            const isResolvedByMe = (item.resolvedBy || []).includes(myUid);
            const statusIcon = isResolvedByMe 
                ? '<i class="fa-solid fa-circle-check text-emerald-600"></i>' 
                : '<i class="fa-regular fa-circle text-stone-400"></i>';
            const statusTextClass = isResolvedByMe ? 'text-stone-400 line-through' : 'text-stone-800 font-bold';
            
            let dmControls = '';
            if (isDM) {
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

                dmControls = `
                    ${resolvedText}
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="window.appActions.openVisibilityMenu(this, 'checklist', '${item.id}')" class="text-[10px] flex items-center justify-center hover:bg-stone-200 px-2 py-1 rounded transition text-stone-600 font-bold uppercase tracking-widest border border-transparent hover:border-stone-300" title="Visibility Settings"><i class="fa-solid ${eyeIcon} sm:mr-1"></i> <span class="hidden sm:inline">${visLabel}</span></button>
                        <button type="button" onclick="window.appActions.deleteSheetUpdate('${item.id}')" class="text-[10px] w-6 h-6 flex items-center justify-center text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            }

            let playerControls = '';
            if (!isDM) {
                playerControls = `
                    <button type="button" onclick="window.appActions.toggleSheetUpdateResolved('${item.id}')" class="text-[10px] font-bold uppercase tracking-wider border px-3 py-1.5 rounded-sm transition shadow-sm whitespace-nowrap ml-auto ${isResolvedByMe ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' : 'bg-white border-amber-300/50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'}">
                        ${isResolvedByMe ? '<i class="fa-solid fa-check mr-1"></i> Added' : 'Mark as Added'}
                    </button>
                `;
            }

            const safeText = item.text.replace(/"/g, '&quot;');

            listHtml += `
            <div class="flex flex-col bg-[#fdfbf7] p-3 border border-amber-600/20 rounded-sm shadow-sm gap-2 mb-3 hover:border-amber-400/50 transition-colors">
                <div class="flex items-start sm:items-center gap-3">
                    <div class="flex-shrink-0 text-base mt-0.5 sm:mt-0">${statusIcon}</div>
                    <span class="text-sm ${statusTextClass} break-words">${safeText}</span>
                </div>
                <div class="flex items-center justify-between w-full pt-2 border-t border-stone-200 mt-1 min-h-[28px]">
                    ${isDM ? dmControls : playerControls}
                </div>
            </div>
            `;
        });
    }

    let addHtml = '';
    if (isDM) {
        addHtml = `
        <div class="flex gap-2 mt-4 pt-4 border-t border-amber-700/20 sticky bottom-0 bg-[#f4ebd8] pb-2 z-10">
            <input type="text" id="new-sheet-update-text" class="flex-grow p-2 border border-amber-600/30 rounded-sm text-xs sm:text-sm focus:border-red-900 outline-none shadow-inner bg-white font-sans placeholder:text-stone-400 placeholder:italic" placeholder="Assign a task (e.g. Add 50gp)..." onkeydown="if(event.key === 'Enter') { event.preventDefault(); window.appActions.addSheetUpdate(); }">
            <button type="button" onclick="window.appActions.addSheetUpdate()" class="px-4 py-2 bg-amber-700 text-amber-50 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-sm shadow-md hover:bg-amber-600 transition whitespace-nowrap"><i class="fa-solid fa-plus sm:mr-1"></i> <span class="hidden sm:inline">Assign</span></button>
        </div>
        `;
    }

    container.innerHTML = listHtml + addHtml;
}

// --- MAIN RENDERER ---
export function renderApp(state) {
    const container = document.getElementById('app-container');
    if (!container) return;

    // Reset scroll position gracefully
    container.scrollTo({ top: 0, behavior: 'instant' });

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
        case 'calendar': html = getCalendarHTML(state); break;
        case 'rules': html = getRulesHTML(state); break;
        case 'activity-log': html = getActivityLogHTML(state); break;
        default: html = `<div class="text-center text-red-500">Unknown View: ${state.currentView}</div>`;
    }

    container.innerHTML = html;

    // Post-render UI adjustments (Handles the new mobile-first elements)
    updateHeaderUI(state);
    updateDockUI(state);
    updateChecklistUI(state);
    updatePlayerResourceBar(state);

    if (state.currentView === 'session-edit') {
        updateSessionTabUI('session');
        
        // Ensure the budget UI initializes its values immediately upon loading the editor
        if (window.appActions && window.appActions.updateSessionBudget) {
            window.appActions.updateSessionBudget();
        }
    }
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

// --- GLOBAL WINDOW BINDINGS FOR INLINE HTML ---

window.filterCodex = function() {
    const input = document.getElementById('codex-search');
    if(!input) return;
    const query = input.value.toLowerCase().trim();
    const folders = document.querySelectorAll('.codex-folder');
    
    folders.forEach(folder => {
        const cards = folder.querySelectorAll('.codex-card');
        const content = folder.querySelector('.folder-content');
        const chevron = folder.querySelector('.folder-chevron');
        const button = folder.querySelector('button');
        let hasVisibleCard = false;

        cards.forEach(card => {
            const searchData = card.getAttribute('data-search') || '';
            if (query === '' || searchData.includes(query)) {
                card.style.display = 'flex';
                hasVisibleCard = true;
            } else {
                card.style.display = 'none';
            }
        });

        if (query !== '') {
            // If searching, hide empty folders, expand folders with results
            if (hasVisibleCard) {
                folder.style.display = 'block';
                content.classList.remove('hidden');
                chevron.classList.add('rotate-180');
                button.classList.add('border-stone-700');
            } else {
                folder.style.display = 'none';
            }
        } else {
            // If search is cleared, show all folders again
            folder.style.display = 'block';
        }
    });
};
