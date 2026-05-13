import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';
import { SCROLL_TABLES } from './data-roll-tables.js';

// ============================================================================
// --- 10. SCRIBING A SPELL SCROLL ---
// ============================================================================

// --- SPELL BROWSER ENGINE ---
let SPELL_CACHE = [];

const buildSpellCache = () => {
    if (SPELL_CACHE.length > 0) return;
    
    const levelMap = { 'cantrip': 0, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7, '8th': 8, '9th': 9 };
    const labelMap = { 'cantrip': 'Cantrip', '1st': '1st Level', '2nd': '2nd Level', '3rd': '3rd Level', '4th': '4th Level', '5th': '5th Level', '6th': '6th Level', '7th': '7th Level', '8th': '8th Level', '9th': '9th Level' };

    for (const [key, spells] of Object.entries(SCROLL_TABLES)) {
        const level = levelMap[key];
        const label = labelMap[key];
        spells.forEach(spell => {
            SPELL_CACHE.push({ name: spell, level, label });
        });
    }
    
    // Sort alphabetically for the UI
    SPELL_CACHE.sort((a, b) => a.name.localeCompare(b.name));
};

export const openScribingModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const isDM = camp._isDM;

    const validPCs = (camp.playerCharacters || []).filter(pc => isDM || pc.playerId === myUid);
    if (validPCs.length === 0) { notify("You must enroll a hero before taking downtime.", "error"); return; }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-blue-900 p-4 border-b-4 border-fuchsia-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-scroll mr-2 text-fuchsia-400"></i> Scribing a Spell Scroll</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Workflow Instructions -->
                    <div class="bg-fuchsia-900/5 border border-fuchsia-900/20 p-4 rounded-sm shadow-sm mb-5">
                        <h3 class="text-xs font-bold text-fuchsia-900 uppercase tracking-widest mb-2"><i class="fa-solid fa-clipboard-list mr-1.5 text-fuchsia-700"></i> Scribing Workflow</h3>
                        <ul class="text-[10px] sm:text-xs text-fuchsia-950 space-y-1.5 leading-snug font-serif">
                            <li><b>Step 1:</b> Select your <b>Hero</b>. You must be proficient in the Arcana skill to scribe a scroll.</li>
                            <li><b>Step 2:</b> You may either start a <b>New Project</b> or resume an <b>Active Project</b> from the dropdown.</li>
                            <li><b>Step 3:</b> Define the spell level and name. The gold cost covers ink and parchment, but you must provide any extra material components yourself.</li>
                            <li><b>Step 4:</b> Log your days! High-level scrolls take months to complete, so your progress will be safely banked until finished.</li>
                        </ul>
                    </div>

                    <!-- Basic Setup & Project Selection -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-scribe-pc" onchange="window.appActions.updateScribingMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-fuchsia-800 font-bold mb-1 tracking-widest"><i class="fa-solid fa-book-open mr-1"></i> Active Projects</label>
                            <div class="flex gap-2">
                                <select id="dt-scribe-project" onchange="window.appActions.updateScribingMath('project')" class="flex-grow p-2 border border-fuchsia-300 rounded-sm text-sm font-bold text-fuchsia-900 outline-none focus:border-fuchsia-600 bg-fuchsia-50 shadow-inner">
                                    <option value="new">-- Start New Project --</option>
                                    <!-- Populated dynamically via JS -->
                                </select>
                                <button type="button" id="dt-scribe-abandon-btn" onclick="window.appActions.abandonScribingProject()" class="hidden px-3 py-2 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 rounded-sm transition" title="Abandon Project"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- New Project Fields (Hidden if resuming) -->
                    <div id="dt-scribe-new-config" class="mb-5 bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm transition-all duration-300">
                        
                        <!-- SPELL BROWSER BUTTON -->
                        <div class="mb-4">
                            <button type="button" onclick="window.appActions.openSpellBrowser()" class="w-full py-2 bg-stone-100 text-stone-600 hover:bg-fuchsia-50 hover:text-fuchsia-700 hover:border-fuchsia-400 transition text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm border border-[#d4c5a9] flex items-center justify-center">
                                <i class="fa-solid fa-search mr-2"></i> Browse Spell List
                            </button>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Spell Level</label>
                                <select id="dt-scribe-level" onchange="window.appActions.updateScribingMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner">
                                    <option value="0">Cantrip (Level 0)</option>
                                    <option value="1" selected>1st Level</option>
                                    <option value="2">2nd Level</option>
                                    <option value="3">3rd Level</option>
                                    <option value="4">4th Level</option>
                                    <option value="5">5th Level</option>
                                    <option value="6">6th Level</option>
                                    <option value="7">7th Level</option>
                                    <option value="8">8th Level</option>
                                    <option value="9">9th Level</option>
                                </select>
                            </div>
                            <div class="flex items-end pb-2">
                                <label class="flex items-center gap-2 cursor-pointer group" title="Check this if a rival is present. It may affect complications.">
                                    <input type="checkbox" id="dt-scribe-rival" class="w-4 h-4 text-fuchsia-700 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                    <span class="text-[10px] font-bold uppercase tracking-widest text-stone-700 group-hover:text-fuchsia-900 transition">Rival Present?</span>
                                </label>
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Spell Name</label>
                            <input type="text" id="dt-scribe-spell-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Fireball">
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-[#d4c5a9]">
                            <input type="checkbox" id="dt-scribe-materials" class="w-4 h-4 text-fuchsia-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 cursor-pointer" for="dt-scribe-materials">Material Components Provided?</label>
                        </div>
                        <p class="text-[9px] text-stone-400 mt-1 italic leading-snug">You must provide any material components required by the spell in addition to the standard cost of the scroll.</p>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <div>
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Scope</span>
                                <span id="dt-scribe-progress-text" class="text-xs font-bold text-amber-200">0 / 0 Days Complete</span>
                            </div>
                            <div class="text-right">
                                <span id="dt-scribe-total-days" class="text-sm font-bold text-emerald-400 mr-3">1 Day</span>
                                <span id="dt-scribe-total-gold" class="text-sm font-bold text-amber-400">25 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Downtime to Spend <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-scribe-days-spent" value="1" min="1" oninput="window.appActions.updateScribingMath('input')" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Complication Risk</span>
                                <span id="dt-scribe-risk" class="text-xl font-bold text-red-500" title="10% risk per 5 work-days spent">10%</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Checked automatically</p>
                            </div>
                        </div>
                    </div>
                    <p id="dt-scribe-cost-warning" class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-scribe-submit-btn" onclick="window.appActions.executeScribing()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-scroll mr-2"></i> Log Scribing</button>
                </div>
            </div>
            
            <!-- SPELL BROWSER OVERLAY -->
            <div id="dt-scribe-spell-modal" class="hidden absolute inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                    <div class="bg-stone-900 p-3 sm:p-4 border-b-2 border-fuchsia-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                        <h3 class="text-base font-serif font-bold flex items-center"><i class="fa-solid fa-search mr-2 text-fuchsia-500"></i> Spell Browser</h3>
                        <button onclick="window.appActions.closeSpellBrowser()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <div class="p-4 sm:p-5 flex-grow flex flex-col min-h-0 bg-[#fdfbf7]">
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="dt-scribe-spell-search" placeholder="Search Spells..." class="flex-grow p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-600 bg-white shadow-inner" oninput="window.appActions.filterSpells()">
                            <select id="dt-scribe-spell-level-filter" class="w-1/3 p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-600 bg-white shadow-inner" onchange="window.appActions.filterSpells()">
                                <option value="all">All Levels</option>
                                <option value="0">Cantrip</option>
                                <option value="1">1st Level</option>
                                <option value="2">2nd Level</option>
                                <option value="3">3rd Level</option>
                                <option value="4">4th Level</option>
                                <option value="5">5th Level</option>
                                <option value="6">6th Level</option>
                                <option value="7">7th Level</option>
                                <option value="8">8th Level</option>
                                <option value="9">9th Level</option>
                            </select>
                        </div>
                        <div id="dt-scribe-spell-list" class="flex-grow overflow-y-auto custom-scrollbar space-y-1 border border-[#d4c5a9] rounded-sm p-1 bg-white shadow-inner">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // Initialize dynamic UI elements
    setTimeout(() => {
        window.appActions.updateScribingMath('init');
    }, 50);
};

export const openSpellBrowser = () => {
    buildSpellCache();
    const modal = document.getElementById('dt-scribe-spell-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const searchInput = document.getElementById('dt-scribe-spell-search');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
        }
        window.appActions.filterSpells(); 
    }
};

export const closeSpellBrowser = () => {
    const modal = document.getElementById('dt-scribe-spell-modal');
    if (modal) modal.classList.add('hidden');
};

export const filterSpells = () => {
    const searchInput = document.getElementById('dt-scribe-spell-search');
    const listEl = document.getElementById('dt-scribe-spell-list');
    const levelFilter = document.getElementById('dt-scribe-spell-level-filter')?.value || 'all';

    if (!searchInput || !listEl) return;
    
    const query = searchInput.value.toLowerCase().trim();
    
    const filtered = SPELL_CACHE.filter(s => {
        const matchName = s.name.toLowerCase().includes(query);
        const matchLevel = levelFilter === 'all' || s.level.toString() === levelFilter;
        return matchName && matchLevel;
    });
    
    if (filtered.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-stone-500 italic p-4 text-center">No spells found matching the criteria.</p>`;
        return;
    }

    let html = '';
    filtered.forEach(s => {
        // Escape apostrophes to prevent breaking the onclick handler
        const safeName = s.name.replace(/'/g, "\\'");
        
        html += `
            <div class="flex justify-between items-center p-2 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors cursor-pointer group" onclick="window.appActions.selectSpell('${safeName}', ${s.level})">
                <div class="min-w-0 pr-2">
                    <span class="font-bold text-stone-800 text-sm block truncate group-hover:text-fuchsia-700 transition-colors">${s.name}</span>
                    <span class="text-[9px] uppercase font-bold tracking-widest text-stone-500">${s.label}</span>
                </div>
                <button class="shrink-0 px-3 py-1.5 bg-stone-200 text-stone-700 rounded-sm text-[9px] font-bold uppercase tracking-wider group-hover:bg-stone-800 group-hover:text-amber-50 transition shadow-sm border border-[#d4c5a9] group-hover:border-stone-700">Select</button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

export const selectSpell = (name, level) => {
    window.appActions.closeSpellBrowser();
    
    const levelEl = document.getElementById('dt-scribe-level');
    if (levelEl) {
        levelEl.value = level;
        levelEl.disabled = true;
        levelEl.classList.add('bg-stone-200', 'text-stone-500');
        levelEl.classList.remove('bg-stone-50', 'text-stone-900');
    }
    
    const nameEl = document.getElementById('dt-scribe-spell-name');
    if (nameEl) {
        nameEl.value = name;
        nameEl.disabled = true;
        nameEl.classList.add('bg-stone-200', 'text-stone-500');
        nameEl.classList.remove('bg-stone-50', 'text-stone-900');
    }
    
    window.appActions.updateScribingMath('input');
};

export const updateScribingMath = (triggerSource = 'input') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-scribe-pc')?.value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectSelect = document.getElementById('dt-scribe-project');
    const newConfigDiv = document.getElementById('dt-scribe-new-config');
    const abandonBtn = document.getElementById('dt-scribe-abandon-btn');

    // UNLOCK RECIPE FIELDS IF SWITCHING HEROES OR MANUALLY STARTING A NEW PROJECT
    if (triggerSource === 'init' || triggerSource === 'project' || triggerSource === 'pc') {
        const nameEl = document.getElementById('dt-scribe-spell-name');
        const levelEl = document.getElementById('dt-scribe-level');
        
        if (nameEl) {
            nameEl.disabled = false;
            nameEl.classList.remove('bg-stone-200', 'text-stone-500');
            nameEl.classList.add('bg-stone-50', 'text-stone-900');
        }
        if (levelEl) {
            levelEl.disabled = false;
            levelEl.classList.remove('bg-stone-200', 'text-stone-500');
            levelEl.classList.add('bg-stone-50', 'text-stone-900');
        }
    }

    // Rebuild Projects List if PC changed
    const projects = pc.scribingProjects || {};
    if (triggerSource === 'pc' || triggerSource === 'init') {
        let projHtml = `<option value="new">-- Start New Project --</option>`;
        Object.entries(projects).forEach(([pid, proj]) => {
            projHtml += `<option value="${pid}">${proj.name} (Level ${proj.level}) - ${proj.progress}/${proj.totalTime} days</option>`;
        });
        if (projectSelect) projectSelect.innerHTML = projHtml;
    }

    const projectId = projectSelect?.value || 'new';
    const isResuming = projectId !== 'new';

    // Toggle New vs Resume modes
    if (isResuming) {
        if (newConfigDiv) newConfigDiv.classList.add('hidden');
        if (abandonBtn) abandonBtn.classList.remove('hidden');
        const warning = document.getElementById('dt-scribe-cost-warning');
        if (warning) warning.textContent = "Note: Materials cost was paid when this project began.";
    } else {
        if (newConfigDiv) newConfigDiv.classList.remove('hidden');
        if (abandonBtn) abandonBtn.classList.add('hidden');
        const warning = document.getElementById('dt-scribe-cost-warning');
        if (warning) warning.textContent = "Note: Material cost must be paid up front when starting.";
    }

    // --- MATH CALCULATION ---
    let totalTime = 0;
    let totalCost = 0;
    let currentProgress = 0;
    let spellLevel = 0;

    const scrollCosts = {
        0: { t: 1, c: 15 }, 1: { t: 1, c: 25 }, 2: { t: 3, c: 250 },
        3: { t: 5, c: 500 }, 4: { t: 10, c: 2500 }, 5: { t: 20, c: 5000 },
        6: { t: 40, c: 15000 }, 7: { t: 80, c: 25000 }, 8: { t: 160, c: 50000 },
        9: { t: 240, c: 250000 }
    };

    if (isResuming) {
        const proj = projects[projectId];
        totalTime = proj.totalTime;
        totalCost = proj.cost;
        currentProgress = proj.progress;
        spellLevel = proj.level;
    } else {
        spellLevel = parseInt(document.getElementById('dt-scribe-level')?.value) || 0;
        totalTime = scrollCosts[spellLevel].t;
        totalCost = scrollCosts[spellLevel].c;
    }

    const workRemaining = totalTime - currentProgress;

    // Update Totals UI
    const totalDaysOut = document.getElementById('dt-scribe-total-days');
    const totalGoldOut = document.getElementById('dt-scribe-total-gold');
    const progressOut = document.getElementById('dt-scribe-progress-text');
    
    if (totalDaysOut) totalDaysOut.textContent = `${totalTime} Day${totalTime !== 1 ? 's' : ''}`;
    if (totalGoldOut) totalGoldOut.textContent = `${totalCost.toLocaleString()} gp`;
    if (progressOut) progressOut.textContent = `${currentProgress} / ${totalTime} Days Complete`;

    // Process "Days Spent" Input
    const daysSpentEl = document.getElementById('dt-scribe-days-spent');
    if (!daysSpentEl) return;
    
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    
    if (daysSpent > workRemaining) {
        daysSpent = workRemaining;
        daysSpentEl.value = workRemaining;
    }

    // Complication Risk UI Update (10% per workweek logged)
    const riskEl = document.getElementById('dt-scribe-risk');
    if (riskEl) {
        const workweeks = Math.max(1, Math.ceil(daysSpent / 5));
        const risk = Math.min(100, workweeks * 10);
        riskEl.textContent = `${risk}%`;
    }

    const willComplete = (currentProgress + daysSpent) >= totalTime;

    const submitBtn = document.getElementById('dt-scribe-submit-btn');
    if (submitBtn) {
        if (willComplete) {
            submitBtn.innerHTML = `<i class="fa-solid fa-scroll mr-2"></i> Complete Project`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-pen-fancy mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const abandonScribingProject = async () => {
    const projectId = document.getElementById('dt-scribe-project')?.value;
    if (projectId === 'new' || !projectId) return;

    if (!confirm("Are you sure you want to permanently abandon this incomplete scroll? The materials and gold spent will be lost.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pcId = document.getElementById('dt-scribe-pc').value;
    
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId && p.scribingProjects) {
            const newProjects = { ...p.scribingProjects };
            delete newProjects[projectId];
            return { ...p, scribingProjects: newProjects };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    notify("Project abandoned.", "success");
    
    window.appActions.updateScribingMath('init');
};

export const executeScribing = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-scribe-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectId = document.getElementById('dt-scribe-project').value;
    const isResuming = projectId !== 'new';
    
    let projectData = {};
    const isRival = document.getElementById('dt-scribe-rival')?.checked;

    if (isResuming) {
        projectData = JSON.parse(JSON.stringify(pc.scribingProjects[projectId]));
    } else {
        // --- GATHER NEW PROJECT DATA ---
        const spellName = document.getElementById('dt-scribe-spell-name').value.trim();
        if (!spellName) {
            notify("Please enter the name of the spell you are scribing.", "error");
            return;
        }

        const materialsChecked = document.getElementById('dt-scribe-materials').checked;
        if (!materialsChecked) {
            notify("You must confirm you have provided the required material components.", "error");
            return;
        }

        const level = parseInt(document.getElementById('dt-scribe-level').value) || 0;
        
        const scrollCosts = {
            0: { t: 1, c: 15 }, 1: { t: 1, c: 25 }, 2: { t: 3, c: 250 },
            3: { t: 5, c: 500 }, 4: { t: 10, c: 2500 }, 5: { t: 20, c: 5000 },
            6: { t: 40, c: 15000 }, 7: { t: 80, c: 25000 }, 8: { t: 160, c: 50000 },
            9: { t: 240, c: 250000 }
        };

        projectData = {
            id: generateId(),
            name: spellName,
            level: level,
            totalTime: scrollCosts[level].t,
            cost: scrollCosts[level].c,
            progress: 0,
            rivalInvolved: isRival
        };
    }

    const daysSpent = parseInt(document.getElementById('dt-scribe-days-spent').value) || 1;
    const isComplete = (projectData.progress + daysSpent) >= projectData.totalTime;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < daysSpent) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // --- APPLY MATH & COMPLICATIONS ---
    
    projectData.progress += isComplete ? (projectData.totalTime - projectData.progress) : daysSpent;

    // Complication Roll (10% chance per workweek spent logging this session)
    let complicationText = ``;
    const workweeks = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeks * 10);
    
    let finalItemName = projectData.name;
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= risk) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        
        // --- DYNAMIC COMPLICATION 4 (RANDOM SPELL GENERATOR) ---
        let comp4Text = "Due to a strange error in creating the scroll, it is instead a random spell of the same level.";
        if (d6 === 4) {
            const getLevelKey = (lvl) => {
                if (lvl === 0) return 'cantrip';
                if (lvl === 1) return '1st';
                if (lvl === 2) return '2nd';
                if (lvl === 3) return '3rd';
                return lvl + 'th';
            };
            const levelKey = getLevelKey(projectData.level);
            
            if (SCROLL_TABLES[levelKey]) {
                const randomSpell = SCROLL_TABLES[levelKey][Math.floor(Math.random() * SCROLL_TABLES[levelKey].length)];
                comp4Text = `Due to a strange error in creating the scroll, it is instead a random spell of the same level (**${randomSpell}**).`;
                // If it finished during this block, dynamically mutate the final output scroll!
                if (isComplete) finalItemName = randomSpell;
            }
        }
        
        const compTable = [
            "You bought up the last of the rare ink used to craft scrolls, angering a wizard in town.", 
            `The priest of a temple of good accuses you of trafficking in dark magic.${projectData.rivalInvolved ? " (Orchestrated by your rival)." : ""}`,
            "A wizard eager to collect one of your spells in a book presses you to sell the scroll.", 
            comp4Text,
            "The rare parchment you bought for your scroll has a barely visible map on it.", 
            `A thief attempts to break into your workroom.${projectData.rivalInvolved ? " (Hired by your rival)." : ""}`
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100 vs ${risk}% Risk)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose during your work (${d100}/100).*`;
    }

    // Build the log text
    let resultHeader = `**Objective:** Spell Scroll (${projectData.name})`;
    let resultBody = "";
    
    if (isComplete) {
        if (finalItemName !== projectData.name) {
             resultBody = `✅ **Project Completed (With Errors)!** You finished the scroll, but due to a magical mishap, you have successfully scribed a **Spell Scroll of ${finalItemName}** instead!`;
        } else {
             resultBody = `✅ **Project Completed!** You have successfully scribed a **Spell Scroll of ${finalItemName}**.`;
        }
        
        if (projectData.level === 0) {
             resultBody += `\n*(Note: The version of this cantrip on the scroll works as if the caster were 1st level).*`;
        }
    } else {
        resultBody = `⏳ **Progress Logged:** You spent ${daysSpent} days working on the **Spell Scroll of ${projectData.name}**. *(Remaining: ${projectData.totalTime - projectData.progress} Days)*`;
    }

    let costNote = `**Total Project Material Cost:** ${projectData.cost.toLocaleString()} gp`;
    if (!isResuming) costNote += ` *(Materials must be purchased up front when starting a project).*`;

    const noteText = `**Downtime: Scribing a Spell Scroll**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Work Days Logged:** ${daysSpent} Days\n${costNote}\n\n${resultBody}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    
    // --- UPDATE CHARACTERS ---
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let projectsDict = { ...(p.scribingProjects || {}) };
            if (isComplete) {
                delete projectsDict[projectData.id];
            } else {
                projectsDict[projectData.id] = projectData;
            }
            return { 
                ...p, 
                scribingProjects: projectsDict,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - daysSpent),
                downtimeLog: (p.downtimeLog || '') + `${p.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`
            };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime scribing a spell scroll with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-scroll');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Scribing progress logged. ${daysSpent} days deducted.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openScribingModal = openScribingModal;
    window.appActions.updateScribingMath = updateScribingMath;
    window.appActions.executeScribing = executeScribing;
    window.appActions.abandonScribingProject = abandonScribingProject;
    
    // Bind Spell Browser Functions
    window.appActions.openSpellBrowser = openSpellBrowser;
    window.appActions.closeSpellBrowser = closeSpellBrowser;
    window.appActions.filterSpells = filterSpells;
    window.appActions.selectSpell = selectSpell;
}
