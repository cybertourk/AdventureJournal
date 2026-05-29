import { getHomeHTML, getCampaignHTML, getAdventureHTML, getAdvRosterHTML, getActivityLogHTML } from './ui-campaign.js';
import { getPCManagerHTML, getPCEditHTML } from './ui-characters.js';
import { getSessionEditHTML } from './ui-session.js';
import { getCodexHTML, getJournalHTML } from './ui-codex.js';
import { getCalendarHTML } from './ui-calendar.js';
import { getRulesHTML } from './ui-rules.js';
import { getAtlasHTML } from './ui-atlas.js';
import { getWebsHTML } from './ui-webs.js';
import { getBazaarHTML, getStorefrontHTML, getShopBackroomHTML } from './ui-shops.js';
import { getTablesHTML } from './ui-tables.js';
import { getDatabasesHTML } from './ui-databases.js';

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

// --- LIBRARY NAVIGATION TABS ---
export function getLibraryTabsHTML(activeTab) {
    const isCodex = activeTab === 'codex';
    const isRules = activeTab === 'rules';
    const isWebs = activeTab === 'webs';
    const isBazaar = activeTab === 'bazaar';
    const isTome = activeTab === 'tome';
    const isTables = activeTab === 'tables';
    const isDatabases = activeTab === 'databases';

    const isDM = window.appData?.activeCampaign?._isDM || false;

    return `
    <div class="flex bg-stone-200 p-1 sm:p-1.5 rounded-sm border border-[#d4c5a9] shadow-inner mb-6 w-full max-w-5xl mx-auto shrink-0 overflow-x-auto hide-scrollbar">
        <button onclick="window.appActions.setView('codex')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isCodex ? 'bg-white shadow-sm text-red-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-book-journal-whills text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Codex</span>
        </button>
        <button onclick="window.appActions.openBazaar()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isBazaar ? 'bg-white shadow-sm text-emerald-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-store text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Bazaar</span>
        </button>
        ${isDM ? `
        <button onclick="window.appActions.setView('databases')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isDatabases ? 'bg-white shadow-sm text-stone-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-box-archive text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Databases</span>
        </button>
        ` : ''}
        <button onclick="window.appActions.openRulesGlossary()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isRules ? 'bg-white shadow-sm text-amber-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scale-balanced text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Rules</span>
        </button>
        ${isDM ? `
        <button onclick="window.appActions.setView('tables')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isTables ? 'bg-white shadow-sm text-stone-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-table-list text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Tables</span>
        </button>
        ` : ''}
        <button onclick="window.appActions.setView('webs')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isWebs ? 'bg-white shadow-sm text-purple-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-diagram-project text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Webs</span>
        </button>
        <button onclick="window.appActions.openJournal('campaign')" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition ${isTome ? 'bg-white shadow-sm text-stone-900 font-bold border border-stone-300' : 'text-stone-500 hover:text-stone-800 border border-transparent'} text-[9px] sm:text-[10px] uppercase tracking-wider">
            <i class="fa-solid fa-scroll text-sm sm:text-base mb-0.5 sm:mb-0"></i> <span>Tome</span>
        </button>
        <button onclick="window.appActions.openChecklistMenu()" class="min-w-[64px] flex-1 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 rounded-sm transition text-stone-500 hover:text-blue-800 border border-transparent text-[9px] sm:text-[10px] uppercase tracking-wider relative group">
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

    if (state.currentView === 'home' || !state.activeCampaign) {
        if (dockContainer) dockContainer.classList.add('translate-y-32', 'opacity-0');
        titleEl.textContent = 'Adventure Journal';
        if (breadcrumbEl) breadcrumbEl.textContent = 'The Lobby';
        if (backBtn) backBtn.classList.add('hidden');
        if (iconEl) iconEl.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
        return;
    }

    if (dockContainer) dockContainer.classList.remove('translate-y-32', 'opacity-0');
    titleEl.textContent = state.activeCampaign.name;
    if (settingsBtn) settingsBtn.classList.add('hidden');

    let breadcrumbText = 'Story Arcs';
    let showBack = false;

    switch (state.currentView) {
        case 'campaign': breadcrumbText = 'Story Arcs'; showBack = true; break;
        case 'adventure': breadcrumbText = state.activeAdventure?.name || 'Adventure Arc'; showBack = true; break;
        case 'adv-roster': breadcrumbText = 'Arc Roster'; showBack = true; break;
        case 'session-edit': breadcrumbText = state.activeSessionId ? 'Amend Record' : 'New Record'; showBack = true; break;
        case 'pc-manager': breadcrumbText = 'Party Manifest'; showBack = true; break;
        case 'pc-edit': breadcrumbText = state.activePcId ? 'Edit Hero' : 'New Hero'; showBack = true; break;
        case 'codex': breadcrumbText = 'Library • Codex'; showBack = true; break;
        case 'bazaar': breadcrumbText = 'Library • Bazaar'; showBack = true; break;
        case 'databases': breadcrumbText = 'Library • Databases'; showBack = true; break;
        case 'storefront': breadcrumbText = 'Bazaar • Storefront'; showBack = true; break;
        case 'shop-backroom': breadcrumbText = 'Bazaar • DM Backroom'; showBack = true; break;
        case 'rules': breadcrumbText = 'Library • Rules'; showBack = true; break;
        case 'tables': breadcrumbText = 'Library • Roll Tables'; showBack = true; break;
        case 'webs': breadcrumbText = 'Library • Webs'; showBack = true; break;
        case 'atlas': breadcrumbText = 'Library • Atlas'; showBack = true; break;
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
    
    tabs.forEach(tab => {
        const el = document.getElementById(`dock-tab-${tab}`);
        if (el) {
            el.classList.remove('text-amber-500', 'hover:text-amber-300');
            el.classList.add('text-stone-400', 'hover:text-amber-300');
        }
    });

    let activeTab = 'campaign';
    if (['calendar'].includes(state.currentView)) activeTab = 'calendar';
    if (['pc-manager', 'pc-edit'].includes(state.currentView)) activeTab = 'pc-manager';
    if (['codex', 'rules', 'tables', 'webs', 'databases', 'bazaar', 'storefront', 'shop-backroom', 'atlas'].includes(state.currentView)) activeTab = 'codex';
    
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
        case 'bazaar':
        case 'databases':
        case 'rules': 
        case 'tables':
        case 'webs':
        case 'calendar':
            window.appActions.setView('home'); 
            break;
        case 'storefront':
        case 'shop-backroom':
            window.appActions.setView('bazaar'); 
            break;
        case 'atlas': window.appActions.setView('campaign'); break;
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
    const dmAssignBtn = document.getElementById('dm-assign-downtime-btn');
    const dmNpcGenBtn = document.getElementById('dm-npc-gen-btn');
    
    if (!sheet || !overlay || !icon) return;
    
    const camp = window.appData?.activeCampaign;
    if (dmAssignBtn && dmNpcGenBtn) {
        if (camp && camp._isDM) {
            dmAssignBtn.classList.remove('hidden');
            dmNpcGenBtn.classList.remove('hidden');
        } else {
            dmAssignBtn.classList.add('hidden');
            dmNpcGenBtn.classList.add('hidden');
        }
    }
    
    if (sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        overlay.style.opacity = '0';
        icon.className = 'fa-solid fa-pen-nib text-lg transition-all duration-300';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        sheet.classList.add('open');
        overlay.classList.remove('hidden');
        icon.className = 'fa-solid fa-xmark text-lg transition-all duration-300 rotate-90';
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
};

// --- PLAYER RESOURCE BAR ---
export function updatePlayerResourceBar(state) {
    const bar = document.getElementById('player-resource-bar');
    if (!bar) return;

    const camp = state.activeCampaign;
    
    if (!camp || state.currentView === 'home' || camp._isDM) {
        bar.innerHTML = '';
        return;
    }

    const myPc = camp.playerCharacters?.find(p => p.playerId === state.currentUserUid);
    if (!myPc) {
        bar.innerHTML = '';
        return;
    }

    let maxInsp = 0;
    if (myPc.boonBackstory) maxInsp += 1;
    if (myPc.boon2ndBday) maxInsp += 1;
    
    const currentInsp = myPc.inspiration === true ? 1 : (parseInt(myPc.inspiration) || 0);
    const autoSuccess = myPc.automaticSuccess ? 1 : 0;

    let advName = "Current Adventure";
    if (state.activeAdventure) {
        advName = state.activeAdventure.name;
    } else if (camp.adventures && camp.adventures.length > 0) {
        const sortedAdventures = [...camp.adventures].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        advName = sortedAdventures[sortedAdventures.length - 1].name;
    }

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

    const visibleUpdates = updates.filter(item => {
        if (isDM || item.authorId === myUid) return true;
        const vis = item.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
        return false;
    });

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

    container.innerHTML = `
        <div class="flex border-b border-[#d4c5a9] mb-4">
            <button onclick="window.appActions.switchChecklistTab('tasks')" id="tab-tasks-btn" class="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900">Tasks</button>
            <button onclick="window.appActions.switchChecklistTab('quests')" id="tab-quests-btn" class="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition">Quests</button>
        </div>
        <div id="checklist-tasks-content">${listHtml + addHtml}</div>
        <div id="checklist-quests-content" class="hidden">
            ${renderQuestLogUI(state)}
        </div>
    `;
}

// --- QUEST LOG UI ---
export function renderQuestLogUI(state) {
    const camp = state.activeCampaign;
    const quests = camp.quests || [];
    
    // Categorize
    const categories = {
        'Current Arc': [],
        'General': [],
        'Personal': [],
        'Previous Arcs': []
    };
    
    quests.forEach(q => {
        if (categories[q.category]) categories[q.category].push(q);
        else categories['General'].push(q);
    });

    let html = `<div class="space-y-4">`;
    Object.entries(categories).forEach(([cat, items]) => {
        html += `<h4 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1 mt-4">${cat}</h4>`;
        if (items.length === 0) html += `<p class="text-[10px] text-stone-400 italic">No quests in this category.</p>`;
        else items.forEach(q => {
            const progress = q.objectives.filter(o => o.progress >= o.max).length;
            const total = q.objectives.length;
            const percent = total > 0 ? (progress / total) * 100 : 0;
            
            html += `
            <div class="bg-white p-3 border border-[#d4c5a9] rounded-sm shadow-sm cursor-pointer hover:border-amber-400" onclick="window.appActions.openQuestDetails('${q.id}')">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-stone-900 text-xs">${q.name}</span>
                    <span class="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">${q.status}</span>
                </div>
                <div class="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div class="bg-emerald-600 h-full transition-all" style="width: ${percent}%"></div>
                </div>
            </div>`;
        });
    });
    
    html += `
        <button onclick="window.appActions.openQuestDetails(null)" class="w-full mt-4 py-2 bg-stone-900 text-amber-50 rounded-sm font-bold uppercase tracking-wider text-[10px] hover:bg-stone-800 transition shadow-md">
            <i class="fa-solid fa-plus mr-1.5"></i> Record New Quest
        </button>
    </div>`;
    return html;
}

// --- QUEST UI ACTIONS ---
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.switchChecklistTab = (tab) => {
        const tasks = document.getElementById('checklist-tasks-content');
        const quests = document.getElementById('checklist-quests-content');
        const tasksBtn = document.getElementById('tab-tasks-btn');
        const questsBtn = document.getElementById('tab-quests-btn');
        
        if (tab === 'tasks') {
            tasks.classList.remove('hidden');
            quests.classList.add('hidden');
            tasksBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900";
            questsBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition";
        } else {
            tasks.classList.add('hidden');
            quests.classList.remove('hidden');
            tasksBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition";
            questsBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900";
        }
    };

    window.appActions.openQuestDetails = (id) => {
        const camp = window.appData.activeCampaign;
        const quest = camp.quests?.find(q => q.id === id) || { id: generateId(), name: '', objectives: [], giver: { name: '', loc: '' }, status: 'Active', rewards: '', clues: '', category: 'General' };

        const container = document.getElementById('global-popup-container');
        container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[20000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] p-5 sm:p-8 rounded-sm border-2 border-stone-800 shadow-2xl max-w-xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <input type="hidden" id="q-id" value="${quest.id}">
                <div class="mb-4">
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Quest Name</label>
                    <input type="text" id="q-name" value="${quest.name.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Category</label>
                        <select id="q-cat" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white">
                            <option value="Current Arc" ${quest.category==='Current Arc'?'selected':''}>Current Arc</option>
                            <option value="General" ${quest.category==='General'?'selected':''}>General</option>
                            <option value="Personal" ${quest.category==='Personal'?'selected':''}>Personal</option>
                            <option value="Previous Arcs" ${quest.category==='Previous Arcs'?'selected':''}>Previous Arcs</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Status</label>
                        <select id="q-stat" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white">
                            <option value="Active" ${quest.status==='Active'?'selected':''}>Active</option>
                            <option value="Completed" ${quest.status==='Completed'?'selected':''}>Completed</option>
                            <option value="Failed" ${quest.status==='Failed'?'selected':''}>Failed</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Giver Name</label>
                        <input type="text" id="q-giver" value="${quest.giver.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Giver Location</label>
                        <input type="text" id="q-giver-loc" value="${quest.giver.loc}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                </div>
                
                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Objectives</label>
                <div id="q-objectives" class="mb-4 space-y-2">
                    ${quest.objectives.map((o, i) => `
                    <div class="flex gap-2 items-center">
                        <input type="text" class="obj-desc flex-grow p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.desc}">
                        <input type="number" class="obj-prog w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.progress}">
                        <span class="text-xs">/</span>
                        <input type="number" class="obj-max w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.max}">
                    </div>
                    `).join('')}
                </div>
                <button onclick="window.appActions.addQuestObjective()" class="w-full py-1.5 border border-dashed border-stone-400 text-[10px] uppercase font-bold text-stone-500 mb-6">+ Add Objective</button>

                <div class="flex justify-end gap-2">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = ''" class="px-4 py-2 text-stone-600 text-xs font-bold uppercase tracking-wider">Cancel</button>
                    <button onclick="window.appActions.saveQuest()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm text-xs font-bold uppercase tracking-wider">Save Quest</button>
                </div>
            </div>
        </div>
        `;
    };

    window.appActions.addQuestObjective = () => {
        document.getElementById('q-objectives').insertAdjacentHTML('beforeend', `
            <div class="flex gap-2 items-center animate-in fade-in">
                <input type="text" class="obj-desc flex-grow p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" placeholder="Objective description...">
                <input type="number" class="obj-prog w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="0">
                <span class="text-xs">/</span>
                <input type="number" class="obj-max w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="1">
            </div>
        `);
    };

    window.appActions.saveQuest = async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const qId = document.getElementById('q-id').value;
        const name = document.getElementById('q-name').value.trim();
        const category = document.getElementById('q-cat').value;
        const status = document.getElementById('q-stat').value;
        const giver = { name: document.getElementById('q-giver').value, loc: document.getElementById('q-giver-loc').value };
        
        const objectives = Array.from(document.querySelectorAll('.obj-desc')).map((descEl, i) => {
            const row = descEl.parentElement;
            return {
                desc: descEl.value,
                progress: parseInt(row.querySelector('.obj-prog').value) || 0,
                max: parseInt(row.querySelector('.obj-max').value) || 1
            };
        });

        const quest = { id: qId, name, category, status, giver, objectives };
        
        const existingIdx = (camp.quests || []).findIndex(q => q.id === qId);
        if (existingIdx > -1) camp.quests[existingIdx] = quest;
        else camp.quests = [...(camp.quests || []), quest];

        await saveCampaign(camp);
        document.getElementById('global-popup-container').innerHTML = '';
        reRender(true);
    };
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

    if (state.currentView === 'home' || !state.activeCampaign) {
        if (dockContainer) dockContainer.classList.add('translate-y-32', 'opacity-0');
        titleEl.textContent = 'Adventure Journal';
        if (breadcrumbEl) breadcrumbEl.textContent = 'The Lobby';
        if (backBtn) backBtn.classList.add('hidden');
        if (iconEl) iconEl.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
        return;
    }

    if (dockContainer) dockContainer.classList.remove('translate-y-32', 'opacity-0');
    titleEl.textContent = state.activeCampaign.name;
    if (settingsBtn) settingsBtn.classList.add('hidden');

    let breadcrumbText = 'Story Arcs';
    let showBack = false;

    switch (state.currentView) {
        case 'campaign': breadcrumbText = 'Story Arcs'; showBack = true; break;
        case 'adventure': breadcrumbText = state.activeAdventure?.name || 'Adventure Arc'; showBack = true; break;
        case 'adv-roster': breadcrumbText = 'Arc Roster'; showBack = true; break;
        case 'session-edit': breadcrumbText = state.activeSessionId ? 'Amend Record' : 'New Record'; showBack = true; break;
        case 'pc-edit': breadcrumbText = state.activePcId ? 'Edit Hero' : 'New Hero'; showBack = true; break;
        case 'codex': breadcrumbText = 'Library • Codex'; showBack = true; break;
        case 'bazaar': breadcrumbText = 'Library • Bazaar'; showBack = true; break;
        case 'databases': breadcrumbText = 'Library • Databases'; showBack = true; break;
        case 'storefront': breadcrumbText = 'Bazaar • Storefront'; showBack = true; break;
        case 'shop-backroom': breadcrumbText = 'Bazaar • DM Backroom'; showBack = true; break;
        case 'rules': breadcrumbText = 'Library • Rules'; showBack = true; break;
        case 'tables': breadcrumbText = 'Library • Roll Tables'; showBack = true; break;
        case 'webs': breadcrumbText = 'Library • Webs'; showBack = true; break;
        case 'atlas': breadcrumbText = 'Library • Atlas'; showBack = true; break;
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
    
    tabs.forEach(tab => {
        const el = document.getElementById(`dock-tab-${tab}`);
        if (el) {
            el.classList.remove('text-amber-500', 'hover:text-amber-300');
            el.classList.add('text-stone-400', 'hover:text-amber-300');
        }
    });

    let activeTab = 'campaign';
    if (['calendar'].includes(state.currentView)) activeTab = 'calendar';
    if (['pc-manager', 'pc-edit'].includes(state.currentView)) activeTab = 'pc-manager';
    if (['codex', 'rules', 'tables', 'webs', 'databases', 'bazaar', 'storefront', 'shop-backroom', 'atlas'].includes(state.currentView)) activeTab = 'codex';
    
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
        case 'bazaar':
        case 'databases':
        case 'rules': 
        case 'tables':
        case 'webs':
        case 'calendar':
            window.appActions.setView('home'); 
            break;
        case 'storefront':
        case 'shop-backroom':
            window.appActions.setView('bazaar'); 
            break;
        case 'atlas': window.appActions.setView('campaign'); break;
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
    const dmAssignBtn = document.getElementById('dm-assign-downtime-btn');
    const dmNpcGenBtn = document.getElementById('dm-npc-gen-btn');
    
    if (!sheet || !overlay || !icon) return;
    
    const camp = window.appData?.activeCampaign;
    if (dmAssignBtn && dmNpcGenBtn) {
        if (camp && camp._isDM) {
            dmAssignBtn.classList.remove('hidden');
            dmNpcGenBtn.classList.remove('hidden');
        } else {
            dmAssignBtn.classList.add('hidden');
            dmNpcGenBtn.classList.add('hidden');
        }
    }
    
    if (sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        overlay.style.opacity = '0';
        icon.className = 'fa-solid fa-pen-nib text-lg transition-all duration-300';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        sheet.classList.add('open');
        overlay.classList.remove('hidden');
        icon.className = 'fa-solid fa-xmark text-lg transition-all duration-300 rotate-90';
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
};

// --- PLAYER RESOURCE BAR ---
export function updatePlayerResourceBar(state) {
    const bar = document.getElementById('player-resource-bar');
    if (!bar) return;

    const camp = state.activeCampaign;
    
    if (!camp || state.currentView === 'home' || camp._isDM) {
        bar.innerHTML = '';
        return;
    }

    const myPc = camp.playerCharacters?.find(p => p.playerId === state.currentUserUid);
    if (!myPc) {
        bar.innerHTML = '';
        return;
    }

    let maxInsp = 0;
    if (myPc.boonBackstory) maxInsp += 1;
    if (myPc.boon2ndBday) maxInsp += 1;
    
    const currentInsp = myPc.inspiration === true ? 1 : (parseInt(myPc.inspiration) || 0);
    const autoSuccess = myPc.automaticSuccess ? 1 : 0;

    let advName = "Current Adventure";
    if (state.activeAdventure) {
        advName = state.activeAdventure.name;
    } else if (camp.adventures && camp.adventures.length > 0) {
        const sortedAdventures = [...camp.adventures].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        advName = sortedAdventures[sortedAdventures.length - 1].name;
    }

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

    const visibleUpdates = updates.filter(item => {
        if (isDM || item.authorId === myUid) return true;
        const vis = item.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
        return false;
    });

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

    container.innerHTML = `
        <div class="flex border-b border-[#d4c5a9] mb-4">
            <button onclick="window.appActions.switchChecklistTab('tasks')" id="tab-tasks-btn" class="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900">Tasks</button>
            <button onclick="window.appActions.switchChecklistTab('quests')" id="tab-quests-btn" class="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition">Quests</button>
        </div>
        <div id="checklist-tasks-content">${listHtml + addHtml}</div>
        <div id="checklist-quests-content" class="hidden">
            ${renderQuestLogUI(state)}
        </div>
    `;
}

// --- QUEST LOG UI ---
export function renderQuestLogUI(state) {
    const camp = state.activeCampaign;
    const quests = camp.quests || [];
    
    // Categorize
    const categories = {
        'Current Arc': [],
        'General': [],
        'Personal': [],
        'Previous Arcs': []
    };
    
    quests.forEach(q => {
        if (categories[q.category]) categories[q.category].push(q);
        else categories['General'].push(q);
    });

    let html = `<div class="space-y-4">`;
    Object.entries(categories).forEach(([cat, items]) => {
        html += `<h4 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1 mt-4">${cat}</h4>`;
        if (items.length === 0) html += `<p class="text-[10px] text-stone-400 italic">No quests in this category.</p>`;
        else items.forEach(q => {
            const progress = q.objectives.filter(o => o.progress >= o.max).length;
            const total = q.objectives.length;
            const percent = total > 0 ? (progress / total) * 100 : 0;
            
            html += `
            <div class="bg-white p-3 border border-[#d4c5a9] rounded-sm shadow-sm cursor-pointer hover:border-amber-400" onclick="window.appActions.openQuestDetails('${q.id}')">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-stone-900 text-xs">${q.name}</span>
                    <span class="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">${q.status}</span>
                </div>
                <div class="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div class="bg-emerald-600 h-full transition-all" style="width: ${percent}%"></div>
                </div>
            </div>`;
        });
    });
    
    html += `
        <button onclick="window.appActions.openQuestDetails(null)" class="w-full mt-4 py-2 bg-stone-900 text-amber-50 rounded-sm font-bold uppercase tracking-wider text-[10px] hover:bg-stone-800 transition shadow-md">
            <i class="fa-solid fa-plus mr-1.5"></i> Record New Quest
        </button>
    </div>`;
    return html;
}

// --- QUEST UI ACTIONS ---
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.switchChecklistTab = (tab) => {
        const tasks = document.getElementById('checklist-tasks-content');
        const quests = document.getElementById('checklist-quests-content');
        const tasksBtn = document.getElementById('tab-tasks-btn');
        const questsBtn = document.getElementById('tab-quests-btn');
        
        if (tab === 'tasks') {
            tasks.classList.remove('hidden');
            quests.classList.add('hidden');
            tasksBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900";
            questsBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition";
        } else {
            tasks.classList.add('hidden');
            quests.classList.remove('hidden');
            tasksBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-stone-500 hover:text-stone-800 transition";
            questsBtn.className = "px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 border-amber-600 text-amber-900";
        }
    };

    window.appActions.openQuestDetails = (id) => {
        const camp = window.appData.activeCampaign;
        const quest = camp.quests?.find(q => q.id === id) || { id: generateId(), name: '', objectives: [], giver: { name: '', loc: '' }, status: 'Active', rewards: '', clues: '', category: 'General' };

        const container = document.getElementById('global-popup-container');
        container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[20000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] p-5 sm:p-8 rounded-sm border-2 border-stone-800 shadow-2xl max-w-xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <input type="hidden" id="q-id" value="${quest.id}">
                <div class="mb-4">
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Quest Name</label>
                    <input type="text" id="q-name" value="${quest.name.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Category</label>
                        <select id="q-cat" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white">
                            <option value="Current Arc" ${quest.category==='Current Arc'?'selected':''}>Current Arc</option>
                            <option value="General" ${quest.category==='General'?'selected':''}>General</option>
                            <option value="Personal" ${quest.category==='Personal'?'selected':''}>Personal</option>
                            <option value="Previous Arcs" ${quest.category==='Previous Arcs'?'selected':''}>Previous Arcs</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Status</label>
                        <select id="q-stat" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 bg-white">
                            <option value="Active" ${quest.status==='Active'?'selected':''}>Active</option>
                            <option value="Completed" ${quest.status==='Completed'?'selected':''}>Completed</option>
                            <option value="Failed" ${quest.status==='Failed'?'selected':''}>Failed</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Giver Name</label>
                        <input type="text" id="q-giver" value="${quest.giver.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Giver Location</label>
                        <input type="text" id="q-giver-loc" value="${quest.giver.loc}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                </div>
                
                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Objectives</label>
                <div id="q-objectives" class="mb-4 space-y-2">
                    ${quest.objectives.map((o, i) => `
                    <div class="flex gap-2 items-center">
                        <input type="text" class="obj-desc flex-grow p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.desc}">
                        <input type="number" class="obj-prog w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.progress}">
                        <span class="text-xs">/</span>
                        <input type="number" class="obj-max w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="${o.max}">
                    </div>
                    `).join('')}
                </div>
                <button onclick="window.appActions.addQuestObjective()" class="w-full py-1.5 border border-dashed border-stone-400 text-[10px] uppercase font-bold text-stone-500 mb-6">+ Add Objective</button>

                <div class="flex justify-end gap-2">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = ''" class="px-4 py-2 text-stone-600 text-xs font-bold uppercase tracking-wider">Cancel</button>
                    <button onclick="window.appActions.saveQuest()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm text-xs font-bold uppercase tracking-wider">Save Quest</button>
                </div>
            </div>
        </div>
        `;
    };

    window.appActions.addQuestObjective = () => {
        document.getElementById('q-objectives').insertAdjacentHTML('beforeend', `
            <div class="flex gap-2 items-center animate-in fade-in">
                <input type="text" class="obj-desc flex-grow p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" placeholder="Objective description...">
                <input type="number" class="obj-prog w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="0">
                <span class="text-xs">/</span>
                <input type="number" class="obj-max w-16 p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white" value="1">
            </div>
        `);
    };

    window.appActions.saveQuest = async () => {
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const qId = document.getElementById('q-id').value;
        const name = document.getElementById('q-name').value.trim();
        const category = document.getElementById('q-cat').value;
        const status = document.getElementById('q-stat').value;
        const giver = { name: document.getElementById('q-giver').value, loc: document.getElementById('q-giver-loc').value };
        
        const objectives = Array.from(document.querySelectorAll('.obj-desc')).map((descEl, i) => {
            const row = descEl.parentElement;
            return {
                desc: descEl.value,
                progress: parseInt(row.querySelector('.obj-prog').value) || 0,
                max: parseInt(row.querySelector('.obj-max').value) || 1
            };
        });

        const quest = { id: qId, name, category, status, giver, objectives };
        
        const existingIdx = (camp.quests || []).findIndex(q => q.id === qId);
        if (existingIdx > -1) camp.quests[existingIdx] = quest;
        else camp.quests = [...(camp.quests || []), quest];

        await saveCampaign(camp);
        document.getElementById('global-popup-container').innerHTML = '';
        reRender(true);
    };
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
            if (hasVisibleCard) {
                folder.style.display = 'block';
                content.classList.remove('hidden');
                chevron.classList.add('rotate-180');
                button.classList.add('border-stone-700');
            } else {
                folder.style.display = 'none';
            }
        } else {
            folder.style.display = 'block';
        }
    });
};
