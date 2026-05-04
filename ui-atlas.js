export function getAtlasHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const config = camp.atlasConfig || {
        url: 'https://files.catbox.moe/o3d82f.jpg',
        pixelsPerSquare: 50,
        milesPerSquare: 10,
        showGrid: true
    };
    
    const isDM = camp._isDM;
    const activeRoutes = state.activeAtlasRoutes || [];
    const isFullScreen = state.isAtlasFullScreen;

    const containerClasses = isFullScreen 
        ? "fixed inset-0 z-[9000] w-full h-[100dvh] bg-[#1c1917] flex flex-col animate-in zoom-in-95 duration-200"
        : "animate-in fade-in duration-300 w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] relative";

    return `
    <div class="${containerClasses}">
        
        <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-3 sm:p-4 flex justify-between items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-amber-700 shadow-md z-10 rounded-t-sm">
            <div class="flex items-center min-w-0">
                <i class="fa-solid fa-map-location-dot mr-2 sm:mr-3 text-amber-600 flex-shrink-0 text-lg sm:text-xl"></i> 
                <div>
                    <h2 class="text-sm sm:text-lg font-serif font-bold truncate leading-tight">Atlas of ${camp.name.replace(/"/g, '&quot;')}</h2>
                    <p class="text-[9px] sm:text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-0.5">Left-Click: Action | Right-Click/Two-Finger: Pan</p>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="window.appActions.toggleAtlasFullScreen()" class="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-600 transition flex justify-center items-center shadow-sm" title="${isFullScreen ? 'Exit Full Screen' : 'Full Screen'}"><i class="fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'}"></i></button>
                <button onclick="window.appActions.toggleAtlasLayers()" class="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-600 transition flex justify-center items-center shadow-sm" title="Map Layers & Routes"><i class="fa-solid fa-layer-group"></i></button>
                ${isDM ? `<button onclick="window.appActions.toggleAtlasSettings()" class="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-600 transition flex justify-center items-center shadow-sm" title="Map Settings"><i class="fa-solid fa-gear"></i></button>` : ''}
            </div>
        </div>

        <div class="flex-grow relative bg-[#1c1917] overflow-hidden ${isFullScreen ? '' : 'rounded-b-sm border-x-2 border-b-2 border-stone-800 shadow-[0_15px_40px_rgba(0,0,0,0.7)]'}" id="atlas-wrapper">
            <div id="map-container" class="absolute inset-0 z-0 cursor-crosshair"></div>
            
            <div class="absolute ${isFullScreen ? 'bottom-24 sm:bottom-20' : 'bottom-32 sm:bottom-28'} left-4 z-30 bg-stone-900/90 text-amber-50 px-3 py-2 rounded-sm shadow-md border border-stone-600 flex flex-col gap-1 pointer-events-none transition-all duration-300" id="scale-indicator">
                <div class="text-[10px] uppercase tracking-widest font-bold text-stone-400 text-center" id="scale-text">${config.milesPerSquare} Miles</div>
                <div class="h-1.5 border-x-2 border-b-2 border-amber-500 transition-all duration-100 ease-linear" id="scale-bar" style="width: ${config.pixelsPerSquare}px;"></div>
            </div>

            <div id="drawing-stats" class="hidden absolute top-20 left-1/2 transform -translate-x-1/2 bg-stone-900 border-2 border-amber-600 text-amber-50 px-3 sm:px-4 py-2 rounded-sm shadow-xl z-40 font-bold flex flex-wrap items-center justify-center gap-3 animate-in whitespace-nowrap w-max max-w-[90vw]">
                <div class="flex items-center gap-2 sm:gap-3 justify-center">
                    <i class="fa-solid fa-route text-amber-500 text-lg sm:text-xl"></i>
                    <div class="flex flex-col">
                        <span class="text-[9px] sm:text-[10px] uppercase text-stone-400 tracking-widest">Route Distance</span>
                        <span id="dist-val" class="text-sm sm:text-base text-emerald-400">0 Miles</span>
                    </div>
                </div>
                <div class="w-px h-8 bg-stone-700 hidden sm:block"></div>
                <div class="flex gap-2 justify-center w-full sm:w-auto border-t border-stone-700 pt-2 sm:border-none sm:pt-0 mt-1 sm:mt-0">
                    <button onclick="window.appActions.atlasUndoLastPoint()" class="flex-1 sm:flex-none bg-stone-700 text-stone-300 px-3 py-1.5 rounded-sm text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-stone-600 hover:text-white transition shadow-sm border border-stone-500"><i class="fa-solid fa-rotate-left mr-1"></i> Undo</button>
                    ${isDM ? `<button onclick="window.appActions.atlasFinishDrawing()" class="flex-1 sm:flex-none bg-amber-600 text-stone-900 px-3 py-1.5 rounded-sm text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-amber-500 transition shadow-sm font-black"><i class="fa-solid fa-check mr-1"></i> Save Route</button>` : `<button onclick="window.appActions.setAtlasMode('pan')" class="flex-1 sm:flex-none bg-amber-600 text-stone-900 px-3 py-1.5 rounded-sm text-[9px] sm:text-[10px] uppercase tracking-wider hover:bg-amber-500 transition shadow-sm font-black"><i class="fa-solid fa-times mr-1"></i> End Path</button>`}
                </div>
            </div>

            <div class="absolute ${isFullScreen ? 'bottom-6 sm:bottom-8' : 'top-4'} left-0 right-0 flex justify-center z-40 px-4 pointer-events-none transition-all duration-300">
                <nav class="bg-stone-900 border-2 border-stone-700 shadow-[0_15px_30px_rgba(0,0,0,0.8)] rounded-full w-full max-w-xs h-12 sm:h-14 flex items-center justify-between px-2 pointer-events-auto bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                    <button onclick="window.appActions.setAtlasMode('pan')" id="mode-pan" class="tool-btn flex items-center justify-center w-1/3 text-amber-500 bg-stone-800 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-hand text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ml-1.5 sm:ml-2 hidden sm:inline">Pan</span>
                    </button>
                    
                    ${isDM ? `<div class="w-px h-6 sm:h-8 bg-stone-700"></div>
                    <button onclick="window.appActions.setAtlasMode('pin')" id="mode-pin" class="tool-btn flex items-center justify-center w-1/3 text-stone-400 hover:text-red-400 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-location-dot text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ml-1.5 sm:ml-2 hidden sm:inline">Pin</span>
                    </button>` : ''}
                    
                    <div class="w-px h-6 sm:h-8 bg-stone-700"></div>
                    
                    <button onclick="window.appActions.setAtlasMode('draw')" id="mode-draw" class="tool-btn flex items-center justify-center ${isDM ? 'w-1/3' : 'w-1/2'} text-stone-400 hover:text-blue-400 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-pen-nib text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ml-1.5 sm:ml-2 hidden sm:inline">Path</span>
                    </button>
                </nav>
            </div>
            
            <div id="atlas-layers-panel" class="hidden absolute top-4 right-4 z-50 animate-in pointer-events-auto shadow-2xl">
                <div class="bg-[#f4ebd8] p-4 sm:p-5 rounded-sm w-72 sm:w-80 border border-[#d4c5a9] border-t-4 border-t-amber-700 relative max-h-[80vh] flex flex-col">
                    <button onclick="window.appActions.toggleAtlasLayers()" class="absolute top-2 right-3 text-stone-500 hover:text-red-900"><i class="fa-solid fa-xmark text-lg"></i></button>
                    <h2 class="text-sm font-serif font-bold text-amber-900 mb-3 border-b border-[#d4c5a9] pb-2 shrink-0"><i class="fa-solid fa-layer-group mr-1.5 text-stone-500"></i> Map Layers</h2>
                    
                    <div class="overflow-y-auto custom-scrollbar pr-1 flex-grow space-y-4">
                        <div>
                            <h3 class="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Travel Routes</h3>
                            <div id="atlas-route-checkboxes" class="bg-white border border-[#d4c5a9] rounded-sm shadow-inner overflow-hidden">
                                ${(camp.atlasRoutes || []).length === 0 ? '<p class="p-3 text-[10px] italic text-stone-400">No routes inscribed yet.</p>' : ''}
                                ${(camp.atlasRoutes || []).map(r => {
                                    let routeName = r.name; 
                                    if (r.codexId) {
                                        const cEntry = (camp.codex || []).find(c => c.id === r.codexId);
                                        if (cEntry) routeName = cEntry.name;
                                    }
                                    if (!routeName) routeName = "Unknown Route";
                                    const safeName = routeName.replace(/"/g, '&quot;');
                                    
                                    return `
                                    <div class="flex items-center justify-between p-2 border-b border-[#d4c5a9] last:border-b-0 hover:bg-stone-50 transition">
                                        <label class="flex items-center gap-2 cursor-pointer w-full text-[10px] font-bold uppercase tracking-widest text-stone-700 hover:text-amber-700 transition">
                                            <input type="checkbox" ${activeRoutes.includes(r.id) ? 'checked' : ''} onchange="window.appActions.toggleAtlasRouteVis('${r.id}')" class="w-4 h-4 text-amber-600 rounded-sm shadow-sm border-[#d4c5a9] focus:ring-amber-500 cursor-pointer shrink-0">
                                            <span class="truncate" title="${safeName}">${safeName}</span>
                                        </label>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            <p class="text-[9px] text-stone-500 italic mt-2">Checking a route makes it visible on the map. Routes are hidden by default to prevent clutter.</p>
                        </div>
                    </div>
                </div>
            </div>

            ${isDM ? `
            <div id="atlas-settings-panel" class="hidden absolute top-4 right-4 z-50 animate-in pointer-events-auto shadow-2xl">
                <div class="bg-[#f4ebd8] p-4 sm:p-5 rounded-sm w-72 sm:w-80 border border-[#d4c5a9] border-t-4 border-t-amber-700 relative">
                    <button onclick="window.appActions.toggleAtlasSettings()" class="absolute top-2 right-3 text-stone-500 hover:text-red-900"><i class="fa-solid fa-xmark text-lg"></i></button>
                    <h2 class="text-sm font-serif font-bold text-amber-900 mb-4 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-gear mr-1.5 text-stone-500"></i> Map Configuration</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Image URL (e.g., catbox.moe)</label>
                            <input type="text" id="cfg-url" value="${config.url.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Pixels / Sq</label>
                                <input type="number" id="cfg-px" value="${config.pixelsPerSquare}" oninput="window.appActions.updateAtlasGridAndScale()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white text-center">
                            </div>
                            <div>
                                <label class="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-1">Miles / Sq</label>
                                <input type="number" id="cfg-miles" value="${config.milesPerSquare}" oninput="window.appActions.updateAtlasGridAndScale(); window.appActions.updateAtlasDistanceCalc();" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white text-center">
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-[#d4c5a9]">
                            <input type="checkbox" id="cfg-show-grid" ${config.showGrid ? 'checked' : ''} onchange="window.appActions.updateAtlasGridAndScale()" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-[#d4c5a9]">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-stone-700 cursor-pointer" for="cfg-show-grid">Display Alignment Grid</label>
                        </div>
                        
                        <button onclick="window.appActions.saveAtlasSettings()" class="w-full py-2 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-[10px] rounded-sm hover:bg-stone-800 transition shadow-md mt-2 flex justify-center items-center"><i class="fa-solid fa-floppy-disk mr-2"></i> Save & Reload Image</button>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div id="atlas-pin-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-4 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative overflow-visible">
                    <h3 class="font-serif font-bold text-lg text-amber-900 mb-2 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-location-dot text-amber-600 mr-2"></i> Link Map Pin</h3>
                    <p class="text-[10px] text-stone-600 mb-4 font-sans italic leading-snug">Search for a Codex Entry to link, type a custom label, or create a brand new Codex Entry right here.</p>
                    
                    <div class="relative mb-5">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Location Name</label>
                        <input type="text" id="atlas-pin-search" oninput="window.appActions.searchAtlasCodex(this.value, 'Location')" placeholder="Search codex or type name..." class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" autocomplete="off">
                        <input type="hidden" id="atlas-pin-codex-id">
                        
                        <div id="atlas-pin-search-results" class="absolute z-10 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-48 overflow-y-auto hidden top-[58px] custom-scrollbar"></div>
                    </div>

                    <input type="hidden" id="atlas-pin-lat">
                    <input type="hidden" id="atlas-pin-lng">

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9]">
                        <button onclick="document.getElementById('atlas-pin-modal').classList.add('hidden'); window.appActions.setAtlasMode('pan');" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                        <button onclick="window.appActions.confirmAtlasPin()" class="px-5 py-2 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md"><i class="fa-solid fa-map-pin mr-1.5"></i> Drop Pin</button>
                    </div>
                </div>
            </div>
            
            <div id="atlas-route-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-4 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative overflow-visible">
                    <h3 class="font-serif font-bold text-lg text-amber-900 mb-3 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-route text-amber-600 mr-2"></i> Save Travel Route</h3>
                    <p class="text-[10px] text-stone-600 mb-4 font-sans italic leading-snug">Link this route to the Codex to add lore and details to the journey. Total Distance: <span id="atlas-route-dist" class="font-bold text-amber-700 border-b border-amber-300"></span></p>
                    
                    <div class="relative mb-5">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Route Name</label>
                        <input type="text" id="atlas-route-search" oninput="window.appActions.searchAtlasCodex(this.value, 'Route')" placeholder="Search codex or type name..." class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" autocomplete="off">
                        <input type="hidden" id="atlas-route-codex-id">
                        
                        <div id="atlas-route-search-results" class="absolute z-10 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-48 overflow-y-auto hidden top-[58px] custom-scrollbar"></div>
                    </div>

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9]">
                        <button onclick="document.getElementById('atlas-route-modal').classList.add('hidden'); window.appActions.setAtlasMode('pan');" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                        <button onclick="window.appActions.confirmAtlasRoute()" class="px-5 py-2 bg-amber-600 text-stone-900 rounded-sm hover:bg-amber-500 transition font-bold uppercase tracking-wider text-[10px] shadow-md"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Route</button>
                    </div>
                </div>
            </div>

        </div>
    </div>
    `;
}
