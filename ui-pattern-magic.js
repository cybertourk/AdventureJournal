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
// ZEB: UPDATE LINE 18 WITH YOUR ACTUAL GITHUB USERNAME AND REPO NAME!
// =========================================================================
const PATTERN_ASSET_BASE_URL = "https://raw.githubusercontent.com/cybertourk/AdventureJournal/main/";

// =========================================================================
// CSS Injection for Arcane Tapestry & Loom Effects
// =========================================================================
const injectTapestryStyles = () => {
    if (document.getElementById('tapestry-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'tapestry-core-styles';
    style.innerHTML = `
        .dynamic-weave-bg {
            position: absolute;
            inset: -5%; /* Slight bleed to allow for pulsing without showing edges */
            z-index: 0;
            transition: filter 1.5s ease-in-out, background 1.5s ease-in-out;
            /* Animated drifting effect */
            animation: driftWeave 30s linear infinite alternate;
        }
        @keyframes driftWeave {
            0% { transform: scale(1.05) translate(0, 0); }
            100% { transform: scale(1.05) translate(-1%, -1%); }
        }
        .weave-vignette {
            position: absolute;
            inset: 0;
            z-index: 1;
            background: radial-gradient(circle at center, transparent 10%, rgba(5,5,5,0.7) 70%, rgba(0,0,0,0.95) 100%);
            pointer-events: none;
        }

        /* Glassmorphism UI */
        .glass-panel {
            background-color: rgba(20, 20, 25, 0.6);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .glass-input {
            background-color: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #f3f4f6;
            transition: all 0.2s;
        }
        .glass-input:focus {
            background-color: rgba(0, 0, 0, 0.6);
            border-color: #f59e0b;
            outline: none;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .glass-btn {
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(4px);
            transition: all 0.2s;
        }
        .glass-btn:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.4);
        }
        .glass-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loom-circle {
            background: radial-gradient(circle, rgba(10,10,12,0.6) 0%, rgba(5,5,5,0.9) 100%);
            box-shadow: inset 0 0 30px rgba(0,0,0,0.9), 0 0 20px rgba(217, 119, 6, 0.1);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .sigil-btn {
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            left: 112px; 
            top: 112px;
        }
        .pulse-prime-sigil img {
            animation: pulsePrimeSigil 3s ease-in-out infinite alternate;
        }
        @keyframes pulsePrimeSigil {
            0% { filter: drop-shadow(0 0 8px currentColor); transform: scale(1); }
            100% { filter: drop-shadow(0 0 20px currentColor); transform: scale(1.05); }
        }
        @keyframes loomAppear {
            0% { opacity: 0; filter: blur(4px); transform: scale(0.1); }
            100% { opacity: 1; filter: blur(0px); transform: scale(1); }
        }
        .loom-entrance {
            animation: loomAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .spin-loom-slow {
            animation: spinLoom 40s linear infinite;
        }
        @keyframes spinLoom {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
};

// Map each of the 9 magical disciplines to its rich, esoteric dye/ink color
const PATTERN_THEME = {
    spatia: { label: "Spatia", desc: "Space & Dimensions", color: "#0ea5e9" }, // Bright Teal
    wyird: { label: "Wyird", desc: "Fate & Chaos", color: "#a855f7" }, // Vivid Purple
    dynamis: { label: "Dynamis", desc: "Energy & Elements", color: "#ef4444" }, // Bright Red
    vitar: { label: "Vitar", desc: "Life & Healing", color: "#22c55e" }, // Vivid Green
    formus: { label: "Formus", desc: "Structure & Matter", color: "#94a3b8" }, // Silver
    mentis: { label: "Mentis", desc: "Mind & Memory", color: "#ec4899" }, // Pink
    arcani: { label: "Arcani", desc: "Pure Force & Magic", color: "#3b82f6" }, // Bright Blue
    umbrus: { label: "Umbrus", desc: "Shadow & Cold", color: "#4f46e5" }, // Deep Indigo
    tempus: { label: "Tempus", desc: "Time & Entropy", color: "#f59e0b" }  // Bright Orange
};

const EFFECT_TOOLTIPS = {
    range: "Dictates the maximum distance at which you can weave this magic.",
    duration: "The length of time the physical ripples of your magic persist.<br><br><div class='bg-amber-900/40 border border-amber-500/50 p-2 rounded-sm text-[10px]'><strong class='text-amber-400 block mb-1'>The Rule of Cost:</strong> The more beneficial the timing is to your spell's intent, the higher the Essentia cost will be.</div><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Shorter is Better (Default):</b> Used when a sudden impact is the goal. <i>(e.g., an instantaneous fireball costs 5E, but a slow, delayed blast costs less)</i>.</li><li><b>Longer is Better (Toggle):</b> Used for buffs, debuffs, or utility where maintaining the effect over time is the goal. <i>(e.g., flying for 8 hours costs 5E, but flying for 1 round costs 2E)</i>.</li></ul>",
    activation: "The action economy and time required to cast the spell.",
    areaTargets: "The physical space or number of entities encompassed by the spell.",
    damageHealing: "The raw force, elemental energy, or restorative life woven into the spell.",
    augmentia: "Alterations to physical laws, matter, or environmental properties.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>V5 Benchmark Examples</strong><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Minor (+1):</b> Water Breathing, Feather Fall, Jump, detecting magic</li><li><b>Weak (+2):</b> Alter Self (minor physical changes), Longstrider, Spider Climb</li><li><b>Moderate (+3):</b> Fly, Haste, Slow, Gaseous Form, Water Walk</li><li><b>Strong (+4):</b> Alter Self (significant physical changes), Teleportation</li><li><b>Major (+5):</b> True Polymorph, Teleport, Plane Shift, Time Stop</li></ul></div>",
    bolsterHinder: "Direct enhancements or supernatural penalties applied to checks and saves.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>Target Options by Tier</strong><ul class='space-y-1 text-[11px] mt-2'><li><b>Minor (+1):</b> Skill check</li><li><b>Weak (+2):</b> Skill check, saving throw, ability check</li><li><b>Moderate (+3):</b> Skill check, saving throw, ability check, attack roll</li><li><b>Strong (+4):</b> Skill, saving throw, ability check, attack roll, damage roll</li><li><b>Major (+5):</b> Skill, saving throw, ability check, attack roll, damage roll, AC</li></ul></div>"
};

// Ensure our draft state exists globally on active session load
const getOrInitDraftState = () => {
    if (!window.appData.patternSpellDraft || typeof window.appData.patternSpellDraft !== 'object') {
        window.appData.patternSpellDraft = {
            name: '',
            description: '',
            ability: 'int',
            patterns: [], // Index 0 is Primary, remainder are supporting
            effectTiers: {
                range: 0,
                duration: 0,
                durationInverted: false,
                activation: 0,
                areaTargets: 0,
                damageHealing: 0,
                damageType: 'force',
                augmentia: 0,
                augmentiaCustom: '',
                bolsterHinder: 0,
                bolsterHinderTarget: 'Skill Check'
            },
            isRote: false,
            roteName: '',
            selectedRoteId: ''
        };
    }
    return window.appData.patternSpellDraft;
};

// =========================================================================
// Real-time Affinity and Cost Calculation Engines
// =========================================================================
function calculateAffinityLimitsAndCosts(pc, pm, draft) {
    const primary = draft.patterns[0] || null;
    const supports = draft.patterns.slice(1);
    
    const results = {
        limits: {}, // category: max allowable tier
        costs: {},  // category: active cost
        totalBaseCost: 0,
        finalCost: 0,
        dc: 5, // V5 Rule Change: Base DC is 5 + Cost
        affinitiesActiveText: {}
    };

    // Calculate maximum allowable tiers for all 7 effect categories
    Object.keys(PATTERN_CONFIG.Effects).forEach(category => {
        let maxTier = 0;
        let activeAffText = 'Restricted (Tier 0)';

        if (primary) {
            const primaryAff = PATTERN_CONFIG.Affinities[primary];
            const primaryRank = pm[primary] || 0;

            if (primaryAff && primaryAff.primary.includes(category)) {
                // Primary Affinity: Rank + 1 (capped at 5)
                maxTier = Math.min(5, primaryRank + 1);
                activeAffText = `Primary Alignment (Max Tier ${maxTier})`;
            } else if (primaryAff && primaryAff.secondary.includes(category)) {
                // Secondary Affinity: Equals Rank
                maxTier = primaryRank;
                activeAffText = `Secondary Alignment (Max Tier ${maxTier})`;
            }

            // Check supporting elements
            supports.forEach(supPattern => {
                const supAff = PATTERN_CONFIG.Affinities[supPattern];
                const supRank = pm[supPattern] || 0;

                if (supAff && (supAff.primary.includes(category) || supAff.secondary.includes(category))) {
                    if (supRank > maxTier) {
                        maxTier = supRank;
                        activeAffText = `Supported by ${PATTERN_THEME[supPattern].label} (Max Tier ${maxTier})`;
                    }
                }
            });
        }

        // MANDATORY BASELINE RULE: Ensure core effects are always at least Tier 1
        if (PATTERN_CONFIG.Effects[category] && PATTERN_CONFIG.Effects[category].mandatory) {
            if (maxTier < 1) {
                maxTier = 1;
                activeAffText = primary ? 'Mandatory Baseline (Max Tier 1)' : 'Baseline Available (Max Tier 1)';
            }
        }

        results.limits[category] = maxTier;
        results.affinitiesActiveText[category] = activeAffText;
    });

    // Compute costs based on configured draft tiers
    Object.keys(PATTERN_CONFIG.Effects).forEach(category => {
        const tier = draft.effectTiers[category] || 0;
        const config = PATTERN_CONFIG.Effects[category];
        let cost = 0;

        if (category === 'duration' && draft.effectTiers.durationInverted) {
            if (config.invertedTiers && config.invertedTiers[tier]) {
                cost = config.invertedTiers[tier].cost || 0;
            }
        } else {
            if (config.tiers && config.tiers[tier]) {
                cost = config.tiers[tier].cost || 0;
            }
        }

        results.costs[category] = cost;
        results.totalBaseCost += cost;
    });

    // Handle Rote discount (deduct floor of baseCost / 3)
    if (draft.isRote) {
        results.finalCost = results.totalBaseCost - Math.floor(results.totalBaseCost / 3);
    } else {
        results.finalCost = results.totalBaseCost;
    }

    results.dc = 5 + results.finalCost;
    return results;
}

// =========================================================================
// Dynamic Forms Builder (Extracted for Seamless Updates)
// =========================================================================
function buildEffectsHTML(metrics, draft, pm, activePc) {
    let html = '';
    const primary = draft.patterns[0] || null;

    Object.entries(PATTERN_CONFIG.Effects).forEach(([category, effectData]) => {
        const activeTier = draft.effectTiers[category] || 0;
        const maxTierAllowed = metrics.limits[category];
        const labelText = effectData.name;
        const subtext = metrics.affinitiesActiveText[category];
        const isMandatory = effectData.mandatory;

        const tiersList = (category === 'duration' && draft.effectTiers.durationInverted) 
            ? effectData.invertedTiers 
            : effectData.tiers;

        // Affinity Star Logic
        let starHtml = '';
        if (primary) {
            const primAff = PATTERN_CONFIG.Affinities[primary];
            if (primAff && primAff.primary.includes(category)) {
                starHtml = `<i class="fa-solid fa-star text-amber-500 ml-2 drop-shadow-md" title="Primary Affinity"></i>`;
            } else if (primAff && primAff.secondary.includes(category)) {
                starHtml = `<i class="fa-regular fa-star text-amber-500 ml-2 drop-shadow-md" title="Secondary Affinity"></i>`;
            }
        }

        let optionsSelectHtml = '';
        if (category === 'damageHealing' && activeTier > 0) {
            const activePatterns = draft.patterns;
            let allowedTypes = ['force']; 
            activePatterns.forEach(pat => {
                const types = PATTERN_CONFIG.DamageTypesByPattern[pat] || [];
                types.forEach(t => { if (!allowedTypes.includes(t)) allowedTypes.push(t); });
            });
            if (activePatterns.includes('vitar') && !allowedTypes.includes('healing')) allowedTypes.push('healing');

            optionsSelectHtml = `
                <div class="mt-2.5 flex items-center gap-2 bg-black/40 px-3 py-2 rounded-sm border border-white/20 shadow-inner">
                    <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest"><i class="fa-solid fa-bolt mr-1.5 text-amber-500"></i> Energy Type:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.damageType', this.value)" class="glass-input rounded-sm text-white text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm capitalize hover:border-amber-400 cursor-pointer">
                        ${allowedTypes.map(t => `<option class="text-black" value="${t}" ${draft.effectTiers.damageType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'bolsterHinder' && activeTier > 0) {
            const adjustedActiveTierForOptions = isMandatory ? activeTier : activeTier;
            const allowedOptions = (effectData.tiers[adjustedActiveTierForOptions] && effectData.tiers[adjustedActiveTierForOptions].options) ? effectData.tiers[adjustedActiveTierForOptions].options : ['Skill Check'];
            optionsSelectHtml = `
                <div class="mt-2.5 flex items-center gap-2 bg-black/40 px-3 py-2 rounded-sm border border-white/20 shadow-inner">
                    <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest"><i class="fa-solid fa-shield-halved mr-1.5 text-amber-500"></i> Target:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.bolsterHinderTarget', this.value)" class="glass-input rounded-sm text-white text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm hover:border-amber-400 cursor-pointer">
                        ${allowedOptions.map(opt => `<option class="text-black" value="${opt}" ${draft.effectTiers.bolsterHinderTarget === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'augmentia' && activeTier > 0) {
            const examples = (effectData.tiers[activeTier] && effectData.tiers[activeTier].examples) ? effectData.tiers[activeTier].examples : [];
            let exampleOptionsHtml = '<option class="text-black" value="">-- Select an Example --</option>';
            if (examples.length > 0) {
                examples.forEach(ex => {
                    const sanitizedTip = (ex.tip || '').replace(/"/g, '&quot;');
                    exampleOptionsHtml += `<option class="text-black" value="${ex.name}" title="${sanitizedTip}">${ex.name}</option>`;
                });
                optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-2 bg-black/40 px-3 py-2.5 rounded-sm border border-white/20 shadow-inner">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center"><i class="fa-solid fa-lightbulb mr-1.5 text-amber-400"></i> Known Alterations</span>
                            <select onchange="document.getElementById('draft-aug-custom-${activeTier}').value = this.value; window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value);" class="w-full glass-input rounded-sm p-1.5 text-xs text-white outline-none font-serif shadow-sm cursor-pointer hover:border-amber-400">
                                ${exampleOptionsHtml}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1 mt-1 border-t border-white/10 pt-2">
                            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Custom Effect Detail</span>
                            <input type="text" 
                                   id="draft-aug-custom-${activeTier}"
                                   oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                                   value="${draft.effectTiers.augmentiaCustom || ''}" 
                                   placeholder="Or describe a custom alteration..." 
                                   class="w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-sm focus:border-amber-500 transition-colors">
                        </div>
                    </div>
                `;
            } else {
                 optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-1.5 bg-black/40 px-3 py-2 rounded-sm border border-white/20 shadow-inner">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Custom Effect Detail:</span>
                        <input type="text" 
                               oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                               value="${draft.effectTiers.augmentiaCustom || ''}" 
                               placeholder="Describe the alteration..." 
                               class="w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-sm focus:border-amber-500 transition-colors">
                    </div>
                `;
            }
        }

        let specialToggleHtml = '';
        if (category === 'duration') {
            specialToggleHtml = `
                <label class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 cursor-pointer select-none hover:text-amber-400 transition-colors">
                    <input type="checkbox" 
                           onchange="window.appActions.toggleDurationInversion(this.checked)" 
                           ${draft.effectTiers.durationInverted ? 'checked' : ''} 
                           class="w-4 h-4 text-amber-500 bg-black/40 border-white/40 rounded-sm focus:ring-amber-500 shadow-sm cursor-pointer">
                    <span>Longer is Better</span>
                </label>
            `;
        }

        let tierButtonsHtml = '';
        if (tiersList) {
            // Apply Mandatory Baseline offset so index 0 = T1 visually
            const adjustedMaxTier = isMandatory ? maxTierAllowed - 1 : maxTierAllowed;
            
            tiersList.forEach((tier, index) => {
                const isDisabled = index > adjustedMaxTier;
                const isSelected = activeTier === index;
                
                let btnClass = 'glass-btn text-gray-300 hover:text-white';
                if (isDisabled) {
                    btnClass = 'border-white/10 bg-black/60 text-gray-500 cursor-not-allowed shadow-none';
                } else if (isSelected) {
                    btnClass = 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-[0_0_8px_rgba(245,158,11,0.4)]';
                }

                const displayTier = isMandatory ? index + 1 : index;

                tierButtonsHtml += `
                    <button type="button" 
                            ${isDisabled ? 'disabled' : ''} 
                            onclick="window.appActions.setEffectTier('${category}', ${index})"
                            class="px-2.5 py-2 border rounded-sm text-[11px] text-left transition-all leading-snug flex justify-between items-center font-serif ${btnClass}">
                        <span>T${displayTier}: ${tier.text}</span>
                        <span class="font-sans text-[10px] font-bold opacity-70">+${tier.cost} E</span>
                    </button>
                `;
            });
        }

        const labelColorClass = maxTierAllowed > 0 ? 'text-white' : 'text-stone-400';
        const subtextColorClass = maxTierAllowed > 0 ? 'text-amber-500' : 'text-stone-500';

        html += `
            <div class="p-4 glass-panel rounded-sm">
                <div class="flex justify-between items-start mb-3 gap-2 flex-wrap border-b border-white/20 pb-2">
                    <div>
                        <div class="flex items-center">
                            <h4 class="text-sm font-bold font-serif ${labelColorClass} drop-shadow-md">${labelText}</h4>
                            <button type="button" onclick="window.appActions.openEffectInfoModal('${category}')" class="ml-2 text-stone-400 hover:text-amber-400 cursor-pointer transition-colors drop-shadow-md" title="View Details"><i class="fa-solid fa-circle-info text-xs"></i></button>
                            ${starHtml}
                        </div>
                        <span class="text-[9px] font-sans uppercase font-bold tracking-widest ${subtextColorClass} drop-shadow-md">${subtext}</span>
                    </div>
                    ${specialToggleHtml}
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${tierButtonsHtml}
                </div>
                ${optionsSelectHtml}
            </div>
        `;
    });
    return html;
}

// =========================================================================
// Main Pattern Tapestry HTML Render
// =========================================================================
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
            <div class="weave-vignette"></div>
            <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
                <div class="max-w-md text-center p-8 glass-panel rounded-sm relative">
                    <i class="fa-solid fa-book-journal-whills text-amber-500 text-4xl mb-4 drop-shadow-lg"></i>
                    <h3 class="font-bold text-2xl text-white mb-2 font-serif drop-shadow-md">No Hero Available</h3>
                    <p class="text-sm text-gray-300 leading-relaxed mb-6 font-serif">Before you can weave the threads of reality, a hero must be initialized and bound to your account.</p>
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
            <div class="weave-vignette"></div>
            <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
                <div class="max-w-md text-center p-8 glass-panel rounded-sm relative">
                    <i class="fa-solid fa-eye-slash text-gray-400 text-4xl mb-4 drop-shadow-lg"></i>
                    <h3 class="font-bold text-2xl text-white mb-2 font-serif drop-shadow-md">The Tapestry is Hidden</h3>
                    <p class="text-sm text-gray-300 leading-relaxed mb-6 font-serif">Your mind has not yet awakened to the Patterns of reality. The Dungeon Master must unlock this potential within your character sheet.</p>
                    <button onclick="window.appActions.setView('adventure')" class="px-6 py-2 glass-btn text-white rounded-sm uppercase tracking-wider text-xs font-bold shadow-md transition-all">Return to Campaign</button>
                </div>
            </div>
        </div>
        `;
    }

    // Character Switching Interface
    const allowedWeavers = (camp.playerCharacters || []).filter(p => {
        const hasAccess = p.patternMagicUnlocked || isDM;
        const isOwner = p.playerId === myUid;
        return hasAccess && (isOwner || isDM);
    });

    const pcSelectorHtml = `
        <div class="flex items-center gap-2 glass-panel px-3 py-1.5 border border-white/20 rounded-sm shadow-sm">
            <span class="text-[10px] uppercase tracking-widest text-gray-400 font-bold"><i class="fa-solid fa-user-circle mr-1"></i> Weaver:</span>
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
        const color = isFilled ? 'bg-amber-500 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-black/50 border-white/20 shadow-inner';
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
            <div class="p-6 text-center border border-dashed border-white/20 bg-black/20 rounded-sm">
                <p class="text-gray-400 italic text-xs font-serif">No rotes currently inscribed in your grimoire.</p>
            </div>
        `;
    } else {
        rotesTabHtml = `
            <div class="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                ${memorizedRotesList.map(r => {
                    const isSelected = draft.selectedRoteId === r.id;
                    const selectBorder = isSelected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-amber-500/10' : 'border-white/20 bg-black/40 hover:border-amber-400/50';
                    const listDisplay = r.patterns.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');
                    
                    const rankForPattern = pm[r.primaryPattern] || 0;
                    const titleText = rankForPattern > 0 ? PATTERN_CONFIG.ExpertiseTitles[rankForPattern] : "Unlearned";

                    return `
                    <div class="p-3 border rounded-sm ${selectBorder} flex flex-col gap-2 transition cursor-pointer group hover:bg-black/60" onclick="window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')">
                        <div class="flex justify-between items-start border-b border-white/20 pb-1.5">
                            <div class="flex flex-col">
                                <h5 class="text-sm font-bold text-white font-serif leading-tight drop-shadow-md">
                                    <i class="fa-solid fa-scroll ${isSelected ? 'text-amber-500' : 'text-gray-400'} mr-1"></i> ${r.name}
                                </h5>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-amber-500/80 mt-1">${r.primaryPattern} • ${titleText}</span>
                            </div>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-gray-500 hover:text-red-500 transition px-1" title="Erase Rote">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-1">
                            ${r.patterns.map(p => `<span class="bg-black/50 border border-white/10 px-1.5 py-0.5 rounded-sm">${p.charAt(0).toUpperCase() + p.slice(1)}</span>`).join('')}
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            <span class="text-amber-400 bg-amber-500/20 px-2 py-1 rounded-sm border border-amber-500/30 shadow-sm">${r.essentiaCost} Essentia</span>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.loadRoteToDraft('${activePc.id}', '${r.id}')" class="px-3 py-1 glass-btn text-white transition rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm flex items-center hover:text-amber-300"><i class="fa-solid fa-download mr-1.5"></i> Load</button>
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
            <!-- DM Administration Layer -->
            <div class="p-5 glass-panel border border-white/20 rounded-sm mb-8 shadow-lg">
                <h3 class="text-sm font-bold font-serif text-amber-400 uppercase tracking-widest flex items-center border-b border-white/20 pb-2 mb-5 drop-shadow-md">
                    <i class="fa-solid fa-crown text-amber-500 mr-2"></i> Dungeon Master's Loom Control
                </h3>
                
                <div class="flex flex-wrap items-center justify-between gap-4 mb-5 bg-black/40 p-4 rounded-sm border border-white/10 shadow-inner">
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loom Access:</span>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" onchange="window.appActions.toggleCampaignPcAccess('${activePc.id}', this.checked)" ${activePc.patternMagicUnlocked ? 'checked' : ''} class="w-5 h-5 text-amber-500 rounded cursor-pointer border-gray-600 bg-black/60 shadow-sm focus:ring-amber-500">
                            <span class="ml-2 text-xs font-bold text-gray-200">Awakened</span>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unspent Mastery Points:</span>
                        <div class="flex items-center gap-2 bg-black/60 px-2 py-1 rounded border border-white/10 shadow-sm">
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', -1)" class="w-6 h-6 flex items-center justify-center bg-white/10 text-gray-300 hover:text-red-400 hover:bg-white/20 transition rounded-sm font-bold"><i class="fa-solid fa-minus text-xs"></i></button>
                            <span class="text-sm font-black text-amber-400 w-6 text-center drop-shadow-md">${pm.patternPoints || 0}</span>
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', 1)" class="w-6 h-6 flex items-center justify-center bg-white/10 text-gray-300 hover:text-emerald-400 hover:bg-white/20 transition rounded-sm font-bold"><i class="fa-solid fa-plus text-xs"></i></button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                        const val = pm[key] || 0;
                        return `
                        <div class="flex flex-col items-center justify-center p-3 bg-black/40 border border-white/10 rounded-sm shadow-inner gap-2">
                            <span class="text-[10px] font-serif font-bold uppercase tracking-wider drop-shadow-md" style="color: ${theme.color};">${key}</span>
                            <div class="flex items-center gap-1.5 bg-black/60 px-1.5 py-1 rounded border border-white/10">
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', -1)" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-400 transition font-bold"><i class="fa-solid fa-minus text-[10px]"></i></button>
                                <span class="text-xs font-black text-white w-4 text-center drop-shadow-md">${val}</span>
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', 1)" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-emerald-400 transition font-bold"><i class="fa-solid fa-plus text-[10px]"></i></button>
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

    // Generate Layout Positions synchronously so they never appear invisible!
    patternsList.forEach((key, index) => {
        const theme = PATTERN_THEME[key];
        const rank = pm[key] || 0;
        const rankText = rank > 0 ? `(Rank ${rank})` : `(Unlearned)`;

        // For the unconstrained aesthetic, we use pure rotate/translate math from the center pin.
        // We start with them collapsed at the center so the CSS animation expands them outward.
        const angleDeg = index * (360 / 9) - 90;
        const startAngle = angleDeg - 360; 
        
        const initialTransform = `rotate(${startAngle}deg) translateX(0px) rotate(${-startAngle}deg) scale(0.1)`;

        loomHtml += `
            <button id="sigil-btn-${key}" type="button" 
                    onclick="window.appActions.toggleWheelPattern('${key}')"
                    style="transform: ${initialTransform}; color: ${theme.color};"
                    class="sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-20 opacity-0 group">
                <img src="${PATTERN_ASSET_BASE_URL}${key}.webp" alt="${theme.label}" class="w-20 h-20 object-contain transition-all duration-500 pointer-events-none" style="filter: none;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="text-[11px] font-serif font-bold text-white mt-1 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] absolute -bottom-5 whitespace-nowrap bg-black/60 px-2 py-0.5 border border-white/20 rounded-sm shadow-md hidden group-hover:block z-[200] pointer-events-none">${theme.label} ${rankText}</span>
            </button>
        `;
    });

    const convergenceSpinClass = isConvergence ? 'spin-loom-slow' : '';

    // Trigger the CSS entrance spiral safely!
    setTimeout(() => {
        if (window.appActions && window.appActions.refreshTapestryUI) {
            window.appActions.refreshTapestryUI(pm);
        }
    }, 50);

    return `
    <div class="arcane-tapestry-bg relative min-h-screen font-sans overflow-hidden">
        
        <!-- The Dynamic Weave Background Layer -->
        <div id="dynamic-weave-layer" class="dynamic-weave-bg"></div>
        <div class="weave-vignette"></div>

        <!-- Foreground UI Layer -->
        <div class="relative z-10 w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 text-gray-200">
            <div id="pattern-info-modal-container"></div>
            <div class="max-w-6xl mx-auto">
                
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-white/20 pb-5">
                    <div>
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-compass-drafting text-amber-400 text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"></i>
                            <h2 class="text-3xl font-serif font-black tracking-wide text-white drop-shadow-md">The Pattern Tapestry</h2>
                        </div>
                        <p class="text-[10px] text-amber-300 font-bold uppercase tracking-widest mt-2 drop-shadow-md">Weave the fundamental threads of reality.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        ${pcSelectorHtml}
                        
                        <!-- NEW GUIDE BUTTON -->
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
                    
                    <!-- Left Panel -->
                    <div class="lg:col-span-5 space-y-6">
                        
                        <!-- STEP 1: THE LOOM -->
                        <div class="glass-panel rounded-sm relative shadow-lg">
                            <div class="bg-black/40 text-amber-400 p-3 rounded-t-sm border-b border-white/20 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-500/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">1</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">The Loom of Reality</h3>
                            </div>
                            
                            <div class="relative w-[320px] h-[320px] flex items-center justify-center p-4 mx-auto my-4 shrink-0">
                                <!-- SVG Loom Threads in Background -->
                                <svg class="absolute inset-0 w-full h-full pointer-events-none ${convergenceSpinClass}" viewBox="0 0 320 320">
                                    <!-- Inner focus ring -->
                                    <circle cx="160" cy="160" r="45" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" opacity="0.3" stroke-dasharray="2 4" />
                                    
                                    ${primary ? Array.from({ length: 8 }).map((_, i) => {
                                        const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                                        const x2 = 160 + 105 * Math.cos(angle);
                                        const y2 = 160 + 105 * Math.sin(angle);
                                        return `<line x1="160" y1="160" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="2 4" opacity="0.3" />`;
                                    }).join('') : ''}
                                </svg>

                                <!-- Node buttons (Tethered to center perfectly) -->
                                <div class="absolute" style="left: 160px; top: 160px; width: 0; height: 0;">
                                    ${loomHtml}
                                </div>
                            </div>

                            <div class="p-4 bg-black/40 border-t border-white/10 text-center text-xs text-gray-300 shadow-inner rounded-b-sm">
                                <p id="loom-hint-text" class="font-serif leading-relaxed italic">
                                    ${draft.patterns.length === 0 
                                        ? `Select a thread from the outer ring to designate as your Primary Sigil.` 
                                        : draft.patterns.length === 9 
                                        ? `🚨 <span class="text-amber-400 font-bold drop-shadow-md">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!` 
                                        : `Select orbiting sigils to weave Support threads. Active threads define your capabilities.`}
                                </p>
                            </div>
                        </div>

                        <!-- HERO'S MATRIX (Combined Attunement & Reservoir) -->
                        <div class="glass-panel rounded-sm relative text-gray-200 shadow-lg">
                            <div class="flex justify-between items-center border-b border-white/20 p-4 pb-3">
                                <h3 class="text-sm font-bold text-amber-400 uppercase tracking-widest font-serif flex items-center drop-shadow-md">
                                    <i class="fa-solid fa-bolt mr-2"></i> Hero's Matrix
                                </h3>
                                <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 bg-black/40 px-2 py-1 rounded shadow-inner border border-white/10">Unspent Points: <span class="text-amber-400">${pm.patternPoints || 0}</span></span>
                            </div>
                            
                            <div class="p-4 border-b border-white/10 bg-black/20">
                                <div class="flex justify-between text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                                    <span class="flex items-center"><i class="fa-solid fa-droplet text-amber-500 mr-1.5 drop-shadow-md"></i> Essentia Reservoir</span>
                                    <span><span class="text-amber-400 drop-shadow-md">${pm.essentia || 0}</span> / ${maxEssentia}</span>
                                </div>
                                <div class="flex flex-wrap gap-3 p-3 bg-black/60 rounded-sm border border-white/10 justify-center shadow-inner">
                                    ${pipsHtml || `<span class="text-[10px] text-gray-500 italic font-serif">Deepen your Attunement to expand your reservoir.</span>`}
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-white/10 flex flex-wrap justify-center gap-2">
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'long_rest')" class="px-3 py-1.5 glass-btn text-gray-300 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 1d6">
                                        <i class="fa-solid fa-bed mr-1.5"></i> Long Rest
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'faint')" class="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-teal-400 border border-teal-500/30 hover:border-teal-400/60 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 1d6">
                                        <i class="fa-solid fa-tower-observation mr-1.5"></i> Faint Echo
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'resonant')" class="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-fuchsia-400 border border-fuchsia-500/30 hover:border-fuchsia-400/60 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 2d6">
                                        <i class="fa-solid fa-monument mr-1.5"></i> Resonant Locus
                                    </button>
                                    <button onclick="window.appActions.rollEssentiaRecovery('${activePc.id}', 'vibrant')" class="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-amber-400 border border-amber-500/30 hover:border-amber-400/60 rounded text-[9px] uppercase font-bold tracking-wider transition shadow-sm flex items-center" title="Recover 3d6">
                                        <i class="fa-solid fa-gopuram mr-1.5"></i> Vibrant Nexus
                                    </button>
                                </div>
                            </div>

                            <div class="p-4 grid grid-cols-1 gap-2.5">
                                ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                                    const val = pm[key] || 0;
                                    const canAdd = (pm.patternPoints || 0) > 0 && val < 5;
                                    const isFocused = draft.patterns.includes(key);
                                    const focusClass = isFocused ? 'border-amber-500/50 bg-black/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/30';
                                    const titleText = val > 0 ? PATTERN_CONFIG.ExpertiseTitles[val] : "Unlearned";

                                    return `
                                    <div class="flex items-center justify-between p-3 border rounded-sm ${focusClass} transition-colors group cursor-pointer" onclick="window.appActions.openPatternInfoModal('${key}')">
                                        <div class="flex items-center gap-3">
                                            <div class="w-3 h-3 rounded-full shadow-[0_0_5px_currentColor] border border-black/50 group-hover:scale-125 transition-transform" style="background-color: ${theme.color}; color: ${theme.color};"></div>
                                            <div>
                                                <span class="text-xs font-bold text-white font-serif tracking-wide block leading-none mb-1 group-hover:text-amber-400 transition-colors drop-shadow-md">${theme.label} <i class="fa-solid fa-circle-info ml-1 text-gray-500 text-[10px]"></i></span>
                                                <span class="text-[9px] text-gray-400 font-sans uppercase tracking-widest leading-none block">${theme.desc}</span>
                                                <span class="text-[8px] font-bold uppercase tracking-widest text-amber-500/80 mt-1 block">${titleText}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <span class="text-sm font-serif font-bold text-gray-200 w-8 text-right drop-shadow-md" onclick="event.stopPropagation()">${val} / 5</span>
                                            ${canAdd ? `
                                                <button onclick="event.stopPropagation(); window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2.5 py-1.5 glass-btn hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-400 text-gray-300 rounded-sm transition-all text-[9px] font-bold uppercase tracking-wider shadow-md">
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
                        
                        <!-- STEP 2: SPELL IDENTITY -->
                        <div class="glass-panel rounded-sm shadow-lg">
                            <div class="bg-black/40 text-amber-400 p-3 rounded-t-sm border-b border-white/20 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-500/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">2</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">Spell Identity & Intent</h3>
                            </div>
                            <div class="p-5">
                                <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5">
                                    <div class="sm:col-span-8">
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tapestry Designation (Name)</label>
                                        <input type="text" 
                                               id="draft-spell-name" 
                                               oninput="window.appActions.updateDraftField('name', this.value, false, true)" 
                                               value="${draft.name || ''}" 
                                               placeholder="Provide a name for this spell..." 
                                               class="w-full glass-input rounded-sm p-2.5 text-sm font-bold font-serif shadow-sm transition-colors">
                                    </div>
                                    <div class="sm:col-span-4 flex items-end">
                                        <!-- Stack the Attuned Attribute Label and Select vertically to prevent overflow -->
                                        <div class="w-full">
                                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Attuned Attribute</label>
                                            <select onchange="window.appActions.updateDraftField('ability', this.value, false)" class="w-full glass-input shadow-sm rounded text-white text-xs font-bold font-sans outline-none cursor-pointer uppercase tracking-wider p-2.5">
                                                <option class="text-black" value="int" ${draft.ability === 'int' ? 'selected' : ''}>Intelligence (${activePc.int || 10})</option>
                                                <option class="text-black" value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>Wisdom (${activePc.wis || 10})</option>
                                                <option class="text-black" value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>Charisma (${activePc.cha || 10})</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Intent & Visualization</label>
                                    <textarea id="draft-spell-desc" 
                                              oninput="window.appActions.updateDraftField('description', this.value, false, true)" 
                                              placeholder="Describe the aesthetic and physical ripples of your magic..." 
                                              class="w-full glass-input rounded-sm p-3 text-sm resize-y min-h-[80px] shadow-sm custom-scrollbar font-serif"></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: CONFIGURE EFFECTS -->
                        <div class="glass-panel rounded-sm shadow-lg">
                            <div class="bg-black/40 text-amber-400 p-3 rounded-t-sm border-b border-white/20 flex items-center gap-3">
                                <span class="bg-amber-500/20 border border-amber-500/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">3</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm drop-shadow-md">Configure Effects</h3>
                                <span class="text-[9px] font-sans text-gray-400 normal-case tracking-normal italic ml-auto hidden sm:block">Select threads on the Loom to unlock tiers.</span>
                            </div>
                            <div id="effects-scaffolding-container" class="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                ${buildEffectsHTML(metrics, draft, pm, activePc)}
                            </div>
                        </div>

                        <!-- STEP 4: REVIEW & UNLEASH -->
                        <div class="bg-black/60 text-gray-200 rounded-sm border border-white/20 shadow-xl relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[0_0_15px_#f59e0b]"></div>
                            
                            <div class="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3 pl-5">
                                <span class="bg-amber-500/20 border border-amber-500/50 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">4</span>
                                <h3 class="font-serif font-bold uppercase tracking-widest text-sm text-amber-400 drop-shadow-md">Review & Unleash</h3>
                            </div>

                            <div class="p-5 pl-6">
                                <div class="flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Essentia Fuel Required</span>
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid fa-droplet text-amber-500 text-xl drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]"></i>
                                            <strong id="tapestry-cost-out" class="text-3xl font-black font-serif text-amber-400 drop-shadow-md">
                                                ${draft.isRote ? `<span class="line-through text-gray-500 text-2xl mr-2">${metrics.totalBaseCost}</span>` : ''}${metrics.finalCost}
                                            </strong>
                                        </div>
                                        ${draft.isRote ? `<span class="inline-block mt-2 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-sm uppercase tracking-widest font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Rote Discount Applied</span>` : ''}
                                    </div>
                                    <div class="text-right">
                                        <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Weaving Difficulty</span>
                                        <strong class="text-2xl font-black font-serif text-white bg-black/40 px-4 py-2 rounded-sm border border-white/10 shadow-inner">
                                            DC <span id="tapestry-dc-out">${metrics.dc}</span>
                                        </strong>
                                    </div>
                                </div>

                                <div class="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 items-center">
                                    <input type="text" 
                                           id="input-rote-memorize-name" 
                                           placeholder="Scribe configuration to Grimoire..." 
                                           class="flex-1 w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-inner">
                                    <button type="button" 
                                            onclick="window.appActions.memorizeCurrentDraftAsRote('${activePc.id}')"
                                            class="w-full sm:w-auto px-4 py-2 glass-btn text-amber-400 hover:text-amber-300 transition text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md whitespace-nowrap">
                                        <i class="fa-solid fa-feather-pointed mr-1.5"></i> Scribe Rote
                                    </button>
                                </div>

                                <div class="mt-4">
                                    <button type="button" 
                                            id="tapestry-cast-btn"
                                            onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                            class="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 transition-all text-sm font-black uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 active:scale-95">
                                        <i class="fa-solid fa-burst text-lg animate-pulse"></i> Unleash the Pattern
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- GRIMOIRE QUICK LOAD -->
                        <div class="glass-panel rounded-sm shadow-lg">
                            <div class="bg-black/20 text-gray-300 p-3 rounded-t-sm border-b border-white/10 flex items-center gap-3">
                                <i class="fa-solid fa-book-journal-whills text-amber-500 ml-1 drop-shadow-md"></i>
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

// =========================================================================
// UI EVENT BINDINGS & ACTIONS (Seamless Updates bypassing reRender)
// =========================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};

    // --- GRIMOIRE GUIDE (TUTORIAL) MODAL ---
    window.appActions.openWeavingGuideModal = () => {
        const modalHtml = `
            <div id="weaving-guide-overlay" class="fixed inset-0 bg-stone-950/80 z-[35000] flex items-center justify-center p-4 backdrop-blur-sm" onclick="window.appActions.closeWeavingGuideModal()">
                <div class="parchment-panel max-w-2xl w-full rounded-sm shadow-2xl relative border-2 border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]" onclick="event.stopPropagation()">
                    
                    <div class="h-2 w-full bg-amber-600 shrink-0"></div>
                    
                    <button type="button" onclick="window.appActions.closeWeavingGuideModal()" class="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors bg-white/50 rounded-full w-8 h-8 flex items-center justify-center border border-[#d4c5a9] z-50">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <div class="p-5 sm:p-6 bg-stone-900 border-b border-[#d4c5a9] flex justify-between items-center text-amber-50 shrink-0">
                        <h2 class="text-xl font-black font-serif text-amber-500 tracking-wide flex items-center"><i class="fa-solid fa-graduation-cap mr-3 text-amber-600"></i> Grimoire of Weaving</h2>
                        <span class="text-[10px] uppercase font-bold tracking-widest text-stone-400 hidden sm:block">A Guide to Pattern Magic</span>
                    </div>

                    <div class="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7]">
                        
                        <!-- Page 1 -->
                        <div id="guide-page-1" class="guide-page">
                            <h3 class="text-lg font-serif font-bold text-stone-900 border-b border-[#d4c5a9] pb-1.5 mb-4">Step 1: The Loom & Patterns</h3>
                            <p class="text-sm text-stone-700 font-serif leading-relaxed mb-4">The core of this magic system revolves around <b>Patterns</b>. Each Pattern governs a fundamental aspect of existence (Space, Time, Energy, Mind, etc.). You must select which Patterns you are weaving together to form a spell.</p>
                            <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-4">
                                <h4 class="font-bold text-amber-900 text-xs uppercase tracking-widest mb-2"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i> The Prime Pattern</h4>
                                <p class="text-xs text-stone-600 leading-relaxed font-serif">The very first Pattern you select is considered the <b>Prime Pattern</b>. This is the foundational concept of your spell, and it is the only Pattern that can be pushed to its absolute limits. <br><br>Any additional Patterns you select are considered <b>Support Patterns</b>, lending their influence but in a more controlled manner.</p>
                            </div>
                        </div>

                        <!-- Page 2 -->
                        <div id="guide-page-2" class="guide-page hidden">
                            <h3 class="text-lg font-serif font-bold text-stone-900 border-b border-[#d4c5a9] pb-1.5 mb-4">Step 2: Essentia & Attunement</h3>
                            <p class="text-sm text-stone-700 font-serif leading-relaxed mb-4">Before weaving, you must understand your limits. <b>Pattern Rating</b> represents your skill in a specific discipline (Rank 1 to 5). <b>Essentia</b> is the raw magical fuel required to power your spells.</p>
                            <div class="bg-amber-50 p-4 border border-amber-200 rounded-sm shadow-inner mb-4">
                                <h4 class="font-bold text-amber-900 text-xs uppercase tracking-widest mb-2"><i class="fa-solid fa-droplet text-amber-600 mr-1.5"></i> Essentia Capacity & Recovery</h4>
                                <ul class="list-disc ml-4 text-xs text-amber-800 space-y-1.5 font-serif">
                                    <li>Your maximum Essentia is exactly <b>4 × (Your Total Pattern Ranks)</b>.</li>
                                    <li>You recover <b>no Essentia</b> on a short rest.</li>
                                    <li>You recover <b>1d6 Essentia</b> on a long rest.</li>
                                    <li>You can actively seek out <b>Pattern Nodes</b> (Faint, Resonant, or Vibrant) in the world to safely absorb 1d6, 2d6, or 3d6 Essentia.</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Page 3 -->
                        <div id="guide-page-3" class="guide-page hidden">
                            <h3 class="text-lg font-serif font-bold text-stone-900 border-b border-[#d4c5a9] pb-1.5 mb-4">Step 3: Effects & Affinities</h3>
                            <p class="text-sm text-stone-700 font-serif leading-relaxed mb-4">You build a spell by increasing the Tier of its individual effects (Range, Duration, Damage, etc.). Your ability to raise a Tier depends entirely on your <b>Affinities</b> with the patterns you selected.</p>
                            
                            <div class="space-y-3">
                                <div class="bg-white p-3 border border-stone-200 shadow-sm rounded-sm">
                                    <h4 class="font-bold text-stone-800 text-xs mb-1"><i class="fa-solid fa-star text-amber-500 mr-1"></i> Primary Affinities</h4>
                                    <p class="text-xs text-stone-600 font-serif leading-snug">Effects representing the core identity of the pattern. If woven as the <b>Prime</b> pattern, you can access up to <b>Rank + 1</b>. If woven as a Support, you can access up to <b>Rank</b>.</p>
                                </div>
                                <div class="bg-white p-3 border border-stone-200 shadow-sm rounded-sm">
                                    <h4 class="font-bold text-stone-800 text-xs mb-1"><i class="fa-regular fa-star text-amber-500 mr-1"></i> Secondary Affinities</h4>
                                    <p class="text-xs text-stone-600 font-serif leading-snug">Effects the pattern can influence, but less effectively. You can access up to your <b>Rank</b>, regardless of whether it is Prime or Support.</p>
                                </div>
                                <div class="bg-stone-100 p-3 border border-stone-300 shadow-inner rounded-sm">
                                    <h4 class="font-bold text-stone-800 text-xs mb-1"><i class="fa-solid fa-lock-open text-stone-500 mr-1"></i> Mandatory Baseline</h4>
                                    <p class="text-[10px] text-stone-600 font-sans leading-snug">To ensure a spell can always be formed, all Mandatory Effects (Range, Duration, Activation Time, Area/Targets) are always available at a baseline of <b>Tier 1</b>, even if none of your selected Patterns have an affinity for them.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Page 4 -->
                        <div id="guide-page-4" class="guide-page hidden">
                            <h3 class="text-lg font-serif font-bold text-stone-900 border-b border-[#d4c5a9] pb-1.5 mb-4">Step 4: The Roll & Rotes</h3>
                            <p class="text-sm text-stone-700 font-serif leading-relaxed mb-4">When weaving a spell, you must roll <b>1d20 + Attribute Mod + Sum of Selected Pattern Ranks</b>. The Difficulty Class (DC) is always <b>5 + Total Essentia Cost</b>.</p>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div class="bg-emerald-50 p-3 border border-emerald-200 rounded-sm shadow-inner">
                                    <h4 class="font-bold text-emerald-900 text-xs uppercase tracking-widest mb-1.5">Degrees of Success</h4>
                                    <ul class="text-[10px] text-emerald-800 font-serif space-y-1 ml-4 list-disc">
                                        <li><b>Success:</b> The spell takes effect perfectly.</li>
                                        <li><b>+5 Over DC:</b> Significant Success! You may upgrade exactly one effect by 1 Tier instantly.</li>
                                        <li><b>+10 Over DC:</b> Exceptional Success! You may upgrade two different effects by 1 Tier instantly.</li>
                                    </ul>
                                </div>
                                <div class="bg-[#fdfbf7] p-3 border border-[#d4c5a9] rounded-sm shadow-sm">
                                    <h4 class="font-bold text-amber-900 text-xs uppercase tracking-widest mb-1.5"><i class="fa-solid fa-feather-pointed mr-1"></i> Rotes</h4>
                                    <p class="text-[10px] text-stone-700 font-serif leading-snug">A Rote is a highly practiced spell. Scribing a configured spell into your Grimoire as a Rote reduces its final Essentia cost (and thus its DC) by <b>1/3</b>! You can memorize a number of Rotes equal to your Prime Pattern's Rank.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Page 5 -->
                        <div id="guide-page-5" class="guide-page hidden">
                            <h3 class="text-lg font-serif font-bold text-red-900 border-b border-[#d4c5a9] pb-1.5 mb-4"><i class="fa-solid fa-skull mr-2"></i> The Dangers of the Weave</h3>
                            <p class="text-sm text-stone-700 font-serif leading-relaxed mb-4">Magic is dangerous. Manipulating the fundamental forces of reality can fracture the mind or unleash catastrophic elemental forces.</p>
                            
                            <div class="space-y-4">
                                <div class="bg-red-50 p-4 border border-red-200 rounded-sm shadow-inner">
                                    <h4 class="font-bold text-red-900 text-xs uppercase tracking-widest mb-1.5"><i class="fa-solid fa-brain mr-1"></i> Mental Strain (Sanity)</h4>
                                    <p class="text-xs text-red-800 font-serif leading-snug mb-2">You must make a Sanity Saving Throw against <b>(5 + Essentia Cost)</b> if you:</p>
                                    <ul class="text-[10px] text-red-700 font-sans space-y-1 ml-4 list-disc">
                                        <li>Cast a High-Stress Spell (DC 20 or higher).</li>
                                        <li>Suffer a Chaotic Backlash (Natural roll of 1-5).</li>
                                        <li>Suffer a Critical Failure (Total roll is 5 or more below the DC).</li>
                                    </ul>
                                    <p class="text-[10px] text-red-800 italic mt-2">Failing a Sanity save inflicts Short, Long, or Indefinite Madness depending on the power of the spell cast.</p>
                                </div>
                                <div class="bg-stone-900 p-4 border border-stone-700 rounded-sm shadow-md">
                                    <h4 class="font-bold text-amber-500 text-xs uppercase tracking-widest mb-1.5"><i class="fa-solid fa-burst mr-1"></i> Critical Failure</h4>
                                    <p class="text-xs text-stone-300 font-serif leading-snug">If your total roll is <b>5 or more below the DC</b>, the Pattern snaps. The spell fails, you suffer a Sanity Check, and you must roll on the Catastrophic Failure table (ranging from mental fatigue to taking direct elemental damage based on your Prime Pattern).</p>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <!-- Fixed Pagination Footer -->
                    <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-between items-center shrink-0">
                        <button type="button" onclick="window.appActions.navGuidePage(-1)" id="guide-prev-btn" class="px-4 py-2 bg-stone-300 text-stone-500 rounded-sm font-bold uppercase tracking-wider text-[10px] cursor-not-allowed shadow-sm transition" disabled><i class="fa-solid fa-chevron-left mr-1.5"></i> Prev</button>
                        <span id="guide-page-indicator" class="text-xs font-bold font-serif text-stone-600">Page 1 of 5</span>
                        <button type="button" onclick="window.appActions.navGuidePage(1)" id="guide-next-btn" class="px-4 py-2 bg-stone-900 text-amber-50 hover:bg-stone-800 rounded-sm font-bold uppercase tracking-wider text-[10px] shadow-md transition">Next <i class="fa-solid fa-chevron-right ml-1.5"></i></button>
                    </div>
                </div>
            </div>
        `;
        const container = document.getElementById('pattern-info-modal-container');
        if (container) {
            container.innerHTML = modalHtml;
            container.dataset.currentPage = 1; 
        }
    };

    window.appActions.closeWeavingGuideModal = () => {
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = '';
    };

    window.appActions.navGuidePage = (dir) => {
        const container = document.getElementById('pattern-info-modal-container');
        if (!container) return;

        let currentPage = parseInt(container.dataset.currentPage) || 1;
        const totalPages = 5;

        // Hide current
        const currentEl = document.getElementById(`guide-page-${currentPage}`);
        if (currentEl) currentEl.classList.add('hidden');

        // Increment
        currentPage += dir;
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        container.dataset.currentPage = currentPage;

        // Show new
        const newEl = document.getElementById(`guide-page-${currentPage}`);
        if (newEl) newEl.classList.remove('hidden');

        // Update UI
        document.getElementById('guide-page-indicator').innerText = `Page ${currentPage} of ${totalPages}`;

        const prevBtn = document.getElementById('guide-prev-btn');
        const nextBtn = document.getElementById('guide-next-btn');

        if (currentPage === 1) {
            prevBtn.disabled = true;
            prevBtn.className = "px-4 py-2 bg-stone-300 text-stone-500 rounded-sm font-bold uppercase tracking-wider text-[10px] cursor-not-allowed shadow-sm transition";
        } else {
            prevBtn.disabled = false;
            prevBtn.className = "px-4 py-2 bg-stone-100 text-stone-700 hover:bg-white rounded-sm font-bold uppercase tracking-wider text-[10px] shadow-sm border border-stone-300 transition";
        }

        if (currentPage === totalPages) {
            nextBtn.disabled = true;
            nextBtn.className = "px-4 py-2 bg-stone-300 text-stone-500 rounded-sm font-bold uppercase tracking-wider text-[10px] cursor-not-allowed shadow-sm transition";
        } else {
            nextBtn.disabled = false;
            nextBtn.className = "px-4 py-2 bg-stone-900 text-amber-50 hover:bg-stone-800 rounded-sm font-bold uppercase tracking-wider text-[10px] shadow-md transition";
        }
    };


    window.appActions.openPatternInfoModal = (patternKey) => {
        const theme = PATTERN_THEME[patternKey];
        const configAff = PATTERN_CONFIG.Affinities[patternKey];
        const dmgTypes = PATTERN_CONFIG.DamageTypesByPattern[patternKey] || [];
        
        const camp = window.appData.activeCampaign;
        let activePcId = window.appData.activePatternPcId || (camp.playerCharacters && camp.playerCharacters.find(p => p.playerId === window.appData.currentUserUid)?.id) || '';
        if (!activePcId && camp._isDM && camp.playerCharacters && camp.playerCharacters.length > 0) {
            const firstValid = camp.playerCharacters.find(p => p.patternMagicUnlocked);
            activePcId = firstValid ? firstValid.id : camp.playerCharacters[0].id;
        }
        const activePc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === activePcId);
        
        const pm = activePc ? getOrInitPatternState(activePc) : {};
        const rank = pm[patternKey] || 0;
        const titleText = rank > 0 ? PATTERN_CONFIG.ExpertiseTitles[rank] : "Unlearned";
        
        let primaryHtml = '';
        let secondaryHtml = '';
        
        if (configAff) {
            primaryHtml = configAff.primary.map(p => `<span class="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">${PATTERN_CONFIG.Effects[p]?.name || p}</span>`).join(' ');
            secondaryHtml = configAff.secondary.map(p => `<span class="bg-stone-100 text-stone-600 border border-stone-300 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">${PATTERN_CONFIG.Effects[p]?.name || p}</span>`).join(' ');
        }
        
        const dmgHtml = dmgTypes.map(d => `<span class="bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">${d}</span>`).join(' ');

        const modalHtml = `
            <div id="pattern-info-overlay" class="fixed inset-0 bg-stone-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onclick="window.appActions.closePatternInfoModal()">
                <div class="parchment-panel max-w-md w-full rounded-sm shadow-2xl relative border-2 border-[#d4c5a9] overflow-hidden" onclick="event.stopPropagation()">
                    
                    <div class="h-2 w-full" style="background-color: ${theme.color};"></div>
                    
                    <button type="button" onclick="window.appActions.closePatternInfoModal()" class="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors bg-white/50 rounded-full w-8 h-8 flex items-center justify-center border border-[#d4c5a9]">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <div class="p-6 sm:p-8">
                        <div class="flex items-center gap-5 mb-6 border-b border-[#d4c5a9] pb-5">
                            <div class="w-20 h-20 rounded-full bg-stone-900 flex items-center justify-center shadow-inner border-2" style="border-color: ${theme.color};">
                                <img src="${PATTERN_ASSET_BASE_URL}${patternKey}.webp" alt="${theme.label}" class="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_${theme.color}]" onerror="this.style.display='none';">
                            </div>
                            <div>
                                <h2 class="text-3xl font-black font-serif text-stone-900 tracking-wide">${theme.label}</h2>
                                <p class="text-[11px] font-bold uppercase tracking-widest" style="color: ${theme.color};">${theme.desc} • <span class="text-stone-500">${titleText}</span></p>
                            </div>
                        </div>

                        <div class="space-y-5">
                            <div>
                                <h4 class="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i> Primary Affinities</h4>
                                <div class="flex flex-wrap gap-2">${primaryHtml || '<span class="text-xs text-stone-400 italic">None</span>'}</div>
                                <p class="text-[10px] text-stone-500 italic mt-1 font-serif leading-tight">These effect categories scale directly with your Rank + 1 (Max Tier 5).</p>
                            </div>
                            
                            <div>
                                <h4 class="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center"><i class="fa-regular fa-star text-amber-500 mr-1.5"></i> Secondary Affinities</h4>
                                <div class="flex flex-wrap gap-2">${secondaryHtml || '<span class="text-xs text-stone-400 italic">None</span>'}</div>
                                <p class="text-[10px] text-stone-500 italic mt-1 font-serif leading-tight">These effect categories scale perfectly equal to your Rank.</p>
                            </div>

                            ${dmgHtml ? `
                            <div class="bg-red-50/50 p-3 rounded-sm border border-red-100">
                                <h4 class="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-2 flex items-center"><i class="fa-solid fa-bolt text-red-600 mr-1.5"></i> Associated Energy</h4>
                                <div class="flex flex-wrap gap-2">${dmgHtml}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="bg-stone-100 p-4 border-t border-[#d4c5a9] text-center">
                        <button type="button" onclick="window.appActions.closePatternInfoModal()" class="px-6 py-2 bg-stone-900 text-amber-50 hover:bg-stone-800 transition text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md">Close Grimoire</button>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = modalHtml;
    };

    window.appActions.openEffectInfoModal = (category) => {
        const effectData = PATTERN_CONFIG.Effects[category];
        const tooltipText = EFFECT_TOOLTIPS[category] || effectData.description || '';
        const isMandatory = effectData.mandatory;

        let tiersHtml = '';
        if (category === 'duration') {
            tiersHtml += '<div class="px-2 pt-2 pb-1 text-[9px] font-bold text-stone-500 uppercase tracking-widest bg-stone-200">Shorter is Better</div>';
            tiersHtml += effectData.tiers.map((t, i) => `
                <div class="flex justify-between items-center p-2 border-b border-stone-200 last:border-0">
                    <span class="text-xs font-bold text-stone-800">Tier ${i}: ${t.text}</span>
                    <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm">+${t.cost} E</span>
                </div>
            `).join('');
            tiersHtml += '<div class="px-2 pt-2 pb-1 text-[9px] font-bold text-stone-500 uppercase tracking-widest bg-stone-200 border-t border-stone-300 mt-2">Longer is Better</div>';
            tiersHtml += effectData.invertedTiers.map((t, i) => `
                <div class="flex justify-between items-center p-2 border-b border-stone-200 last:border-0">
                    <span class="text-xs font-bold text-stone-800">Tier ${i}: ${t.text}</span>
                    <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm">+${t.cost} E</span>
                </div>
            `).join('');
        } else {
            tiersHtml += effectData.tiers.map((t, i) => {
                // Determine displayed tier number (offset for mandatory since they skip index 0)
                const dispIdx = isMandatory ? i + 1 : i;
                return `
                <div class="flex justify-between items-center p-2 border-b border-stone-200 last:border-0">
                    <span class="text-xs font-bold text-stone-800">Tier ${dispIdx}: ${t.text}</span>
                    <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm">+${t.cost} E</span>
                </div>
            `}).join('');
        }

        const modalHtml = `
            <div id="effect-info-overlay" class="fixed inset-0 bg-stone-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onclick="window.appActions.closePatternInfoModal()">
                <div class="parchment-panel max-w-sm w-full rounded-sm shadow-2xl relative border-2 border-[#d4c5a9] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="bg-amber-600 h-2 w-full"></div>
                    <button type="button" onclick="window.appActions.closePatternInfoModal()" class="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors bg-white/50 rounded-full w-8 h-8 flex items-center justify-center border border-[#d4c5a9]">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="p-6">
                        <h2 class="text-2xl font-black font-serif text-stone-900 mb-1 tracking-wide">${effectData.name}</h2>
                        <div class="mb-4">
                            ${isMandatory ? `<span class="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm">Mandatory (Baseline Tier 1)</span>` : `<span class="bg-stone-200 text-stone-600 border border-stone-300 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-sm">Optional Effect</span>`}
                        </div>
                        <div class="text-xs text-stone-700 font-serif leading-relaxed mb-4">${tooltipText}</div>
                        
                        <h4 class="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 border-b border-[#d4c5a9] pb-1">Tier Scaling</h4>
                        <div class="bg-stone-50 border border-stone-200 rounded-sm shadow-inner max-h-64 overflow-y-auto custom-scrollbar">
                            ${tiersHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = modalHtml;
    };

    window.appActions.closePatternInfoModal = () => {
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = '';
    };

    // The core seamless updater function!
    window.appActions.refreshTapestryUI = (forcedPmState = null) => {
        const camp = window.appData.activeCampaign;
        const activePcId = window.appData.activePatternPcId || (camp.playerCharacters && camp.playerCharacters.find(p => p.playerId === window.appData.currentUserUid)?.id) || '';
        const activePc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === activePcId);
        if (!activePc) return;
        
        // Let the caller push a specific PM state (useful during initial render loop)
        const pm = forcedPmState || getOrInitPatternState(activePc);
        const draft = getOrInitDraftState();
        const primary = draft.patterns[0] || null;
        const supports = draft.patterns.slice(1);
        
        const cx = 160; const cy = 160; const radius = 105;
        const patternsList = Object.keys(PATTERN_THEME);
        
        // 1. DYNAMIC WEAVE BACKGROUND
        const weaveEl = document.getElementById('dynamic-weave-layer');
        if (weaveEl) {
            const ranks = Object.keys(PATTERN_THEME).map(key => pm[key] || 0);
            let maxRank = Math.max(...ranks);
            if (maxRank === 0) maxRank = 1;

            let activeColors = [];
            Object.keys(PATTERN_THEME).forEach(key => {
                if ((pm[key] || 0) > 0) activeColors.push(PATTERN_THEME[key].color);
            });

            if (activeColors.length === 0) {
                activeColors = ['#1a1a24', '#0a0a0c'];
            }

            const threadSize = 16;
            let vGrad = `repeating-linear-gradient(90deg, `;
            activeColors.forEach((c, i) => {
                vGrad += `${c} ${i*threadSize}px, ${c} ${(i+1)*threadSize - 2}px, rgba(0,0,0,0.8) ${(i+1)*threadSize - 2}px, rgba(0,0,0,0.8) ${(i+1)*threadSize}px${i < activeColors.length-1 ? ', ' : ''}`;
            });
            vGrad += `)`;

            let hGrad = `repeating-linear-gradient(0deg, `;
            activeColors.reverse().forEach((c, i) => {
                hGrad += `${c} ${i*threadSize}px, ${c} ${(i+1)*threadSize - 2}px, rgba(0,0,0,0.8) ${(i+1)*threadSize - 2}px, rgba(0,0,0,0.8) ${(i+1)*threadSize}px${i < activeColors.length-1 ? ', ' : ''}`;
            });
            hGrad += `)`;

            weaveEl.style.backgroundImage = `${hGrad}, ${vGrad}`;
            weaveEl.style.backgroundBlendMode = activeColors.length > 2 ? 'screen' : 'normal';
            weaveEl.style.backgroundColor = '#050505';

            const blurAmount = (5 - maxRank) * 2;
            const brightness = 0.4 + (maxRank * 0.15);
            weaveEl.style.filter = `blur(${blurAmount}px) brightness(${brightness})`;
        }

        // 2. ANIMATE THE LOOM
        if (!primary) {
            patternsList.forEach((key, index) => {
                const angleDeg = index * (360 / 9) - 90;
                
                const btn = document.getElementById(`sigil-btn-${key}`);
                if (btn) {
                    btn.classList.remove('pulse-prime-sigil', 'loom-entrance');
                    // Setting these styles natively triggers the CSS transition!
                    btn.style.transform = `rotate(${angleDeg}deg) translateX(${radius}px) rotate(${-angleDeg}deg) scale(1)`;
                    btn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-20 opacity-40 hover:opacity-100 hover:z-[100] group';
                    const img = btn.querySelector('img');
                    if(img) img.style.filter = 'none';
                }
            });
        } else {
            const orbitsList = patternsList.filter(k => k !== primary);
            
            // Primary Sigil glides to center and gets large
            const primeBtn = document.getElementById(`sigil-btn-${primary}`);
            if (primeBtn) {
                // X points UP at -90 degrees, so translateX(12px) shifts the icon 12px upward perfectly matching the old layout!
                primeBtn.style.transform = `rotate(-90deg) translateX(12px) rotate(90deg) scale(1.4)`;
                const theme = PATTERN_THEME[primary];
                primeBtn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-[100] opacity-100 pulse-prime-sigil group';
                const img = primeBtn.querySelector('img');
                if(img) img.style.filter = `drop-shadow(0 0 10px ${theme.color})`;
            }

            // Orbits glide into 8-point ring
            orbitsList.forEach((key, index) => {
                const angleDeg = index * (360 / 8) - 90;
                
                const btn = document.getElementById(`sigil-btn-${key}`);
                const isSupported = supports.includes(key);
                const theme = PATTERN_THEME[key];
                
                if (btn) {
                    btn.classList.remove('pulse-prime-sigil', 'loom-entrance');
                    btn.style.transform = `rotate(${angleDeg}deg) translateX(${radius}px) rotate(${-angleDeg}deg) scale(0.9)`;
                    const img = btn.querySelector('img');
                    
                    if (isSupported) {
                        btn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-[90] hover:z-[100] opacity-100 group';
                        if(img) img.style.filter = `drop-shadow(0 0 8px ${theme.color})`;
                    } else {
                        btn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-10 hover:z-[100] opacity-40 hover:opacity-100 group';
                        if(img) img.style.filter = 'none';
                    }
                }
            });
        }
        
        // 3. UPDATE FORMS & METRICS (No page reload)
        const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);
        const formsContainer = document.getElementById('effects-scaffolding-container');
        if (formsContainer) {
            formsContainer.innerHTML = buildEffectsHTML(metrics, draft, pm, activePc);
        }
        
        const costEl = document.getElementById('tapestry-cost-out');
        if (costEl) {
            if (draft.isRote) {
                costEl.innerHTML = `<span class="line-through text-gray-500 text-2xl mr-2">${metrics.totalBaseCost}</span>${metrics.finalCost}`;
            } else {
                costEl.innerHTML = metrics.finalCost;
            }
        }
        
        const dcEl = document.getElementById('tapestry-dc-out');
        if (dcEl) dcEl.innerText = metrics.dc;
        
        const hintEl = document.getElementById('loom-hint-text');
        if (hintEl) {
            if (draft.patterns.length === 0) hintEl.innerHTML = 'Select a thread from the outer ring to designate as your Primary Sigil.';
            else if (draft.patterns.length === 9) hintEl.innerHTML = '🚨 <span class="text-amber-400 font-bold drop-shadow-md">ALL THREADS WOVEN.</span> The Loom sings with absolute cosmic power!';
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
        const pc = camp && camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
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

        // Check mandatory tiers before allowing Rote to save
        for (const [cat, data] of Object.entries(PATTERN_CONFIG.Effects)) {
            if (data.mandatory && (draft.effectTiers[cat] || 0) === 0) {
                window.appActions.notify("All Mandatory spell parameters (Range, Duration, Activation Time, Area/Targets) must be defined before scribing.", "error");
                return;
            }
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
        const pc = camp && camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
        if (!pc) return;

        const pm = pc.patternMagic || {};
        const rote = pm.rotes && pm.rotes.find(r => r.id === roteId);
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
        const draftNameEl = document.getElementById('draft-spell-name');
        if (draftNameEl) draftNameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        const pc = camp && camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
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
