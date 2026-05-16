import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// Import our centralized global roll tables
import { 
    MAGIC_ITEM_TABLES, 
    SCROLL_TABLES, 
    AMMUNITION_TABLE, 
    FIGURINE_TABLE, 
    MAGIC_ARMOR_TABLE, 
    MARINERS_ARMOR_TABLE, 
    MITHRAL_ARMOR_TABLE, 
    RESISTANCE_POTION_TABLE, 
    FEATHER_TOKEN_TABLE 
} from './data-roll-tables.js';

// --- CUSTOM CAMPAIGN PRICING ENGINE ---
const CUSTOM_PRICING = {
    "common": 50,
    "uncommon": 500,
    "rare": 5000,
    "very-rare": 50000,
    "legendary": 500000 // Assumed 10x scaling based on prior tiers
};

const getArmorBaseCost = (itemName) => {
    const n = itemName.toLowerCase();
    if (n.includes("plate armor") || (n.includes("armor") && n.includes("plate") && !n.includes("half") && !n.includes("breast"))) return 1500;
    if (n.includes("half plate")) return 750;
    if (n.includes("breastplate")) return 400;
    if (n.includes("splint")) return 200;
    if (n.includes("chain mail") || n.includes("efreeti chain") || n.includes("elven chain")) return 75;
    if (n.includes("scale mail") || n.includes("dragon scale")) return 50;
    if (n.includes("chain shirt")) return 50;
    if (n.includes("studded leather") || n.includes("glamoured studded")) return 45;
    if (n.includes("ring mail")) return 30;
    if (n.includes("hide")) return 10;
    if (n.includes("leather")) return 10;
    if (n.includes("padded")) return 5;
    if (n.includes("shield")) return 10;
    return 0;
};

const isConsumable = (itemName) => {
    const n = itemName.toLowerCase();
    return n.includes("potion") || n.includes("scroll") || n.includes("ammunition") || 
           n.includes("arrows") || n.includes("bolts") || n.includes("darts") || 
           n.includes("bullets") || n.includes("needles") || n.includes("elixir") || 
           n.includes("oil") || n.includes("dust") || n.includes("solvent") || 
           n.includes("glue") || n.includes("ointment") || n.includes("feather token") || 
           n.includes("bean") || n.includes("bead");
};

const getTableRarity = (tableLetter) => {
    switch(tableLetter) {
        case 'A': return 'common';
        case 'B': case 'F': return 'uncommon';
        case 'C': case 'G': return 'rare';
        case 'D': case 'H': return 'very-rare';
        case 'E': case 'I': return 'legendary';
        default: return 'uncommon';
    }
};

const calculateCustomPrice = (itemName, rarity) => {
    let base = CUSTOM_PRICING[rarity] || 500;
    if (isConsumable(itemName)) base = Math.floor(base / 2);
    base += getArmorBaseCost(itemName);
    return base;
};

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
                            <select id="dt-buy-pc" onchange="window.appActions.updateBuyMagicItemMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
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

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Time Spent Searching</label>
                            <select id="dt-buy-days" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="5">1 Workweek (5 Days)</option>
                                <option value="10">2 Workweeks (10 Days)</option>
                                <option value="15">3 Workweeks (15 Days)</option>
                                <option value="20">4 Workweeks (20 Days)</option>
                                <option value="25">5 Workweeks (25 Days)</option>
                                <option value="30">6 Workweeks (30 Days)</option>
                                <option value="35">7 Workweeks (35 Days)</option>
                                <option value="40">8 Workweeks (40 Days)</option>
                                <option value="45">9 Workweeks (45 Days)</option>
                                <option value="50">10 Workweeks (50 Days)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Gold Spent (Expenses)</label>
                            <select id="dt-buy-gold" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-amber-900 outline-none focus:border-blue-600 bg-amber-50 shadow-inner">
                                <option value="100">100 gp (+0)</option>
                                <option value="200">200 gp (+1)</option>
                                <option value="300">300 gp (+2)</option>
                                <option value="400">400 gp (+3)</option>
                                <option value="500">500 gp (+4)</option>
                                <option value="600">600 gp (+5)</option>
                                <option value="700">700 gp (+6)</option>
                                <option value="800">800 gp (+7)</option>
                                <option value="900">900 gp (+8)</option>
                                <option value="1000">1000 gp (+9)</option>
                                <option value="1100">1100 gp (+10)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Dynamic Cap Warning -->
                    <div id="dt-buy-cap-warning" class="hidden mb-5 bg-red-50 border border-red-200 p-2.5 rounded-sm flex items-center gap-2 shadow-sm animate-in">
                        <i class="fa-solid fa-triangle-exclamation text-red-600"></i>
                        <p id="dt-buy-cap-text" class="text-[9px] text-red-800 font-bold uppercase tracking-widest leading-snug">Time and Gold bonuses combined cannot exceed +10. Options exceeding this cap are disabled.</p>
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
                                    <option value="common">Common (DC 10)</option>
                                    <option value="uncommon">Uncommon (DC 15)</option>
                                    <option value="rare">Rare (DC 20)</option>
                                    <option value="very-rare">Very Rare (DC 25)</option>
                                    <option value="legendary">Legendary (DC 30)</option>
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

    setTimeout(() => { window.appActions.updateBuyMagicItemMath('init'); }, 50);
};

export const updateBuyMagicItemMath = (triggerSource = 'input') => {
    // --- AUTO-CALCULATE MODIFIER ---
    if (triggerSource === 'pc' || triggerSource === 'init') {
        const pcId = document.getElementById('dt-buy-pc')?.value;
        const camp = window.appData?.activeCampaign;
        const pc = camp?.playerCharacters?.find(p => p.id === pcId);

        if (pc) {
            const getAbilityMod = (score) => Math.floor(((parseInt(score) || 10) - 10) / 2);
            let pb = 2;
            if (pc.classLevel) {
                const levels = pc.classLevel.match(/\d+/g);
                if (levels) pb = Math.max(2, Math.ceil(levels.reduce((a, b) => a + parseInt(b), 0) / 4) + 1);
            }
            const chaMod = getAbilityMod(pc.cha);
            let isProf = false, isExp = false;
            const cleanSkill = 'persuasion';
            const profsStr = ((pc.skills || '') + ',' + (pc.proficiencies || '')).toLowerCase();
            const checkArr = profsStr.split(',').map(s => s.trim());
            const match = checkArr.find(s => s.includes(cleanSkill));
            if (match) {
                isProf = true;
                if (match.includes('expertise')) isExp = true;
            }
            const persMod = chaMod + (isExp ? pb * 2 : (isProf ? pb : 0));
            
            const modEl = document.getElementById('dt-buy-mod');
            if (modEl) modEl.value = persMod;
        }
    }

    const daysSelect = document.getElementById('dt-buy-days');
    const goldSelect = document.getElementById('dt-buy-gold');
    const modEl = document.getElementById('dt-buy-mod');
    const magicLvlEl = document.getElementById('dt-buy-magic-lvl');
    const harperToggle = document.getElementById('dt-buy-harper-toggle');
    const travelEl = document.getElementById('dt-buy-harper-travel');
    
    const bonusOut = document.getElementById('dt-buy-bonus-out');
    const daysOut = document.getElementById('dt-buy-days-out');
    const capWarning = document.getElementById('dt-buy-cap-warning');
    const capText = document.getElementById('dt-buy-cap-text');

    if (!daysSelect || !bonusOut) return;

    let currentDays = parseInt(daysSelect.value) || 5;
    let currentGold = parseInt(goldSelect.value) || 100;
    const pMod = parseInt(modEl.value) || 0;
    
    const isHarper = harperToggle.checked;
    const travelDays = isHarper ? (parseInt(travelEl.value) || 0) : 0;
    const magicLvl = magicLvlEl.value;

    const getDaysBonus = (d) => {
        let b = Math.max(0, Math.floor(d / 5) - 1);
        if (isHarper) b *= 2;
        return b;
    };
    
    const getGoldBonus = (g) => Math.max(0, Math.floor((g - 100) / 100));

    // 1. Force cap if current selection exceeds 10 (e.g., from toggling Harper Network on)
    let wasAdjusted = false;
    while (getDaysBonus(currentDays) + getGoldBonus(currentGold) > 10) {
        wasAdjusted = true;
        // Step down Gold first, as it is the more liquid resource
        if (currentGold > 100) {
            currentGold -= 100;
        } else if (currentDays > 5) {
            currentDays -= 5;
        }
    }

    if (wasAdjusted) {
        goldSelect.value = currentGold;
        daysSelect.value = currentDays;
    }

    const currentDaysBonus = getDaysBonus(currentDays);
    const currentGoldBonus = getGoldBonus(currentGold);
    const combinedEffortBonus = currentDaysBonus + currentGoldBonus;

    // 2. Display appropriate warning message
    if (capWarning && capText) {
        if (wasAdjusted) {
            capWarning.classList.remove('hidden');
            capText.textContent = "Values adjusted: Time and Gold bonuses combined cannot exceed +10.";
        } else if (combinedEffortBonus === 10) {
            capWarning.classList.remove('hidden');
            capText.textContent = "Maximum +10 combined search bonus reached. Options exceeding this cap are disabled.";
        } else {
            capWarning.classList.add('hidden');
        }
    }

    // 3. Disable options in the dropdowns that would illegally exceed the +10 cap
    Array.from(goldSelect.options).forEach(opt => {
        const g = parseInt(opt.value);
        opt.disabled = (getGoldBonus(g) + currentDaysBonus > 10);
    });
    
    Array.from(daysSelect.options).forEach(opt => {
        const d = parseInt(opt.value);
        opt.disabled = (getDaysBonus(d) + currentGoldBonus > 10);
    });

    // 4. Resolve final math
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + combinedEffortBonus + magicBonus;
    
    bonusOut.textContent = totalBonus >= 0 ? `+${totalBonus}` : `${totalBonus}`;
    
    const totalDays = currentDays + travelDays;
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

    let wBonus = Math.max(0, Math.floor(days / 5) - 1);
    if (isHarper) wBonus *= 2; 

    const goldBonus = Math.max(0, Math.floor((gold - 100) / 100));
    
    // Xanathar's Rule: Time and Money combined max at +10
    const combinedEffortBonus = Math.min(10, wBonus + goldBonus);
    
    const magicLvl = document.getElementById('dt-buy-magic-lvl').value;
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + combinedEffortBonus + magicBonus;
    
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + totalBonus;
    
    // XGtE Complication Roll (10% flat chance)
    const d100 = Math.floor(Math.random() * 100) + 1;
    const hasComplication = d100 <= 10;
    
    let complicationText = "";
    if (hasComplication) {
        const d12 = Math.floor(Math.random() * 12) + 1;
        const compTable = [
            "The item is a fake, planted by an enemy.",
            "The item is stolen by the party's enemies.",
            "The item is cursed by a god.",
            "The item's original owner will kill to reclaim it; the party's enemies spread news of its sale.",
            "The item is at the center of a dark prophecy.",
            "The seller is murdered before the sale.",
            "The seller is a devil looking to make a bargain.",
            "The item is the key to freeing an evil entity.",
            "A third party bids on the item, doubling its price.",
            "The item is an enslaved, intelligent entity.",
            "The item is tied to a cult.",
            "The party's enemies spread rumors that the item is an artifact of evil."
        ];
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result (d12=${d12}):* ${compTable[d12 - 1]}`;
    } else {
        complicationText = `\n\n*No complications occurred during the search (${d100}/100).*`;
    }

    let resultHeader = "";
    let resultBody = "";

    // --- NEW: Generate D&D Beyond Sync Tasks ---
    let newTasks = [];
    if (gold > 0) {
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Deduct ${gold} gp for magic item search expenses.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
    }

    if (isSpecific) {
        resultHeader = `**Objective:** Searching for ${itemName}`;
        const dcMap = { "common": 10, "uncommon": 15, "rare": 20, "very-rare": 25, "legendary": 30 };
        const dc = dcMap[itemRarity];
        
        if (checkTotal >= dc) {
            const finalPrice = calculateCustomPrice(itemName, itemRarity);
            resultBody = `✅ **Success!** You found a seller for the **${itemName}** (DC ${dc}).\n> Asking Price: **${finalPrice.toLocaleString()} gp**`;
            
            // Add purchase task
            newTasks.push({
                id: generateId(),
                text: `D&D Beyond Sync (${pc.name}): If purchased, deduct ${finalPrice.toLocaleString()} gp and add '${itemName}' to inventory.`,
                resolvedBy: [],
                visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
                timestamp: Date.now() + 1
            });
        } else {
            resultBody = `❌ **Failure.** You could not locate a seller for the **${itemName}** (DC ${dc}).`;
        }
    } else {
        resultHeader = `**Objective:** Searching for General Magic Items`;
        
        let tableLetter = 'A';
        let rollCount = 0;
        
        if (checkTotal >= 41) { tableLetter = 'I'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 36) { tableLetter = 'H'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 31) { tableLetter = 'G'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 26) { tableLetter = 'F'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 21) { tableLetter = 'E'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 16) { tableLetter = 'D'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 11) { tableLetter = 'C'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 6) { tableLetter = 'B'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 1) { tableLetter = 'A'; rollCount = Math.floor(Math.random() * 6) + 1; }
        
        if (rollCount > 0) {
            const foundItems = [];
            for (let i = 0; i < rollCount; i++) {
                const roll = Math.floor(Math.random() * 100) + 1;
                const tableData = MAGIC_ITEM_TABLES[tableLetter];
                let found = "Unknown Item";
                for (let r of tableData) {
                    if (roll >= r[0] && roll <= r[1]) {
                        found = r[2];
                        break;
                    }
                }
                
                // --- SUB-ROLL EVALUATION ---
                if (found === "Spell scroll (cantrip)" && SCROLL_TABLES['cantrip']) {
                    const spell = SCROLL_TABLES['cantrip'][Math.floor(Math.random() * SCROLL_TABLES['cantrip'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (1st level)" && SCROLL_TABLES['1st']) {
                    const spell = SCROLL_TABLES['1st'][Math.floor(Math.random() * SCROLL_TABLES['1st'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (2nd level)" && SCROLL_TABLES['2nd']) {
                    const spell = SCROLL_TABLES['2nd'][Math.floor(Math.random() * SCROLL_TABLES['2nd'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (3rd level)" && SCROLL_TABLES['3rd']) {
                    const spell = SCROLL_TABLES['3rd'][Math.floor(Math.random() * SCROLL_TABLES['3rd'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (4th level)" && SCROLL_TABLES['4th']) {
                    const spell = SCROLL_TABLES['4th'][Math.floor(Math.random() * SCROLL_TABLES['4th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (5th level)" && SCROLL_TABLES['5th']) {
                    const spell = SCROLL_TABLES['5th'][Math.floor(Math.random() * SCROLL_TABLES['5th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (6th level)" && SCROLL_TABLES['6th']) {
                    const spell = SCROLL_TABLES['6th'][Math.floor(Math.random() * SCROLL_TABLES['6th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (7th level)" && SCROLL_TABLES['7th']) {
                    const spell = SCROLL_TABLES['7th'][Math.floor(Math.random() * SCROLL_TABLES['7th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (8th level)" && SCROLL_TABLES['8th']) {
                    const spell = SCROLL_TABLES['8th'][Math.floor(Math.random() * SCROLL_TABLES['8th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found === "Spell scroll (9th level)" && SCROLL_TABLES['9th']) {
                    const spell = SCROLL_TABLES['9th'][Math.floor(Math.random() * SCROLL_TABLES['9th'].length)];
                    found = `Spell scroll (${spell})`;
                } else if (found.startsWith("Ammunition, +")) {
                    const bonus = found.split("+")[1];
                    const ammoType = AMMUNITION_TABLE[Math.floor(Math.random() * AMMUNITION_TABLE.length)];
                    found = `${ammoType}, +${bonus}`;
                } else if (found === "Figurine of wondrous power (roll d8)") {
                    const fig = FIGURINE_TABLE[Math.floor(Math.random() * FIGURINE_TABLE.length)];
                    found = `Figurine of wondrous power (${fig})`;
                } else if (found === "Magic armor (roll d12)") {
                    const arm = MAGIC_ARMOR_TABLE[Math.floor(Math.random() * MAGIC_ARMOR_TABLE.length)];
                    found = arm;
                } else if (found === "Mariner's armor") {
                    const armor = MARINERS_ARMOR_TABLE[Math.floor(Math.random() * MARINERS_ARMOR_TABLE.length)];
                    found = `Mariner's ${armor}`;
                } else if (found === "Mithral armor") {
                    const armor = MITHRAL_ARMOR_TABLE[Math.floor(Math.random() * MITHRAL_ARMOR_TABLE.length)];
                    found = `Mithral ${armor}`;
                } else if (found === "Potion of resistance") {
                    const res = RESISTANCE_POTION_TABLE[Math.floor(Math.random() * RESISTANCE_POTION_TABLE.length)];
                    found = `Potion of ${res} Resistance`;
                } else if (found === "Quaal's feather token") {
                    const token = FEATHER_TOKEN_TABLE[Math.floor(Math.random() * FEATHER_TOKEN_TABLE.length)];
                    found = `Quaal's Feather Token (${token})`;
                }
                
                foundItems.push(found);
            }
            
            const counts = {};
            foundItems.forEach(i => counts[i] = (counts[i] || 0) + 1);
            
            let itemsStr = "";
            const baseRarity = getTableRarity(tableLetter);
            Object.keys(counts).forEach(k => {
                const price = calculateCustomPrice(k, baseRarity);
                itemsStr += `\n> • **${k}**` + (counts[k] > 1 ? ` (x${counts[k]})` : '') + ` - *Asking Price: ${price.toLocaleString()} gp*`;
            });
            
            resultBody = `✅ **Success!** You found a seller offering the following items (Table ${tableLetter}):${itemsStr}`;
            
            // Add general purchase task
            newTasks.push({
                id: generateId(),
                text: `D&D Beyond Sync (${pc.name}): Review search results. Deduct gold and add any purchased magic items to your inventory.`,
                resolvedBy: [],
                visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
                timestamp: Date.now() + 1
            });
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

    let updatedCamp = { 
        ...camp, 
        playerCharacters: updatedPCs,
        sheetUpdates: [...(camp.sheetUpdates || []), ...newTasks]
    };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime searching for magic items with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-gem');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Downtime complete! ${totalDays} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};
