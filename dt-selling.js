import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 11. SELLING A MAGIC ITEM ---
// ============================================================================

const BASE_PRICES_BY_RARITY = {
    "common": 100,
    "uncommon": 400,
    "rare": 4000,
    "veryRare": 40000,
    "legendary": 200000
};

export const openSellingModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-coins mr-2 text-emerald-400"></i> Selling a Magic Item</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> and <b>25 gp</b> to find a buyer for a magic item. Your Persuasion check determines the final offer.</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-sell-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner">
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
                                <input type="number" id="dt-sell-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                                <input type="text" id="dt-sell-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner" placeholder="e.g. +1 Longsword">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Rarity</label>
                                <select id="dt-sell-rarity" onchange="window.appActions.updateSellingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner">
                                    <option value="common">Common (100 gp Base)</option>
                                    <option value="uncommon">Uncommon (400 gp Base)</option>
                                    <option value="rare">Rare (4,000 gp Base)</option>
                                    <option value="veryRare">Very Rare (40,000 gp Base)</option>
                                    <option value="legendary">Legendary (200,000 gp Base)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Base Price Override (gp)</label>
                                <input type="number" id="dt-sell-custom-price" min="0" oninput="window.appActions.updateSellingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner" placeholder="Leave at 0 to use rarity">
                            </div>
                            <div class="flex items-center pt-2 sm:pt-6">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="dt-sell-consumable" onchange="window.appActions.updateSellingMath()" class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-emerald-700 transition">Is Consumable? (Halves Value)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Potential Offers <span class="text-[9px] text-stone-500 font-normal lowercase tracking-normal">(Based on Persuasion Roll)</span></span>
                            <div class="flex gap-4 text-sm font-bold">
                                <span class="text-red-400" title="Roll < 11 (50%)"><i class="fa-solid fa-arrow-trend-down mr-1"></i> <span id="dt-sell-out-poor">50 gp</span></span>
                                <span class="text-amber-400" title="Roll 11-20 (100%)"><i class="fa-solid fa-minus mr-1"></i> <span id="dt-sell-out-normal">100 gp</span></span>
                                <span class="text-emerald-400" title="Roll 21+ (150%)"><i class="fa-solid fa-arrow-trend-up mr-1"></i> <span id="dt-sell-out-great">150 gp</span></span>
                            </div>
                        </div>
                        <div class="sm:text-right border-t sm:border-t-0 sm:border-l-2 border-stone-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-end shrink-0">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Required</span>
                            <span class="text-sm font-bold text-stone-300">5 Days & 25 gp <span class="text-[10px] font-normal italic">(Expenses)</span></span>
                        </div>
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeSelling()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-coins mr-2"></i> Seek Buyer</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateSellingMath, 50);
};

export const updateSellingMath = () => {
    const rarityEl = document.getElementById('dt-sell-rarity');
    const customPriceEl = document.getElementById('dt-sell-custom-price');
    const consumableEl = document.getElementById('dt-sell-consumable');
    
    const outPoor = document.getElementById('dt-sell-out-poor');
    const outNormal = document.getElementById('dt-sell-out-normal');
    const outGreat = document.getElementById('dt-sell-out-great');

    if (!rarityEl || !outPoor) return;

    const rarity = rarityEl.value;
    const customPrice = parseInt(customPriceEl.value) || 0;
    const isConsumable = consumableEl.checked;

    let basePrice = customPrice > 0 ? customPrice : (BASE_PRICES_BY_RARITY[rarity] || 0);
    if (isConsumable) {
        basePrice = Math.floor(basePrice / 2);
    }

    const offerPoor = Math.ceil(basePrice * 0.5);
    const offerNormal = basePrice;
    const offerGreat = Math.ceil(basePrice * 1.5);

    outPoor.textContent = `${offerPoor.toLocaleString()} gp`;
    outNormal.textContent = `${offerNormal.toLocaleString()} gp`;
    outGreat.textContent = `${offerGreat.toLocaleString()} gp`;
};

export const executeSelling = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-sell-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const itemName = document.getElementById('dt-sell-item-name').value.trim();
    if (!itemName) {
        notify("Please enter the name of the item you are trying to sell.", "error");
        return;
    }

    const pMod = parseInt(document.getElementById('dt-sell-mod').value) || 0;
    const rarity = document.getElementById('dt-sell-rarity').value;
    const customPrice = parseInt(document.getElementById('dt-sell-custom-price').value) || 0;
    const isConsumable = document.getElementById('dt-sell-consumable').checked;

    // --- MATH EXECUTION ---
    let basePrice = customPrice > 0 ? customPrice : (BASE_PRICES_BY_RARITY[rarity] || 0);
    if (isConsumable) basePrice = Math.floor(basePrice / 2);

    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + pMod;
    
    let offerMultiplier = 0.5;
    let offerQuality = "Poor Offer";
    if (checkTotal >= 21) {
        offerMultiplier = 1.5;
        offerQuality = "Great Offer";
    } else if (checkTotal >= 11) {
        offerMultiplier = 1.0;
        offerQuality = "Normal Offer";
    }

    const finalOffer = Math.ceil(basePrice * offerMultiplier);

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "Your enemy secretly arranges to buy the item to use it against you.",
            "A thieves’ guild, alerted to the sale, attempts to steal your item.",
            "A foe circulates rumors that your item is a fake.",
            "A sorcerer claims your item as a birthright and demands you hand it over.",
            "Your item’s previous owner, or surviving allies of the owner, vow to retake the item by force.",
            "The buyer is murdered before the sale is finalized."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your efforts to sell the item proceed without incident.*`;
    }

    const resultHeader = `**Objective:** Selling a Magic Item (${itemName})`;
    const resultBody = `✅ **${offerQuality}!**\nAfter a week of searching, you find a buyer willing to pay **${finalOffer.toLocaleString()} gp** for the ${itemName}.\n\n*(You may decide narratively whether to accept or decline this offer. If you accept, manually add the gold and remove the item from your inventory.)*`;

    const noteText = `**Downtime: Selling a Magic Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** 25 gp\n**Persuasion Check:** ${checkTotal} (Rolled ${d20} ${pMod >= 0 ? `+ ${pMod}` : `- ${Math.abs(pMod)}`})\n\n${resultBody}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - 5),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime seeking a buyer for a magic item with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-coins');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Selling attempt resolved. 5 days deducted from ${pc.name}. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openSellingModal = openSellingModal;
    window.appActions.updateSellingMath = updateSellingMath;
    window.appActions.executeSelling = executeSelling;
}
