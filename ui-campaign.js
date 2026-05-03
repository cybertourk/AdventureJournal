import { renderLevelOptions } from './ui-core.js';

export function getHomeHTML(state) {
    const hostedCampaigns = state.campaigns.filter(c => c._isDM);
    const playedCampaigns = state.campaigns.filter(c => c._isPlayer && !c._isDM);

    let html = `<div class="animate-in fade-in duration-300 pb-8">`;

    // --- SECTION 1: DM CAMPAIGNS ---
    html += `
        <h2 class="text-xl font-serif font-bold text-amber-900 mb-4 flex items-center border-b border-[#d4c5a9] pb-2">
            <i class="fa-solid fa-crown mr-2 text-amber-700"></i> My Campaigns
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
    `;

    if (hostedCampaigns.length === 0) {
        html += `<div class="col-span-full text-stone-500 italic text-sm mb-4">You are not currently hosting any campaigns.</div>`;
    }

    hostedCampaigns.forEach(camp => {
        const totalSessions = camp.adventures ? camp.adventures.reduce((sum, adv) => sum + adv.sessions.length, 0) : 0;
        const advCount = camp.adventures ? camp.adventures.length : 0;
        const pcCount = camp.playerCharacters ? camp.playerCharacters.length : 0;

        html += `
            <div class="bg-[#fdfbf7] p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between group relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-red-900"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-xl text-stone-900 truncate leading-tight" title="${camp.name}">${camp.name}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-2">
                        ${advCount} Adventures <span class="mx-1">•</span> ${pcCount} Heroes
                    </p>
                    <p class="text-xs text-stone-700 italic mt-2">${totalSessions} total sessions recorded</p>
                    
                    <button onclick="window.appActions.copyCampaignId('${camp.id}', this)" class="mt-4 text-[10px] font-bold uppercase tracking-wider text-stone-600 hover:text-amber-700 transition flex items-center bg-stone-100 border border-stone-300 px-3 py-1.5 rounded-sm shadow-sm w-max active:scale-95" title="Copy ID to share with players">
                        <i class="fa-solid fa-copy mr-1.5"></i> Copy Invite ID
                    </button>
                </div>
                <div class="flex justify-between items-center mt-5 pt-3 border-t border-[#d4c5a9]/50 pl-2">
                    <button onclick="window.appActions.openCampaign('${camp.id}')" class="text-red-900 hover:text-red-700 text-xs font-bold uppercase tracking-wider flex items-center transition py-1">
                        Open Tome <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                    <button onclick="window.appActions.deleteCampaign('${camp.id}')" class="text-stone-400 hover:text-red-800 p-2 rounded transition" title="Burn Tome (Delete Campaign)">
                        <i class="fa-solid fa-skull text-lg"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            <button id="new-camp-btn" onclick="window.appActions.toggleNewCampaignForm()" class="bg-white border-2 border-dashed border-stone-400 rounded-sm p-5 flex flex-col items-center justify-center text-stone-500 hover:text-amber-700 hover:border-amber-500 hover:bg-amber-50/50 transition min-h-[140px] shadow-sm active:scale-95">
                <i class="fa-solid fa-plus text-2xl mb-2"></i>
                <span class="font-bold uppercase tracking-wider text-xs">Forge New Campaign</span>
            </button>
            
            <div id="new-camp-form" class="hidden border border-[#d4c5a9] bg-stone-100 rounded-sm p-5 flex flex-col justify-center min-h-[140px] shadow-inner">
                <input type="text" id="new-camp-name" placeholder="Campaign Title..." class="w-full p-3 bg-white text-stone-900 border border-[#d4c5a9] rounded-sm focus:outline-none focus:border-red-900 mb-4 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 text-sm shadow-sm" onkeydown="if(event.key === 'Enter') window.appActions.createCampaign()">
                <div class="flex justify-end gap-2 mt-auto">
                    <button onclick="window.appActions.toggleNewCampaignForm()" class="px-4 py-2 text-stone-500 hover:text-stone-800 text-[10px] font-bold uppercase tracking-wider transition">Cancel</button>
                    <button onclick="window.appActions.createCampaign()" class="px-5 py-2 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 text-[10px] font-bold uppercase tracking-wider shadow-md transition">Create</button>
                </div>
            </div>
        </div>
    `;

    // --- SECTION 2: PLAYER CAMPAIGNS ---
    html += `
        <h2 class="text-xl font-serif font-bold text-blue-900 mb-4 flex items-center border-b border-[#d4c5a9] pb-2">
            <i class="fa-solid fa-shield-halved mr-2 text-blue-700"></i> Joined Campaigns
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
    `;

    playedCampaigns.forEach(camp => {
        const totalSessions = camp.adventures ? camp.adventures.reduce((sum, adv) => sum + adv.sessions.length, 0) : 0;
        const pcCount = camp.playerCharacters ? camp.playerCharacters.length : 0;

        html += `
            <div class="bg-[#fdfbf7] p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between group relative overflow-hidden hover:border-blue-400 transition-colors">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-blue-700"></div>
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-xl text-stone-900 truncate leading-tight" title="${camp.name}">${camp.name}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-2">
                        ${pcCount} Heroes in Party
                    </p>
                    <p class="text-xs text-stone-700 italic mt-2">${totalSessions} total sessions recorded</p>
                </div>
                <div class="flex justify-between items-center mt-5 pt-3 border-t border-[#d4c5a9]/50 pl-2">
                    <button onclick="window.appActions.openCampaign('${camp.id}')" class="text-blue-700 hover:text-blue-500 text-xs font-bold uppercase tracking-wider flex items-center transition py-1">
                        Open Tome <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                    <button class="text-stone-400 hover:text-red-700 p-2 rounded transition" title="Leave Campaign">
                        <i class="fa-solid fa-door-open text-lg"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            <button id="join-camp-btn" onclick="window.appActions.toggleJoinCampaignForm()" class="bg-white border-2 border-dashed border-stone-400 rounded-sm p-5 flex flex-col items-center justify-center text-stone-500 hover:text-blue-700 hover:border-blue-500 hover:bg-blue-50/50 transition min-h-[140px] shadow-sm active:scale-95">
                <i class="fa-solid fa-link text-2xl mb-2"></i>
                <span class="font-bold uppercase tracking-wider text-xs">Join By ID</span>
            </button>
            
            <div id="join-camp-form" class="hidden border border-[#d4c5a9] bg-stone-100 rounded-sm p-5 flex flex-col justify-center min-h-[140px] shadow-inner">
                <input type="text" id="join-camp-id" placeholder="Paste Invite ID here..." class="w-full p-3 bg-white text-stone-900 border border-[#d4c5a9] rounded-sm focus:outline-none focus:border-blue-800 mb-4 font-mono font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 text-sm text-center tracking-widest shadow-sm" onkeydown="if(event.key === 'Enter') window.appActions.joinCampaign()">
                <div class="flex justify-end gap-2 mt-auto">
                    <button onclick="window.appActions.toggleJoinCampaignForm()" class="px-4 py-2 text-stone-500 hover:text-stone-800 text-[10px] font-bold uppercase tracking-wider transition">Cancel</button>
                    <button onclick="window.appActions.joinCampaign()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 text-[10px] font-bold uppercase tracking-wider shadow-md transition">Join</button>
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

    // The main Campaign Name is now displayed in the global header, so we only need a summary block here
    let html = `
    <div class="animate-in fade-in duration-300">
        
        <!-- Campaign Summary & Extra Actions -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#d4c5a9] pb-4">
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                <span class="bg-white px-2 py-1 rounded-sm border border-[#d4c5a9] shadow-sm"><i class="fa-solid fa-map-location-dot mr-1 text-stone-400"></i> ${advCount} Arcs</span>
                <span class="bg-white px-2 py-1 rounded-sm border border-[#d4c5a9] shadow-sm"><i class="fa-solid fa-users mr-1 text-stone-400"></i> ${pcCount} Heroes</span>
                <span class="bg-white px-2 py-1 rounded-sm border border-[#d4c5a9] shadow-sm"><i class="fa-solid fa-book-journal-whills mr-1 text-stone-400"></i> ${codexCount} Entries</span>
                ${isDM ? `<span class="bg-amber-50 px-2 py-1 rounded-sm border border-amber-300 shadow-sm text-amber-800"><i class="fa-solid fa-coins mr-1"></i> ${totalCampLoot.toLocaleString()} gp</span>` : ''}
            </div>
            
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.openJournal('campaign')" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-stone-800 text-amber-50 border border-stone-900 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95" title="Read full campaign tome">
                    <i class="fa-solid fa-book mr-1.5"></i> Grand Tome
                </button>
                ${isDM ? `
                <button onclick="window.appActions.openActivityLog()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white text-stone-700 border border-[#d4c5a9] rounded-sm hover:bg-stone-100 transition font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95" title="View Player Activity Log">
                    <i class="fa-solid fa-clock-rotate-left mr-1.5"></i> Activity
                </button>
                ` : ''}
            </div>
        </div>

        <h3 class="text-xl font-serif font-bold text-amber-900 mb-4 flex items-center">
            <i class="fa-solid fa-map-location-dot mr-2 opacity-50"></i> Story Arcs
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
    `;

    if (camp.adventures) {
        // Sort adventures alphanumerically by name
        const sortedAdventures = [...camp.adventures].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedAdventures.forEach((adv, index) => {
            // Treat the very last adventure in the sorted list as the "Active" one for styling
            const isActive = index === sortedAdventures.length - 1;
            
            const cardBg = isActive ? 'bg-[#fcf8ee]' : 'bg-[#fdfbf7]';
            const cardBorder = isActive ? 'border-amber-500' : 'border-[#d4c5a9]';
            const cardLine = isActive ? 'bg-amber-500' : 'bg-emerald-700';
            const titleColor = isActive ? 'text-amber-950' : 'text-stone-900';
            const activeBadge = isActive ? `<div class="absolute top-3 right-3 text-[9px] bg-amber-500 text-white uppercase font-bold px-2 py-1 rounded-sm shadow-sm">Active</div>` : '';
            
            const lootText = isDM ? `<span class="mx-1">•</span> <span class="text-amber-700">${adv.totalLootGP.toLocaleString()} gp</span>` : '';

            html += `
            <div class="${cardBg} p-5 rounded-sm border ${cardBorder} shadow-sm flex flex-col justify-between group relative overflow-hidden hover:shadow-md transition cursor-pointer" onclick="window.appActions.openAdventure('${adv.id}')">
                <div class="absolute top-0 left-0 w-1.5 h-full ${cardLine}"></div>
                ${activeBadge}
                
                <div class="pl-2">
                    <h3 class="font-serif font-bold text-xl ${titleColor} truncate leading-tight w-[85%]" title="${adv.name}">${adv.name}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-2">
                        Lvl ${adv.startLevel}-${adv.endLevel} <span class="mx-1">•</span> ${adv.numPlayers} Players ${lootText}
                    </p>
                </div>
                
                <div class="mt-4 pt-3 border-t border-[#d4c5a9]/50 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-600 pl-2">
                    <span class="flex items-center bg-white px-2 py-1 rounded-sm border border-[#d4c5a9]"><i class="fa-solid fa-feather-pointed mr-1.5 text-stone-400"></i> ${adv.sessions ? adv.sessions.length : 0} Sessions</span>
                    <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </div>
            </div>
            `;
        });
    }

    if (isDM) {
        html += `
                <!-- Create Adventure Button -->
                <button id="new-adv-btn" onclick="window.appActions.toggleNewAdventureForm()" class="bg-white border-2 border-dashed border-[#d4c5a9] rounded-sm p-5 flex flex-col items-center justify-center text-stone-400 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition min-h-[120px] shadow-sm active:scale-95">
                    <i class="fa-solid fa-plus text-2xl mb-2"></i>
                    <span class="font-bold uppercase tracking-wider text-[10px]">Start New Arc</span>
                </button>
                
                <!-- Create Adventure Form (Hidden) -->
                <div id="new-adv-form" class="hidden border border-[#d4c5a9] bg-stone-100 rounded-sm p-4 flex flex-col justify-center min-h-[120px] shadow-inner">
                    <input type="text" id="new-adv-name" placeholder="Adventure Title..." class="w-full p-2.5 bg-white text-stone-900 border border-[#d4c5a9] rounded-sm focus:outline-none focus:border-red-900 mb-3 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 text-sm shadow-sm" onkeydown="if(event.key === 'Enter') window.appActions.createAdventure()">
                    <div class="flex items-center gap-2 mb-4">
                        <select id="new-adv-start" class="p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none flex-1 shadow-sm font-bold">
                            ${renderLevelOptions(1)}
                        </select>
                        <span class="text-stone-400 text-xs italic">to</span>
                        <select id="new-adv-end" class="p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none flex-1 shadow-sm font-bold">
                            ${renderLevelOptions(2)}
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 mt-auto">
                        <button onclick="window.appActions.toggleNewAdventureForm()" class="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-[10px] font-bold uppercase tracking-wider transition">Cancel</button>
                        <button onclick="window.appActions.createAdventure()" class="px-4 py-1.5 bg-stone-800 text-amber-50 rounded-sm hover:bg-stone-700 text-[10px] font-bold uppercase tracking-wider shadow-md transition">Begin Arc</button>
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
        
        <!-- Arc Summary & Extra Actions -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#d4c5a9] pb-4">
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                <span class="bg-white px-2 py-1 rounded-sm border border-[#d4c5a9] shadow-sm"><i class="fa-solid fa-stairs mr-1 text-stone-400"></i> Lvl ${adv.startLevel}-${adv.endLevel}</span>
                <span class="bg-white px-2 py-1 rounded-sm border border-[#d4c5a9] shadow-sm"><i class="fa-solid fa-users mr-1 text-stone-400"></i> ${adv.numPlayers} Active Heroes</span>
                ${isDM ? `<span class="bg-amber-50 px-2 py-1 rounded-sm border border-amber-300 shadow-sm text-amber-800"><i class="fa-solid fa-coins mr-1"></i> ${adv.totalLootGP.toLocaleString()} gp</span>` : ''}
            </div>
            
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.openJournal('adventure')" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-stone-800 text-amber-50 border border-stone-900 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95" title="Read adventure scroll">
                    <i class="fa-solid fa-scroll mr-1.5"></i> Arc Scroll
                </button>
                ${isDM ? `
                <button onclick="window.appActions.openAdvRoster()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white text-stone-700 border border-[#d4c5a9] rounded-sm hover:bg-stone-100 transition font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95" title="Manage participating heroes">
                    <i class="fa-solid fa-users-gear mr-1.5"></i> Roster
                </button>
                <button onclick="window.appActions.openEditAdventureModal()" class="flex-none px-3 py-2 bg-white text-stone-700 border border-[#d4c5a9] rounded-sm hover:bg-stone-100 transition shadow-sm active:scale-95" title="Amend Adventure Details">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                ` : ''}
            </div>
        </div>

        <div class="mb-8">
    `;

    if (!adv.sessions || adv.sessions.length === 0) {
        html += `
            <div class="p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-pen-nib text-4xl sm:text-5xl mx-auto text-stone-400 mb-3 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The pages of this arc are currently blank.</p>
                ${isDM ? `<p class="text-xs sm:text-sm mt-2 font-sans">Use the action button <i class="fa-solid fa-pen-nib mx-1 text-red-900"></i> below to log your first session.</p>` : ''}
            </div>
        `;
    } else {
        const sortedSessions = [...adv.sessions].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedSessions.forEach(session => {
            const showLoot = isVisible(session.lootVisibility);
            const showNotes = isVisible(session.notesVisibility);
            
            const lootHtml = showLoot ? `<span class="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-coins mr-1"></i>${session.lootValue.toLocaleString()} gp</span>` : '';
            
            const dateStr = new Date(session.timestamp).toLocaleDateString();
            
            // --- SMART IN-GAME DATE PARSER ---
            let inGameDateParsed = '';
            if (typeof session.inGameDate === 'string') {
                inGameDateParsed = session.inGameDate;
            } else if (session.inGameDate && typeof session.inGameDate === 'object') {
                const { year, month, day, endYear, endMonth, endDay, duration } = session.inGameDate;
                
                const getMonthName = (mIdx) => {
                    let mName = "Unknown Month";
                    if (camp && camp.calendar && camp.calendar.months && camp.calendar.months[mIdx]) {
                        mName = camp.calendar.months[mIdx].name;
                        if (mName.includes('(') && camp.calendar.months[mIdx].nickname === undefined) {
                            mName = mName.split('(')[0].trim();
                        }
                    }
                    return mName;
                };

                const startMonthName = getMonthName(month);
                
                if (duration > 1 && endYear !== undefined && endMonth !== undefined && endDay !== undefined) {
                    const endMonthName = getMonthName(endMonth);
                    if (year === endYear && month === endMonth) {
                        inGameDateParsed = `${day}-${endDay} ${startMonthName}, ${year}`;
                    } else if (year === endYear) {
                        inGameDateParsed = `${day} ${startMonthName} - ${endDay} ${endMonthName}, ${year}`;
                    } else {
                        inGameDateParsed = `${day} ${startMonthName}, ${year} - ${endDay} ${endMonthName}, ${endYear}`;
                    }
                } else {
                    inGameDateParsed = `${day} ${startMonthName}, ${year}`;
                }
            }

            const inGameStr = inGameDateParsed ? `<span class="text-stone-500 normal-case font-serif italic whitespace-nowrap">(${inGameDateParsed})</span>` : '';
            
            // Extract the best available preview text
            let previewText = '';
            if (showNotes && session.notes && session.notes.trim()) {
                previewText = session.notes;
            } else if (session.scenes && session.scenes.length > 0) {
                const firstScene = session.scenes.find(s => isVisible(s.visibility) && s.text && s.text.trim());
                if (firstScene) previewText = firstScene.text;
            }
            if (!previewText && !isDM && session.playerNotes && session.playerNotes[myUid] && session.playerNotes[myUid].text.trim()) {
                previewText = session.playerNotes[myUid].text;
            }
            if (!previewText && session.clues && session.clues.length > 0) {
                const firstClue = session.clues.find(c => isVisible(c.visibility) && c.text && c.text.trim());
                if (firstClue) previewText = firstClue.text;
            }

            // Clean Markdown Stripper
            let cleanPreview = '';
            if (previewText) {
                cleanPreview = previewText
                    .replace(/(^|\n)\s*#{1,6}\s+/g, ' ') 
                    .replace(/(\*\*|__|\*|_|`|~)/g, '') 
                    .replace(/(^|\n)\s*[\-\*]\s+/g, ' ') 
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') 
                    .replace(/\n/g, ' ') 
                    .replace(/\s+/g, ' ') 
                    .replace(/</g, "&lt;").replace(/>/g, "&gt;") 
                    .trim()
                    .replace(/^["']+|["']+$/g, ''); 
            }

            const notesHtml = cleanPreview ? `<p class="text-xs sm:text-sm text-stone-700 mt-3 italic border-l-2 border-stone-400 pl-3 line-clamp-3">${cleanPreview}</p>` : '';

            html += `
            <div class="bg-white border border-[#d4c5a9] rounded-sm shadow-sm p-4 sm:p-5 flex flex-col mb-4 relative group hover:border-stone-400 transition-colors">
                <h4 class="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-tight pr-8">${session.name}</h4>
                <p class="text-[9px] uppercase tracking-widest text-stone-500 mt-2 font-bold flex items-center flex-wrap gap-2">
                    <span class="bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-regular fa-calendar mr-1"></i>${dateStr}</span> 
                    ${inGameStr} 
                    ${lootHtml}
                </p>
                ${notesHtml}
                <div class="mt-4 pt-3 border-t border-stone-200 flex gap-2 flex-wrap sm:flex-nowrap">
                    <button onclick="window.appActions.openJournal('session', '${session.id}')" class="flex-1 sm:flex-none px-4 py-2 bg-[#f4ebd8] text-stone-800 rounded-sm hover:bg-[#e8dec7] border border-[#d4c5a9] transition text-[10px] font-bold uppercase tracking-wider justify-center flex items-center shadow-sm">
                        <i class="fa-solid fa-scroll mr-1.5"></i> Read
                    </button>
                    <button onclick="window.appActions.openSessionEdit('${session.id}')" class="flex-1 sm:flex-none px-4 py-2 bg-stone-800 text-amber-50 rounded-sm hover:bg-stone-700 border border-stone-900 transition text-[10px] font-bold uppercase tracking-wider justify-center flex items-center shadow-sm">
                        <i class="fa-solid ${isDM ? 'fa-pen-nib' : 'fa-eye'} mr-1.5"></i> ${isDM ? 'Edit' : 'View'}
                    </button>
                    ${isDM ? `
                    <button onclick="window.appActions.deleteSession('${session.id}')" class="w-full sm:w-auto px-4 py-2 bg-white text-red-800 rounded-sm hover:bg-red-50 hover:text-red-900 border border-red-200 transition text-[10px] font-bold uppercase tracking-wider justify-center flex items-center shadow-sm sm:ml-auto">
                        <i class="fa-solid fa-trash mr-1.5"></i> Delete
                    </button>
                    ` : ''}
                </div>
            </div>
            `;
        });
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
    <div class="animate-in fade-in duration-300 max-w-3xl mx-auto bg-[#f4ebd8] p-5 sm:p-8 rounded-sm border border-[#d4c5a9] shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden mb-12">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
        <div class="flex justify-between items-center mb-5">
            <h2 class="text-xl sm:text-2xl font-serif font-bold text-stone-900 flex items-center border-b border-[#d4c5a9] pb-2 w-full">
                <i class="fa-solid fa-users-viewfinder mr-3 text-amber-600"></i> Arc Roster: ${adv.name}
            </h2>
        </div>
        <p class="text-xs sm:text-sm text-stone-600 italic mb-6 leading-relaxed">Select which heroes are actively participating in this adventure arc. Heroes not selected will not appear in session logs for this arc.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
    `;

    if (allPCs.length === 0) {
        html += `<div class="col-span-full text-center text-stone-500 italic py-8 border border-dashed border-[#d4c5a9] rounded-sm bg-white">No heroes registered in this campaign yet.</div>`;
    } else {
        allPCs.forEach(pc => {
            const isSelected = selectedIds.includes(pc.id);
            html += `
            <label class="flex items-center p-3 sm:p-4 border rounded-sm cursor-pointer transition-colors shadow-sm ${isSelected ? 'bg-amber-50 border-amber-400' : 'bg-white border-[#d4c5a9] hover:border-amber-300'}">
                <div class="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 border-2 rounded-sm transition-colors ${isSelected ? 'bg-amber-500 border-amber-600' : 'bg-stone-100 border-stone-300'}">
                    ${isSelected ? '<i class="fa-solid fa-check text-white text-[10px]"></i>' : ''}
                    <input type="checkbox" class="hidden" ${isSelected ? 'checked' : ''} onchange="window.appActions.toggleAdvRosterPc('${pc.id}')">
                </div>
                <div>
                    <div class="font-serif font-bold text-stone-900 text-base sm:text-lg leading-tight">${pc.name}</div>
                    <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-1">${pc.race || 'Unknown'} • ${pc.classLevel || 'Unknown'}</div>
                </div>
            </label>
            `;
        });
    }

    html += `
        </div>
        <div class="flex justify-end gap-2 pt-4 border-t border-[#d4c5a9]">
            <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 text-stone-600 bg-white border border-[#d4c5a9] rounded-sm hover:bg-stone-50 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm active:scale-95">Cancel</button>
            <button onclick="window.appActions.saveAdvRoster()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md active:scale-95">
                <i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Roster
            </button>
        </div>
    </div>
    `;
    return html;
}

export function getActivityLogHTML(state) {
    const camp = state.activeCampaign;
    // Hard security check to ensure only DMs can render this view
    if (!camp || !camp._isDM) return `<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Access Denied.</div>`;

    const logs = camp.activityLog || [];

    let html = `
    <div class="animate-in fade-in duration-300 max-w-3xl mx-auto pb-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 border-b border-[#d4c5a9] pb-4">
            <div>
                <h2 class="text-xl sm:text-2xl font-serif font-bold text-amber-900 leading-tight flex items-center">
                    <i class="fa-solid fa-clock-rotate-left mr-2 text-stone-400"></i> Player Activity Log
                </h2>
                <p class="text-stone-500 text-xs font-sans mt-1 italic">Recent actions taken by players in ${camp.name}</p>
            </div>
            <div class="flex gap-2">
                ${logs.length > 0 ? `<button onclick="window.appActions.clearActivityLog()" class="px-3 py-1.5 bg-white text-red-800 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-red-50 transition flex items-center border border-[#d4c5a9] active:scale-95"><i class="fa-solid fa-eraser mr-1.5"></i> Clear Log</button>` : ''}
            </div>
        </div>
    `;

    if (logs.length === 0) {
        html += `
            <div class="p-8 sm:p-12 text-center text-stone-500 bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-wind text-4xl sm:text-5xl mx-auto text-stone-300 mb-3 opacity-50"></i>
                <p class="font-serif text-sm sm:text-base">All is quiet. No recent player activity.</p>
            </div>
        `;
    } else {
        html += `<div class="space-y-3">`;
        logs.forEach(log => {
            const dateObj = new Date(log.timestamp);
            const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString();

            html += `
            <div class="bg-white border border-[#d4c5a9] p-3 sm:p-4 rounded-sm shadow-sm flex items-start gap-3 sm:gap-4 hover:border-amber-300 transition-colors">
                <div class="mt-1 text-stone-400 text-base sm:text-lg w-6 flex justify-center shrink-0">
                    <i class="fa-solid ${log.icon || 'fa-clock-rotate-left'}"></i>
                </div>
                <div class="flex-grow min-w-0">
                    <p class="text-xs sm:text-sm text-stone-800 font-serif leading-relaxed break-words">${log.text}</p>
                    <p class="text-[9px] text-stone-400 uppercase tracking-widest font-bold mt-1.5">${dateString} at ${timeString}</p>
                </div>
            </div>
            `;
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}
