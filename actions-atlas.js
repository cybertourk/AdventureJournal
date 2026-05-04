import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// --- LEAFLET ATLAS STATE ---
let mapInstance = null;
let imageOverlay = null;
let gridOverlayLayer = null;
let currentMode = 'pan'; // 'pan', 'pin', or 'draw'
let drawingPolyline = null;
let drawingPoints = [];

export const initAtlas = () => {
    const container = document.getElementById('map-container');
    if (!container) return; // Only run if the DOM is actively showing the Atlas

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    // Purge the old Leaflet instance to prevent initialization conflicts when switching views or toggling layers
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        imageOverlay = null;
        gridOverlayLayer = null;
        drawingPolyline = null;
        drawingPoints = [];
    }

    const config = camp.atlasConfig || {
        url: 'https://files.catbox.moe/o3d82f.jpg',
        pixelsPerSquare: 50,
        milesPerSquare: 10,
        showGrid: true
    };

    // 1. Initialize Map with flat image coordinate system
    mapInstance = L.map('map-container', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 2,
        zoomControl: false,
        attributionControl: false,
        center: [0, 0],
        zoom: -1,
        dragging: false // We use a custom right-click script to pan instead!
    });

    // Top Right Zoom Controls to avoid overlapping our Safe Areas / Docks
    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    // 2. Load the source image to extract natural pixel boundaries
    const img = new Image();
    img.onload = function() {
        const w = this.width;
        const h = this.height;
        
        const bounds = [[0, 0], [h, w]];
        imageOverlay = L.imageOverlay(config.url, bounds).addTo(mapInstance);
        
        // Render the Grid, Scale Bar, Pins, and Routes
        window.appActions.updateAtlasGridAndScale(w, h);
        renderAtlasEntities(camp);

        // --- NEW: DYNAMIC JUMP-TO-TARGET FOCUS LOGIC ---
        // If the user clicked "View on Map" from the Codex, we intercept the load and pan to it!
        if (window.appData.pendingAtlasFocus) {
            const focusId = window.appData.pendingAtlasFocus;
            window.appData.pendingAtlasFocus = null; // Clear the pending action

            const focusPin = (camp.atlasPins || []).find(p => p.codexId === focusId);
            if (focusPin) {
                // Zoom closely onto the specific map pin
                mapInstance.setView([focusPin.lat, focusPin.lng], 1); 
            } else {
                const focusRoute = (camp.atlasRoutes || []).find(r => r.codexId === focusId);
                if (focusRoute && focusRoute.points && focusRoute.points.length > 0) {
                    // Extract bounds of the route and fit the camera beautifully over the whole path
                    const polyline = L.polyline(focusRoute.points);
                    mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                } else {
                    mapInstance.fitBounds(bounds); // Fallback to full map
                }
            }
        } else {
            // Default view: fit the whole image on the screen
            mapInstance.fitBounds(bounds);
        }
    };
    img.onerror = function() {
        notify("Failed to load map image. Check the URL in Atlas Settings.", "error");
    };
    img.src = config.url;

    // --- 3. CUSTOM RIGHT-CLICK PANNING LOGIC ---
    let rightDrag = false;
    let lastMousePos = null;
    
    container.addEventListener('contextmenu', e => e.preventDefault());
    
    container.addEventListener('mousedown', e => {
        if (e.button === 2) { // Right Click
            rightDrag = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            container.style.cursor = 'grabbing';
        }
    });
    
    window.addEventListener('mousemove', e => {
        if (rightDrag && lastMousePos && mapInstance) {
            const dx = lastMousePos.x - e.clientX;
            const dy = lastMousePos.y - e.clientY;
            mapInstance.panBy([dx, dy], { animate: false });
            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });
    
    window.addEventListener('mouseup', e => {
        if (e.button === 2) {
            rightDrag = false;
            container.style.cursor = 'crosshair'; 
        }
    });

    // --- 4. ACTION LEFT-CLICKS (Logic controlled by the Tool Dock) ---
    mapInstance.on('click', function(e) {
        if (e.originalEvent.button === 0 || e.originalEvent.type === 'touchend') {
            if (currentMode === 'pin') {
                document.getElementById('atlas-pin-lat').value = e.latlng.lat;
                document.getElementById('atlas-pin-lng').value = e.latlng.lng;
                
                // Reset inputs and open modal
                document.getElementById('atlas-pin-codex-id').value = "";
                document.getElementById('atlas-pin-search').value = "";
                document.getElementById('atlas-pin-search-results').classList.add('hidden');
                document.getElementById('atlas-pin-modal').classList.remove('hidden');
                
                // Auto-focus the search bar
                setTimeout(() => document.getElementById('atlas-pin-search').focus(), 100);
            } 
            else if (currentMode === 'draw') {
                drawingPoints.push(e.latlng);
                if (!drawingPolyline) {
                    drawingPolyline = L.polyline(drawingPoints, { color: '#ef4444', weight: 4, dashArray: '5, 10' }).addTo(mapInstance);
                } else {
                    drawingPolyline.setLatLngs(drawingPoints);
                }
                window.appActions.updateAtlasDistanceCalc();
            }
        }
    });

    // Sync the dynamic scale bar and SVG grid when zooming
    mapInstance.on('zoomend', () => {
        if(imageOverlay) {
            const bounds = imageOverlay.getBounds();
            // Pass the extracted width/height bounds into the math generator
            window.appActions.updateAtlasGridAndScale(bounds.getEast(), bounds.getNorth());
        }
    });

    // Set default mode
    window.appActions.setAtlasMode('pan');
};

const renderAtlasEntities = (camp) => {
    // Render Database Pins
    (camp.atlasPins || []).forEach(pin => {
        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: '<i class="fa-solid fa-star"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30] // Centers the sharp tip exactly on the coordinate!
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(mapInstance);
        
        marker.on('click', () => {
            const isDM = camp._isDM;
            const canDelete = isDM || pin.authorId === window.appData.currentUserUid;

            // If in Pin mode, clicking an existing pin acts as an eraser!
            if (currentMode === 'pin' && canDelete) {
                window.appActions.deleteAtlasPin(pin.id);
                return;
            }

            if (currentMode === 'pan') {
                // Instantly open the Codex Entry if it's linked!
                if (pin.codexId) {
                    const cEntry = camp.codex?.find(c => c.id === pin.codexId);
                    if (cEntry) {
                        window.appActions.viewCodex(cEntry.id);
                        return; // Bypass the mini-popup entirely
                    }
                }

                // Fallback: If it's just a Custom Map Pin (no codex link), show the mini-label
                let title = pin.customLabel || 'Unknown Location';
                let descHtml = `<span class="text-[9px] uppercase tracking-wider font-bold text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded-sm">Custom Map Pin</span>`;

                const deleteBtn = canDelete ? `<button onclick="window.appActions.deleteAtlasPin('${pin.id}'); document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-3.5 right-12 text-stone-400 hover:text-red-700 transition" title="Delete Pin"><i class="fa-solid fa-trash text-lg p-1"></i></button>` : '';

                const popup = document.getElementById('global-popup-container');
                popup.innerHTML = `
                    <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[17000] backdrop-blur-sm animate-in">
                        <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative animate-in border-t-4 border-t-amber-700">
                            ${deleteBtn}
                            <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-3.5 right-3 text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl p-1"></i></button>
                            <h3 class="font-serif font-bold text-lg text-amber-900 mb-1 pr-16">${title}</h3>
                            ${descHtml}
                        </div>
                    </div>
                `;
            }
        });
    });

    // Render Database Routes (ONLY those toggled ON in the layers panel)
    const activeRoutes = window.appData.activeAtlasRoutes || [];
    
    (camp.atlasRoutes || []).filter(r => activeRoutes.includes(r.id)).forEach(route => {
        const polyline = L.polyline(route.points, { color: '#ef4444', weight: 4, dashArray: '5, 10' }).addTo(mapInstance);
        
        polyline.on('click', () => {
            if (currentMode === 'pan') {
                const isDM = camp._isDM;
                const canDelete = isDM || route.authorId === window.appData.currentUserUid;

                // Instantly open the Codex Entry if the Route is linked!
                if (route.codexId) {
                    const cEntry = camp.codex?.find(c => c.id === route.codexId);
                    if (cEntry) {
                        window.appActions.viewCodex(cEntry.id);
                        return; // Bypass the mini-popup entirely
                    }
                }

                // Fallback for older legacy routes that don't have a Codex Link
                let title = route.name || 'Unknown Route';
                const deleteBtn = canDelete ? `<button onclick="window.appActions.deleteAtlasRoute('${route.id}'); document.getElementById('global-popup-container').innerHTML = '';" class="w-full mt-4 py-2 bg-red-900/10 text-red-800 border border-red-900/30 hover:bg-red-900 hover:text-white rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm"><i class="fa-solid fa-trash mr-1"></i> Delete Route</button>` : '';

                const popup = document.getElementById('global-popup-container');
                popup.innerHTML = `
                    <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[17000] backdrop-blur-sm animate-in">
                        <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative animate-in border-t-4 border-t-amber-700">
                            <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-3.5 right-3 text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl p-1"></i></button>
                            <h3 class="font-serif font-bold text-lg text-amber-900 mb-1 pr-8"><i class="fa-solid fa-route text-amber-600 mr-1.5"></i> ${title}</h3>
                            <div class="bg-[#fdfbf7] p-3 rounded-sm border border-[#d4c5a9] mt-3 shadow-inner">
                                <p class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-0.5">Calculated Distance</p>
                                <p class="text-base font-bold text-emerald-600">${route.distanceMiles} Miles</p>
                            </div>
                            ${deleteBtn}
                        </div>
                    </div>
                `;
            }
        });
    });
};

export const setAtlasMode = (mode) => {
    currentMode = mode;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        // Reset styles and check if it's the 2-button layout (Player) or 3-button (DM)
        const baseClasses = "tool-btn flex items-center justify-center text-stone-400 transition-colors h-full rounded-full";
        const widthClass = document.querySelectorAll('.tool-btn').length === 2 && btn.id === 'mode-draw' ? 'w-1/2' : 'w-1/3';
        btn.className = `${baseClasses} ${widthClass}`;
    });

    const activeBtn = document.getElementById(`mode-${mode}`);
    if (activeBtn) activeBtn.classList.remove('text-stone-400');
    
    if (mode === 'pan') {
        if (activeBtn) activeBtn.classList.add('text-amber-500', 'bg-stone-800');
    } else if (mode === 'pin') {
        if (activeBtn) activeBtn.classList.add('text-red-500', 'bg-red-900/20');
    } else if (mode === 'draw') {
        if (activeBtn) activeBtn.classList.add('text-blue-500', 'bg-blue-900/20');
        
        // Initialize the drawing stat UI
        const stats = document.getElementById('drawing-stats');
        if (stats) stats.classList.remove('hidden');
        
        const val = document.getElementById('dist-val');
        if (val) val.innerText = "0 Miles";
        
        drawingPoints = [];
        if (drawingPolyline && mapInstance) mapInstance.removeLayer(drawingPolyline);
        drawingPolyline = null;
    }
    
    if (mode !== 'draw') {
        const stats = document.getElementById('drawing-stats');
        if (stats) stats.classList.add('hidden');
    }
};

export const updateAtlasGridAndScale = (imgW, imgH) => {
    if (!mapInstance) return;
    
    // Cache the image bounds globally so recalculations (like typing in settings) don't lose the boundaries!
    if (imgW !== undefined) window.appData.atlasDimensions = { w: imgW, h: imgH };
    const w = window.appData.atlasDimensions?.w || 2000;
    const h = window.appData.atlasDimensions?.h || 1500;

    const pxSq = parseFloat(document.getElementById('cfg-px')?.value) || 50;
    const miSq = parseFloat(document.getElementById('cfg-miles')?.value) || 10;
    
    // 1. UPDATE SCALE BAR
    const multiplier = Math.pow(2, mapInstance.getZoom());
    const visualWidthInPixels = pxSq * multiplier;
    
    const scaleBar = document.getElementById('scale-bar');
    const scaleText = document.getElementById('scale-text');
    if (scaleBar) scaleBar.style.width = `${visualWidthInPixels}px`;
    if (scaleText) scaleText.innerText = `${miSq} Miles`;

    // 2. UPDATE GRID OVERLAY
    if (gridOverlayLayer) mapInstance.removeLayer(gridOverlayLayer);
    
    const showGridEl = document.getElementById('cfg-show-grid');
    const showGrid = showGridEl ? showGridEl.checked : true;
    
    if (showGrid) {
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
                <defs>
                    <pattern id="gridPattern" width="${pxSq}" height="${pxSq}" patternUnits="userSpaceOnUse">
                        <path d="M ${pxSq} 0 L 0 0 0 ${pxSq}" fill="none" stroke="rgba(255, 255, 255, 0.4)" stroke-width="2"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />
            </svg>
        `;
        
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
        const svgElement = svgDoc.documentElement;
        
        const bounds = [[0, 0], [h, w]];
        gridOverlayLayer = L.svgOverlay(svgElement, bounds, { interactive: false }).addTo(mapInstance);
    }
};

export const updateAtlasDistanceCalc = () => {
    const el = document.getElementById('dist-val');
    if (drawingPoints.length < 2) {
        if (el) el.innerText = "0 Miles";
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const config = camp?.atlasConfig || { pixelsPerSquare: 50, milesPerSquare: 10 };

    let totalPixels = 0;
    for (let i = 1; i < drawingPoints.length; i++) {
        const dx = drawingPoints[i].lng - drawingPoints[i-1].lng;
        const dy = drawingPoints[i].lat - drawingPoints[i-1].lat;
        totalPixels += Math.sqrt(dx*dx + dy*dy);
    }

    const pxSq = parseFloat(document.getElementById('cfg-px')?.value) || config.pixelsPerSquare;
    const miSq = parseFloat(document.getElementById('cfg-miles')?.value) || config.milesPerSquare;

    const totalSquares = totalPixels / pxSq;
    const totalMiles = totalSquares * miSq;
    
    if (el) el.innerText = `${Math.round(totalMiles * 10) / 10} Miles`;
};

export const atlasUndoLastPoint = () => {
    if (drawingPoints.length > 0) {
        drawingPoints.pop();
        if (drawingPolyline) {
            drawingPolyline.setLatLngs(drawingPoints);
        }
        window.appActions.updateAtlasDistanceCalc();
    }
};

export const atlasFinishDrawing = () => {
    if (drawingPoints.length < 2) {
        notify("You must draw a path with at least two points first.", "error");
        return;
    }
    const distStr = document.getElementById('dist-val').innerText;
    document.getElementById('atlas-route-dist').innerText = distStr;
    document.getElementById('atlas-route-modal').classList.remove('hidden');
};

// --- PIN & ROUTE CODEX SEARCH INTERFACE ---
export const searchAtlasCodex = (query, filterType = 'Location') => {
    // Dynamic handling based on whether we are assigning a Pin or a Route!
    const isRoute = filterType === 'Route';
    const prefix = isRoute ? 'atlas-route' : 'atlas-pin';
    
    const resultsContainer = document.getElementById(`${prefix}-search-results`);
    if (!resultsContainer) return;
    
    if (!query || query.trim() === '') {
        resultsContainer.classList.add('hidden');
        document.getElementById(`${prefix}-codex-id`).value = ""; // Clear ID if they backspace
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const codex = camp?.codex || [];
    
    // Filter by the requested type
    const matches = codex.filter(c => {
        if (isRoute) {
            return c.type === 'Route' && c.name.toLowerCase().includes(query.toLowerCase());
        } else {
            return (c.type === 'Location' || c.type === 'Faction') && c.name.toLowerCase().includes(query.toLowerCase());
        }
    });

    let html = '';
    matches.forEach(m => {
        const safeName = m.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
            <div class="p-3 border-b border-[#d4c5a9] hover:bg-amber-50 cursor-pointer transition-colors" onclick="window.appActions.selectAtlasCodexEntry('${m.id}', '${safeName}', '${prefix}')">
                <span class="font-bold text-stone-900">${m.name}</span> 
                <span class="text-[9px] uppercase font-bold text-stone-500 ml-2 bg-stone-200 px-1.5 py-0.5 rounded-sm">${m.type}</span>
            </div>
        `;
    });

    // The option to create a brand new entry seamlessly
    const safeQuery = query.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const typeLabel = isRoute ? 'Route' : 'Location';
    
    html += `
        <div class="p-3 bg-stone-100 hover:bg-amber-100 cursor-pointer text-amber-900 font-bold text-xs flex items-center transition-colors border-b border-[#d4c5a9]" onclick="window.appActions.selectAtlasCodexEntry('', '${safeQuery}', '${prefix}')">
            <i class="fa-solid fa-plus-circle mr-2 text-amber-600"></i> Create New ${typeLabel}: "${query}"
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');
};

export const selectAtlasCodexEntry = (id, name, prefix) => {
    const searchInput = document.getElementById(`${prefix}-search`);
    const idInput = document.getElementById(`${prefix}-codex-id`);
    const resultsContainer = document.getElementById(`${prefix}-search-results`);

    if (searchInput) searchInput.value = name;
    if (idInput) idInput.value = id; // Will be empty string if creating a new one
    if (resultsContainer) resultsContainer.classList.add('hidden');
};

export const confirmAtlasPin = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const lat = parseFloat(document.getElementById('atlas-pin-lat').value);
    const lng = parseFloat(document.getElementById('atlas-pin-lng').value);
    let codexId = document.getElementById('atlas-pin-codex-id').value;
    const searchInput = document.getElementById('atlas-pin-search').value.trim();

    if (!codexId && !searchInput) {
        notify("You must select or type a name for the location.", "error");
        return;
    }

    let updatedCodex = camp.codex || [];
    
    // Auto-create new entry if they typed a name but didn't pick an existing ID
    if (!codexId && searchInput) {
        codexId = generateId();
        const newEntry = {
            id: codexId,
            name: searchInput,
            type: 'Location',
            tags: ['Map Pin'],
            desc: 'A newly discovered location on the Atlas.',
            authorId: window.appData.currentUserUid,
            visibility: { mode: 'public' }
        };
        updatedCodex = [...updatedCodex, newEntry];
    }

    const newPin = {
        id: generateId(),
        lat,
        lng,
        codexId,
        authorId: window.appData.currentUserUid
    };

    const updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasPins: [...(camp.atlasPins || []), newPin]
    };

    await saveCampaign(updatedCamp);
    document.getElementById('atlas-pin-modal').classList.add('hidden');
    window.appActions.setAtlasMode('pan');
    notify("Pin dropped securely on the Atlas.", "success");
    
    // Explicitly call initAtlas to force Leaflet to mount the new pin over the image
    window.appActions.initAtlas();
};

export const confirmAtlasRoute = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const distStr = document.getElementById('dist-val').innerText;
    let codexId = document.getElementById('atlas-route-codex-id').value;
    const searchInput = document.getElementById('atlas-route-search').value.trim();

    if (!codexId && !searchInput) {
        notify("You must select or type a name for the route.", "error");
        return;
    }

    let updatedCodex = camp.codex || [];
    
    // Auto-create new entry if they typed a name but didn't pick an existing ID
    if (!codexId && searchInput) {
        codexId = generateId();
        const newEntry = {
            id: codexId,
            name: searchInput,
            type: 'Route',
            tags: ['Travel Path'],
            desc: `A travel route recorded on the Atlas.\n\n**Total Distance:** ${distStr}`,
            authorId: window.appData.currentUserUid,
            visibility: { mode: 'public' }
        };
        updatedCodex = [...updatedCodex, newEntry];
    }

    // Convert Leaflet's custom LatLng class objects into plain JavaScript objects 
    // so Firestore can save them without throwing an "Unsupported field value" error.
    const plainPoints = drawingPoints.map(p => ({
        lat: p.lat,
        lng: p.lng
    }));

    const newRoute = {
        id: generateId(),
        codexId: codexId, // NOW LINKED TO THE CODEX!
        points: plainPoints,
        distanceMiles: parseFloat(distStr) || 0,
        authorId: window.appData.currentUserUid
    };

    const updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasRoutes: [...(camp.atlasRoutes || []), newRoute]
    };

    // Auto-toggle the newly created route "ON" so the user instantly sees what they just drew!
    if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
    window.appData.activeAtlasRoutes.push(newRoute.id);

    await saveCampaign(updatedCamp);
    document.getElementById('atlas-route-modal').classList.add('hidden');
    window.appActions.setAtlasMode('pan');
    notify(`Route inscribed into the Atlas & Codex.`, "success");
    
    window.appActions.initAtlas();
};

export const viewOnMap = (codexId) => {
    // 1. Close any open Codex modal overlay
    document.getElementById('global-popup-container').innerHTML = '';
    
    // 2. Check if the requested Codex ID is attached to a Route. If it is, Auto-Toggle it ON!
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const targetRoute = camp?.atlasRoutes?.find(r => r.codexId === codexId);
    if (targetRoute) {
        if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
        if (!window.appData.activeAtlasRoutes.includes(targetRoute.id)) {
            window.appData.activeAtlasRoutes.push(targetRoute.id);
        }
    }

    // 3. Queue the focus ID so the Atlas knows to zoom in when it finishes mounting!
    window.appData.pendingAtlasFocus = codexId;
    
    // 4. Switch the view (which triggers data.js to call initAtlas via a tiny timeout)
    window.appActions.setView('atlas');
};

// --- MAP LAYERS UI ---

export const toggleAtlasLayers = () => {
    const panel = document.getElementById('atlas-layers-panel');
    if (panel) panel.classList.toggle('hidden');
};

export const toggleAtlasRouteVis = (routeId) => {
    if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
    
    const idx = window.appData.activeAtlasRoutes.indexOf(routeId);
    if (idx === -1) {
        window.appData.activeAtlasRoutes.push(routeId);
    } else {
        window.appData.activeAtlasRoutes.splice(idx, 1);
    }
    
    // Completely tearing down the DOM here with a reRender would abruptly close the Layers panel.
    // Instead, we just instantly call initAtlas() which natively re-draws the map entities in the background!
    window.appActions.initAtlas();
};


export const deleteAtlasPin = async (id) => {
    if (!confirm("Are you sure you want to remove this pin? (The Codex entry will remain safely in the archives)")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedCamp = {
        ...camp,
        atlasPins: (camp.atlasPins || []).filter(p => p.id !== id)
    };
    await saveCampaign(updatedCamp);
    notify("Pin removed.", "success");
    window.appActions.initAtlas();
};

export const deleteAtlasRoute = async (id) => {
    if (!confirm("Are you sure you want to remove this travel route? (The Codex entry will remain safely in the archives)")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedCamp = {
        ...camp,
        atlasRoutes: (camp.atlasRoutes || []).filter(r => r.id !== id)
    };
    await saveCampaign(updatedCamp);
    notify("Route removed.", "success");
    window.appActions.initAtlas();
};

export const toggleAtlasSettings = () => {
    const panel = document.getElementById('atlas-settings-panel');
    if (panel) panel.classList.toggle('hidden');
};

export const saveAtlasSettings = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const url = document.getElementById('cfg-url').value.trim();
    const pxSq = parseFloat(document.getElementById('cfg-px').value) || 50;
    const miSq = parseFloat(document.getElementById('cfg-miles').value) || 10;
    const showGrid = document.getElementById('cfg-show-grid').checked;

    const updatedCamp = {
        ...camp,
        atlasConfig: {
            url,
            pixelsPerSquare: pxSq,
            milesPerSquare: miSq,
            showGrid
        }
    };

    await saveCampaign(updatedCamp);
    window.appActions.toggleAtlasSettings();
    notify("Atlas configuration updated.", "success");
    
    window.appActions.initAtlas();
};
