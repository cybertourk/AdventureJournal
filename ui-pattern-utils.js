import { PATTERN_CONFIG } from './actions-pattern-magic.js';

export const PATTERN_ASSET_BASE_URL = "https://raw.githubusercontent.com/cybertourk/AdventureJournal/main/";

// =========================================================================
// CSS Injection for Arcane Tapestry & Loom Effects
// =========================================================================
export const injectTapestryStyles = () => {
    if (document.getElementById('tapestry-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'tapestry-core-styles';
    style.innerHTML = `
        /* VIBRANT COSMIC WEAVE BACKGROUND */
        .dynamic-weave-bg {
            position: absolute;
            inset: -5%;
            z-index: 0;
            /* Deep, vibrant astral gradient */
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 80%, #0f172a 100%);
            background-size: 200% 200%;
            animation: driftWeave 25s ease-in-out infinite;
        }
        @keyframes driftWeave {
            0% { background-position: 0% 50%; transform: scale(1); }
            50% { background-position: 100% 50%; transform: scale(1.05); }
            100% { background-position: 0% 50%; transform: scale(1); }
        }
        
        /* SOFTER VIGNETTE TO LET COLORS THROUGH */
        .weave-vignette {
            position: absolute;
            inset: 0;
            z-index: 1;
            background: radial-gradient(circle at center, transparent 0%, rgba(15, 23, 42, 0.5) 50%, rgba(2, 6, 23, 0.95) 100%);
            pointer-events: none;
        }

        /* NEW: THREAD TEXTURE OVERLAY */
        .fabric-texture {
            position: absolute;
            inset: 0;
            z-index: 2;
            opacity: 0.12;
            background-image:
                linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px);
            background-size: 6px 6px;
            pointer-events: none;
        }

        /* BRIGHTER, CLEANER GLASSMORPHISM */
        .glass-panel {
            background-color: rgba(30, 35, 55, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-top: 1px solid rgba(255, 255, 255, 0.35); /* Stronger top reflection */
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .glass-input {
            background-color: rgba(10, 15, 30, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #f3f4f6;
            transition: all 0.2s;
        }
        .glass-input:focus {
            background-color: rgba(15, 20, 40, 0.8);
            border-color: #f59e0b;
            outline: none;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }
        .glass-btn {
            background-color: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(4px);
            transition: all 0.2s;
        }
        .glass-btn:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 10px rgba(255,255,255,0.1);
        }
        .glass-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* ETHEREAL LOOM */
        .loom-circle {
            background: radial-gradient(circle, rgba(30,35,60,0.5) 0%, rgba(5,10,20,0.8) 100%);
            box-shadow: inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px rgba(99, 102, 241, 0.2);
            border: 1px solid rgba(255,255,255,0.15);
        }
        .sigil-btn {
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            left: 112px; 
            top: 112px;
        }
        /* Make prime sigil glow vibrantly */
        .pulse-prime-sigil img {
            animation: pulsePrimeSigil 3s ease-in-out infinite alternate;
        }
        @keyframes pulsePrimeSigil {
            0% { filter: brightness(1.5) drop-shadow(0 0 12px currentColor); transform: scale(1); }
            100% { filter: brightness(1.8) drop-shadow(0 0 25px currentColor); transform: scale(1.08); }
        }
        @keyframes loomAppear {
            0% { opacity: 0; filter: blur(8px); transform: scale(0.1) rotate(-90deg); }
            100% { opacity: 1; filter: blur(0px); transform: scale(1) rotate(0deg); }
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

export const PATTERN_THEME = {
    spatia: { label: "Spatia", desc: "Space & Dimensions", color: "#38bdf8" }, // Bright Cyan
    wyird: { label: "Wyird", desc: "Fate & Chaos", color: "#c084fc" }, // Bright Purple
    dynamis: { label: "Dynamis", desc: "Energy & Elements", color: "#f87171" }, // Bright Red
    vitar: { label: "Vitar", desc: "Life & Healing", color: "#4ade80" }, // Bright Green
    formus: { label: "Formus", desc: "Structure & Matter", color: "#cbd5e1" }, // Bright Silver
    mentis: { label: "Mentis", desc: "Mind & Memory", color: "#f472b6" }, // Bright Pink
    arcani: { label: "Arcani", desc: "Pure Force & Magic", color: "#60a5fa" }, // Bright Blue
    umbrus: { label: "Umbrus", desc: "Shadow & Cold", color: "#818cf8" }, // Bright Indigo
    tempus: { label: "Tempus", desc: "Time & Entropy", color: "#fbbf24" }  // Bright Amber
};

export const EFFECT_TOOLTIPS = {
    range: "Dictates the maximum distance at which you can weave this magic.",
    duration: "The length of time the physical ripples of your magic persist.<br><br><div class='bg-amber-900/40 border border-amber-500/50 p-2 rounded-sm text-[10px]'><strong class='text-amber-400 block mb-1'>The Rule of Cost:</strong> The more beneficial the timing is to your spell's intent, the higher the Essentia cost will be.</div><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Shorter is Better (Default):</b> Used when a sudden impact is the goal. <i>(e.g., an instantaneous fireball costs 5E, but a slow, delayed blast costs less)</i>.</li><li><b>Longer is Better (Toggle):</b> Used for buffs, debuffs, or utility where maintaining the effect over time is the goal. <i>(e.g., flying for 8 hours costs 5E, but flying for 1 round costs 2E)</i>.</li></ul>",
    activation: "The action economy and time required to cast the spell.",
    areaTargets: "The physical space or number of entities encompassed by the spell.",
    damageHealing: "The raw force, elemental energy, or restorative life woven into the spell.",
    augmentia: "Alterations to physical laws, matter, or environmental properties.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>V5 Benchmark Examples</strong><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Minor (+1):</b> Water Breathing, Feather Fall, Jump, detecting magic</li><li><b>Weak (+2):</b> Alter Self (minor physical changes), Longstrider, Spider Climb</li><li><b>Moderate (+3):</b> Fly, Haste, Slow, Gaseous Form, Water Walk</li><li><b>Strong (+4):</b> Alter Self (significant physical changes), Teleportation</li><li><b>Major (+5):</b> True Polymorph, Teleport, Plane Shift, Time Stop</li></ul></div>",
    bolsterHinder: "Direct enhancements or supernatural penalties applied to checks and saves.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>Target Options by Tier</strong><ul class='space-y-1 text-[11px] mt-2'><li><b>Minor (+1):</b> Skill check</li><li><b>Weak (+2):</b> Skill check, saving throw, ability check</li><li><b>Moderate (+3):</b> Skill check, saving throw, ability check, attack roll</li><li><b>Strong (+4):</b> Skill, saving throw, ability check, attack roll, damage roll</li><li><b>Major (+5):</b> Skill, saving throw, ability check, attack roll, damage roll, AC</li></ul></div>"
};

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
                maxTier = Math.min(5, primaryRank + 1);
                activeAffText = `Primary Alignment (Max Tier ${maxTier})`;
            } else if (primaryAff && primaryAff.secondary.includes(category)) {
                maxTier = primaryRank;
                activeAffText = `Secondary Alignment (Max Tier ${maxTier})`;
            }

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

        // MANDATORY BASELINE RULE
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

    if (draft.isRote) {
        results.finalCost = results.totalBaseCost - Math.floor(results.totalBaseCost / 3);
    } else {
        results.finalCost = results.totalBaseCost;
    }

    results.dc = 5 + results.finalCost;
    return results;
}

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

        let starHtml = '';
        if (primary) {
            const primAff = PATTERN_CONFIG.Affinities[primary];
            if (primAff && primAff.primary.includes(category)) {
                starHtml = `<i class="fa-solid fa-star text-amber-400 ml-2 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" title="Primary Affinity"></i>`;
            } else if (primAff && primAff.secondary.includes(category)) {
                starHtml = `<i class="fa-regular fa-star text-amber-400 ml-2 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" title="Secondary Affinity"></i>`;
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
                <div class="mt-2.5 flex items-center gap-2 bg-slate-900/40 px-3 py-2 rounded-sm border border-slate-500/30 shadow-inner">
                    <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest"><i class="fa-solid fa-bolt mr-1.5 text-amber-400"></i> Energy Type:</span>
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
                <div class="mt-2.5 flex items-center gap-2 bg-slate-900/40 px-3 py-2 rounded-sm border border-slate-500/30 shadow-inner">
                    <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest"><i class="fa-solid fa-shield-halved mr-1.5 text-amber-400"></i> Target:</span>
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
                    <div class="mt-2.5 flex flex-col gap-2 bg-slate-900/40 px-3 py-2.5 rounded-sm border border-slate-500/30 shadow-inner">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center"><i class="fa-solid fa-lightbulb mr-1.5 text-amber-400"></i> Known Alterations</span>
                            <select onchange="document.getElementById('draft-aug-custom-${activeTier}').value = this.value; window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value);" class="w-full glass-input rounded-sm p-1.5 text-xs text-white outline-none font-serif shadow-sm cursor-pointer hover:border-amber-400">
                                ${exampleOptionsHtml}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1 mt-1 border-t border-slate-600/30 pt-2">
                            <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Custom Effect Detail</span>
                            <input type="text" 
                                   id="draft-aug-custom-${activeTier}"
                                   oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                                   value="${draft.effectTiers.augmentiaCustom || ''}" 
                                   placeholder="Or describe a custom alteration..." 
                                   class="w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-sm focus:border-amber-400 transition-colors">
                        </div>
                    </div>
                `;
            } else {
                 optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-1.5 bg-slate-900/40 px-3 py-2 rounded-sm border border-slate-500/30 shadow-inner">
                        <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Custom Effect Detail:</span>
                        <input type="text" 
                               oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                               value="${draft.effectTiers.augmentiaCustom || ''}" 
                               placeholder="Describe the alteration..." 
                               class="w-full glass-input rounded-sm p-2 text-xs text-white outline-none font-serif shadow-sm focus:border-amber-400 transition-colors">
                    </div>
                `;
            }
        }

        let specialToggleHtml = '';
        if (category === 'duration') {
            specialToggleHtml = `
                <label class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-200 cursor-pointer select-none hover:text-amber-300 transition-colors">
                    <input type="checkbox" 
                           onchange="window.appActions.toggleDurationInversion(this.checked)" 
                           ${draft.effectTiers.durationInverted ? 'checked' : ''} 
                           class="w-4 h-4 text-amber-500 bg-slate-800 border-slate-500 rounded-sm focus:ring-amber-500 shadow-sm cursor-pointer">
                    <span>Longer is Better</span>
                </label>
            `;
        }

        let tierButtonsHtml = '';
        if (tiersList) {
            const adjustedMaxTier = isMandatory ? maxTierAllowed - 1 : maxTierAllowed;
            
            tiersList.forEach((tier, index) => {
                const isDisabled = index > adjustedMaxTier;
                const isSelected = activeTier === index;
                
                let btnClass = 'glass-btn text-slate-300 hover:text-white';
                if (isDisabled) {
                    btnClass = 'border-slate-700/50 bg-slate-900/60 text-slate-500 cursor-not-allowed shadow-none';
                } else if (isSelected) {
                    btnClass = 'border-amber-400 bg-amber-500/20 text-white font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]';
                }

                const displayTier = isMandatory ? index + 1 : index;

                tierButtonsHtml += `
                    <button type="button" 
                            ${isDisabled ? 'disabled' : ''} 
                            onclick="window.appActions.setEffectTier('${category}', ${index})"
                            class="px-2.5 py-2 border rounded-sm text-[11px] text-left transition-all leading-snug flex justify-between items-center font-serif ${btnClass}">
                        <span>T${displayTier}: ${tier.text}</span>
                        <span class="font-sans text-[10px] font-bold opacity-80">+${tier.cost} E</span>
                    </button>
                `;
            });
        }

        const labelColorClass = maxTierAllowed > 0 ? 'text-white' : 'text-slate-400';
        const subtextColorClass = maxTierAllowed > 0 ? 'text-amber-400' : 'text-slate-500';

        html += `
            <div class="p-4 glass-panel rounded-sm">
                <div class="flex justify-between items-start mb-3 gap-2 flex-wrap border-b border-white/20 pb-2">
                    <div>
                        <div class="flex items-center">
                            <h4 class="text-sm font-bold font-serif ${labelColorClass} drop-shadow-md">${labelText}</h4>
                            <button type="button" onclick="window.appActions.openEffectInfoModal('${category}')" class="ml-2 text-slate-300 hover:text-amber-400 cursor-pointer transition-colors drop-shadow-md" title="View Details"><i class="fa-solid fa-circle-info text-xs"></i></button>
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
