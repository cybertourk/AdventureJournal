import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 4. CRIME ---
// ============================================================================

export const openCrimeModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-red-900 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-mask mr-2 text-stone-400"></i> Commit a Crime</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup & Record Selection -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-crime-pc" onchange="window.appActions.updateCrimeMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-red-800 font-bold mb-1 tracking-widest"><i class="fa-solid fa-gavel mr-1 text-red-700"></i> Active Sentences & Fines</label>
                            <div class="flex gap-2">
                                <select id="dt-crime-record" onchange="window.appActions.updateCrimeMath('record')" class="flex-grow p-2 border border-red-300 rounded-sm text-sm font-bold text-red-900 outline-none focus:border-red-600 bg-red-50 shadow-inner">
                                    <option value="new">-- Commit New Crime --</option>
                                    <!-- Populated dynamically via JS -->
                                </select>
                                <button type="button" id="dt-crime-clear-btn" onclick="window.appActions.clearCrimeRecord()" class="hidden px-3 py-2 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 rounded-sm transition" title="Erase Record"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- NEW CRIME CONFIGURATION                    -->
                    <!-- ========================================== -->
                    <div id="dt-crime-new-config" class="transition-all duration-300">
                        <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> and <b>25 gp</b> to attempt a heist. Three ability checks determine your payout or jail sentence.</p>

                        <!-- Details -->
                        <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Target DC</label>
                                    <select id="dt-crime-dc" onchange="window.appActions.updateCrimeMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner">
                                        <option value="10">DC 10 (Rob a struggling merchant)</option>
                                        <option value="15">DC 15 (Rob a prosperous merchant)</option>
                                        <option value="20">DC 20 (Rob a noble)</option>
                                        <option value="25">DC 25 (Rob the richest figure in town)</option>
                                    </select>
                                </div>
                                <div class="flex items-end pb-2">
                                    <label class="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" id="dt-crime-rival" class="w-4 h-4 text-red-900 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-red-900 transition">Is a rival involved?</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                                <input type="text" id="dt-crime-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Crime Description</label>
                                <input type="text" id="dt-crime-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner" placeholder="e.g. Breaking into the manor vault">
                            </div>
                        </div>

                        <!-- Modifiers -->
                        <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Stealth</label>
                                <div class="flex items-center">
                                    <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                    <input type="number" id="dt-crime-stealth" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Thieves' Tools</label>
                                <div class="flex items-center">
                                    <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                    <input type="number" id="dt-crime-tools" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">
                                    <select id="dt-crime-third-skill" onchange="window.appActions.updateCrimeMath('skill')" class="bg-transparent outline-none font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer">
                                        <option value="Investigation">Investigation</option>
                                        <option value="Perception">Perception</option>
                                        <option value="Deception">Deception</option>
                                    </select>
                                </label>
                                <div class="flex items-center">
                                    <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                    <input type="number" id="dt-crime-third-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                                </div>
                            </div>
                        </div>

                        <!-- Live Math Output -->
                        <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Potential Payout</span>
                                <span id="dt-crime-payout-out" class="text-2xl font-black text-amber-500">50 gp</span>
                            </div>
                            <div class="text-right border-l-2 border-stone-800 pl-4">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                                <span class="text-sm font-bold text-stone-300">5 Days & 25 gp (Expenses)</span>
                            </div>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- RESOLVE SENTENCE CONFIGURATION             -->
                    <!-- ========================================== -->
                    <div id="dt-crime-resolve-config" class="hidden transition-all duration-300">
                        <div class="bg-white border border-[#d4c5a9] rounded-sm p-4 shadow-sm mb-5">
                            <h3 class="font-serif font-bold text-red-900 text-lg mb-2 flex items-center border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-link-slash mr-2 text-red-700"></i> Resolving Justice</h3>
                            <p class="text-stone-700 text-sm font-bold mb-1">Crime: <span id="dt-crime-res-desc" class="font-serif font-normal text-stone-600 italic">Unknown</span></p>
                            <p class="text-stone-700 text-sm font-bold mb-4">Location: <span id="dt-crime-res-loc" class="font-serif font-normal text-stone-600 italic">Unknown</span></p>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-stone-50 border border-stone-200 p-3 rounded-sm shadow-inner text-center">
                                    <span class="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Jail Time Remaining</span>
                                    <span id="dt-crime-res-jail-remaining" class="text-xl font-black text-stone-800">0 Days</span>
                                </div>
                                <div class="bg-stone-50 border border-stone-200 p-3 rounded-sm shadow-inner text-center">
                                    <span class="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Fines Remaining</span>
                                    <span id="dt-crime-res-fine-remaining" class="text-xl font-black text-amber-700">0 gp</span>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            
                            <!-- Option 1: Serve Time -->
                            <div class="bg-stone-100 border border-stone-300 p-3 rounded-sm shadow-sm flex flex-col justify-between">
                                <div>
                                    <h4 class="text-[10px] uppercase text-stone-800 font-bold mb-1 tracking-widest border-b border-stone-200 pb-1">Option 1: Serve Sentence</h4>
                                    <p class="text-[9px] text-stone-600 italic mb-3 leading-snug">Deduct downtime days to serve your sentence, and pay off the flat fine over time.</p>
                                </div>
                                <div class="space-y-2 mb-3">
                                    <div class="flex items-center">
                                        <label class="w-16 text-[9px] font-bold text-stone-500 uppercase tracking-widest">Time</label>
                                        <input type="number" id="dt-crime-res-serve" value="0" min="0" oninput="window.appActions.updateCrimeMath('serve')" class="w-full p-1.5 border border-blue-300 rounded-l-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white text-center shadow-inner">
                                        <span class="bg-blue-100 border border-l-0 border-blue-300 px-2 py-1.5 text-[10px] font-bold text-blue-800 rounded-r-sm shadow-inner uppercase tracking-wider">Days</span>
                                    </div>
                                    <div class="flex items-center">
                                        <label class="w-16 text-[9px] font-bold text-stone-500 uppercase tracking-widest">Fine</label>
                                        <input type="number" id="dt-crime-res-fine" value="0" min="0" oninput="window.appActions.updateCrimeMath('fine')" class="w-full p-1.5 border border-amber-300 rounded-l-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-inner">
                                        <span class="bg-amber-100 border border-l-0 border-amber-300 px-2 py-1.5 text-[10px] font-bold text-amber-900 rounded-r-sm shadow-inner uppercase tracking-wider">GP</span>
                                    </div>
                                </div>
                                <button id="dt-crime-serve-btn" onclick="window.appActions.executeCrime('serve')" class="w-full py-1.5 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm"><i class="fa-solid fa-file-pen mr-1"></i> Log Time / Payment</button>
                            </div>

                            <!-- Option 2: Bribe -->
                            <div class="bg-red-50 border border-red-200 p-3 rounded-sm shadow-sm flex flex-col justify-between">
                                <div>
                                    <h4 class="text-[10px] uppercase text-red-800 font-bold mb-1 tracking-widest border-b border-red-200 pb-1">Option 2: Bribe Authorities</h4>
                                    <p class="text-[9px] text-red-700 italic mb-2 leading-snug">Pay the original fine plus a bribe of 10 gp per day of remaining jail time to make this disappear instantly without spending downtime.</p>
                                </div>
                                <div class="text-center py-2 bg-white rounded-sm border border-red-200 mb-3 shadow-inner">
                                    <span class="block text-[9px] uppercase font-bold text-stone-500 tracking-widest">Total Bribe Cost</span>
                                    <span id="dt-crime-res-bribe-cost" class="text-lg font-black text-red-700">0 gp</span>
                                </div>
                                <button id="dt-crime-bribe-btn" onclick="window.appActions.executeCrime('bribe')" class="w-full py-1.5 bg-red-800 text-amber-50 rounded-sm hover:bg-red-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm"><i class="fa-solid fa-sack-dollar mr-1"></i> Pay Bribe & Clear</button>
                            </div>
                        </div>
                    </div>
                    <!-- ========================================== -->

                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-crime-submit-btn" onclick="window.appActions.executeCrime('new')" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-mask mr-2"></i> Commit Crime</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.appActions.updateCrimeMath('init');
    }, 50);
};

export const updateCrimeMath = (triggerSource = 'input') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-crime-pc')?.value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const recordSelect = document.getElementById('dt-crime-record');
    const newConfigDiv = document.getElementById('dt-crime-new-config');
    const resConfigDiv = document.getElementById('dt-crime-resolve-config');
    const clearBtn = document.getElementById('dt-crime-clear-btn');
    const submitBtn = document.getElementById('dt-crime-submit-btn');

    // --- AUTO-CALCULATE MODIFIERS ---
    if (triggerSource === 'pc' || triggerSource === 'init' || triggerSource === 'skill') {
        const getAbilityMod = (score) => Math.floor(((parseInt(score) || 10) - 10) / 2);
        let pb = 2;
        if (pc.classLevel) {
            const levels = pc.classLevel.match(/\d+/g);
            if (levels) pb = Math.max(2, Math.ceil(levels.reduce((a, b) => a + parseInt(b), 0) / 4) + 1);
        }
        
        const getSkillMod = (statScore, skillName) => {
            const mod = getAbilityMod(statScore);
            let isProf = false, isExp = false;
            const cleanSkill = skillName.toLowerCase();
            const profStr = ((pc.skills || '') + ',' + (pc.proficiencies || '')).toLowerCase();
            const checkArr = profStr.split(',').map(s => s.trim());
            const match = checkArr.find(s => s.includes(cleanSkill));
            if (match) {
                isProf = true;
                if (match.includes('expertise')) isExp = true;
            }
            return mod + (isExp ? pb * 2 : (isProf ? pb : 0));
        };

        const stealthEl = document.getElementById('dt-crime-stealth');
        const toolsEl = document.getElementById('dt-crime-tools');
        const thirdSkillEl = document.getElementById('dt-crime-third-skill');
        const thirdModEl = document.getElementById('dt-crime-third-mod');

        if (stealthEl) stealthEl.value = getSkillMod(pc.dex, 'stealth');
        if (toolsEl) toolsEl.value = getSkillMod(pc.dex, 'thieves');
        
        if (thirdSkillEl && thirdModEl) {
            const thirdChoice = thirdSkillEl.value;
            if (thirdChoice === 'Investigation') thirdModEl.value = getSkillMod(pc.int, 'investigation');
            else if (thirdChoice === 'Perception') thirdModEl.value = getSkillMod(pc.wis, 'perception');
            else if (thirdChoice === 'Deception') thirdModEl.value = getSkillMod(pc.cha, 'deception');
        }
    }

    // Rebuild Sentences Dropdown if PC changed
    const records = pc.crimeRecords || {};
    if (triggerSource === 'pc' || triggerSource === 'init') {
        let recHtml = `<option value="new">-- Commit New Crime --</option>`;
        Object.entries(records).forEach(([rid, rec]) => {
            const jailRem = rec.jailDaysTotal - rec.jailDaysServed;
            const fineRem = rec.fineTotal - rec.finePaid;
            recHtml += `<option value="${rid}">${rec.desc} (${jailRem}d, ${fineRem}gp left)</option>`;
        });
        if (recordSelect) recordSelect.innerHTML = recHtml;
    }

    const recordId = recordSelect?.value;
    const isResuming = recordId !== 'new';

    if (isResuming) {
        newConfigDiv.classList.add('hidden');
        resConfigDiv.classList.remove('hidden');
        clearBtn.classList.remove('hidden');

        if (submitBtn) submitBtn.classList.add('hidden');

        const rec = records[recordId];
        if (rec) {
            const jailRem = rec.jailDaysTotal - rec.jailDaysServed;
            const fineRem = rec.fineTotal - rec.finePaid;

            if (triggerSource === 'pc' || triggerSource === 'init' || triggerSource === 'record') {
                document.getElementById('dt-crime-res-desc').textContent = rec.desc;
                document.getElementById('dt-crime-res-loc').textContent = rec.loc;
                document.getElementById('dt-crime-res-jail-remaining').textContent = `${jailRem} Days`;
                document.getElementById('dt-crime-res-fine-remaining').textContent = `${fineRem} gp`;
                
                document.getElementById('dt-crime-res-serve').value = 0;
                document.getElementById('dt-crime-res-fine').value = 0;
            }

            // Interactive Resolution Math Caps for Option 1
            let serveInput = parseInt(document.getElementById('dt-crime-res-serve').value) || 0;
            let fineInput = parseInt(document.getElementById('dt-crime-res-fine').value) || 0;

            if (serveInput > jailRem) {
                serveInput = jailRem;
                document.getElementById('dt-crime-res-serve').value = serveInput;
            }
            if (fineInput > fineRem) {
                fineInput = fineRem;
                document.getElementById('dt-crime-res-fine').value = fineInput;
            }

            // Calculate instantaneous Bribe Cost for Option 2
            const bribeCost = fineRem + (jailRem * 10);
            document.getElementById('dt-crime-res-bribe-cost').textContent = `${bribeCost.toLocaleString()} gp`;

            const serveBtn = document.getElementById('dt-crime-serve-btn');
            if (serveBtn) {
                if (serveInput >= jailRem && fineInput >= fineRem) {
                    serveBtn.innerHTML = `<i class="fa-solid fa-gavel mr-1"></i> Resolve Sentence`;
                    serveBtn.className = "w-full py-1.5 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] shadow-sm";
                } else {
                    serveBtn.innerHTML = `<i class="fa-solid fa-file-pen mr-1"></i> Log Time / Payment`;
                    serveBtn.className = "w-full py-1.5 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm";
                }
            }
        }
    } else {
        newConfigDiv.classList.remove('hidden');
        resConfigDiv.classList.add('hidden');
        clearBtn.classList.add('hidden');

        if (submitBtn) {
            submitBtn.classList.remove('hidden');
            submitBtn.innerHTML = `<i class="fa-solid fa-mask mr-2"></i> Commit Crime`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-stone-900').replace('hover:bg-emerald-600', 'hover:bg-stone-800').replace('bg-blue-800', 'bg-stone-900').replace('hover:bg-blue-700', 'hover:bg-stone-800');
        }

        // New Crime Math (Payout calc)
        const dcEl = document.getElementById('dt-crime-dc');
        const payoutOut = document.getElementById('dt-crime-payout-out');
        
        if (dcEl && payoutOut) {
            const dc = parseInt(dcEl.value) || 10;
            let payout = 50;
            if (dc === 15) payout = 100;
            else if (dc === 20) payout = 200;
            else if (dc === 25) payout = 1000;
            
            payoutOut.textContent = `${payout.toLocaleString()} gp`;
        }
    }
};

export const clearCrimeRecord = async () => {
    const recordId = document.getElementById('dt-crime-record').value;
    if (recordId === 'new') return;

    if (!confirm("Are you sure you want to completely erase this criminal record?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pcId = document.getElementById('dt-crime-pc').value;
    
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId && p.crimeRecords) {
            const newRecords = { ...p.crimeRecords };
            delete newRecords[recordId];
            return { ...p, crimeRecords: newRecords };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    notify("Criminal record erased.", "success");
    
    window.appActions.updateCrimeMath('init');
};

export const executeCrime = async (actionType = 'new') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-crime-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const recordId = document.getElementById('dt-crime-record').value;
    const isResuming = recordId !== 'new';

    let logAddition = "";
    let daysToDeduct = 0;
    let recordsDict = { ...(pc.crimeRecords || {}) };

    if (isResuming) {
        // --- PROCESS SENTENCE RESOLUTION ---
        const rec = recordsDict[recordId];
        if (!rec) return;

        const jailRem = rec.jailDaysTotal - rec.jailDaysServed;
        const fineRem = rec.fineTotal - rec.finePaid;

        if (actionType === 'bribe') {
            const bribeCost = fineRem + (jailRem * 10);
            
            if (!confirm(`Are you sure you want to pay ${bribeCost.toLocaleString()} gp to clear this record instantly?`)) return;

            let resText = `**Downtime: Bribed Authorities**\n*Hero:* ${pc.name}\n\n**Crime:** ${rec.desc} at ${rec.loc}\n`;
            resText += `**Gold Spent:** ${bribeCost.toLocaleString()} gp (${fineRem.toLocaleString()} gp towards fine, ${(jailRem * 10).toLocaleString()} gp in bribes)\n\n`;
            resText += `✅ **Debt to Society Cleared!** You paid off the authorities and your record was expunged.`;

            delete recordsDict[recordId]; // Erase the record when bribed

            daysToDeduct = 0; // Bribing does not consume downtime
            const timestampStr = new Date().toLocaleDateString();
            logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${resText}`;

        } else if (actionType === 'serve') {
            const serveDays = parseInt(document.getElementById('dt-crime-res-serve').value) || 0;
            const finePaid = parseInt(document.getElementById('dt-crime-res-fine').value) || 0;

            if (serveDays === 0 && finePaid === 0) {
                notify("You must enter an amount of time or gold to resolve.", "error");
                return;
            }

            if ((parseInt(pc.availableDowntime) || 0) < serveDays) {
                notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available to serve in jail.`, "error");
                return;
            }

            rec.jailDaysServed += serveDays;
            rec.finePaid += finePaid;
            daysToDeduct = serveDays;

            const newJailRem = rec.jailDaysTotal - rec.jailDaysServed;
            const newFineRem = rec.fineTotal - rec.finePaid;
            const isComplete = newJailRem <= 0 && newFineRem <= 0;

            let resText = `**Downtime: Sentence Resolution**\n*Hero:* ${pc.name}\n\n**Crime:** ${rec.desc} at ${rec.loc}\n`;
            if (serveDays > 0) resText += `**Downtime Spent:** ${serveDays} Days in Jail\n`;
            if (finePaid > 0) resText += `**Gold Spent:** ${finePaid.toLocaleString()} gp towards fine\n`;
            resText += `\n`;

            if (isComplete) {
                resText += `✅ **Debt to Society Paid!** You have completely resolved your sentence for this crime.`;
                delete recordsDict[recordId]; // Erase the record when fully paid
            } else {
                resText += `⏳ **Progress Logged:** You still owe **${Math.max(0, newJailRem)} days** in jail and **${Math.max(0, newFineRem).toLocaleString()} gp** in fines.`;
            }

            const timestampStr = new Date().toLocaleDateString();
            logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${resText}`;
        }

    } else {
        // --- PROCESS NEW CRIME ---
        daysToDeduct = 5;

        if ((parseInt(pc.availableDowntime) || 0) < daysToDeduct) {
            notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
            return;
        }

        const dc = parseInt(document.getElementById('dt-crime-dc').value) || 10;
        const thirdSkillName = document.getElementById('dt-crime-third-skill').value;
        const isRival = document.getElementById('dt-crime-rival').checked;
        
        const loc = document.getElementById('dt-crime-loc').value.trim();
        const desc = document.getElementById('dt-crime-desc').value.trim();

        if (!loc || !desc) {
            notify("Please enter the Location and Crime Description.", "error");
            return;
        }

        const modStealth = parseInt(document.getElementById('dt-crime-stealth').value) || 0;
        const modTools = parseInt(document.getElementById('dt-crime-tools').value) || 0;
        const modThird = parseInt(document.getElementById('dt-crime-third-mod').value) || 0;

        let payoutMax = 50;
        if (dc === 15) payoutMax = 100;
        else if (dc === 20) payoutMax = 200;
        else if (dc === 25) payoutMax = 1000;

        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        const roll3 = Math.floor(Math.random() * 20) + 1;

        const totalStealth = roll1 + modStealth;
        const totalTools = roll2 + modTools;
        const totalThird = roll3 + modThird;

        let successes = 0;
        if (totalStealth >= dc) successes++;
        if (totalTools >= dc) successes++;
        if (totalThird >= dc) successes++;

        let resultHeader = `**Crime:** ${desc} at ${loc} (DC ${dc})`;
        let resultBody = ``;
        let complicationText = ``;

        if (successes === 0) {
            const fine = payoutMax;
            const jailWeeks = Math.ceil(fine / 25);
            const jailDays = jailWeeks * 5; // XGtE downtime math: 5 days = 1 workweek
            
            // GENERATE A CRIMINAL RECORD FOR TRACKING!
            const newRecordId = generateId();
            recordsDict[newRecordId] = {
                id: newRecordId,
                desc: desc,
                loc: loc,
                jailDaysTotal: jailDays,
                jailDaysServed: 0,
                fineTotal: fine,
                finePaid: 0,
                timestamp: Date.now()
            };

            resultBody = `🚨 **Caught! (0 Successes)**\n\nYour heist was a spectacular failure. You have been caught and sentenced by the local authorities!\n\n**The Sentence:** **${jailWeeks} week(s) (${jailDays} days)** in jail and a **${fine} gp** fine.\n\n*A Criminal Record has been added to your sheet. You can serve time or pay off this debt by selecting it from the Active Sentences menu in the Crime activity.*`;
        } 
        else if (successes === 1) {
            resultBody = `❌ **Failure (1 Success)**\n\nYou failed to secure the loot, but you managed to escape without being caught.`;
        } 
        else if (successes === 2) {
            resultBody = `⚠️ **Partial Success (2 Successes)**\n\nThings got messy, but you made off with loot worth **${payoutMax / 2} gp**.`;
        } 
        else if (successes === 3) {
            resultBody = `✅ **Full Success (3 Successes)**\n\nA perfect heist! You earn the full loot of **${payoutMax} gp**.`;
        }

        if (successes === 1 || (successes === 2 && isRival)) {
            const d8 = Math.floor(Math.random() * 8) + 1;
            const compTable = [
                "A bounty equal to your earnings is offered for information about your crime.", 
                "An unknown person contacts you, threatening to reveal your crime if you don’t render a service.",
                "Your victim is financially ruined by your crime.", 
                "Someone who knows of your crime has been arrested on an unrelated matter.",
                "Your loot is a single, easily identified item that you can’t fence in this region.", 
                "You robbed someone who was under a local crime lord’s protection, and who now wants revenge.",
                "Your victim calls in a favor from a guard, doubling the efforts to solve the case.", 
                "Your victim asks one of your adventuring companions to solve the crime."
            ];
            complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d8=${d8}):* ${compTable[d8 - 1]}`;
        } else if (successes > 0) {
            complicationText = `\n\n*No complications arose during the heist.*`;
        }

        let checksText = `**Stealth Check:** ${totalStealth} (Rolled ${roll1})\n**Thieves' Tools Check:** ${totalTools} (Rolled ${roll2})\n**${thirdSkillName} Check:** ${totalThird} (Rolled ${roll3})`;

        const noteText = `**Downtime: Crime**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** 25 gp\n\n${checksText}\n\n${resultBody}${complicationText}`;

        const timestampStr = new Date().toLocaleDateString();
        logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;
    }

    // --- APPLY DATA UPDATES ---
    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            crimeRecords: recordsDict,
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - daysToDeduct),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    
    if (isResuming) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime resolving a criminal sentence with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-gavel');
    } else {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime attempting a heist with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-mask');
    }

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    
    // Customize the notification text based on whether it was a new crime, bribe, or serving time
    if (isResuming) {
        notify(`Record updated successfully. ${daysToDeduct > 0 ? `${daysToDeduct} days deducted.` : ''} Log saved.`, "success");
    } else {
        notify(`Activity logged. 5 days deducted from ${pc.name}.`, "success");
    }
    
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openCrimeModal = openCrimeModal;
    window.appActions.updateCrimeMath = updateCrimeMath;
    window.appActions.executeCrime = executeCrime;
    window.appActions.clearCrimeRecord = clearCrimeRecord;
}
