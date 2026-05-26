import { getLibraryTabsHTML } from './ui-core.js';

export function getCodexHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    
    // Intercept existing codex entries: if an entry is linked to a hero, force its type to 'PC'
    const rawCodex = (camp.codex || []).map(c => {
        const linkedPC = camp.playerCharacters?.find(pc => pc.id === c.id);
        if (linkedPC) {
            return { ...c, type: 'PC', image: c.image || linkedPC.image };
        }
        if (c.type === 'Lore / Rule') return { ...c, type: 'Lore' };
        return c;
    });
    
    // --- LEGACY HERO INJECTION ---
    const autoHeroes = (camp.playerCharacters || []).filter(pc => !rawCodex.some(c => c.id === pc.id)).map(pc => ({
        id: pc.id,
        name: pc.name,
        type: 'PC',
        tags: ['Hero', pc.race, pc.classLevel].filter(Boolean),
        desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
        visibility: { mode: 'public' },
        image: pc.image
    }));

    const codex = [...rawCodex, ...autoHeroes];
    
    // --- ALPHABETICAL TAG EXTRACTION & GROUPING ---
    const allTags = [...new Set(codex.flatMap(c => c.tags || []))].sort((a, b) => a.localeCompare(b));
    const groupedTags = {};
    allTags.forEach(tag => {
        let firstLetter = tag.charAt(0).toUpperCase();
        if (!/[A-Z]/.test(firstLetter)) firstLetter = '#';
        if (!groupedTags[firstLetter]) groupedTags[firstLetter] = [];
        groupedTags[firstLetter].push(tag);
    });

    let tagsHtml = '';
    Object.keys(groupedTags).sort().forEach(letter => {
        tagsHtml += `
            <div class="mb-4">
                <div class="sticky top-0 bg-stone-200 text-stone-700 font-bold text-[10px] px-2 py-1 rounded-sm uppercase tracking-widest z-10 shadow-sm border border-stone-300">${letter}</div>
                <div class="flex flex-wrap gap-1.5 mt-2 pl-1 pb-1">
                    ${groupedTags[letter].map(tag => {
                        const safeTag = tag.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `<button onclick="window.toggleCodexTag('${safeTag}')" class="px-2.5 py-1 bg-white border border-stone-300 rounded-sm text-[10px] uppercase font-bold text-stone-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-400 transition-all tag-chip shadow-sm" data-tag="${safeTag}">${tag}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    const isDM = camp._isDM;
    const myUid = state.currentUserUid;

    // --- FOG OF WAR FILTER ---
    const isVisibleToPlayer = (item) => {
        if (isDM || item.authorId === myUid) return true;
        const isHeroOwner = camp.playerCharacters?.some(p => p.id === item.id && p.playerId === myUid);
        if (isHeroOwner) return true;

        const vis = item.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'hidden') return false;
        if (vis.mode === 'specific' && vis.visibility?.visibleTo && vis.visibility.visibleTo.includes(myUid)) return true;
        return false;
    };

    const visibleCodex = codex.filter(isVisibleToPlayer);

    // --- VISIBILITY UI HELPER ---
    const getVisStatus = (item) => {
        const mode = item?.visibility?.mode || 'public';
        const players = (item?.visibility?.visibleTo || []).join(',');
        let icon = 'fa-eye';
        let color = 'text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 border-emerald-200';
        if (mode === 'hidden') { icon = 'fa-eye-slash'; color = 'text-red-700 hover:text-red-600 hover:bg-red-50 border-red-200'; } 
        else if (mode === 'specific') { icon = 'fa-user-lock'; color = 'text-blue-600 hover:text-blue-500 hover:bg-blue-50 border-blue-200'; }
        return { mode, players, icon, color };
    };

    const groups = {
        'PC': [], 'NPC': [], 'Location': [], 'Faction': [], 'Route': [], 'Item': [], 'Lore': [], 'Other': []
    };
    
    visibleCodex.forEach(c => {
        const t = c.type;
        if (groups[t] !== undefined) groups[t].push(c);
        else groups['Other'].push(c);
    });

    const groupOrder = [
        { id: 'PC', name: 'Heroes & Player Characters', icon: 'fa-user-shield' },
        { id: 'NPC', name: 'Non-Player Characters', icon: 'fa-users' },
        { id: 'Location', name: 'Locations & Landmarks', icon: 'fa-map-location-dot' },
        { id: 'Faction', name: 'Factions & Organizations', icon: 'fa-flag' },
        { id: 'Route', name: 'Travel Routes', icon: 'fa-route' },
        { id: 'Item', name: 'Notable Items & Artifacts', icon: 'fa-gem' },
        { id: 'Lore', name: 'World Lore & History', icon: 'fa-book-journal-whills' },
        { id: 'Other', name: 'Uncategorized Records', icon: 'fa-folder' }
    ];
    
    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-5xl mx-auto">
        ${getLibraryTabsHTML('codex')}

        <!-- Thematic Search Bar & Collapsible Filters -->
        <div class="mb-6 space-y-4">
            <div class="relative">
                <i class="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 text-sm"></i>
                <input type="text" id="codex-search" class="w-full pl-10 pr-4 py-3.5 bg-white border border-[#d4c5a9] text-stone-900 text-sm font-bold rounded-sm focus:outline-none focus:border-amber-600 shadow-sm placeholder:font-normal placeholder:text-stone-400 transition-colors" placeholder="Search the archives..." onkeyup="window.updateCodexFilters()">
            </div>
            
            <div class="bg-white border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                <button onclick="const el=document.getElementById('tag-box-content'); el.classList.toggle('hidden'); if(el.classList.contains('hidden')) window.toggleCodexTag('All');" class="w-full flex justify-between items-center p-3 text-[10px] font-bold text-stone-600 uppercase tracking-widest hover:bg-stone-50">
                    <span><i class="fa-solid fa-tags mr-1"></i> Filter by Tags</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div id="tag-box-content" class="hidden p-4 border-t border-[#d4c5a9]">
                    <div class="flex justify-between items-center mb-3 border-b border-[#d4c5a9] pb-3">
                        <p class="text-[9px] text-stone-400 normal-case tracking-normal italic">Entries must contain ALL selected tags.</p>
                        <button id="tag-chip-all" onclick="window.toggleCodexTag('All')" class="px-3 py-1.5 bg-stone-900 text-amber-500 border border-stone-700 rounded-sm text-[10px] uppercase font-bold transition-all shadow-sm">Clear Filters</button>
                    </div>
                    <div class="h-48 overflow-y-auto custom-scrollbar pr-2 mt-1">
                        ${tagsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (visibleCodex.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-book-journal-whills text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">${codex.length === 0 ? 'The Codex is empty.' : 'No knowledge has been revealed to you yet.'}</p>
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
                    <div class="codex-card bg-white p-0 rounded-sm border border-[#d4c5a9] shadow-sm flex group relative overflow-hidden hover:shadow-md hover:-translate-y-[1px] transition duration-200 cursor-pointer h-20 sm:h-24" onclick="window.appActions.viewCodex('${c.id}')" data-search="${c.name.toLowerCase()} ${c.type.toLowerCase()} ${tagsStr.toLowerCase()}" data-tags='${JSON.stringify(c.tags || [])}'>
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
    
    html += `</div>`;
    
    // Apply filters immediately to respect persisted state across re-renders
    setTimeout(() => { if (window.updateCodexFilters) window.updateCodexFilters(); }, 50);

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

    const isLibraryTome = !state.activeSessionId && !state.activeAdventureId;

    let html = `
    <div class="animate-in fade-in duration-300 max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-150px)]">
        ${isLibraryTome ? getLibraryTabsHTML('tome') : ''}
        <div class="bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col flex-grow">
            <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-stone-900 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-red-900 gap-3 sm:gap-0 shadow-md z-10">
                <h2 class="text-base sm:text-xl font-serif font-bold flex items-center w-full sm:w-auto min-w-0">
                    <i class="fa-solid fa-scroll mr-2 sm:mr-3 text-red-700 flex-shrink-0"></i> 
                    <span class="truncate pr-2">${title}</span>
                </h2>
                <div class="flex gap-2 w-full sm:w-auto self-end flex-shrink-0">
                    <button id="journal-copy-btn" onclick="window.appActions.copyJournal()" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500">
                        <i class="fa-solid fa-copy mr-1 sm:mr-2"></i> Copy
                    </button>
                    <button onclick="window.appActions.closeJournal()" class="flex-none p-2 bg-stone-800 hover:bg-red-900 text-stone-300 hover:text-white border border-stone-600 rounded-sm transition shadow-md" title="Close Scroll">
                        <i class="fa-solid fa-xmark w-4 h-4 sm:w-5 sm:h-5"></i>
                    </button>
                </div>
            </div>
            
            <div class="flex-grow p-0 bg-[#fdfbf7] overflow-hidden relative">
                <div id="journal-textarea" class="w-full h-full p-4 sm:p-8 bg-transparent text-stone-900 font-serif text-[10px] sm:text-sm leading-relaxed overflow-y-auto custom-scrollbar pb-32">
                    ${formattedContent}
                </div>
            </div>
        </div>
    </div>
    `;
    return html;
}

// --- BIND JAVASCRIPT LOGIC TO GLOBAL WINDOW DIRECTLY ---
// By binding these directly to 'window' rather than 'window.appActions', we guarantee they
// won't be overwritten by data.js later in the load cycle!
if (typeof window !== 'undefined') {
    window.appData = window.appData || {};
    window.appData.activeCodexTags = window.appData.activeCodexTags || new Set();

    window.toggleCodexTag = (tag) => {
        if (tag === 'All') {
            window.appData.activeCodexTags.clear();
        } else {
            if (window.appData.activeCodexTags.has(tag)) {
                window.appData.activeCodexTags.delete(tag);
            } else {
                window.appData.activeCodexTags.add(tag);
            }
        }
        window.updateCodexFilters();
    };

    window.updateCodexFilters = () => {
        const searchInput = document.getElementById('codex-search');
        if (!searchInput) return;
        
        const query = searchInput.value.toLowerCase().trim();
        const folders = document.querySelectorAll('.codex-folder');
        const chips = document.querySelectorAll('.tag-chip');
        const allBtn = document.getElementById('tag-chip-all');
        
        // Update UI for Tag Chips
        chips.forEach(c => {
            if (window.appData.activeCodexTags.has(c.dataset.tag)) {
                c.classList.add('bg-amber-100', 'border-amber-400', 'text-amber-900');
                c.classList.remove('bg-white', 'border-stone-300', 'text-stone-600');
            } else {
                c.classList.remove('bg-amber-100', 'border-amber-400', 'text-amber-900');
                c.classList.add('bg-white', 'border-stone-300', 'text-stone-600');
            }
        });

        if (window.appData.activeCodexTags.size === 0) {
            if (allBtn) {
                allBtn.classList.add('bg-stone-900', 'text-amber-500', 'border-stone-700');
                allBtn.classList.remove('bg-white', 'text-stone-600', 'border-stone-300');
            }
        } else {
            if (allBtn) {
                allBtn.classList.remove('bg-stone-900', 'text-amber-500', 'border-stone-700');
                allBtn.classList.add('bg-white', 'text-stone-600', 'border-stone-300');
            }
        }
        
        // Filter Folders and Cards
        folders.forEach(f => {
            const cards = f.querySelectorAll('.codex-card');
            let hasVisible = false;
            
            cards.forEach(c => {
                const tagsRaw = c.getAttribute('data-tags');
                const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
                const searchData = c.getAttribute('data-search') || '';
                
                const matchesSearch = query === '' || searchData.includes(query);
                
                let matchesTags = true;
                if (window.appData.activeCodexTags.size > 0) {
                    for (let activeTag of window.appData.activeCodexTags) {
                        if (!tags.includes(activeTag)) {
                            matchesTags = false;
                            break;
                        }
                    }
                }

                if (matchesSearch && matchesTags) {
                    c.style.display = 'flex';
                    hasVisible = true;
                } else {
                    c.style.display = 'none';
                }
            });

            const content = f.querySelector('.folder-content');
            const chevron = f.querySelector('.folder-chevron');
            const button = f.querySelector('button');

            if (query !== '' || window.appData.activeCodexTags.size > 0) {
                if (hasVisible) {
                    f.style.display = 'block';
                    content.classList.remove('hidden');
                    chevron.classList.add('rotate-180');
                    button.classList.add('border-stone-700');
                } else {
                    f.style.display = 'none';
                }
            } else {
                f.style.display = hasVisible ? 'block' : 'none';
                // Reset styling when completely cleared to let user manually expand/collapse
                if (hasVisible) {
                    content.classList.add('hidden');
                    chevron.classList.remove('rotate-180');
                    button.classList.remove('border-stone-700');
                }
            }
        });
    };
}
