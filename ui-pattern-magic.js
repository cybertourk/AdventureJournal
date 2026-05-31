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
// CSS Injection for Otherworldly Grid & Convergence Effects
// =========================================================================
const injectNexusStyles = () => {
    if (document.getElementById('nexus-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'nexus-core-styles';
    style.innerHTML = `
        .nexus-grid-bg {
            background-color: #05050a;
            background-image: 
                linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
            background-size: 20px 20px;
            background-position: center center;
        }
        .glow-cyan {
            text-shadow: 0 0 10px rgba(6, 182, 212, 0.6), 0 0 20px rgba(6, 182, 212, 0.3);
        }
        .glow-amber {
            text-shadow: 0 0 10px rgba(245, 158, 11, 0.6), 0 0 20px rgba(245, 158, 11, 0.3);
        }
        .border-glow-cyan {
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.2), inset 0 0 10px rgba(6, 182, 212, 0.1);
        }
        .border-glow-amber {
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        .spin-wheel-convergence {
            animation: spinConvergence 12s linear infinite;
        }
        @keyframes spinConvergence {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .flash-prime-glow {
            animation: pulsePrime 2s infinite alternate;
        }
        @keyframes pulsePrime {
            0% { box-shadow: 0 0 8px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.2); }
            100% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.8), inset 0 0 20px rgba(6, 182, 212, 0.5); }
        }
        .flash-secondary-glow {
            animation: pulseSec 2s infinite alternate;
        }
        @keyframes pulseSec {
            0% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.3), inset 0 0 6px rgba(245, 158, 11, 0.1); }
            100% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.7), inset 0 0 15px rgba(245, 158, 11, 0.4); }
        }
        .wheel-node-transition {
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        /* Custom scrollbar for dark tech log */
        .nexus-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
        }
        .nexus-scrollbar::-webkit-scrollbar-track {
            background: #09090f;
        }
        .nexus-scrollbar::-webkit-scrollbar-thumb {
            background: #1e1b4b;
            border-radius: 2px;
        }
        .nexus-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #06b6d4;
        }
    `;
    document.head.appendChild(style);
};

// Map each of the 9 magical vectors to its visual/metaphysical color design
const PATTERN_THEME = {
    spatia: { label: "Spatia", desc: "Space & Dimensions", color: "#06b6d4", bg: "bg-cyan-950/40", border: "border-cyan-500/30" },
    wyird: { label: "Wyird", desc: "Fate & Chaos", color: "#a855f7", bg: "bg-purple-950/40", border: "border-purple-500/30" },
    dynamis: { label: "Dynamis", desc: "Energy & Elements", color: "#f97316", bg: "bg-orange-950/40", border: "border-orange-500/30" },
    vitar: { label: "Vitar", desc: "Life & Healing", color: "#22c55e", bg: "bg-emerald-950/40", border: "border-emerald-500/30" },
    formus: { label: "Formus", desc: "Structure & Matter", color: "#94a3b8", bg: "bg-slate-900/40", border: "border-slate-500/30" },
    mentis: { label: "Mentis", desc: "Mind & Memory", color: "#ec4899", bg: "bg-pink-950/40", border: "border-pink-500/30" },
    arcani: { label: "Arcani", desc: "Pure Force & Magic", color: "#3b82f6", bg: "bg-blue-950/40", border: "border-blue-500/30" },
    umbrus: { label: "Umbrus", desc: "Shadow & Cold", color: "#6366f1", bg: "bg-indigo-950/40", border: "border-indigo-500/30" },
    tempus: { label: "Tempus", desc: "Time & Entropy", color: "#eab308", bg: "bg-yellow-950/40", border: "border-yellow-500/30" }
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
// Wheel Calculation Engine & Dynamic Renderer
// =========================================================================
function renderSpellWheelHTML(pc, pm, draft) {
    const patternsList = Object.keys(PATTERN_THEME);
    const primary = draft.patterns[0] || null;
    const supports = draft.patterns.slice(1);
    const isConvergence = draft.patterns.length === 9;

    let wheelNodesHtml = '';
    
    // Circle math parameters
    const width = 320;
    const height = 320;
    const radius = 105;
    const cx = width / 2;
    const cy = height / 2;

    if (!primary) {
        // State A: No Primary selected. Render all 9 elements equidistant in an outer circle.
        patternsList.forEach((key, index) => {
            const angle = (index * (360 / 9) - 90) * (Math.PI / 180);
            const x = cx + radius * Math.cos(angle) - 24; // offset by half button width (48px)
            const y = cy + radius * Math.sin(angle) - 24;
            const theme = PATTERN_THEME[key];
            const rank = pm[key] || 0;

            wheelNodesHtml += `
                <button type="button" 
                        onclick="window.appActions.toggleWheelPattern('${key}')"
                        style="left: ${x}px; top: ${y}px; border-color: ${theme.color}40;"
                        class="absolute w-12 h-12 rounded-full border bg-black/90 flex flex-col items-center justify-center text-stone-400 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] wheel-node-transition z-20 group">
                    <span class="text-[9px] font-bold font-mono tracking-tighter leading-none" style="color: ${theme.color};">${key.substring(0,3).toUpperCase()}</span>
                    <span class="text-[9px] font-black leading-none mt-0.5">${rank}</span>
                    <!-- Dynamic Tooltip -->
                    <span class="absolute hidden group-hover:block bottom-14 bg-black/95 border border-stone-800 text-[9px] px-2 py-1 rounded text-stone-300 font-mono tracking-widest uppercase pointer-events-none whitespace-nowrap z-50 shadow-md">
                        ${theme.label} (Rank ${rank})
                    </span>
                </button>
            `;
        });
    } else {
        // State B: Primary Selected. Sits perfectly in the center. Others form an 8-node orbit.
        const orbitsList = patternsList.filter(k => k !== primary);
        
        // Render Primary Node in center
        const primeTheme = PATTERN_THEME[primary];
        const primeRank = pm[primary] || 0;
        const primeFlashClass = isConvergence ? 'flash-prime-glow' : 'shadow-[0_0_20px_rgba(6,182,212,0.5)]';

        wheelNodesHtml += `
            <button type="button"
                    onclick="window.appActions.toggleWheelPattern('${primary}')"
                    style="left: calc(50% - 28px); top: calc(50% - 28px); border-color: ${primeTheme.color};"
                    class="absolute w-14 h-14 rounded-full border-2 bg-black flex flex-col items-center justify-center text-white ${primeFlashClass} wheel-node-transition z-30 group">
                <span class="text-[10px] font-black font-mono tracking-wider" style="color: ${primeTheme.color};">${primary.substring(0,4).toUpperCase()}</span>
                <span class="text-[10px] font-black leading-none mt-0.5">${primeRank}</span>
                <span class="absolute bottom-16 bg-black/95 border border-stone-850 text-[8px] px-2 py-0.5 rounded text-amber-500 font-mono tracking-widest uppercase pointer-events-none whitespace-nowrap z-50">
                    PRIMARY VECTOR: ${primeTheme.label}
                </span>
            </button>
        `;

        // Render remaining 8 orbiting nodes
        orbitsList.forEach((key, index) => {
            const angle = (index * (360 / 8) - 90) * (Math.PI / 180);
            const x = cx + radius * Math.cos(angle) - 22; // half of 44px
            const y = cy + radius * Math.sin(angle) - 22;
            const theme = PATTERN_THEME[key];
            const rank = pm[key] || 0;

            const isSupported = supports.includes(key);
            let borderStyle = `border-color: ${theme.color}25;`;
            let glowClass = 'text-stone-400 bg-black/80 hover:border-cyan-500/40';
            
            if (isSupported) {
                borderStyle = `border-color: ${theme.color}; box-shadow: 0 0 10px ${theme.color}40;`;
                glowClass = 'text-white bg-black/95';
            }

            const orbitPulse = isConvergence ? 'flash-secondary-glow' : '';

            wheelNodesHtml += `
                <button type="button"
                        onclick="window.appActions.toggleWheelPattern('${key}')"
                        style="left: ${x}px; top: ${y}px; ${borderStyle}"
                        class="absolute w-11 h-11 rounded-full border flex flex-col items-center justify-center hover:text-white hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] wheel-node-transition z-20 group ${glowClass} ${orbitPulse}">
                    <span class="text-[8px] font-bold font-mono tracking-tighter leading-none" style="color: ${theme.color};">${key.substring(0,3).toUpperCase()}</span>
                    <span class="text-[8px] font-black leading-none mt-0.5">${rank}</span>
                    <span class="absolute hidden group-hover:block bottom-12 bg-black/95 border border-stone-800 text-[8px] px-2 py-1 rounded text-stone-300 font-mono tracking-widest uppercase pointer-events-none whitespace-nowrap z-50 shadow-md">
                        ${theme.label} (Rank ${rank}) ${isSupported ? '- SUPPORTING' : ''}
                    </span>
                </button>
            `;
        });
    }

    const convergenceSpinClass = isConvergence ? 'spin-wheel-convergence' : '';

    return `
    <div class="relative w-[320px] h-[320px] bg-stone-950/60 border border-cyan-950/30 rounded-full flex items-center justify-center p-4 shadow-inner mx-auto mb-6 shrink-0 overflow-hidden">
        <!-- SVG Matrix Grid Lines in Background -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none ${convergenceSpinClass}" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="105" fill="none" stroke="rgba(6,182,212,0.08)" stroke-width="1.5" stroke-dasharray="4 4" />
            <circle cx="160" cy="160" r="60" fill="none" stroke="rgba(6,182,212,0.05)" stroke-width="1" />
            
            ${primary ? Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                const x2 = 160 + radius * Math.cos(angle);
                const y2 = 160 + radius * Math.sin(angle);
                return `<line x1="160" y1="160" x2="${x2}" y2="${y2}" stroke="rgba(6,182,212,0.05)" stroke-width="1" />`;
            }).join('') : ''}
        </svg>

        <!-- Node buttons layout container -->
        <div class="absolute inset-0">
            ${wheelNodesHtml}
        </div>
    </div>
    `;
}

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
        dc: 10,
        affinitiesActiveText: {}
    };

    // Calculate maximum allowable tiers for all 7 effect categories
    Object.keys(PATTERN_CONFIG.Effects).forEach(category => {
        let maxTier = 0;
        let activeAffText = 'Restricted (0)';

        if (primary) {
            const primaryAff = PATTERN_CONFIG.Affinities[primary];
            const primaryRank = pm[primary] || 0;

            if (primaryAff.primary.includes(category)) {
                // Primary Affinity: Rank + 1 (capped at 5)
                maxTier = Math.min(5, primaryRank + 1);
                activeAffText = `Primary Alignment (${maxTier})`;
            } else if (primaryAff.secondary.includes(category)) {
                // Secondary Affinity: Equals Rank
                maxTier = primaryRank;
                activeAffText = `Secondary Alignment (${maxTier})`;
            }

            // Check supporting elements
            supports.forEach(supPattern => {
                const supAff = PATTERN_CONFIG.Affinities[supPattern];
                const supRank = pm[supPattern] || 0;

                if (supAff.primary.includes(category) || supAff.secondary.includes(category)) {
                    if (supRank > maxTier) {
                        maxTier = supRank;
                        activeAffText = `Supporting: ${supPattern.toUpperCase()} (${maxTier})`;
                    }
                }
            });
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
            cost = config.invertedTiers[tier]?.cost || 0;
        } else {
            cost = config.tiers[tier]?.cost || 0;
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

    results.dc = 10 + results.finalCost;
    return results;
}

// =========================================================================
// Main Pattern Nexus HTML Render
// =========================================================================
export function getPatternNexusHTML(state) {
    injectNexusStyles();
    const camp = state.activeCampaign;
    if (!camp) return '';

    const myUid = state.currentUserUid;
    const isDM = camp._isDM;

    // Check if the Nexus has been unlocked by resolving the current PC selection
    const activePcId = state.activePatternPcId || (camp.playerCharacters?.find(p => p.playerId === myUid)?.id) || '';
    const activePc = camp.playerCharacters?.find(p => p.id === activePcId);
    
    // Safety Fallback: If no PC exists, display clean prompt to create one first
    if (!activePc) {
        return `
        <div class="nexus-grid-bg min-h-screen text-stone-400 flex flex-col items-center justify-center p-8 font-mono border-2 border-stone-900 shadow-2xl relative">
            <div class="max-w-md text-center p-6 bg-black/90 border border-red-950 rounded shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <i class="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4 animate-pulse"></i>
                <h3 class="font-serif font-black text-xl text-stone-200 uppercase tracking-widest mb-2">No Active Matrix Found</h3>
                <p class="text-xs leading-relaxed mb-6">Before you can establish a connection with the Pattern, a Player Character must be initialized and linked to your account.</p>
                <button onclick="window.appActions.setView('pc-manager')" class="px-5 py-2.5 bg-red-950 text-red-200 border border-red-700/40 rounded uppercase tracking-wider text-xs font-bold hover:bg-red-900 transition-all">Go to Characters</button>
            </div>
        </div>
        `;
    }

    const pm = getOrInitPatternState(activePc);
    const draft = getOrInitDraftState();

    // Verify unlocked state or DM overrides
    const isUnlocked = activePc.patternMagicUnlocked === true || (pm.spatia + pm.wyird + pm.dynamis + pm.vitar + pm.formus + pm.mentis + pm.arcani + pm.umbrus + pm.tempus > 0);
    
    if (!isUnlocked && !isDM) {
        return `
        <div class="nexus-grid-bg min-h-screen text-stone-400 flex flex-col items-center justify-center p-8 font-mono border-2 border-stone-900 shadow-2xl relative">
            <div class="max-w-md text-center p-8 bg-black/90 border border-cyan-950 rounded shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                <div class="absolute inset-0 pointer-events-none border border-cyan-500/10 rounded m-1"></div>
                <i class="fa-solid fa-eye-slash text-cyan-500 text-3xl mb-4 animate-pulse"></i>
                <h3 class="font-serif font-black text-xl text-stone-100 uppercase tracking-widest mb-2 glow-cyan">Dimensional Block</h3>
                <p class="text-xs leading-relaxed mb-6 font-mono text-cyan-500/80">Connection terminated. The dimensional alignment of this character has not yet been unlocked by the Dungeon Master. Seek cosmic convergence first.</p>
                <button onclick="window.appActions.setView('adventure')" class="px-5 py-2.5 bg-stone-900 text-stone-400 border border-stone-800 rounded uppercase tracking-wider text-xs font-bold hover:bg-stone-800 hover:text-stone-200 transition-all">Return to Campaign</button>
            </div>
        </div>
        `;
    }

    // Character Switching Interface (to solve the multiple-character support requirement)
    const pcSelectorHtml = `
        <div class="flex items-center gap-2 bg-stone-950/80 px-3 py-1.5 border border-stone-800 rounded-sm">
            <span class="text-[9px] uppercase tracking-widest text-cyan-500/60 font-bold">Vector Bind:</span>
            <select onchange="window.appActions.switchPatternPc(this.value)" class="bg-black text-cyan-400 border-none outline-none text-xs font-bold font-mono tracking-wide cursor-pointer py-0.5">
                ${camp.playerCharacters?.map(p => {
                    const hasAccess = p.patternMagicUnlocked || isDM;
                    if (!hasAccess) return '';
                    const isSelected = p.id === activePcId ? 'selected' : '';
                    return `<option value="${p.id}" ${isSelected}>${p.name.toUpperCase()}</option>`;
                }).join('')}
            </select>
        </div>
    `;

    // Calculate maximum Essentia
    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;

    // Build Essentia Pip Gauge
    let pipsHtml = '';
    for (let i = 1; i <= maxEssentia; i++) {
        const isFilled = pm.essentia >= i;
        const color = isFilled ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-transparent border-stone-800';
        pipsHtml += `
            <button type="button" 
                    onclick="window.appActions.setPcEssentia('${activePc.id}', ${i})"
                    class="w-3.5 h-3.5 rounded-full border ${color} transition-all duration-300 hover:scale-125"
                    title="Set Essentia to ${i}/${maxEssentia}">
            </button>
        `;
    }

    // Dynamic Math Cost Output box
    const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);

    // Build the dynamic effects forms UI
    let effectsConfigurationHtml = '';
    Object.entries(PATTERN_CONFIG.Effects).forEach(([category, effectData]) => {
        const activeTier = draft.effectTiers[category] || 0;
        const maxTierAllowed = metrics.limits[category];
        const labelText = effectData.name;
        const subtext = metrics.affinitiesActiveText[category];

        const tiersList = (category === 'duration' && draft.effectTiers.durationInverted) 
            ? effectData.invertedTiers 
            : effectData.tiers;

        let optionsSelectHtml = '';
        if (category === 'damageHealing' && activeTier > 0) {
            // ELEMENT FILTER: Scan active patterns to only allow elemental types they align with
            const activePatterns = draft.patterns;
            let allowedTypes = ['force']; // Base element
            activePatterns.forEach(pat => {
                const types = PATTERN_CONFIG.DamageTypesByPattern[pat] || [];
                types.forEach(t => { if (!allowedTypes.includes(t)) allowedTypes.push(t); });
            });

            optionsSelectHtml = `
                <div class="mt-2 flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded border border-stone-900">
                    <span class="text-[8px] font-bold text-stone-500 uppercase tracking-wider">ELEMENT:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.damageType', this.value)" class="bg-black border-none text-cyan-400 text-[10px] uppercase font-mono outline-none tracking-wider">
                        ${allowedTypes.map(t => `<option value="${t}" ${draft.effectTiers.damageType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'bolsterHinder' && activeTier > 0) {
            const allowedOptions = effectData.tiers[activeTier].options || ['Skill Check'];
            optionsSelectHtml = `
                <div class="mt-2 flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded border border-stone-900">
                    <span class="text-[8px] font-bold text-stone-500 uppercase tracking-wider">APPLICATION:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.bolsterHinderTarget', this.value)" class="bg-black border-none text-cyan-400 text-[10px] uppercase font-mono outline-none tracking-wider">
                        ${allowedOptions.map(opt => `<option value="${opt}" ${draft.effectTiers.bolsterHinderTarget === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (category === 'augmentia' && activeTier > 0) {
            optionsSelectHtml = `
                <div class="mt-2 flex flex-col gap-1">
                    <span class="text-[8px] font-bold text-stone-500 uppercase tracking-wider">CUSTOM EFFECT SPECIFICATION:</span>
                    <input type="text" 
                           oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value)" 
                           value="${draft.effectTiers.augmentiaCustom || ''}" 
                           placeholder="Describe custom physical vector adjustments..." 
                           class="w-full bg-black border border-stone-900 rounded p-1.5 text-[10px] text-stone-200 outline-none font-mono focus:border-cyan-500/40">
                </div>
            `;
        }

        // Add special custom duration inverted checkbox toggle
        let specialToggleHtml = '';
        if (category === 'duration') {
            specialToggleHtml = `
                <label class="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer select-none">
                    <input type="checkbox" 
                           onchange="window.appActions.toggleDurationInversion(this.checked)" 
                           ${draft.effectTiers.durationInverted ? 'checked' : ''} 
                           class="w-3 h-3 text-cyan-500 bg-black border-stone-800 rounded-sm focus:ring-0">
                    <span>Longer is Advantageous</span>
                </label>
            `;
        }

        // Tier options selector
        let tierButtonsHtml = '';
        tiersList.forEach((tier, index) => {
            const isDisabled = index > maxTierAllowed;
            const isSelected = activeTier === index;
            
            let btnClass = 'border-stone-900 bg-black/30 text-stone-500 hover:text-stone-300';
            if (isDisabled) {
                btnClass = 'border-stone-950 bg-black/10 text-stone-800 cursor-not-allowed';
            } else if (isSelected) {
                btnClass = 'border-cyan-500 bg-cyan-950/20 text-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]';
            }

            tierButtonsHtml += `
                <button type="button" 
                        ${isDisabled ? 'disabled' : ''} 
                        onclick="window.appActions.setEffectTier('${category}', ${index})"
                        class="px-2 py-1.5 border rounded-sm text-[9px] text-left transition-all leading-snug flex justify-between items-center ${btnClass}">
                    <span>T${index}: ${tier.text}</span>
                    <span class="font-mono text-[8px] opacity-60">+${tier.cost} E</span>
                </button>
            `;
        });

        const labelGlowClass = maxTierAllowed > 0 ? 'text-stone-300' : 'text-stone-600';
        const subtextGlowClass = maxTierAllowed > 0 ? 'text-cyan-500/70' : 'text-stone-700';

        effectsConfigurationHtml += `
            <div class="p-3.5 bg-stone-950/40 border border-stone-900 rounded-sm">
                <div class="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest font-mono ${labelGlowClass}">${labelText}</h4>
                        <span class="text-[8px] font-mono uppercase font-bold tracking-wider ${subtextGlowClass}">${subtext}</span>
                    </div>
                    ${specialToggleHtml}
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                    ${tierButtonsHtml}
                </div>
                ${optionsSelectHtml}
            </div>
        `;
    });

    // Rotes List Sidebar
    const memorizedRotesList = pm.rotes || [];
    let rotesTabHtml = '';
    if (memorizedRotesList.length === 0) {
        rotesTabHtml = `
            <div class="p-6 text-center border border-dashed border-stone-900 bg-black/20 rounded-sm">
                <p class="text-stone-600 italic text-[11px] font-mono uppercase tracking-wider">Memory Banks Empty</p>
            </div>
        `;
    } else {
        rotesTabHtml = `
            <div class="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                ${memorizedRotesList.map(r => {
                    const isSelected = draft.selectedRoteId === r.id;
                    const selectBorder = isSelected ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.15)] bg-cyan-950/10' : 'border-stone-900 bg-black/40';
                    const listDisplay = r.patterns.map(p => p.toUpperCase()).join(' + ');

                    return `
                    <div class="p-2.5 border rounded-sm ${selectBorder} flex justify-between items-center gap-3 transition">
                        <div class="cursor-pointer flex-1" onclick="window.appActions.loadRoteToDraft('${r.id}')">
                            <h5 class="text-xs font-bold text-stone-200 font-mono tracking-wide flex items-center gap-1.5">
                                <i class="fa-solid fa-microchip ${isSelected ? 'text-cyan-400' : 'text-stone-600'}"></i> ${r.name}
                            </h5>
                            <span class="block text-[8px] uppercase tracking-wider text-stone-500 font-mono mt-0.5">Vectors: ${listDisplay}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-mono font-bold text-amber-500" title="Rote Cost discounted ~33%">${r.essentiaCost} E</span>
                            <button type="button" onclick="window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-stone-600 hover:text-red-500 transition px-1.5 py-1" title="Decompile Rote">
                                <i class="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Ability casting selector
    const abilitySelectorHtml = `
        <div class="flex items-center gap-2 bg-black px-2.5 py-1 rounded border border-stone-900">
            <span class="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Casting Core:</span>
            <select onchange="window.appActions.updateDraftField('ability', this.value)" class="bg-black border-none text-cyan-400 text-xs font-mono outline-none cursor-pointer uppercase tracking-wider">
                <option value="int" ${draft.ability === 'int' ? 'selected' : ''}>INT (${activePc.int || 10})</option>
                <option value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>WIS (${activePc.wis || 10})</option>
                <option value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>CHA (${activePc.cha || 10})</option>
            </select>
        </div>
    `;

    // DM Administration View
    let dmAdministrationPanelHtml = '';
    if (isDM) {
        dmAdministrationPanelHtml = `
            <!-- DM Administration Layer -->
            <div class="p-5 bg-black border border-stone-900 rounded-sm mb-6 relative">
                <div class="absolute inset-0 border border-red-500/5 pointer-events-none rounded m-0.5"></div>
                <h3 class="text-sm font-bold font-serif text-red-500 uppercase tracking-widest flex items-center border-b border-stone-900 pb-2 mb-4">
                    <i class="fa-solid fa-shield-halved text-red-700 mr-2 animate-pulse"></i> Overseer Override Matrix
                </h3>
                
                <div class="flex flex-wrap items-center justify-between gap-4 mb-4 bg-stone-950 p-3 rounded border border-stone-900">
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">Core Access Unlock:</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" onchange="window.appActions.toggleCampaignPcAccess('${activePc.id}', this.checked)" ${activePc.patternMagicUnlocked ? 'checked' : ''} class="sr-only peer">
                            <div class="w-9 h-5 bg-stone-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-500 after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-950 peer-checked:after:bg-cyan-400 peer-checked:after:border-cyan-400"></div>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">Unspent Points:</span>
                        <div class="flex items-center gap-1.5 bg-black px-2 py-1 rounded border border-stone-850">
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', -1)" class="text-red-500 hover:text-red-400 transition font-bold px-1 text-xs">-</button>
                            <span class="text-xs font-mono font-bold text-white px-1.5 min-w-[20px] text-center">${pm.patternPoints || 0}</span>
                            <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', 'patternPoints', 1)" class="text-emerald-500 hover:text-emerald-400 transition font-bold px-1 text-xs">+</button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                        const val = pm[key] || 0;
                        return `
                        <div class="flex items-center justify-between p-2.5 bg-stone-950/50 border border-stone-900 rounded">
                            <span class="text-[10px] font-mono font-bold uppercase tracking-wider" style="color: ${theme.color};">${key}</span>
                            <div class="flex items-center gap-1.5 bg-black px-1.5 py-0.5 rounded border border-stone-900">
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', -1)" class="text-red-500 hover:text-red-400 transition font-bold px-1 text-[10px]">-</button>
                                <span class="text-[10px] font-mono font-bold text-stone-200 px-1 min-w-[12px] text-center">${val}</span>
                                <button onclick="window.appActions.adjustPatternParameter('${activePc.id}', '${key}', 1)" class="text-emerald-500 hover:text-emerald-400 transition font-bold px-1 text-[10px]">+</button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    return `
    <div class="nexus-grid-bg min-h-screen text-stone-400 p-4 sm:p-6 lg:p-8 font-mono border-2 border-stone-900 shadow-2xl relative">
        <div class="max-w-6xl mx-auto">
            
            <!-- Header Block -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-cyan-950/40 pb-5">
                <div>
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-compass-drafting text-cyan-500 text-2xl animate-pulse"></i>
                        <h2 class="text-2xl font-serif font-black uppercase tracking-widest text-stone-100 glow-cyan">The Pattern Nexus</h2>
                    </div>
                    <p class="text-[9px] text-cyan-500/60 font-mono uppercase tracking-widest mt-1">Core Identity: Altern-Reality Construct Interface // Vector Control</p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    ${pcSelectorHtml}
                    <button onclick="window.appActions.setView('adventure')" class="px-3.5 py-1.5 bg-stone-950 text-stone-400 border border-stone-800 rounded-sm hover:bg-stone-900 hover:text-stone-100 transition text-[10px] font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-arrow-left-long mr-2"></i> Return
                    </button>
                </div>
            </div>

            <!-- DM Configuration Overseer Area -->
            ${dmAdministrationPanelHtml}

            <!-- Main Layout Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                <!-- Left Panel: SVG Wheel & Vector upgrade Matrix (5 cols) -->
                <div class="lg:col-span-5 space-y-6">
                    
                    <!-- Circular SVG Spell Wheel Widget -->
                    <div class="p-6 bg-black/85 border border-stone-900 rounded shadow-md relative overflow-hidden">
                        <div class="absolute inset-0 border border-cyan-500/5 pointer-events-none rounded m-0.5"></div>
                        <h3 class="text-xs font-bold text-stone-300 uppercase tracking-widest font-mono border-b border-stone-900 pb-2 mb-4 text-center">Vector Geometry Alignment</h3>
                        
                        ${renderSpellWheelHTML(activePc, pm, draft)}

                        <div class="p-3 bg-stone-950 border border-stone-900 rounded text-center text-[10px] text-stone-400">
                            <p class="font-serif italic leading-relaxed">
                                ${draft.patterns.length === 0 
                                    ? `Select an outer element to designate as your Primary Vector.` 
                                    : draft.patterns.length === 9 
                                    ? `🚨 <span class="text-amber-500 font-bold">CONVERGENCE ALIGNED.</span> Dynamic resonance matrix active!` 
                                    : `Select orbiting elements to add Support vectors. Active vectors scale allowable spell tiers.`}
                            </p>
                        </div>
                    </div>

                    <!-- Player Development: Upgrade Matrix -->
                    <div class="p-5 bg-black/85 border border-stone-900 rounded shadow-md relative">
                        <div class="absolute inset-0 border border-cyan-500/5 pointer-events-none rounded m-0.5"></div>
                        <div class="flex justify-between items-center border-b border-stone-900 pb-2 mb-3">
                            <h3 class="text-xs font-bold text-stone-300 uppercase tracking-widest font-mono flex items-center">
                                <i class="fa-solid fa-shield-halved text-cyan-600 mr-2"></i> Development Ranks
                            </h3>
                            <span class="text-[9px] font-mono text-cyan-400 font-bold">Points: ${pm.patternPoints || 0}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-2">
                            ${Object.entries(PATTERN_THEME).map(([key, theme]) => {
                                const val = pm[key] || 0;
                                const canAdd = (pm.patternPoints || 0) > 0 && val < 5;
                                const isFocused = draft.patterns.includes(key);
                                const focusClass = isFocused ? 'border-cyan-500/30 bg-cyan-950/5' : 'border-stone-900/60 bg-stone-950/20';

                                return `
                                <div class="flex items-center justify-between p-2 border rounded-sm ${focusClass}">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${theme.color};"></div>
                                        <div>
                                            <span class="text-[10px] font-bold text-stone-200 font-mono tracking-wider">${theme.label}</span>
                                            <span class="block text-[8px] text-stone-500 font-mono tracking-tighter uppercase leading-none">${theme.desc}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-xs font-mono font-bold text-stone-300">${val} / 5</span>
                                        ${canAdd ? `
                                            <button onclick="window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-sm hover:bg-cyan-900 transition-all text-[9px] font-bold">
                                                + UPGRADE
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Cast Configuration Engine (7 cols) -->
                <div class="lg:col-span-7 space-y-6">
                    
                    <!-- Essentia Pip Reservoir -->
                    <div class="p-5 bg-black/85 border border-stone-900 rounded shadow-md relative">
                        <div class="absolute inset-0 border border-cyan-500/5 pointer-events-none rounded m-0.5"></div>
                        <div class="flex justify-between items-center border-b border-stone-900 pb-2 mb-3">
                            <h3 class="text-xs font-bold text-stone-300 uppercase tracking-widest font-mono flex items-center">
                                <i class="fa-solid fa-bolt text-cyan-500 mr-2"></i> Essentia Pip Tracker
                            </h3>
                            <span class="text-[10px] font-mono text-cyan-400 font-bold">${pm.essentia || 0} / ${maxEssentia}</span>
                        </div>
                        <div class="flex flex-wrap gap-2.5 p-3.5 bg-stone-950/80 rounded border border-stone-900/60 justify-center min-h-[40px]">
                            ${pipsHtml || `<span class="text-[10px] text-stone-600 italic uppercase">Unlock ranks to construct Essentia capacity</span>`}
                        </div>
                    </div>

                    <!-- Spell Form Formulation Engine -->
                    <div class="p-5 bg-black/85 border border-stone-900 rounded shadow-md relative">
                        <div class="absolute inset-0 border border-cyan-500/5 pointer-events-none rounded m-0.5"></div>
                        <h3 class="text-xs font-bold text-stone-300 uppercase tracking-widest font-mono border-b border-stone-900 pb-2 mb-4 flex items-center justify-between">
                            <span>Vector Formulation Matrix</span>
                            <span class="text-[8px] font-mono text-cyan-500/60">Ability Modifier syncs automatically</span>
                        </h3>

                        <!-- Draft Spell Identity -->
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                            <div class="sm:col-span-8">
                                <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-1">Spell Custom Identifier:</label>
                                <input type="text" 
                                       id="draft-spell-name" 
                                       oninput="window.appActions.updateDraftField('name', this.value)" 
                                       value="${draft.name || ''}" 
                                       placeholder="Provide a name for this dimensional pattern..." 
                                       class="w-full bg-stone-950 border border-stone-900 rounded p-2 text-xs text-stone-200 outline-none font-mono focus:border-cyan-500/40">
                            </div>
                            <div class="sm:col-span-4 flex items-end">
                                ${abilitySelectorHtml}
                            </div>
                        </div>

                        <div class="mb-5">
                            <label class="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-1">Casting Intent Narrative / Description:</label>
                            <textarea id="draft-spell-desc" 
                                      oninput="window.appActions.updateDraftField('description', this.value)" 
                                      placeholder="Describe the aesthetic and physical ripples of your dimensional modification..." 
                                      class="w-full bg-stone-950 border border-stone-900 rounded p-2 text-xs text-stone-300 outline-none font-mono focus:border-cyan-500/40 resize-none h-14 custom-scrollbar">${draft.description || ''}</textarea>
                        </div>

                        <!-- Active Effects Scaffolding -->
                        <div class="space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar pr-1 mb-5">
                            ${effectsConfigurationHtml}
                        </div>

                        <!-- Cost Outputs & Casting Trigger Card -->
                        <div class="p-4 bg-stone-950/80 rounded border border-stone-900 space-y-4">
                            <div class="flex flex-wrap justify-between items-center gap-3">
                                <div>
                                    <span class="block text-[8px] font-bold text-stone-500 uppercase tracking-wider">Required Cost:</span>
                                    <strong class="text-xl font-mono text-cyan-400 tracking-tighter glow-cyan">
                                        ${metrics.finalCost} Essentia
                                    </strong>
                                    ${draft.isRote ? `<span class="block text-[8px] text-amber-500/80 font-mono font-bold uppercase tracking-wider mt-0.5">Rote memory discount applied (-33%)</span>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="block text-[8px] font-bold text-stone-500 uppercase tracking-wider">Check Difficulty:</span>
                                    <strong class="text-xl font-mono text-amber-500 tracking-tighter glow-amber">
                                        DC ${metrics.dc}
                                    </strong>
                                </div>
                            </div>

                            <!-- Save Rote Form -->
                            <div class="pt-3 border-t border-stone-900/60 flex flex-col sm:flex-row gap-2.5 items-center">
                                <input type="text" 
                                       id="input-rote-memorize-name" 
                                       placeholder="Save Configuration as Rote..." 
                                       class="flex-1 w-full bg-black border border-stone-900 rounded p-1.5 text-xs text-stone-200 outline-none font-mono focus:border-cyan-500/40">
                                <button type="button" 
                                        onclick="window.appActions.memorizeCurrentDraftAsRote('${activePc.id}')"
                                        class="w-full sm:w-auto px-4 py-2 bg-stone-900 text-cyan-400 hover:bg-stone-850 hover:text-cyan-300 transition text-[9px] font-bold uppercase tracking-widest rounded-sm border border-cyan-900/30">
                                    <i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Rote
                                </button>
                            </div>

                            <!-- Weave Spell Trigger -->
                            <div class="pt-1.5">
                                <button type="button" 
                                        onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                        class="w-full py-3 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 hover:text-white transition-all text-xs font-bold uppercase tracking-widest rounded-sm shadow-md border border-cyan-700/30 flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-wand-magic-sparkles animate-pulse"></i> Weave & Unravel Reality
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Memorized Rotes Bank -->
                    <div class="p-5 bg-black/85 border border-stone-900 rounded shadow-md relative">
                        <div class="absolute inset-0 border border-cyan-500/5 pointer-events-none rounded m-0.5"></div>
                        <h3 class="text-xs font-bold text-stone-300 uppercase tracking-widest font-mono border-b border-stone-900 pb-2 mb-4 flex items-center justify-between">
                            <span>Memorized Rote Bank</span>
                            <span class="text-[8px] font-mono text-cyan-500/60">Locks inputs for cost discount</span>
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
// UI EVENT BINDINGS & ACTIONS
// =========================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};

    // Handles selection of a different character (multiple characters requirement)
    window.appActions.switchPatternPc = (pcId) => {
        window.appData.activePatternPcId = pcId;
        reRender(true);
    };

    // Toggles the DM Campaign unlock access for this PC
    window.appActions.toggleCampaignPcAccess = async (pcId, checked) => {
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) return;
        const pc = camp.playerCharacters?.find(p => p.id === pcId);
        if (pc) {
            pc.patternMagicUnlocked = checked;
            await window.appActions.adjustPatternParameter(pcId, 'patternPoints', 0); // triggers Firebase update
        }
    };

    // Updates a key-value value inside the draft Spell configuration
    window.appActions.updateDraftField = (path, value) => {
        const draft = getOrInitDraftState();
        if (path.startsWith('effectTiers.')) {
            const field = path.split('.')[1];
            draft.effectTiers[field] = value;
        } else {
            draft[path] = value;
        }
        reRender(true);
    };

    // Toggle selected Pattern keys on the interactive circular SVG wheel (handles Orbit & Convergence)
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
        reRender(true);
    };

    // Standardizes duration inversion configuration in spell mechanics
    window.appActions.toggleDurationInversion = (checked) => {
        const draft = getOrInitDraftState();
        draft.effectTiers.durationInverted = checked;
        draft.effectTiers.duration = 0; // reset tier selection
        reRender(true);
    };

    // Set configured effect tier
    window.appActions.setEffectTier = (category, tierIndex) => {
        const draft = getOrInitDraftState();
        draft.effectTiers[category] = tierIndex;
        draft.isRote = false;
        draft.selectedRoteId = '';
        reRender(true);
    };

    // Commits the current configured draft spell as a saved Rote to the active PC
    window.appActions.memorizeCurrentDraftAsRote = async (pcId) => {
        const nameInput = document.getElementById('input-rote-memorize-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            window.appActions.notify("Rote requires a designated identifier before compiling.", "error");
            return;
        }

        const draft = getOrInitDraftState();
        if (draft.patterns.length === 0) {
            window.appActions.notify("Configure active vectors on the Spell Wheel before saving.", "error");
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
            window.appActions.notify("You cannot save a Rote containing elements that exceed active Vector Affinity ranks.", "error");
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
        }
    };

    // Load saved Rote from active PC into active casting draft container
    window.appActions.loadRoteToDraft = (roteId) => {
        const camp = window.appData.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === (window.appData.activePatternPcId || ''));
        if (!pc) return;

        const rote = pc.patternMagic?.rotes?.find(r => r.id === roteId);
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

        reRender(true);
    };

    // Trigger the actual casting mechanics roll
    window.appActions.castCurrentPatternSpell = async (pcId) => {
        const draft = getOrInitDraftState();
        if (draft.patterns.length === 0) {
            window.appActions.notify("A Primary Vector is required to trigger spell construction.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === pcId);
        if (!pc) return;

        const pm = getOrInitPatternState(pc);
        const metrics = calculateAffinityLimitsAndCosts(pc, pm, draft);

        if (pm.essentia < metrics.finalCost) {
            window.appActions.notify("Your Essentia reserve is insufficient to weave this configuration.", "error");
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

        await window.appActions.castPatternSpell(pcId, castConfig);

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
