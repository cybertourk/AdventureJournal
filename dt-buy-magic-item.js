import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 1. BUYING A MAGIC ITEM ---
// ============================================================================

export const openBuyMagicItemModal = () => {
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
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-gem mr-2 text-amber-400"></i> Buying a Magic Item</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-buy-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Persuasion Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-buy-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Time Spent Searching</label>
                            <select id="dt-buy-days" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="5">1 Workweek (5 Days)</option><option value="10">2 Workweeks (10 Days)</option><option value="15">3 Workweeks (15 Days)</option><option value="20">4 Workweeks (20 Days)</option><option value="25">5 Workweeks (25 Days)</option><option value="30">6 Workweeks (30 Days)</option><option value="35">7 Workweeks (35 Days)</option><option value="40">8 Workweeks (40 Days)</option><option value="45">9 Workweeks (45 Days)</option><option value="50">10 Workweeks (50 Days)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Gold Spent (Expenses)</label>
                            <select id="dt-buy-gold" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-amber-900 outline-none focus:border-blue-600 bg-amber-50 shadow-inner">
                                <option value="100">100 gp (+0)</option><option value="200">200 gp (+1)</option><option value="300">300 gp (+2)</option><option value="400">400 gp (+3)</option><option value="500">500 gp (+4)</option><option value="600">600 gp (+5)</option><option value="700">700 gp (+6)</option><option value="800">800 gp (+7)</option><option value="900">900 gp (+8)</option><option value="1000">1000 gp (+9)</option><option value="1100">1100 gp (+10)</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-5 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div class="flex items-center gap-2 mb-3">
                            <input type="checkbox" id="dt-buy-specific-toggle" onchange="const g = document.getElementById('dt-buy-specific-group'); g.classList.toggle('opacity-50'); g.classList.toggle('pointer-events-none');" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <label class="text-xs font-bold uppercase tracking-widest text-stone-800 cursor-pointer" for="dt-buy-specific-toggle">Seeking a Specific Item?</label>
                        </div>
                        <div id="dt-buy-specific-group" class="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none transition-opacity">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                                <input type="text" id="dt-buy-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm" placeholder="e.g. Flame Tongue">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rarity DC</label>
                                <select id="dt-buy-rarity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm">
                                    <option value="common">Common (DC 10)</option><option value="uncommon">Uncommon (DC 15)</option><option value="rare">Rare (DC 20)</option><option value="very-rare">Very Rare (DC 25)</option><option value="legendary">Legendary (DC 30)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">World Magic Level</label>
                            <select id="dt-buy-magic-lvl" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="none">Normal Settings (+0)</option><option value="low">Low Magic World (-10)</option><option value="high">High Magic World (+10)</option>
                            </select>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-2 rounded-sm shadow-sm flex flex-col justify-center">
                            <div class="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="dt-buy-harper-toggle" onchange="document.getElementById('dt-buy-harper-details').classList.toggle('hidden'); window.appActions.updateBuyMagicItemMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <label class="text-[10px] font-bold uppercase tracking-widest text-blue-900 cursor-pointer" for="dt-buy-harper-toggle">Harper Network Support</label>
                            </div>
                            <p class="text-[9px] text-blue-700 italic leading-snug">Doubles the bonus received from spending extra workweeks searching.</p>
                        </div>
                    </div>

                    <div id="dt-buy-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-buy-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-buy-harper-travel" value="0" min="0" oninput="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <div class="mt-6 bg-[#292524] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Calculated Roll Bonus</span>
                            <span id="dt-buy-bonus-out" class="text-2xl font-black text-emerald-400">+0</span>
                        </div>
                        <div class="text-right">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Downtime Required</span>
                            <span id="dt-buy-days-out" class="text-xl font-bold text-amber-400">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeBuyMagicItem()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice-d20 mr-2"></i> Execute Search</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateBuyMagicItemMath, 50);
};

export const updateBuyMagicItemMath = () => {
    const daysEl = document.getElementById('dt-buy-days');
    const goldEl = document.getElementById('dt-buy-gold');
    const modEl = document.getElementById('dt-buy-mod');
    const magicLvlEl = document.getElementById('dt-buy-magic-lvl');
    const harperToggle = document.getElementById('dt-buy-harper-toggle');
    const travelEl = document.getElementById('dt-buy-harper-travel');
    
    const bonusOut = document.getElementById('dt-buy-bonus-out');
    const daysOut = document.getElementById('dt-buy-days-out');

    if (!daysEl || !bonusOut) return;

    const days = parseInt(daysEl.value) || 0;
    const gold = parseInt(goldEl.value) || 0;
    const pMod = parseInt(modEl.value) || 0;
    
    const isHarper = harperToggle.checked;
    const travelDays = isHarper ? (parseInt(travelEl.value) || 0) : 0;
    const magicLvl = magicLvlEl.value;

    const workweeks = Math.floor(days / 5);
    let workweeksBonus = Math.max(0, workweeks - 1);
    if (isHarper) workweeksBonus *= 2;
    workweeksBonus = Math.min(10, workweeksBonus); 

    const goldBonus = Math.max(0, (gold - 100) / 100);
    
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + workweeksBonus + goldBonus + magicBonus;
    
    bonusOut.textContent = totalBonus >= 0 ? `+${totalBonus}` : `${totalBonus}`;
    
    const totalDays = days + travelDays;
    daysOut.textContent = `${totalDays} Day${totalDays !== 1 ? 's' : ''}`;
};

export const executeBuyMagicItem = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-buy-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const days = parseInt(document.getElementById('dt-buy-days').value) || 0;
    const gold = parseInt(document.getElementById('dt-buy-gold').value) || 0;
    const pMod = parseInt(document.getElementById('dt-buy-mod').value) || 0;
    const isSpecific = document.getElementById('dt-buy-specific-toggle').checked;
    const itemName = document.getElementById('dt-buy-item-name').value.trim();
    const itemRarity = document.getElementById('dt-buy-rarity').value;
    const isHarper = document.getElementById('dt-buy-harper-toggle').checked;
    const harperLoc = document.getElementById('dt-buy-harper-loc').value.trim();
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-buy-harper-travel').value) || 0) : 0;
    const totalDays = days + travelDays;

    if (isSpecific && !itemName) { notify("Please enter the specific item name you are searching for.", "error"); return; }
    if (isHarper && !harperLoc) { notify("Please enter the Harper Safe House location.", "error"); return; }

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDays) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const workweeks = Math.floor(days / 5);
    let workweeksBonus = Math.max(0, workweeks - 1);
    if (isHarper) workweeksBonus *= 2;
    workweeksBonus = Math.min(10, workweeksBonus); 
    const goldBonus = Math.max(0, (gold - 100) / 100);
    const magicLvl = document.getElementById('dt-buy-magic-lvl').value;
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + workweeksBonus + goldBonus + magicBonus;
    
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + totalBonus;
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    const hasComplication = d100 <= 10;
    
    let complicationText = "";
    if (hasComplication) {
        const d12 = Math.floor(Math.random() * 12) + 1;
        const compTable = [
            "The item is a fake.", "The item is stolen.", "The item is cursed.", "The item's original owner wants it back.",
            "The item is at the center of a dark prophecy.", "The seller is murdered.", "The seller is a devil.", 
            "The item is the key to freeing an evil entity.", "A third party bids on the item, doubling its price.", 
            "The item is an enslaved, intelligent entity.", "The item is tied to a cult.", "Enemies spread rumors that your work is evil."
        ];
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result:* ${compTable[d12 - 1]}`;
    } else {
        complicationText = `\n\n*No complications occurred during the search (${d100}/100).*`;
    }

    let resultHeader = "";
    let resultBody = "";

    if (isSpecific) {
        resultHeader = `**Objective:** Searching for ${itemName}`;
        const dcMap = { "common": 10, "uncommon": 15, "rare": 20, "very-rare": 25, "legendary": 30 };
        const dc = dcMap[itemRarity];
        
        if (checkTotal >= dc) {
            resultBody = `✅ **Success!** You found a seller for the **${itemName}** (DC ${dc}).`;
        } else {
            resultBody = `❌ **Failure.** You could not locate a seller for the **${itemName}** (DC ${dc}).`;
        }
    } else {
        resultHeader = `**Objective:** Searching for General Magic Items`;
        const itemTables = [
            { name: "Table A", req: 1 }, { name: "Table B", req: 6 },
            { name: "Table C", req: 11 }, { name: "Table D", req: 16 },
            { name: "Table E", req: 21 }, { name: "Table F", req: 26 },
            { name: "Table G", req: 31 }, { name: "Table H", req: 36 },
            { name: "Table I", req: 41 }
        ];
        
        const unlockedTables = itemTables.filter(t => checkTotal >= t.req);
        
        if (unlockedTables.length > 0) {
            const highestTable = unlockedTables[unlockedTables.length - 1].name;
            resultBody = `✅ **Success!** You unlocked items up to **${highestTable}**.\n*(Ask the DM to roll on the appropriate treasure tables).*`;
        } else {
            resultBody = `❌ **Failure.** Your search yielded no results.`;
        }
    }

    let modifiersNote = "";
    if (isHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    const noteText = `**Downtime: Buying a Magic Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** ${days} Days (+${travelDays} Travel)\n**Gold Spent (Expenses):** ${gold} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${totalBonus >= 0 ? `+ ${totalBonus}` : `- ${Math.abs(totalBonus)}`})\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDays),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime searching for magic items with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-gem');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Downtime complete! ${totalDays} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};
