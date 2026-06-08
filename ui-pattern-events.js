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

    // Helper function for notifications
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
        const EFFECT_TOOLTIPS_LOCAL = {
            range: "Dictates the maximum distance at which you can weave this magic.",
            duration: "The length of time the physical ripples of your magic persist.<br><br><div class='bg-amber-900/40 border border-amber-500/50 p-2 rounded-sm text-[10px]'><strong class='text-amber-400 block mb-1'>The Rule of Cost:</strong> The more beneficial the timing is to your spell's intent, the higher the Essentia cost will be.</div><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Shorter is Better (Default):</b> Used when a sudden impact is the goal. <i>(e.g., an instantaneous fireball costs 5E, but a slow, delayed blast costs less)</i>.</li><li><b>Longer is Better (Toggle):</b> Used for buffs, debuffs, or utility where maintaining the effect over time is the goal. <i>(e.g., flying for 8 hours costs 5E, but flying for 1 round costs 2E)</i>.</li></ul>",
            activation: "The action economy and time required to cast the spell.",
            areaTargets: "The physical space or number of entities encompassed by the spell.",
            damageHealing: "The raw force, elemental energy, or restorative life woven into the spell.",
            augmentia: "Alterations to physical laws, matter, or environmental properties.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>V5 Benchmark Examples</strong><ul class='space-y-1.5 text-[11px] mt-2'><li><b>Minor (+1):</b> Water Breathing, Feather Fall, Jump, detecting magic</li><li><b>Weak (+2):</b> Alter Self (minor physical changes), Longstrider, Spider Climb</li><li><b>Moderate (+3):</b> Fly, Haste, Slow, Gaseous Form, Water Walk</li><li><b>Strong (+4):</b> Alter Self (significant physical changes), Teleportation</li><li><b>Major (+5):</b> True Polymorph, Teleport, Plane Shift, Time Stop</li></ul></div>",
            bolsterHinder: "Direct enhancements or supernatural penalties applied to checks and saves.<br><br><div class='bg-stone-900/60 border border-stone-600 p-2 rounded-sm mt-2'><strong class='text-stone-300 block border-b border-stone-700 pb-1 mb-1 text-[10px] uppercase tracking-widest'>Target Options by Tier</strong><ul class='space-y-1 text-[11px] mt-2'><li><b>Minor (+1):</b> Skill check</li><li><b>Weak (+2):</b> Skill check, saving throw, ability check</li><li><b>Moderate (+3):</b> Skill check, saving throw, ability check, attack roll</li><li><b>Strong (+4):</b> Skill, saving throw, ability check, attack roll, damage roll</li><li><b>Major (+5):</b> Skill, saving throw, ability check, attack roll, damage roll, AC</li></ul></div>"
        };


        const effectData = PATTERN_CONFIG.Effects[category];
        const tooltipText = EFFECT_TOOLTIPS_LOCAL[category] || effectData.description || '';
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
        
        // 1. ANIMATE THE LOOM
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
        
        // 2. UPDATE FORMS & METRICS (No page reload)
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
                    // FIX: Allow 0 since index 0 represents the default Tier 1
                    if (data.mandatory && (draft.effectTiers[cat] === undefined || draft.effectTiers[cat] < 0)) {
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

        // Verify that draft configuration meets limit boundaries before saving!
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

        // Check mandatory tiers before allowing Rote to save
        for (const [cat, data] of Object.entries(PATTERN_CONFIG.Effects)) {
            // FIX: Allow 0 since index 0 represents the default Tier 1
            if (data.mandatory && (draft.effectTiers[cat] === undefined || draft.effectTiers[cat] < 0)) {
                showNotification("All Mandatory spell parameters (Range, Duration, Activation Time, Area/Targets) must be defined before scribing.", "error");
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
