import { PATTERN_CONFIG } from './actions-pattern-magic.js';

// =========================================================================
// ZEB: UPDATE LINE 7 WITH YOUR ACTUAL GITHUB USERNAME AND REPO NAME!
// =========================================================================
export const PATTERN_ASSET_BASE_URL = "https://raw.githubusercontent.com/cybertourk/AdventureJournal/main/";

// =========================================================================
// CSS Injection for Arcane Tapestry & Loom Effects
// =========================================================================
export const injectTapestryStyles = () => {
    if (document.getElementById('tapestry-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'tapestry-core-styles';
    style.innerHTML = `
        .arcane-tapestry-bg {
            background-color: #292524;
            background-image: url('https://www.transparenttextures.com/patterns/woven.png'), radial-gradient(circle at center, #44403c 0%, #1c1917 100%);
        }
        .parchment-panel {
            background-color: #fdfbf7;
            background-image: url('https://www.transparenttextures.com/patterns/aged-paper.png');
            border: 1px solid #d4c5a9;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 20px rgba(212, 197, 169, 0.2);
        }
        .leather-panel {
            background-color: #292524;
            background-image: url('https://www.transparenttextures.com/patterns/leather.png');
            border: 2px solid #1c1917;
            box-shadow: inset 0 0 15px rgba(0,0,0,0.8), 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        .sigil-btn {
            /* Transform handles the spiral, Opacity handles the fade-in */
            transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease;
            /* Permanently pin all sigils perfectly to the center of the 320x320 SVG (160 - 48 = 112) */
            left: 112px; 
            top: 112px;
        }
        .pulse-prime-sigil img {
            animation: pulsePrimeSigil 3s ease-in-out infinite alternate;
        }
        @keyframes pulsePrimeSigil {
            0% { filter: drop-shadow(0 0 8px currentColor); transform: scale(1); }
            100% { filter: drop-shadow(0 0 16px currentColor); transform: scale(1.05); }
        }
        @keyframes loomAppear {
            0% { opacity: 0; filter: blur(4px); }
            100% { opacity: 1; filter: blur(0px); }
        }
        .loom-entrance {
            animation: loomAppear 0.8s ease-out forwards;
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
export const PATTERN_THEME = {
    spatia: { label: "Spatia", desc: "Space & Dimensions", color: "#0d9488" }, // Teal
    wyird: { label: "Wyird", desc: "Fate & Chaos", color: "#9333ea" }, // Purple
    dynamis: { label: "Dynamis", desc: "Energy & Elements", color: "#dc2626" }, // Crimson
    vitar: { label: "Vitar", desc: "Life & Healing", color: "#16a34a" }, // Emerald
    formus: { label: "Formus", desc: "Structure & Matter", color: "#475569" }, // Slate
    mentis: { label: "Mentis", desc: "Mind & Memory", color: "#db2777" }, // Rose
    arcani: { label: "Arcani", desc: "Pure Force & Magic", color: "#2563eb" }, // Sapphire
    umbrus: { label: "Umbrus", desc: "Shadow & Cold", color: "#312e81" }, // Indigo
    tempus: { label: "Tempus", desc: "Time & Entropy", color: "#d97706" }  // Topaz
};

export const EFFECT_TOOLTIPS = {
    range: "Dictates the maximum distance at which you can weave this magic.",
    duration: "The length of time the physical ripples of your magic persist.<br><br><div class='bg-stone-900/60 border border-stone-700 p-2 rounded-sm mt-2'><strong class='text-amber-500 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>The Rule of Cost</strong><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Shorter is Better (Default):</b> Used when a sudden impact is the goal. <i>(e.g., An instantaneous fireball costs 5E, but a slow, delayed blast costs less)</i>.</li><li><b>Longer is Better (Toggle):</b> Used for buffs, debuffs, or utility where maintaining the effect over time is the goal. <i>(e.g., Flying for 8 hours costs 5E, but flying for 1 round costs 2E)</i>.</li></ul></div>",
    activation: "The action economy and time required to cast the spell.",
    areaTargets: "The physical space or number of entities encompassed by the spell.",
    damageHealing: "The raw force, elemental energy, or restorative life woven into the spell.",
    augmentia: "Alterations to physical laws, matter, or environmental properties.<br><br><div class='bg-stone-900/60 border border-stone-700 p-2 rounded-sm mt-2'><strong class='text-amber-500 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>V5 Benchmark Examples</strong><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Minor (+1):</b> Water Breathing, Feather Fall, Jump, detecting magic</li><li><b>Weak (+2):</b> Alter Self (minor physical changes), Longstrider, Spider Climb</li><li><b>Moderate (+3):</b> Fly, Haste, Slow, Gaseous Form, Water Walk</li><li><b>Strong (+4):</b> Alter Self (significant physical changes), Teleportation</li><li><b>Major (+5):</b> True Polymorph, Plane Shift, Time Stop</li></ul></div>",
    bolsterHinder: "Direct enhancements or supernatural penalties applied to checks and saves.<br><br><div class='bg-stone-900/60 border border-stone-700 p-2 rounded-sm mt-2'><strong class='text-amber-500 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>Target Options by Tier</strong><ul class='space-y-1 text-[11px] mt-2'><li><b>Minor (+1):</b> Skill check</li><li><b>Weak (+2):</b> Skill check, saving throw, ability check</li><li><b>Moderate (+3):</b> Skill check, saving throw, ability check, attack roll</li><li><b>Strong (+4):</b> Skill, saving throw, ability check, attack roll, damage roll</li><li><b>Major (+5):</b> Skill, saving throw, ability check, attack roll, damage roll, AC</li></ul></div>"
};

// Ensure our draft state exists globally on active session load
export const getOrInitDraftState = () => {
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
export function calculateAffinityLimitsAndCosts(pc, pm, draft) {
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
export function buildEffectsHTML(metrics, draft, pm, activePc) {
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
