import { getHomeHTML, getCampaignHTML, getAdventureHTML, getAdvRosterHTML } from './ui-campaign.js';
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

// --- GLOBAL HEADER NAVIGATION VISIBILITY ---
export function updateHeaderUI(state) {
    const camp = state.activeCampaign;
    const calBtn = document.getElementById('header-calendar-btn');
    const rulesBtn = document.getElementById('header-rules-btn');

    if (!camp || state.currentView === 'home') {
        if (calBtn) calBtn.classList.add('hidden');
        if (rulesBtn) rulesBtn.classList.add('hidden');
    } else {
        if (calBtn) calBtn.classList.remove('hidden');
        if (rulesBtn) rulesBtn.classList.remove('hidden');
    }
}

// --- GLOBAL CHECKLIST GENERATOR (MODAL UI) ---
export function updateChecklistUI(state) {
    const btn = document.getElementById('header-checklist-btn');
    const badge = document.getElementById('header-checklist-badge');
    const container = document.getElementById('checklist-content-container');
    
    if (!btn || !badge || !container) return;

    const camp = state.activeCampaign;
    if (!camp || state.currentView === 'home') {
        btn.classList.add('hidden');
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

    // Hide button for players if no tasks
    if (!isDM && visibleUpdates.length === 0) {
        btn.classList.add('hidden');
        return;
    }
    
    btn.classList.remove('hidden');

    // Badge logic for players
    if (!isDM) {
        const pendingCount = visibleUpdates.filter(u => !(u.resolvedBy || []).includes(myUid)).length;
        if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } else {
        badge.classList.add('hidden'); // DM doesn't need the red pulse badge
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

    renderBreadcrumbs(state);

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
        default: html = `<div class="text-center text-red-500">Unknown View: ${state.currentView}</div>`;
    }

    container.innerHTML = html;

    // Post-render UI adjustments
    updateHeaderUI(state);
    updateChecklistUI(state);

    if (state.currentView === 'session-edit') {
        updateSessionTabUI('session');
        
        // Ensure the budget UI initializes its values immediately upon loading the editor
        if (window.appActions && window.appActions.updateSessionBudget) {
            window.appActions.updateSessionBudget();
        }
    }
}

// --- BREADCRUMBS ---
export function renderBreadcrumbs(state) {
    const container = document.getElementById('breadcrumbs-container');
    if (!container) return;

    let html = `<div class="flex items-center text-[10px] sm:text-sm text-amber-200/60 mb-4 sm:mb-6 bg-stone-900 border border-stone-800 p-2 sm:p-3 rounded font-sans shadow-md overflow-x-auto whitespace-nowrap hide-scrollbar">`;

    html += `
        <button onclick="window.appActions.setView('home')" class="hover:text-amber-400 flex items-center uppercase tracking-wider font-bold transition flex-shrink-0">
            <i class="fa-solid fa-book mr-1 sm:mr-2"></i> Library
        </button>
    `;

    if (state.activeCampaign) {
        html += `
            <i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>
            <button onclick="window.appActions.setView('campaign')" class="hover:text-amber-400 uppercase tracking-wider font-bold truncate max-w-[100px] sm:max-w-xs transition flex-shrink-0 ${state.currentView === 'campaign' ? 'text-amber-500' : ''}">
                ${state.activeCampaign.name}
            </button>
        `;
    }

    if ((state.activeAdventure || state.currentView === 'pc-manager' || state.currentView === 'pc-edit' || state.currentView === 'codex' || state.currentView === 'adv-roster' || state.currentView === 'calendar' || state.currentView === 'rules') && state.activeCampaign && state.currentView !== 'campaign') {
        html += `<i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>`;
        if (state.currentView === 'pc-manager' || state.currentView === 'pc-edit') {
            html += `<button onclick="window.appActions.setView('pc-manager')" class="hover:text-amber-400 uppercase tracking-wider font-bold transition flex-shrink-0 ${state.currentView === 'pc-manager' ? 'text-amber-500' : ''}">Party Manifest</button>`;
        } else if (state.currentView === 'codex') {
            html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">Campaign Codex</span>`;
        } else if (state.currentView === 'calendar') {
            html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">Chronicle</span>`;
        } else if (state.currentView === 'rules') {
            html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">Rules Glossary</span>`;
        } else {
            html += `
                <button onclick="window.appActions.setView('adventure')" class="hover:text-amber-400 uppercase tracking-wider font-bold truncate max-w-[100px] sm:max-w-xs transition flex-shrink-0 ${state.currentView === 'adventure' ? 'text-amber-500' : ''}">
                    ${state.activeAdventure?.name || 'Adventure'}
                </button>
            `;
        }
    }

    if (state.currentView === 'session-edit' || state.currentView === 'journal' || state.currentView === 'pc-edit' || state.currentView === 'adv-roster') {
        html += `<i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>`;
        html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">`;
        if (state.currentView === 'session-edit') {
            html += state.activeSessionId ? 'Amend Record' : 'New Record';
        } else if (state.currentView === 'journal') {
            html += state.activeSessionId ? 'Session Scroll' : (state.activeAdventureId ? 'Arc Scroll' : 'Campaign Tome');
        } else if (state.currentView === 'pc-edit') {
            html += state.activePcId ? 'Edit Hero' : 'New Hero';
        } else if (state.currentView === 'adv-roster') {
            html += 'Arc Roster';
        }
        html += `</span>`;
    }

    html += `</div>`;
    container.innerHTML = html;
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
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll('.codex-card');
    cards.forEach(card => {
        const searchData = card.getAttribute('data-search');
        if (searchData.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};
