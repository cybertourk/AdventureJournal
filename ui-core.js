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
        default: html = `<div class="text-center text-red-500">Unknown View: ${state.currentView}</div>`;
    }

    container.innerHTML = html;

    // Post-render UI adjustments
    if (state.currentView === 'session-edit') {
        updateSessionTabUI('session');
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

    if ((state.activeAdventure || state.currentView === 'pc-manager' || state.currentView === 'pc-edit' || state.currentView === 'codex' || state.currentView === 'adv-roster') && state.activeCampaign && state.currentView !== 'campaign') {
        html += `<i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>`;
        if (state.currentView === 'pc-manager' || state.currentView === 'pc-edit') {
            html += `<button onclick="window.appActions.setView('pc-manager')" class="hover:text-amber-400 uppercase tracking-wider font-bold transition flex-shrink-0 ${state.currentView === 'pc-manager' ? 'text-amber-500' : ''}">Party Manifest</button>`;
        } else if (state.currentView === 'codex') {
            html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">Campaign Codex</span>`;
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

// --- VIEW GENERATORS ---

function getHomeHTML(state) {
    const hostedCampaigns = state.campaigns.filter(c => c._isDM);
    const playedCampaigns = state.campaigns.filter(c => c._isPlayer && !c._isDM);

    let html = `<div class="animate-in fade-in duration-300">`;

    // --- SECTION 1: DM CAMPAIGNS ---
    html += `
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-amber-500 mb-4 sm:mb-6 border-b-2 border-stone-800 pb-2 sm:pb-3 flex items-center">
            Tomes You Scribe
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
    `;

    if (hostedCampaigns.length === 0) {
        html += `<div class="col-span-full text-stone-500 italic mb-4">You are not currently hosting any campaigns.</div>`;
    }

    hostedCampaigns.forEach(camp => {
        const totalSessions = camp.adventures ? camp.adventures.reduce((sum, adv) => sum + adv.sessions.length, 0) : 0;
        const advCount = camp.adventures ? camp.adventures.length : 0;
        const pcCount = camp.playerCharacters ? camp.playerCharacters.length : 0;

        html += `
            <div class="bg-[#f4ebd8] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-[2px_2px_8px_rgba(0,0,0,0.4)] flex flex-col justify-between group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-red-900"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-900 truncate" title="${camp.name}">${camp.name}</h3>
                    <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-600 mt-2">
                        ${advCount} Adventures <span class="mx-1">•</span> ${pcCount} Heroes
                    </p>
                    <p class="text-xs sm:text-sm text-stone-700 italic mt-1">${totalSessions} total sessions recorded</p>
                    
                    <button onclick="window.appActions.copyCampaignId('${camp.id}', this)" class="mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-amber-600 transition flex items-center bg-white border border-[#d4c5a9] px-2 py-1 rounded-sm shadow-sm w-max" title="Copy ID to share with players">
                        <i class="fa-solid fa-copy mr-1.5"></i> Copy Invite ID
                    </button>
                </div>
                <div class="flex justify-between items-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#d4c5a9]/50 pl-2">
                    <button onclick="window.appActions.openCampaign('${camp.id}')" class="text-red-900 hover:text-red-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition py-1 sm:py-0">
                        Open DM Dashboard <i class="fa-solid fa-arrow-left ml-2 rotate-180"></i>
                    </button>
                    <button onclick="window.appActions.deleteCampaign('${camp.id}')" class="text-stone-400 hover:text-red-800 p-2 sm:p-1 rounded transition" title="Burn Tome (Delete Campaign)">
                        <i class="fa-solid fa-skull w-4 h-4 sm:w-5 sm:h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            <button id="new-camp-btn" onclick="window.appActions.toggleNewCampaignForm()" class="border-2 border-dashed border-stone-700 rounded-sm p-4 sm:p-5 flex flex-col items-center justify-center text-stone-500 hover:text-amber-500 hover:border-amber-600 hover:bg-stone-800/50 transition min-h-[120px] sm:min-h-[160px]">
                <i class="fa-solid fa-plus w-6 h-6 sm:w-8 sm:h-8 mb-2"></i>
                <span class="font-bold uppercase tracking-wider text-xs sm:text-sm">Forge New Campaign</span>
            </button>
            
            <div id="new-camp-form" class="hidden border border-stone-600 bg-stone-800 rounded-sm p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[160px] shadow-lg">
                <input type="text" id="new-camp-name" placeholder="Campaign Title..." class="w-full p-2 bg-[#f4ebd8] text-stone-900 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-red-900 mb-3 sm:mb-4 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500 text-sm sm:text-base" onkeydown="if(event.key === 'Enter') window.appActions.createCampaign()">
                <div class="flex justify-end gap-2 mt-auto">
                    <button onclick="window.appActions.toggleNewCampaignForm()" class="px-3 py-1.5 text-stone-400 hover:text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition">Cancel</button>
                    <button onclick="window.appActions.createCampaign()" class="px-4 py-1.5 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md transition">Create</button>
                </div>
            </div>
        </div>
    `;

    // --- SECTION 2: PLAYER CAMPAIGNS ---
    html += `
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-blue-500 mb-4 sm:mb-6 border-b-2 border-stone-800 pb-2 sm:pb-3 flex items-center">
            Tomes You Play
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
    `;

    playedCampaigns.forEach(camp => {
        const totalSessions = camp.adventures ? camp.adventures.reduce((sum, adv) => sum + adv.sessions.length, 0) : 0;
        const pcCount = camp.playerCharacters ? camp.playerCharacters.length : 0;

        html += `
            <div class="bg-stone-900 p-4 sm:p-5 rounded-sm border border-stone-700 shadow-[2px_2px_8px_rgba(0,0,0,0.4)] flex flex-col justify-between group relative overflow-hidden hover:border-blue-900 transition-colors">
                <div class="absolute top-0 left-0 w-1 h-full bg-blue-900"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-200 truncate" title="${camp.name}">${camp.name}</h3>
                    <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 mt-2">
                        ${pcCount} Heroes in Party
                    </p>
                    <p class="text-xs sm:text-sm text-stone-400 italic mt-1">${totalSessions} total sessions recorded</p>
                </div>
                <div class="flex justify-between items-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-800 pl-2">
                    <button onclick="window.appActions.openCampaign('${camp.id}')" class="text-blue-500 hover:text-blue-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition py-1 sm:py-0">
                        Open Player Dashboard <i class="fa-solid fa-arrow-left ml-2 rotate-180"></i>
                    </button>
                    <button class="text-stone-600 hover:text-red-500 p-2 sm:p-1 rounded transition" title="Leave Campaign">
                        <i class="fa-solid fa-door-open w-4 h-4 sm:w-5 sm:h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            <button id="join-camp-btn" onclick="window.appActions.toggleJoinCampaignForm()" class="border-2 border-dashed border-stone-700 rounded-sm p-4 sm:p-5 flex flex-col items-center justify-center text-stone-500 hover:text-blue-500 hover:border-blue-900 hover:bg-stone-800/50 transition min-h-[120px] sm:min-h-[160px]">
                <i class="fa-solid fa-link w-6 h-6 sm:w-8 sm:h-8 mb-2"></i>
                <span class="font-bold uppercase tracking-wider text-xs sm:text-sm">Join By ID</span>
            </button>
            
            <div id="join-camp-form" class="hidden border border-stone-600 bg-stone-800 rounded-sm p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[160px] shadow-lg">
                <input type="text" id="join-camp-id" placeholder="Paste Invite ID here..." class="w-full p-2 bg-stone-900 text-amber-50 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-900 mb-3 sm:mb-4 font-mono font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500 text-sm sm:text-base text-center tracking-widest" onkeydown="if(event.key === 'Enter') window.appActions.joinCampaign()">
                <div class="flex justify-end gap-2 mt-auto">
                    <button onclick="window.appActions.toggleJoinCampaignForm()" class="px-3 py-1.5 text-stone-400 hover:text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition">Cancel</button>
                    <button onclick="window.appActions.joinCampaign()" class="px-4 py-1.5 bg-blue-900 text-amber-50 rounded-sm hover:bg-blue-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md transition">Join</button>
                </div>
            </div>
        </div>
    </div>
    `;

    return html;
}

function getCampaignHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const totalCampLoot = camp.adventures ? camp.adventures.reduce((sum, a) => sum + a.totalLootGP, 0) : 0;
    const advCount = camp.adventures ? camp.adventures.length : 0;
    const pcCount = camp.playerCharacters ? camp.playerCharacters.length : 0;
    const codexCount = camp.codex ? camp.codex.length : 0;

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">${camp.name}</h2>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-400 text-xs sm:text-sm font-sans mt-2">
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${advCount} Adventures</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${pcCount} Heroes</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${codexCount} Codex Entries</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">${totalCampLoot.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Total</span>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.setView('codex')" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-stone-800 text-amber-500 border border-stone-600 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-book-journal-whills mr-1 sm:mr-2"></i> Codex
                </button>
                <button onclick="window.appActions.setView('pc-manager')" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-stone-800 text-amber-500 border border-stone-600 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid ${isDM ? 'fa-users' : 'fa-users-viewfinder'} mr-1 sm:mr-2"></i> ${isDM ? 'Manage Party' : 'View Party'}
                </button>
                <button onclick="window.appActions.openJournal('campaign')" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-[#f4ebd8] text-stone-900 border border-[#d4c5a9] rounded-sm hover:bg-[#e8dec7] transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md" title="Read full campaign tome">
                    <i class="fa-solid fa-book mr-1 sm:mr-2 text-stone-700"></i> Grand Tome
                </button>
            </div>
        </div>

        <h3 class="text-lg sm:text-xl font-serif font-bold text-amber-400 mb-3 sm:mb-4 flex items-center">
            <i class="fa-solid fa-map-location-dot mr-2"></i> Adventures in this Campaign
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
    `;

    if (camp.adventures) {
        camp.adventures.forEach(adv => {
            html += `
            <div class="bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between group relative overflow-hidden hover:shadow-md transition">
                <div class="absolute top-0 left-0 w-1 h-full bg-stone-500"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-base sm:text-lg text-stone-900 truncate" title="${adv.name}">${adv.name}</h3>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-1 sm:mt-2">
                        Lvl ${adv.startLevel}-${adv.endLevel} <span class="mx-1">•</span> ${adv.numPlayers} Players <span class="mx-1">•</span> ${adv.totalLootGP.toLocaleString()} gp
                    </p>
                    <p class="text-xs sm:text-sm text-stone-700 italic mt-1">${adv.sessions ? adv.sessions.length : 0} sessions logged</p>
                </div>
                <div class="flex justify-between items-center mt-4 sm:mt-5 pt-2 sm:pt-3 border-t border-[#d4c5a9]/50 pl-2">
                    <button onclick="window.appActions.openAdventure('${adv.id}')" class="text-stone-700 hover:text-stone-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition py-1">
                        Open Arc <i class="fa-solid fa-arrow-left ml-2 rotate-180"></i>
                    </button>
                    ${isDM ? `
                    <button onclick="window.appActions.deleteAdventure('${adv.id}')" class="text-stone-400 hover:text-red-800 p-2 sm:p-1 rounded transition" title="Delete Adventure">
                        <i class="fa-solid fa-skull w-4 h-4"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            `;
        });
    }

    if (isDM) {
        html += `
                <!-- Create Adventure Button -->
                <button id="new-adv-btn" onclick="window.appActions.toggleNewAdventureForm()" class="border-2 border-dashed border-stone-600/50 rounded-sm p-4 sm:p-5 flex flex-col items-center justify-center text-stone-400 hover:text-amber-500 hover:border-amber-600/50 hover:bg-stone-800/30 transition min-h-[120px] sm:min-h-[140px]">
                    <i class="fa-solid fa-plus w-5 h-5 sm:w-6 sm:h-6 mb-2"></i>
                    <span class="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Start New Adventure</span>
                </button>
                
                <!-- Create Adventure Form (Hidden) -->
                <div id="new-adv-form" class="hidden border border-stone-600 bg-stone-800 rounded-sm p-3 sm:p-4 flex flex-col justify-center min-h-[120px] sm:min-h-[140px] shadow-lg">
                    <input type="text" id="new-adv-name" placeholder="Adventure Title..." class="w-full p-2 bg-[#f4ebd8] text-stone-900 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-red-900 mb-2 sm:mb-3 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500 text-xs sm:text-sm" onkeydown="if(event.key === 'Enter') window.appActions.createAdventure()">
                    <div class="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                        <select id="new-adv-start" class="p-1 border border-stone-600 rounded-sm text-[10px] sm:text-xs bg-stone-700 text-stone-200 outline-none flex-1">
                            ${renderLevelOptions(1)}
                        </select>
                        <span class="text-stone-400 text-[10px] sm:text-xs italic">to</span>
                        <select id="new-adv-end" class="p-1 border border-stone-600 rounded-sm text-[10px] sm:text-xs bg-stone-700 text-stone-200 outline-none flex-1">
                            ${renderLevelOptions(2)}
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 mt-auto">
                        <button onclick="window.appActions.toggleNewAdventureForm()" class="px-2 sm:px-3 py-1 text-stone-400 hover:text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition">Cancel</button>
                        <button onclick="window.appActions.createAdventure()" class="px-2 sm:px-3 py-1 bg-stone-600 text-amber-50 rounded-sm hover:bg-stone-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-md transition">Begin</button>
                    </div>
                </div>
        `;
    }

    html += `
        </div>
    </div>
    `;
    return html;
}

function getAdventureHTML(state) {
    const adv = state.activeAdventure;
    const camp = state.activeCampaign;
    if (!adv || !camp) return '';

    const isDM = camp._isDM;

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">${adv.name}</h2>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-400 text-xs sm:text-sm font-sans mt-2">
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">Level ${adv.startLevel}-${adv.endLevel}</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${adv.numPlayers} Heroes Active</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">${adv.totalLootGP.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Arc Loot</span>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                ${isDM ? `
                <button onclick="window.appActions.openAdvRoster()" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-stone-800 text-amber-500 border border-stone-600 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-users-gear mr-1 sm:mr-2"></i> Arc Roster
                </button>
                ` : ''}
                <button onclick="window.appActions.openJournal('adventure')" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-[#f4ebd8] text-stone-900 border border-[#d4c5a9] rounded-sm hover:bg-[#e8dec7] transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md" title="Read adventure scroll">
                    <i class="fa-solid fa-scroll mr-1 sm:mr-2 text-stone-700"></i> Arc Scroll
                </button>
                <button onclick="window.appActions.openSessionEdit(null)" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid ${isDM ? 'fa-pen-nib' : 'fa-eye'} mr-1 sm:mr-2"></i> ${isDM ? 'Log Session' : 'View Session'}
                </button>
            </div>
        </div>

        <div class="bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden">
    `;

    if (!adv.sessions || adv.sessions.length === 0) {
        html += `
            <div class="p-8 sm:p-12 text-center text-stone-500 flex flex-col items-center">
                <i class="fa-solid fa-pen-nib text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The pages of this arc are currently blank.</p>
                ${isDM ? `<p class="text-xs sm:text-sm mt-2 font-sans">Click "Log Session" to ink your first entry.</p>` : ''}
            </div>
        `;
    } else {
        html += `<ul class="divide-y divide-[#d4c5a9]/50">`;
        const sortedSessions = [...adv.sessions].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedSessions.forEach(session => {
            html += `
            <li class="p-4 sm:p-5 hover:bg-[#fbf4e6] transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 group">
                <div class="flex-grow w-full">
                    <h4 class="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-tight">${session.name}</h4>
                    <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 mt-1">
                        ${new Date(session.timestamp).toLocaleDateString()} <span class="mx-1">•</span> <span class="text-red-900">${session.lootValue.toLocaleString()} gp</span> discovered
                    </p>
                    ${session.notes ? `<p class="text-xs sm:text-sm text-stone-700 mt-2 sm:mt-3 italic border-l-2 border-stone-400 pl-2 sm:pl-3 line-clamp-3">"${session.notes}"</p>` : ''}
                </div>
                <div class="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.appActions.openJournal('session', '${session.id}')" class="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 text-stone-800 bg-stone-300 rounded-sm hover:bg-stone-400 border border-stone-400 transition text-[10px] sm:text-xs font-bold uppercase tracking-wider justify-center flex items-center shadow-sm" title="Read Entry">
                        <i class="fa-solid fa-scroll mr-1"></i> Read
                    </button>
                    <button onclick="window.appActions.openSessionEdit('${session.id}')" class="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 text-amber-50 bg-stone-800 rounded-sm hover:bg-stone-700 border border-stone-600 transition text-[10px] sm:text-xs font-bold uppercase tracking-wider justify-center flex items-center shadow-sm">
                        <i class="fa-solid ${isDM ? 'fa-pen-nib' : 'fa-eye'} mr-1"></i> ${isDM ? 'Edit' : 'View'}
                    </button>
                    ${isDM ? `
                    <button onclick="window.appActions.deleteSession('${session.id}')" class="flex-none px-4 sm:px-3 py-1.5 sm:py-2 text-amber-50 bg-red-900 rounded-sm hover:bg-red-800 border border-red-950 transition text-[10px] sm:text-xs font-bold uppercase tracking-wider justify-center flex items-center shadow-sm">
                        <i class="fa-solid fa-skull"></i>
                    </button>
                    ` : ''}
                </div>
            </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div></div>`;
    return html;
}

function getAdvRosterHTML(state) {
    const camp = state.activeCampaign;
    const adv = state.activeAdventure;
    if (!camp || !adv || !camp._isDM) return ''; // Security check

    const allPCs = camp.playerCharacters || [];
    const selectedIds = state.tempAdvRoster || [];

    let html = `
    <div class="animate-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto bg-[#f4ebd8] p-6 sm:p-8 rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-2 bg-amber-600"></div>
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl sm:text-3xl font-serif font-bold text-stone-900 flex items-center border-b-2 border-stone-300 pb-2 w-full">
                <i class="fa-solid fa-users-viewfinder mr-3 text-amber-600"></i> Arc Roster: ${adv.name}
            </h2>
        </div>
        <p class="text-sm text-stone-600 italic mb-6">Select which heroes are actively participating in this adventure arc. Heroes not selected will not appear in session logs for this arc.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
    `;

    if (allPCs.length === 0) {
        html += `<div class="col-span-full text-center text-stone-500 italic py-8">No heroes registered in this campaign yet.</div>`;
    } else {
        allPCs.forEach(pc => {
            const isSelected = selectedIds.includes(pc.id);
            html += `
            <label class="flex items-center p-4 border rounded-sm cursor-pointer transition-colors ${isSelected ? 'bg-amber-100 border-amber-500 shadow-inner' : 'bg-[#fdfbf7] border-[#d4c5a9] hover:bg-white hover:border-amber-300 shadow-sm'}">
                <div class="relative flex items-center justify-center w-6 h-6 mr-4 border-2 rounded-sm ${isSelected ? 'bg-amber-500 border-amber-600' : 'bg-stone-200 border-stone-400'} transition-colors">
                    ${isSelected ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
                    <input type="checkbox" class="hidden" ${isSelected ? 'checked' : ''} onchange="window.appActions.toggleAdvRosterPc('${pc.id}')">
                </div>
                <div>
                    <div class="font-serif font-bold text-stone-900 text-lg leading-tight">${pc.name}</div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-1">${pc.race || 'Unknown'} • ${pc.classLevel || 'Unknown'}</div>
                </div>
            </label>
            `;
        });
    }

    html += `
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-[#d4c5a9]">
            <button onclick="window.appActions.setView('adventure')" class="px-5 py-2.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-xs sm:text-sm">Cancel</button>
            <button onclick="window.appActions.saveAdvRoster()" class="px-5 py-2.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center shadow-md">
                <i class="fa-solid fa-floppy-disk mr-2"></i> Save Roster
            </button>
        </div>
    </div>
    `;
    return html;
}

function getPCManagerHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    const pcs = camp.playerCharacters || [];
    const isDM = camp._isDM;

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
            html += `
            <div class="bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between group relative overflow-hidden hover:shadow-md transition cursor-pointer" onclick="window.appActions.openPCEdit('${pc.id}')">
                <div class="absolute top-0 left-0 w-1 h-full bg-stone-500"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-900 truncate">${pc.name}</h3>
                    <p class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1 sm:mt-2">
                        ${race} <span class="mx-1">•</span> ${classLevel}
                    </p>
                </div>
                <div class="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#d4c5a9]/50 pl-2">
                    <span class="text-stone-700 group-hover:text-red-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition">
                        Open Journal <i class="fa-solid fa-arrow-right ml-2"></i>
                    </span>
                </div>
            </div>
            `;
        });
    }

    html += `
        </div>
    </div>
    `;
    return html;
}

function getPCEditHTML(state) {
    const camp = state.activeCampaign;
    const isNew = !state.activePcId;
    
    const pc = !isNew && camp?.playerCharacters 
        ? camp.playerCharacters.find(p => p.id === state.activePcId) 
        : { name: '', race: '', classLevel: '', background: '', alignment: '', faith: '', gender: '', age: '', size: '', height: '', weight: '', eyes: '', hair: '', skin: '', traits: '', ideals: '', bonds: '', flaws: '', appearance: '', backstory: '', dmNotes: '', playerId: '' };

    if (!pc && !isNew) return `<div class="text-center text-red-500 p-8">Hero not found.</div>`;

    const isDM = camp._isDM;
    const isOwner = pc.playerId === state.currentUserUid;
    const canEdit = isDM || isOwner;

    // If player doesn't own it and isn't DM, hide the save buttons entirely (Read Only Mode)
    const readOnlyMode = !canEdit; 

    // DM has full power. Player owner can edit roleplay fields, but NOT core fields (name/class)
    const coreReadonlyAttr = !isDM ? 'readonly disabled' : '';
    const coreClass = !isDM ? 'opacity-70 bg-[#e8dec7] cursor-not-allowed' : 'bg-white focus:border-red-900';

    const title = isNew ? "Enroll New Hero" : `Hero Journal: ${pc.name}`;

    // DM assigns the hero to a player UID
    let playerAssignHTML = '';
    if (isDM) {
        const activePlayerUIDs = camp.activePlayers || [];
        const options = activePlayerUIDs.map(uid => 
            `<option value="${uid}" ${pc.playerId === uid ? 'selected' : ''}>Player UID: ${uid.substring(0,8)}...</option>`
        ).join('');
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
            ${readOnlyMode ? `<span class="bg-stone-700 text-amber-100 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest z-10 border border-stone-500">Read Only</span>` : ''}
            <div class="absolute right-0 top-0 bottom-0 w-24 sm:w-32 opacity-10 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
                <i class="fa-solid fa-shield-halved text-5xl sm:text-6xl text-amber-50"></i>
            </div>
        </div>

        <!-- Form Content -->
        <div class="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            
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
                ${renderSmartField('pc-edit-traits', 'Personality Traits', pc.traits || '', 'What are their unique quirks?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
                ${renderSmartField('pc-edit-ideals', 'Ideals', pc.ideals || '', 'What drives them?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
                ${renderSmartField('pc-edit-bonds', 'Bonds', pc.bonds || '', 'Who or what do they care about?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
                ${renderSmartField('pc-edit-flaws', 'Flaws', pc.flaws || '', 'What are their weaknesses?', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
            </div>

            <!-- Detailed Notes (Universal Editor Linked) -->
            <div class="space-y-4 sm:space-y-6">
                ${renderSmartField('pc-edit-appearance', `<i class="fa-solid fa-user text-stone-500 mr-2"></i> Appearance`, pc.appearance || '', "Detailed physical description, scars, tattoos, clothing...", 4, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
                ${renderSmartField('pc-edit-backstory', `<i class="fa-solid fa-book-open text-stone-500 mr-2"></i> Backstory`, pc.backstory || '', "The hero's origins...", 5, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', readOnlyMode)}
                
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
                <button onclick="window.appActions.setView('pc-manager')" class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-[#fdfbf7] text-stone-700 border border-[#d4c5a9] rounded-sm hover:bg-white transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm">${readOnlyMode ? 'Back' : 'Cancel'}</button>
                ${!readOnlyMode ? `
                <button onclick="window.appActions.savePCEdit()" class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-stone-900 text-amber-50 border border-stone-950 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider flex items-center justify-center text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-floppy-disk mr-2"></i> Inscribe
                </button>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

function getSessionEditHTML(state) {
    const adv = state.activeAdventure;
    const session = state.activeSession;
    const camp = state.activeCampaign;
    if (!adv || !camp) return '';

    const isDM = camp._isDM;
    
    const draftName = session ? session.name : `Log from ${new Date().toLocaleDateString()}`;
    const draftStartLevel = adv.startLevel;
    const draftEndLevel = adv.endLevel;
    const draftNumPlayers = adv.numPlayers;

    const draftLootText = session ? session.lootText : '';
    const draftNotes = session ? session.notes : '';

    const clueRow = (c, idx) => `
        <div class="mb-2 flex gap-2 items-center clue-row bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm">
            <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
            <input type="text" ${!isDM ? 'readonly' : ''} class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400 ${!isDM ? 'opacity-70' : ''}" placeholder="Quest update, clue, or objective..." value="${(c.text || '').replace(/"/g, '&quot;')}">
            ${isDM ? `<button class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </div>`;

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
                <!-- Top Settings Bar -->
                <div class="bg-[#fdfbf7] p-3 sm:p-4 rounded-sm border border-[#d4c5a9] shadow-sm mb-4 sm:mb-6 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:items-end">
                    
                    <div class="flex flex-wrap gap-4 sm:gap-6">
                        <div>
                            <label class="block text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 sm:mb-1.5">Level Range</label>
                            <div class="flex items-center gap-1 sm:gap-2">
                                <select id="draft-start-level" ${!isDM ? 'disabled' : ''} class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" onchange="window.appActions.updateSessionBudget()">
                                    ${renderLevelOptions(draftStartLevel)}
                                </select>
                                <span class="text-stone-400 font-serif italic text-xs sm:text-sm">to</span>
                                <select id="draft-end-level" ${!isDM ? 'disabled' : ''} class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" onchange="window.appActions.updateSessionBudget()">
                                    ${renderLevelOptions(draftEndLevel)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 sm:mb-1.5">Party Size</label>
                            <input type="number" min="1" id="draft-num-players" ${!isDM ? 'readonly' : ''} value="${draftNumPlayers}" class="p-1 sm:p-1.5 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm w-16 sm:w-20 text-center font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" oninput="window.appActions.updateSessionBudget()">
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

                <!-- Modular Layout Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                    
                    <!-- Left Col: Scenes -->
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-1 mb-2">
                            <label class="text-xs sm:text-sm font-bold text-stone-800 font-serif">Scenes & Encounters</label>
                            ${isDM ? `<button onclick="window.appActions.addLogScene()" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition"><i class="fa-solid fa-plus mr-1"></i> Add Scene</button>` : ''}
                        </div>
                        <div id="container-scenes">
                            ${(session?.scenes || [{id:1, text:''}]).map((s, idx) => `
                            <div class="mb-4 scene-row bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col group ${!isDM ? '' : 'cursor-text'}" ${!isDM ? '' : `onclick="window.appActions.openUniversalEditor('scene-input-${idx}', 'Scene ${idx + 1}')"`}>
                                <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
                                    <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${idx + 1}</span>
                                    ${isDM ? `
                                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button class="text-[10px] text-stone-500 hover:text-blue-600 uppercase font-bold transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('scene-input-${idx}', 'Scene ${idx + 1}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                        <button class="text-[10px] text-red-800 hover:text-red-600 uppercase font-bold transition" onclick="event.stopPropagation(); this.closest('.scene-row').remove()"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                    ` : ''}
                                </div>
                                <input type="hidden" id="scene-input-${idx}" class="scene-hidden-input" value="${(s.text || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}">
                                <div id="view-scene-input-${idx}" class="w-full text-stone-800 text-xs sm:text-sm p-3 min-h-[4rem] leading-relaxed whitespace-pre-wrap font-serif ${!isDM ? '' : 'group-hover:bg-white'} transition">
                                    ${(s.text && window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(s.text) : '<span class="text-stone-400 italic font-sans">No entry.</span>'}
                                </div>
                            </div>
                            `).join('')}
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
                                ${(session?.clues || [{id:1, text:''}]).map((c, i) => clueRow(c, i)).join('')}
                            </div>
                        </div>
                        <div>
                            ${renderSmartField('draft-loot', 'Loot <span id="budget-live-calc" class="font-sans font-bold text-red-900 text-[10px] sm:text-xs ml-2">Calc: 0 gp</span>', draftLootText, 'e.g. 50 gp, 2 pp, +1 Longsword...', 3, 'bg-[#fdfbf7] border border-[#d4c5a9] shadow-inner', !isDM)}
                        </div>
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

function getJournalHTML(state) {
    const markdownContent = window.appData?.currentMarkdown || '';
    
    // Pass the raw markdown through our parser to convert it to beautiful HTML
    const formattedContent = (window.appActions && window.appActions.parseSmartText)
        ? window.appActions.parseSmartText(markdownContent)
        : markdownContent;
    
    let title = 'Tome';
    if (state.activeSession) title = `Scroll: ${state.activeSession.name}`;
    else if (state.activeAdventure) title = `Arc Scroll: ${state.activeAdventure.name}`;
    else if (state.activeCampaign) title = `Grand Tome: ${state.activeCampaign.name}`;

    let html = `
    <div class="animate-in fade-in duration-300 max-w-4xl mx-auto bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-150px)]">
        <div class="bg-stone-900 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-red-900 gap-3 sm:gap-0">
            <h2 class="text-base sm:text-xl font-serif font-bold flex items-center w-full sm:w-auto truncate">
                <i class="fa-solid fa-scroll mr-2 sm:mr-3 text-red-700 flex-shrink-0"></i> 
                <span class="truncate">${title}</span>
            </h2>
            <div class="flex gap-2 w-full sm:w-auto self-end">
                <button id="journal-copy-btn" onclick="window.appActions.copyJournal()" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500">
                    <i class="fa-solid fa-copy mr-1 sm:mr-2"></i> Copy
                </button>
                <button onclick="window.appActions.closeJournal()" class="flex-none p-2 bg-stone-800 hover:bg-red-900 text-stone-300 hover:text-white border border-stone-600 rounded-sm transition shadow-md" title="Close Scroll">
                    <i class="fa-solid fa-xmark w-4 h-4 sm:w-5 sm:h-5"></i>
                </button>
            </div>
        </div>
        
        <div class="flex-grow p-0 bg-[#fdfbf7] overflow-hidden relative">
            <div id="journal-textarea" class="w-full h-full p-4 sm:p-8 bg-transparent text-stone-900 font-serif text-[10px] sm:text-sm leading-relaxed overflow-y-auto custom-scrollbar">
                ${formattedContent}
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
