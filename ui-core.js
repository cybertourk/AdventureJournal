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

// --- SMART TEXT FIELD GENERATOR ---
export function renderSmartField(id, labelHtml, value, placeholder, rows, wrapperClass = '', extraInput = '') {
    const hasText = value && value.trim().length > 0;
    const viewModeClass = hasText ? '' : 'hidden';
    const editModeClass = hasText ? 'hidden' : '';
    const btnText = hasText ? 'Edit Mode' : 'Read Mode';
    const btnClass = hasText ? 'text-amber-600' : '';
    const viewContent = (hasText && window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(value) : (value || '');

    return `
    <div class="scene-row flex flex-col ${wrapperClass}">
        <div class="flex justify-between items-baseline border-b border-[#d4c5a9] pb-1 mb-2 mt-1">
            <label class="flex-grow text-xs sm:text-sm font-bold text-stone-800 font-serif flex items-center justify-between pr-4">${labelHtml}</label>
            <div class="flex gap-2 flex-shrink-0">
                <button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-amber-600 transition toggle-btn ${btnClass}" onclick="window.appActions.toggleSceneView(this)">${btnText}</button>
                <button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-blue-600 transition" onclick="window.appActions.defineSelection(this)">Define</button>
            </div>
        </div>
        <textarea id="${id}" rows="${rows}" class="scene-editor w-full p-2 sm:p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-xs sm:text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400 custom-scrollbar smart-text-area ${editModeClass}" placeholder="${placeholder}" oninput="window.appActions.handleSmartInput(this); ${extraInput}" spellcheck="false">${value}</textarea>
        <div class="scene-viewer w-full p-2 sm:p-3 border border-transparent bg-transparent text-stone-800 text-xs sm:text-sm min-h-[${rows * 1.5}rem] leading-relaxed whitespace-pre-wrap font-serif ${viewModeClass}">${viewContent}</div>
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

    if ((state.activeAdventure || state.currentView === 'pc-manager' || state.currentView === 'pc-edit' || state.currentView === 'codex') && state.activeCampaign && state.currentView !== 'campaign') {
        html += `<i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>`;
        if (state.currentView === 'pc-manager' || state.currentView === 'pc-edit') {
            html += `<button onclick="window.appActions.setView('pc-manager')" class="hover:text-amber-400 uppercase tracking-wider font-bold transition flex-shrink-0 ${state.currentView === 'pc-manager' ? 'text-amber-500' : ''}">Manage Party</button>`;
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

    if (state.currentView === 'session-edit' || state.currentView === 'journal' || state.currentView === 'pc-edit') {
        html += `<i class="fa-solid fa-chevron-right mx-1 sm:mx-2 text-stone-600 flex-shrink-0 text-[8px] sm:text-xs"></i>`;
        html += `<span class="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">`;
        if (state.currentView === 'session-edit') {
            html += state.activeSessionId ? 'Amend Record' : 'New Record';
        } else if (state.currentView === 'journal') {
            html += state.activeSessionId ? 'Session Scroll' : (state.activeAdventureId ? 'Arc Scroll' : 'Campaign Tome');
        } else if (state.currentView === 'pc-edit') {
            html += state.activePcId ? 'Edit Hero' : 'New Hero';
        }
        html += `</span>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// --- VIEW GENERATORS ---

function getHomeHTML(state) {
    let html = `
    <div class="animate-in fade-in duration-300">
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-amber-500 mb-4 sm:mb-6 border-b-2 border-stone-800 pb-2 sm:pb-3 flex items-center">
            Your Campaigns
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
    `;

    state.campaigns.forEach(camp => {
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
                </div>
                <div class="flex justify-between items-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#d4c5a9]/50 pl-2">
                    <button onclick="window.appActions.openCampaign('${camp.id}')" class="text-red-900 hover:text-red-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center transition py-1 sm:py-0">
                        Open Campaign <i class="fa-solid fa-arrow-left ml-2 rotate-180"></i>
                    </button>
                    <button onclick="window.appActions.deleteCampaign('${camp.id}')" class="text-stone-400 hover:text-red-800 p-2 sm:p-1 rounded transition" title="Burn Tome (Delete Campaign)">
                        <i class="fa-solid fa-skull w-4 h-4 sm:w-5 sm:h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            <!-- Create Button -->
            <button id="new-camp-btn" onclick="window.appActions.toggleNewCampaignForm()" class="border-2 border-dashed border-stone-700 rounded-sm p-4 sm:p-5 flex flex-col items-center justify-center text-stone-500 hover:text-amber-500 hover:border-amber-600 hover:bg-stone-800/50 transition min-h-[120px] sm:min-h-[160px]">
                <i class="fa-solid fa-plus w-6 h-6 sm:w-8 sm:h-8 mb-2"></i>
                <span class="font-bold uppercase tracking-wider text-xs sm:text-sm">Forge New Campaign</span>
            </button>
            
            <!-- Create Form (Hidden) -->
            <div id="new-camp-form" class="hidden border border-stone-600 bg-stone-800 rounded-sm p-4 sm:p-5 flex flex-col justify-center min-h-[120px] sm:min-h-[160px] shadow-lg">
                <input type="text" id="new-camp-name" placeholder="Campaign Title..." class="w-full p-2 bg-[#f4ebd8] text-stone-900 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-red-900 mb-3 sm:mb-4 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500 text-sm sm:text-base" onkeydown="if(event.key === 'Enter') window.appActions.createCampaign()">
                <div class="flex justify-end gap-2 mt-auto">
                    <button onclick="window.appActions.toggleNewCampaignForm()" class="px-3 py-1.5 text-stone-400 hover:text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition">Cancel</button>
                    <button onclick="window.appActions.createCampaign()" class="px-4 py-1.5 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md transition">Create</button>
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
                    <i class="fa-solid fa-users mr-1 sm:mr-2"></i> Manage Party
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
                    <button onclick="window.appActions.deleteAdventure('${adv.id}')" class="text-stone-400 hover:text-red-800 p-2 sm:p-1 rounded transition" title="Delete Adventure">
                        <i class="fa-solid fa-skull w-4 h-4"></i>
                    </button>
                </div>
            </div>
            `;
        });
    }

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
        </div>
    </div>
    `;
    return html;
}

function getAdventureHTML(state) {
    const adv = state.activeAdventure;
    if (!adv) return '';

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">${adv.name}</h2>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-400 text-xs sm:text-sm font-sans mt-2">
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">Level ${adv.startLevel}-${adv.endLevel}</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${adv.numPlayers} Heroes</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">${adv.totalLootGP.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Arc Loot</span>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.openJournal('adventure')" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-[#f4ebd8] text-stone-900 border border-[#d4c5a9] rounded-sm hover:bg-[#e8dec7] transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md" title="Read adventure scroll">
                    <i class="fa-solid fa-scroll mr-1 sm:mr-2 text-stone-700"></i> Arc Scroll
                </button>
                <button onclick="window.appActions.openSessionEdit(null)" class="flex-1 md:flex-none flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-pen-nib mr-1 sm:mr-2"></i> Log Session
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
                <p class="text-xs sm:text-sm mt-2 font-sans">Click "Log Session" to ink your first entry.</p>
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
                        <i class="fa-solid fa-pen-nib mr-1"></i> Edit
                    </button>
                    <button onclick="window.appActions.deleteSession('${session.id}')" class="flex-none px-4 sm:px-3 py-1.5 sm:py-2 text-amber-50 bg-red-900 rounded-sm hover:bg-red-800 border border-red-950 transition text-[10px] sm:text-xs font-bold uppercase tracking-wider justify-center flex items-center shadow-sm">
                        <i class="fa-solid fa-skull"></i>
                    </button>
                </div>
            </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div></div>`;
    return html;
}

function getPCManagerHTML(state) {
    const pcs = state.activeCampaign?.playerCharacters || [];
    const campName = state.activeCampaign?.name || "the campaign";

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Party Manifest</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic">Heroes of ${campName}</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.openPCEdit(null)" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-900 text-amber-50 border border-red-950 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-user-plus mr-2"></i> Enroll Hero
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
    `;

    if (pcs.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-users-slash text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The tavern is currently empty.</p>
                <p class="text-xs sm:text-sm mt-2 font-sans">Click "Enroll Hero" to add a player character to the campaign.</p>
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
        : { name: '', race: '', classLevel: '', ideals: '', bonds: '', flaws: '', backstory: '', dmNotes: '' };

    if (!pc) return `<div class="text-center text-red-500 p-8">Hero not found.</div>`;

    const title = isNew ? "Enroll New Hero" : `Hero Journal: ${pc.name}`;

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
            
            <!-- Basic Info Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                <div class="col-span-1 sm:col-span-2 lg:col-span-1">
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Hero Name *</label>
                    <input type="text" id="pc-edit-name" value="${pc.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white font-bold text-stone-900 shadow-sm outline-none focus:border-red-900 font-serif" placeholder="e.g. Eldrin">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Race / Lineage</label>
                    <input type="text" id="pc-edit-race" value="${pc.race || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" placeholder="e.g. Wood Elf">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Class & Level</label>
                    <input type="text" id="pc-edit-class" value="${pc.classLevel || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" placeholder="e.g. Ranger 4">
                </div>
            </div>

            <!-- Roleplay Grid (Now Smart Linked) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                ${renderSmartField('pc-edit-ideals', 'Ideals', pc.ideals || '', 'What drives them?', 3)}
                ${renderSmartField('pc-edit-bonds', 'Bonds', pc.bonds || '', 'Who or what do they care about?', 3)}
                ${renderSmartField('pc-edit-flaws', 'Flaws', pc.flaws || '', 'What are their weaknesses?', 3)}
            </div>

            <!-- Detailed Notes (Now Smart Linked) -->
            <div class="space-y-4 sm:space-y-6">
                ${renderSmartField('pc-edit-backstory', '<i class="fa-solid fa-book-open text-stone-500 mr-2"></i> Backstory', pc.backstory || '', "The hero's origins...", 5)}
                ${renderSmartField('pc-edit-dmnotes', '<i class="fa-solid fa-eye text-red-900 mr-2"></i> DM\'s Secret Notes', pc.dmNotes || '', 'Hooks, secrets, curses, or background ties...', 4, 'pl-3 border-l-4 border-red-900')}
            </div>

        </div>

        <!-- Footer Actions -->
        <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between items-center gap-4">
            <div>
                ${!isNew ? `<button onclick="window.appActions.deletePC('${pc.id}')" class="px-4 py-2 text-stone-500 hover:text-red-700 hover:bg-red-900/10 rounded-sm transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center"><i class="fa-solid fa-skull mr-2"></i> Remove Hero</button>` : '<div></div>'}
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

function getCodexHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    const codex = camp.codex || [];
    
    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Campaign Codex</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic">Knowledge base for ${camp.name}</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <div class="relative flex-grow md:flex-grow-0">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 text-xs"></i>
                    <input type="text" id="codex-search" class="w-full md:w-48 pl-8 pr-3 py-2 bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-sm focus:outline-none focus:border-amber-600 shadow-inner placeholder-stone-600" placeholder="Search..." onkeyup="window.filterCodex()">
                </div>
                <button onclick="window.appActions._openCodexModal({isNew: true})" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-amber-600 text-stone-950 border border-amber-500 rounded-sm hover:bg-amber-500 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-plus mr-2"></i> New Entry
                </button>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" id="codex-grid">
    `;
    
    if (codex.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-book-journal-whills text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The Codex is empty.</p>
                <p class="text-xs sm:text-sm mt-2 font-sans">Create entries for NPCs, Locations, and Lore to auto-link them in your session logs.</p>
            </div>
        `;
    } else {
        const sorted = [...codex].sort((a,b) => a.name.localeCompare(b.name));
        sorted.forEach(c => {
            let typeColor = "text-stone-500";
            if (c.type === 'NPC') typeColor = "text-blue-600";
            if (c.type === 'Location') typeColor = "text-emerald-600";
            if (c.type === 'Item') typeColor = "text-amber-600";
            if (c.type === 'Faction') typeColor = "text-purple-600";
            if (c.type === 'Lore') typeColor = "text-red-800";
            
            const tagsStr = (c.tags || []).join(', ');
            const hasImg = c.image ? `<i class="fa-solid fa-image text-stone-400 ml-2" title="Has Image"></i>` : '';
            
            html += `
            <div class="codex-card bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col group relative overflow-hidden hover:shadow-md transition cursor-pointer" onclick="window.appActions.viewCodex('${c.id}')" data-search="${c.name.toLowerCase()} ${c.type.toLowerCase()} ${tagsStr.toLowerCase()}">
                <div class="absolute top-0 left-0 w-1 h-full bg-stone-400 group-hover:bg-amber-500 transition-colors"></div>
                <div class="pl-2 flex justify-between items-start mb-2">
                    <h3 class="font-serif font-bold text-lg text-stone-900 leading-tight">${c.name} ${hasImg}</h3>
                </div>
                <div class="pl-2 flex items-center gap-2 mb-3 flex-wrap">
                    <span class="text-[9px] font-bold uppercase tracking-wider ${typeColor} border border-current px-1.5 py-0.5 rounded-sm">${c.type}</span>
                    ${(c.tags || []).slice(0,2).map(t => `<span class="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded-sm">${t}</span>`).join('')}
                    ${(c.tags && c.tags.length > 2) ? `<span class="text-[9px] font-bold text-stone-400">+${c.tags.length - 2}</span>` : ''}
                </div>
                <div class="pl-2 mt-auto pt-3 border-t border-[#d4c5a9]/50">
                    <p class="text-xs text-stone-600 font-sans line-clamp-2 italic">"${c.desc || 'No description...'}"</p>
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

function getSessionEditHTML(state) {
    const adv = state.activeAdventure;
    const session = state.activeSession;
    
    const draftName = session ? session.name : `Log from ${new Date().toLocaleDateString()}`;
    const draftStartLevel = adv.startLevel;
    const draftEndLevel = adv.endLevel;
    const draftNumPlayers = adv.numPlayers;

    const draftLootText = session ? session.lootText : '';
    const draftNotes = session ? session.notes : '';

    // Standard V20 Scene Rows and Clues
    const sceneRow = (s, idx) => {
        const hasText = s.text && s.text.trim().length > 0;
        const viewModeClass = hasText ? '' : 'hidden';
        const editModeClass = hasText ? 'hidden' : '';
        const btnText = hasText ? 'Edit Mode' : 'Read Mode';
        const btnClass = hasText ? 'text-amber-600' : '';
        const viewContent = (hasText && window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(s.text) : (s.text || '');

        return `
        <div class="mb-4 scene-row bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm p-1 shadow-sm">
            <div class="flex justify-between items-center bg-[#f4ebd8] px-2 py-1 mb-1 border-b border-[#d4c5a9]">
                <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${idx + 1}</span>
                <div class="flex gap-2">
                    <button class="text-[10px] text-stone-500 hover:text-amber-600 uppercase font-bold toggle-btn ${btnClass} transition" onclick="window.appActions.toggleSceneView(this)">${btnText}</button>
                    <button class="text-[10px] text-stone-500 hover:text-blue-600 uppercase font-bold transition" onclick="window.appActions.defineSelection(this)">Define</button>
                    ${idx > 0 ? `<button class="text-[10px] text-red-800 hover:text-red-600 uppercase font-bold transition" onclick="this.closest('.scene-row').remove()">Remove</button>` : ''}
                </div>
            </div>
            <textarea class="scene-editor w-full bg-transparent text-stone-900 text-xs sm:text-sm p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed outline-none font-sans smart-text-area custom-scrollbar ${editModeClass}" 
                placeholder="Describe the scene... (Use @ to link codex entries)" 
                oninput="window.appActions.handleSmartInput(this)"
                spellcheck="false">${s.text || ''}</textarea>
            <div class="scene-viewer w-full text-stone-800 text-xs sm:text-sm p-2 h-auto min-h-[6rem] leading-relaxed whitespace-pre-wrap font-serif ${viewModeClass}">${viewContent}</div>
        </div>`;
    };

    const clueRow = (c, idx) => `
        <div class="mb-2 flex gap-2 items-center clue-row bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm">
            <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
            <input type="text" class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400" placeholder="Quest update, clue, or objective..." value="${c.text || ''}">
            <button class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>`;

    let html = `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#f4ebd8] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col" style="min-height: calc(100vh - 120px);">
        <!-- Header -->
        <div class="bg-stone-900 p-3 sm:p-4 border-b-4 border-red-900 text-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 relative">
            <div class="flex-grow w-full sm:w-auto z-10">
                <input type="text" id="draft-name" value="${draftName}" class="bg-stone-800 text-amber-400 px-3 py-1.5 sm:py-2 rounded-sm border border-stone-600 focus:border-amber-500 focus:outline-none w-full sm:w-80 font-serif font-bold text-lg sm:text-xl shadow-inner" placeholder="Session Title...">
            </div>
            <div class="flex flex-wrap gap-2 w-full sm:w-auto self-end z-10">
                <button onclick="window.appActions.setView('adventure')" class="px-4 sm:px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 border border-stone-500 rounded-sm transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex-1 sm:flex-none text-center shadow-md">Cancel</button>
                <button onclick="window.appActions.saveSession()" class="px-4 sm:px-5 py-2 bg-red-900 hover:bg-red-800 text-amber-50 border border-red-950 rounded-sm transition font-bold uppercase tracking-wider flex items-center justify-center text-[10px] sm:text-xs flex-1 sm:flex-none shadow-md">
                    <i class="fa-solid fa-pen-nib mr-1 sm:mr-2"></i> Record
                </button>
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

                <!-- Modular Layout Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                    
                    <!-- Left Col: Scenes -->
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-1 mb-2">
                            <label class="text-xs sm:text-sm font-bold text-stone-800 font-serif">Scenes & Encounters</label>
                            <button onclick="window.appActions.addLogScene()" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition"><i class="fa-solid fa-plus mr-1"></i> Add Scene</button>
                        </div>
                        <div id="container-scenes">
                            ${(session?.scenes || [{id:1, text:''}]).map((s, i) => sceneRow(s, i)).join('')}
                        </div>
                    </div>

                    <!-- Right Col: Clues, Loot, Notes (Now Smart Linked) -->
                    <div class="space-y-4 sm:space-y-6">
                        <div>
                            <div class="flex justify-between items-center border-b border-[#d4c5a9] pb-1 mb-2">
                                <label class="text-xs sm:text-sm font-bold text-stone-800 font-serif">Investigation & Clues</label>
                                <button onclick="window.appActions.addLogClue()" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition"><i class="fa-solid fa-plus mr-1"></i> Add</button>
                            </div>
                            <div id="container-clues">
                                ${(session?.clues || [{id:1, text:''}]).map((c, i) => clueRow(c, i)).join('')}
                            </div>
                        </div>
                        <div>
                            ${renderSmartField('draft-loot', 'Loot <span id="budget-live-calc" class="font-sans font-bold text-red-900 text-[10px] sm:text-xs">Calc: 0 gp</span>', draftLootText, 'e.g. 50 gp, 2 pp, +1 Longsword...', 3, '', 'window.appActions.updateSessionBudget();')}
                        </div>
                        <div>
                            ${renderSmartField('draft-notes', 'General / DM Notes', draftNotes, 'Overall summary of the session...', 5)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB: PCs (Now Smart Linked) -->
            <div id="tab-content-pcs" class="hidden">
    `;

    const pcs = state.activeCampaign?.playerCharacters || [];
    if (pcs.length === 0) {
        html += `
            <div class="text-center p-8 sm:p-12 bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-users text-5xl sm:text-6xl text-stone-300 mx-auto mb-3 sm:mb-4"></i>
                <h3 class="font-serif font-bold text-lg sm:text-xl text-stone-700">No Heroes Assigned</h3>
                <p class="text-stone-500 text-xs sm:text-sm mb-4 sm:mb-6 font-sans">Return to the campaign overview to add players to the party before logging a session.</p>
            </div>
        `;
    } else {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" id="pc-draft-list">`;
        pcs.forEach(pc => {
            const pcNote = session?.pcNotes ? (session.pcNotes[pc.id] || '') : '';
            html += `
                <div class="bg-[#fdfbf7] p-3 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col relative overflow-hidden pc-draft-item" data-id="${pc.id}">
                    <div class="absolute top-0 left-0 w-1 h-full bg-stone-400"></div>
                    <div class="flex justify-between items-center pb-2 sm:pb-3 pl-2">
                        <span class="font-serif font-bold text-base sm:text-xl text-stone-900 truncate pr-2">${pc.name}</span>
                        <div class="flex gap-2 sm:gap-4 flex-shrink-0">
                            <!-- Inspiration Toggle Using Tailwind Peer CSS -->
                            <label class="flex items-center gap-1 sm:gap-1.5 cursor-pointer group" title="Inspiration">
                                <input type="checkbox" id="pc-insp-${pc.id}" class="peer hidden" ${pc.inspiration ? 'checked' : ''} />
                                <div class="p-1 sm:p-1.5 rounded-sm border transition-colors peer-checked:bg-amber-100 peer-checked:border-amber-400 peer-checked:text-amber-600 peer-checked:shadow-inner bg-stone-100 border-stone-200 text-stone-300 group-hover:bg-stone-200 group-hover:text-stone-400">
                                    <i class="fa-solid fa-fire w-4 h-4 sm:w-5 sm:h-5"></i>
                                </div>
                                <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest peer-checked:text-amber-700 text-stone-400">Insp</span>
                            </label>
                            
                            <!-- Auto-Success Toggle Using Tailwind Peer CSS -->
                            <label class="flex items-center gap-1 sm:gap-1.5 cursor-pointer group" title="Auto-Success">
                                <input type="checkbox" id="pc-auto-${pc.id}" class="peer hidden" ${pc.automaticSuccess ? 'checked' : ''} />
                                <div class="p-1 sm:p-1.5 rounded-sm border transition-colors peer-checked:bg-blue-50 peer-checked:border-blue-300 peer-checked:text-blue-600 peer-checked:shadow-inner bg-stone-100 border-stone-200 text-stone-300 group-hover:bg-stone-200 group-hover:text-stone-400">
                                    <i class="fa-solid fa-shield-halved w-4 h-4 sm:w-5 sm:h-5"></i>
                                </div>
                                <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest peer-checked:text-blue-700 text-stone-400">Auto</span>
                            </label>
                        </div>
                    </div>
                    ${renderSmartField(`pc-note-${pc.id}`, 'Session Notes', pcNote, 'Heroic deeds or flaws...', 3, 'mt-1 flex-grow')}
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
                <textarea id="draft-preview-text" readonly class="w-full flex-grow p-4 sm:p-6 bg-[#fdfbf7] border border-[#d4c5a9] border-t-0 rounded-b-sm text-stone-900 font-mono text-[10px] sm:text-sm leading-relaxed resize-none outline-none shadow-inner h-[50vh] sm:h-[60vh] min-h-[300px] sm:min-h-[400px] custom-scrollbar"></textarea>
            </div>

        </div>
    </div>
    `;
    return html;
}

function getJournalHTML(state) {
    const markdownContent = window.appData?.currentMarkdown || '';
    
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
            <textarea id="journal-textarea" readonly class="w-full h-full p-4 sm:p-8 bg-transparent text-stone-900 font-mono text-[10px] sm:text-sm leading-relaxed resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-red-900 border-none custom-scrollbar">${markdownContent}</textarea>
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
