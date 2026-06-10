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
    getOrInitDraftState, 
    calculateAffinityLimitsAndCosts, 
    buildEffectsHTML,
    injectTapestryStyles
} from './ui-pattern-utils.js';

import './ui-pattern-events.js';

export function getPatternNexusHTML(state) {
    injectTapestryStyles();
    const camp = state.activeCampaign;
    if (!camp) return '';

    const myUid = state.currentUserUid;
    const isDM = camp._isDM;

    const activePcId = state.activePatternPcId || (camp.playerCharacters && camp.playerCharacters.find(p => p.playerId === myUid)?.id) || '';
    const activePc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === activePcId);
    
    if (!activePc) {
        return `
        <div class="arcane-tapestry-bg relative min-h-screen font-sans overflow-hidden">
            <div id="dynamic-weave-layer" class="dynamic-weave-bg"></div>
            <div class="fabric-texture"></div>
            <div class="weave-vignette"></div>
            <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
                <div class="max-w-md text-center p-8 glass-panel rounded-sm relative" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                    <i class="fa-solid fa-book-journal-whills text-amber-400 text-4xl mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"></i>
                    <h3 class="font-bold text-2xl text-white mb-2 font-serif drop-shadow-md">No Hero Available</h3>
                    <p class="text-sm text-slate-300 leading-relaxed mb-6 font-serif">Before you can weave the threads of reality, a hero must be initialized and bound to your account.</p>
                    <button onclick="window.appActions.setView('pc-manager')" class="px-6 py-2 glass-btn text-white rounded-sm uppercase tracking-wider text-xs font-bold shadow-md transition-all">Open Roster</button>
                </div>
            </div>
        </div>
        `;
    }

    const pm = getOrInitPatternState(activePc);
    const draft = getOrInitDraftState();
    const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);

    const isUnlocked = activePc.patternMagicUnlocked === true || (pm.spatia + pm.wyird + pm.dynamis + pm.vitar + pm.formus + pm.mentis + pm.arcani + pm.umbrus + pm.tempus > 0);
    
    if (!isUnlocked && !isDM) {
        return `
        <div class="arcane-tapestry-bg relative min-h-screen font-sans overflow-hidden">
            <div id="dynamic-weave-layer" class="dynamic-weave-bg"></div>
            <div class="fabric-texture"></div>
            <div class="weave-vignette"></div>
            <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
                <div class="max-w-md text-center p-8 glass-panel rounded-sm relative" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                    <i class="fa-solid fa-eye-slash text-slate-400 text-4xl mb-4 drop-shadow-lg"></i>
                    <h3 class="font-bold text-2xl text-white mb-2 font-serif drop-shadow-md">The Tapestry is Hidden</h3>
                    <p class="text-sm text-slate-300 leading-relaxed mb-6 font-serif">Your mind has not yet awakened to the Patterns of reality. The Dungeon Master must unlock this potential within your character sheet.</p>
                    <button onclick="window.appActions.setView('adventure')" class="px-6 py-2 glass-btn text-white rounded-sm uppercase tracking-wider text-xs font-bold shadow-md transition-all">Return to Campaign</button>
                </div>
            </div>
        </div>
        `;
    }

    const allowedWeavers = (camp.playerCharacters || []).filter(p => {
        const hasAccess = p.patternMagicUnlocked || isDM;
        const isOwner = p.playerId === myUid;
        return hasAccess && (isOwner || isDM);
    });

    const pcSelectorHtml = `
        <div class="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-sm shadow-sm" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
            <span class="text-[10px] uppercase tracking-widest text-slate-300 font-bold"><i class="fa-solid fa-user-circle mr-1 text-amber-400"></i> Weaver:</span>
            <select onchange="window.appActions.switchPatternPc(this.value)" class="bg-transparent text-white border-none outline-none text-sm font-bold font-serif cursor-pointer py-0.5">
                ${allowedWeavers.map(p => {
                    const isSelected = p.id === activePcId ? 'selected' : '';
                    return `<option class="text-black" value="${p.id}" ${isSelected}>${p.name}</option>`;
                }).join('')}
            </select>
        </div>
    `;

    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;

    let pipsHtml = '';
    for (let i = 1; i <= maxEssentia; i++) {
        const isFilled = pm.essentia >= i;
        const color = isFilled ? 'bg-amber-400 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]' : 'bg-slate-900/80 border-slate-600/50 shadow-inner';
        pipsHtml += `
            <button type="button" 
                    onclick="window.appActions.setPcEssentia('${activePc.id}', ${i})"
                    class="w-4 h-4 rounded-full border ${color} transition-all duration-300 hover:scale-125"
                    title="Set Essentia to ${i}/${maxEssentia}">
            </button>
        `;
    }

    const memorizedRotesList = pm.rotes || [];
    let rotesTabHtml = '';
    if (memorizedRotesList.length === 0) {
        rotesTabHtml = `
            <div class="p-6 text-center border border-dashed border-white/20 bg-slate-950/40 rounded-sm">
                <p class="text-slate-400 italic text-xs font-serif">No rotes currently inscribed in your grimoire.</p>
            </div>
        `;
    } else {
        rotesTabHtml = `
            <div class="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                ${memorizedRotesList.map(r => {
                    const isSelected = draft.selectedRoteId === r.id;
                    const selectBorder = isSelected ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] bg-amber-500/20' : 'border-white/10 bg-slate-950/50 hover:border-amber-400/50 hover:bg-slate-900/80';
                    const listDisplay = r.patterns.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');
                    const rankForPattern = pm[r.primaryPattern] || 0;
                    const titleText = rankForPattern > 0 ? PATTERN_CONFIG.ExpertiseTitles[rankForPattern] : "Unlearned";

                    return `
                    <div class="p-3 border rounded-sm ${selectBorder} flex flex-col gap-2 transition cursor-pointer group" onclick="window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')">
                        <div class="flex justify-between items-start border-b border-white/10 pb-1.5">
                            <div class="flex flex-col">
                                <h5 class="text-sm font-bold text-white font-serif leading-tight drop-shadow-md group-hover:text-amber-300 transition-colors">
                                    <i class="fa-solid fa-scroll ${isSelected ? 'text-amber-400' : 'text-slate-400'} mr-1"></i> ${r.name}
                                </h5>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-amber-400 mt-1 drop-shadow-sm">${r.primaryPattern} • ${titleText}</span>
                            </div>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-slate-500 hover:text-red-400 transition px-1" title="Erase Rote">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-1">
                            ${r.patterns.map(p => `<span class="bg-slate-900/60 border border-slate-600/50 px-1.5 py-0.5 rounded-sm shadow-sm">${p.charAt(0).toUpperCase() + p.slice(1)}</span>`).join('')}
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                            <span class="text-amber-300 bg-amber-900/40 px-2 py-1 rounded-sm border border-amber-500/30 shadow-sm"><i class="fa-solid fa-droplet text-amber-500 mr-1"></i> ${r.essentiaCost} E</span>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')" class="px-3 py-1 glass-btn text-white transition rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center hover:text-amber-200"><i class="fa-solid fa-download mr-1.5"></i> Load</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    let dmAdministrationPanelHtml = '';
    if (isDM) {
        dmAdministrationPanelHtml = `
            <div class="p-5 glass-panel rounded-sm mb-8 shadow-lg" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                <h3 class="text-sm font-bold font-serif text-amber-400 uppercase tracking-widest flex items-center border-b border-white/20 pb-2 mb-5 drop-shadow-md">
                    <i class="fa-solid fa-crown text-amber-400 mr-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"></i> Dungeon Master's Loom Control
                </h3>
                
                <div class="flex flex-wrap items-center justify-between gap-4 mb-5 bg-slate-900/50 p-4 rounded-sm border border-slate-600/30 shadow-inner">
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Loom Access:</span>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" onchange="window.appActions.toggleCampaignPcAccess('${activePc.id}', this.checked)" ${activePc.patternMagicUnlocked ? 'checked' : ''} class="w-5 h-5 text-amber-500 rounded cursor-pointer border-slate-600 bg-slate-950 shadow-sm focus:ring-amber-500">
                            <span class="ml-2 text-xs font-bold text-slate-200">Awakened</span>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Unspent Mastery Points:</span>
                        <div class="flex items-center gap-2 bg-slate-950/80 px-2 py-1 rounded border border-slate-700/50 shadow-sm">
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-white/10 transition rounded-sm font-bold"><i class="fa-solid fa-minus text-xs"></i></button>
                            <span class="text-sm font-black text-amber-400 w-6 text-center drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">${pm.patternPoints || 0}</span>
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', 1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition rounded-sm font-bold"><i class="fa-solid fa-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                        const val = pm[key] || 0;
                        return `
                        <div class="flex flex-col items-center justify-center p-3 bg-slate-900/50 border border-slate-600/30 rounded-sm shadow-inner gap-2">
                            <span class="text-[10px] font-serif font-bold uppercase tracking-wider drop-shadow-md" style="color: ${theme.color};">${key}</span>
                            <div class="flex items-center gap-1.5 bg-slate-950/80 px-1.5 py-1 rounded border border-slate-700/50">
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', -1)" class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-400 transition font-bold"><i class="fa-solid fa-minus text-[10px]"></i></button>
                                <span class="text-xs font-black text-white w-4 text-center drop-shadow-md">${val}</span>
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', 1)" class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition font-bold"><i class="fa-solid fa-plus text-[10px]"></i></button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const patternsList = Object.keys(PATTERN_THEME);
    const primary = draft.patterns[0] || null;
    const isConvergence = draft.patterns.length === 9;

    let loomHtml = '';

    patternsList.forEach((key, index) => {
        const theme = PATTERN_THEME[key];
        const rank = pm[key] || 0;
        const rankText = rank > 0 ? `(Rank ${rank})` : `(Unlearned)`;

        const angleDeg = index * (360 / 9) - 90;
        const startAngle = angleDeg - 360; 
        
        const initialTransform = `rotate(${startAngle}deg) translateX(0px) rotate(${-startAngle}deg) scale(0.1)`;

        loomHtml += `
            <button id="sigil-btn-${key}" type="button" 
                    onclick="window.appActions.toggleWheelPattern('${key}')"
                    style="transform: ${initialTransform}; color: ${theme.color};"
                    class="sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-20 opacity-0 group">
                <img src="${PATTERN_ASSET_BASE_URL}${key}.webp" alt="${theme.label}" class="w-20 h-20 object-contain transition-all duration-500 pointer-events-none" style="filter: brightness(1.5) drop-shadow(0 0 5px ${theme.color});" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="text-[11px] font-serif font-bold text-white mt-1 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] absolute -bottom-5 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 border border-white/20 rounded-sm shadow-md hidden group-hover:block z-[200] pointer-events-none">${theme.label} ${rankText}</span>
            </button>
        `;
    });

    const convergenceSpinClass = isConvergence ? 'spin-loom-slow' : '';

    setTimeout(() => {
        if (window.appActions && window.appActions.refreshTapestryUI) {
            window.appActions.refreshTapestryUI(pm);
        }
    }, 50);

    return `
    <div class="arcane-tapestry-bg relative min-h-screen font-sans overflow-hidden">
        <div id="dynamic-weave-layer" class="dynamic-weave-bg"></div>
        <div class="fabric-texture"></div>
        <div class="weave-vignette"></div>

        <div class="relative z-10 w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 text-slate-200">
            <div id="pattern-info-modal-container"></div>
            <div class="max-w-6xl mx-auto">
                
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-white/10 pb-5">
                    <div>
                        <div class="flex items-center gap-4">
                            <div class="relative flex items-center justify-center">
                                <!-- A dedicated white aura layer sitting physically behind the image -->
                                <div class="absolute inset-1 rounded-full bg-white/70 blur-[25px]"></div>
                                <!-- The icon, doubled in size to 96px (w-24 h-24) with a slight brightness bump -->
                                <img src="${PATTERN_ASSET_BASE_URL}arcani.webp" alt="Arcani Symbol" class="relative w-24 h-24 object-contain" style="filter: brightness(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.5));">
                            </div>
                            <h2 class="text-2xl font-serif font-black tracking-wide text-white drop-shadow-lg">The Pattern Tapestry</h2>
                        </div>
                        <p class="text-xs text-amber-300 font-bold uppercase tracking-widest mt-2 drop-shadow-md">Weave the fundamental threads of reality.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        ${pcSelectorHtml}
                        <button onclick="window.appActions.openWeavingGuideModal()" class="px-4 py-2 glass-btn text-white rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-md">
                            <i class="fa-solid fa-graduation-cap mr-2 text-amber-400"></i> Guide
                        </button>
                        <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 glass-btn text-white rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-md">
                            <i class="fa-solid fa-door-open mr-2 text-amber-400"></i> Return
                        </button>
                    </div>
                </div>

                ${dmAdministrationPanelHtml}

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                    
                    <div class="lg:col-span-5 space-y-6">
                        
                        <!-- STEP 1: THE LOOM -->
                        <div class="glass-panel rounded-sm relative" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            <div class="bg-slate-900/40 text-amber-400 p-3 rounded-t-sm border-b border-white/10 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-400/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">1</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">The Loom of Reality</h3>
                            </div>
                            
                            <div class="relative w-[320px] h-[320px] flex items-center justify-center p-4 mx-auto my-4 shrink-0 loom-circle rounded-full">
                                <svg class="absolute inset-0 w-full h-full pointer-events-none ${convergenceSpinClass}" viewBox="0 0 320 320">
                                    <circle cx="160" cy="160" r="45" fill="none" stroke="rgba(167, 139, 250, 0.4)" stroke-width="1.5" opacity="0.6" stroke-dasharray="2 4" />
                                    ${primary ? Array.from({ length: 8 }).map((_, i) => {
                                        const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                                        const x2 = 160 + 105 * Math.cos(angle);
                                        const y2 = 160 + 105 * Math.sin(angle);
                                        return `<line x1="160" y1="160" x2="${x2}" y2="${y2}" stroke="rgba(167, 139, 250, 0.4)" stroke-width="1.5" stroke-dasharray="2 4" opacity="0.6" />`;
                                    }).join('') : ''}
                                </svg>
                                <div class="absolute inset-0">
                                    ${loomHtml}
                                </div>
                            </div>

                            <div class="p-4 bg-slate-950/40 border-t border-white/10 text-center text-xs text-slate-300 shadow-inner rounded-b-sm">
                                <p id="loom-hint-text" class="font-serif leading-relaxed italic">
                                    ${draft.patterns.length === 0 
                                        ? `Select a thread from the outer ring to designate as your Primary Sigil.` 
                                        : draft.patterns.length === 9 
                                        ? `🚨 <span class="text-amber-400 font-bold drop-shadow-md">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!` 
                                        : `Select orbiting sigils to weave Support threads. Active threads define your capabilities.`}
                                </p>
                            </div>
                        </div>

                        <!-- HERO'S MATRIX -->
                        <div class="glass-panel rounded-sm relative text-slate-200" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            <div class="flex justify-between items-center border-b border-white/10 p-4 pb-3">
                                <h3 class="text-sm font-bold text-amber-400 uppercase tracking-widest font-serif flex items-center drop-shadow-md">
                                    <i class="fa-solid fa-bolt mr-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"></i> Hero's Matrix
                                </h3>
                                <span class="text-[10px] uppercase font-bold tracking-widest text-slate-300 bg-slate-900/60 px-2 py-1 rounded shadow-inner border border-slate-600/30">Unspent Points: <span class="text-amber-400">${pm.patternPoints || 0}</span></span>
                            </div>
                            
                            <div class="p-4 border-b border-white/5 bg-slate-900/20">
                                <div class="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-300 mb-2">
                                    <span class="flex items-center"><i class="fa-solid fa-droplet text-amber-400 mr-1.5 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]"></i> Essentia Reservoir</span>
                                    <span><span class="text-amber-400 drop-shadow-md">${pm.essentia || 0}</span> / ${maxEssentia}</span>
                                </div>
                                <div class="flex flex-wrap gap-3 p-3 bg-slate-950/60 rounded-sm border border-slate-700/50 justify-center shadow-inner">
                                    ${pipsHtml || `<span class="text-[10px] text-slate-500 italic font-serif">Deepen your Attunement to expand your reservoir.</span>`}
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-slate-700/30 flex flex-wrap justify-center gap-2">
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'long_rest')" class="px-3 py-1.5 glass-btn text-slate-200 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center hover:text-white" title="Recover 1d6">
                                        <i class="fa-solid fa-bed mr-1.5"></i> Long Rest
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'faint')" class="px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 text-teal-400 border border-teal-500/40 hover:border-teal-400/80 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 1d6">
                                        <i class="fa-solid fa-tower-observation mr-1.5"></i> Faint Echo
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'resonant')" class="px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 text-fuchsia-400 border border-fuchsia-500/40 hover:border-fuchsia-400/80 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 2d6">
                                        <i class="fa-solid fa-monument mr-1.5"></i> Resonant Locus
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'vibrant')" class="px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 text-amber-400 border border-amber-500/40 hover:border-amber-400/80 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 3d6">
                                        <i class="fa-solid fa-gopuram mr-1.5"></i> Vibrant Nexus
                                    </button>
                                </div>
                            </div>

                            <div class="p-4 grid grid-cols-1 gap-2.5">
                                ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                                    const val = pm[key] || 0;
                                    const canAdd = (pm.patternPoints || 0) > 0 && val < 5;
                                    const isFocused = draft.patterns.includes(key);
                                    const focusClass = isFocused ? 'border-amber-400/60 bg-slate-900/80 shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 'border-slate-700/50 bg-slate-900/30 hover:bg-slate-800/60 hover:border-slate-500/50';
                                    const titleText = val > 0 ? PATTERN_CONFIG.ExpertiseTitles[val] : "Unlearned";

                                    return `
                                    <div class="flex items-center justify-between p-3 border rounded-sm ${focusClass} transition-all group cursor-pointer" onclick="window.appActions.openPatternInfoModal('${key}')">
                                        <div class="flex items-center gap-3">
                                            <div class="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] border border-black/30 group-hover:scale-125 transition-transform" style="background-color: ${theme.color}; color: ${theme.color};"></div>
                                            <div>
                                                <span class="text-xs font-bold text-white font-serif tracking-wide block leading-none mb-1 group-hover:text-amber-300 transition-colors drop-shadow-md">${theme.label} <i class="fa-solid fa-circle-info ml-1 text-slate-400 text-[10px]"></i></span>
                                                <span class="text-[9px] text-slate-400 font-sans uppercase tracking-widest leading-none block">${theme.desc}</span>
                                                <span class="text-[8px] font-bold uppercase tracking-widest text-amber-400/90 mt-1 block">${titleText}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <span class="text-sm font-serif font-bold text-slate-200 w-8 text-right drop-shadow-md" onclick="event.stopPropagation()">${val} / 5</span>
                                            ${canAdd ? `
                                                <button onclick="event.stopPropagation(); window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2.5 py-1.5 glass-btn hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-300 text-slate-200 rounded-sm transition-all text-[9px] font-bold uppercase tracking-wider shadow-md">
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

                    <div class="lg:col-span-7 space-y-6">
                        
                        <!-- STEP 2: SPELL IDENTITY -->
                        <div class="glass-panel rounded-sm" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            <div class="bg-slate-900/40 text-amber-400 p-3 rounded-t-sm border-b border-white/10 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-400/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">2</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">Spell Identity & Intent</h3>
                            </div>
                            <div class="p-5">
                                <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5">
                                    <div class="sm:col-span-8">
                                        <label class="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Tapestry Designation (Name)</label>
                                        <input type="text" 
                                               id="draft-spell-name" 
                                               oninput="window.appActions.updateDraftField('name', this.value, false, true)" 
                                               value="${draft.name || ''}" 
                                               placeholder="Provide a name for this spell..." 
                                               class="w-full glass-input rounded-sm p-2.5 text-sm font-bold font-serif shadow-sm transition-colors">
                                    </div>
                                    <div class="sm:col-span-4 flex items-end">
                                        <div class="w-full">
                                            <label class="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Attuned Attribute</label>
                                            <select onchange="window.appActions.updateDraftField('ability', this.value, false)" class="w-full glass-input shadow-sm rounded text-white text-xs font-bold font-sans outline-none cursor-pointer uppercase tracking-wider p-2.5">
                                                <option class="text-black" value="int" ${draft.ability === 'int' ? 'selected' : ''}>Intelligence (${activePc.int || 10})</option>
                                                <option class="text-black" value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>Wisdom (${activePc.wis || 10})</option>
                                                <option class="text-black" value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>Charisma (${activePc.cha || 10})</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Intent & Visualization</label>
                                    <textarea id="draft-spell-desc" 
                                              oninput="window.appActions.updateDraftField('description', this.value, false, true)" 
                                              placeholder="Describe the aesthetic and physical ripples of your magic..." 
                                              class="w-full glass-input rounded-sm p-3 text-sm resize-y min-h-[80px] shadow-sm custom-scrollbar font-serif"></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: CONFIGURE EFFECTS -->
                        <div class="glass-panel rounded-sm" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            <div class="bg-slate-900/40 text-amber-400 p-3 rounded-t-sm border-b border-white/10 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-400/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">3</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">Configure Effects</h3>
                                <span class="text-[9px] font-sans text-slate-400 normal-case tracking-normal italic ml-auto hidden sm:block">Select threads on the Loom to unlock tiers.</span>
                            </div>
                            <div id="effects-scaffolding-container" class="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                ${buildEffectsHTML(metrics, draft, pm, activePc)}
                            </div>
                        </div>

                        <!-- STEP 4: REVIEW & UNLEASH -->
                        <div class="glass-panel rounded-sm text-slate-200" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            
                            <div class="p-4 border-b border-slate-700/50 bg-slate-950/40 flex items-center gap-3 pl-5">
                                <span class="bg-amber-500/20 border border-amber-400/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">4</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm text-amber-400 drop-shadow-md">Review & Unleash</h3>
                            </div>

                            <div class="p-5 pl-6">
                                <div class="flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Essentia Fuel Required</span>
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid fa-droplet text-amber-400 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"></i>
                                            <strong id="tapestry-cost-out" class="text-3xl font-black font-serif text-amber-400 drop-shadow-md">
                                                ${draft.isRote ? `<span class="line-through text-slate-500 text-2xl mr-2">${metrics.totalBaseCost}</span>` : ''}${metrics.finalCost}
                                            </strong>
                                        </div>
                                        ${draft.isRote ? `<span class="inline-block mt-2 text-[9px] text-emerald-300 bg-emerald-900/40 border border-emerald-500/40 px-2 py-1 rounded-sm uppercase tracking-widest font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Rote Discount Applied</span>` : ''}
                                    </div>
                                    <div class="text-right">
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weaving Difficulty</span>
                                        <strong class="text-2xl font-black font-serif text-white bg-slate-950/60 px-4 py-2 rounded-sm border border-slate-700/50 shadow-inner">
                                            DC <span id="tapestry-dc-out">${metrics.dc}</span>
                                        </strong>
                                    </div>
                                </div>

                                <div class="mt-5 pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row gap-3 items-center">
                                    <input type="text" 
                                           id="input-rote-memorize-name" 
                                           placeholder="Scribe configuration to Grimoire..." 
                                           class="flex-1 w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-inner">
                                    <button type="button" 
                                            onclick="window.appActions.memorizeCurrentDraftAsRote('${activePc.id}')"
                                            class="w-full sm:w-auto px-4 py-2 glass-btn text-amber-300 hover:text-amber-200 transition text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md whitespace-nowrap">
                                        <i class="fa-solid fa-feather-pointed mr-1.5"></i> Scribe Rote
                                    </button>
                                </div>

                                <div class="mt-4">
                                    <button type="button" 
                                            id="tapestry-cast-btn"
                                            onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                            class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 hover:from-amber-400 hover:to-yellow-300 transition-all text-sm font-black uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(251,191,36,0.5)] flex items-center justify-center gap-2 active:scale-95">
                                        <i class="fa-solid fa-burst text-lg animate-pulse"></i> Unleash the Pattern
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- GRIMOIRE QUICK LOAD -->
                        <div class="glass-panel rounded-sm" style="--base-hue: ${Math.floor(Math.random() * 360)}deg;">
                            <div class="bg-slate-900/30 text-slate-200 p-3 rounded-t-sm border-b border-white/10 flex items-center gap-3">
                                <i class="fa-solid fa-book-journal-whills text-amber-400 ml-1 drop-shadow-md"></i>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm">Memorized Grimoire</h3>
                            </div>
                            <div class="p-5">
                                ${rotesTabHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}
