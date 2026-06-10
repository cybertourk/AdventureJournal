import { PATTERN_CONFIG } from './actions-pattern-magic.js';

// =========================================================================
// ZEB: UPDATE LINE 18 WITH YOUR ACTUAL GITHUB USERNAME AND REPO NAME!
// =========================================================================
export const PATTERN_ASSET_BASE_URL = "https://raw.githubusercontent.com/cybertourk/AdventureJournal/main/";

// =========================================================================
// CSS Injection for Arcane Tapestry & Loom Effects (VIBRANT LIGHT THEME)
// =========================================================================
export const injectTapestryStyles = () => {
    if (document.getElementById('tapestry-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'tapestry-core-styles';
    style.innerHTML = `
        /* PERFORMANCE UPDATE: 
           Removed the @property --cycle-hue registration. 
           We now use GPU-accelerated filter: hue-rotate() to prevent CPU repainting. 
        */

        /* VIBRANT WOVEN BACKGROUND - OPTIMIZED FOR MOBILE */
        .dynamic-weave-bg {
            position: absolute;
            inset: -4%; /* Expand past edges to hide the warping from the organic filter */
            z-index: 0;
            --sz: 18px; /* 25% thinner threads for a much finer tapestry */
            
            /* Organic Tapestry Distortion Filter applied ONCE to the static container */
            filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='organic-weave'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='3' result='noise'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='noise' scale='4' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3C/svg%3E#organic-weave");
        }

        /* VERTICAL THREADS (The bottom layer) */
        .dynamic-weave-bg::before {
            content: "";
            position: absolute;
            inset: 0;
            background-color: #050505;
            
            /* Static gradients drawn once */
            background-image: 
                repeating-linear-gradient(to right, rgba(255,255,255,0.1) 0px, rgba(0,0,0,0.6) 1px, rgba(255,255,255,0.1) 2px),
                repeating-linear-gradient(to right, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0) 3px, rgba(255,255,255,0.35) calc(var(--sz)/2), rgba(0,0,0,0) calc(var(--sz) - 3px), rgba(0,0,0,0.9) var(--sz)),
                repeating-linear-gradient(to right, 
                    hsl(0, 90%, 45%) 0, hsl(0, 90%, 45%) var(--sz), 
                    hsl(60, 90%, 45%) var(--sz), hsl(60, 90%, 45%) calc(var(--sz)*2), 
                    hsl(120, 90%, 45%) calc(var(--sz)*2), hsl(120, 90%, 45%) calc(var(--sz)*3),
                    hsl(180, 90%, 45%) calc(var(--sz)*3), hsl(180, 90%, 45%) calc(var(--sz)*4),
                    hsl(240, 90%, 45%) calc(var(--sz)*4), hsl(240, 90%, 45%) calc(var(--sz)*5),
                    hsl(300, 90%, 45%) calc(var(--sz)*5), hsl(300, 90%, 45%) calc(var(--sz)*6));
            
            background-blend-mode: overlay, hard-light, normal;
            
            /* Hardware-accelerated color shift */
            animation: fastHue 25s linear infinite;
            will-change: filter;
        }

        /* HORIZONTAL THREADS (The top layer) */
        .dynamic-weave-bg::after {
            content: "";
            position: absolute;
            inset: 0;
            
            /* Static gradients drawn once */
            background-image: 
                repeating-linear-gradient(to right, rgba(0,0,0,0.85) 0px, transparent 4.5px, transparent calc(var(--sz) - 4.5px), rgba(0,0,0,0.85) var(--sz)),
                repeating-linear-gradient(to bottom, rgba(255,255,255,0.1) 0px, rgba(0,0,0,0.6) 1px, rgba(255,255,255,0.1) 2px),
                repeating-linear-gradient(to bottom, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0) 3px, rgba(255,255,255,0.35) calc(var(--sz)/2), rgba(0,0,0,0) calc(var(--sz) - 3px), rgba(0,0,0,0.9) var(--sz)),
                repeating-linear-gradient(to bottom, 
                    hsl(30, 90%, 45%) 0, hsl(30, 90%, 45%) var(--sz), 
                    hsl(90, 90%, 45%) var(--sz), hsl(90, 90%, 45%) calc(var(--sz)*2), 
                    hsl(150, 90%, 45%) calc(var(--sz)*2), hsl(150, 90%, 45%) calc(var(--sz)*3),
                    hsl(210, 90%, 45%) calc(var(--sz)*3), hsl(210, 90%, 45%) calc(var(--sz)*4),
                    hsl(270, 90%, 45%) calc(var(--sz)*4), hsl(270, 90%, 45%) calc(var(--sz)*5),
                    hsl(330, 90%, 45%) calc(var(--sz)*5), hsl(330, 90%, 45%) calc(var(--sz)*6));
            
            background-blend-mode: multiply, overlay, hard-light, normal;
            
            -webkit-mask-image: conic-gradient(from 0deg, rgba(0,0,0,0) 90deg, rgba(0,0,0,1) 90deg 180deg, rgba(0,0,0,0) 180deg 270deg, rgba(0,0,0,1) 270deg);
            mask-image: conic-gradient(from 0deg, rgba(0,0,0,0) 90deg, rgba(0,0,0,1) 90deg 180deg, rgba(0,0,0,0) 180deg 270deg, rgba(0,0,0,1) 270deg);
            -webkit-mask-size: calc(var(--sz)*2) calc(var(--sz)*2);
            mask-size: calc(var(--sz)*2) calc(var(--sz)*2);
            
            /* Slower, reversed hue shift so vertical/horizontal threads cross over beautifully */
            animation: slowHue 35s linear infinite reverse;
            will-change: filter;
        }

        /* GPU Accelerated Keyframes */
        @keyframes fastHue {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }

        @keyframes slowHue {
            0% { filter: drop-shadow(0px 8px 6px rgba(0,0,0,0.9)) hue-rotate(0deg); }
            100% { filter: drop-shadow(0px 8px 6px rgba(0,0,0,0.9)) hue-rotate(360deg); }
        }

        /* CHUNKY FABRIC WEAVE TEXTURE */
        .fabric-texture {
            display: none; 
        }

        /* BRIGHT SOFT VIGNETTE */
        .weave-vignette {
            position: absolute;
            inset: 0;
            z-index: 2;
            background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.5) 100%);
            pointer-events: none;
        }

        /* FROSTED LIGHT GLASS UI */
        .glass-panel {
            background-color: rgba(255, 255, 255, 0.25);
            /* PERFORMANCE OPTIMIZATION: Reduced from 24px to 12px for mobile rendering */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.3);
            position: relative;
            /* --base-hue is now just a static starting point, parsed quickly */
            --base-hue: 200deg; 
        }
        
        .glass-panel::before {
            content: "";
            position: absolute;
            inset: 0; 
            border: 2px solid transparent;
            border-radius: inherit;
            pointer-events: none;
            z-index: 1; 
            -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            
            /* Static gradient colors */
            background: linear-gradient(90deg, 
                hsl(var(--base-hue), 100%, 60%), 
                hsl(calc(var(--base-hue) + 60deg), 100%, 60%)
            ) border-box;
            background-size: 200% 100%;
            
            /* GPU Accelerated spin and hue shift */
            animation: borderSlideHue 6s linear infinite;
            will-change: background-position, filter;
        }

        @keyframes borderSlideHue {
            0% { background-position: 0% 0%; filter: drop-shadow(0 0 3px rgba(255,255,255,0.3)) hue-rotate(0deg); }
            100% { background-position: 200% 0%; filter: drop-shadow(0 0 3px rgba(255,255,255,0.3)) hue-rotate(360deg); }
        }

        .glass-panel::after {
            content: "";
            position: absolute;
            width: 10px;
            height: 10px;
            background: hsl(var(--base-hue), 100%, 75%);
            border-radius: 50%;
            box-shadow: 0 0 12px hsl(var(--base-hue), 100%, 75%), 
                        0 0 25px hsl(var(--base-hue), 100%, 60%);
            z-index: 10;
            offset-path: rect(0 100% 100% 0 round 4px);
            
            /* Fast GPU hue-rotate over top of the static base hue */
            animation: travelMote 8s linear infinite, fastHue 15s linear infinite;
            will-change: offset-distance, filter;
        }

        @keyframes travelMote {
            from { offset-distance: 0%; }
            to { offset-distance: 100%; }
        }

        /* Glass UI Element Styles */
        .glass-input {
            background-color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.7);
            color: #0f172a;
            transition: all 0.2s;
        }
        .glass-input::placeholder {
            color: #475569;
        }
        .glass-input:focus {
            background-color: rgba(255, 255, 255, 0.8);
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
        }
        .glass-btn {
            background-color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.8);
            color: #0f172a;
            backdrop-filter: blur(8px);
            transition: all 0.2s;
        }
        .glass-btn:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.8);
            border-color: #ffffff;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            color: #1d4ed8;
        }
        .glass-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: rgba(255,255,255,0.2);
        }

        .loom-circle {
            background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%);
            box-shadow: inset 0 0 40px rgba(255,255,255,0.6), 0 0 20px rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255,255,255,0.6);
        }
        .sigil-btn {
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            left: 112px; 
            top: 112px;
        }
        .pulse-prime-sigil img {
            animation: pulsePrimeSigil 2s ease-in-out infinite alternate;
        }
        @keyframes pulsePrimeSigil {
            0% { filter: drop-shadow(0 0 10px currentColor) brightness(1.2); transform: scale(1); }
            100% { filter: drop-shadow(0 0 25px currentColor) brightness(1.5); transform: scale(1.1); }
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

export const PATTERN_THEME = {
    spatia: { label: "Spatia", desc: "Space & Dimensions", color: "#06b6d4" },
    wyird: { label: "Wyird", desc: "Fate & Chaos", color: "#a855f7" },
    dynamis: { label: "Dynamis", desc: "Energy & Elements", color: "#ef4444" },
    vitar: { label: "Vitar", desc: "Life & Healing", color: "#22c55e" },
    formus: { label: "Formus", desc: "Structure & Matter", color: "#f59e0b" },
    mentis: { label: "Mentis", desc: "Mind & Memory", color: "#ec4899" },
    arcani: { label: "Arcani", desc: "Pure Force & Magic", color: "#3b82f6" },
    umbrus: { label: "Umbrus", desc: "Shadow & Cold", color: "#4338ca" },
    tempus: { label: "Tempus", desc: "Time & Entropy", color: "#f97316" }
};

export const EFFECT_TOOLTIPS = {
    range: "Dictates the maximum distance at which you can weave this magic.",
    duration: "The length of time the physical ripples of your magic persist.<br><br><div class='bg-blue-100 border border-blue-300 p-2 rounded-sm text-[10px]'><strong class='text-blue-800 block mb-1'>The Rule of Cost:</strong> The more beneficial the timing is to your spell's intent, the higher the Essentia cost will be.</div><ul class='space-y-1.5 text-[11px] mt-2 text-slate-800'><li><b>Shorter is Better (Default):</b> Used when a sudden impact is the goal. <i>(e.g., an instantaneous fireball costs 5E, but a slow, delayed blast costs less)</i>.</li><li><b>Longer is Better (Toggle):</b> Used for buffs, debuffs, or utility where maintaining the effect over time is the goal. <i>(e.g., flying for 8 hours costs 5E, but flying for 1 round costs 2E)</i>.</li></ul>",
    activation: "The action economy and time required to cast the spell.",
    areaTargets: "The physical space or number of entities encompassed by the spell.",
    damageHealing: "The raw force, elemental energy, or restorative life woven into the spell.",
    augmentia: "Alterations to physical laws, matter, or environmental properties.<br><br><div class='bg-white/80 border border-slate-300 p-2 rounded-sm mt-2'><strong class='text-blue-700 block border-b border-slate-300 pb-1 mb-1 text-[10px] uppercase tracking-widest'>V5 Benchmark Examples</strong><ul class='space-y-1.5 text-[11px] mt-2 text-slate-800'><li><b>Minor (+1):</b> Water Breathing, Feather Fall, Jump, detecting magic</li><li><b>Weak (+2):</b> Alter Self (minor physical changes), Longstrider, Spider Climb</li><li><b>Moderate (+3):</b> Fly, Haste, Slow, Gaseous Form, Water Walk</li><li><b>Strong (+4):</b> Alter Self (significant physical changes), Teleportation</li><li><b>Major (+5):</b> True Polymorph, Teleport, Plane Shift, Time Stop</li></ul></div>",
    bolsterHinder: "Direct enhancements or supernatural penalties applied to checks and saves.<br><br><div class='bg-white/80 border border-slate-300 p-2 rounded-sm mt-2'><strong class='text-blue-700 block border-b border-slate-300 pb-1 mb-1 text-[10px] uppercase tracking-widest'>Target Options by Tier</strong><ul class='space-y-1 text-[11px] mt-2 text-slate-800'><li><b>Minor (+1):</b> Skill check</li><li><b>Weak (+2):</b> Skill check, saving throw, ability check</li><li><b>Moderate (+3):</b> Skill check, saving throw, ability check, attack roll</li><li><b>Strong (+4):</b> Skill, saving throw, ability check, attack roll, damage roll</li><li><b>Major (+5):</b> Skill, saving throw, ability check, attack roll, damage roll, AC</li></ul></div>"
};

export const getOrInitDraftState = () => {
    if (!window.appData.patternSpellDraft || typeof window.appData.patternSpellDraft !== 'object') {
        window.appData.patternSpellDraft = {
            name: '',
            description: '',
            ability: 'int',
            patterns: [],
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
        limits: {}, 
        costs: {},  
        totalBaseCost: 0,
        finalCost: 0,
        dc: 5, 
        affinitiesActiveText: {}
    };

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

        if (PATTERN_CONFIG.Effects[category] && PATTERN_CONFIG.Effects[category].mandatory) {
            if (maxTier < 1) {
                maxTier = 1;
                activeAffText = primary ? 'Mandatory Baseline (Max Tier 1)' : 'Baseline Available (Max Tier 1)';
            }
        }

        results.limits[category] = maxTier;
        results.affinitiesActiveText[category] = activeAffText;
    });

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
                starHtml = `<i class="fa-solid fa-star text-blue-600 ml-2 drop-shadow-sm" title="Primary Affinity"></i>`;
            } else if (primAff && primAff.secondary.includes(category)) {
                starHtml = `<i class="fa-regular fa-star text-blue-600 ml-2 drop-shadow-sm" title="Secondary Affinity"></i>`;
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
                <div class="mt-2.5 flex items-center gap-2 bg-white/50 px-3 py-2 rounded-sm border border-white/60 shadow-inner">
                    <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest"><i class="fa-solid fa-bolt mr-1.5 text-blue-600"></i> Energy Type:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.damageType', this.value)" class="glass-input rounded-sm text-slate-900 text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm capitalize cursor-pointer">
                        ${allowedTypes.map(t => `<option class="text-slate-900 bg-white" value="${t}" ${draft.effectTiers.damageType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'bolsterHinder' && activeTier > 0) {
            const adjustedActiveTierForOptions = isMandatory ? activeTier : activeTier;
            const allowedOptions = (effectData.tiers[adjustedActiveTierForOptions] && effectData.tiers[adjustedActiveTierForOptions].options) ? effectData.tiers[adjustedActiveTierForOptions].options : ['Skill Check'];
            optionsSelectHtml = `
                <div class="mt-2.5 flex items-center gap-2 bg-white/50 px-3 py-2 rounded-sm border border-white/60 shadow-inner">
                    <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest"><i class="fa-solid fa-shield-halved mr-1.5 text-blue-600"></i> Target:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.bolsterHinderTarget', this.value)" class="glass-input rounded-sm text-slate-900 text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm cursor-pointer">
                        ${allowedOptions.map(opt => `<option class="text-slate-900 bg-white" value="${opt}" ${draft.effectTiers.bolsterHinderTarget === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'augmentia' && activeTier > 0) {
            const examples = (effectData.tiers[activeTier] && effectData.tiers[activeTier].examples) ? effectData.tiers[activeTier].examples : [];
            let exampleOptionsHtml = '<option class="text-slate-900 bg-white" value="">-- Select an Example --</option>';
            if (examples.length > 0) {
                examples.forEach(ex => {
                    const sanitizedTip = (ex.tip || '').replace(/"/g, '&quot;');
                    exampleOptionsHtml += `<option class="text-slate-900 bg-white" value="${ex.name}" title="${sanitizedTip}">${ex.name}</option>`;
                });
                optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-2 bg-white/50 px-3 py-2.5 rounded-sm border border-white/60 shadow-inner">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center"><i class="fa-solid fa-lightbulb mr-1.5 text-blue-600"></i> Known Alterations</span>
                            <select onchange="document.getElementById('draft-aug-custom-${activeTier}').value = this.value; window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value);" class="w-full glass-input rounded-sm p-1.5 text-xs text-slate-900 outline-none font-serif shadow-sm cursor-pointer">
                                ${exampleOptionsHtml}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1 mt-1 border-t border-slate-300 pt-2">
                            <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Custom Effect Detail</span>
                            <input type="text" 
                                   id="draft-aug-custom-${activeTier}"
                                   oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                                   value="${draft.effectTiers.augmentiaCustom || ''}" 
                                   placeholder="Or describe a custom alteration..." 
                                   class="w-full glass-input rounded-sm p-2 text-xs text-slate-900 outline-none font-serif shadow-sm transition-colors">
                        </div>
                    </div>
                `;
            } else {
                 optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-1.5 bg-white/50 px-3 py-2 rounded-sm border border-white/60 shadow-inner">
                        <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Custom Effect Detail:</span>
                        <input type="text" 
                               oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false, true)" 
                               value="${draft.effectTiers.augmentiaCustom || ''}" 
                               placeholder="Describe the alteration..." 
                               class="w-full glass-input rounded-sm p-2 text-xs text-slate-900 outline-none font-serif shadow-sm transition-colors">
                    </div>
                `;
            }
        }

        let specialToggleHtml = '';
        if (category === 'duration') {
            specialToggleHtml = `
                <label class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 cursor-pointer select-none hover:text-blue-700 transition-colors">
                    <input type="checkbox" 
                           onchange="window.appActions.toggleDurationInversion(this.checked)" 
                           ${draft.effectTiers.durationInverted ? 'checked' : ''} 
                           class="w-4 h-4 text-blue-600 bg-white/50 border-white/60 rounded-sm focus:ring-blue-500 shadow-sm cursor-pointer">
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
                
                let btnClass = 'glass-btn text-slate-800';
                if (isDisabled) {
                    btnClass = 'border-white/30 bg-white/30 text-slate-500 cursor-not-allowed shadow-none';
                } else if (isSelected) {
                    btnClass = 'border-blue-500 bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.4)]';
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

        const labelColorClass = maxTierAllowed > 0 ? 'text-slate-900' : 'text-slate-500';
        const subtextColorClass = maxTierAllowed > 0 ? 'text-blue-700' : 'text-slate-500';
        const randomHue = Math.floor(Math.random() * 360);

        html += `
            <div class="p-4 glass-panel rounded-sm" style="--base-hue: ${randomHue}deg;">
                <div class="flex justify-between items-start mb-3 gap-2 flex-wrap border-b border-white/60 pb-2">
                    <div>
                        <div class="flex items-center">
                            <h4 class="text-sm font-bold font-serif ${labelColorClass} drop-shadow-sm">${labelText}</h4>
                            <button type="button" onclick="window.appActions.openEffectInfoModal('${category}')" class="ml-2 text-slate-500 hover:text-blue-600 cursor-pointer transition-colors drop-shadow-sm" title="View Details"><i class="fa-solid fa-circle-info text-xs"></i></button>
                            ${starHtml}
                        </div>
                        <span class="text-[9px] font-sans uppercase font-bold tracking-widest ${subtextColorClass} drop-shadow-sm">${subtext}</span>
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
