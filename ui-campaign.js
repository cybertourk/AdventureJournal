import { renderLevelOptions } from './ui-core.js';

export function getHomeHTML(state) {
    const hostedCampaigns = state.campaigns.filter(c => c._isDM);
    const playedCampaigns = state.campaigns.filter(c => c._isPlayer && !c._isDM);

    let html = `<div class="animate-in fade-in duration-300">`;

    // --- SECTION 1: DM CAMPAIGNS ---
    html += `
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-amber-500 mb-4 sm:mb-6 border-b-2 border-stone-800 pb-2 sm:pb-3 flex items-center">
            My Campaigns
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
            Joined Campaigns
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

export function getCampaignHTML(state) {
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
                    ${isDM ? `<span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">${totalCampLoot.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Total</span>` : ''}
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
                        Lvl ${adv.startLevel}-${adv.endLevel} <span class="mx-1">•</span> ${adv.numPlayers} Players ${isDM ? `<span class="mx-1">•</span> ${adv.totalLootGP.toLocaleString()} gp` : ''}
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

export function getAdventureHTML(state) {
    const adv = state.activeAdventure;
    const camp = state.activeCampaign;
    if (!adv || !camp) return '';

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;

    // Local fog of war helper for the session loop
    const isVisible = (visObj) => {
        if (isDM) return true; // DM sees all
        const mode = visObj?.mode || 'public';
        if (mode === 'public') return true;
        if (mode === 'hidden') return false;
        if (mode === 'specific' && visObj?.visibleTo?.includes(myUid)) return true;
        return false;
    };

    let html = `
    <div class="animate-in fade-in duration-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">${adv.name}</h2>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-400 text-xs sm:text-sm font-sans mt-2">
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">Level ${adv.startLevel}-${adv.endLevel}</span>
                    <span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">${adv.numPlayers} Heroes Active</span>
                    ${isDM ? `<span class="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">${adv.totalLootGP.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Arc Loot</span>` : ''}
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
            const showLoot = isVisible(session.lootVisibility);
            const showNotes = isVisible(session.notesVisibility);
            
            const lootHtml = showLoot ? `<span class="mx-1">•</span> <span class="text-red-900">${session.lootValue.toLocaleString()} gp</span> discovered` : '';
            
            // Extract the best available preview text (Intelligent Fallback)
            let previewText = '';
            
            // 1. Try General Notes
            if (showNotes && session.notes && session.notes.trim()) {
                previewText = session.notes;
            } 
            // 2. Try Narrative Scenes
            else if (session.scenes && session.scenes.length > 0) {
                const firstScene = session.scenes.find(s => isVisible(s.visibility) && s.text && s.text.trim());
                if (firstScene) previewText = firstScene.text;
            }
            
            // 3. Try the specific Player's Notes (if they exist and the DM hid everything else)
            if (!previewText && !isDM && session.playerNotes && session.playerNotes[myUid] && session.playerNotes[myUid].text.trim()) {
                previewText = session.playerNotes[myUid].text;
            }
            
            // 4. Try Investigation Clues
            if (!previewText && session.clues && session.clues.length > 0) {
                const firstClue = session.clues.find(c => isVisible(c.visibility) && c.text && c.text.trim());
                if (firstClue) previewText = firstClue.text;
            }

            // Bulletproof Markdown Stripper for a clean plain-text card preview
            let cleanPreview = '';
            if (previewText) {
                cleanPreview = previewText
                    .replace(/(^|\n)\s*#{1,6}\s+/g, ' ') // Strip headings (even if indented or on newlines)
                    .replace(/(\*\*|__|\*|_|`|~)/g, '') // Strip bold/italic/code/strikethrough
                    .replace(/(^|\n)\s*[\-\*]\s+/g, ' ') // Strip list markers
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Extract plain text from markdown links
                    .replace(/\n/g, ' ') // Flatten newlines into spaces
                    .replace(/\s+/g, ' ') // Collapse multiple spaces
                    .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Escape HTML safely
                    .trim();
                    
                cleanPreview = cleanPreview.replace(/^["']+|["']+$/g, ''); // Strip leading/trailing quotes if they got pasted in
            }

            const notesHtml = cleanPreview ? `<p class="text-xs sm:text-sm text-stone-700 mt-2 sm:mt-3 italic border-l-2 border-stone-400 pl-2 sm:pl-3 line-clamp-3">${cleanPreview}</p>` : '';

            html += `
            <li class="p-4 sm:p-5 hover:bg-[#fbf4e6] transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 group">
                <div class="flex-grow w-full">
                    <h4 class="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-tight">${session.name}</h4>
                    <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 mt-1">
                        ${new Date(session.timestamp).toLocaleDateString()} ${lootHtml}
                    </p>
                    ${notesHtml}
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

export function getAdvRosterHTML(state) {
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
