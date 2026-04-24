export function getCodexHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    
    const rawCodex = camp.codex || [];
    
    // --- LEGACY HERO INJECTION ---
    // Inject Heroes that don't have explicit codex entries yet so they appear in the grid
    const autoHeroes = (camp.playerCharacters || []).filter(pc => !rawCodex.some(c => c.id === pc.id)).map(pc => ({
        id: pc.id,
        name: pc.name,
        type: 'PC',
        tags: ['Hero', pc.race, pc.classLevel].filter(Boolean),
        desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
        visibility: { mode: 'public' }
    }));

    const codex = [...rawCodex, ...autoHeroes];
    
    const isDM = camp._isDM;
    const myUid = state.currentUserUid;

    // --- FOG OF WAR FILTER ---
    const isVisibleToPlayer = (item) => {
        if (isDM) return true; // DM sees all
        
        // If the item is a Hero Codex Entry owned by the current user, they can always see it
        const isHeroOwner = camp.playerCharacters?.some(p => p.id === item.id && p.playerId === myUid);
        if (isHeroOwner) return true;

        const vis = item.visibility || { mode: 'public' }; // Default to public for older legacy data
        if (vis.mode === 'public') return true;
        if (vis.mode === 'hidden') return false;
        if (vis.mode === 'specific' && vis.visibleTo && vis.visibleTo.includes(myUid)) return true;
        return false;
    };

    const visibleCodex = codex.filter(isVisibleToPlayer);

    // --- VISIBILITY UI HELPER ---
    const getVisStatus = (item) => {
        const mode = item?.visibility?.mode || 'public';
        const players = (item?.visibility?.visibleTo || []).join(',');
        
        let icon = 'fa-eye';
        let color = 'text-emerald-600 hover:text-emerald-500';
        
        if (mode === 'hidden') {
            icon = 'fa-eye-slash';
            color = 'text-red-700 hover:text-red-600';
        } else if (mode === 'specific') {
            icon = 'fa-user-lock';
            color = 'text-blue-600 hover:text-blue-500';
        }
        
        return { mode, players, icon, color };
    };
    
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
                ${isDM ? `
                <button onclick="window.appActions._openCodexModal({isNew: true})" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-amber-600 text-stone-950 border border-amber-500 rounded-sm hover:bg-amber-500 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-plus mr-2"></i> New Entry
                </button>
                ` : ''}
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" id="codex-grid">
    `;
    
    if (visibleCodex.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-book-journal-whills text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">${isDM ? 'The Codex is empty.' : 'No knowledge has been revealed to you yet.'}</p>
                ${isDM ? `<p class="text-xs sm:text-sm mt-2 font-sans">Create entries for NPCs, Locations, and Lore to auto-link them in your session logs.</p>` : ''}
            </div>
        `;
    } else {
        const sorted = [...visibleCodex].sort((a,b) => a.name.localeCompare(b.name));
        sorted.forEach(c => {
            // Determine if the current user is the owner of this specific hero's codex entry
            const isHeroOwner = camp.playerCharacters?.some(p => p.id === c.id && p.playerId === myUid);
            const canEdit = isDM || isHeroOwner;

            let typeColor = "text-stone-500";
            if (c.type === 'PC') typeColor = "text-indigo-600";
            if (c.type === 'NPC') typeColor = "text-blue-600";
            if (c.type === 'Location') typeColor = "text-emerald-600";
            if (c.type === 'Item') typeColor = "text-amber-600";
            if (c.type === 'Faction') typeColor = "text-purple-600";
            if (c.type === 'Lore') typeColor = "text-red-800";
            
            const tagsStr = (c.tags || []).join(', ');
            const hasImg = c.image ? `<i class="fa-solid fa-image text-stone-400 ml-2" title="Has Image"></i>` : '';
            
            const vis = getVisStatus(c);
            
            // Only the DM and the owning player get the visibility toggle button
            const visBadge = canEdit ? `
                <div class="relative z-10 flex-shrink-0 ml-2" onclick="event.stopPropagation()">
                    <input type="hidden" class="vis-mode-input" value="${vis.mode}">
                    <input type="hidden" class="vis-players-input" value="${vis.players}">
                    <button class="${vis.color} bg-[#f4ebd8] border border-[#d4c5a9] px-2 py-1 rounded-sm shadow-sm text-[10px] transition hover:border-current group-hover:bg-white" onclick="window.appActions.openVisibilityMenu(this, 'codex', '${c.id}')" title="Visibility Settings">
                        <i class="fa-solid ${vis.icon}"></i>
                    </button>
                </div>
            ` : '';
            
            html += `
            <div class="codex-card bg-[#fdfbf7] p-4 sm:p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col group relative overflow-hidden hover:shadow-md transition cursor-pointer" onclick="window.appActions.viewCodex('${c.id}')" data-search="${c.name.toLowerCase()} ${c.type.toLowerCase()} ${tagsStr.toLowerCase()}">
                <div class="absolute top-0 left-0 w-1 h-full bg-stone-400 group-hover:bg-amber-500 transition-colors"></div>
                <div class="pl-2 flex justify-between items-start mb-2">
                    <h3 class="font-serif font-bold text-lg text-stone-900 leading-tight truncate pr-2">${c.name} ${hasImg}</h3>
                    ${visBadge}
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

export function getJournalHTML(state) {
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
