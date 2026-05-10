import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 7. RELAXATION ---
// ============================================================================

export const openRelaxationModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const isDM = camp._isDM;

    const validPCs = (camp.playerCharacters || []).filter(pc => isDM || pc.playerId === myUid);
    if (validPCs.length === 0) { notify("You must enroll a hero before taking downtime.", "error"); return; }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-blue-900 p-4 border-b-4 border-sky-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-bed mr-2 text-sky-300"></i> Relaxation</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-relax-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-relax-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-relax-m" onchange="window.updateDayOptions(this.value, 'dt-relax-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-relax-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                                <input type="text" id="dt-relax-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-stone-50 shadow-inner" placeholder="e.g. The Salty Siren Inn">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Lifestyle Maintained</label>
                                <select id="dt-relax-lifestyle" onchange="window.appActions.updateRelaxationMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-stone-50 shadow-inner">
                                    <option value="wretched">Wretched (0 gp)</option>
                                    <option value="squalid">Squalid (1 sp/day)</option>
                                    <option value="poor">Poor (2 sp/day)</option>
                                    <option value="modest" selected>Modest (1 gp/day)</option>
                                    <option value="comfortable">Comfortable (2 gp/day)</option>
                                    <option value="wealthy">Wealthy (4 gp/day)</option>
                                    <option value="aristocratic">Aristocratic (10+ gp/day)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mt-4 pt-3 border-t border-[#d4c5a9]">
                            <p id="dt-relax-desc" class="text-[10px] sm:text-xs text-stone-600 leading-snug italic"></p>
                        </div>
                    </div>

                    <!-- Recovery Benefits -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-heart-pulse mr-2 text-red-600"></i> Recovery Benefits</h3>
                    
                    <div id="dt-relax-benefit-group" class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner transition-opacity mb-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Benefit Gained</label>
                                <select id="dt-relax-benefit-type" onchange="window.appActions.updateRelaxationMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm">
                                    <option value="hp">End effect preventing HP regain</option>
                                    <option value="ability">Restore reduced ability score</option>
                                    <option value="other">Other (Describe manually)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Effect Description</label>
                                <input type="text" id="dt-relax-benefit-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm" placeholder="Describe what you recovered from...">
                            </div>
                        </div>
                    </div>
                    
                    <p id="dt-relax-warning" class="hidden text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-sm mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> A Modest lifestyle or better is required to recover from lingering effects.</p>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Estimated Cost</span>
                            <span id="dt-relax-gold-out" class="text-2xl font-black text-amber-500">5 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold/Silver must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeRelaxation()" class="px-5 py-2 bg-blue-900 text-amber-50 rounded-sm hover:bg-blue-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-bed mr-2"></i> Relax & Recover</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateRelaxationMath, 50);
};

export const updateRelaxationMath = () => {
    const lifestyleEl = document.getElementById('dt-relax-lifestyle');
    const benefitTypeEl = document.getElementById('dt-relax-benefit-type');
    const benefitDescEl = document.getElementById('dt-relax-benefit-desc');
    const benefitGroup = document.getElementById('dt-relax-benefit-group');
    const warningEl = document.getElementById('dt-relax-warning');
    const descEl = document.getElementById('dt-relax-desc');
    const goldOut = document.getElementById('dt-relax-gold-out');

    if (!lifestyleEl || !benefitGroup || !goldOut) return;

    const lifestyleData = {
        wretched: { cost: 0, benefit: false, desc: "You live in inhumane conditions, sheltering wherever you can. Violence, disease, and hunger follow you wherever you go." },
        squalid: { cost: 0.1, benefit: false, desc: "You live in a leaky stable or vermin-infested boarding house in the worst part of town, rife with disease and misfortune." },
        poor: { cost: 0.2, benefit: false, desc: "You go without comforts. Simple food and lodgings, threadbare clothing, and unpredictable conditions." },
        modest: { cost: 1, benefit: true, desc: "You live in an older part of town, renting a clean, simple room. You don’t go hungry or thirsty." },
        comfortable: { cost: 2, benefit: true, desc: "You can afford nicer clothing and live in a small cottage or a private room at a fine inn." },
        wealthy: { cost: 4, benefit: true, desc: "You live a life of luxury, with respectable lodgings and a small staff of servants." },
        aristocratic: { cost: 10, benefit: true, desc: "You live a life of plenty and comfort, moving in circles populated by the most powerful people in the community." }
    };

    const choice = lifestyleEl.value;
    const data = lifestyleData[choice];

    descEl.textContent = data.desc;

    // Toggle Benefit Group visibility based on Lifestyle
    if (data.benefit) {
        benefitGroup.classList.remove('opacity-50', 'pointer-events-none');
        warningEl.classList.add('hidden');
    } else {
        benefitGroup.classList.add('opacity-50', 'pointer-events-none');
        warningEl.classList.remove('hidden');
    }

    // Auto-fill description based on benefit dropdown if they haven't explicitly typed "other"
    if (document.activeElement !== benefitDescEl) {
        if (benefitTypeEl.value === 'hp') benefitDescEl.value = "Ending an effect that prevents hit point regeneration.";
        else if (benefitTypeEl.value === 'ability') benefitDescEl.value = "Restoring a drained ability score (e.g., Strength).";
        else if (benefitTypeEl.value === 'other' && (benefitDescEl.value === "Ending an effect that prevents hit point regeneration." || benefitDescEl.value === "Restoring a drained ability score (e.g., Strength).")) {
            benefitDescEl.value = "";
        }
    }

    const totalCost = data.cost * 5;
    let costStr = totalCost < 1 ? `${totalCost * 10} sp` : `${totalCost} gp`;
    if (totalCost === 0) costStr = "0 gp";

    goldOut.textContent = costStr;
};

export const executeRelaxation = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-relax-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const loc = document.getElementById('dt-relax-loc').value.trim();
    if (!loc) {
        notify("Please enter a location.", "error");
        return;
    }

    const lifestyleChoice = document.getElementById('dt-relax-lifestyle').value;
    const effectDesc = document.getElementById('dt-relax-benefit-desc').value.trim();

    const lifestyleData = {
        wretched: { cost: 0, label: "Wretched", benefit: false },
        squalid: { cost: 0.1, label: "Squalid", benefit: false },
        poor: { cost: 0.2, label: "Poor", benefit: false },
        modest: { cost: 1, label: "Modest", benefit: true },
        comfortable: { cost: 2, label: "Comfortable", benefit: true },
        wealthy: { cost: 4, label: "Wealthy", benefit: true },
        aristocratic: { cost: 10, label: "Aristocratic", benefit: true }
    };

    const data = lifestyleData[lifestyleChoice];

    if (data.benefit && !effectDesc) {
        notify("Please describe the effect you are ending, as your lifestyle supports it.", "error");
        return;
    }

    const totalCostNum = data.cost * 5;
    let costStr = totalCostNum < 1 ? `${totalCostNum * 10} sp` : `${totalCostNum} gp`;
    if (totalCostNum === 0) costStr = "0 gp";

    const igY = parseInt(document.getElementById('dt-relax-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-relax-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-relax-d').value, 10) || camp.calendar.currentDay || 1;

    // --- FORMAT RESULTS ---
    let recoveryMessage = ``;
    if (data.benefit && effectDesc) {
        recoveryMessage = `✅ **Recovery Successful!**\nAt the week's end, ${pc.name} recovered from the following effect:\n> *"${effectDesc}"*`;
    } else {
        recoveryMessage = `❌ **No Lingering Effects Cured**\nThis lifestyle was not sufficient to recover from any long-term ailments.`;
    }

    const noteText = `**Downtime: Relaxation**\n*Hero:* ${pc.name}\n\n**Location:** ${loc}\n**Time Spent:** 5 Days\n**Lifestyle Maintained:** ${data.label} (${costStr})\n\n${recoveryMessage}\n\n*(Note: During this week, ${pc.name} also gains advantage on saving throws against long-acting diseases and poisons).*`;

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: 5, repeatsYearly: false, category: 'Downtime'
    };

    let updatedCamp = { ...camp };

    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime relaxing in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-bed');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Relaxation resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openRelaxationModal = openRelaxationModal;
    window.appActions.updateRelaxationMath = updateRelaxationMath;
    window.appActions.executeRelaxation = executeRelaxation;
}
