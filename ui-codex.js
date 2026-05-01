export function getCodexHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    
    // Intercept existing codex entries: if an entry is linked to a hero, force its type to 'PC'
    // This fixes legacy heroes that are currently saved in the database as 'NPC'
    const rawCodex = (camp.codex || []).map(c => {
        const linkedPC = camp.playerCharacters?.find(pc => pc.id === c.id);
        if (linkedPC) {
            // Also grab the hero's image if the codex entry lacks its own!
            return { ...c, type: 'PC', image: c.image || linkedPC.image };
        }
        // Map any legacy 'Lore / Rule' entries strictly to 'Lore'
        if (c.type === 'Lore / Rule') return { ...c, type: 'Lore' };
        return c;
    });
    
    // --- LEGACY HERO INJECTION ---
    // Inject Heroes that don't have explicit codex entries yet so they appear in the grid
    const autoHeroes = (camp.playerCharacters || []).filter(pc => !rawCodex.some(c => c.id === pc.id)).map(pc => ({
        id: pc.id,
        name: pc.name,
        type: 'PC',
        tags: ['Hero', pc.race, pc.classLevel].filter(Boolean),
        desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
        visibility: { mode: 'public' },
        image: pc.image // Feed the hero's image into the codex
    }));

    const codex = [...rawCodex, ...autoHeroes];
    
    const isDM = camp._isDM;
    const myUid = state.currentUserUid;

    // --- FOG OF WAR FILTER ---
    const isVisibleToPlayer = (item) => {
        if (isDM || item.authorId === myUid) return true; // DM and the Author always see it
        
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
        let color = 'text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 border-emerald-200';
        
        if (mode === 'hidden') {
            icon = 'fa-eye-slash';
            color = 'text-red-700 hover:text-red-600 hover:bg-red-50 border-red-200';
        } else if (mode === 'specific') {
            icon = 'fa-user-lock';
            color = 'text-blue-600 hover:text-blue-500 hover:bg-blue-50 border-blue-200';
        }
        
        return { mode, players, icon, color };
    };

    // --- GROUPING BY TYPE ---
    const groups = {
        'PC': [], 'NPC': [], 'Location': [], 'Faction': [], 'Item': [], 'Lore': [], 'Other': []
    };
    
    visibleCodex.forEach(c => {
        const t = c.type;
        if (groups[t] !== undefined) {
            groups[t].push(c);
        } else {
            groups['Other'].push(c);
        }
    });

    const groupOrder = [
        { id: 'PC', name: 'Heroes & Player Characters', icon: 'fa-user-shield' },
        { id: 'NPC', name: 'Non-Player Characters', icon: 'fa-users' },
        { id: 'Location', name: 'Locations & Landmarks', icon: 'fa-map-location-dot' },
        { id: 'Faction', name: 'Factions & Organizations', icon: 'fa-flag' },
        { id: 'Item', name: 'Notable Items & Artifacts', icon: 'fa-gem' },
        { id: 'Lore', name: 'World Lore & History', icon: 'fa-book-journal-whills' },
        { id: 'Other', name: 'Uncategorized Records', icon: 'fa-folder' }
    ];
    
    let html = `
    <div class="animate-in fade-in duration-300 pb-12">
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
    `;
    
    if (visibleCodex.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-book-journal-whills text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">${codex.length === 0 ? 'The Codex is empty.' : 'No knowledge has been revealed to you yet.'}</p>
                <p class="text-xs sm:text-sm mt-2 font-sans">Create entries for NPCs, Locations, and Lore to auto-link them in your session logs.</p>
            </div>
        `;
    } else {
        html += `<div id="codex-folders" class="space-y-4">`;

        groupOrder.forEach(grp => {
            const items = groups[grp.id];
            if (items && items.length > 0) {
                const sorted = items.sort((a,b) => a.name.localeCompare(b.name));
                
                html += `
                <div class="codex-folder bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden" data-folder="${grp.id}">
                    <button class="w-full flex items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 hover:bg-stone-800 transition-colors border-b border-transparent" onclick="const content = this.nextElementSibling; content.classList.toggle('hidden'); this.querySelector('.folder-chevron').classList.toggle('rotate-180'); this.classList.toggle('border-stone-700');">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid ${grp.icon} text-lg w-6 text-center"></i>
                            <span class="font-serif font-bold text-base sm:text-lg tracking-wide">${grp.name}</span>
                            <span class="bg-stone-800 text-stone-400 text-[10px] px-2 py-0.5 rounded-full ml-2 border border-stone-700 font-sans">${items.length}</span>
                        </div>
                        <i class="fa-solid fa-chevron-down folder-chevron transition-transform duration-200 text-stone-500"></i>
                    </button>
                    
                    <div class="folder-content hidden p-3 sm:p-4 bg-[#fdfbf7]">
                        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                `;

                sorted.forEach(c => {
                    const isHeroOwner = camp.playerCharacters?.some(p => p.id === c.id && p.playerId === myUid);
                    const isAuthor = c.authorId === myUid;
                    const canEdit = isDM || isHeroOwner || isAuthor;
                    
                    const tagsStr = (c.tags || []).join(', ');
                    const vis = getVisStatus(c);
                    
                    const visBadge = canEdit ? `
                        <div class="relative z-10 flex-shrink-0 ml-2" onclick="event.stopPropagation()">
                            <input type="hidden" class="vis-mode-input" value="${vis.mode}">
                            <input type="hidden" class="vis-players-input" value="${vis.players}">
                            <button class="${vis.color} bg-[#f4ebd8] border px-1.5 py-0.5 rounded shadow-sm text-[9px] transition" onclick="window.appActions.openVisibilityMenu(this, 'codex', '${c.id}')" title="Visibility Settings">
                                <i class="fa-solid ${vis.icon}"></i>
                            </button>
                        </div>
                    ` : '';

                    html += `
                    <div class="codex-card bg-white p-0 rounded-sm border border-[#d4c5a9] shadow-sm flex group relative overflow-hidden hover:shadow-md hover:-translate-y-[1px] transition duration-200 cursor-pointer h-20 sm:h-24" onclick="window.appActions.viewCodex('${c.id}')" data-search="${c.name.toLowerCase()} ${c.type.toLowerCase()} ${tagsStr.toLowerCase()}">
                        <div class="absolute top-0 left-0 w-1 h-full bg-stone-400 group-hover:bg-amber-500 transition-colors z-20"></div>
                        
                        ${c.image ? `<div class="w-20 sm:w-24 h-full shrink-0 border-r border-[#d4c5a9] bg-stone-900 overflow-hidden relative z-10"><img src="${c.image}" alt="${c.name}" class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none'"></div>` : ''}
                        
                        <div class="p-3 flex-grow flex flex-col justify-center min-w-0 relative z-10">
                            <div class="flex justify-between items-start mb-1">
                                <h3 class="font-serif font-bold text-sm sm:text-base text-stone-900 truncate pr-2 leading-none" title="${c.name}">${c.name}</h3>
                                ${visBadge}
                            </div>
                            <div class="flex items-center gap-1 mb-1 flex-wrap overflow-hidden h-[18px]">
                                ${(c.tags || []).map(t => `<span class="text-[8px] font-bold uppercase tracking-wider text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded-sm truncate max-w-[80px]">${t}</span>`).join('')}
                            </div>
                            <p class="text-[10px] sm:text-[11px] text-stone-500 font-sans truncate italic leading-tight">"${c.desc || 'No description...'}"</p>
                        </div>
                    </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                </div>
                `;
            }
        });

        html += `</div>`; // Close codex-folders
    }
    
    html += `
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
