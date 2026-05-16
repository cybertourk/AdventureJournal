import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { getPresetTravelData, getCoreTravelMath } from './actions-rules.js';
import { logPlayerActivity } from './actions-campaign.js';

// --- LEAFLET ATLAS STATE ---
let mapInstance = null;
let imageOverlay = null;
let gridOverlayLayer = null;
let entityLayer = null; 
let currentMode = 'pan'; 
let drawingPolyline = null;
let drawingPoints = [];
let drawingMarkers = []; 
let drawingStopIndices = []; // NEW: Tracks exactly which clicks were marked as official stops

// Memory trackers for preserving your viewport!
let savedMapCenter = null;
let savedMapZoom = null;

// --- CALENDAR MATH HELPERS (For Arrival Date Calculation) ---
const getDaysInYear = (cal) => cal.months.reduce((sum, m) => sum + parseInt(m.days || 0, 10), 0);

const getDayOfYear = (cal, mIdx, day) => {
    let doy = 0;
    for(let i = 0; i < mIdx; i++) doy += parseInt(cal.months[i].days || 0, 10);
    return doy + parseInt(day, 10);
};

const getDateFromDayOfYear = (cal, doy) => {
    let currentDoy = 0;
    for (let i = 0; i < cal.months.length; i++) {
        const mDays = parseInt(cal.months[i].days || 0, 10);
        if (currentDoy + mDays >= doy) {
            return { monthIndex: i, day: doy - currentDoy };
        }
        currentDoy += mDays;
    }
    return { monthIndex: Math.max(0, cal.months.length - 1), day: parseInt(cal.months[cal.months.length - 1]?.days || 1, 10) };
};

export const initAtlas = () => {
    const container = document.getElementById('map-container');
    if (!container) return; // Only run if the DOM is actively showing the Atlas

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    // Purge the old Leaflet instance to prevent initialization conflicts
    if (mapInstance) {
        // Backup the view state before destroying the instance (safety catch)
        savedMapCenter = mapInstance.getCenter();
        savedMapZoom = mapInstance.getZoom();
        
        mapInstance.remove();
        mapInstance = null;
        imageOverlay = null;
        gridOverlayLayer = null;
        entityLayer = null;
        drawingPolyline = null;
        drawingPoints = [];
        drawingMarkers = [];
        drawingStopIndices = [];
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

    // Track every movement the user makes so we never lose their spot
    mapInstance.on('moveend', () => {
        savedMapCenter = mapInstance.getCenter();
        savedMapZoom = mapInstance.getZoom();
    });

    // 2. Load the source image to extract natural pixel boundaries
    const img = new Image();
    img.onload = function() {
        const w = this.width;
        const h = this.height;
        
        const bounds = [[0, 0], [h, w]];
        imageOverlay = L.imageOverlay(config.url, bounds).addTo(mapInstance);
        
        // Render the Grid and initialize the Entity Layer Group
        window.appActions.updateAtlasGridAndScale(w, h);
        entityLayer = L.layerGroup().addTo(mapInstance);
        renderAtlasEntities(camp);

        // --- DYNAMIC JUMP-TO-TARGET FOCUS LOGIC ---
        if (window.appData.pendingAtlasFocus) {
            const focusId = window.appData.pendingAtlasFocus;
            window.appData.pendingAtlasFocus = null; 

            const focusPin = (camp.atlasPins || []).find(p => p.codexId === focusId);
            if (focusPin) {
                mapInstance.setView([focusPin.lat, focusPin.lng], 1); 
            } else {
                const focusRoute = (camp.atlasRoutes || []).find(r => r.codexId === focusId);
                if (focusRoute && focusRoute.points && focusRoute.points.length > 0) {
                    const polyline = L.polyline(focusRoute.points);
                    mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                } else {
                    mapInstance.fitBounds(bounds); 
                }
            }
        } 
        // --- SEAMLESS MEMORY RESTORE ---
        else if (savedMapCenter !== null && savedMapZoom !== null && !window.appData.forceAtlasResize) {
            // Restore the exact spot the user was looking at before the database saved
            mapInstance.setView(savedMapCenter, savedMapZoom, { animate: false });
        } 
        // --- DEFAULT BEHAVIOR (First Load or Full Screen Toggle) ---
        else {
            window.appData.forceAtlasResize = false;
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

    // --- 4. ACTION LEFT-CLICKS ---
    mapInstance.on('click', function(e) {
        if (e.originalEvent.button === 0 || e.originalEvent.type === 'touchend') {
            if (currentMode === 'pin') {
                document.getElementById('atlas-pin-lat').value = e.latlng.lat;
                document.getElementById('atlas-pin-lng').value = e.latlng.lng;
                
                document.getElementById('atlas-pin-codex-id').value = "";
                document.getElementById('atlas-pin-search').value = "";
                document.getElementById('atlas-pin-search-results').classList.add('hidden');
                document.getElementById('atlas-pin-modal').classList.remove('hidden');
                
                setTimeout(() => document.getElementById('atlas-pin-search').focus(), 100);
            } 
            else if (currentMode === 'draw') {
                drawingPoints.push(e.latlng);
                if (!drawingPolyline) {
                    drawingPolyline = L.polyline(drawingPoints, { color: '#ef4444', weight: 4, dashArray: '5, 10' }).addTo(mapInstance);
                } else {
                    drawingPolyline.setLatLngs(drawingPoints);
                }
                
                renderDrawingMarkers();
                window.appActions.updateAtlasDistanceCalc();
            }
        }
    });

    mapInstance.on('zoomend', () => {
        if(imageOverlay) {
            const bounds = imageOverlay.getBounds();
            window.appActions.updateAtlasGridAndScale(bounds.getEast(), bounds.getNorth());
        }
    });

    window.appActions.setAtlasMode('pan');
};

// --- NEW HELPER: FLAG THE LAST DRAWN POINT AS A STOP ---
export const atlasMarkLastPointAsStop = () => {
    if (drawingPoints.length < 2) {
        notify("Draw at least one segment of a path before marking a stop.", "error");
        return;
    }
    
    const lastIdx = drawingPoints.length - 1;
    // Don't double-flag if they click it multiple times
    if (!drawingStopIndices.includes(lastIdx)) {
        drawingStopIndices.push(lastIdx);
        renderDrawingMarkers();
    }
};

const renderDrawingMarkers = () => {
    // Clear out old markers
    drawingMarkers.forEach(m => { if (mapInstance) mapInstance.removeLayer(m); });
    drawingMarkers = [];

    if (!mapInstance || drawingPoints.length === 0) return;

    const startIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
    const endIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
    const stopIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });

    // Node 1: Start
    drawingMarkers.push(L.marker(drawingPoints[0], { icon: startIcon, interactive: false }).addTo(mapInstance));
    
    // Node Last: End
    if (drawingPoints.length > 1) {
        drawingMarkers.push(L.marker(drawingPoints[drawingPoints.length - 1], { icon: endIcon, interactive: false }).addTo(mapInstance));
    }
    
    // Middle Nodes: Only draw the amber dot if you explicitly marked it as a stop!
    drawingStopIndices.forEach(idx => {
        // Prevent drawing an amber dot perfectly underneath the Red "End" dot if it's currently the last point.
        // It will safely reveal itself when you draw the NEXT point.
        if (idx > 0 && idx < drawingPoints.length - 1) {
            drawingMarkers.push(L.marker(drawingPoints[idx], { icon: stopIcon, interactive: false }).addTo(mapInstance));
        }
    });
};

// Helper to dynamically re-render the layers panel checkboxes so the UI stays in sync without tearing down the DOM
const renderAtlasLayerCheckboxes = (camp) => {
    const container = document.getElementById('atlas-route-checkboxes');
    if (!container) return;
    
    const activeRoutes = window.appData.activeAtlasRoutes || [];
    const cal = camp.calendar;

    const getSortVal = (dateObj) => {
        if (!dateObj) return 0;
        const monthIndex = parseInt(dateObj.month, 10) || 0;
        return (parseInt(dateObj.year, 10) * 10000) + (monthIndex * 100) + parseInt(dateObj.day, 10);
    };

    const sortedRoutes = [...(camp.atlasRoutes || [])].sort((a, b) => {
        const aVal = getSortVal(a.startDate);
        const bVal = getSortVal(b.startDate);
        if (aVal !== bVal) return aVal - bVal; 
        return (a.name || "").localeCompare(b.name || ""); 
    });

    if (sortedRoutes.length === 0) {
        container.innerHTML = '<p class="p-2 text-[8px] italic text-stone-400">No routes inscribed yet.</p>';
        return;
    }

    container.innerHTML = sortedRoutes.map(r => {
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
    }).join('');
};

export const refreshAtlasEntities = () => {
    if (!mapInstance || !entityLayer) return;
    
    // Instantly wipe the old pins without touching the image or the camera view
    entityLayer.clearLayers();
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (camp) {
        renderAtlasEntities(camp);
        renderAtlasLayerCheckboxes(camp); 
    }
};

const renderAtlasEntities = (camp) => {
    if (!entityLayer) return;

    // Render Database Pins
    (camp.atlasPins || []).forEach(pin => {
        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: '<i class="fa-solid fa-star"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30] 
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(entityLayer);
        
        marker.on('click', () => {
            const isDM = camp._isDM;
            const canDelete = isDM || pin.authorId === window.appData.currentUserUid;

            if (currentMode === 'pin' && canDelete) {
                window.appActions.deleteAtlasPin(pin.id);
                return;
            }

            if (currentMode === 'pan') {
                if (pin.codexId) {
                    const cEntry = camp.codex?.find(c => c.id === pin.codexId);
                    if (cEntry) {
                        window.appActions.viewCodex(cEntry.id);
                        return; 
                    }
                }

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

    // Render Database Routes & Visual Node Markers
    const activeRoutes = window.appData.activeAtlasRoutes || [];
    
    const startIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
    const endIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
    const stopIcon = L.divIcon({ className: 'custom-route-node', html: '<div class="w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });

    (camp.atlasRoutes || []).filter(r => activeRoutes.includes(r.id)).forEach(route => {
        const polyline = L.polyline(route.points, { color: '#ef4444', weight: 4, dashArray: '5, 10' }).addTo(entityLayer);
        
        // Add decorative markers for Start, End, and Intermediate Stops!
        if (route.points.length > 0) {
            L.marker(route.points[0], { icon: startIcon, interactive: false }).addTo(entityLayer);
            if (route.points.length > 1) {
                L.marker(route.points[route.points.length - 1], { icon: endIcon, interactive: false }).addTo(entityLayer);
            }
            
            // Read from the saved database indices to drop the specific Stops
            const stopIdxs = route.stopIndices || [];
            stopIdxs.forEach(idx => {
                if (idx > 0 && idx < route.points.length - 1) {
                    L.marker(route.points[idx], { icon: stopIcon, interactive: false }).addTo(entityLayer);
                }
            });
        }
        
        polyline.on('click', () => {
            if (currentMode === 'pan') {
                const isDM = camp._isDM;
                const canDelete = isDM || route.authorId === window.appData.currentUserUid;

                if (route.codexId) {
                    const cEntry = camp.codex?.find(c => c.id === route.codexId);
                    if (cEntry) {
                        window.appActions.viewCodex(cEntry.id);
                        return; 
                    }
                }

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
        const baseClasses = "tool-btn flex items-center justify-center text-stone-400 transition-colors h-full rounded-full";
        const widthClass = document.querySelectorAll('.tool-btn').length === 2 && btn.id === 'mode-draw' ? 'w-1/2' : 'w-1/3';
        btn.className = `${baseClasses} ${widthClass}`;
    });

    const activeBtn = document.getElementById(`mode-${mode}`);
    if (activeBtn) activeBtn.classList.remove('text-stone-400');
    
    // Auto-clean any un-saved drawings when switching modes to prevent map clutter!
    if (mode !== 'draw') {
        const stats = document.getElementById('drawing-stats');
        if (stats) stats.classList.add('hidden');
        
        drawingPoints = [];
        if (drawingPolyline && mapInstance) mapInstance.removeLayer(drawingPolyline);
        drawingPolyline = null;
        drawingMarkers.forEach(m => { if (mapInstance) mapInstance.removeLayer(m); });
        drawingMarkers = [];
        drawingStopIndices = [];
    }

    if (mode === 'pan') {
        if (activeBtn) activeBtn.classList.add('text-amber-500', 'bg-stone-800');
    } else if (mode === 'pin') {
        if (activeBtn) activeBtn.classList.add('text-red-500', 'bg-red-900/20');
    } else if (mode === 'draw') {
        if (activeBtn) activeBtn.classList.add('text-blue-500', 'bg-blue-900/20');
        
        const stats = document.getElementById('drawing-stats');
        if (stats) stats.classList.remove('hidden');
        
        const val = document.getElementById('dist-val');
        if (val) val.innerText = "0 Miles";
        
        // Ensure a completely clean slate when drawing begins
        drawingPoints = [];
        if (drawingPolyline && mapInstance) mapInstance.removeLayer(drawingPolyline);
        drawingPolyline = null;
        drawingMarkers.forEach(m => { if (mapInstance) mapInstance.removeLayer(m); });
        drawingMarkers = [];
        drawingStopIndices = [];
    }
};

export const updateAtlasGridAndScale = (imgW, imgH) => {
    if (!mapInstance) return;
    
    if (imgW !== undefined) window.appData.atlasDimensions = { w: imgW, h: imgH };
    const w = window.appData.atlasDimensions?.w || 2000;
    const h = window.appData.atlasDimensions?.h || 1500;

    const pxSq = parseFloat(document.getElementById('cfg-px')?.value) || 50;
    const miSq = parseFloat(document.getElementById('cfg-miles')?.value) || 10;
    
    const multiplier = Math.pow(2, mapInstance.getZoom());
    const visualWidthInPixels = pxSq * multiplier;
    
    const scaleBar = document.getElementById('scale-bar');
    const scaleText = document.getElementById('scale-text');
    if (scaleBar) scaleBar.style.width = `${visualWidthInPixels}px`;
    if (scaleText) scaleText.innerText = `${miSq} Miles`;

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
        if (el) el.textContent = "0 Miles";
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
    
    if (el) el.textContent = `${Math.round(totalMiles * 10) / 10} Miles`;
};

export const atlasUndoLastPoint = () => {
    if (drawingPoints.length > 0) {
        const poppedIdx = drawingPoints.length - 1;
        drawingPoints.pop();
        
        // Remove it from the stops index if it was flagged as one!
        drawingStopIndices = drawingStopIndices.filter(i => i !== poppedIdx);
        
        if (drawingPolyline) {
            drawingPolyline.setLatLngs(drawingPoints);
        }
        renderDrawingMarkers();
        window.appActions.updateAtlasDistanceCalc();
    }
};

// --- TRAVEL MATH INTEGRATION ENGINE ---

export const addAtlasRouteStop = (defaultDesc = "") => {
    const container = document.getElementById('atlas-route-stops-container');
    if (!container) return;

    // Use default text if explicitly passed (e.g. from the auto-generator)
    const valAttr = (typeof defaultDesc === 'string' && defaultDesc) ? `value="${defaultDesc}"` : '';

    const html = `
        <div class="flex items-center gap-2 stop-row bg-white p-1.5 border border-[#d4c5a9] rounded-sm shadow-sm animate-in fade-in duration-200">
            <input type="text" ${valAttr} class="stop-desc flex-grow p-1.5 bg-transparent text-[10px] font-bold text-stone-900 outline-none placeholder:font-normal placeholder:italic placeholder:text-stone-400" placeholder="Event (e.g. Combat, Rest)..." oninput="window.appActions.calculateAtlasRouteLive()">
            <div class="w-px h-4 bg-stone-300 mx-1"></div>
            <input type="number" class="stop-hours w-12 p-1.5 bg-transparent text-[10px] font-bold text-stone-900 outline-none text-center" placeholder="0" min="0" oninput="window.appActions.calculateAtlasRouteLive()">
            <span class="text-[8px] font-bold text-stone-500 uppercase mr-1">Hrs</span>
            <button type="button" onclick="this.closest('.stop-row').remove(); window.appActions.calculateAtlasRouteLive()" class="text-stone-400 hover:text-red-600 bg-stone-100 hover:bg-red-50 p-1.5 rounded transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    window.appActions.calculateAtlasRouteLive();
};

export const calculateAtlasRouteLive = () => {
    const distStr = document.getElementById('atlas-route-dist')?.textContent || "0";
    const distanceMiles = parseFloat(distStr) || 0;
    
    const modeEl = document.getElementById('atlas-route-mode');
    const paceEl = document.getElementById('atlas-route-pace');
    const diffEl = document.getElementById('atlas-route-difficult');

    if (!modeEl || !paceEl) return;

    const mode = modeEl.value;
    const pace = paceEl.value;
    const isDifficult = diffEl ? diffEl.checked : false;

    const preset = getPresetTravelData(mode);
    const stats = getCoreTravelMath(mode, preset.speed, isDifficult);

    let mph = stats.normalMph;
    if (stats.showFastSlow) {
        if (pace === 'fast') mph = stats.fastMph;
        if (pace === 'slow') mph = stats.slowMph;
    }
    if (mph <= 0) mph = 1; 

    let travelHours = preset.hours;
    if (pace === 'forced') travelHours += 4;

    // --- TRUE CHRONOLOGICAL ELAPSED TIME MATH ---
    let movingHours = distanceMiles / mph;
    let stopHours = 0;
    
    // Tally up the dynamic stops!
    document.querySelectorAll('.stop-row .stop-hours').forEach(input => {
        stopHours += parseFloat(input.value) || 0;
    });

    let elapsedHours = 0;
    if (movingHours > 0) {
        let fullBlocks = Math.floor(movingHours / travelHours);
        let remainder = movingHours % travelHours;
        
        // Safety for floating point imprecision
        if (remainder < 0.01) remainder = 0;

        if (remainder === 0) {
            // Journey ends exactly at the end of a travel block (No final long rest required)
            elapsedHours = ((fullBlocks - 1) * 24) + travelHours;
        } else {
            // Journey ends mid-day
            elapsedHours = (fullBlocks * 24) + remainder;
        }
    }

    elapsedHours += stopHours;
    if (elapsedHours < 0) elapsedHours = 0;

    let finalDays = Math.floor(elapsedHours / 24);
    let finalHours = elapsedHours % 24;

    let timeDisplay = "";
    if (finalDays > 0 && finalHours > 0) {
        timeDisplay = `${finalDays} Day(s), ${parseFloat(finalHours.toFixed(1))} Hr(s)`;
    } else if (finalDays > 0) {
        timeDisplay = `${finalDays} Day(s)`;
    } else if (finalHours > 0) {
        timeDisplay = `${parseFloat(finalHours.toFixed(1))} Hr(s)`;
    } else {
        timeDisplay = "Instant";
    }

    // Update the live math UI readout
    const liveOut = document.getElementById('atlas-route-live-math');
    if (liveOut) {
        liveOut.innerHTML = `${timeDisplay} <span class="text-[9px] text-stone-400 normal-case tracking-normal ml-1 border-l border-stone-300 pl-2">(@ ${mph.toFixed(1)} mph)</span>`;
    }
    
    if (diffEl) {
        if (!preset.canBeDifficult) {
            diffEl.disabled = true;
            diffEl.checked = false;
        } else {
            diffEl.disabled = false;
        }
    }
};

export const atlasFinishDrawing = () => {
    if (drawingPoints.length < 2) {
        notify("You must draw a path with at least two points first.", "error");
        return;
    }
    // Set the visible textContent to power the calculations safely
    const distStr = document.getElementById('dist-val').textContent;
    document.getElementById('atlas-route-dist').textContent = distStr;
    
    // Clear out any lingering stops from previous saves
    const stopsContainer = document.getElementById('atlas-route-stops-container');
    if (stopsContainer) stopsContainer.innerHTML = '';
    
    // Auto-inject UI rows ONLY for explicitly marked stops!
    drawingStopIndices.forEach((pointIdx, idx) => {
        window.appActions.addAtlasRouteStop(`Stop ${idx + 1}`);
    });
    
    document.getElementById('atlas-route-modal').classList.remove('hidden');
    calculateAtlasRouteLive();
};

export const confirmAtlasRoute = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const distStr = document.getElementById('atlas-route-dist').textContent;
    let codexId = document.getElementById('atlas-route-codex-id').value;
    const searchInput = document.getElementById('atlas-route-search').value.trim();
    
    const distanceMiles = parseFloat(distStr) || 0;
    const mode = document.getElementById('atlas-route-mode').value;
    const pace = document.getElementById('atlas-route-pace').value;
    
    const diffEl = document.getElementById('atlas-route-difficult');
    const isDifficult = diffEl ? diffEl.checked : false;

    if (!codexId && !searchInput) {
        notify("You must select or type a name for the route.", "error");
        return;
    }

    // Gather Stops
    const stopsData = [];
    let stopHours = 0;
    document.querySelectorAll('.stop-row').forEach(row => {
        const desc = row.querySelector('.stop-desc').value.trim() || 'Unspecified Stop';
        const hrs = parseFloat(row.querySelector('.stop-hours').value) || 0;
        stopsData.push({ desc, hours: hrs });
        stopHours += hrs;
    });

    // --- EXECUTE TRUE CHRONOLOGICAL MATH ---
    const preset = getPresetTravelData(mode);
    const stats = getCoreTravelMath(mode, preset.speed, isDifficult);

    let mph = stats.normalMph;
    if (stats.showFastSlow) {
        if (pace === 'fast') mph = stats.fastMph;
        if (pace === 'slow') mph = stats.slowMph;
    }
    if (mph <= 0) mph = 1; 

    let travelHours = preset.hours;
    if (pace === 'forced') travelHours += 4;

    let movingHours = distanceMiles / mph;
    let elapsedHours = 0;

    if (movingHours > 0) {
        let fullBlocks = Math.floor(movingHours / travelHours);
        let remainder = movingHours % travelHours;
        
        if (remainder < 0.01) remainder = 0;

        if (remainder === 0) {
            elapsedHours = ((fullBlocks - 1) * 24) + travelHours;
        } else {
            elapsedHours = (fullBlocks * 24) + remainder;
        }
    }

    elapsedHours += stopHours;
    if (elapsedHours < 0) elapsedHours = 0;

    let finalDays = Math.floor(elapsedHours / 24);
    let finalHours = elapsedHours % 24;

    let timeDisplay = "";
    if (finalDays > 0 && finalHours > 0) {
        timeDisplay = `${finalDays} Day(s), ${parseFloat(finalHours.toFixed(1))} Hr(s)`;
    } else if (finalDays > 0) {
        timeDisplay = `${finalDays} Day(s)`;
    } else if (finalHours > 0) {
        timeDisplay = `${parseFloat(finalHours.toFixed(1))} Hr(s)`;
    } else {
        timeDisplay = "Instant";
    }

    // Determine how many slots it occupies on the Global Calendar Map
    let calendarDuration = Math.max(1, Math.ceil(elapsedHours / 24));

    // --- EXTRACT DATE MATH FOR THE DESCRIPTION ---
    const igY = parseInt(document.getElementById('atlas-route-year')?.value, 10);
    const igM = parseInt(document.getElementById('atlas-route-month')?.value, 10);
    const igD = parseInt(document.getElementById('atlas-route-day')?.value, 10);

    let departureDate = null;
    let departureStr = "Unknown Date";
    let arrivalStr = "Unknown Date";

    if (!isNaN(igY) && !isNaN(igM) && !isNaN(igD)) {
        departureDate = { year: igY, month: igM, day: igD };
        
        if (camp.calendar && camp.calendar.months) {
            let mName = camp.calendar.months[igM]?.name || "Unknown";
            if (mName.includes('(') && camp.calendar.months[igM]?.nickname === undefined) {
                mName = mName.split('(')[0].trim();
            }
            departureStr = `${igD} ${mName}, ${igY}`;

            if (calendarDuration <= 1) {
                arrivalStr = departureStr; 
            } else {
                const totalDays = getDaysInYear(camp.calendar);
                const startDoy = getDayOfYear(camp.calendar, igM, igD);
                const endDoy = startDoy + calendarDuration - 1;

                const eY = igY + Math.floor((endDoy - 1) / totalDays);
                let remDoy = ((endDoy - 1) % totalDays) + 1;
                let endMD = getDateFromDayOfYear(camp.calendar, remDoy);

                let emName = camp.calendar.months[endMD.monthIndex]?.name || "Unknown";
                if (emName.includes('(') && camp.calendar.months[endMD.monthIndex]?.nickname === undefined) {
                    emName = emName.split('(')[0].trim();
                }
                
                arrivalStr = `${endMD.day} ${emName}, ${eY}`;
            }
        }
    }

    // Extract nicely formatted labels for the Codex entry description
    const modeSelect = document.getElementById('atlas-route-mode');
    const paceSelect = document.getElementById('atlas-route-pace');
    const modeLabel = modeSelect.options[modeSelect.selectedIndex].text.replace(/^[^\w\s]+/, '').trim(); 
    const paceLabel = paceSelect.options[paceSelect.selectedIndex].text;

    let updatedCodex = camp.codex || [];
    let entryName = searchInput;
    
    let descriptionText = `A journey logged on the Atlas.\n\n**Departure:** ${departureStr}\n**Arrival:** ${arrivalStr}\n**Total Distance:** ${distanceMiles.toFixed(1)} Miles\n**Travel Mode:** ${modeLabel}\n**Travel Pace:** ${paceLabel}\n**Calculated Travel Time:** ${timeDisplay}`;

    // Append the Stops Breakdown!
    if (stopsData.length > 0) {
        descriptionText += `\n\n**Stops & Events:**\n`;
        stopsData.forEach(s => {
            descriptionText += `- ${s.desc} (${s.hours} Hrs)\n`;
        });
    }

    if (!codexId && searchInput) {
        codexId = generateId();
        const newEntry = {
            id: codexId,
            name: searchInput,
            type: 'Route',
            tags: ['Travel Log'],
            desc: descriptionText,
            authorId: myUid,
            visibility: { mode: 'public' }
        };
        updatedCodex = [...updatedCodex, newEntry];
    } else {
        const existingEntryIndex = updatedCodex.findIndex(c => c.id === codexId);
        if (existingEntryIndex > -1) {
            entryName = updatedCodex[existingEntryIndex].name;
            updatedCodex[existingEntryIndex] = {
                ...updatedCodex[existingEntryIndex],
                desc: updatedCodex[existingEntryIndex].desc + `\n\n---\n\n` + descriptionText
            };
        }
    }

    const plainPoints = drawingPoints.map(p => ({ lat: p.lat, lng: p.lng }));

    const newRoute = {
        id: generateId(),
        codexId: codexId,
        name: entryName, 
        points: plainPoints,
        stops: stopsData, 
        stopIndices: drawingStopIndices, // Save the visual indices so we can redraw the yellow dots perfectly
        distanceMiles: distanceMiles,
        durationDays: calendarDuration, 
        startDate: departureDate,
        authorId: myUid
    };

    let updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasRoutes: [...(camp.atlasRoutes || []), newRoute]
    };

    if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
    window.appData.activeAtlasRoutes.push(newRoute.id);

    // Apply the Activity Logger
    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `inscribed a new travel route on the Atlas: <span class="font-bold text-stone-900">${entryName}</span>`, 'fa-route');
    }

    await saveCampaign(updatedCamp);
    document.getElementById('atlas-route-modal').classList.add('hidden');
    
    // Automatically switches mode and clears un-saved drawings!
    window.appActions.setAtlasMode('pan');
    notify(`Route inscribed into the Atlas & Codex.`, "success");
    
    window.appActions.refreshAtlasEntities();
};


// --- CODEX SEARCH & LOCATION HELPERS ---
export const searchAtlasCodex = (query, filterType = 'Location') => {
    const isRoute = filterType === 'Route';
    const prefix = isRoute ? 'atlas-route' : 'atlas-pin';
    
    const resultsContainer = document.getElementById(`${prefix}-search-results`);
    if (!resultsContainer) return;
    
    if (!query || query.trim() === '') {
        resultsContainer.classList.add('hidden');
        document.getElementById(`${prefix}-codex-id`).value = ""; 
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const codex = camp?.codex || [];
    
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
                <span class="text-[9px] uppercase font-bold text-stone-500 ml-2 bg-stone-200 px-1.5 py-0.5 rounded-sm shadow-sm">${m.type}</span>
            </div>
        `;
    });

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
    if (idInput) idInput.value = id; 
    if (resultsContainer) resultsContainer.classList.add('hidden');
};

export const confirmAtlasPin = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
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
    let entryName = searchInput;
    
    if (!codexId && searchInput) {
        codexId = generateId();
        const newEntry = {
            id: codexId,
            name: searchInput,
            type: 'Location',
            tags: ['Map Pin'],
            desc: 'A newly discovered location on the Atlas.',
            authorId: myUid,
            visibility: { mode: 'public' }
        };
        updatedCodex = [...updatedCodex, newEntry];
    } else {
        const existingEntry = updatedCodex.find(c => c.id === codexId);
        if (existingEntry) entryName = existingEntry.name;
    }

    const newPin = {
        id: generateId(),
        lat,
        lng,
        codexId,
        customLabel: entryName,
        authorId: myUid
    };

    let updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasPins: [...(camp.atlasPins || []), newPin]
    };

    // Apply the Activity Logger
    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `marked a new location on the Atlas: <span class="font-bold text-stone-900">${entryName}</span>`, 'fa-map-pin');
    }

    await saveCampaign(updatedCamp);
    document.getElementById('atlas-pin-modal').classList.add('hidden');
    window.appActions.setAtlasMode('pan');
    notify("Pin dropped securely on the Atlas.", "success");
    
    window.appActions.refreshAtlasEntities();
};


export const viewOnMap = (codexId) => {
    document.getElementById('global-popup-container').innerHTML = '';
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const targetRoute = camp?.atlasRoutes?.find(r => r.codexId === codexId);
    if (targetRoute) {
        if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
        if (!window.appData.activeAtlasRoutes.includes(targetRoute.id)) {
            window.appData.activeAtlasRoutes.push(targetRoute.id);
        }
    }

    window.appData.pendingAtlasFocus = codexId;
    window.appActions.setView('atlas');
};

// --- MAP LAYERS & DISPLAY UI ---

export const toggleAtlasFullScreen = () => {
    window.appData.isAtlasFullScreen = !window.appData.isAtlasFullScreen;
    const isFull = window.appData.isAtlasFullScreen;

    const mainHeader = document.getElementById('main-header');
    const dock = document.getElementById('floating-dock-container');
    const resourceBar = document.getElementById('player-resource-bar');
    
    const atlasWrapper = document.getElementById('atlas-wrapper');
    if (!atlasWrapper) return;
    
    const atlasContainer = atlasWrapper.parentElement;
    const atlasHeader = atlasWrapper.previousElementSibling;
    const scaleInd = document.getElementById('scale-indicator');
    
    const mapToolsBtn = document.getElementById('mode-pan');
    const mapTools = mapToolsBtn ? mapToolsBtn.closest('.z-40.absolute') : null;
    
    const fullscreenBtn = document.querySelector('button[onclick="window.appActions.toggleAtlasFullScreen()"]');

    if (isFull) {
        if (mainHeader) mainHeader.style.display = 'none';
        if (dock) dock.style.display = 'none';
        if (resourceBar) resourceBar.style.display = 'none';
        
        if (atlasHeader) atlasHeader.style.display = 'none';
        
        if (atlasContainer) {
            atlasContainer.className = "fixed inset-0 z-[60] w-full h-[100dvh] bg-[#1c1917] flex flex-col";
        }
        if (atlasWrapper) {
            atlasWrapper.className = "flex-grow relative bg-[#1c1917] overflow-hidden";
        }
        
        if (scaleInd) {
            scaleInd.classList.remove('bottom-32', 'sm:bottom-28');
            scaleInd.classList.add('bottom-24', 'sm:bottom-20');
        }
        if (mapTools) {
            mapTools.classList.remove('top-4');
            mapTools.classList.add('bottom-6', 'sm:bottom-8');
        }
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
            fullscreenBtn.title = "Exit Full Screen";
        }
    } else {
        if (mainHeader) mainHeader.style.display = '';
        if (dock) dock.style.display = '';
        if (resourceBar) resourceBar.style.display = '';
        
        if (atlasHeader) atlasHeader.style.display = '';
        
        if (atlasContainer) {
            atlasContainer.className = "animate-in fade-in duration-300 w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] relative";
        }
        if (atlasWrapper) {
            atlasWrapper.className = "flex-grow relative bg-[#1c1917] overflow-hidden rounded-b-sm border-x-2 border-b-2 border-stone-800 shadow-[0_15px_40px_rgba(0,0,0,0.7)]";
        }
        
        if (scaleInd) {
            scaleInd.classList.remove('bottom-24', 'sm:bottom-20');
            scaleInd.classList.add('bottom-32', 'sm:bottom-28');
        }
        if (mapTools) {
            mapTools.classList.remove('bottom-6', 'sm:bottom-8');
            mapTools.classList.add('top-4');
        }
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
            fullscreenBtn.title = "Full Screen";
        }
    }

    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    }, 100);
};

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
    
    window.appActions.refreshAtlasEntities();
};

export const deleteAtlasPin = async (id) => {
    if (!confirm("Are you sure you want to remove this pin? (The Codex entry will remain safely in the archives)")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    let updatedCamp = {
        ...camp,
        atlasPins: (camp.atlasPins || []).filter(p => p.id !== id)
    };
    
    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `removed a pin from the Atlas.`, 'fa-eraser');
    }

    await saveCampaign(updatedCamp);
    notify("Pin removed.", "success");
    window.appActions.refreshAtlasEntities();
};

export const deleteAtlasRoute = async (id) => {
    if (!confirm("Are you sure you want to remove this travel route? (The Codex entry will remain safely in the archives)")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    let updatedCamp = {
        ...camp,
        atlasRoutes: (camp.atlasRoutes || []).filter(r => r.id !== id)
    };
    
    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `erased a travel route from the Atlas.`, 'fa-eraser');
    }

    await saveCampaign(updatedCamp);
    notify("Route removed.", "success");
    window.appActions.refreshAtlasEntities();
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

    savedMapCenter = null;
    savedMapZoom = null;

    await saveCampaign(updatedCamp);
    window.appActions.toggleAtlasSettings();
    notify("Atlas configuration updated.", "success");
    
    setTimeout(() => window.appActions.initAtlas(), 50);
};
