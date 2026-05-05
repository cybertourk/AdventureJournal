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

    // --- CALENDAR & DATE INTEGRATION ---
    const cal = camp.calendar;
    let monthOptions = '';
    
    // Read directly from the calendar root
    let currentMonthId = cal?.currentMonth !== undefined ? cal.currentMonth : 0;
    let currentDay = cal?.currentDay || 1;
    let currentYear = cal?.currentYear || 1492;

    if (cal && cal.months && cal.months.length > 0) {
        // Months use their array index
        monthOptions = cal.months.map((m, idx) => `<option value="${idx}" ${idx === currentMonthId ? 'selected' : ''}>${m.name}</option>`).join('');
    } else {
        monthOptions = `<option value="0">Month 1</option>`;
        currentMonthId = 0;
    }

    // Helper to sort routes chronologically
    const getSortVal = (dateObj) => {
        if (!dateObj) return 0;
        const monthIndex = parseInt(dateObj.month) || 0;
        return (parseInt(dateObj.year) * 10000) + (monthIndex * 100) + parseInt(dateObj.day);
    };

    const sortedRoutes = [...(camp.atlasRoutes || [])].sort((a, b) => {
        const aVal = getSortVal(a.startDate);
        const bVal = getSortVal(b.startDate);
        if (aVal !== bVal) return aVal - bVal; // Oldest dates first
        return (a.name || "").localeCompare(b.name || ""); // Alphabetical fallback
    });

    // Slightly reduced heights for the boxed layout since the quick action bar shrunk
    const containerClasses = isFullScreen 
        ? "fixed inset-0 z-[60] w-full h-[100dvh] bg-[#1c1917] flex flex-col"
        : "animate-in fade-in duration-300 w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-115px)] relative";

    return `
    <div class="${containerClasses}">
        
        <!-- Header / Toolbar (Scaled Down 20%) -->
        <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-2 sm:p-3 flex justify-between items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-amber-700 shadow-md z-10 rounded-t-sm">
            <div class="flex items-center min-w-0">
                <i class="fa-solid fa-map-location-dot mr-2 text-amber-600 flex-shrink-0 text-base sm:text-lg"></i> 
                <div>
                    <h2 class="text-xs sm:text-base font-serif font-bold truncate leading-tight">Atlas of ${camp.name.replace(/"/g, '&quot;')}</h2>
                    <p class="text-[7px] sm:text-[8px] uppercase tracking-widest text-stone-400 font-bold mt-0.5">Left-Click: Action | Right-Click/Two-Finger: Pan</p>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="window.appActions.toggleAtlasLayers()" class="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-600 transition flex justify-center items-center shadow-sm" title="Map Layers & Routes"><i class="fa-solid fa-layer-group text-xs sm:text-sm"></i></button>
                ${isDM ? `<button onclick="window.appActions.toggleAtlasSettings()" class="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-600 transition flex justify-center items-center shadow-sm" title="Map Settings"><i class="fa-solid fa-gear text-xs sm:text-sm"></i></button>` : ''}
            </div>
        </div>

        <!-- Map Area -->
        <div class="flex-grow relative bg-[#1c1917] overflow-hidden ${isFullScreen ? '' : 'rounded-b-sm border-x-2 border-b-2 border-stone-800 shadow-[0_15px_40px_rgba(0,0,0,0.7)]'}" id="atlas-wrapper">
            <div id="map-container" class="absolute inset-0 z-0 cursor-crosshair"></div>
            
            <!-- Native-style Map Full Screen Toggle (Scaled Down) -->
            <button onclick="window.appActions.toggleAtlasFullScreen()" class="absolute top-[75px] right-[12px] z-[400] w-[28px] h-[28px] bg-[#292524] text-[#d6d3d1] border-2 border-[#78716c] rounded flex items-center justify-center hover:bg-[#44403c] hover:text-[#fbbf24] shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition text-xs" title="${isFullScreen ? 'Exit Full Screen' : 'Full Screen'}">
                <i class="fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'}"></i>
            </button>

            <!-- Dynamic Scale Indicator (Scaled Down) -->
            <div class="absolute ${isFullScreen ? 'bottom-20 sm:bottom-16' : 'bottom-24 sm:bottom-20'} left-4 z-30 bg-stone-900/90 text-amber-50 px-2 py-1.5 rounded-sm shadow-md border border-stone-600 flex flex-col gap-1 pointer-events-none transition-all duration-300" id="scale-indicator">
                <div class="text-[8px] uppercase tracking-widest font-bold text-stone-400 text-center" id="scale-text">${config.milesPerSquare} Miles</div>
                <div class="h-1 border-x border-b border-amber-500 transition-all duration-100 ease-linear" id="scale-bar" style="width: ${config.pixelsPerSquare}px;"></div>
            </div>

            <!-- Active Drawing Display (Scaled Down) -->
            <div id="drawing-stats" class="hidden absolute top-16 left-1/2 transform -translate-x-1/2 bg-stone-900 border-2 border-amber-600 text-amber-50 px-2 sm:px-3 py-1.5 rounded-sm shadow-xl z-40 font-bold flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-in whitespace-nowrap w-max max-w-[90vw]">
                <div class="flex items-center gap-2 justify-center">
                    <i class="fa-solid fa-route text-amber-500 text-sm sm:text-base"></i>
                    <div class="flex flex-col">
                        <span class="text-[7px] sm:text-[8px] uppercase text-stone-400 tracking-widest">Route Distance</span>
                        <span id="dist-val" class="text-xs sm:text-sm text-emerald-400">0 Miles</span>
                    </div>
                </div>
                <div class="w-px h-6 bg-stone-700 hidden sm:block"></div>
                <div class="flex gap-2 justify-center w-full sm:w-auto border-t border-stone-700 pt-1.5 sm:border-none sm:pt-0 mt-1 sm:mt-0">
                    <button onclick="window.appActions.atlasUndoLastPoint()" class="flex-1 sm:flex-none bg-stone-700 text-stone-300 px-2 py-1 rounded-sm text-[8px] sm:text-[9px] uppercase tracking-wider hover:bg-stone-600 hover:text-white transition shadow-sm border border-stone-500"><i class="fa-solid fa-rotate-left mr-1"></i> Undo</button>
                    <button onclick="window.appActions.atlasMarkLastPointAsStop()" class="flex-1 sm:flex-none bg-blue-900/50 text-blue-300 px-2 py-1 rounded-sm text-[8px] sm:text-[9px] uppercase tracking-wider hover:bg-blue-800 hover:text-white transition shadow-sm border border-blue-700"><i class="fa-solid fa-location-dot mr-1"></i> Drop Stop</button>
                    ${isDM ? `<button onclick="window.appActions.atlasFinishDrawing()" class="flex-1 sm:flex-none bg-amber-600 text-stone-900 px-2 py-1 rounded-sm text-[8px] sm:text-[9px] uppercase tracking-wider hover:bg-amber-500 transition shadow-sm font-black"><i class="fa-solid fa-check mr-1"></i> Save Route</button>` : `<button onclick="window.appActions.setAtlasMode('pan')" class="flex-1 sm:flex-none bg-amber-600 text-stone-900 px-2 py-1 rounded-sm text-[8px] sm:text-[9px] uppercase tracking-wider hover:bg-amber-500 transition shadow-sm font-black"><i class="fa-solid fa-times mr-1"></i> End Path</button>`}
                </div>
            </div>

            <!-- Map Tools Dock (Scaled Down) -->
            <div class="absolute ${isFullScreen ? 'bottom-4 sm:bottom-6' : 'top-3'} left-0 right-0 flex justify-center z-40 px-4 pointer-events-none transition-all duration-300">
                <nav class="bg-stone-900 border border-stone-700 shadow-[0_10px_20px_rgba(0,0,0,0.8)] rounded-full w-full max-w-[260px] h-10 sm:h-11 flex items-center justify-between px-1.5 pointer-events-auto bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                    <button onclick="window.appActions.setAtlasMode('pan')" id="mode-pan" class="tool-btn flex items-center justify-center w-1/3 text-amber-500 bg-stone-800 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-hand text-sm sm:text-base"></i>
                        <span class="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider ml-1.5 hidden sm:inline">Pan</span>
                    </button>
                    
                    ${isDM ? `<div class="w-px h-5 sm:h-6 bg-stone-700 mx-0.5"></div>
                    <button onclick="window.appActions.setAtlasMode('pin')" id="mode-pin" class="tool-btn flex items-center justify-center w-1/3 text-stone-400 hover:text-red-400 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-location-dot text-sm sm:text-base"></i>
                        <span class="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider ml-1.5 hidden sm:inline">Pin</span>
                    </button>` : ''}
                    
                    <div class="w-px h-5 sm:h-6 bg-stone-700 mx-0.5"></div>
                    
                    <button onclick="window.appActions.setAtlasMode('draw')" id="mode-draw" class="tool-btn flex items-center justify-center ${isDM ? 'w-1/3' : 'w-1/2'} text-stone-400 hover:text-blue-400 transition-colors h-full rounded-full">
                        <i class="fa-solid fa-pen-nib text-sm sm:text-base"></i>
                        <span class="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider ml-1.5 hidden sm:inline">Path</span>
                    </button>
                </nav>
            </div>
            
            <!-- Map Layers / Routes Floating Panel (Scaled Down) -->
            <div id="atlas-layers-panel" class="hidden absolute top-3 right-3 z-50 animate-in pointer-events-auto shadow-2xl">
                <div class="bg-[#f4ebd8] p-3 sm:p-4 rounded-sm w-60 sm:w-64 border border-[#d4c5a9] border-t-4 border-t-amber-700 relative max-h-[80vh] flex flex-col">
                    <button onclick="window.appActions.toggleAtlasLayers()" class="absolute top-1.5 right-2 text-stone-500 hover:text-red-900"><i class="fa-solid fa-xmark text-sm"></i></button>
                    <h2 class="text-xs font-serif font-bold text-amber-900 mb-2 border-b border-[#d4c5a9] pb-1.5 shrink-0"><i class="fa-solid fa-layer-group mr-1 text-stone-500"></i> Map Layers</h2>
                    
                    <div class="overflow-y-auto custom-scrollbar pr-1 flex-grow space-y-3">
                        <div>
                            <h3 class="text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Travel Logs</h3>
                            <div id="atlas-route-checkboxes" class="bg-white border border-[#d4c5a9] rounded-sm shadow-inner overflow-hidden">
                                ${sortedRoutes.length === 0 ? '<p class="p-2 text-[8px] italic text-stone-400">No routes inscribed yet.</p>' : ''}
                                ${sortedRoutes.map(r => {
                                    let routeName = r.name; 
                                    if (r.codexId) {
                                        const cEntry = (camp.codex || []).find(c => c.id === r.codexId);
                                        if (cEntry) routeName = cEntry.name;
                                    }
                                    if (!routeName) routeName = "Unknown Route";
                                    const safeName = routeName.replace(/"/g, '&quot;');
                                    
                                    let dateStr = "";
                                    if (r.startDate) {
                                        const rMonthIdx = parseInt(r.startDate.month, 10);
                                        const rMonth = cal?.months ? cal.months[rMonthIdx] : null;
                                        if (rMonth) {
                                            const durStr = (r.durationDays && r.durationDays > 1) ? `${r.durationDays} Day Span` : `Same Day`;
                                            dateStr = `<div class="text-[7px] text-stone-400 font-sans italic mt-0.5"><i class="fa-solid fa-calendar-days mr-1 text-stone-300"></i>${rMonth.name} ${r.startDate.day}, ${r.startDate.year} • ${durStr}</div>`;
                                        }
                                    }

                                    return `
                                    <div class="flex items-center justify-between p-1.5 border-b border-[#d4c5a9] last:border-b-0 hover:bg-stone-50 transition">
                                        <label class="flex items-start gap-1.5 cursor-pointer w-full text-[8px] font-bold uppercase tracking-widest text-stone-700 hover:text-amber-700 transition">
                                            <input type="checkbox" ${activeRoutes.includes(r.id) ? 'checked' : ''} onchange="window.appActions.toggleAtlasRouteVis('${r.id}')" class="w-3 h-3 mt-0.5 text-amber-600 rounded-sm shadow-sm border-[#d4c5a9] focus:ring-amber-500 cursor-pointer shrink-0">
                                            <div class="flex flex-col min-w-0">
                                                <span class="truncate" title="${safeName}">${safeName}</span>
                                                ${dateStr}
                                            </div>
                                        </label>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            <p class="text-[7px] text-stone-500 italic mt-1.5 leading-snug">Checking a route makes it visible on the map. Hidden by default to prevent clutter.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Floating Panel (Scaled Down) -->
            ${isDM ? `
            <div id="atlas-settings-panel" class="hidden absolute top-3 right-3 z-50 animate-in pointer-events-auto shadow-2xl">
                <div class="bg-[#f4ebd8] p-3 sm:p-4 rounded-sm w-60 sm:w-64 border border-[#d4c5a9] border-t-4 border-t-amber-700 relative">
                    <button onclick="window.appActions.toggleAtlasSettings()" class="absolute top-1.5 right-2 text-stone-500 hover:text-red-900"><i class="fa-solid fa-xmark text-sm"></i></button>
                    <h2 class="text-xs font-serif font-bold text-amber-900 mb-4 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-gear mr-1 text-stone-500"></i> Map Configuration</h2>
                    
                    <div class="space-y-3">
                        <div>
                            <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Image URL (e.g., catbox.moe)</label>
                            <input type="text" id="cfg-url" value="${config.url.replace(/"/g, '&quot;')}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Pixels / Sq</label>
                                <input type="number" id="cfg-px" value="${config.pixelsPerSquare}" oninput="window.appActions.updateAtlasGridAndScale()" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white text-center">
                            </div>
                            <div>
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Miles / Sq</label>
                                <input type="number" id="cfg-miles" value="${config.milesPerSquare}" oninput="window.appActions.updateAtlasGridAndScale(); window.appActions.updateAtlasDistanceCalc();" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white text-center">
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 pt-1 border-t border-[#d4c5a9]">
                            <input type="checkbox" id="cfg-show-grid" ${config.showGrid ? 'checked' : ''} onchange="window.appActions.updateAtlasGridAndScale()" class="w-3 h-3 text-amber-600 rounded-sm cursor-pointer shadow-sm border-[#d4c5a9]">
                            <label class="text-[8px] font-bold uppercase tracking-widest text-stone-700 cursor-pointer" for="cfg-show-grid">Display Alignment Grid</label>
                        </div>
                        
                        <button onclick="window.appActions.saveAtlasSettings()" class="w-full py-1.5 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-[8px] rounded-sm hover:bg-stone-800 transition shadow-md mt-1 flex justify-center items-center"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save & Reload Image</button>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Pin Assignment Modal (Scaled Down) -->
            <div id="atlas-pin-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-3 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] p-4 rounded-sm w-full max-w-[300px] border border-[#d4c5a9] shadow-2xl relative overflow-visible">
                    <h3 class="font-serif font-bold text-base text-amber-900 mb-1.5 border-b border-[#d4c5a9] pb-1.5"><i class="fa-solid fa-location-dot text-amber-600 mr-1.5"></i> Link Map Pin</h3>
                    <p class="text-[8px] text-stone-600 mb-3 font-sans italic leading-snug">Search for a Codex Entry to link, type a custom label, or create a brand new Codex Entry right here.</p>
                    
                    <div class="relative mb-4">
                        <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Location Name</label>
                        <input type="text" id="atlas-pin-search" oninput="window.appActions.searchAtlasCodex(this.value, 'Location')" placeholder="Search codex or type name..." class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" autocomplete="off">
                        <input type="hidden" id="atlas-pin-codex-id">
                        
                        <div id="atlas-pin-search-results" class="absolute z-10 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-40 overflow-y-auto hidden top-[46px] custom-scrollbar text-xs"></div>
                    </div>

                    <!-- Hidden inputs for coordinates -->
                    <input type="hidden" id="atlas-pin-lat">
                    <input type="hidden" id="atlas-pin-lng">

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9]">
                        <button onclick="document.getElementById('atlas-pin-modal').classList.add('hidden'); window.appActions.setAtlasMode('pan');" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                        <button onclick="window.appActions.confirmAtlasPin()" class="px-3 py-1.5 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-[8px] shadow-md"><i class="fa-solid fa-map-pin mr-1"></i> Drop Pin</button>
                    </div>
                </div>
            </div>
            
            <!-- Route Save Modal (Scaled Down with Stops feature) -->
            <div id="atlas-route-modal" class="hidden absolute inset-0 bg-stone-900/80 z-[18000] flex items-center justify-center p-3 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] p-4 rounded-sm w-full max-w-[320px] border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                    <h3 class="font-serif font-bold text-base text-amber-900 mb-1.5 border-b border-[#d4c5a9] pb-1.5 shrink-0"><i class="fa-solid fa-route text-amber-600 mr-1.5"></i> Save Travel Route</h3>
                    <p class="text-[8px] text-stone-600 mb-2 font-sans italic leading-snug shrink-0">Link this route to the Codex to auto-calculate travel times and log the journey.</p>
                    
                    <div class="overflow-y-auto custom-scrollbar flex-grow pr-1">
                        <!-- Travel Stats Readout -->
                        <div class="bg-white p-2 rounded-sm border border-[#d4c5a9] mb-2 shadow-sm text-[10px]">
                            <div class="flex justify-between items-center pb-1 border-b border-stone-100">
                                <span class="font-bold text-stone-500 uppercase tracking-widest text-[8px]">Distance:</span>
                                <span id="atlas-route-dist" class="font-bold text-amber-700 text-[10px]"></span>
                            </div>
                            <div class="flex justify-between items-center pt-1">
                                <span class="font-bold text-stone-500 uppercase tracking-widest text-[8px]">Est. Time:</span>
                                <span id="atlas-route-live-math" class="font-bold text-emerald-600 text-[9px]"></span>
                            </div>
                        </div>

                        <!-- Editable Date Inputs -->
                        <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1 mt-1">Departure Date</label>
                        <div class="grid grid-cols-12 gap-1 mb-2">
                            <div class="col-span-6">
                                <select id="atlas-route-month" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                                    ${monthOptions}
                                </select>
                            </div>
                            <div class="col-span-3 flex items-center bg-white border border-[#d4c5a9] rounded-sm shadow-inner focus-within:border-amber-600 overflow-hidden">
                                <span class="pl-1 text-[8px] text-stone-400 font-bold uppercase">D</span>
                                <input type="number" id="atlas-route-day" value="${currentDay}" class="w-full p-1.5 bg-transparent text-[10px] font-bold text-stone-900 outline-none text-right">
                            </div>
                            <div class="col-span-3 flex items-center bg-white border border-[#d4c5a9] rounded-sm shadow-inner focus-within:border-amber-600 overflow-hidden">
                                <span class="pl-1 text-[8px] text-stone-400 font-bold uppercase">Y</span>
                                <input type="number" id="atlas-route-year" value="${currentYear}" class="w-full p-1.5 bg-transparent text-[10px] font-bold text-stone-900 outline-none text-right">
                            </div>
                        </div>

                        <!-- Travel Math Inputs -->
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Travel Mode</label>
                                <select id="atlas-route-mode" onchange="window.appActions.calculateAtlasRouteLive()" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                                    <optgroup label="Overland">
                                        <option value="foot-standard">On Foot</option>
                                        <option value="mount-riding">Horse / Mount</option>
                                        <option value="mount-draft">Draft Horse / Mule</option>
                                        <option value="mount-camel">Camel</option>
                                        <option value="mount-elephant">Elephant</option>
                                        <option value="mount-mastiff">Mastiff / Pony</option>
                                    </optgroup>
                                    <optgroup label="Nautical">
                                        <option value="water-rowboat">Rowboat</option>
                                        <option value="water-keelboat">Keelboat</option>
                                        <option value="water-longship">Longship</option>
                                        <option value="water-sailing">Sailing Ship</option>
                                        <option value="water-warship">Warship</option>
                                        <option value="water-galley">Galley</option>
                                    </optgroup>
                                    <optgroup label="Aeronautical">
                                        <option value="flying-creature">Flying Mount</option>
                                        <option value="flying-griffon">Griffon</option>
                                        <option value="flying-carpet">Carpet of Flying</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Travel Pace</label>
                                <select id="atlas-route-pace" onchange="window.appActions.calculateAtlasRouteLive()" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-[10px] font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                                    <option value="slow">Slow</option>
                                    <option value="normal" selected>Normal</option>
                                    <option value="fast">Fast</option>
                                    <option value="forced">Forced (+4 hrs)</option>
                                </select>
                            </div>
                            <div class="col-span-2 flex items-center gap-1.5 pt-1 border-t border-[#d4c5a9]">
                                <input type="checkbox" id="atlas-route-difficult" onchange="window.appActions.calculateAtlasRouteLive()" class="w-3 h-3 text-amber-600 rounded-sm shadow-sm border-[#d4c5a9] focus:ring-amber-500 cursor-pointer">
                                <label class="text-[8px] font-bold uppercase tracking-widest text-stone-700 cursor-pointer" for="atlas-route-difficult">Difficult Terrain (1/2 Speed)</label>
                            </div>
                        </div>

                        <!-- STOPS SECTION -->
                        <div class="border-t border-[#d4c5a9] pt-2 mb-3">
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest">Journey Stops & Events</label>
                                <button type="button" onclick="window.appActions.addAtlasRouteStop()" class="text-[8px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 transition flex items-center"><i class="fa-solid fa-plus mr-1"></i> Add Stop</button>
                            </div>
                            <div id="atlas-route-stops-container" class="space-y-1.5 empty:hidden">
                                <!-- Dynamic rows injected here -->
                            </div>
                        </div>

                        <div class="relative mb-3">
                            <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Route Name</label>
                            <input type="text" id="atlas-route-search" oninput="window.appActions.searchAtlasCodex(this.value, 'Route')" placeholder="Search codex or type name..." class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" autocomplete="off">
                            <input type="hidden" id="atlas-route-codex-id">
                            
                            <!-- Notice we remove overflow hidden on the modal itself to allow this to pop out, or we bound its height -->
                            <div id="atlas-route-search-results" class="absolute z-10 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-32 overflow-y-auto hidden top-[42px] custom-scrollbar text-xs"></div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-2 border-t border-[#d4c5a9] shrink-0">
                        <button onclick="document.getElementById('atlas-route-modal').classList.add('hidden'); window.appActions.setAtlasMode('pan');" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[8px]">Cancel</button>
                        <button onclick="window.appActions.confirmAtlasRoute()" class="px-3 py-1.5 bg-amber-600 text-stone-900 rounded-sm hover:bg-amber-500 transition font-bold uppercase tracking-wider text-[8px] shadow-md"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Route</button>
                    </div>
                </div>
            </div>

        </div>
    </div>
    `;
}
