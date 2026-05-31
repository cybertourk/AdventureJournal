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
// ZEB: UPDATE THIS URL TO POINT DIRECTLY TO YOUR GITHUB FOLDER!
// Example: "https://raw.githubusercontent.com/YourName/YourRepo/main/"
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
        .loom-circle {
            background: radial-gradient(circle, rgba(28,25,23,0.8) 0%, rgba(41,37,36,0.95) 100%);
            box-shadow: inset 0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(217, 119, 6, 0.15);
            border: 2px solid #78350f;
        }
        .sigil-glow {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .spin-loom-slow {
            animation: spinLoom 40s linear infinite;
        }
        @keyframes spinLoom {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .pulse-prime-sigil {
            animation: pulsePrimeSigil 3s ease-in-out infinite alternate;
        }
        @keyframes pulsePrimeSigil {
            0% { box-shadow: 0 0 15px rgba(217, 119, 6, 0.4), inset 0 0 10px rgba(217, 119, 6, 0.4); border-color: #d97706; }
            100% { box-shadow: 0 0 35px rgba(217, 119, 6, 0.8), inset 0 0 20px rgba(217, 119, 6, 0.6); border-color: #f59e0b; }
        }
        .pulse-support-sigil {
            animation: pulseSupportSigil 4s ease-in-out infinite alternate;
        }
        @keyframes pulseSupportSigil {
            0% { box-shadow: 0 0 5px currentColor, inset 0 0 5px currentColor; }
            100% { box-shadow: 0 0 15px currentColor, inset 0 0 10px currentColor; }
        }
    `;
    document.head.appendChild(style);
};

// Map each of the 9 magical disciplines to its rich, esoteric dye/ink color
const PATTERN_THEME = {
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
// Loom of Reality Engine & Dynamic Renderer
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
        // State A: No Primary selected. Render all 9 threads equidistant in an outer circle.
        patternsList.forEach((key, index) => {
            const angle = (index * (360 / 9) - 90) * (Math.PI / 180);
            const x = cx + radius * Math.cos(angle) - 24; // offset by half button width (48px)
            const y = cy + radius * Math.sin(angle) - 24;
            const theme = PATTERN_THEME[key];
            const rank = pm[key] || 0;

            wheelNodesHtml += `
                <button type="button" 
                        onclick="window.appActions.toggleWheelPattern('${key}')"
                        style="left: ${x}px; top: ${y}px; border-color: ${theme.color}60; color: ${theme.color};"
                        class="absolute w-12 h-12 rounded-full border-2 bg-[#1c1917] flex flex-col items-center justify-center text-stone-400 hover:scale-110 hover:shadow-[0_0_15px_currentColor] sigil-glow z-20 hover:z-[100] group">
                    
                    <img src="${PATTERN_ASSET_BASE_URL}${key}.webp" alt="${theme.label}" class="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity" style="filter: drop-shadow(0 0 3px ${theme.color});" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span class="hidden text-[10px] font-serif font-bold tracking-widest leading-none drop-shadow-md text-stone-300 group-hover:text-white" style="color: ${theme.color};">${key.substring(0,3).toUpperCase()}</span>
                    
                    <span class="text-[9px] font-black leading-none mt-1 text-stone-500">${rank}</span>
                    <!-- Dynamic Tooltip -->
                    <span class="absolute hidden group-hover:block bottom-14 bg-[#292524] border border-[#d4c5a9] text-[10px] px-3 py-1.5 rounded-sm text-[#f4ebd8] font-serif tracking-wide whitespace-nowrap shadow-xl z-50">
                        <i class="fa-solid fa-star mr-1" style="color:${theme.color};"></i> ${theme.label} (Rank ${rank})
                    </span>
                </button>
            `;
        });
    } else {
        // State B: Primary Selected. Sits perfectly in the center. Others form an 8-node orbit.
        const orbitsList = patternsList.filter(k => k !== primary);
        
        // Render Primary Sigil in center
        const primeTheme = PATTERN_THEME[primary];
        const primeRank = pm[primary] || 0;
        const primeFlashClass = isConvergence ? 'pulse-prime-sigil scale-110' : 'pulse-prime-sigil';

        wheelNodesHtml += `
            <button type="button"
                    onclick="window.appActions.toggleWheelPattern('${primary}')"
                    style="left: calc(50% - 32px); top: calc(50% - 32px); background-color: ${primeTheme.color}20;"
                    class="absolute w-16 h-16 rounded-full border-2 bg-[#1c1917] flex flex-col items-center justify-center text-white ${primeFlashClass} sigil-glow z-30 hover:z-[100] group">
                
                <img src="${PATTERN_ASSET_BASE_URL}${primary}.webp" alt="${primeTheme.label}" class="w-10 h-10 object-contain drop-shadow-lg" style="filter: drop-shadow(0 0 5px ${primeTheme.color});" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="hidden text-xs font-serif font-black tracking-widest drop-shadow-lg" style="color: ${primeTheme.color};">${primary.substring(0,4).toUpperCase()}</span>
                
                <span class="text-[10px] font-black leading-none mt-1 text-stone-200">${primeRank}</span>
                <span class="absolute hidden group-hover:block bottom-20 bg-[#292524] border-2 border-amber-600 text-[10px] px-3 py-1.5 rounded-sm text-amber-400 font-serif font-bold tracking-widest uppercase pointer-events-none whitespace-nowrap shadow-xl z-50">
                    Primary Thread: ${primeTheme.label}
                </span>
            </button>
        `;

        // Render remaining 8 orbiting sigils
        orbitsList.forEach((key, index) => {
            const angle = (index * (360 / 8) - 90) * (Math.PI / 180);
            const x = cx + radius * Math.cos(angle) - 22; // half of 44px
            const y = cy + radius * Math.sin(angle) - 22;
            const theme = PATTERN_THEME[key];
            const rank = pm[key] || 0;

            const isSupported = supports.includes(key);
            let borderStyle = `border-color: ${theme.color}40; color: ${theme.color};`;
            let glowClass = 'text-stone-500 bg-[#1c1917] hover:scale-110 hover:shadow-[0_0_10px_currentColor]';
            let imgOpacity = 'opacity-50 group-hover:opacity-80';
            
            if (isSupported) {
                borderStyle = `border-color: ${theme.color}; color: ${theme.color};`;
                glowClass = 'text-stone-100 bg-[#292524] pulse-support-sigil scale-105';
                imgOpacity = 'opacity-100';
            }

            wheelNodesHtml += `
                <button type="button"
                        onclick="window.appActions.toggleWheelPattern('${key}')"
                        style="left: ${x}px; top: ${y}px; ${borderStyle}"
                        class="absolute w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center sigil-glow z-20 hover:z-[100] group ${glowClass}">
                    
                    <img src="${PATTERN_ASSET_BASE_URL}${key}.webp" alt="${theme.label}" class="w-5 h-5 object-contain transition-opacity ${imgOpacity}" style="filter: drop-shadow(0 0 2px ${theme.color});" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span class="hidden text-[9px] font-serif font-bold tracking-widest leading-none drop-shadow-md text-stone-300 group-hover:text-white" style="color: ${theme.color};">${key.substring(0,3).toUpperCase()}</span>
                    
                    <span class="text-[8px] font-black leading-none mt-1 opacity-70">${rank}</span>
                    <span class="absolute hidden group-hover:block bottom-14 bg-[#292524] border border-[#d4c5a9] text-[10px] px-3 py-1.5 rounded-sm text-[#f4ebd8] font-serif tracking-wide whitespace-nowrap shadow-xl z-50">
                        <i class="fa-solid ${isSupported ? 'fa-link' : 'fa-star'} mr-1" style="color:${theme.color};"></i> ${theme.label} ${isSupported ? '(Support)' : ''}
                    </span>
                </button>
            `;
        });
    }

    const convergenceSpinClass = isConvergence ? 'spin-loom-slow' : '';

    return `
    <div class="relative w-[320px] h-[320px] rounded-full flex items-center justify-center p-4 mx-auto mb-6 shrink-0 loom-circle">
        <!-- SVG Loom Threads in Background -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none ${convergenceSpinClass}" viewBox="0 0 320 320">
            <!-- Outer binding ring -->
            <circle cx="160" cy="160" r="105" fill="none" stroke="#b45309" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.4" />
            <!-- Inner focus ring -->
            <circle cx="160" cy="160" r="60" fill="none" stroke="#d4c5a9" stroke-width="1" opacity="0.2" />
            
            ${primary ? Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * (360 / 8) - 90) * (Math.PI / 180);
                const x2 = 160 + radius * Math.cos(angle);
                const y2 = 160 + radius * Math.sin(angle);
                return `<line x1="160" y1="160" x2="${x2}" y2="${y2}" stroke="#d4c5a9" stroke-width="1" stroke-dasharray="2 4" opacity="0.3" />`;
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
        let activeAffText = 'Restricted (Tier 0)';

        if (primary) {
            const primaryAff = PATTERN_CONFIG.Affinities[primary];
            const primaryRank = pm[primary] || 0;

            if (primaryAff.primary.includes(category)) {
                // Primary Affinity: Rank + 1 (capped at 5)
                maxTier = Math.min(5, primaryRank + 1);
                activeAffText = `Primary Alignment (Max Tier ${maxTier})`;
            } else if (primaryAff.secondary.includes(category)) {
                // Secondary Affinity: Equals Rank
                maxTier = primaryRank;
                activeAffText = `Secondary Alignment (Max Tier ${maxTier})`;
            }

            // Check supporting elements
            supports.forEach(supPattern => {
                const supAff = PATTERN_CONFIG.Affinities[supPattern];
                const supRank = pm[supPattern] || 0;

                if (supAff.primary.includes(category) || supAff.secondary.includes(category)) {
                    if (supRank > maxTier) {
                        maxTier = supRank;
                        activeAffText = `Supported by ${PATTERN_THEME[supPattern].label} (Max Tier ${maxTier})`;
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
// Main Pattern Tapestry HTML Render
// =========================================================================
export function getPatternNexusHTML(state) {
    injectTapestryStyles();
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
    const draft = getOrInitDraftState();

    // Verify unlocked state or DM overrides
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

    // Character Switching Interface
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

    // Calculate maximum Essentia
    const totalRanks = Object.keys(PATTERN_CONFIG.PatternAttributes).reduce((sum, key) => sum + (pm[key] || 0), 0);
    const maxEssentia = totalRanks * 4;

    // Build Essentia Gem Gauge
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
        
        // --- DAMAGE & HEALING CONFIGURATOR ---
        if (category === 'damageHealing' && activeTier > 0) {
            // ELEMENT FILTER: Scan active patterns to only allow elemental types they align with
            const activePatterns = draft.patterns;
            let allowedTypes = ['force']; // Base element
            activePatterns.forEach(pat => {
                const types = PATTERN_CONFIG.DamageTypesByPattern[pat] || [];
                types.forEach(t => { if (!allowedTypes.includes(t)) allowedTypes.push(t); });
            });

            // Always ensure healing is available if vitar is present
            if (activePatterns.includes('vitar') && !allowedTypes.includes('healing')) {
                allowedTypes.push('healing');
            }

            optionsSelectHtml = `
                <div class="mt-2.5 flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-sm border border-[#d4c5a9] shadow-inner">
                    <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest"><i class="fa-solid fa-bolt mr-1.5 text-amber-600"></i> Energy Type:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.damageType', this.value)" class="bg-white border border-[#d4c5a9] rounded-sm text-stone-900 text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm capitalize hover:border-amber-400 transition-colors cursor-pointer">
                        ${allowedTypes.map(t => `<option value="${t}" ${draft.effectTiers.damageType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        // --- BOLSTER & HINDER CONFIGURATOR ---
        if (category === 'bolsterHinder' && activeTier > 0) {
            const allowedOptions = effectData.tiers[activeTier].options || ['Skill Check'];
            optionsSelectHtml = `
                <div class="mt-2.5 flex items-center gap-2 bg-stone-100 px-3 py-2 rounded-sm border border-[#d4c5a9] shadow-inner">
                    <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest"><i class="fa-solid fa-shield-halved mr-1.5 text-amber-600"></i> Target:</span>
                    <select onchange="window.appActions.updateDraftField('effectTiers.bolsterHinderTarget', this.value)" class="bg-white border border-[#d4c5a9] rounded-sm text-stone-900 text-xs font-bold font-serif outline-none p-1 flex-grow shadow-sm hover:border-amber-400 transition-colors cursor-pointer">
                        ${allowedOptions.map(opt => `<option value="${opt}" ${draft.effectTiers.bolsterHinderTarget === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        // --- AUGMENTIA EXAMPLES CONFIGURATOR ---
        if (category === 'augmentia' && activeTier > 0) {
            const examples = effectData.tiers[activeTier].examples || [];
            let exampleOptionsHtml = '<option value="">-- Select an Example --</option>';
            
            if (examples.length > 0) {
                examples.forEach(ex => {
                    const sanitizedTip = (ex.tip || '').replace(/"/g, '&quot;');
                    exampleOptionsHtml += `<option value="${ex.name}" title="${sanitizedTip}">${ex.name}</option>`;
                });
                
                optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-2 bg-stone-100 px-3 py-2.5 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center"><i class="fa-solid fa-lightbulb mr-1.5 text-amber-500"></i> Known Alterations</span>
                            <select onchange="document.getElementById('draft-aug-custom-${activeTier}').value = this.value; window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value);" class="w-full bg-white border border-[#d4c5a9] rounded-sm p-1.5 text-xs text-stone-900 outline-none font-serif shadow-sm cursor-pointer hover:border-amber-400 transition-colors">
                                ${exampleOptionsHtml}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1 mt-1 border-t border-[#d4c5a9] pt-2">
                            <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Custom Effect Detail</span>
                            <input type="text" 
                                   id="draft-aug-custom-${activeTier}"
                                   oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false)" 
                                   value="${draft.effectTiers.augmentiaCustom || ''}" 
                                   placeholder="Or describe a custom alteration..." 
                                   class="w-full bg-white border border-[#d4c5a9] rounded-sm p-2 text-xs text-stone-900 outline-none font-serif shadow-sm focus:border-amber-600 transition-colors">
                        </div>
                    </div>
                `;
            } else {
                 optionsSelectHtml = `
                    <div class="mt-2.5 flex flex-col gap-1.5 bg-stone-100 px-3 py-2 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Custom Effect Detail:</span>
                        <input type="text" 
                               oninput="window.appActions.updateDraftField('effectTiers.augmentiaCustom', this.value, false)" 
                               value="${draft.effectTiers.augmentiaCustom || ''}" 
                               placeholder="Describe the alteration..." 
                               class="w-full bg-white border border-[#d4c5a9] rounded-sm p-2 text-xs text-stone-900 outline-none font-serif shadow-sm focus:border-amber-600 transition-colors">
                    </div>
                `;
            }
        }

        // Add special custom duration inverted checkbox toggle
        let specialToggleHtml = '';
        if (category === 'duration') {
            specialToggleHtml = `
                <label class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600 cursor-pointer select-none hover:text-amber-700 transition-colors">
                    <input type="checkbox" 
                           onchange="window.appActions.toggleDurationInversion(this.checked)" 
                           ${draft.effectTiers.durationInverted ? 'checked' : ''} 
                           class="w-4 h-4 text-amber-600 bg-white border-stone-400 rounded-sm focus:ring-amber-500 shadow-sm cursor-pointer">
                    <span>Longer is Better</span>
                </label>
            `;
        }

        // Tier options selector
        let tierButtonsHtml = '';
        tiersList.forEach((tier, index) => {
            const isDisabled = index > maxTierAllowed;
            const isSelected = activeTier === index;
            
            let btnClass = 'border-[#d4c5a9] bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-white hover:border-amber-400 shadow-sm';
            if (isDisabled) {
                btnClass = 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed shadow-none';
            } else if (isSelected) {
                btnClass = 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-[0_0_8px_rgba(217,119,6,0.2)]';
            }

            tierButtonsHtml += `
                <button type="button" 
                        ${isDisabled ? 'disabled' : ''} 
                        onclick="window.appActions.setEffectTier('${category}', ${index})"
                        class="px-2.5 py-2 border rounded-sm text-[11px] text-left transition-all leading-snug flex justify-between items-center font-serif ${btnClass}">
                    <span>T${index}: ${tier.text}</span>
                    <span class="font-sans text-[10px] font-bold opacity-70">+${tier.cost} E</span>
                </button>
            `;
        });

        const labelColorClass = maxTierAllowed > 0 ? 'text-stone-900' : 'text-stone-500';
        const subtextColorClass = maxTierAllowed > 0 ? 'text-amber-700' : 'text-stone-400';

        effectsConfigurationHtml += `
            <div class="p-4 bg-white border border-[#d4c5a9] rounded-sm shadow-sm">
                <div class="flex justify-between items-start mb-3 gap-2 flex-wrap border-b border-[#d4c5a9] pb-2">
                    <div>
                        <h4 class="text-sm font-bold font-serif ${labelColorClass}">${labelText}</h4>
                        <span class="text-[9px] font-sans uppercase font-bold tracking-widest ${subtextColorClass}">${subtext}</span>
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

    // Rotes List Sidebar (Grimoire Styling)
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
                    const listDisplay = r.patterns.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');

                    return `
                    <div class="p-3 border rounded-sm ${selectBorder} flex flex-col gap-2 transition cursor-pointer" onclick="window.appActions.loadRoteToDraft('${r.id}')">
                        <div class="flex justify-between items-start border-b border-[#d4c5a9] pb-1.5">
                            <h5 class="text-sm font-bold text-stone-900 font-serif leading-tight">
                                <i class="fa-solid fa-scroll ${isSelected ? 'text-amber-600' : 'text-stone-400'} mr-1"></i> ${r.name}
                            </h5>
                            <button type="button" onclick="event.stopPropagation(); window.appActions.deleteRote('${activePc.id}', '${r.id}')" class="text-stone-400 hover:text-red-700 transition px-1" title="Erase Rote">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            <span>${listDisplay}</span>
                            <span class="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-sm border border-amber-200 shadow-sm">${r.essentiaCost} E</span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Ability casting selector (Vertically stacked to fit panel bounds cleanly)
    const abilitySelectorHtml = `
        <div class="w-full">
            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Attuned Attribute</label>
            <select onchange="window.appActions.updateDraftField('ability', this.value)" class="w-full bg-white border border-[#d4c5a9] rounded-sm p-2.5 text-sm text-stone-900 font-bold font-sans outline-none shadow-sm focus:border-amber-600 transition-colors cursor-pointer uppercase tracking-wider">
                <option value="int" ${draft.ability === 'int' ? 'selected' : ''}>Intelligence (${activePc.int || 10})</option>
                <option value="wis" ${draft.ability === 'wis' ? 'selected' : ''}>Wisdom (${activePc.wis || 10})</option>
                <option value="cha" ${draft.ability === 'cha' ? 'selected' : ''}>Charisma (${activePc.cha || 10})</option>
            </select>
        </div>
    `;

    // DM Administration View
    let dmAdministrationPanelHtml = '';
    if (isDM) {
        dmAdministrationPanelHtml = `
            <!-- DM Administration Layer -->
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
        <div class="max-w-6xl mx-auto">
            
            <!-- Header Block -->
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

            <!-- DM Configuration Overseer Area -->
            ${dmAdministrationPanelHtml}

            <!-- Main Layout Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                <!-- Left Panel: Tapestry Loom & Attunement -->
                <div class="lg:col-span-5 space-y-6">
                    
                    <!-- Circular SVG Loom Widget -->
                    <div class="p-6 parchment-panel rounded-sm relative">
                        <h3 class="text-sm font-bold text-amber-900 uppercase tracking-widest font-serif border-b border-[#d4c5a9] pb-2 mb-6 text-center"><i class="fa-solid fa-dharmachakra mr-1.5 text-amber-600"></i> The Loom of Reality</h3>
                        
                        ${renderSpellWheelHTML(activePc, pm, draft)}

                        <div class="p-4 bg-stone-50 border border-[#d4c5a9] rounded-sm text-center text-xs text-stone-600 shadow-inner">
                            <p class="font-serif leading-relaxed italic">
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
                                <div class="flex items-center justify-between p-3 border rounded-sm ${focusClass} transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-3 h-3 rounded-full shadow-inner border border-black" style="background-color: ${theme.color};"></div>
                                        <div>
                                            <span class="text-xs font-bold text-stone-200 font-serif tracking-wide block leading-none mb-1">${theme.label}</span>
                                            <span class="text-[9px] text-stone-500 font-sans uppercase tracking-widest leading-none block">${theme.desc}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm font-serif font-bold text-stone-300 w-8 text-right">${val} / 5</span>
                                        ${canAdd ? `
                                            <button onclick="window.appActions.upgradePatternRank('${activePc.id}', '${key}')" class="px-2.5 py-1.5 bg-stone-700 hover:bg-emerald-700 text-stone-200 hover:text-white border border-stone-600 hover:border-emerald-600 rounded-sm transition-all text-[9px] font-bold uppercase tracking-wider shadow-md">
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
                                       oninput="window.appActions.updateDraftField('name', this.value, false)" 
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
                                      oninput="window.appActions.updateDraftField('description', this.value, false)" 
                                      placeholder="Describe the aesthetic and physical ripples of your magic..." 
                                      class="w-full bg-white border border-[#d4c5a9] rounded-sm p-3 text-sm text-stone-800 outline-none font-serif focus:border-amber-600 resize-y min-h-[80px] shadow-sm custom-scrollbar">${draft.description || ''}</textarea>
                        </div>

                        <!-- Active Effects Scaffolding -->
                        <div class="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            ${effectsConfigurationHtml}
                        </div>

                        <!-- Cost Outputs & Casting Trigger Card -->
                        <div class="p-5 bg-stone-900 text-stone-200 rounded-sm border-2 border-stone-800 shadow-xl relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-amber-600"></div>
                            
                            <div class="flex flex-wrap justify-between items-center gap-4 pl-3">
                                <div>
                                    <span class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Essentia Fuel Required</span>
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-droplet text-amber-500 text-xl"></i>
                                        <strong class="text-3xl font-black font-serif text-amber-400 drop-shadow-md">
                                            ${metrics.finalCost}
                                        </strong>
                                    </div>
                                    ${draft.isRote ? `<span class="inline-block mt-2 text-[9px] text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-2 py-1 rounded uppercase tracking-widest font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Rote Discount Applied</span>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Weaving Difficulty</span>
                                    <strong class="text-2xl font-black font-serif text-stone-100 bg-stone-800 px-4 py-2 rounded-sm border border-stone-600 shadow-inner">
                                        DC ${metrics.dc}
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
                                        onclick="window.appActions.castCurrentPatternSpell('${activePc.id}')"
                                        class="w-full py-3.5 bg-amber-700 text-stone-950 hover:bg-amber-600 transition-all text-sm font-black uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(217,119,6,0.3)] border border-amber-500 flex items-center justify-center gap-2 active:scale-95">
                                    <i class="fa-solid fa-burst text-lg animate-pulse"></i> Unleash the Pattern
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Memorized Rotes Bank (Grimoire) -->
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
    // NEW: added shouldRender = true, used by 'oninput' triggers so typing doesn't force a DOM reload!
    window.appActions.updateDraftField = (path, value, shouldRender = true) => {
        const draft = getOrInitDraftState();
        if (path.startsWith('effectTiers.')) {
            const field = path.split('.')[1];
            draft.effectTiers[field] = value;
        } else {
            draft[path] = value;
        }
        if (shouldRender) reRender(true);
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
