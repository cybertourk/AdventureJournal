import { getLibraryTabsHTML } from './ui-core.js';

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
    <div class="animate-in fade-in duration-300 pb-12 max-w-5xl mx-auto">
        
        ${getLibraryTabsHTML('codex')}

        <!-- Thematic Search Bar -->
        <div class="relative mb-6">
            <i class="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 text-sm"></i>
            <input type="text" id="codex-search" class="w-full pl-10 pr-4 py-3.5 bg-white border border-[#d4c5a9] text-stone-900 text-sm font-bold rounded-full focus:outline-none focus:border-amber-600 shadow-sm placeholder:font-normal placeholder:text-stone-400 transition-colors" placeholder="Search the archives..." onkeyup="window.filterCodex()">
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

export const _openCodexModal = (entry) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const container = document.getElementById('global-popup-container');
    if (!container || !camp) return;

    const isNew = entry.isNew || !entry.id;
    const id = entry.id || "";
    const name = entry.name || "";
    const type = entry.type || "NPC";
    const desc = entry.desc || "";
    const tags = entry.tags ? entry.tags.join(', ') : "";
    const image = entry.image || "";

    // Check editing permissions
    const isDM = camp._isDM;
    const myUid = window.appData.currentUserUid;
    const linkedPC = camp.playerCharacters?.find(p => p.id === id);
    const isHeroOwner = linkedPC && linkedPC.playerId === myUid;
    const isAuthor = entry.authorId === myUid;
    const canEdit = isDM || isHeroOwner || isAuthor || isNew;
    const canDelete = (isDM || isAuthor) && !linkedPC; // Core Hero profiles can only be deleted via the PC manager

    const viewHidden = isNew ? "hidden" : "";
    const editHidden = isNew ? "" : "hidden";

    let tagsHTML = `<span class="codex-tag">${type}</span>`;
    if (entry.tags) {
        tagsHTML += entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
    }

    const resolvedImage = image || (linkedPC ? linkedPC.image : "");
    const imgHTML = resolvedImage ? `<div class="mb-4 w-full h-48 sm:h-64 bg-stone-900 border border-[#d4c5a9] rounded-sm overflow-hidden shadow-inner"><img src="${resolvedImage}" class="w-full h-full object-contain object-top" alt="${name}" onerror="this.style.display='none'"></div>` : '';

    // --- DYNAMIC HERO INJECTION ---
    let pcDataHTML = '';
    if (linkedPC) {
        const parsedApp = linkedPC.appearance ? window.appActions.parseSmartText(linkedPC.appearance) : '<span class="text-stone-400 italic">No appearance recorded...</span>';
        pcDataHTML = `
            <div class="mb-4 bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-inner text-sm">
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">Characteristics</h4>
                <div class="grid grid-cols-2 gap-2 text-xs text-stone-700 mb-3">
                    <div><span class="font-bold text-stone-900">Gender:</span> ${linkedPC.gender || '--'}</div>
                    <div><span class="font-bold text-stone-900">Age:</span> ${linkedPC.age || '--'}</div>
                    <div><span class="font-bold text-stone-900">Size:</span> ${linkedPC.size || '--'}</div>
                    <div><span class="font-bold text-stone-900">Height:</span> ${linkedPC.height || '--'}</div>
                    <div><span class="font-bold text-stone-900">Weight:</span> ${linkedPC.weight || '--'}</div>
                    <div><span class="font-bold text-stone-900">Eyes:</span> ${linkedPC.eyes || '--'}</div>
                    <div><span class="font-bold text-stone-900">Hair:</span> ${linkedPC.hair || '--'}</div>
                    <div><span class="font-bold text-stone-900">Skin:</span> ${linkedPC.skin || '--'}</div>
                </div>
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">Appearance</h4>
                <div class="text-stone-800 text-sm leading-relaxed">${parsedApp}</div>
            </div>
        `;
    }

    const parsedDesc = desc ? window.appActions.parseSmartText(desc) : '<span class="text-stone-400 italic font-sans">No entries found...</span>';
    const descLabel = linkedPC ? "Public Knowledge (Rumors & Repute)" : "Description";
    const descPlaceholder = linkedPC ? "What do people know about this hero? Scribe their rumors, repute, and public knowledge..." : "Description... Codex names link automatically.";

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[17000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-lg border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-red-900 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-book-journal-whills text-amber-500 text-xl"></i>
                        <div>
                            <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">Codex Entry</h2>
                            <p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">${linkedPC ? 'Hero Profile' : 'Knowledge Base'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${(!isNew && canEdit) ? `<button id="cx-edit-btn" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center" title="Edit Entry"><i class="fa-solid fa-pen-nib"></i></button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>

                <!-- View Mode -->
                <div id="cx-view-mode" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] ${viewHidden}">
                    ${imgHTML}
                    <div class="mb-4">
                        <h3 class="text-2xl font-serif font-bold text-stone-900">${name}</h3>
                        <div class="mt-2">${tagsHTML}</div>
                    </div>
                    ${pcDataHTML}
                    <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">${descLabel}</h4>
                    <div class="text-stone-800 text-sm font-serif leading-relaxed">${parsedDesc}</div>
                </div>

                <!-- Edit Mode -->
                <div id="cx-edit-mode" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] ${editHidden}">
                    <input type="hidden" id="cx-modal-id" value="${id}">
                    <div class="bg-red-900 text-amber-50 text-xs font-bold uppercase tracking-wider py-1 px-3 inline-block rounded-sm mb-4 shadow-sm">
                        ${isNew ? 'Define New Entity' : 'Amend Record'}
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Name (Auto-Link Trigger)</label>
                        <input type="text" id="cx-modal-name" value="${name}" ${linkedPC ? 'readonly disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner">
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type</label>
                        <select id="cx-modal-type" ${linkedPC ? 'disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold">
                            <option value="PC" ${type==='PC'?'selected':''}>PC</option>
                            <option value="NPC" ${type==='NPC'?'selected':''}>NPC</option>
                            <option value="Location" ${type==='Location'?'selected':''}>Location</option>
                            <option value="Faction" ${type==='Faction'?'selected':''}>Faction</option>
                            <option value="Item" ${type==='Item'?'selected':''}>Item</option>
                            <option value="Lore" ${type==='Lore'?'selected':''}>Lore</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Tags (Comma Separated)</label>
                        <input type="text" id="cx-modal-tags" value="${tags}" ${linkedPC ? 'readonly disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold" placeholder="e.g. Ally, Vendor">
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Image URL</label>
                        <input type="text" id="cx-modal-image" value="${image}" ${linkedPC ? 'readonly disabled title="Edit this hero\'s image in the PC Manager"' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold" placeholder="https://example.com/image.jpg">
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">${descLabel}</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9] overflow-x-auto hide-scrollbar">
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'bold')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'italic')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'underline')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h1')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h2')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'list')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.defineEntryFromSelection('cx-modal-desc')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Define Highlighted Text"><i class="fa-solid fa-book-medical mr-1"></i> Define</button>
                            </div>
                        </div>
                        <textarea id="cx-modal-desc" class="w-full h-40 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-red-900 outline-none resize-none rounded-b-sm shadow-inner custom-scrollbar" placeholder="${descPlaceholder}">${desc}</textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div id="cx-edit-actions" class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between gap-3 shrink-0 ${editHidden}">
                    ${(!isNew && canDelete) ? `<button onclick="window.appActions.deleteCodexEntry('${id}')" class="w-full sm:w-auto px-4 py-2 bg-red-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-red-800 transition"><i class="fa-solid fa-trash mr-1"></i> Delete</button>` : `<div class="hidden sm:block">${linkedPC ? '<span class="text-[10px] uppercase text-stone-500 font-bold"><i class="fa-solid fa-lock mr-1"></i> Core Hero Profile</span>' : ''}</div>`}
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="${isNew ? `document.getElementById('global-popup-container').innerHTML = '';` : `document.getElementById('cx-view-mode').classList.remove('hidden'); document.getElementById('cx-edit-mode').classList.add('hidden'); document.getElementById('cx-edit-actions').classList.add('hidden');`}" class="flex-1 sm:flex-none px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveCodexEntry()" class="flex-1 sm:flex-none px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!isNew && canEdit) {
        const editBtn = document.getElementById('cx-edit-btn');
        if (editBtn) {
            editBtn.onclick = () => {
                document.getElementById('cx-view-mode').classList.add('hidden');
                document.getElementById('cx-edit-mode').classList.remove('hidden');
                document.getElementById('cx-edit-actions').classList.remove('hidden');
            };
        }
    }
};
