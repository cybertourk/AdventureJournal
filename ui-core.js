import { getHomeHTML, getCampaignHTML, getAdventureHTML, getAdvRosterHTML, getActivityLogHTML } from './ui-campaign.js';
import { getPCManagerHTML, getPCEditHTML } from './ui-characters.js';
import { getSessionEditHTML } from './ui-session.js';
import { getCodexHTML } from './ui-codex.js';
import { getCalendarHTML } from './ui-calendar.js';
import { getRulesHTML } from './ui-rules.js';
import { getAtlasHTML } from './ui-atlas.js';
import { getWebsHTML } from './ui-webs.js';
import { getBazaarHTML, getStorefrontHTML, getShopBackroomHTML } from './ui-shops.js';
import { getTablesHTML } from './ui-tables.js';
import { getDatabasesHTML } from './ui-databases.js';
import { generateId, reRender } from './state.js';
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
    const editBtnHtml = isReadonly ? '' : `<button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-50 transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('input-${id}', '${plainLabel}')"><i class="fa-solid fa-pen"></i> Edit</button>`;

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
    const isTables = activeTab === 'tables';
    const isDatabases = activeTab === 'databases';

    const isDM = window.appData?.activeCampaign?._isDM || false;

    return `
    <div class="flex bg-stone-200 p-1 sm:p-1.5 rounded-sm border border-stone-300 shadow-inner mb-6 w-full max-w-5xl mx-auto shrink-0 overflow-x-auto hide-scrollbar">
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
        activeEl.classList.add('text-amber-50');
    }
}

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
                <div class="w-px h-5 bg-stone-900"></div>
                <div class="flex items-center gap-2" title="Auto-Success Available">
                    <i class="fa-solid fa-check-double ${autoPulse} text-sm sm:text-lg transition-all duration-300"></i>
                    <span class="${autoSuccess > 0 ? 'text-emerald-500' : 'text-stone-600'}">Auto <span class="text-white">${autoSuccess}</span></span>
                </div>
            </div>
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

    const activeTab = state.activeChecklistTab || 'tasks';
    const tabNav = `
    <div class="flex gap-2 mb-4">
        <button onclick="window.switchChecklistTab('tasks')" class="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 ${activeTab === 'tasks' ? 'border-amber-700 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'} transition">Tasks</button>
        <button onclick="window.switchChecklistTab('quests')" class="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 ${activeTab === 'quests' ? 'border-amber-700 text-amber-900' : 'border-transparent text-stone-500 hover:text-stone-800'} transition">Quest Log</button>
    </div>
    `;

    let contentHtml = '';

    if (activeTab === 'tasks') {
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
                    authorTag = `<span class="text-[8px] uppercase tracking-widest text-stone-400 font-bold ml-2 border border-stone-200 px-1 rounded-sm shadow-sm align-middle">From: ${aName}</span>`;
                }

                const resolveBtn = `
                    <button type="button" onclick="window.appActions.toggleSheetUpdateResolved('${item.id}')" class="text-[10px] font-bold uppercase tracking-wider border px-3 py-1.5 rounded-sm transition shadow-sm ${isResolvedByMe ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'}">
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
                    const resolvedNames = resolvedUids.map(uid => camp.playerNames[uid] || 'Unknown').join(', ');
                    
                    const textDisplay = resolvedNames 
                        ? `<span class="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded mr-auto truncate max-w-[140px] sm:max-w-[200px]" title="Completed by: ${resolvedNames}"><i class="fa-solid fa-check-double mr-1"></i> ${resolvedNames}</span>` 
                        : `<span class="text-[9px] text-stone-400 italic mr-auto">No completions yet</span>`;

                    let visBtnHtml = '';
                    if (isDM) {
                        visBtnHtml = `<button type="button" onclick="window.appActions.openVisibilityMenu(this, 'checklist', '${item.id}')" class="text-[10px] flex items-center justify-center hover:bg-stone-200 px-2 py-1 rounded transition text-stone-600 font-bold uppercase tracking-widest border border-transparent hover:border-stone-300" title="Visibility Settings"><i class="fa-solid ${eyeIcon} sm:mr-1"></i> <span class="hidden sm:inline">${visLabel}</span></button>`;
                    } else {
                        visBtnHtml = `<span class="text-[10px] flex items-center justify-center px-2 py-1 rounded text-red-800/60 font-bold uppercase tracking-widest border border-transparent" title="Private task (DM & You)"><i class="fa-solid fa-user-secret sm:mr-1"></i> <span class="hidden sm:inline">Private</span></span>`;
                    }

                    controlsHtml = `
                        ${textDisplay}
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

                listHtml += `
                <div class="flex flex-col bg-white p-3 border border-stone-200 rounded-sm shadow-sm gap-2 mb-3">
                    <div class="flex items-start sm:items-center gap-3">
                        <div class="flex-shrink-0 text-base mt-0.5 sm:mt-0">${statusIcon}</div>
                        <span class="text-sm ${statusTextClass} break-words leading-tight">${item.text} ${authorTag}</span>
                    </div>
                    <div class="flex items-center justify-between w-full pt-2 border-t border-stone-100 mt-1 min-h-[28px]">
                        ${controlsHtml}
                    </div>
                </div>
                `;
            });
        }
        contentHtml = listHtml;
    } else {
        const activeCategory = state.activeQuestCategory || 'current';
        const quests = camp.quests || [];
        
        // Connect player registration helpers
        const activePlayerUIDs = camp.activePlayers || [];
        const playerNames = camp.playerNames || {};
        const connectedPlayers = activePlayerUIDs.filter(uid => uid !== camp.dmId);

        // FOG OF WAR FILTER: Restrict quests strictly based on metadata privacy
        const visibleQuests = quests.filter(q => {
            if (isDM) return true;
            const vis = q.visibility || { mode: 'public' };
            if (vis.mode === 'public') return true;
            if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
            return false;
        });

        const categoryFilters = [
            { id: 'current', label: 'Current Arc' },
            { id: 'general', label: 'General' },
            { id: 'personal', label: 'Personal' },
            { id: 'previous', label: 'Previous' }
        ];

        const categoryNav = `
        <div class="flex flex-wrap gap-1.5 mb-4 p-1 bg-stone-100 border border-stone-300 rounded-sm">
            ${categoryFilters.map(cat => {
                const count = visibleQuests.filter(q => q.category === cat.id && q.status === 'active').length;
                const countBadge = count > 0 ? `<span class="bg-red-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-1.5">${count}</span>` : '';
                return `
                <button onclick="window.switchQuestCategory('${cat.id}')" class="flex-1 min-w-[70px] py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-sm transition ${activeCategory === cat.id ? 'bg-white shadow-sm text-stone-900 border border-stone-300' : 'text-stone-500 hover:text-stone-800'}">
                    ${cat.label}${countBadge}
                </button>`;
            }).join('')}
        </div>
        `;

        const filteredQuests = visibleQuests.filter(q => q.category === activeCategory);
        let questListHtml = '';

        if (filteredQuests.length === 0) {
            questListHtml = `<div class="text-xs text-stone-500 italic py-8 text-center bg-white border border-[#d4c5a9] rounded-sm">No quests documented in this category.</div>`;
        } else {
            filteredQuests.forEach(q => {
                // If this quest is currently being edited, swap out the card for our inline edit form
                if (window.appData.editingQuestId === q.id) {
                    questListHtml += `
                    <div class="bg-[#fdfbf7] border-2 border-blue-500 rounded-sm p-4 shadow-md flex flex-col gap-3 animate-in mb-3 last:mb-0">
                        <h4 class="font-serif font-bold text-xs uppercase tracking-widest text-blue-900 border-b border-[#d4c5a9] pb-1.5 mb-2"><i class="fa-solid fa-pen-nib mr-1.5"></i> Edit Quest</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Quest Title</label>
                                <input type="text" id="edit-quest-name-${q.id}" value="${escapeHTML(q.name)}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none bg-white">
                            </div>
                            
                            <!-- Description Box Editor with formatting toolbar -->
                            <div>
                                <div class="flex justify-between items-end mb-1">
                                    <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider">Description</label>
                                    <div class="flex gap-1 bg-stone-200 p-0.5 rounded-sm border border-[#d4c5a9]">
                                        <button type="button" onclick="window.appActions.formatText('edit-quest-desc-${q.id}', 'bold')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm"><i class="fa-solid fa-bold"></i></button>
                                        <button type="button" onclick="window.appActions.formatText('edit-quest-desc-${q.id}', 'italic')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm"><i class="fa-solid fa-italic"></i></button>
                                        <button type="button" onclick="window.appActions.insertImagePlaceholder('edit-quest-desc-${q.id}')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                                    </div>
                                </div>
                                <textarea id="edit-quest-desc-${q.id}" oninput="window.appActions.handleSmartInput(this)" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white font-serif h-24 custom-scrollbar" placeholder="Scribe details, goals, background lore...">${escapeHTML(q.description || '')}</textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Quest Giver</label>
                                    <input type="text" id="edit-quest-giver-${q.id}" value="${escapeHTML(q.giver)}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Giver Location</label>
                                    <input type="text" id="edit-quest-giver-loc-${q.id}" value="${escapeHTML(q.giverLocation)}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Rewards</label>
                                <input type="text" id="edit-quest-rewards-${q.id}" value="${escapeHTML(q.rewards)}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white">
                            </div>
                            <div>
                                <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Important Clues</label>
                                <input type="text" id="edit-quest-clues-${q.id}" value="${escapeHTML(q.clues)}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white">
                            </div>
                            
                            <!-- Objectives Editor -->
                            <div>
                                <div class="flex justify-between items-center mb-1.5">
                                    <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider">Objectives</label>
                                    <button onclick="window.addEditObjectiveField('${q.id}')" class="text-[8px] font-bold uppercase text-blue-700 hover:text-blue-900 transition"><i class="fa-solid fa-plus-circle mr-1"></i> Add Step</button>
                                </div>
                                <div id="edit-quest-objectives-container-${q.id}" class="space-y-2">
                                    ${(q.objectives || []).map((obj, oIdx) => `
                                        <div class="flex gap-2 items-center edit-objective-row-${q.id} objective-input-row flex-row">
                                            <input type="text" class="edit-obj-input-text flex-grow p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white" value="${escapeHTML(obj.text)}" placeholder="Objective">
                                            <div class="flex items-center gap-1 shrink-0">
                                                <input type="number" class="edit-obj-input-current w-12 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" value="${obj.current || 0}" title="Current Progress" placeholder="Current">
                                                <span class="text-stone-400 text-xs">/</span>
                                                <input type="number" class="edit-obj-input-target w-12 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" value="${obj.target || 1}" title="Target Goal" placeholder="Target">
                                            </div>
                                            <button onclick="this.closest('.objective-input-row').remove()" class="text-stone-400 hover:text-red-700 transition p-1 shrink-0"><i class="fa-solid fa-trash text-[10px]"></i></button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Visibility Editor -->
                            <div>
                                <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Visibility</label>
                                <select id="edit-quest-vis-mode-${q.id}" onchange="window.toggleQuestVisPlayers(this.value, 'edit-quest-players-wrap-${q.id}')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none bg-white">
                                    <option value="public" ${q.visibility?.mode === 'public' || !q.visibility ? 'selected' : ''}>Public (All Players)</option>
                                    <option value="hidden" ${q.visibility?.mode === 'hidden' ? 'selected' : ''}>Hidden (DM Only)</option>
                                    <option value="specific" ${q.visibility?.mode === 'specific' ? 'selected' : ''}>Shared (Specific Players...)</option>
                                </select>
                                <div id="edit-quest-players-wrap-${q.id}" class="${q.visibility?.mode === 'specific' ? '' : 'hidden'} mt-2 p-2 bg-stone-100 border border-stone-200 rounded-sm">
                                    <label class="block text-[8px] uppercase font-bold text-stone-400 mb-1">Select Players</label>
                                    <div class="space-y-1">
                                        ${connectedPlayers.map(uid => {
                                            const isChecked = q.visibility?.visibleTo?.includes(uid) ? 'checked' : '';
                                            return `
                                            <label class="flex items-center gap-1.5 text-[10px] text-stone-700 cursor-pointer">
                                                <input type="checkbox" value="${uid}" ${isChecked} class="edit-quest-player-cb-${q.id} w-3.5 h-3.5 text-amber-600 rounded">
                                                <span>${escapeHTML(playerNames[uid])}</span>
                                            </label>`;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-2 pt-3 border-t border-[#d4c5a9]">
                            <button onclick="window.cancelEditQuest()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                            <button onclick="window.saveEditQuest('${q.id}')" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[8px] shadow-sm"><i class="fa-solid fa-floppy-disk mr-1"></i> Update Quest</button>
                        </div>
                    </div>`;
                    return;
                }

                const statusColors = {
                    active: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                    completed: 'bg-blue-100 border-blue-300 text-blue-800 line-through',
                    failed: 'bg-red-100 border-red-300 text-red-800'
                };

                const statusBadges = `
                <span class="text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border shadow-sm ${statusColors[q.status || 'active']}">
                    ${q.status || 'active'}
                </span>
                `;

                // Display small visual tag representing the visibility state
                const visMode = q.visibility?.mode || 'public';
                let visBadge = '';
                if (isDM) {
                    if (visMode === 'hidden') visBadge = `<span class="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border bg-red-50 border-red-200 text-red-800 mr-1"><i class="fa-solid fa-eye-slash mr-1"></i> Hidden</span>`;
                    else if (visMode === 'specific') visBadge = `<span class="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-800 mr-1"><i class="fa-solid fa-user-lock mr-1"></i> Shared</span>`;
                }

                let objectivesHtml = '';
                if (q.objectives && q.objectives.length > 0) {
                    objectivesHtml = `<div class="space-y-2.5 mt-2 bg-stone-100/50 p-2.5 rounded border border-stone-200 shadow-inner">`;
                    q.objectives.forEach((obj, idx) => {
                        const isProgress = parseInt(obj.target) > 1;
                        const percent = isProgress ? Math.min(100, Math.max(0, (parseInt(obj.current) / parseInt(obj.target)) * 100)) : 0;
                        const isComplete = isProgress ? (parseInt(obj.current) >= parseInt(obj.target)) : obj.completed === true;

                        let trackerHtml = '';
                        if (isProgress) {
                            trackerHtml = `
                            <div class="flex items-center gap-2 mt-1.5 shrink-0 select-none" onclick="event.stopPropagation()">
                                <button onclick="window.updateQuestProgress('${q.id}', ${idx}, -1)" class="w-5 h-5 bg-stone-200 border border-stone-300 hover:bg-stone-300 text-stone-700 font-bold rounded flex items-center justify-center transition shadow-sm active:scale-90"><i class="fa-solid fa-minus text-[8px]"></i></button>
                                <span class="text-[10px] font-mono font-bold text-stone-800 bg-white border border-stone-300 px-2 py-0.5 rounded shadow-inner min-w-[34px] text-center">${obj.current} / ${obj.target}</span>
                                <button onclick="window.updateQuestProgress('${q.id}', ${idx}, 1)" class="w-5 h-5 bg-stone-200 border border-stone-300 hover:bg-stone-300 text-stone-700 font-bold rounded flex items-center justify-center transition shadow-sm active:scale-95"><i class="fa-solid fa-plus text-[8px]"></i></button>
                            </div>
                            `;
                        } else {
                            trackerHtml = `
                            <button onclick="window.updateQuestProgress('${q.id}', ${idx}, ${isComplete ? 0 : 1})" class="shrink-0 flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${isComplete ? 'bg-emerald-500 border-emerald-600 text-white shadow-inner' : 'bg-white border-stone-300 shadow-sm'}" onclick="event.stopPropagation()">
                                ${isComplete ? '<i class="fa-solid fa-check text-[9px]"></i>' : ''}
                            </button>
                            `;
                        }

                        objectivesHtml += `
                        <div class="flex flex-col gap-1.5 border-b border-stone-200/50 last:border-0 pb-2 last:pb-0">
                            <div class="flex items-start justify-between gap-3">
                                <span class="text-xs font-serif ${isComplete ? 'text-stone-400 line-through' : 'text-stone-800 font-bold'}">${obj.text}</span>
                                ${trackerHtml}
                            </div>
                            ${isProgress ? `
                            <div class="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden shadow-inner border border-stone-300/30">
                                <div class="h-full bg-emerald-500 transition-all duration-300 shadow-sm" style="width: ${percent}%"></div>
                            </div>` : ''}
                        </div>`;
                    });
                    objectivesHtml += `</div>`;
                }

                // Expandable Details Section
                const isExpanded = window.appData.expandedQuestIds?.has(q.id);
                const collapsibleDetailHtml = isExpanded ? `
                <div class="mt-3 pt-3 border-t border-stone-200 space-y-3 animate-in">
                    <!-- Description -->
                    <div>
                        <span class="block text-[9px] uppercase font-bold text-stone-400 mb-1 tracking-wider"><i class="fa-solid fa-align-left text-amber-600/60 mr-1"></i> Description</span>
                        <div class="text-xs text-stone-700 font-serif leading-relaxed bg-[#fdfbf7] p-2.5 rounded border border-stone-200/50 shadow-inner">
                            ${window.appActions.parseSmartText(q.description || 'No description provided.')}
                        </div>
                    </div>
                    
                    <!-- Rewards & Clues (Moved inside expansion!) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-stone-700">
                        ${q.rewards ? `<div class="bg-[#fdfbf7] p-2 rounded border border-amber-600/10"><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px] mb-0.5"><i class="fa-solid fa-gift text-amber-500 mr-1"></i>Rewards</span>${q.rewards}</div>` : ''}
                        ${q.clues ? `<div class="bg-[#fdfbf7] p-2 rounded border border-amber-600/10"><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px] mb-0.5"><i class="fa-solid fa-key text-amber-500 mr-1"></i>Clues & Info</span>${q.clues}</div>` : ''}
                    </div>
                </div>
                ` : '';

                questListHtml += `
                <div class="bg-white border border-[#d4c5a9] rounded-sm p-4 shadow-sm flex flex-col gap-3 hover:border-amber-400 transition-colors relative group mb-3 last:mb-0 animate-in">
                    <div class="flex justify-between items-start border-b border-stone-200 pb-2 gap-2">
                        <div class="min-w-0 flex-grow cursor-pointer select-none hover:opacity-80 transition-opacity flex gap-2 items-start" onclick="window.toggleQuestExpand('${q.id}')">
                            <i class="fa-solid fa-chevron-down mt-1 text-stone-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}"></i>
                            <div class="min-w-0">
                                <h4 class="font-serif font-bold text-sm sm:text-base text-stone-900 leading-tight">${q.name}</h4>
                                <span class="text-[9px] text-stone-400 font-bold block mt-1"><i class="fa-solid fa-user-circle mr-1"></i>From: ${q.giver || 'Unspecified'} (${q.giverLocation || 'Unspecified'})</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 select-none" onclick="event.stopPropagation()">
                            ${visBadge}
                            ${statusBadges}
                            ${isDM ? `
                                <div class="w-px h-4 bg-stone-300"></div>
                                <button onclick="window.startEditQuest('${q.id}')" class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-blue-700 rounded transition hover:bg-stone-50" title="Edit Quest"><i class="fa-solid fa-pen text-xs"></i></button>
                                <button onclick="window.deleteQuest('${q.id}')" class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-red-700 rounded transition hover:bg-stone-50" title="Delete Quest"><i class="fa-solid fa-trash text-xs"></i></button>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${objectivesHtml}
                    ${collapsibleDetailHtml}

                    ${isDM ? `
                    <div class="flex gap-1.5 pt-2 border-t border-stone-200 justify-end select-none" onclick="event.stopPropagation()">
                        <button onclick="window.toggleQuestStatus('${q.id}', 'active')" class="px-2 py-1 rounded border text-[8px] font-bold uppercase tracking-wider bg-emerald-50 border-emerald-200 text-emerald-800">Active</button>
                        <button onclick="window.toggleQuestStatus('${q.id}', 'completed')" class="px-2 py-1 rounded border text-[8px] font-bold uppercase tracking-wider bg-blue-50 border-blue-200 text-blue-800">Complete</button>
                        <button onclick="window.toggleQuestStatus('${q.id}', 'failed')" class="px-2 py-1 rounded border text-[8px] font-bold uppercase tracking-wider bg-red-50 border-red-200 text-red-800">Failed</button>
                    </div>
                    ` : ''}
                </div>`;
            });
        }

        let dmCreatorHtml = '';
        if (isDM) {
            dmCreatorHtml = `
            <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm p-3.5 shadow-sm mt-5">
                <button onclick="document.getElementById('dm-quest-creator-form').classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180')" class="w-full flex justify-between items-center text-[10px] font-bold text-amber-900 uppercase tracking-widest outline-none">
                    <span><i class="fa-solid fa-plus-circle mr-1 text-amber-600 transition-transform"></i> Scribe New Quest (DM)</span>
                    <i class="fa-solid fa-chevron-down text-amber-600"></i>
                </button>
                <div id="dm-quest-creator-form" class="hidden space-y-3.5 mt-4 border-t border-[#d4c5a9] pt-4 animate-in">
                    <div>
                        <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Quest Title</label>
                        <input type="text" id="new-quest-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none bg-white focus:border-amber-600" placeholder="e.g. Cleansing the Grotto...">
                    </div>

                    <!-- Description Scribe Form field with Toolbar -->
                    <div>
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider">Description</label>
                            <div class="flex gap-1 bg-stone-200 p-0.5 rounded-sm border border-[#d4c5a9]">
                                <button type="button" onclick="window.appActions.formatText('new-quest-desc', 'bold')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('new-quest-desc', 'italic')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.insertImagePlaceholder('new-quest-desc')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                            </div>
                        </div>
                        <textarea id="new-quest-desc" oninput="window.appActions.handleSmartInput(this)" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white font-serif h-24 custom-scrollbar" placeholder="Scribe details, goals, background lore..."></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Quest Giver</label>
                            <input type="text" id="new-quest-giver" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white" placeholder="e.g. Gundren Rockseeker">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Giver Location</label>
                            <input type="text" id="new-quest-giver-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white" placeholder="e.g. Phandalin">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Rewards</label>
                        <input type="text" id="new-quest-rewards" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white" placeholder="e.g. 50 gp, 1 Potion of Healing...">
                    </div>

                    <div>
                        <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Important Clues & Riddles</label>
                        <input type="text" id="new-quest-clues" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none bg-white" placeholder="e.g. Passphrase is 'Moonlight'...">
                    </div>

                    <!-- Objectives Generator -->
                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider">Objectives</label>
                            <button onclick="window.addQuestObjectiveField()" class="text-[8px] font-bold uppercase text-blue-700 hover:text-blue-900 transition"><i class="fa-solid fa-plus-circle mr-1"></i> Add Step</button>
                        </div>
                        <div id="new-quest-objectives-container" class="space-y-2">
                            <div class="flex gap-2 items-center objective-input-row">
                                <input type="text" class="obj-input-text flex-grow p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white" placeholder="Objective (e.g. Find key)">
                                <input type="number" class="obj-input-target w-16 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" placeholder="Qty" value="1" min="1">
                            </div>
                        </div>
                    </div>

                    <!-- Visibility Configurator -->
                    <div>
                        <label class="block text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-1">Visibility</label>
                        <select id="new-quest-vis-mode" onchange="window.toggleQuestVisPlayers(this.value, 'new-quest-players-wrap')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none bg-white">
                            <option value="public" selected>Public (All Players)</option>
                            <option value="hidden">Hidden (DM Only)</option>
                            <option value="specific">Shared (Specific Players...)</option>
                        </select>
                        <div id="new-quest-players-wrap" class="hidden mt-2 p-2 bg-stone-100 border border-stone-200 rounded-sm">
                            <label class="block text-[8px] uppercase font-bold text-stone-400 mb-1">Select Players</label>
                            <div class="space-y-1">
                                ${connectedPlayers.map(uid => `
                                    <label class="flex items-center gap-1.5 text-[10px] text-stone-700 cursor-pointer">
                                        <input type="checkbox" value="${uid}" class="new-quest-player-cb w-3.5 h-3.5 text-amber-600 rounded">
                                        <span>${escapeHTML(playerNames[uid])}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end pt-2">
                        <button onclick="window.saveQuest()" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm"><i class="fa-solid fa-scroll mr-1.5"></i> Forge Quest</button>
                    </div>
                </div>
            </div>
            `;
        }

        contentHtml = categoryNav + questListHtml + dmCreatorHtml;
    }

    container.innerHTML = tabNav + contentHtml;
}

export function renderApp(state) {
    const container = document.getElementById('app-container');
    if (!container) return;

    if (state.currentView !== 'atlas') {
        container.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (state.currentView === 'atlas' && document.getElementById('atlas-wrapper')) {
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
        case 'databases': html = getDatabasesHTML(state); break;
        case 'storefront': html = getStorefrontHTML(state); break;
        case 'shop-backroom': html = getShopBackroomHTML(state); break;
        case 'calendar': html = getCalendarHTML(state); break;
        case 'rules': html = getRulesHTML(state); break;
        case 'tables': html = getTablesHTML(state); break;
        case 'webs': html = getWebsHTML(state); break; 
        case 'atlas': html = getAtlasHTML(state); break; 
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

if (typeof window !== 'undefined') {
    window.appData = window.appData || {};
    window.appData.expandedQuestIds = window.appData.expandedQuestIds || new Set();
    window.appActions = window.appActions || {};

    // Bind navigation
    window.appActions.navigateBack = navigateBack;
    window.appActions.toggleActionMenu = toggleActionMenu;
    
    // Direct global handlers bypassing data.js override issues
    window.switchChecklistTab = (tab) => {
        window.appData.activeChecklistTab = tab;
        reRender(true);
    };

    window.toggleQuestExpand = (questId) => {
        if (window.appData.expandedQuestIds.has(questId)) {
            window.appData.expandedQuestIds.delete(questId);
        } else {
            window.appData.expandedQuestIds.add(questId);
        }
        reRender(true);
    };

    window.switchQuestCategory = (questId) => {
        window.appData.activeQuestCategory = questId;
        reRender(true);
    };

    window.addQuestObjectiveField = () => {
        const container = document.getElementById('new-quest-objectives-container');
        if (!container) return;
        const html = `
        <div class="flex gap-2 items-center objective-input-row animate-in flex-row">
            <input type="text" class="obj-input-text flex-grow p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white" placeholder="Objective (e.g. Find key)">
            <input type="number" class="obj-input-target w-16 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" placeholder="Qty" value="1" min="1">
            <button onclick="this.closest('.objective-input-row').remove()" class="text-stone-400 hover:text-red-700 transition p-1 shrink-0"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    };

    window.toggleQuestVisPlayers = (value, elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            if (value === 'specific') el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    };

    window.startEditQuest = (questId) => {
        window.appData.editingQuestId = questId;
        reRender(true);
    };

    window.cancelEditQuest = () => {
        window.appData.editingQuestId = null;
        reRender(true);
    };

    window.addEditObjectiveField = (questId) => {
        const container = document.getElementById(`edit-quest-objectives-container-${questId}`);
        if (!container) return;
        const html = `
        <div class="flex gap-2 items-center edit-objective-row-${questId} objective-input-row animate-in flex-row">
            <input type="text" class="edit-obj-input-text flex-grow p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white" placeholder="Objective">
            <div class="flex items-center gap-1 shrink-0">
                <input type="number" class="edit-obj-input-current w-12 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" value="0" placeholder="Current">
                <span class="text-stone-400 text-xs">/</span>
                <input type="number" class="edit-obj-input-target w-12 p-1.5 border border-[#d4c5a9] rounded text-[11px] text-stone-900 outline-none bg-white text-center" value="1" placeholder="Target">
            </div>
            <button onclick="this.closest('.objective-input-row').remove()" class="text-stone-400 hover:text-red-700 transition p-1 shrink-0"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    };

    window.saveEditQuest = async (questId) => {
        const name = document.getElementById(`edit-quest-name-${questId}`).value.trim();
        const description = document.getElementById(`edit-quest-desc-${questId}`).value.trim();
        const giver = document.getElementById(`edit-quest-giver-${questId}`).value.trim();
        const giverLoc = document.getElementById(`edit-quest-giver-loc-${questId}`).value.trim();
        const rewards = document.getElementById(`edit-quest-rewards-${questId}`).value.trim();
        const clues = document.getElementById(`edit-quest-clues-${questId}`).value.trim();
        const visMode = document.getElementById(`edit-quest-vis-mode-${questId}`).value;

        const visibleTo = [];
        if (visMode === 'specific') {
            document.querySelectorAll(`.edit-quest-player-cb-${questId}:checked`).forEach(cb => {
                visibleTo.push(cb.value);
            });
        }

        const objectives = [];
        document.querySelectorAll(`.edit-objective-row-${questId}`).forEach(row => {
            const text = row.querySelector('.edit-obj-input-text').value.trim();
            const target = parseInt(row.querySelector('.edit-obj-input-target').value) || 1;
            const current = parseInt(row.querySelector('.edit-obj-input-current').value) || 0;
            const completed = current >= target;
            if (text) {
                objectives.push({ text, current, target, completed });
            }
        });

        const camp = window.appData.activeCampaign;
        if (!camp) return;

        camp.quests = (camp.quests || []).map(q => {
            if (q.id === questId) {
                return {
                    ...q,
                    name,
                    description,
                    giver,
                    giverLocation: giverLoc,
                    rewards,
                    clues,
                    objectives,
                    visibility: { mode: visMode, visibleTo }
                };
            }
            return q;
        });

        await saveCampaign(camp);
        window.appData.editingQuestId = null;
        notify("Quest updated successfully.", "success");
        reRender(true);
    };

    window.saveQuest = async () => {
        const nameIn = document.getElementById('new-quest-name');
        const descIn = document.getElementById('new-quest-desc');
        const giverIn = document.getElementById('new-quest-giver');
        const giverLocIn = document.getElementById('new-quest-giver-loc');
        const rewardsIn = document.getElementById('new-quest-rewards');
        const cluesIn = document.getElementById('new-quest-clues');
        const visMode = document.getElementById('new-quest-vis-mode').value;

        if (!nameIn || !nameIn.value.trim()) {
            notify("Quest title cannot be empty.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const visibleTo = [];
        if (visMode === 'specific') {
            document.querySelectorAll('.new-quest-player-cb:checked').forEach(cb => {
                visibleTo.push(cb.value);
            });
        }

        // Parse objectives
        const objectives = [];
        document.querySelectorAll('.objective-input-row').forEach(row => {
            const text = row.querySelector('.obj-input-text').value.trim();
            const target = parseInt(row.querySelector('.obj-input-target').value) || 1;
            if (text) {
                objectives.push({
                    text,
                    current: 0,
                    target,
                    completed: false
                });
            }
        });

        const newQuest = {
            id: 'quest_' + generateId(),
            name: nameIn.value.trim(),
            description: descIn ? descIn.value.trim() : '',
            giver: giverIn ? giverIn.value.trim() : '',
            giverLocation: giverLocIn ? giverLocIn.value.trim() : '',
            rewards: rewardsIn ? rewardsIn.value.trim() : '',
            clues: cluesIn ? cluesIn.value.trim() : '',
            category: window.appData.activeQuestCategory || 'current',
            status: 'active',
            objectives,
            visibility: { mode: visMode, visibleTo }
        };

        camp.quests = [...(camp.quests || []), newQuest];
        await saveCampaign(camp);

        notify(`Quest '${newQuest.name}' created!`, "success");
        reRender(true);
    };

    window.updateQuestProgress = async (questId, objIdx, delta) => {
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const quest = (camp.quests || []).find(q => q.id === questId);
        if (!quest || !quest.objectives || !quest.objectives[objIdx]) return;

        const obj = quest.objectives[objIdx];
        const isProgress = parseInt(obj.target) > 1;

        if (isProgress) {
            obj.current = Math.min(parseInt(obj.target), Math.max(0, parseInt(obj.current) + delta));
            if (obj.current >= parseInt(obj.target)) {
                obj.completed = true;
            } else {
                obj.completed = false;
            }
        } else {
            obj.completed = delta > 0;
            obj.current = obj.completed ? 1 : 0;
        }

        // Auto-complete check: If all objectives are completed, optionally tag quest as completed
        const allDone = quest.objectives.every(o => o.completed);
        if (allDone && quest.status === 'active') {
            quest.status = 'completed';
            notify(`Quest '${quest.name}' completed!`, "success");
        }

        await saveCampaign(camp);
        reRender(true);
    };

    window.toggleQuestStatus = async (questId, status) => {
        const camp = window.appData.activeCampaign;
        if (!camp) return;

        const quest = (camp.quests || []).find(q => q.id === questId);
        if (!quest) return;

        quest.status = status;
        await saveCampaign(camp);

        notify(`Quest status updated to: ${status}`, "info");
        reRender(true);
    };

    window.deleteQuest = async (questId) => {
        if (!confirm("Permanently erase this quest record?")) return;

        const camp = window.appData.activeCampaign;
        if (!camp) return;

        camp.quests = (camp.quests || []).filter(q => q.id !== questId);
        await saveCampaign(camp);

        notify("Quest erased from log.", "success");
        reRender(true);
    };

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
}
