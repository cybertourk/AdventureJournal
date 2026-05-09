import { getLibraryTabsHTML } from './ui-core.js';

export function getWebsHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const allWebs = camp.webs || [];
    
    // Filter webs so players only see public ones
    const visibleWebs = isDM ? allWebs : allWebs.filter(w => w.visibility?.mode === 'public');
    
    // If the active web is hidden/deleted, fallback to the first visible web
    let activeWeb = state.activeWeb;
    if (!activeWeb || (!isDM && activeWeb.visibility?.mode !== 'public')) {
        activeWeb = visibleWebs.length > 0 ? visibleWebs[0] : null;
        if (activeWeb && state.activeWebId !== activeWeb.id) {
            // Silently sync the state ID so the dropdown matches
            state.activeWebId = activeWeb.id;
        }
    }

    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-150px)]">
        
        ${getLibraryTabsHTML('webs')}
    `;

    if (visibleWebs.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm mt-4">
                <i class="fa-solid fa-diagram-project text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">${isDM ? 'No Relationship Webs have been forged.' : 'No Relationship Webs have been made public yet.'}</p>
                ${isDM ? `<button onclick="window.appActions.createNewWeb()" class="mt-6 px-6 py-2 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-stone-800 transition shadow-md"><i class="fa-solid fa-plus mr-2"></i> Create First Map</button>` : ''}
            </div>
        </div>
        `;
        return html;
    }

    // Prepare Node Dropdowns for DM Editor
    let nodeOptions = '<option value="">-- Select Node --</option>';
    if (activeWeb && activeWeb.nodes) {
        const resolved = activeWeb.nodes.map(n => {
            let c = camp.codex?.find(x => x.id === n.id);
            if (!c) c = camp.playerCharacters?.find(x => x.id === n.id);
            return { id: n.id, name: c ? c.name : 'Unknown Entry' };
        }).sort((a,b) => a.name.localeCompare(b.name));
        
        nodeOptions += resolved.map(n => `<option value="${n.id}">${n.name}</option>`).join('');
    }

    const isPublic = activeWeb.visibility?.mode === 'public';
    const visIcon = isPublic ? 'fa-eye text-emerald-500' : 'fa-eye-slash text-red-500';
    const visTitle = isPublic ? 'Map is Public' : 'Map is Hidden (DM Only)';

    html += `
        <!-- Main Web Interface -->
        <div class="bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col flex-grow relative">
            
            <!-- Map Toolbar -->
            <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-stone-900 p-2 sm:p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-amber-700 gap-3 sm:gap-0 shadow-md z-20">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <i class="fa-solid fa-diagram-project text-amber-600 ml-1 mr-1 hidden sm:block"></i>
                    <select onchange="window.appActions.switchWeb(this.value)" class="flex-grow sm:w-64 p-2 bg-stone-800 border border-stone-600 text-amber-50 rounded-sm outline-none focus:border-amber-500 font-bold text-sm sm:text-base cursor-pointer shadow-inner">
                        ${visibleWebs.map(w => `<option value="${w.id}" ${w.id === activeWeb.id ? 'selected' : ''}>${w.name}</option>`).join('')}
                    </select>
                    ${isDM ? `
                        <button onclick="window.appActions.toggleWebVisibility()" class="w-10 h-10 bg-stone-800 border border-stone-600 rounded-sm flex items-center justify-center hover:bg-stone-700 transition shadow-sm shrink-0" title="${visTitle}">
                            <i class="fa-solid ${visIcon}"></i>
                        </button>
                        <button onclick="window.appActions.openWebEditModal('map', null)" class="w-10 h-10 bg-stone-800 border border-stone-600 rounded-sm flex items-center justify-center hover:bg-stone-700 hover:text-amber-400 text-stone-300 transition shadow-sm shrink-0" title="Rename Map">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    ` : `
                        <div class="w-10 h-10 flex items-center justify-center text-stone-400" title="Viewing Public Map">
                            <i class="fa-solid fa-eye"></i>
                        </div>
                    `}
                </div>
                
                <div class="flex gap-2 w-full sm:w-auto self-end flex-shrink-0">
                    ${isDM ? `
                        <button onclick="window.appActions.syncWebWithCodex()" class="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded-sm transition shadow-sm" title="Sync Map with Codex (Removes Orphans)">
                            <i class="fa-solid fa-rotate w-4 h-4 text-center"></i>
                        </button>
                        <button onclick="document.getElementById('dm-web-tools').classList.toggle('hidden');" class="flex-1 sm:flex-none px-3 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-sm bg-amber-700 text-amber-50 hover:bg-amber-600 border border-amber-900">
                            <i class="fa-solid fa-tools mr-1.5"></i> Map Tools
                        </button>
                        <button onclick="window.appActions.createNewWeb()" class="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-600 rounded-sm transition shadow-sm" title="Create New Web">
                            <i class="fa-solid fa-plus w-4 h-4 text-center"></i>
                        </button>
                        <button onclick="window.appActions.deleteCurrentWeb()" class="px-3 py-2 bg-stone-800 hover:bg-red-900 text-stone-300 hover:text-white border border-stone-600 rounded-sm transition shadow-sm" title="Delete Map">
                            <i class="fa-solid fa-trash w-4 h-4 text-center"></i>
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- DM Map Tools (Collapsible) -->
            ${isDM ? `
            <div id="dm-web-tools" class="hidden bg-[#f4ebd8] border-b border-[#d4c5a9] p-3 sm:p-4 shadow-md z-10 shrink-0">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <!-- Add Node Panel -->
                    <div class="bg-white border border-[#d4c5a9] rounded-sm p-3 shadow-sm relative">
                        <h4 class="text-[10px] uppercase font-bold text-amber-900 tracking-widest mb-2 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-location-dot mr-1"></i> Add / Search Node</h4>
                        <div class="flex gap-2 relative">
                            <input type="text" id="web-node-search" oninput="window.appActions.searchWebCodex(this.value)" placeholder="Search Codex..." class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" autocomplete="off">
                            <input type="hidden" id="web-node-codex-id">
                            <button onclick="window.appActions.addWebNode()" class="px-3 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm shrink-0">Add</button>
                            
                            <!-- Search Results Dropdown -->
                            <div id="web-node-search-results" class="absolute z-50 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-40 overflow-y-auto hidden top-[32px] custom-scrollbar text-xs"></div>
                        </div>
                    </div>

                    <!-- Add Connection Panel -->
                    <div class="bg-white border border-[#d4c5a9] rounded-sm p-3 shadow-sm">
                        <h4 class="text-[10px] uppercase font-bold text-amber-900 tracking-widest mb-2 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-link mr-1"></i> Create Connection</h4>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <select id="web-conn-source" class="flex-grow w-1/2 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-inner bg-white">
                                    ${nodeOptions}
                                </select>
                                <i class="fa-solid fa-arrow-right text-stone-400 text-[10px]"></i>
                                <select id="web-conn-target" class="flex-grow w-1/2 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-inner bg-white">
                                    ${nodeOptions}
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <select id="web-conn-style" class="w-1/3 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-inner bg-white">
                                    <option value="ally">Ally (Solid)</option>
                                    <option value="enemy">Enemy (Red)</option>
                                    <option value="affiliated">Affiliated (Dotted)</option>
                                    <option value="debt">Debt / Boon (Amber)</option>
                                    <option value="blood">Family / Blood (Thick)</option>
                                </select>
                                <input type="text" id="web-conn-label" placeholder="Label (Optional)" class="flex-grow w-1/3 p-1.5 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                                <button onclick="window.appActions.addWebConnection()" class="w-1/3 px-3 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm">Connect</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            ` : ''}

            <!-- Canvas Area -->
            <div class="flex-grow bg-[#fdfbf7] relative overflow-hidden flex items-center justify-center bg-[radial-gradient(#d4c5a9_1px,transparent_1px)] [background-size:20px_20px]">
                <div id="mermaid-wrapper" class="origin-center transition-transform duration-200 cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center overflow-auto custom-scrollbar" data-zoom="1.0">
                    <div id="mermaid-container" class="mermaid w-max h-max p-10 min-w-full min-h-full flex items-center justify-center">
                        <div class="text-stone-400 italic font-serif flex flex-col items-center gap-2">
                            <i class="fa-solid fa-spinner fa-spin text-2xl"></i> Mapping Connections...
                        </div>
                    </div>
                </div>

                <!-- Legend & Zoom Controls -->
                <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                    <div class="bg-stone-900/90 text-stone-300 p-2 rounded-sm text-[8px] sm:text-[9px] uppercase font-bold tracking-widest border border-stone-700 shadow-lg pointer-events-auto backdrop-blur-sm">
                        <div class="flex flex-col gap-1.5">
                            <div class="flex items-center gap-2"><div class="w-4 border-b-2 border-[#78716c]"></div> Ally</div>
                            <div class="flex items-center gap-2"><div class="w-4 border-b-2 border-red-600"></div> Enemy</div>
                            <div class="flex items-center gap-2"><div class="w-4 border-b-2 border-[#78716c] border-dashed"></div> Affiliated</div>
                            <div class="flex items-center gap-2"><div class="w-4 border-b-2 border-amber-600 border-dashed"></div> Debt</div>
                            <div class="flex items-center gap-2"><div class="w-4 border-b-4 border-stone-800"></div> Family</div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2 pointer-events-auto">
                        <button onclick="window.appActions.setWebZoom('in')" class="w-8 h-8 sm:w-10 sm:h-10 bg-stone-900 text-stone-300 hover:text-amber-500 hover:bg-stone-800 rounded-sm shadow-lg border border-stone-700 flex justify-center items-center text-sm sm:text-base transition"><i class="fa-solid fa-plus"></i></button>
                        <button onclick="window.appActions.setWebZoom('reset')" class="w-8 h-8 sm:w-10 sm:h-10 bg-stone-900 text-stone-300 hover:text-amber-500 hover:bg-stone-800 rounded-sm shadow-lg border border-stone-700 flex justify-center items-center text-[10px] sm:text-xs font-bold uppercase transition">1x</button>
                        <button onclick="window.appActions.setWebZoom('out')" class="w-8 h-8 sm:w-10 sm:h-10 bg-stone-900 text-stone-300 hover:text-amber-500 hover:bg-stone-800 rounded-sm shadow-lg border border-stone-700 flex justify-center items-center text-sm sm:text-base transition"><i class="fa-solid fa-minus"></i></button>
                    </div>
                </div>
            </div>
            
            <!-- Modals -->
            ${isDM ? `
            <div id="web-edit-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-3 backdrop-blur-sm animate-in pointer-events-auto">
                <div class="bg-[#f4ebd8] p-4 rounded-sm w-full max-w-[300px] border border-[#d4c5a9] shadow-2xl relative overflow-visible">
                    <h3 id="web-edit-modal-title" class="font-serif font-bold text-base text-amber-900 mb-3 border-b border-[#d4c5a9] pb-1.5"><i class="fa-solid fa-pen mr-1.5"></i> Edit</h3>
                    <input type="hidden" id="web-edit-type">
                    <input type="hidden" id="web-edit-id">

                    <div id="web-edit-name-container" class="hidden mb-4">
                        <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Map Name</label>
                        <input type="text" id="web-edit-name" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                    </div>

                    <div id="web-edit-conn-container" class="hidden mb-4 space-y-3">
                        <div>
                            <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Connection Label</label>
                            <input type="text" id="web-edit-conn-label" placeholder="Optional..." class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Connection Style</label>
                            <select id="web-edit-conn-style" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                                <option value="ally">Ally (Solid)</option>
                                <option value="enemy">Enemy (Red)</option>
                                <option value="affiliated">Affiliated (Dotted)</option>
                                <option value="debt">Debt / Boon (Amber)</option>
                                <option value="blood">Family / Blood (Thick)</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9]">
                        <button onclick="document.getElementById('web-edit-modal').classList.add('hidden')" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                        <button onclick="window.appActions.saveWebEdit()" class="px-3 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[8px] shadow-md">Save</button>
                    </div>
                </div>
            </div>

            <div id="web-move-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-3 backdrop-blur-sm animate-in pointer-events-auto">
                <div class="bg-[#f4ebd8] p-4 rounded-sm w-full max-w-[300px] border border-[#d4c5a9] shadow-2xl relative overflow-visible">
                    <h3 class="font-serif font-bold text-base text-blue-900 mb-3 border-b border-[#d4c5a9] pb-1.5"><i class="fa-solid fa-arrows-to-circle mr-1.5"></i> Add to Group</h3>
                    <p class="text-[8px] text-stone-600 mb-3 font-sans italic leading-snug">Move this node inside a Faction or Location boundary.</p>
                    
                    <input type="hidden" id="web-move-node-id">
                    <select id="web-move-select" class="w-full mb-4 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-blue-600 bg-white"></select>

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9]">
                        <button onclick="document.getElementById('web-move-modal').classList.add('hidden')" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                        <button onclick="window.appActions.saveWebMove()" class="px-3 py-1.5 bg-blue-800 text-white rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[8px] shadow-md">Move</button>
                    </div>
                </div>
            </div>
            ` : ''}

        </div>
    </div>
    
    <!-- Auto-Execute Engine Trigger -->
    <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" onerror="if(window.appActions && window.appActions.renderMermaidWeb) { setTimeout(window.appActions.renderMermaidWeb, 50); }" class="hidden">
    `;

    return html;
}
