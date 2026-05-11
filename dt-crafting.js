import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 3. CRAFTING AN ITEM ---
// ============================================================================

export const openCraftingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hammer mr-2 text-amber-400"></i> Crafting an Item</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Core Configuration -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-craft-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Project Type</label>
                            <select id="dt-craft-type" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="nonmagical">Nonmagical Item</option>
                                <option value="magic">Magic Item</option>
                                <option value="healing_potion">Standard Potion of Healing</option>
                                <option value="other_potion">Other Potion</option>
                            </select>
                        </div>
                    </div>

                    <!-- Dynamic Fields based on Project Type -->
                    <div class="mb-5 bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm transition-all duration-300">
                        
                        <!-- Name Input (Shared by most) -->
                        <div id="dt-craft-name-wrapper" class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                            <input type="text" id="dt-craft-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner" placeholder="e.g. Plate Armor">
                        </div>

                        <!-- Nonmagical specific -->
                        <div id="dt-craft-nonmagical-fields" class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Market Price (gp)</label>
                            <input type="number" id="dt-craft-cost" min="1" value="50" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner text-center">
                            <p class="text-[9px] text-stone-400 mt-1 italic">Crafting requires materials worth half the market value.</p>
                        </div>

                        <!-- Magical / Potion shared rarity -->
                        <div id="dt-craft-rarity-fields" class="hidden mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Rarity</label>
                                <select id="dt-craft-rarity" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="very-rare">Very Rare</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>
                            <div id="dt-craft-consumable-wrapper" class="flex flex-col justify-center">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="dt-craft-consumable" onchange="window.appActions.updateCraftingMath()" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-blue-800 transition">Is Consumable?</span>
                                </label>
                                <p class="text-[9px] text-stone-400 mt-1 italic">Halves required time and cost.</p>
                            </div>
                        </div>

                        <!-- Standard Healing Potion specific -->
                        <div id="dt-craft-healing-fields" class="hidden mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Potion Type</label>
                            <select id="dt-craft-healing-type" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                <option value="healing">Potion of Healing (1 d / 25 gp)</option>
                                <option value="greater">Greater Healing (5 d / 100 gp)</option>
                                <option value="superior">Superior Healing (15 d / 1,000 gp)</option>
                                <option value="supreme">Supreme Healing (20 d / 10,000 gp)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div class="bg-amber-50 border border-amber-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-artificer" onchange="window.appActions.updateCraftingMath()" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition">Artificer Magic Item Adept</span>
                            </label>
                            <p class="text-[9px] text-amber-700 italic leading-snug">Quarter time & half cost for Common/Uncommon magic items and standard potions.</p>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-harper" onchange="document.getElementById('dt-craft-harper-details').classList.toggle('hidden'); window.appActions.updateCraftingMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                            </label>
                            <p class="text-[9px] text-blue-700 italic leading-snug">Reduces time & cost. Requires a safe house.</p>
                        </div>
                    </div>

                    <!-- Harper Details (Hidden by default) -->
                    <div id="dt-craft-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-craft-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-craft-harper-travel" value="0" min="0" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Requirements</span>
                            <div class="text-right">
                                <span id="dt-craft-total-days" class="text-sm font-bold text-emerald-400 mr-3">0 Days</span>
                                <span id="dt-craft-total-gold" class="text-sm font-bold text-amber-400">0 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Work Days Spent <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-craft-days-spent" value="1" min="1" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Days Logged</span>
                                <span id="dt-craft-logged-days" class="text-xl font-bold text-amber-500">1 Day</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Includes travel time</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-craft-submit-btn" onclick="window.appActions.executeCrafting()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hammer mr-2"></i> Log Crafting</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateCraftingMath, 50);
};

export const updateCraftingMath = () => {
    const typeEl = document.getElementById('dt-craft-type');
    const nameEl = document.getElementById('dt-craft-item-name');
    const costEl = document.getElementById('dt-craft-cost');
    const rarityEl = document.getElementById('dt-craft-rarity');
    const consEl = document.getElementById('dt-craft-consumable');
    const healTypeEl = document.getElementById('dt-craft-healing-type');
    
    const isHarper = document.getElementById('dt-craft-harper').checked;
    const isArtificer = document.getElementById('dt-craft-artificer').checked;
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
    
    const daysSpentEl = document.getElementById('dt-craft-days-spent');
    
    if (!typeEl || !daysSpentEl) return;
    
    const cType = typeEl.value;
    
    // Toggle Visibility
    document.getElementById('dt-craft-name-wrapper').classList.remove('hidden');
    document.getElementById('dt-craft-nonmagical-fields').classList.add('hidden');
    document.getElementById('dt-craft-rarity-fields').classList.add('hidden');
    document.getElementById('dt-craft-healing-fields').classList.add('hidden');
    document.getElementById('dt-craft-consumable-wrapper').classList.remove('hidden');

    if (cType === 'nonmagical') {
        document.getElementById('dt-craft-nonmagical-fields').classList.remove('hidden');
    } else if (cType === 'magic') {
        document.getElementById('dt-craft-rarity-fields').classList.remove('hidden');
    } else if (cType === 'healing_potion') {
        document.getElementById('dt-craft-name-wrapper').classList.add('hidden');
        document.getElementById('dt-craft-healing-fields').classList.remove('hidden');
    } else if (cType === 'other_potion') {
        document.getElementById('dt-craft-rarity-fields').classList.remove('hidden');
        document.getElementById('dt-craft-consumable-wrapper').classList.add('hidden'); // Potions are always consumable
    }

    let baseTime = 0;
    let baseCost = 0;
    let isConsumable = false;

    // Base Math
    if (cType === 'nonmagical') {
        const mCost = parseInt(costEl.value) || 0;
        baseTime = Math.max(1, Math.ceil(mCost / 10));
        baseCost = Math.ceil(mCost / 2);
    } else if (cType === 'healing_potion') {
        const hType = healTypeEl.value;
        const healingData = {
            healing: { time: 1, cost: 25 },
            greater: { time: 5, cost: 100 },
            superior: { time: 15, cost: 1000 },
            supreme: { time: 20, cost: 10000 }
        };
        baseTime = healingData[hType].time;
        baseCost = healingData[hType].cost;
        isConsumable = true;
    } else { // Magic Item or Other Potion
        const rarity = rarityEl.value;
        isConsumable = cType === 'other_potion' ? true : consEl.checked;
        
        const rarityData = {
            common: { workweeks: 1, cost: 50 },
            uncommon: { workweeks: 2, cost: 200 },
            rare: { workweeks: 10, cost: 2000 },
            'very-rare': { workweeks: 25, cost: 20000 },
            legendary: { workweeks: 50, cost: 100000 }
        };
        
        let rw = rarityData[rarity].workweeks;
        let rc = rarityData[rarity].cost;
        
        baseTime = (isConsumable ? Math.max(1, Math.ceil(rw / 2)) : rw) * 5;
        baseCost = isConsumable ? Math.max(1, Math.ceil(rc / 2)) : rc;
    }

    let effectiveTime = baseTime;
    let effectiveCost = baseCost;

    // Apply Artificer (Applies to common/uncommon magic items, or healing/greater potions)
    let applyArtificer = false;
    if (isArtificer) {
        if (cType === 'healing_potion' && (healTypeEl.value === 'healing' || healTypeEl.value === 'greater')) applyArtificer = true;
        if ((cType === 'magic' || cType === 'other_potion') && (rarityEl.value === 'common' || rarityEl.value === 'uncommon')) applyArtificer = true;
    }

    if (applyArtificer) {
        effectiveTime = Math.ceil(baseTime * 0.25);
        effectiveCost = Math.ceil(baseCost * 0.5);
    }

    // Apply Harper
    if (isHarper) {
        effectiveTime = Math.ceil(effectiveTime * 0.8);
        effectiveCost = isConsumable ? Math.ceil(effectiveCost * 0.75) : Math.ceil(effectiveCost * 0.9);
    }

    // Update Totals UI
    document.getElementById('dt-craft-total-days').textContent = `${effectiveTime} Days`;
    document.getElementById('dt-craft-total-gold').textContent = `${effectiveCost} gp`;

    // Process "Days Spent" vs "Total Required"
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    
    // Auto-cap input to max time needed to prevent over-spending
    if (daysSpent > effectiveTime) {
        daysSpent = effectiveTime;
        daysSpentEl.value = effectiveTime;
    }

    const totalLogged = daysSpent + travelDays;
    document.getElementById('dt-craft-logged-days').textContent = `${totalLogged} Day${totalLogged !== 1 ? 's' : ''}`;

    const submitBtn = document.getElementById('dt-craft-submit-btn');
    if (submitBtn) {
        if (daysSpent >= effectiveTime) {
            submitBtn.innerHTML = `<i class="fa-solid fa-hammer mr-2"></i> Complete Project`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-person-digging mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const executeCrafting = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-craft-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const cType = document.getElementById('dt-craft-type').value;
    let itemName = document.getElementById('dt-craft-item-name').value.trim();
    
    if (cType === 'healing_potion') {
        const hType = document.getElementById('dt-craft-healing-type').value;
        if (hType === 'healing') itemName = 'Potion of Healing';
        if (hType === 'greater') itemName = 'Potion of Greater Healing';
        if (hType === 'superior') itemName = 'Potion of Superior Healing';
        if (hType === 'supreme') itemName = 'Potion of Supreme Healing';
    }

    if (!itemName) { notify("Please enter the item name you are crafting.", "error"); return; }

    const isHarper = document.getElementById('dt-craft-harper').checked;
    const harperLoc = document.getElementById('dt-craft-harper-loc').value.trim();
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
    
    if (isHarper && !harperLoc) { notify("Please enter the Harper Safe House location.", "error"); return; }

    // Re-run the exact math logic to get the final target numbers
    let baseTime = 0, baseCost = 0, isConsumable = false;
    const isArtificer = document.getElementById('dt-craft-artificer').checked;
    const rarity = document.getElementById('dt-craft-rarity').value;

    if (cType === 'nonmagical') {
        const mCost = parseInt(document.getElementById('dt-craft-cost').value) || 0;
        baseTime = Math.max(1, Math.ceil(mCost / 10));
        baseCost = Math.ceil(mCost / 2);
    } else if (cType === 'healing_potion') {
        const hType = document.getElementById('dt-craft-healing-type').value;
        const healingData = { healing: { time: 1, cost: 25 }, greater: { time: 5, cost: 100 }, superior: { time: 15, cost: 1000 }, supreme: { time: 20, cost: 10000 } };
        baseTime = healingData[hType].time; baseCost = healingData[hType].cost; isConsumable = true;
    } else {
        isConsumable = cType === 'other_potion' ? true : document.getElementById('dt-craft-consumable').checked;
        const rarityData = { common: { workweeks: 1, cost: 50 }, uncommon: { workweeks: 2, cost: 200 }, rare: { workweeks: 10, cost: 2000 }, 'very-rare': { workweeks: 25, cost: 20000 }, legendary: { workweeks: 50, cost: 100000 } };
        baseTime = (isConsumable ? Math.max(1, Math.ceil(rarityData[rarity].workweeks / 2)) : rarityData[rarity].workweeks) * 5;
        baseCost = isConsumable ? Math.max(1, Math.ceil(rarityData[rarity].cost / 2)) : rarityData[rarity].cost;
    }

    let effectiveTime = baseTime, effectiveCost = baseCost;
    let applyArtificer = false;
    if (isArtificer) {
        if (cType === 'healing_potion' && (itemName.includes('Greater') || itemName === 'Potion of Healing')) applyArtificer = true;
        if ((cType === 'magic' || cType === 'other_potion') && (rarity === 'common' || rarity === 'uncommon')) applyArtificer = true;
    }
    if (applyArtificer) { effectiveTime = Math.ceil(baseTime * 0.25); effectiveCost = Math.ceil(baseCost * 0.5); }
    if (isHarper) { effectiveTime = Math.ceil(effectiveTime * 0.8); effectiveCost = isConsumable ? Math.ceil(effectiveCost * 0.75) : Math.ceil(effectiveCost * 0.9); }

    const daysSpent = parseInt(document.getElementById('dt-craft-days-spent').value) || 1;
    const totalDaysLogged = daysSpent + travelDays;
    const isComplete = daysSpent >= effectiveTime;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDaysLogged) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // Complication Roll (10% flat chance for magic items/potions)
    let complicationText = "";
    if (cType !== 'nonmagical') {
        const d100 = Math.floor(Math.random() * 100) + 1;
        if (d100 <= 10) {
            const d6 = Math.floor(Math.random() * 6) + 1;
            const compTable = [
                "Rumors swirl that what you’re working on is unstable and a threat to the community.",
                "Your tools are stolen, forcing you to buy new ones.",
                "A local wizard shows keen interest in your work and insists on observing you.",
                "A powerful noble offers a hefty price for your work and is not interested in hearing no for an answer.",
                "A dwarf clan accuses you of stealing its secret lore to fuel your work.",
                "A competitor spreads rumors that your work is shoddy and prone to failure."
            ];
            complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result:* ${compTable[d6 - 1]}`;
        } else {
            complicationText = `\n\n*No complications occurred (${d100}/100).*`;
        }
    }

    // Build the log text
    let resultHeader = `**Objective:** Crafting ${itemName}`;
    let resultBody = isComplete 
        ? `✅ **Project Completed!** You have successfully crafted the **${itemName}**.` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days working on the **${itemName}**. *(Remaining: ${effectiveTime - daysSpent} Days)*`;

    let modifiersNote = "";
    if (applyArtificer) modifiersNote += `\n*Magic Item Adept bonus applied.*`;
    if (isHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    let costNote = `**Total Project Material Cost:** ${effectiveCost} gp`;
    if (!isComplete) costNote += ` *(Materials must be purchased up front when starting a project).*`;

    const noteText = `**Downtime: Crafting an Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Work Days Logged:** ${daysSpent} Days (+${travelDays} Travel)\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDaysLogged),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime crafting with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hammer');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Crafting progress logged. ${totalDaysLogged} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};
