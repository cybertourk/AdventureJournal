import { reRender, generateId } from './state.js';
import { 
    PATTERN_CONFIG, 
    getOrInitPatternState, 
    upgradePatternRank, 
    adjustPatternParameter, 
    setPcEssentia, 
    saveRote, 
    deleteRote, 
    castPatternSpell 
} from './actions-pattern-magic.js';
import {
    PATTERN_THEME,
    PATTERN_ASSET_BASE_URL,
    injectTapestryStyles,
    getOrInitDraftState,
    calculateAffinityLimitsAndCosts,
    buildEffectsHTML
} from './ui-pattern-utils.js';
import './ui-pattern-events.js';

// =========================================================================
// Main Pattern Tapestry HTML Render
// =========================================================================
export function getPatternNexusHTML(state) {
    injectTapestryStyles();
    const camp = state.activeCampaign;
    if (!camp) return '';

    const myUid = state.currentUserUid;
    const isDM = camp._isDM;

    const activePcId = state.activePatternPcId || (camp.playerCharacters?.find(p => p.playerId === myUid)?.id) || '';
    const activePc = camp.playerCharacters?.find(p => p.id === activePcId);
    
    if (!activePc) {
        return `
        <div class="arcane-tapestry-bg min-h-screen flex flex-col items-center justify-center p-8 font-serif">
            <div class="max-w-md text-center p-8 parchment-panel rounded-sm relative">
                <i class="fa-solid fa-book-journal-whills text-amber-700 text-4xl mb-4"></i>
                <h3 class="font-bold text-2xl text-stone-900 mb-2">No Hero Available</h3>
                <p class="text-sm text-stone-600 leading-relaxed mb-6">Before you can weave the threads of reality, a hero must be initialized and bound to your account.</p>
                <button onclick="window.appActions.setView('pc-manager')" class="px-6 py-2 bg-stone-900 text-amber-50 rounded-sm uppercase tracking-wider text-xs font-bold shadow-md hover:bg-stone-800 transition-all">Open Roster</button>
            </div>
        </div>
        `;
    }

    const pm = getOrInitPatternState(activePc);
    
    // --- SCOPE FIX: Re-initialize draft and metrics locally ---
    const draft = getOrInitDraftState();
    const primary = draft.patterns[0] || null;
    const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);
    // -----------------------------------------------------------

    const isUnlocked = activePc.patternMagicUnlocked === true || (pm.spatia + pm.wyird + pm.dynamis + pm.vitar + pm.formus + pm.mentis + pm.arcani + pm.umbrus + pm.tempus > 0);
    
    if (!isUnlocked && !isDM) {
        return `
        <div class="arcane-tapestry-bg min-h-screen flex flex-col items-center justify-center p-8 font-serif">
            <div class="max-w-md text-center p-8 parchment-panel rounded-sm relative">
                <i class="fa-solid fa-eye-slash text-stone-400 text-4xl mb-4"></i>
                <h3 class="font-bold text-2xl text-stone-900 mb-2">The Tapestry is Hidden</h3>
                <p class="text-sm text-stone-600 leading-relaxed mb-6">Your mind has not yet awakened to the Patterns of reality. The Dungeon Master must unlock this potential within your character sheet.</p>
                <button onclick="window.appActions.setView('adventure')" class="px-6 py-2 bg-stone-900 text-amber-50 rounded-sm uppercase tracking-wider text-xs font-bold shadow-md hover:bg-stone-800 transition-all">Return to Campaign</button>
            </div>
        </div>
        `;
    }

    const pcSelectorHtml = `
        <div class="flex items-center gap-2 bg-[#fdfbf7] px-3 py-1.5 border border-[#d4c5a9] rounded-sm shadow-sm">
            <span class="text-[10px] uppercase tracking-widest text-stone-500 font-bold"><i class="fa-solid fa-user-circle mr-1"></i> Weaver:</span>
            <select onchange="window.appActions.switchPatternPc(this.value)" class="bg-transparent text-stone-900 border-none outline-none text-sm font-bold font-serif cursor-pointer py-0.5">
                ${camp.playerCharacters?.map(p => {
                    const hasAccess = p.patternMagicUnlocked || isDM;
                    if (!hasAccess) return '';
                    const isSelected = p.id === activePcId ? 'selected' : '';
                    return `<option value="${p.id}" ${isSelected}>${p.name}</option>`;
                }).join('')}
            </select>
        </div>
    `;

    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;

    let pipsHtml = '';
    for (let i = 1; i <= maxEssentia; i++) {
        const isFilled = pm.essentia >= i;
        const color = isFilled ? 'bg-amber-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-stone-800 border-stone-600 shadow-inner';
        pipsHtml += `
            <button type="button" 
                    onclick="window.appActions.setPcEssentia('${activePc.id}', ${i})"
                    class="w-4 h-4 rounded-full border-2 ${color} transition-all duration-300 hover:scale-125"
                    title="Set Essentia to ${i}/${maxEssentia}">
            </button>
        `;
    }

    const memorizedRotesList = pm.rotes || [];
    let rotesTabHtml = '';
    if (memorizedRotesList.length === 0) {
        rotesTabHtml = `
            <div class="p-6 text-center border border-dashed border-[#d4c5a9] bg-stone-50 rounded-sm">
                <p class="text-stone-500 italic text-xs font-serif">No rotes currently inscribed in your grimoire.</p>
            </div>
        `;
    } else {
        rotesTabHtml = `
            <div class="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                ${memorizedRotesList.map(r => {
                    const isSelected = draft.selectedRoteId === r.id;
                    const selectBorder = isSelected ? 'border-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.2)] bg-amber-50' : 'border-[#d4c5a9] bg-white hover:border-amber-400';

                    return `
                    <div class="p-3 border rounded-sm ${selectBorder} flex flex-col gap-2 transition cursor-pointer group hover:border-amber-400" onclick="window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')">
                        <div class="flex justify-between items-start border-b border-[#d4c5a9] pb-1.5">
                            <h5 class="text-sm font-bold text-stone-900 font-serif leading-tight">
                                <i class="fa-solid fa-scroll ${isSelected ? 'text-amber-600' : 'text-stone-400'} mr-1"></i> ${r.name}
                            </h5>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-stone-400 hover:text-red-700 transition px-1" title="Erase Rote">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">
                            ${r.patterns ? r.patterns.map(p => `<span class="bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-sm">${p.charAt(0).toUpperCase() + p.slice(1)}</span>`).join('') : ''}
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">
                            <span class="text-amber-700 bg-amber-50 px-2 py-1 rounded-sm border border-amber-200 shadow-sm">${r.essentiaCost} Essentia</span>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')" class="px-3 py-1 bg-stone-800 text-amber-50 hover:bg-amber-700 transition rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center group-hover:bg-amber-700"><i class="fa-solid fa-download mr-1.5"></i> Load Rote</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    const abilitySelectorHtml = `
        <div class="w-full">
            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Attuned Attribute</label>
            <select onchange="window.appActions.updateDraftField('ability', this.value, false)" class="w-full bg-white border border-[#d4c5a9] rounded-sm p-2.5 text-sm text-stone-900 font-bold font-sans outline-none shadow-sm focus:border-amber-600 transition-colors cursor-pointer uppercase tracking-wider">
                <option value="int" ${draft.ability === 'int' ? 'selected' : ''}>Intelligence (${activePc.int || 10})</option>
                <option value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>Wisdom (${activePc.wis || 10})</option>
                <option value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>Charisma (${activePc.cha || 10})</option>
            </select>
        </div>
    `;

    let dmAdministrationPanelHtml = '';
    if (isDM) {
        dmAdministrationPanelHtml = `
            <div class="p-5 bg-stone-900 border border-stone-700 rounded-sm mb-8 shadow-md">
                <h3 class="text-sm font-bold font-serif text-amber-500 uppercase tracking-widest flex items-center border-b border-stone-700 pb-2 mb-5">
                    <i class="fa-solid fa-crown text-amber-600 mr-2"></i> Dungeon Master's Loom Control
                </h3>
                
                <div class="flex flex-wrap items-center justify-between gap-4 mb-5 bg-[#1c1917] p-4 rounded-sm border border-stone-800 shadow-inner">
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Loom Access:</span>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" onchange="window.appActions.toggleCampaignPcAccess('${activePc.id}', this.checked)" ${activePc.patternMagicUnlocked ? 'checked' : ''} class="w-5 h-5 text-amber-600 rounded cursor-pointer border-stone-600 bg-stone-800 shadow-sm focus:ring-amber-500">
                            <span class="ml-2 text-xs font-bold text-stone-300">Awakened</span>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unspent Mastery Points:</span>
                        <div class="flex items-center gap-2 bg-stone-800 px-2 py-1 rounded border border-stone-700 shadow-sm">
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', -1)" class="w-6 h-6 flex items-center justify-center bg-stone-700 text-stone-300 hover:text-red-400 hover:bg-stone-600 transition rounded-sm font-bold"><i class="fa-solid fa-minus text-xs"></i></button>
                            <span class="text-sm font-black text-amber-400 w-6 text-center">${pm.patternPoints || 0}</span>
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', 1)" class="w-6 h-6 flex items-center justify-center bg-stone-700 text-stone-300 hover:text-emerald-400 hover:bg-stone-600 transition rounded-sm font-bold"><i class="fa-solid fa-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                        const val = pm[key] || 0;
                        return `
                        <div class="flex flex-col items-center justify-center p-3 bg-[#1c1917] border border-stone-800 rounded-sm shadow-inner gap-2">
                            <span class="text-[10px] font-serif font-bold uppercase tracking-wider" style="color: ${theme.color};">${key}</span>
                            <div class="flex items-center gap-1.5 bg-stone-800 px-1.5 py-1 rounded border border-stone-700">
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', -1)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-red-400 transition font-bold"><i class="fa-solid fa-minus text-[10px]"></i></button>
                                <span class="text-xs font-black text-stone-200 w-4 text-center">${val}</span>
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', 1)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-emerald-400 transition font-bold"><i class="fa-solid fa-plus text-[10px]"></i></button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    return `
    <div class="arcane-tapestry-bg min-h-screen text-stone-900 p-4 sm:p-6 lg:p-8 font-sans border-2 border-stone-900 shadow-2xl relative">
        <div id="pattern-info-modal-container"></div>
        <div class="max-w-6xl mx-auto">
            
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#78350f] pb-5">
                <div>
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-compass-drafting text-amber-500 text-3xl drop-shadow-md"></i>
                        <h2 class="text-3xl font-serif font-black tracking-wide text-[#f4ebd8] drop-shadow-lg">The Pattern Tapestry</h2>
                    </div>
                    <p class="text-[10px] text-amber-600/80 font-bold uppercase tracking-widest mt-2">Weave the fundamental threads of reality.</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    ${pcSelectorHtml}
                    <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 bg-[#fdfbf7] text-stone-800 border border-[#d4c5a9] rounded-sm hover:bg-white transition text-[10px] font-bold uppercase tracking-wider shadow-md">
                        <i class="fa-solid fa-door-open mr-2 text-amber-700"></i> Return
                    </button>
                </div>
            </div>

            ${dmAdministrationPanelHtml}

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                <!-- Left Panel -->
                <div class="lg:col-span-5 space-y-6">
                    
                    <!-- Clean Parchment Loom Widget (No Circles) -->
                    <div class="p-6 parchment-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-widest font-serif border-b border-[#d4c5a9] pb-2 mb-6 text-center"><i class="fa-solid fa-dharmachakra mr-1.5 text-amber-600"></i> The Loom of Reality</h3>
                        
                        <div class="relative w-[320px] h-[320px] flex items-center justify-center p-4 mx-auto mb-6 shrink-0">
                            <!-- SVG Loom Threads in Background -->
                            <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
                                <!-- Inner focus ring -->
                                <circle cx="160" cy="160" r="45" fill="none" stroke="#d4c5a9" stroke-width="1" opacity="0.3" stroke-dasharray="2 4" />
                                
                                ${primary ? Array.from({ length: 8 }).map((_, i) => {
                                    const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                                    const x1 = 160 + 35 * Math.cos(angle);
                                    const y1 = 160 + 35 * Math.sin(angle);
                                    const x2 = 160 + 105 * Math.cos(angle);
                                    const y2 = 160 + 105 * Math.sin(angle);
                                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4c5a9" stroke-width="1" stroke-dasharray="2 4" opacity="0.3" />`;
                                }).join('') : ''}
                            </svg>

                            <!-- Node buttons -->
                            <div class="absolute inset-0" id="loom-nodes-container"></div>
                        </div>

                        <div class="p-4 bg-stone-50 border border-[#d4c5a9] rounded-sm text-center text-xs text-stone-600 shadow-inner">
                            <p id="loom-hint-text" class="font-serif leading-relaxed italic">
                                ${draft.patterns.length === 0 
                                    ? `Select a thread from the outer ring to designate as your Primary Sigil.` 
                                    : draft.patterns.length === 9 
                                    ? `🚨 <span class="text-amber-700 font-bold">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!` 
                                    : `Select orbiting sigils to weave Support threads. Active threads define your capabilities.`}
                            </p>
                        </div>
                    </div>

                    <!-- Player Development: Attunement -->
                    <div class="p-5 leather-panel rounded-sm relative text-stone-200">
                        <div class="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
                            <h3 class="text-sm font-bold text-amber-500 uppercase tracking-widest font-serif flex items-center">
                                <i class="fa-solid fa-book-open text-amber-700 mr-2"></i> Attunement
                            </h3>
                            <span class="text-[10px] uppercase font-bold tracking-widest text-stone-400 bg-stone-800 px-2 py-1 rounded shadow-inner border border-stone-700">Unspent Points: <span class="text-amber-400">${pm.patternPoints || 0}</span></span>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-2.5">
                            ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                                const val = pm[key] || 0;
                                const canAdd = (pm.patternPoints || 0) > 0 && val < 5;
                                const isFocused = draft.patterns.includes(key);
                                const focusClass = isFocused ? 'border-amber-600/50 bg-stone-800/80 shadow-sm' : 'border-stone-800 bg-[#1c1917]';

                                return `
                                <div class="flex items-center justify-between p-3 border rounded-sm ${focusClass} transition-colors group cursor-pointer" onclick="window.appActions.openPatternInfoModal('${key}')">
                                    <div class="flex items-center gap-3">
                                        <div class="w-3 h-3 rounded-full shadow-inner border border-black group-hover:scale-125 transition-transform" style="background-color: ${theme.color};"></div>
                                        <div>
                                            <span class="text-xs font-bold text-stone-200 font-serif tracking-wide block leading-none mb-1 group-hover:text-amber-400 transition-colors">${theme.label} <i class="fa-solid fa-circle-info ml-1 text-stone-500 text-[10px]"></i></span>
                                            <span class="text-[9px] text-stone-500 font-sans uppercase tracking-widest leading-none block">${theme.desc}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm font-serif font-bold text-stone-300 w-8 text-right" onclick="event.stopPropagation()">${val} / 5</span>
                                        ${canAdd ? `
                                            <button onclick="event.stopPropagation(); window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2.5 py-1.5 bg-stone-700 hover:bg-emerald-700 text-stone-200 hover:text-white border border-stone-600 hover:border-emerald-600 rounded-sm transition-all text-[9px] font-bold uppercase tracking-wider shadow-md">
                                                <i class="fa-solid fa-arrow-up mr-1"></i> Train
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Cast Configuration Engine -->
                <div class="lg:col-span-7 space-y-6">
                    
                    <!-- Essentia Reservoir -->
                    <div class="p-5 leather-panel rounded-sm relative text-stone-200">
                        <div class="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
                            <h3 class="text-sm font-bold text-amber-500 uppercase tracking-widest font-serif flex items-center">
                                <i class="fa-solid fa-droplet text-amber-700 mr-2"></i> Essentia Reservoir
                            </h3>
                            <span class="text-[10px] uppercase font-bold tracking-widest text-stone-400 bg-stone-800 px-2 py-1 rounded shadow-inner border border-stone-700">Capacity: <span class="text-amber-400">${pm.essentia || 0} / ${maxEssentia}</span></span>
                        </div>
                        <div class="flex flex-wrap gap-3 p-4 bg-[#1c1917] rounded-sm border border-stone-800 justify-center min-h-[50px] shadow-inner">
                            ${pipsHtml || `<span class="text-[10px] text-stone-600 italic font-serif">Deepen your Attunement to expand your reservoir.</span>`}
                        </div>
                    </div>

                    <!-- Spell Form Formulation Engine -->
                    <div class="p-5 sm:p-6 parchment-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-widest font-serif border-b border-[#d4c5a9] pb-2 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span><i class="fa-solid fa-wand-sparkles mr-1.5 text-amber-600"></i> Weaving the Threads</span>
                            <span class="text-[9px] font-sans text-stone-500 normal-case tracking-normal italic font-normal">Select threads on the Loom to unlock tiers.</span>
                        </h3>

                        <!-- Draft Spell Identity -->
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5">
                            <div class="sm:col-span-8">
                                <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Tapestry Designation (Name)</label>
                                <input type="text" 
                                       id="draft-spell-name" 
                                       oninput="window.appActions.updateDraftField('name', this.value, false, true)" 
                                       value="${draft.name || ''}" 
                                       placeholder="Provide a name for this spell..." 
                                       class="w-full bg-white border border-[#d4c5a9] rounded-sm p-2.5 text-sm text-stone-900 font-bold font-serif outline-none shadow-sm focus:border-amber-600 transition-colors">
                            </div>
                            <div class="sm:col-span-4 flex items-end">
                                ${abilitySelectorHtml}
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Intent & Visualization</label>
                            <textarea id="draft-spell-desc" 
                                      oninput="window.appActions.updateDraftField('description', this.value, false, true)" 
                                      placeholder="Describe the aesthetic and physical ripples of your magic..." 
                                      class="w-full bg-white border border-[#d4c5a9] rounded-sm p-3 text-sm text-stone-800 outline-none font-serif focus:border-amber-600 resize-y min-h-[80px] shadow-sm custom-scrollbar">${draft.description || ''}</textarea>
                        </div>

                        <!-- Active Effects Scaffolding -->
                        <div id="effects-scaffolding-container" class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            ${buildEffectsHTML(metrics, draft, pm, activePc)}
                        </div>

                        <!-- Cost Outputs & Casting Trigger Card -->
                        <div class="p-5 bg-stone-900 text-stone-200 rounded-sm border-2 border-stone-800 shadow-xl relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-600"></div>
                            
                            <div class="flex flex-wrap justify-between items-center gap-4 pl-3">
                                <div>
                                    <span class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Essentia Fuel Required</span>
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-droplet text-amber-500 text-xl"></i>
                                        <strong id="tapestry-cost-out" class="text-3xl font-black font-serif text-amber-400 drop-shadow-md">
                                            ${draft.isRote ? `<span class="line-through text-stone-500 text-2xl mr-2">${metrics.totalBaseCost}</span>` : ''}${metrics.finalCost}
                                        </strong>
                                    </div>
                                    ${draft.isRote ? `<span class="inline-block mt-2 text-[9px] text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-2 py-1 rounded uppercase tracking-widest font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Rote Discount Applied</span>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Weaving Difficulty</span>
                                    <strong class="text-2xl font-black font-serif text-stone-100 bg-stone-800 px-4 py-2 rounded-sm border border-stone-600 shadow-inner">
                                        DC <span id="tapestry-dc-out">${metrics.dc}</span>
                                    </strong>
                                </div>
                            </div>

                            <!-- Save Rote Form -->
                            <div class="mt-5 pt-4 border-t border-stone-700 flex flex-col sm:flex-row gap-3 items-center pl-3">
                                <input type="text" 
                                       id="input-rote-memorize-name" 
                                       placeholder="Scribe configuration to Grimoire..." 
                                       class="flex-1 w-full bg-[#1c1917] border border-stone-600 rounded-sm p-2 text-xs text-stone-300 outline-none font-serif focus:border-amber-500 shadow-inner">
                                <button type="button" 
                                        onclick="window.appActions.memorizeCurrentDraftAsRote('${activePc.id}')"
                                        class="w-full sm:w-auto px-4 py-2 bg-stone-800 text-amber-400 hover:bg-amber-900 hover:text-amber-50 transition text-[10px] font-bold uppercase tracking-widest rounded-sm border border-stone-600 shadow-md whitespace-nowrap">
                                    <i class="fa-solid fa-feather-pointed mr-1.5"></i> Scribe Rote
                                </button>
                            </div>

                            <!-- Weave Spell Trigger -->
                            <div class="mt-4 pl-3">
                                <button type="button" 
                                        id="tapestry-cast-btn"
                                        onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                        class="w-full py-3.5 bg-amber-700 text-stone-950 hover:bg-amber-600 transition-all text-sm font-black uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(217,119,6,0.3)] border border-amber-500 flex items-center justify-center gap-2 active:scale-95">
                                    <i class="fa-solid fa-burst text-lg animate-pulse"></i> Unleash the Pattern
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 sm:p-6 parchment-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-widest font-serif border-b border-[#d4c5a9] pb-2 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span><i class="fa-solid fa-book-journal-whills mr-1.5 text-amber-600"></i> Memorized Grimoire</span>
                            <span class="text-[9px] font-sans text-stone-500 normal-case tracking-normal italic font-normal">Loading a Rote discounts its Essentia cost.</span>
                        </h3>
                        ${rotesTabHtml}
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

// =========================================================================
// UI EVENT BINDINGS & ACTIONS (Seamless Updates bypassing reRender)
// =========================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};

    // The core seamless updater function!
    window.appActions.refreshTapestryUI = () => {
        const camp = window.appData.activeCampaign;
        const activePcId = window.appData.activePatternPcId || (camp.playerCharacters?.find(p => p.playerId === window.appData.currentUserUid)?.id) || '';
        const activePc = camp.playerCharacters?.find(p => p.id === activePcId);
        if (!activePc) return;
        
        const pm = getOrInitPatternState(activePc);
        const draft = getOrInitDraftState();
        const primary = draft.patterns[0] || null;
        const supports = draft.patterns.slice(1);
        
        const cx = 160; const cy = 160; const radius = 105;
        const patternsList = Object.keys(PATTERN_THEME);
        
        // 1. ANIMATE THE LOOM
        if (!primary) {
            patternsList.forEach((key, index) => {
                const angle = (index * (360 / 9) - 90) * (Math.PI / 180);
                const x = cx + radius * Math.cos(angle) - 32; 
                const y = cy + radius * Math.sin(angle) - 32;
                
                const btn = document.getElementById(`sigil-btn-${key}`);
                if (btn) {
                    btn.classList.remove('pulse-prime-sigil');
                    // Setting these styles natively triggers the CSS transition!
                    btn.style.left = `${x}px`;
                    btn.style.top = `${y}px`;
                    btn.style.transform = 'scale(1)';
                    btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-20 opacity-40 hover:opacity-100 hover:z-[100] group';
                    const img = btn.querySelector('img');
                    if(img) img.style.filter = 'none';
                }
            });
        } else {
            const orbitsList = patternsList.filter(k => k !== primary);
            
            // Primary Sigil glides to center and gets large
            const primeBtn = document.getElementById(`sigil-btn-${primary}`);
            if (primeBtn) {
                primeBtn.style.left = `${cx - 32}px`;
                primeBtn.style.top = `${cy - 40}px`;
                primeBtn.style.transform = 'scale(1.4)';
                const theme = PATTERN_THEME[primary];
                primeBtn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-[100] opacity-100 pulse-prime-sigil group';
                const img = primeBtn.querySelector('img');
                if(img) img.style.filter = `drop-shadow(0 0 8px ${theme.color})`;
            }

            // Orbits glide into 8-point ring
            orbitsList.forEach((key, index) => {
                const angle = (index * (360 / 8) - 90) * (Math.PI / 180);
                const x = cx + radius * Math.cos(angle) - 32;
                const y = cy + radius * Math.sin(angle) - 32;
                
                const btn = document.getElementById(`sigil-btn-${key}`);
                const isSupported = supports.includes(key);
                const theme = PATTERN_THEME[key];
                
                if (btn) {
                    btn.classList.remove('pulse-prime-sigil');
                    btn.style.left = `${x}px`;
                    btn.style.top = `${y}px`;
                    btn.style.transform = 'scale(0.9)';
                    const img = btn.querySelector('img');
                    
                    if (isSupported) {
                        btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-[90] hover:z-[100] opacity-100 group';
                        if(img) img.style.filter = `drop-shadow(0 0 5px ${theme.color})`;
                    } else {
                        btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-10 hover:z-[100] opacity-40 hover:opacity-100 group';
                        if(img) img.style.filter = 'none';
                    }
                }
            });
        }
        
        // 2. UPDATE FORMS & METRICS (No page reload)
        const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);
        const formsContainer = document.getElementById('effects-scaffolding-container');
        if (formsContainer) {
            formsContainer.innerHTML = buildEffectsHTML(metrics, draft, pm, activePc);
        }
        
        const costEl = document.getElementById('tapestry-cost-out');
        if (costEl) costEl.innerText = metrics.finalCost;
        
        const dcEl = document.getElementById('tapestry-dc-out');
        if (dcEl) dcEl.innerText = metrics.dc;
        
        const hintEl = document.getElementById('loom-hint-text');
        if (hintEl) {
            if (draft.patterns.length === 0) hintEl.innerHTML = 'Select a thread from the outer ring to designate as your Primary Sigil.';
            else if (draft.patterns.length === 9) hintEl.innerHTML = '🚨 <span class="text-amber-700 font-bold">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!';
            else hintEl.innerHTML = 'Select orbiting sigils to weave Support threads. Active threads define your capabilities.';
        }

        const castBtn = document.getElementById('tapestry-cast-btn');
        if (castBtn) {
            let isValid = primary !== null;
            if (isValid) {
                for (const [cat, data] of Object.entries(PATTERN_CONFIG.Effects)) {
                    if (data.mandatory && (draft.effectTiers[cat] || 0) === 0) {
                        isValid = false;
                        break;
                    }
                }
            }
            castBtn.disabled = !isValid && !draft.isRote;
            if(castBtn.disabled) castBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
            else castBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
        }
    };

    window.appActions.switchPatternPc = (pcId) => {
        window.appData.activePatternPcId = pcId;
        reRender(true); // Hard reload is fine for character switching
    };

    window.appActions.toggleCampaignPcAccess = async (pcId, checked) => {
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) return;
        const pc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
        if (pc) {
            pc.patternMagicUnlocked = checked;
            await window.appActions.adjustPatternParameter(pcId, 'patternPoints', 0); // triggers Firebase update
        }
    };

    window.appActions.updateDraftField = (path, value, shouldRender = false, skipUIUpdate = false) => {
        const draft = getOrInitDraftState();
        if (path.startsWith('effectTiers.')) {
            const field = path.split('.')[1];
            draft.effectTiers[field] = value;
        } else {
            draft[path] = value;
        }
        
        if (shouldRender) reRender(true);
        else if (!skipUIUpdate) window.appActions.refreshTapestryUI(); // Silent update!
    };

    window.appActions.toggleWheelPattern = (patternKey) => {
        const draft = getOrInitDraftState();
        const prim = draft.patterns[0];

        if (!prim) {
            // First click: Element becomes Primary Vector
            draft.patterns = [patternKey];
            draft.isRote = false;
            draft.selectedRoteId = '';
        } else if (prim === patternKey) {
            // Clicking Primary again: Disbands vectors entirely
            draft.patterns = [];
            draft.isRote = false;
            draft.selectedRoteId = '';
        } else {
            // Toggles supporting vectors on orbit nodes
            const index = draft.patterns.indexOf(patternKey);
            if (index > -1) {
                draft.patterns.splice(index, 1);
            } else {
                draft.patterns.push(patternKey);
            }
            draft.isRote = false;
            draft.selectedRoteId = '';
        }
        window.appActions.refreshTapestryUI(); // Seamless animation!
    };

    window.appActions.toggleDurationInversion = (checked) => {
        const draft = getOrInitDraftState();
        draft.effectTiers.durationInverted = checked;
        draft.effectTiers.duration = 0; // reset tier selection
        window.appActions.refreshTapestryUI();
    };

    window.appActions.setEffectTier = (category, tierIndex) => {
        const draft = getOrInitDraftState();
        draft.effectTiers[category] = tierIndex;
        draft.isRote = false;
        draft.selectedRoteId = '';
        window.appActions.refreshTapestryUI();
    };

    window.appActions.memorizeCurrentDraftAsRote = async (pcId) => {
        const nameInput = document.getElementById('input-rote-memorize-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            window.appActions.notify("Your Grimoire requires a name for this Rote before scribing.", "error");
            return;
        }

        const draft = getOrInitDraftState();
        if (draft.patterns.length === 0) {
            window.appActions.notify("Weave threads on the Loom to configure a spell before saving.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === pcId);
        if (!pc) return;

        // Verify that draft configuration meets limit boundaries before saving!
        const pm = getOrInitPatternState(pc);
        const metrics = calculateAffinityLimitsAndCosts(pc, pm, draft);

        let exceeds = false;
        Object.keys(PATTERN_CONFIG.Effects).forEach(cat => {
            if ((draft.effectTiers[cat] || 0) > metrics.limits[cat]) exceeds = true;
        });

        if (exceeds) {
            window.appActions.notify("You cannot scribe a Rote containing elements that exceed your attuned Pattern Ranks.", "error");
            return;
        }

        // Setup the Rote structure payload
        const rotePayload = {
            name: name,
            primaryPattern: draft.patterns[0],
            essentiaCost: metrics.totalBaseCost - Math.floor(metrics.totalBaseCost / 3), // locked discounted cost
            description: draft.description,
            ability: draft.ability,
            patterns: [...draft.patterns],
            effectTiers: { ...draft.effectTiers }
        };

        const success = await window.appActions.saveRote(pcId, rotePayload);
        if (success) {
            if (nameInput) nameInput.value = '';
            reRender(true);
        }
    };

    window.appActions.loadRoteToDraft = (pcId, roteId) => {
        const camp = window.appData.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === pcId);
        if (!pc) return;

        const pm = pc.patternMagic || {};
        const rote = pm.rotes?.find(r => r.id === roteId);
        if (!rote) return;

        const draft = getOrInitDraftState();
        draft.name = rote.name;
        draft.description = rote.description;
        draft.ability = rote.ability;
        draft.patterns = [...rote.patterns];
        draft.effectTiers = { ...rote.effectTiers };
        draft.isRote = true;
        draft.roteName = rote.name;
        draft.selectedRoteId = rote.id;

        // Use seamless update to fill the forms and animate the loom instantly
        window.appActions.refreshTapestryUI(); 
        
        // Auto-scroll to the top of the form for convenience
        document.getElementById('draft-spell-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    
    // Create an explicit binding for deleteRote that safely triggers reRender
    window.appActions.deleteRote = async (pcId, roteId) => {
        if(confirm("Are you sure you want to permanently erase this Rote from your Grimoire?")) {
            const success = await deleteRote(pcId, roteId);
            if (success) reRender(true);
        }
    };

    window.appActions.castCurrentPatternSpell = async (pcId) => {
        const draft = getOrInitDraftState();
        if (draft.patterns.length === 0) {
            window.appActions.notify("A Primary Thread must be woven into the Loom before unleashing magic.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === pcId);
        if (!pc) return;

        const pm = getOrInitPatternState(pc);
        const metrics = calculateAffinityLimitsAndCosts(pc, pm, draft);

        if (pm.essentia < metrics.finalCost) {
            window.appActions.notify("Your Essentia Reservoir lacks the fuel required to weave this Pattern.", "error");
            return;
        }

        // Build config payload for roll actions
        const castConfig = {
            name: draft.name || 'Unlabeled Spell',
            description: draft.description,
            ability: draft.ability,
            patterns: [...draft.patterns],
            effectTiers: { ...draft.effectTiers },
            essentiaCost: metrics.finalCost,
            isRote: draft.isRote,
            roteName: draft.roteName
        };

        await castPatternSpell(pcId, castConfig);

        // Reset temporary non-rote draft casting parameters after successful cast!
        if (!draft.isRote) {
            draft.name = '';
            draft.description = '';
            draft.patterns = [];
            Object.keys(draft.effectTiers).forEach(key => {
                if (typeof draft.effectTiers[key] === 'number') draft.effectTiers[key] = 0;
            });
            draft.effectTiers.durationInverted = false;
        }

        reRender(true);
    };
}
