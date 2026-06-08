import { reRender } from './state.js';
import { 
    PATTERN_CONFIG, 
    getOrInitPatternState, 
    saveRote, 
    deleteRote, 
    castPatternSpell 
} from './actions-pattern-magic.js';
import { 
    PATTERN_THEME, 
    PATTERN_ASSET_BASE_URL, 
    getOrInitDraftState, 
    calculateAffinityLimitsAndCosts, 
    buildEffectsHTML 
} from './ui-pattern-utils.js';

// =========================================================================
// UI EVENT BINDINGS & ACTIONS (Seamless Updates bypassing reRender)
// =========================================================================
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};

    const showNotification = (message, type = 'info') => {
        if (window.appActions && typeof window.appActions.notify === 'function') {
            window.appActions.notify(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
            console.warn(`Notify missing in appActions. Fallback alert triggered: ${message}`);
        }
    };

    // --- GRIMOIRE GUIDE (TUTORIAL) MODAL ---
    window.appActions.openWeavingGuideModal = () => {
        // [Unchanged guide HTML to save space, assuming it worked perfectly]
        const modalHtml = `
            <div id="weaving-guide-overlay" class="fixed inset-0 bg-slate-950/80 z-[35000] flex items-center justify-center p-4 backdrop-blur-sm" onclick="window.appActions.closeWeavingGuideModal()">
                <div class="parchment-panel max-w-2xl w-full rounded-sm shadow-2xl relative border-2 border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]" onclick="event.stopPropagation()">
                    <div class="h-2 w-full bg-amber-500 shrink-0"></div>
                    <button type="button" onclick="window.appActions.closeWeavingGuideModal()" class="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors bg-white/60 rounded-full w-8 h-8 flex items-center justify-center border border-[#d4c5a9] z-50 shadow-sm"><i class="fa-solid fa-xmark"></i></button>
                    <div class="p-5 sm:p-6 bg-slate-900 border-b border-[#d4c5a9] flex justify-between items-center text-amber-50 shrink-0">
                        <h2 class="text-xl font-black font-serif text-amber-400 tracking-wide flex items-center"><i class="fa-solid fa-graduation-cap mr-3 text-amber-500"></i> Grimoire of Weaving</h2>
                        <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 hidden sm:block">A Guide to Pattern Magic</span>
                    </div>
                    <div class="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7]">
                        <div id="guide-page-1" class="guide-page">
                            <h3 class="text-lg font-serif font-bold text-slate-900 border-b border-[#d4c5a9] pb-1.5 mb-4">Step 1: The Loom & Patterns</h3>
                            <p class="text-sm text-slate-700 font-serif leading-relaxed mb-4">The core of this magic system revolves around <b>Patterns</b>. Each Pattern governs a fundamental aspect of existence (Space, Time, Energy, Mind, etc.). You must select which Patterns you are weaving together to form a spell.</p>
                            <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-4">
                                <h4 class="font-bold text-amber-700 text-xs uppercase tracking-widest mb-2"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i> The Prime Pattern</h4>
                                <p class="text-xs text-slate-700 leading-relaxed font-serif">The very first Pattern you select is considered the <b>Prime Pattern</b>. This is the foundational concept of your spell, and it is the only Pattern that can be pushed to its absolute limits. <br><br>Any additional Patterns you select are considered <b>Support Patterns</b>, lending their influence but in a more controlled manner.</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-between items-center shrink-0 text-center">
                        <button type="button" onclick="window.appActions.closeWeavingGuideModal()" class="px-6 py-2 bg-slate-900 text-amber-50 hover:bg-slate-800 transition text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md mx-auto">Close Guide</button>
                    </div>
                </div>
            </div>
        `;
        const container = document.getElementById('pattern-info-modal-container');
        if (container) {
            container.innerHTML = modalHtml;
        }
    };

    window.appActions.closeWeavingGuideModal = () => {
        const container = document.getElementById('pattern-info-modal-container');
        if (container) container.innerHTML = '';
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
            secondaryHtml = configAff.secondary.map(p => `<span class="bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">${PATTERN_CONFIG.Effects[p]?.name || p}</span>`).join(' ');
        }
        
        const dmgHtml = dmgTypes.map(d => `<span class="bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">${d}</span>`).join(' ');

        const modalHtml = `
            <div id="pattern-info-overlay" class="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onclick="window.appActions.closePatternInfoModal()">
                <div class="parchment-panel max-w-md w-full rounded-sm shadow-2xl relative border-2 border-[#d4c5a9] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="h-2 w-full" style="background-color: ${theme.color}; box-shadow: 0 0 10px ${theme.color};"></div>
                    <button type="button" onclick="window.appActions.closePatternInfoModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors bg-white/50 rounded-full w-8 h-8 flex items-center justify-center border border-[#d4c5a9]">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="p-6 sm:p-8">
                        <div class="flex items-center gap-5 mb-6 border-b border-[#d4c5a9] pb-5">
                            <div class="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center shadow-inner border-2" style="border-color: ${theme.color}; box-shadow: 0 0 20px ${theme.color}40 inset;">
                                <img src="${PATTERN_ASSET_BASE_URL}${patternKey}.webp" alt="${theme.label}" class="w-12 h-12 object-contain" style="filter: brightness(1.5) drop-shadow(0 0 8px ${theme.color});" onerror="this.style.display='none';">
                            </div>
                            <div>
                                <h2 class="text-3xl font-black font-serif text-slate-900 tracking-wide">${theme.label}</h2>
                                <p class="text-[11px] font-bold uppercase tracking-widest" style="color: ${theme.color}; filter: brightness(0.8);">${theme.desc} • <span class="text-slate-500">${titleText}</span></p>
                            </div>
                        </div>
                        <div class="space-y-5">
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i> Primary Affinities</h4>
                                <div class="flex flex-wrap gap-2">${primaryHtml || '<span class="text-xs text-slate-400 italic">None</span>'}</div>
                                <p class="text-[10px] text-slate-500 italic mt-1 font-serif leading-tight">These effect categories scale directly with your Rank + 1 (Max Tier 5).</p>
                            </div>
                            <div>
                                <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center"><i class="fa-regular fa-star text-amber-500 mr-1.5"></i> Secondary Affinities</h4>
                                <div class="flex flex-wrap gap-2">${secondaryHtml || '<span class="text-xs text-slate-400 italic">None</span>'}</div>
                                <p class="text-[10px] text-slate-500 italic mt-1 font-serif leading-tight">These effect categories scale perfectly equal to your Rank.</p>
                            </div>
                            ${dmgHtml ? `
                            <div class="bg-red-50/50 p-3 rounded-sm border border-red-100">
                                <h4 class="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-2 flex items-center"><i class="fa-solid fa-bolt text-red-600 mr-1.5"></i> Associated Energy</h4>
                                <div class="flex flex-wrap gap-2">${dmgHtml}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="bg-slate-100 p-4 border-t border-[#d4c5a9] text-center">
                        <button type="button" onclick="window.appActions.closePatternInfoModal()" class="px-6 py-2 bg-slate-900 text-amber-50 hover:bg-slate-800 transition text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md">Close Grimoire</button>
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

    // VIBRANT LOOM ANIMATION UPDATER
    window.appActions.refreshTapestryUI = (forcedPmState = null) => {
        const camp = window.appData.activeCampaign;
        const activePcId = window.appData.activePatternPcId || (camp.playerCharacters && camp.playerCharacters.find(p => p.playerId === window.appData.currentUserUid)?.id) || '';
        const activePc = camp.playerCharacters && camp.playerCharacters.find(p => p.id === activePcId);
        if (!activePc) return;
        
        const pm = forcedPmState || getOrInitPatternState(activePc);
        const draft = getOrInitDraftState();
        const primary = draft.patterns[0] || null;
        const supports = draft.patterns.slice(1);
        
        const radius = 105;
        const patternsList = Object.keys(PATTERN_THEME);
        
        // 1. ANIMATE THE LOOM WITH ILLUMINATED SIGILS
        if (!primary) {
            patternsList.forEach((key, index) => {
                const angleDeg = index * (360 / 9) - 90;
                const btn = document.getElementById(`sigil-btn-${key}`);
                const theme = PATTERN_THEME[key];
                if (btn) {
                    btn.classList.remove('pulse-prime-sigil', 'loom-entrance');
                    btn.style.transform = `rotate(${angleDeg}deg) translateX(${radius}px) rotate(${-angleDeg}deg) scale(1)`;
                    btn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-20 opacity-60 hover:opacity-100 hover:z-[100] group';
                    const img = btn.querySelector('img');
                    // Base illumination so they are visible on dark background
                    if(img) img.style.filter = `brightness(1.5) drop-shadow(0 0 4px ${theme.color}80)`;
                }
            });
        } else {
            const orbitsList = patternsList.filter(k => k !== primary);
            
            // Primary Sigil glides to center and pulses intensely
            const primeBtn = document.getElementById(`sigil-btn-${primary}`);
            if (primeBtn) {
                primeBtn.style.transform = `rotate(-90deg) translateX(12px) rotate(90deg) scale(1.4)`;
                const theme = PATTERN_THEME[primary];
                primeBtn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-[100] opacity-100 pulse-prime-sigil group';
                const img = primeBtn.querySelector('img');
                // Color is applied via CSS keyframes for the pulse, but we set a fallback here
                if(img) img.style.filter = `brightness(1.6) drop-shadow(0 0 15px ${theme.color})`;
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
                        if(img) img.style.filter = `brightness(1.5) drop-shadow(0 0 10px ${theme.color})`;
                    } else {
                        btn.className = 'sigil-btn absolute w-24 h-24 flex flex-col items-center justify-center cursor-pointer z-10 hover:z-[100] opacity-40 hover:opacity-100 group';
                        if(img) img.style.filter = `brightness(1.2) drop-shadow(0 0 2px ${theme.color}40)`;
                    }
                }
            });
        }
        
        // 2. UPDATE FORMS & METRICS
        const metrics = calculateAffinityLimitsAndCosts(activePc, pm, draft);
        const formsContainer = document.getElementById('effects-scaffolding-container');
        if (formsContainer) {
            formsContainer.innerHTML = buildEffectsHTML(metrics, draft, pm, activePc);
        }
        
        const costEl = document.getElementById('tapestry-cost-out');
        if (costEl) {
            if (draft.isRote) {
                costEl.innerHTML = `<span class="line-through text-slate-500 text-2xl mr-2">${metrics.totalBaseCost}</span>${metrics.finalCost}`;
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
            if (index > -1) {
                draft.patterns.splice(index, 1);
            } else {
                draft.patterns.push(patternKey);
            }
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

    window.appActions.memorizeCurrentDraftAsRote = async (pcId) => {
        const nameInput = document.getElementById('input-rote-memorize-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            showNotification("Your Grimoire requires a name for this Rote before scribing.", "error");
            return;
        }

        const draft = getOrInitDraftState();
        if (draft.patterns.length === 0) {
            showNotification("Weave threads on the Loom to configure a spell before saving.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        const pc = camp && camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
        if (!pc) return;

        const pm = getOrInitPatternState(pc);
        const metrics = calculateAffinityLimitsAndCosts(pc, pm, draft);

        let exceeds = false;
        Object.keys(PATTERN_CONFIG.Effects).forEach(cat => {
            if ((draft.effectTiers[cat] || 0) > metrics.limits[cat]) exceeds = true;
        });

        if (exceeds) {
            showNotification("You cannot scribe a Rote containing elements that exceed your attuned Pattern Ranks.", "error");
            return;
        }

        for (const [cat, data] of Object.entries(PATTERN_CONFIG.Effects)) {
            if (data.mandatory && (draft.effectTiers[cat] || 0) === 0) {
                showNotification("All Mandatory spell parameters (Range, Duration, Activation Time, Area/Targets) must be defined before scribing.", "error");
                return;
            }
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

        const success = await saveRote(pcId, rotePayload);
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

        window.appActions.refreshTapestryUI(); 
        
        const draftNameEl = document.getElementById('draft-spell-name');
        if (draftNameEl) draftNameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            showNotification("A Primary Thread must be woven into the Loom before unleashing magic.", "error");
            return;
        }

        const camp = window.appData.activeCampaign;
        const pc = camp && camp.playerCharacters && camp.playerCharacters.find(p => p.id === pcId);
        if (!pc) return;

        const pm = getOrInitPatternState(pc);
        const metrics = calculateAffinityLimitsAndCosts(pc, pm, draft);

        if (pm.essentia < metrics.finalCost) {
            showNotification("Your Essentia Reservoir lacks the fuel required to weave this Pattern.", "error");
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
}
