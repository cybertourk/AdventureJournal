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
let drawingStopIndices = []; 

// Memory trackers
let savedMapCenter = null;
let savedMapZoom = null;
let isMapAnimating = false;

// Variables for custom right-click panning
let rightDrag = false;
let lastMousePos = null;

// --- MULTI-MAP HELPER ---
const getAtlasMaps = (camp) => {
    const legacyConfig = camp.atlasConfig || {
        url: 'https://files.catbox.moe/o3d82f.jpg',
        pixelsPerSquare: 50,
        milesPerSquare: 10,
        showGrid: true
    };
    return (camp.atlasMaps && camp.atlasMaps.length > 0) ? camp.atlasMaps : [{
        id: 'default-world',
        name: 'Overland Map',
        linkedCodexId: '',
        unit: 'Miles',
        ...legacyConfig
    }];
};

const updateCursor = () => {
    const container = document.getElementById('map-container');
    if (!container) return;
    if (currentMode === 'pan') {
        container.style.cursor = rightDrag ? 'grabbing' : 'grab';
    } else {
        container.style.cursor = 'crosshair';
    }
};

// --- GLOBAL WINDOW LISTENERS ---
if (typeof window !== 'undefined') {
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
            updateCursor();
        }
    });
}

// --- CALENDAR MATH HELPERS ---
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
    if (!container) return; 

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    if (mapInstance) {
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

    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;
    const config = maps.find(m => m.id === currentMapId) || maps[0];

    mapInstance = L.map('map-container', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 2,
        zoomControl: false,
        attributionControl: false,
        center: [0, 0],
        zoom: -1,
        dragging: false 
    });

    isMapAnimating = true;

    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    mapInstance.on('moveend', () => {
        // Only save memory when the map is safely done rendering/animating
        if (isMapAnimating) return;
        savedMapCenter = mapInstance.getCenter();
        savedMapZoom = mapInstance.getZoom();
    });

    const img = new Image();
    img.onload = function() {
        const w = this.width;
        const h = this.height;
        
        const bounds = [[0, 0], [h, w]];
        imageOverlay = L.imageOverlay(config.url, bounds).addTo(mapInstance);
        
        window.appActions.updateAtlasGridAndScale(w, h);
        entityLayer = L.layerGroup().addTo(mapInstance);
        renderAtlasEntities(camp);

        const applyView = (isFinal = false) => {
            if (!mapInstance) return;
            mapInstance.invalidateSize();
            
            if (window.appData.pendingAtlasFocus) {
                const focusId = window.appData.pendingAtlasFocus;
                if (isFinal) window.appData.pendingAtlasFocus = null; 

                const focusPin = (camp.atlasPins || []).find(p => p.codexId === focusId);
                if (focusPin) {
                    mapInstance.setView([focusPin.lat, focusPin.lng], 1, { animate: false }); 
                } else {
                    const focusRoute = (camp.atlasRoutes || []).find(r => r.codexId === focusId);
                    if (focusRoute && focusRoute.points && focusRoute.points.length > 0) {
                        const polyline = L.polyline(focusRoute.points);
                        mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50], animate: false });
                    } else {
                        mapInstance.fitBounds(bounds, { animate: false }); 
                    }
                }
            } 
            else if (savedMapCenter !== null && savedMapZoom !== null && !window.appData.forceAtlasResize) {
                mapInstance.setView(savedMapCenter, savedMapZoom, { animate: false });
            } 
            else {
                if (isFinal) window.appData.forceAtlasResize = false;
                
                // Bulletproof override: forcefully calculate center and apply it in one clean action
                const targetZoom = mapInstance.getBoundsZoom(bounds);
                mapInstance.setView([h / 2, w / 2], targetZoom, { animate: false });
            }

            if (isFinal) {
                setTimeout(() => { isMapAnimating = false; }, 100);
            }
        };

        // Apply cleanly after allowing the DOM to breathe, then again after CSS animations
        setTimeout(() => applyView(false), 20);
        setTimeout(() => applyView(true), 400); // Extended slightly to clear the 300ms CSS fade-in
    };
    img.onerror = function() {
        notify("Failed to load map image. Check the URL in Map Settings.", "error");
    };
    img.src = config.url;

    container.oncontextmenu = e => e.preventDefault();
    container.onmousedown = e => {
        if (e.button === 2) { 
            rightDrag = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            updateCursor();
        }
    };

    mapInstance.on('click', function(e) {
        if (e.originalEvent.button === 0 || e.originalEvent.type === 'touchend') {
            if (currentMode === 'pin') {
                document.getElementById('atlas-pin-lat').value = e.latlng.lat;
                document.getElementById('atlas-pin-lng').value = e.latlng.lng;
                
                document.getElementById('atlas-pin-codex-id').value = "";
                document.getElementById('atlas-pin-search').value = "";
                
                const iconInput = document.getElementById('atlas-pin-icon');
                if (iconInput) iconInput.value = "fa-solid fa-star";

                document.getElementById('atlas-pin-search-results').classList.add('hidden');
                document.getElementById('atlas-pin-modal').classList.remove('hidden');
                
                setTimeout(() => document.getElementById('atlas-pin-search').focus(), 100);
            } 
            else if (currentMode === 'draw') {
                const zoom = mapInstance.getZoom();
                const scale = Math.max(0.3, 1 + (zoom * 0.25));

                drawingPoints.push(e.latlng);
                if (!drawingPolyline) {
                    drawingPolyline = L.polyline(drawingPoints, { color: '#ef4444', weight: Math.max(2, 4 * scale), dashArray: '5, 10' }).addTo(mapInstance);
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
        if (!isMapAnimating && mapInstance) {
            savedMapCenter = mapInstance.getCenter();
            savedMapZoom = mapInstance.getZoom();
        }

        // Dynamically re-render pins so they scale seamlessly with zoom level
        if (entityLayer) {
            entityLayer.clearLayers();
            const currentCamp = window.appData.activeCampaign;
            if (currentCamp) renderAtlasEntities(currentCamp);
        }
        renderDrawingMarkers();
    });

    window.appActions.setAtlasMode('pan');
};

export const switchAtlasMap = (mapId) => {
    window.appData.currentAtlasMapId = mapId;
    window.appData.forceAtlasResize = true;
    
    // Explicitly wipe the memory so the new map centers perfectly on load
    savedMapCenter = null;
    savedMapZoom = null;
    
    // UI Core optimization skips HTML redraw for the Atlas to protect Leaflet.
    // We must manually update the settings DOM elements to match the new map!
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (camp) {
        const maps = getAtlasMaps(camp);
        const activeConfig = maps.find(m => m.id === mapId) || maps[0];
        
        const nameEl = document.getElementById('cfg-name');
        if (nameEl) nameEl.value = activeConfig.name || 'Unnamed Map';
        
        const urlEl = document.getElementById('cfg-url');
        if (urlEl) urlEl.value = activeConfig.url || '';
        
        const pxEl = document.getElementById('cfg-px');
        if (pxEl) pxEl.value = activeConfig.pixelsPerSquare || 50;
        
        const milesEl = document.getElementById('cfg-miles');
        if (milesEl) milesEl.value = activeConfig.milesPerSquare || 10;
        
        const unitEl = document.getElementById('cfg-unit');
        if (unitEl) unitEl.value = activeConfig.unit || 'Miles';
        
        // Setup Codex Linking Elements
        const codexEl = document.getElementById('cfg-linked-codex-id') || document.getElementById('cfg-linked-codex');
        if (codexEl) codexEl.value = activeConfig.linkedCodexId || '';
        
        const codexSearchEl = document.getElementById('cfg-linked-search');
        if (codexSearchEl) {
            const linkedEntry = (camp.codex || []).find(c => c.id === activeConfig.linkedCodexId);
            codexSearchEl.value = linkedEntry ? linkedEntry.name : '';
        }
        
        const gridEl = document.getElementById('cfg-show-grid');
        if (gridEl) gridEl.checked = activeConfig.showGrid !== false;
        
        const dd = document.querySelector('select[onchange="window.appActions.switchAtlasMap(this.value)"]');
        if (dd) dd.value = mapId;
    }

    window.appActions.initAtlas();
    window.appActions.setView('atlas'); // Forces UI refresh
};

export const createNewAtlasMap = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const name = prompt("Enter a name for the new sub-map:");
    if (!name) return;

    const maps = getAtlasMaps(camp);
    
    const newMap = {
        id: 'map_' + generateId(),
        name: name,
        url: 'https://www.transparenttextures.com/patterns/aged-paper.png', // Reliable default parchment texture
        pixelsPerSquare: 50,
        milesPerSquare: 1,
        unit: 'Miles',
        showGrid: true,
        linkedCodexId: ''
    };

    const updatedCamp = {
        ...camp,
        atlasMaps: [...maps, newMap]
    };

    await saveCampaign(updatedCamp);
    
    // Safely switch and update the DOM
    window.appActions.switchAtlasMap(newMap.id);
    
    // Force settings panel open so the user can easily update the image URL
    const panel = document.getElementById('atlas-settings-panel');
    if (panel && panel.classList.contains('hidden')) {
        window.appActions.toggleAtlasSettings(); 
    }
    
    notify("New map created! Paste your image URL in the settings.", "success");
};

export const deleteAtlasMap = async (mapId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const maps = getAtlasMaps(camp);
    if (maps.length <= 1) {
        notify("You cannot delete the last remaining map.", "error");
        return;
    }

    if (!confirm("Are you sure you want to delete this map? Its pins and routes will be orphaned.")) return;

    const updatedCamp = {
        ...camp,
        atlasMaps: maps.filter(m => m.id !== mapId)
    };

    await saveCampaign(updatedCamp);
    
    // Automatically switch back to the main map and update the DOM
    window.appActions.switchAtlasMap(updatedCamp.atlasMaps[0].id);
    window.appActions.toggleAtlasSettings();
    notify("Map deleted.", "success");
};

export const saveAtlasSettings = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;

    const url = document.getElementById('cfg-url').value.trim();
    const pxSq = parseFloat(document.getElementById('cfg-px').value) || 50;
    const miSq = parseFloat(document.getElementById('cfg-miles').value) || 10;
    const unit = document.getElementById('cfg-unit')?.value.trim() || 'Miles';
    const showGrid = document.getElementById('cfg-show-grid').checked;
    const linkedCodexId = (document.getElementById('cfg-linked-codex-id') || document.getElementById('cfg-linked-codex'))?.value.trim() || '';
    const name = document.getElementById('cfg-name')?.value.trim() || 'Unnamed Map';

    const updatedMaps = maps.map(m => {
        if (m.id === currentMapId) {
            return { ...m, url, pixelsPerSquare: pxSq, milesPerSquare: miSq, unit, showGrid, linkedCodexId, name };
        }
        return m;
    });

    const updatedCamp = {
        ...camp,
        atlasMaps: updatedMaps
    };

    savedMapCenter = null;
    savedMapZoom = null;

    await saveCampaign(updatedCamp);
    window.appActions.toggleAtlasSettings();
    notify("Active map configuration saved.", "success");
    
    setTimeout(() => window.appActions.setView('atlas'), 50);
};

export const toggleAtlasSettings = () => {
    const panel = document.getElementById('atlas-settings-panel');
    if (panel) panel.classList.toggle('hidden');
};

export const atlasMarkLastPointAsStop = () => {
    if (drawingPoints.length < 2) {
        notify("Draw at least one segment of a path before marking a stop.", "error");
        return;
    }
    
    const lastIdx = drawingPoints.length - 1;
    if (!drawingStopIndices.includes(lastIdx)) {
        drawingStopIndices.push(lastIdx);
        renderDrawingMarkers();
    }
};

const renderDrawingMarkers = () => {
    drawingMarkers.forEach(m => { if (mapInstance) mapInstance.removeLayer(m); });
    drawingMarkers = [];

    if (!mapInstance || drawingPoints.length === 0) return;

    const zoom = mapInstance.getZoom();
    const scale = Math.max(0.3, 1 + (zoom * 0.25));

    const startIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-emerald-500 rounded-full border-2 border-white shadow-sm" style="width: ${12*scale}px; height: ${12*scale}px;"></div>`, iconSize: [12*scale, 12*scale], iconAnchor: [6*scale, 6*scale] });
    const endIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-red-600 rounded-full border-2 border-white shadow-sm" style="width: ${12*scale}px; height: ${12*scale}px;"></div>`, iconSize: [12*scale, 12*scale], iconAnchor: [6*scale, 6*scale] });
    const stopIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-amber-500 rounded-full border-2 border-white shadow-sm" style="width: ${10*scale}px; height: ${10*scale}px;"></div>`, iconSize: [10*scale, 10*scale], iconAnchor: [5*scale, 5*scale] });

    drawingMarkers.push(L.marker(drawingPoints[0], { icon: startIcon, interactive: false }).addTo(mapInstance));
    
    if (drawingPoints.length > 1) {
        drawingMarkers.push(L.marker(drawingPoints[drawingPoints.length - 1], { icon: endIcon, interactive: false }).addTo(mapInstance));
    }
    
    drawingStopIndices.forEach(idx => {
        if (idx > 0 && idx < drawingPoints.length - 1) {
            drawingMarkers.push(L.marker(drawingPoints[idx], { icon: stopIcon, interactive: false }).addTo(mapInstance));
        }
    });

    if (drawingPolyline) {
        drawingPolyline.setStyle({ weight: Math.max(2, 4 * scale) });
    }
};

const renderAtlasLayerCheckboxes = (camp) => {
    const container = document.getElementById('atlas-route-checkboxes');
    if (!container) return;
    
    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;
    const activeRoutes = window.appData.activeAtlasRoutes || [];
    const cal = camp.calendar;

    const getSortVal = (dateObj) => {
        if (!dateObj) return 0;
        const monthIndex = parseInt(dateObj.month, 10) || 0;
        return (parseInt(dateObj.year, 10) * 10000) + (monthIndex * 100) + parseInt(dateObj.day, 10);
    };

    const filteredRoutes = (camp.atlasRoutes || []).filter(r => (r.mapId || 'default-world') === currentMapId);

    const sortedRoutes = [...filteredRoutes].sort((a, b) => {
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

    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;

    // Dynamic Scale Calculation based on Map Zoom
    const zoom = mapInstance ? mapInstance.getZoom() : 0;
    const scale = Math.max(0.3, 1 + (zoom * 0.25));

    // Filter Pins for Current Map
    const activePins = (camp.atlasPins || []).filter(p => (p.mapId || 'default-world') === currentMapId);

    activePins.forEach(pin => {
        const iconVal = pin.icon || 'fa-solid fa-star';
        let innerHtml = '';
        let pinSize = [30 * scale, 30 * scale];
        let pinAnchor = [15 * scale, 30 * scale];

        if (iconVal.startsWith('http') || iconVal.startsWith('data:image')) {
            innerHtml = `<img src="${iconVal}" class="w-full h-full object-contain drop-shadow-lg pointer-events-none" onerror="this.src='https://placehold.co/40x40?text=?'">`;
            pinSize = [40 * scale, 40 * scale]; // Reduced size for custom images, adjusted by zoom scale
            pinAnchor = [20 * scale, 40 * scale]; // Adjusted anchor so the bottom center points to the exact coordinate
        } else {
            innerHtml = `<i class="${iconVal}" style="font-size: ${16 * scale}px; line-height: ${30 * scale}px; text-align: center; width: 100%; display: block; color: inherit;"></i>`;
            pinSize = [30 * scale, 30 * scale];
            pinAnchor = [15 * scale, 30 * scale];
        }

        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: innerHtml,
            iconSize: pinSize,
            iconAnchor: pinAnchor 
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
                        
                        // Drill-Down Injection: Check if a local sub-map exists for this codex entry
                        const linkedMap = (camp.atlasMaps || []).find(m => m.linkedCodexId === cEntry.id);
                        if (linkedMap) {
                            setTimeout(() => {
                                const popup = document.getElementById('global-popup-container');
                                const modal = popup ? popup.querySelector('div > div') : null;
                                if (modal && !document.getElementById('injected-map-btn')) {
                                    const btnHtml = `<button id="injected-map-btn" onclick="window.appActions.switchAtlasMap('${linkedMap.id}'); document.getElementById('global-popup-container').innerHTML='';" class="w-full mt-3 mb-2 py-2.5 bg-emerald-900 text-amber-50 rounded-sm hover:bg-emerald-800 transition font-bold uppercase tracking-wider text-xs shadow-md border-2 border-emerald-700 animate-pulse"><i class="fa-solid fa-map-location-dot mr-2"></i> Enter Local Map: ${linkedMap.name}</button>`;
                                    const header = modal.querySelector('h2') || modal.querySelector('h3');
                                    if (header) {
                                        header.insertAdjacentHTML('afterend', btnHtml);
                                    }
                                }
                            }, 50); // slight delay to allow UI to paint
                        }
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

    const activeRoutesData = (camp.atlasRoutes || []).filter(r => (r.mapId || 'default-world') === currentMapId);
    const activeRoutes = window.appData.activeAtlasRoutes || [];
    
    const startIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-emerald-500 rounded-full border-2 border-white shadow-sm" style="width: ${12*scale}px; height: ${12*scale}px;"></div>`, iconSize: [12*scale, 12*scale], iconAnchor: [6*scale, 6*scale] });
    const endIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-red-600 rounded-full border-2 border-white shadow-sm" style="width: ${12*scale}px; height: ${12*scale}px;"></div>`, iconSize: [12*scale, 12*scale], iconAnchor: [6*scale, 6*scale] });
    const stopIcon = L.divIcon({ className: 'custom-route-node', html: `<div class="bg-amber-500 rounded-full border-2 border-white shadow-sm" style="width: ${10*scale}px; height: ${10*scale}px;"></div>`, iconSize: [10*scale, 10*scale], iconAnchor: [5*scale, 5*scale] });

    activeRoutesData.filter(r => activeRoutes.includes(r.id)).forEach(route => {
        const polyline = L.polyline(route.points, { color: '#ef4444', weight: Math.max(2, 4 * scale), dashArray: '5, 10' }).addTo(entityLayer);
        
        if (route.points.length > 0) {
            L.marker(route.points[0], { icon: startIcon, interactive: false }).addTo(entityLayer);
            if (route.points.length > 1) {
                L.marker(route.points[route.points.length - 1], { icon: endIcon, interactive: false }).addTo(entityLayer);
            }
            
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
                let unit = route.unit || 'Miles';
                const deleteBtn = canDelete ? `<button onclick="window.appActions.deleteAtlasRoute('${route.id}'); document.getElementById('global-popup-container').innerHTML = '';" class="w-full mt-4 py-2 bg-red-900/10 text-red-800 border border-red-900/30 hover:bg-red-900 hover:text-white rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm"><i class="fa-solid fa-trash mr-1"></i> Delete Route</button>` : '';

                const popup = document.getElementById('global-popup-container');
                popup.innerHTML = `
                    <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[17000] backdrop-blur-sm animate-in">
                        <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative animate-in border-t-4 border-t-amber-700">
                            <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-3.5 right-3 text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl p-1"></i></button>
                            <h3 class="font-serif font-bold text-lg text-amber-900 mb-1 pr-8"><i class="fa-solid fa-route text-amber-600 mr-1.5"></i> ${title}</h3>
                            <div class="bg-[#fdfbf7] p-3 rounded-sm border border-[#d4c5a9] mt-3 shadow-inner">
                                <p class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-0.5">Calculated Distance</p>
                                <p class="text-base font-bold text-emerald-600">${route.distanceMiles} ${unit}</p>
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
        
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        const maps = getAtlasMaps(camp);
        const config = maps.find(m => m.id === window.appData.currentAtlasMapId) || maps[0];
        const unit = config.unit || 'Miles';
        
        const val = document.getElementById('dist-val');
        if (val) val.innerText = `0 ${unit}`;
        
        drawingPoints = [];
        if (drawingPolyline && mapInstance) mapInstance.removeLayer(drawingPolyline);
        drawingPolyline = null;
        drawingMarkers.forEach(m => { if (mapInstance) mapInstance.removeLayer(m); });
        drawingMarkers = [];
        drawingStopIndices = [];
    }
    
    updateCursor();
};

export const updateAtlasGridAndScale = (imgW, imgH) => {
    if (!mapInstance) return;
    
    if (imgW !== undefined) window.appData.atlasDimensions = { w: imgW, h: imgH };
    const w = window.appData.atlasDimensions?.w || 2000;
    const h = window.appData.atlasDimensions?.h || 1500;

    const camp = window.appData.activeCampaign;
    const maps = getAtlasMaps(camp);
    const config = maps.find(m => m.id === window.appData.currentAtlasMapId) || maps[0];

    const pxSq = parseFloat(document.getElementById('cfg-px')?.value) || 50;
    const miSq = parseFloat(document.getElementById('cfg-miles')?.value) || 10;
    const unit = document.getElementById('cfg-unit')?.value || config.unit || 'Miles';
    
    const multiplier = Math.pow(2, mapInstance.getZoom());
    const visualWidthInPixels = pxSq * multiplier;
    
    const scaleBar = document.getElementById('scale-bar');
    const scaleText = document.getElementById('scale-text');
    if (scaleBar) scaleBar.style.width = `${visualWidthInPixels}px`;
    if (scaleText) scaleText.innerText = `${miSq} ${unit}`;

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
    const maps = getAtlasMaps(camp);
    const config = maps.find(m => m.id === window.appData.currentAtlasMapId) || maps[0];

    let totalPixels = 0;
    for (let i = 1; i < drawingPoints.length; i++) {
        const dx = drawingPoints[i].lng - drawingPoints[i-1].lng;
        const dy = drawingPoints[i].lat - drawingPoints[i-1].lat;
        totalPixels += Math.sqrt(dx*dx + dy*dy);
    }

    const pxSq = parseFloat(document.getElementById('cfg-px')?.value) || config.pixelsPerSquare;
    const miSq = parseFloat(document.getElementById('cfg-miles')?.value) || config.milesPerSquare;
    const unit = config.unit || 'Miles';

    const totalSquares = totalPixels / pxSq;
    const totalMiles = totalSquares * miSq;
    
    if (el) el.textContent = `${Math.round(totalMiles * 10) / 10} ${unit}`;
};

export const atlasUndoLastPoint = () => {
    if (drawingPoints.length > 0) {
        const poppedIdx = drawingPoints.length - 1;
        drawingPoints.pop();
        
        drawingStopIndices = drawingStopIndices.filter(i => i !== poppedIdx);
        
        if (drawingPolyline) {
            drawingPolyline.setLatLngs(drawingPoints);
        }
        renderDrawingMarkers();
        window.appActions.updateAtlasDistanceCalc();
    }
};

export const addAtlasRouteStop = (defaultDesc = "") => {
    const container = document.getElementById('atlas-route-stops-container');
    if (!container) return;

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

    let movingHours = distanceMiles / mph;
    let stopHours = 0;
    
    document.querySelectorAll('.stop-row .stop-hours').forEach(input => {
        stopHours += parseFloat(input.value) || 0;
    });

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
    const distStr = document.getElementById('dist-val').textContent;
    document.getElementById('atlas-route-dist').textContent = distStr;
    
    const stopsContainer = document.getElementById('atlas-route-stops-container');
    if (stopsContainer) stopsContainer.innerHTML = '';
    
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

    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;

    const distStr = document.getElementById('atlas-route-dist').textContent;
    let codexId = document.getElementById('atlas-route-codex-id').value;
    const searchInput = document.getElementById('atlas-route-search').value.trim();
    
    const distanceMiles = parseFloat(distStr) || 0;
    const mapUnit = (maps.find(m => m.id === currentMapId) || maps[0]).unit || 'Miles';
    const mode = document.getElementById('atlas-route-mode').value;
    const pace = document.getElementById('atlas-route-pace').value;
    
    const diffEl = document.getElementById('atlas-route-difficult');
    const isDifficult = diffEl ? diffEl.checked : false;

    if (!codexId && !searchInput) {
        notify("You must select or type a name for the route.", "error");
        return;
    }

    const stopsData = [];
    let stopHours = 0;
    document.querySelectorAll('.stop-row').forEach(row => {
        const desc = row.querySelector('.stop-desc').value.trim() || 'Unspecified Stop';
        const hrs = parseFloat(row.querySelector('.stop-hours').value) || 0;
        stopsData.push({ desc, hours: hrs });
        stopHours += hrs;
    });

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

    let calendarDuration = Math.max(1, Math.ceil(elapsedHours / 24));

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

    const modeSelect = document.getElementById('atlas-route-mode');
    const paceSelect = document.getElementById('atlas-route-pace');
    const modeLabel = modeSelect.options[modeSelect.selectedIndex].text.replace(/^[^\w\s]+/, '').trim(); 
    const paceLabel = paceSelect.options[paceSelect.selectedIndex].text;

    let updatedCodex = camp.codex || [];
    let entryName = searchInput;
    
    let descriptionText = `A journey logged on the Atlas.\n\n**Departure:** ${departureStr}\n**Arrival:** ${arrivalStr}\n**Total Distance:** ${distanceMiles.toFixed(1)} ${mapUnit}\n**Travel Mode:** ${modeLabel}\n**Travel Pace:** ${paceLabel}\n**Calculated Travel Time:** ${timeDisplay}`;

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
        stopIndices: drawingStopIndices, 
        distanceMiles: distanceMiles,
        unit: mapUnit,
        durationDays: calendarDuration, 
        startDate: departureDate,
        authorId: myUid,
        mapId: currentMapId
    };

    let updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasRoutes: [...(camp.atlasRoutes || []), newRoute]
    };

    if (!window.appData.activeAtlasRoutes) window.appData.activeAtlasRoutes = [];
    window.appData.activeAtlasRoutes.push(newRoute.id);

    if (!camp._isDM) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `inscribed a new travel route on the Atlas: <span class="font-bold text-stone-900">${entryName}</span>`, 'fa-route');
    }

    await saveCampaign(updatedCamp);
    document.getElementById('atlas-route-modal').classList.add('hidden');
    
    window.appActions.setAtlasMode('pan');
    notify(`Route inscribed into the Atlas & Codex.`, "success");
    
    window.appActions.refreshAtlasEntities();
};

export const searchAtlasCodex = (query, filterType = 'Location', customPrefix = null) => {
    const isRoute = filterType === 'Route';
    const prefix = customPrefix || (isRoute ? 'atlas-route' : 'atlas-pin');
    
    const resultsContainer = document.getElementById(`${prefix}-search-results`);
    if (!resultsContainer) return;
    
    if (!query || query.trim() === '') {
        resultsContainer.classList.add('hidden');
        const idInput = document.getElementById(`${prefix}-codex-id`);
        if (idInput) idInput.value = ""; 
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
    // Fallback allows for both suffix variants since we updated the settings panel ID convention
    const idInput = document.getElementById(`${prefix}-codex-id`) || document.getElementById(`${prefix}`);
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

    const maps = getAtlasMaps(camp);
    const currentMapId = window.appData.currentAtlasMapId || maps[0].id;

    const lat = parseFloat(document.getElementById('atlas-pin-lat').value);
    const lng = parseFloat(document.getElementById('atlas-pin-lng').value);
    let codexId = document.getElementById('atlas-pin-codex-id').value;
    const searchInput = document.getElementById('atlas-pin-search').value.trim();
    const iconData = document.getElementById('atlas-pin-icon')?.value.trim() || 'fa-solid fa-star';

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
        icon: iconData,
        authorId: myUid,
        mapId: currentMapId
    };

    let updatedCamp = {
        ...camp,
        codex: updatedCodex,
        atlasPins: [...(camp.atlasPins || []), newPin]
    };

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
            isMapAnimating = true;
            mapInstance.invalidateSize();
            setTimeout(() => { isMapAnimating = false; }, 150);
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

// --- BIND ACTIONS (CRITICAL FOR UI INTERACTION) ---
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.initAtlas = initAtlas;
    window.appActions.atlasMarkLastPointAsStop = atlasMarkLastPointAsStop;
    window.appActions.refreshAtlasEntities = refreshAtlasEntities;
    window.appActions.setAtlasMode = setAtlasMode;
    window.appActions.updateAtlasGridAndScale = updateAtlasGridAndScale;
    window.appActions.updateAtlasDistanceCalc = updateAtlasDistanceCalc;
    window.appActions.atlasUndoLastPoint = atlasUndoLastPoint;
    window.appActions.addAtlasRouteStop = addAtlasRouteStop;
    window.appActions.calculateAtlasRouteLive = calculateAtlasRouteLive;
    window.appActions.atlasFinishDrawing = atlasFinishDrawing;
    window.appActions.confirmAtlasRoute = confirmAtlasRoute;
    window.appActions.searchAtlasCodex = searchAtlasCodex;
    window.appActions.selectAtlasCodexEntry = selectAtlasCodexEntry;
    window.appActions.confirmAtlasPin = confirmAtlasPin;
    window.appActions.viewOnMap = viewOnMap;
    window.appActions.toggleAtlasFullScreen = toggleAtlasFullScreen;
    window.appActions.toggleAtlasLayers = toggleAtlasLayers;
    window.appActions.toggleAtlasRouteVis = toggleAtlasRouteVis;
    window.appActions.deleteAtlasPin = deleteAtlasPin;
    window.appActions.deleteAtlasRoute = deleteAtlasRoute;
    window.appActions.toggleAtlasSettings = toggleAtlasSettings;
    window.appActions.saveAtlasSettings = saveAtlasSettings;
    
    // New Multi-Map Bindings
    window.appActions.switchAtlasMap = switchAtlasMap;
    window.appActions.createNewAtlasMap = createNewAtlasMap;
    window.appActions.deleteAtlasMap = deleteAtlasMap;
}
