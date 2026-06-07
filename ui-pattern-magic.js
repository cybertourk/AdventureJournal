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

// =========================================================================
// UI CONSTANTS & THEMES
// =========================================================================
const PATTERN_THEME = {
    spatia: { color: '#0ea5e9', label: 'Spatia', desc: 'Space, distance, and dimensional connections.' },
    wyird: { color: '#8b5cf6', label: 'Wyird', desc: 'Chance, fate, probability, and entropy.' },
    dynamis: { color: '#ef4444', label: 'Dynamis', desc: 'Raw energy, heat, kinetic force, and elements.' },
    vitar: { color: '#10b981', label: 'Vitar', desc: 'Life essence, biology, healing, and decay.' },
    formus: { color: '#f59e0b', label: 'Formus', desc: 'Physical matter, transmutation, and shaping.' },
    mentis: { color: '#ec4899', label: 'Mentis', desc: 'Thoughts, emotions, illusions, and the mind.' },
    arcani: { color: '#3b82f6', label: 'Arcani', desc: 'Pure magical energy, sensing, and dispelling.' },
    umbrus: { color: '#6366f1', label: 'Umbrus', desc: 'Spirits, shadows, and ethereal boundaries.' },
    tempus: { color: '#14b8a6', label: 'Tempus', desc: 'Time flow, causality, and temporal manipulation.' }
};

// =========================================================================
// LOCAL STATE MANAGEMENT
// =========================================================================
let draftState = null;

export const getOrInitDraftState = () => {
    if (!draftState) {
        draftState = {
            name: '',
            description: '',
            ability: 'int',
            patterns: [],
            effectTiers: {
                durationInverted: false
            },
            isRote: false,
            selectedRoteId: '',
            roteName: ''
        };
        // Initialize all effect tiers to 0
        Object.keys(PATTERN_CONFIG.Effects).forEach(key => {
            draftState.effectTiers[key] = 0;
        });
    }
    return draftState;
};

// =========================================================================
// CSS INJECTION (Dynamic Tapestry Aesthetic)
// =========================================================================
export const injectTapestryStyles = () => {
    if (document.getElementById('tapestry-dynamic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'tapestry-dynamic-styles';
    style.innerHTML = `
        .arcane-tapestry-bg {
            background-color: #050505;
            background-image: 
                radial-gradient(circle at 50% 50%, rgba(20, 20, 25, 0.8) 0%, #000 100%),
                repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 10px),
                repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 10px);
            color: #e5e5e5;
        }
        
        .glass-panel {
            background: rgba(10, 10, 10, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        
        .parchment-panel {
            background: rgba(15, 15, 15, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(212, 197, 169, 0.15);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
            color: #d4c5a9;
        }

        .leather-panel {
            background: rgba(20, 15, 10, 0.7);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(120, 53, 15, 0.3);
            box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
        }

        .pulse-prime-sigil {
            animation: pulse-glow 2s infinite alternate;
        }

        @keyframes pulse-glow {
            0% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.5)); }
            100% { filter: drop-shadow(0 0 15px rgba(255,255,255,1)); transform: scale(1.45); }
        }
    `;
    document.head.appendChild(style);
};

// =========================================================================
// MATH ENGINE
// =========================================================================
export const calculateAffinityLimitsAndCosts = (pc, pm, draft) => {
    const limits = {};
    let totalBaseCost = 0;

    Object.keys(PATTERN_CONFIG.Effects).forEach(key => limits[key] = 0);

    const primaryKey = draft.patterns[0] || null;
    const supportKeys = draft.patterns.slice(1);

    if (primaryKey) {
        const pRank = pm[primaryKey] || 0;
        const pAffinities = PATTERN_CONFIG.Affinities[primaryKey];
        pAffinities.primary.forEach(eff => limits[eff] = Math.max(limits[eff], pRank + 1));
        pAffinities.secondary.forEach(eff => limits[eff] = Math.max(limits[eff], pRank));
    }

    supportKeys.forEach(sKey => {
        const sRank = pm[sKey] || 0;
        const sAffinities = PATTERN_CONFIG.Affinities[sKey];
        sAffinities.primary.forEach(eff => limits[eff] = Math.max(limits[eff], sRank));
        sAffinities.secondary.forEach(eff => limits[eff] = Math.max(limits[eff], sRank));
    });

    // Ensure Mandatory baseline Tier 1 (Cost 1) if a pattern is selected
    if (draft.patterns.length > 0) {
        Object.entries(PATTERN_CONFIG.Effects).forEach(([effKey, effData]) => {
            if (effData.mandatory && limits[effKey] === 0) {
                limits[effKey] = 1;
            }
        });
    }

    // Cap at Tier 5
    Object.keys(limits).forEach(key => {
        limits[key] = Math.min(limits[key], 5);
    });

    // Calculate Costs based on selections
    Object.entries(PATTERN_CONFIG.Effects).forEach(([effKey, effData]) => {
        const selectedTier = draft.effectTiers[effKey] || 0;
        if (selectedTier > 0) {
            let tierList = effData.tiers;
            if (effKey === 'duration' && draft.effectTiers.durationInverted) {
                tierList = effData.invertedTiers;
            }
            if (tierList[selectedTier]) {
                totalBaseCost += tierList[selectedTier].cost;
            }
        }
    });

    let finalCost = totalBaseCost;
    if (draft.isRote) {
        finalCost = totalBaseCost - Math.floor(totalBaseCost / 3);
    }

    let totalPatternRating = 0;
    draft.patterns.forEach(key => totalPatternRating += (pm[key] || 0));
    const abilityMod = pc ? Math.floor(((parseInt(pc[draft.ability || 'int']) || 10) - 10) / 2) : 0;
    const dc = 10 + finalCost;

    return { limits, totalBaseCost, finalCost, totalPatternRating, abilityMod, dc };
};

// =========================================================================
// HTML BUILDER HELPERS
// =========================================================================
export const buildEffectsHTML = (metrics, draft, pm, activePc) => {
    let html = '';
    
    Object.entries(PATTERN_CONFIG.Effects).forEach(([catKey, catData]) => {
        const limit = metrics.limits[catKey] || 0;
        const currentSelected = draft.effectTiers[catKey] || 0;
        const isMandatory = catData.mandatory;

        // If no patterns are selected, don't show the forms
        if (draft.patterns.length === 0) return;

        let optionsHtml = '';
        let tierList = catData.tiers;
        
        if (catKey === 'duration' && draft.effectTiers.durationInverted) {
            tierList = catData.invertedTiers;
        }

        // Tier 0 is no longer included for Mandatory effects!
        const startIndex = isMandatory ? 1 : 0;

        for (let i = startIndex; i <= limit; i++) {
            if (!tierList[i]) continue;
            const costLabel = tierList[i].cost > 0 ? ` (+${tierList[i].cost} Essentia)` : (i === 0 ? '' : ' (0 Essentia)');
            optionsHtml += `<option value="${i}" ${currentSelected === i ? 'selected' : ''}>Tier ${i}: ${tierList[i].text}${costLabel}</option>`;
        }

        const isLocked = limit === 0 && !isMandatory;
        
        let detailsHtml = '';
        if (currentSelected > 0) {
            if (catKey === 'augmentia') {
                const examples = tierList[currentSelected].examples || [];
                detailsHtml = `
                    <div class="mt-2 pl-2 border-l-2 border-amber-600 space-y-2">
                        <select onchange="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, true)" class="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-1.5 rounded-sm outline-none">
                            <option value="">-- Select an Example --</option>
                            ${examples.map(ex => `<option value="${ex.name}" ${draft.effectTiers.augmentiaCustom === ex.name ? 'selected' : ''} title="${ex.tip.replace(/"/g, '&quot;')}">${ex.name}</option>`).join('')}
                        </select>
                        <textarea oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" class="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-2 rounded-sm outline-none h-16 custom-scrollbar" placeholder="Or describe custom effect...">${draft.effectTiers.augmentiaCustom || ''}</textarea>
                    </div>
                `;
            } else if (catKey === 'damageHealing') {
                const availableTypes = new Set();
                draft.patterns.forEach(p => PATTERN_CONFIG.DamageTypesByPattern[p]?.forEach(t => availableTypes.add(t)));
                const types = Array.from(availableTypes);
                if (types.length === 0) types.push('force'); // Fallback

                detailsHtml = `
                    <div class="mt-2 pl-2 border-l-2 border-amber-600">
                        <select onchange="window.appActions.updateDraftField('effectTiers.damageType', this.value, false)" class="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-1.5 rounded-sm outline-none capitalize">
                            ${types.map(t => `<option value="${t}" ${draft.effectTiers.damageType === t ? 'selected' : ''}>${t}</option>`).join('')}
                            <option value="healing" ${draft.effectTiers.damageType === 'healing' ? 'selected' : ''}>Healing</option>
                        </select>
                    </div>
                `;
            } else if (catKey === 'bolsterHinder') {
                const options = tierList[currentSelected].options || [];
                detailsHtml = `
                    <div class="mt-2 pl-2 border-l-2 border-amber-600">
                        <select onchange="window.appActions.updateDraftField('effectTiers.bolsterHinderTarget', this.value, false)" class="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs p-1.5 rounded-sm outline-none">
                            ${options.map(o => `<option value="${o}" ${draft.effectTiers.bolsterHinderTarget === o ? 'selected' : ''}>${o}</option>`).join('')}
                        </select>
                    </div>
                `;
            }
        }

        let headerControls = '';
        if (catKey === 'duration') {
            headerControls = `
                <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" onchange="window.appActions.toggleDurationInversion(this.checked)" ${draft.effectTiers.durationInverted ? 'checked' : ''} class="w-3 h-3 text-amber-600 rounded-sm shadow-sm border border-stone-600 bg-stone-800">
                    <span class="text-[9px] uppercase tracking-widest text-stone-400 font-bold hover:text-amber-500 transition">Invert Cost</span>
                </label>
            `;
        }

        const affinityIcons = draft.patterns.map(p => {
            const aff = PATTERN_CONFIG.Affinities[p];
            if (aff.primary.includes(catKey)) return `<i class="fa-solid fa-star text-amber-500 text-[8px]" title="Primary Affinity (${p})"></i>`;
            if (aff.secondary.includes(catKey)) return `<i class="fa-solid fa-circle-dot text-blue-400 text-[8px]" title="Secondary Affinity (${p})"></i>`;
            return '';
        }).join(' ');

        html += `
            <div class="bg-[#1c1917] border border-stone-800 p-3 rounded-sm shadow-sm relative group ${isLocked ? 'opacity-50 grayscale' : ''}">
                <div class="flex justify-between items-center mb-2">
                    <label class="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-2">
                        ${catData.name} ${isMandatory ? '<span class="text-red-500">*</span>' : ''}
                        <div class="flex gap-0.5">${affinityIcons}</div>
                    </label>
                    <div class="flex items-center gap-3">
                        ${headerControls}
                        <i class="fa-solid fa-circle-info text-stone-600 hover:text-amber-500 transition cursor-help text-[10px]" title="${catData.description}"></i>
                    </div>
                </div>
                <select onchange="window.appActions.setEffectTier('${catKey}', parseInt(this.value))" ${isLocked ? 'disabled' : ''} class="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs p-2 rounded-sm outline-none focus:border-amber-600 transition shadow-inner font-bold">
                    ${isLocked ? `<option value="0">No Affinity - Tier Locked</option>` : optionsHtml}
                </select>
                ${detailsHtml}
            </div>
        `;
    });
    
    return html;
};

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
            <div class="max-w-md text-center p-8 glass-panel rounded-sm relative">
                <i class="fa-solid fa-book-journal-whills text-amber-700 text-4xl mb-4"></i>
                <h3 class="font-bold text-2xl text-stone-200 mb-2">No Hero Available</h3>
                <p class="text-sm text-stone-400 leading-relaxed mb-6">Before you can weave the threads of reality, a hero must be initialized and bound to your account.</p>
                <button onclick="window.appActions.setView('pc-manager')" class="px-6 py-2 bg-stone-900 text-amber-50 rounded-sm uppercase tracking-wider text-xs font-bold shadow-md hover:bg-stone-800 transition-all border border-stone-700">Open Roster</button>
            </div>
        </div>
        `;
    }

    const pm = getOrInitPatternState(activePc);
    
    // --- SCOPE FIX: Initialize local variables for the Loom SVG math ---
    const draft = getOrInitDraftState();
    const primary = draft.patterns[0] || null;
    const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);

    const isUnlocked = activePc.patternMagicUnlocked === true || (pm.spatia + pm.wyird + pm.dynamis + pm.vitar + pm.formus + pm.mentis + pm.arcani + pm.umbrus + pm.tempus > 0);
    
    if (!isUnlocked && !isDM) {
        return `
        <div class="arcane-tapestry-bg min-h-screen flex flex-col items-center justify-center p-8 font-serif">
            <div class="max-w-md text-center p-8 glass-panel rounded-sm relative">
                <i class="fa-solid fa-eye-slash text-stone-500 text-4xl mb-4"></i>
                <h3 class="font-bold text-2xl text-stone-200 mb-2">The Tapestry is Hidden</h3>
                <p class="text-sm text-stone-400 leading-relaxed mb-6">Your mind has not yet awakened to the Patterns of reality. The Dungeon Master must unlock this potential within your character sheet.</p>
                <button onclick="window.appActions.setView('adventure')" class="px-6 py-2 bg-stone-900 text-amber-50 rounded-sm uppercase tracking-wider text-xs font-bold shadow-md hover:bg-stone-800 transition-all border border-stone-700">Return to Campaign</button>
            </div>
        </div>
        `;
    }

    const pcSelectorHtml = `
        <div class="flex items-center gap-2 bg-stone-900/50 px-3 py-1.5 border border-stone-700 rounded-sm shadow-sm backdrop-blur-sm">
            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold"><i class="fa-solid fa-user-circle mr-1 text-cyan-500"></i> Weaver:</span>
            <select onchange="window.appActions.switchPatternPc(this.value)" class="bg-transparent text-stone-200 border-none outline-none text-sm font-bold font-serif cursor-pointer py-0.5">
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
        const color = isFilled ? 'bg-cyan-500 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]' : 'bg-stone-900 border-stone-700 shadow-inner';
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
            <div class="p-6 text-center border border-dashed border-stone-700 bg-stone-900/30 rounded-sm">
                <p class="text-stone-500 italic text-xs font-serif">No rotes currently inscribed in your grimoire.</p>
            </div>
        `;
    } else {
        rotesTabHtml = `
            <div class="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                ${memorizedRotesList.map(r => {
                    const isSelected = draft.selectedRoteId === r.id;
                    const selectBorder = isSelected ? 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)] bg-cyan-950/30' : 'border-stone-700 bg-stone-900/50 hover:border-cyan-700';

                    return `
                    <div class="p-3 border rounded-sm ${selectBorder} flex flex-col gap-2 transition cursor-pointer group hover:border-cyan-700" onclick="window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')">
                        <div class="flex justify-between items-start border-b border-stone-700 pb-1.5">
                            <h5 class="text-sm font-bold text-stone-200 font-serif leading-tight">
                                <i class="fa-solid fa-scroll ${isSelected ? 'text-cyan-400' : 'text-stone-500'} mr-1"></i> ${r.name}
                            </h5>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-stone-500 hover:text-red-500 transition px-1" title="Erase Rote">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                            ${r.patterns ? r.patterns.map(p => `<span class="bg-stone-800 border border-stone-600 px-1.5 py-0.5 rounded-sm">${p.charAt(0).toUpperCase() + p.slice(1)}</span>`).join('') : ''}
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
                            <span class="text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded-sm border border-cyan-800 shadow-sm">${r.essentiaCost} Essentia</span>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')" class="px-3 py-1 bg-stone-800 text-stone-200 hover:text-cyan-50 border border-stone-600 hover:border-cyan-600 transition rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center"><i class="fa-solid fa-download mr-1.5"></i> Load Rote</button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    const abilitySelectorHtml = `
        <div class="w-full">
            <label class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Attuned Attribute</label>
            <select onchange="window.appActions.updateDraftField('ability', this.value, false)" class="w-full bg-stone-900 border border-stone-700 rounded-sm p-2.5 text-sm text-stone-200 font-bold font-sans outline-none shadow-sm focus:border-cyan-600 transition-colors cursor-pointer uppercase tracking-wider">
                <option value="int" ${draft.ability === 'int' ? 'selected' : ''}>Intelligence (${activePc.int || 10})</option>
                <option value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>Wisdom (${activePc.wis || 10})</option>
                <option value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>Charisma (${activePc.cha || 10})</option>
            </select>
        </div>
    `;

    let dmAdministrationPanelHtml = '';
    if (isDM) {
        dmAdministrationPanelHtml = `
            <div class="p-5 glass-panel rounded-sm mb-8 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-cyan-600"></div>
                <h3 class="text-sm font-bold font-serif text-cyan-400 uppercase tracking-widest flex items-center border-b border-stone-700 pb-2 mb-5 pl-2">
                    <i class="fa-solid fa-crown text-cyan-500 mr-2"></i> Dungeon Master's Loom Control
                </h3>
                
                <div class="flex flex-wrap items-center justify-between gap-4 mb-5 bg-stone-900/50 p-4 rounded-sm border border-stone-800 shadow-inner">
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Loom Access:</span>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" onchange="window.appActions.toggleCampaignPcAccess('${activePc.id}', this.checked)" ${activePc.patternMagicUnlocked ? 'checked' : ''} class="w-5 h-5 text-cyan-600 rounded cursor-pointer border-stone-600 bg-stone-800 shadow-sm focus:ring-cyan-500">
                            <span class="ml-2 text-xs font-bold text-stone-300">Awakened</span>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unspent Mastery Points:</span>
                        <div class="flex items-center gap-2 bg-stone-800 px-2 py-1 rounded border border-stone-700 shadow-sm">
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', -1)" class="w-6 h-6 flex items-center justify-center bg-stone-700 text-stone-300 hover:text-red-400 hover:bg-stone-600 transition rounded-sm font-bold"><i class="fa-solid fa-minus text-xs"></i></button>
                            <span class="text-sm font-black text-cyan-400 w-6 text-center">${pm.patternPoints || 0}</span>
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', 1)" class="w-6 h-6 flex items-center justify-center bg-stone-700 text-stone-300 hover:text-emerald-400 hover:bg-stone-600 transition rounded-sm font-bold"><i class="fa-solid fa-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                        const val = pm[key] || 0;
                        return `
                        <div class="flex flex-col items-center justify-center p-3 bg-stone-900/50 border border-stone-800 rounded-sm shadow-inner gap-2 hover:border-stone-600 transition-colors">
                            <span class="text-[10px] font-serif font-bold uppercase tracking-wider" style="color: ${theme.color}; text-shadow: 0 0 5px ${theme.color}80;">${key}</span>
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
    <div class="arcane-tapestry-bg min-h-screen text-stone-200 p-4 sm:p-6 lg:p-8 font-sans border-2 border-cyan-900 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative">
        <div id="pattern-info-modal-container"></div>
        <div class="max-w-6xl mx-auto relative z-10">
            
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-stone-800 pb-5">
                <div>
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-compass-drafting text-cyan-400 text-3xl drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></i>
                        <h2 class="text-3xl font-serif font-black tracking-wide text-white drop-shadow-lg">The Pattern Nexus</h2>
                    </div>
                    <p class="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mt-2">Identity Sync Active // Dimensional Shift</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    ${pcSelectorHtml}
                    <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 bg-stone-900 text-stone-300 border border-stone-700 rounded-sm hover:text-white hover:border-cyan-500 transition text-[10px] font-bold uppercase tracking-wider shadow-md">
                        <i class="fa-solid fa-door-open mr-2 text-cyan-500"></i> Return
                    </button>
                </div>
            </div>

            ${dmAdministrationPanelHtml}

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                <!-- Left Panel -->
                <div class="lg:col-span-5 space-y-6">
                    
                    <!-- The Loom (Glassmorphism) -->
                    <div class="p-6 glass-panel rounded-sm relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none"></div>
                        <h3 class="text-sm font-bold text-stone-200 uppercase tracking-widest font-serif border-b border-stone-700 pb-2 mb-6 text-center relative z-10"><i class="fa-solid fa-dharmachakra mr-1.5 text-cyan-500"></i> The Loom of Reality</h3>
                        
                        <div class="relative w-[320px] h-[320px] flex items-center justify-center p-4 mx-auto mb-6 shrink-0 z-10">
                            <!-- SVG Loom Threads in Background -->
                            <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
                                <!-- Inner focus ring -->
                                <circle cx="160" cy="160" r="45" fill="none" stroke="#06b6d4" stroke-width="1" opacity="0.3" stroke-dasharray="2 4" />
                                
                                ${primary ? Array.from({ length: 8 }).map((_, i) => {
                                    const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                                    const x1 = 160 + 35 * Math.cos(angle);
                                    const y1 = 160 + 35 * Math.sin(angle);
                                    const x2 = 160 + 105 * Math.cos(angle);
                                    const y2 = 160 + 105 * Math.sin(angle);
                                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2 4" opacity="0.4" />`;
                                }).join('') : ''}
                            </svg>

                            <!-- Node buttons -->
                            <div class="absolute inset-0" id="loom-nodes-container"></div>
                        </div>

                        <div class="p-4 bg-stone-900/50 border border-stone-800 rounded-sm text-center text-xs text-stone-400 shadow-inner relative z-10">
                            <p id="loom-hint-text" class="font-serif leading-relaxed italic">
                                ${draft.patterns.length === 0 
                                    ? `Select a thread from the outer ring to designate as your Primary Sigil.` 
                                    : draft.patterns.length === 9 
                                    ? `🚨 <span class="text-cyan-400 font-bold">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!` 
                                    : `Select orbiting sigils to weave Support threads. Active threads define your capabilities.`}
                            </p>
                        </div>
                    </div>

                    <!-- Player Development: Attunement -->
                    <div class="p-5 glass-panel rounded-sm relative text-stone-200">
                        <div class="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
                            <h3 class="text-sm font-bold text-stone-200 uppercase tracking-widest font-serif flex items-center">
                                <i class="fa-solid fa-book-open text-cyan-500 mr-2"></i> Attunement
                            </h3>
                            <span class="text-[10px] uppercase font-bold tracking-widest text-stone-400 bg-stone-900 px-2 py-1 rounded shadow-inner border border-stone-700">Unspent Points: <span class="text-cyan-400">${pm.patternPoints || 0}</span></span>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-2.5">
                            ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                                const val = pm[key] || 0;
                                const canAdd = (pm.patternPoints || 0) > 0 && val < 5;
                                const isFocused = draft.patterns.includes(key);
                                const focusClass = isFocused ? 'border-cyan-600/50 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'border-stone-800 bg-stone-900/40';

                                return `
                                <div class="flex items-center justify-between p-3 border rounded-sm ${focusClass} transition-colors group cursor-pointer hover:bg-stone-800/60" onclick="window.appActions.openPatternInfoModal('${key}')">
                                    <div class="flex items-center gap-3">
                                        <div class="w-3 h-3 rounded-full shadow-inner border border-black group-hover:scale-125 transition-transform" style="background-color: ${theme.color}; box-shadow: 0 0 5px ${theme.color};"></div>
                                        <div>
                                            <span class="text-xs font-bold text-stone-200 font-serif tracking-wide block leading-none mb-1 group-hover:text-cyan-400 transition-colors">${theme.label} <i class="fa-solid fa-circle-info ml-1 text-stone-500 text-[10px]"></i></span>
                                            <span class="text-[9px] text-stone-500 font-sans uppercase tracking-widest leading-none block">${theme.desc}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm font-serif font-bold text-stone-300 w-8 text-right" onclick="event.stopPropagation()">${val} / 5</span>
                                        ${canAdd ? `
                                            <button onclick="event.stopPropagation(); window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2.5 py-1.5 bg-stone-800 hover:bg-cyan-700 text-stone-300 hover:text-white border border-stone-600 hover:border-cyan-500 rounded-sm transition-all text-[9px] font-bold uppercase tracking-wider shadow-md">
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
                    <div class="p-5 glass-panel rounded-sm relative text-stone-200">
                        <div class="flex justify-between items-center border-b border-stone-700 pb-3 mb-4">
                            <h3 class="text-sm font-bold text-stone-200 uppercase tracking-widest font-serif flex items-center">
                                <i class="fa-solid fa-droplet text-cyan-500 mr-2"></i> Essentia Reservoir
                            </h3>
                            <span class="text-[10px] uppercase font-bold tracking-widest text-stone-400 bg-stone-900 px-2 py-1 rounded shadow-inner border border-stone-700">Capacity: <span class="text-cyan-400">${pm.essentia || 0} / ${maxEssentia}</span></span>
                        </div>
                        <div class="flex flex-wrap gap-3 p-4 bg-stone-900/50 rounded-sm border border-stone-800 justify-center min-h-[50px] shadow-inner">
                            ${pipsHtml || `<span class="text-[10px] text-stone-500 italic font-serif">Deepen your Attunement to expand your reservoir.</span>`}
                        </div>
                    </div>

                    <!-- Spell Form Formulation Engine -->
                    <div class="p-5 sm:p-6 glass-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-stone-200 uppercase tracking-widest font-serif border-b border-stone-700 pb-2 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span><i class="fa-solid fa-wand-sparkles mr-1.5 text-cyan-500"></i> Weaving the Threads</span>
                            <span class="text-[9px] font-sans text-stone-400 normal-case tracking-normal italic font-normal">Select threads on the Loom to unlock tiers.</span>
                        </h3>

                        <!-- Draft Spell Identity -->
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5">
                            <div class="sm:col-span-8">
                                <label class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Tapestry Designation (Name)</label>
                                <input type="text" 
                                       id="draft-spell-name" 
                                       oninput="window.appActions.updateDraftField('name', this.value, false, true)" 
                                       value="${draft.name || ''}" 
                                       placeholder="Provide a name for this spell..." 
                                       class="w-full bg-stone-900 border border-stone-700 rounded-sm p-2.5 text-sm text-stone-200 font-bold font-serif outline-none shadow-sm focus:border-cyan-600 transition-colors">
                            </div>
                            <div class="sm:col-span-4 flex items-end">
                                ${abilitySelectorHtml}
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Intent & Visualization</label>
                            <textarea id="draft-spell-desc" 
                                      oninput="window.appActions.updateDraftField('description', this.value, false, true)" 
                                      placeholder="Describe the aesthetic and physical ripples of your magic..." 
                                      class="w-full bg-stone-900 border border-stone-700 rounded-sm p-3 text-sm text-stone-300 outline-none font-serif focus:border-cyan-600 resize-y min-h-[80px] shadow-sm custom-scrollbar">${draft.description || ''}</textarea>
                        </div>

                        <!-- Active Effects Scaffolding -->
                        <div id="effects-scaffolding-container" class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            ${buildEffectsHTML(metrics, draft, pm, activePc)}
                        </div>

                        <!-- Cost Outputs & Casting Trigger Card -->
                        <div class="p-5 bg-[#050505] text-stone-200 rounded-sm border border-stone-800 shadow-2xl relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-cyan-600"></div>
                            
                            <div class="flex flex-wrap justify-between items-center gap-4 pl-3">
                                <div>
                                    <span class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Essentia Fuel Required</span>
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-droplet text-cyan-500 text-xl"></i>
                                        <strong id="tapestry-cost-out" class="text-3xl font-black font-serif text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                                            ${draft.isRote ? `<span class="line-through text-stone-600 text-2xl mr-2">${metrics.totalBaseCost}</span>` : ''}${metrics.finalCost}
                                        </strong>
                                    </div>
                                    ${draft.isRote ? `<span class="inline-block mt-2 text-[9px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded uppercase tracking-widest font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Rote Discount Applied</span>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Weaving Difficulty</span>
                                    <strong class="text-2xl font-black font-serif text-white bg-stone-900 px-4 py-2 rounded-sm border border-stone-700 shadow-inner">
                                        DC <span id="tapestry-dc-out">${metrics.dc}</span>
                                    </strong>
                                </div>
                            </div>

                            <!-- Save Rote Form -->
                            <div class="mt-5 pt-4 border-t border-stone-800 flex flex-col sm:flex-row gap-3 items-center pl-3">
                                <input type="text" 
                                       id="input-rote-memorize-name" 
                                       placeholder="Scribe configuration to Grimoire..." 
                                       class="flex-1 w-full bg-stone-900 border border-stone-700 rounded-sm p-2 text-xs text-stone-300 outline-none font-serif focus:border-cyan-600 shadow-inner">
                                <button type="button" 
                                        onclick="window.appActions.memorizeCurrentDraftAsRote('${activePc.id}')"
                                        class="w-full sm:w-auto px-4 py-2 bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition text-[10px] font-bold uppercase tracking-widest rounded-sm border border-stone-600 shadow-md whitespace-nowrap">
                                    <i class="fa-solid fa-feather-pointed mr-1.5 text-cyan-500"></i> Scribe Rote
                                </button>
                            </div>

                            <!-- Weave Spell Trigger -->
                            <div class="mt-4 pl-3">
                                <button type="button" 
                                        id="tapestry-cast-btn"
                                        onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                        class="w-full py-3.5 bg-cyan-900/40 text-cyan-50 hover:bg-cyan-800 transition-all text-sm font-black uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500 flex items-center justify-center gap-2 active:scale-95 group">
                                    <i class="fa-solid fa-burst text-lg text-cyan-300 group-hover:animate-pulse"></i> Unleash the Pattern
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Memorized Grimoire -->
                    <div class="p-5 sm:p-6 glass-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-stone-200 uppercase tracking-widest font-serif border-b border-stone-700 pb-2 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span><i class="fa-solid fa-book-journal-whills mr-1.5 text-cyan-500"></i> Memorized Grimoire</span>
                            <span class="text-[9px] font-sans text-stone-400 normal-case tracking-normal italic font-normal">Loading a Rote discounts its Essentia cost.</span>
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
// UI EVENT BINDINGS (Surgical DOM Updates)
// =========================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};

    // ---------------------------------------------------------------------
    // The core seamless animation & DOM updater
    // ---------------------------------------------------------------------
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
                    // Reset to unassigned orbit
                    btn.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                    btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-20 opacity-40 hover:opacity-100 hover:z-[100] group transition-all duration-500 ease-out left-0 top-0';
                    const img = btn.querySelector('img');
                    if(img) img.style.filter = 'none';
                }
            });
        } else {
            const orbitsList = patternsList.filter(k => k !== primary);
            
            // Primary Sigil glides to center
            const primeBtn = document.getElementById(`sigil-btn-${primary}`);
            if (primeBtn) {
                primeBtn.style.transform = `translate(${cx - 32}px, ${cy - 40}px) scale(1.4)`;
                const theme = PATTERN_THEME[primary];
                primeBtn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-[100] opacity-100 pulse-prime-sigil group transition-all duration-500 ease-out left-0 top-0';
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
                    btn.style.transform = `translate(${x}px, ${y}px) scale(0.9)`;
                    const img = btn.querySelector('img');
                    
                    if (isSupported) {
                        btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-[90] hover:z-[100] opacity-100 group transition-all duration-500 ease-out left-0 top-0';
                        if(img) img.style.filter = `drop-shadow(0 0 5px ${theme.color})`;
                    } else {
                        btn.className = 'sigil-btn absolute w-16 h-16 flex flex-col items-center justify-center cursor-pointer z-10 hover:z-[100] opacity-40 hover:opacity-100 group transition-all duration-500 ease-out left-0 top-0';
                        if(img) img.style.filter = 'none';
                    }
                }
            });
        }
        
        // 2. INJECT CSS VARIABLES FOR THE WEAVE BACKGROUND
        const activeColors = draft.patterns.map(k => PATTERN_THEME[k]?.color || '#ffffff');
        const root = document.documentElement;
        if (activeColors.length > 0) {
            root.style.setProperty('--weave-primary', activeColors[0]);
            root.style.setProperty('--weave-secondary', activeColors[1] || activeColors[0]);
            root.style.setProperty('--weave-tertiary', activeColors[2] || activeColors[0]);
        } else {
            root.style.setProperty('--weave-primary', 'rgba(255,255,255,0.05)');
            root.style.setProperty('--weave-secondary', 'rgba(255,255,255,0.02)');
            root.style.setProperty('--weave-tertiary', 'rgba(0,0,0,0)');
        }
        
        // 3. UPDATE FORMS & METRICS
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
            else if (draft.patterns.length === 9) hintEl.innerHTML = '🚨 <span class="text-cyan-400 font-bold">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!';
            else hintEl.innerHTML = 'Select orbiting sigils to weave Support threads. Active threads define your capabilities.';
        }

        const castBtn = document.getElementById('tapestry-cast-btn');
        if (castBtn) {
            let isValid = primary !== null;
            if (isValid) {
                // Ensure all mandatory effects are configured > tier 0
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

    // ---------------------------------------------------------------------
    // Event Bindings
    // ---------------------------------------------------------------------
    window.appActions.switchPatternPc = (pcId) => {
        window.appData.activePatternPcId = pcId;
        reRender(true);
    };

    window.appActions.toggleCampaignPcAccess = async (pcId, checked) => {
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) return;
        const pc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
        if (pc) {
            pc.patternMagicUnlocked = checked;
            await window.appActions.adjustPatternParameter(pcId, 'patternPoints', 0); 
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
        else if (!skipUIUpdate) window.appActions.refreshTapestryUI(); 
    };

    window.appActions.toggleWheelPattern = (patternKey) => {
        const draft = getOrInitDraftState();
        const prim = draft.patterns[0];

        if (!prim) {
            draft.patterns = [patternKey];
            draft.isRote = false;
            draft.selectedRoteId = '';
        } else if (prim === patternKey) {
            draft.patterns = [];
            draft.isRote = false;
            draft.selectedRoteId = '';
        } else {
            const index = draft.patterns.indexOf(patternKey);
            if (index > -1) draft.patterns.splice(index, 1);
            else draft.patterns.push(patternKey);
            draft.isRote = false;
            draft.selectedRoteId = '';
        }
        window.appActions.refreshTapestryUI();
    };

    window.appActions.toggleDurationInversion = (checked) => {
        const draft = getOrInitDraftState();
        draft.effectTiers.durationInverted = checked;
        draft.effectTiers.duration = 0; 
        window.appActions.refreshTapestryUI();
    };

    window.appActions.setEffectTier = (category, tierIndex) => {
        const draft = getOrInitDraftState();
        draft.effectTiers[category] = tierIndex;
        draft.isRote = false;
        draft.selectedRoteId = '';
        window.appActions.refreshTapestryUI();
    };

    // ---------------------------------------------------------------------
    // Rotes & Casting
    // ---------------------------------------------------------------------
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

        const rotePayload = {
            name: name,
            primaryPattern: draft.patterns[0],
            essentiaCost: metrics.totalBaseCost - Math.floor(metrics.totalBaseCost / 3), 
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

        window.appActions.refreshTapestryUI(); 
        document.getElementById('draft-spell-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    
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

    // ---------------------------------------------------------------------
    // Information Modals
    // ---------------------------------------------------------------------
    window.appActions.openPatternInfoModal = (patternKey) => {
        const theme = PATTERN_THEME[patternKey];
        const desc = PATTERN_CONFIG.PatternDescriptions[patternKey];
        const affinities = PATTERN_CONFIG.Affinities[patternKey];
        
        const format = (keys) => keys.map(k => PATTERN_CONFIG.Effects[k]?.name || k).join(', ');
        
        const html = `
            <div class="fixed inset-0 bg-stone-950/80 flex items-center justify-center p-4 z-[17000] backdrop-blur-md animate-in pointer-events-auto">
                <div class="glass-panel p-6 rounded-sm max-w-sm w-full border border-stone-700 shadow-2xl relative">
                    <button onclick="window.appActions.closePatternInfoModal()" class="absolute top-4 right-4 text-stone-500 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                    <div class="flex items-center gap-3 mb-4 border-b border-stone-700 pb-3">
                        <div class="w-6 h-6 rounded-full shadow-[0_0_8px_currentColor]" style="background-color: ${theme.color}; color: ${theme.color};"></div>
                        <h3 class="font-serif font-bold text-2xl text-stone-100 uppercase tracking-widest">${theme.label}</h3>
                    </div>
                    <p class="text-sm text-stone-300 font-serif leading-relaxed mb-5 italic">${desc}</p>
                    
                    <div class="space-y-4">
                        <div class="bg-stone-900/50 p-3 rounded-sm border border-stone-800 shadow-inner">
                            <h4 class="text-[10px] uppercase font-bold text-cyan-500 tracking-widest mb-1.5"><i class="fa-solid fa-arrow-trend-up mr-1"></i> Primary Affinities</h4>
                            <p class="text-xs text-stone-200 font-bold">${format(affinities.primary)}</p>
                            <p class="text-[9px] text-stone-500 mt-1 italic">Can reach Tier = Pattern Rank + 1 (if Prime).</p>
                        </div>
                        <div class="bg-stone-900/50 p-3 rounded-sm border border-stone-800 shadow-inner">
                            <h4 class="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-1.5"><i class="fa-solid fa-arrows-turn-to-dots mr-1"></i> Secondary Affinities</h4>
                            <p class="text-xs text-stone-200 font-bold">${format(affinities.secondary)}</p>
                            <p class="text-[9px] text-stone-500 mt-1 italic">Can reach Tier = Pattern Rank.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = html;
    };

    window.appActions.closePatternInfoModal = () => {
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = '';
    };
}
