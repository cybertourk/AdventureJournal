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

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

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
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
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

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-sell-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-sell-m" onchange="window.updateDayOptions(this.value, 'dt-sell-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-sell-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
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
                        <div class="sm:text-right border-t sm:border-t-0 sm:border-l-2 border-stone-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-end">
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

    const itemName = document.getElementById('dt-sell-item-name').value.trim();
    if (!itemName) {
        notify("Please enter the name of the item you are trying to sell.", "error");
        return;
    }

    const pMod = parseInt(document.getElementById('dt-sell-mod').value) || 0;
    const rarity = document.getElementById('dt-sell-rarity').value;
    const customPrice = parseInt(document.getElementById('dt-sell-custom-price').value) || 0;
    const isConsumable = document.getElementById('dt-sell-consumable').checked;

    const igY = parseInt(document.getElementById('dt-sell-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-sell-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-sell-d').value, 10) || camp.calendar.currentDay || 1;

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime seeking a buyer for a magic item with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-coins');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Selling attempt resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- 12. TRAINING ---
// ============================================================================

const TRAINING_SUBJECTS = {
    languages: {
        common: { common: "Common", dwarvish: "Dwarvish", elvish: "Elvish", giant: "Giant", gnomish: "Gnomish", goblin: "Goblin", halfling: "Halfling", orc: "Orc" },
        exotic: { abyssal: "Abyssal", celestial: "Celestial", draconic: "Draconic", deep: "Deep Speech", infernal: "Infernal", primordial: "Primordial", sylvan: "Sylvan", undercommon: "Undercommon" },
        rare: { aarakocra: "Aarakocra", cant: "Thieves' Cant", druidic: "Druidic", gith: "Gith", khuzdul: "Khuzdul", sahuagin: "Sahuagin", telepathy: "Telepathy", thriKreen: "Thri-kreen" }
    },
    tools: {
        artisan: { alchemist: "Alchemist's Supplies", brewer: "Brewer's Supplies", calligrapher: "Calligrapher's Supplies", carpenter: "Carpenter's Tools", cartographer: "Cartographer's Tools", cobbler: "Cobbler's Tools", cook: "Cook's Utensils", glassblower: "Glassblower's Tools", jeweler: "Jeweler's Tools", leatherworker: "Leatherworker's Tools", mason: "Mason's Tools", painter: "Painter's Supplies", potter: "Potter's Tools", smith: "Smith's Tools", tinker: "Tinker's Tools", weaver: "Weaver's Tools", woodcarver: "Woodcarver's Tools" },
        gaming: { dice: "Dice Set", chess: "Dragonchess Set", card: "Playing Card Set", pdragon: "Three-Dragon Ante Set" },
        instruments: { bagpipes: "Bagpipes", drum: "Drum", dulcimer: "Dulcimer", flute: "Flute", lute: "Lute", lyre: "Lyre", horn: "Horn", pan: "Pan Flute", shawm: "Shawm", viol: "Viol" },
        vehicles: { air: "Air Vehicles", land: "Land Vehicles", space: "Space Vehicles", water: "Water Vehicles" },
        other: { disg: "Disguise Kit", forg: "Forgery Kit", herb: "Herbalism Kit", navg: "Navigator's Tools", pois: "Poisoner's Kit", thief: "Thieves' Tools" }
    }
};

const buildSubjectOptions = () => {
    let html = '';
    
    html += `<optgroup label="--- Common Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.common).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Exotic Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.exotic).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Rare & Secret Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.rare).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Artisan's Tools ---">`;
    Object.values(TRAINING_SUBJECTS.tools.artisan).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Gaming Sets ---">`;
    Object.values(TRAINING_SUBJECTS.tools.gaming).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Musical Instruments ---">`;
    Object.values(TRAINING_SUBJECTS.tools.instruments).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Vehicles ---">`;
    Object.values(TRAINING_SUBJECTS.tools.vehicles).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Other Tools & Kits ---">`;
    Object.values(TRAINING_SUBJECTS.tools.other).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Custom ---">`;
    html += `<option value="custom">Custom Tool / Language (Type below)</option>`;
    html += `</optgroup>`;
    
    return html;
};

export const openTrainingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-fuchsia-700 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-graduation-cap mr-2 text-fuchsia-400"></i> Training</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend downtime to learn a new language or tool proficiency. The base time is 10 workweeks (50 days), reduced by your Intelligence modifier.</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-train-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Intelligence Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-train-int" value="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-train-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-train-m" onchange="window.updateDayOptions(this.value, 'dt-train-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-train-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Subject of Study</label>
                            <select id="dt-train-subject" onchange="const c = document.getElementById('dt-train-custom'); if(this.value === 'custom') c.classList.remove('hidden'); else c.classList.add('hidden');" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner">
                                ${buildSubjectOptions()}
                            </select>
                            <input type="text" id="dt-train-custom" class="hidden w-full p-2 mt-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Sylvan, Herbalism Kit...">
                        </div>

                        <div class="border-t border-[#d4c5a9] pt-3 mt-3">
                            <h4 class="text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-solid fa-user-graduate mr-1"></i> Instructor Details</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Name</label>
                                    <input type="text" id="dt-train-inst-name" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elara">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Species / Race</label>
                                    <input type="text" id="dt-train-inst-species" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elf">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Location</label>
                                    <input type="text" id="dt-train-inst-loc" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm mb-4">
                        <label class="flex items-center gap-2 cursor-pointer group mb-1">
                            <input type="checkbox" id="dt-train-harper" onchange="document.getElementById('dt-train-harper-details').classList.toggle('hidden'); window.appActions.updateTrainingMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                        </label>
                        <p class="text-[9px] text-blue-700 italic leading-snug">The Harpers' network reduces training time by two workweeks (does not reduce gold cost). Requires travel to a safe house.</p>
                    </div>

                    <div id="dt-train-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-train-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-train-travel" value="0" min="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Requirements</span>
                            <div class="text-right">
                                <span id="dt-train-total-days" class="text-sm font-bold text-emerald-400 mr-3">50 Days</span>
                                <span id="dt-train-total-gold" class="text-sm font-bold text-amber-400">250 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Work Days Spent <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-train-days-spent" value="5" min="1" step="5" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Complication Risk</span>
                                <span id="dt-train-risk" class="text-xl font-bold text-red-500">10%</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Checked automatically</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-train-submit-btn" onclick="window.appActions.executeTraining()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-graduation-cap mr-2"></i> Log Training</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateTrainingMath, 50);
};

export const updateTrainingMath = () => {
    const intModEl = document.getElementById('dt-train-int');
    const harperEl = document.getElementById('dt-train-harper');
    const daysSpentEl = document.getElementById('dt-train-days-spent');
    
    if (!intModEl || !harperEl || !daysSpentEl) return;

    const intMod = parseInt(intModEl.value) || 0;
    const hasHarper = harperEl.checked;
    
    // Core Math
    const baseWorkweeks = Math.max(1, 10 - intMod);
    const goldCost = baseWorkweeks * 25; // Gold is based strictly on the un-Harper-modified time!
    
    const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
    const effectiveTime = timeWorkweeks * 5;

    // Update Requirements UI
    document.getElementById('dt-train-total-days').textContent = `${effectiveTime} Day${effectiveTime !== 1 ? 's' : ''}`;
    document.getElementById('dt-train-total-gold').textContent = `${goldCost.toLocaleString()} gp`;

    // Cap progress to max required time
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    if (daysSpent > effectiveTime) {
        daysSpent = effectiveTime;
        daysSpentEl.value = effectiveTime;
    }

    // 10% complication risk per workweek (5 days) spent DURING THIS LOG
    const workweeksSpent = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeksSpent * 10);
    document.getElementById('dt-train-risk').textContent = `${risk}%`;

    // Button Toggle
    const submitBtn = document.getElementById('dt-train-submit-btn');
    if (submitBtn) {
        if (daysSpent >= effectiveTime) {
            submitBtn.innerHTML = `<i class="fa-solid fa-graduation-cap mr-2"></i> Complete Training`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-book-reader mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const executeTraining = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-train-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    let subject = document.getElementById('dt-train-subject').value;
    if (subject === 'custom') subject = document.getElementById('dt-train-custom').value.trim();
    
    if (!subject) {
        notify("Please specify the subject you are training.", "error");
        return;
    }

    const instName = document.getElementById('dt-train-inst-name').value.trim();
    const instSpecies = document.getElementById('dt-train-inst-species').value.trim();
    const instLoc = document.getElementById('dt-train-inst-loc').value.trim();

    if (!instName || !instSpecies || !instLoc) {
        notify("Please provide the Instructor's Name, Species, and Location.", "error");
        return;
    }

    const intMod = parseInt(document.getElementById('dt-train-int').value) || 0;
    const hasHarper = document.getElementById('dt-train-harper').checked;
    const travelDays = hasHarper ? (parseInt(document.getElementById('dt-train-travel').value) || 0) : 0;
    const harperLoc = document.getElementById('dt-train-harper-loc').value.trim();

    if (hasHarper && !harperLoc) {
        notify("Please enter the Harper Safe House location.", "error");
        return;
    }

    // Mathematical calculations
    const baseWorkweeks = Math.max(1, 10 - intMod);
    const goldCost = baseWorkweeks * 25; 
    const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
    const effectiveTime = timeWorkweeks * 5;

    const daysSpent = parseInt(document.getElementById('dt-train-days-spent').value) || 1;
    const isComplete = daysSpent >= effectiveTime;
    const totalDaysLogged = daysSpent + travelDays;

    const igY = parseInt(document.getElementById('dt-train-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-train-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-train-d').value, 10) || camp.calendar.currentDay || 1;

    // --- MATH EXECUTION ---

    // Complication Roll (10% chance per workweek actually spent in this log)
    let complicationText = ``;
    const workweeksSpent = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeksSpent * 10);
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= risk) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "Your instructor disappears, forcing you to spend one workweek finding a new one.", 
            "Your teacher instructs you in rare, archaic methods, which draw comments from others.", 
            "Your teacher is a spy sent to learn your plans.", 
            "Your teacher is a wanted criminal.", 
            "Your teacher is a cruel taskmaster.", 
            "Your teacher asks for help dealing with a threat."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100 vs ${risk}% Risk)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose during your training (${d100}/100).*`;
    }

    // Build the log text
    let resultHeader = `**Objective:** Training (${subject})`;
    let resultBody = isComplete 
        ? `✅ **Training Completed!** You have successfully gained proficiency in **${subject}**.\n*(Be sure to add the proficiency to your character sheet!)*` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days training in **${subject}**. *(Remaining: ${effectiveTime - daysSpent} Days)*`;

    let modifiersNote = "";
    if (hasHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    let costNote = `**Total Project Material Cost:** ${goldCost.toLocaleString()} gp`;
    if (!isComplete) costNote += ` *(Costs must be paid up front when starting a project).*`;

    const noteText = `**Downtime: Training**\n*Hero:* ${pc.name}\n\n${resultHeader}\n**Instructor:** ${instName} (${instSpecies}) at ${instLoc}\n\n**Work Days Logged:** ${daysSpent} Days (+${travelDays} Travel)\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: totalDaysLogged, repeatsYearly: false, category: 'Downtime'
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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime training with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-graduation-cap');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Training progress logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- 13. WORK ---
// ============================================================================

export const openWorkModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-orange-700 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-briefcase mr-2 text-orange-500"></i> Work</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> performing a job. Make an ability check to determine your earnings and lifestyle coverage.</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-work-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-work-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-work-m" onchange="window.updateDayOptions(this.value, 'dt-work-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-work-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Job Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type of Work</label>
                                <input type="text" id="dt-work-type" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. Bouncer, Blacksmith, Performer">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Skill / Tool Used</label>
                                <input type="text" id="dt-work-skill-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. Athletics, Smith's Tools, Lute">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Workplace</label>
                                <input type="text" id="dt-work-workplace" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. The Yawning Portal">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location (City/Town)</label>
                                <input type="text" id="dt-work-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Notes (Optional)</label>
                            <input type="text" id="dt-work-notes" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="Any special context for this job...">
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifier</h3>
                    <div class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-4 flex gap-4 items-center">
                        <div class="flex-grow">
                            <p class="text-[10px] text-stone-500 italic leading-snug">Enter your total modifier for the check. Typically, manual labor uses Athletics, acrobatics uses Acrobatics, and entertaining uses Performance or a Musical Instrument. Crafting items uses Artisan's Tools.</p>
                        </div>
                        <div class="w-1/3 shrink-0">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest text-center">Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-work-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Potential Wages <span class="text-[9px] text-stone-500 font-normal lowercase tracking-normal">(Based on Check)</span></span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-bold">
                                <span class="text-stone-400" title="Roll 9 or lower"><i class="fa-solid fa-arrow-down mr-1"></i> < 10 : <span class="text-amber-500 ml-1">Poor (or 1 gp)</span></span>
                                <span class="text-stone-300" title="Roll 10 to 14"><i class="fa-solid fa-minus mr-1"></i> 10-14 : <span class="text-amber-500 ml-1">Modest (or 5 gp)</span></span>
                                <span class="text-emerald-400" title="Roll 15 to 20"><i class="fa-solid fa-arrow-up mr-1"></i> 15-20 : <span class="text-amber-500 ml-1">Comfortable (or 10 gp)</span></span>
                                <span class="text-amber-400" title="Roll 21 or higher"><i class="fa-solid fa-star mr-1"></i> 21+ : <span class="text-amber-500 ml-1">Comfortable + 25 gp</span></span>
                            </div>
                        </div>
                        <div class="sm:text-right border-t sm:border-t-0 sm:border-l-2 border-stone-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-end shrink-0">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Required</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be added to your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeWork()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-briefcase mr-2"></i> Work for a Week</button>
                </div>
            </div>
        </div>
    `;
};

export const executeWork = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-work-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const workType = document.getElementById('dt-work-type').value.trim();
    const skillName = document.getElementById('dt-work-skill-name').value.trim();
    const workplace = document.getElementById('dt-work-workplace').value.trim();
    const loc = document.getElementById('dt-work-loc').value.trim();
    const notes = document.getElementById('dt-work-notes').value.trim();

    if (!workType || !workplace || !loc || !skillName) {
        notify("Please enter the Type of Work, Skill Used, Workplace, and Location.", "error");
        return;
    }

    const modifier = parseInt(document.getElementById('dt-work-mod').value) || 0;

    const igY = parseInt(document.getElementById('dt-work-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-work-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-work-d').value, 10) || camp.calendar.currentDay || 1;

    // --- MATH EXECUTION ---
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + modifier;

    let lifestyleText = "";
    let cashValue = 0;

    if (checkTotal <= 9) {
        lifestyleText = "a **Poor lifestyle** for the week";
        cashValue = 1; 
    } else if (checkTotal <= 14) {
        lifestyleText = "a **Modest lifestyle** for the week";
        cashValue = 5; 
    } else if (checkTotal <= 20) {
        lifestyleText = "a **Comfortable lifestyle** for the week";
        cashValue = 10; 
    } else {
        lifestyleText = "a **Comfortable lifestyle** for the week, plus an extra 25 gp";
        cashValue = 35; 
    }

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "A difficult customer or a fight with a coworker reduces the wages you earn by one category.",
            "Your employer’s financial difficulties result in your not being paid.",
            "A coworker with ties to an important family in town takes a dislike to you.",
            "Your employer is involved with a dark cult or a criminal enterprise.",
            "A crime ring targets your business for extortion.",
            "You gain a reputation for laziness (unjustified or not, as you choose), giving you disadvantage on checks made for this downtime activity for the next six workweeks you devote to it."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your work week passes uneventfully.*`;
    }

    const resultHeader = `**Objective:** Working as a ${workType}`;
    
    let resultBody = `**Wages Earned:**\nYour work was sufficient to cover ${lifestyleText}.\n\n*Alternatively, you can collect your pay as **${cashValue} gp**.*\n*(Remember to handle lifestyle costs or add the gold to your sheet manually.)*`;
    
    if (notes) {
        resultBody = `*Notes: ${notes}*\n\n` + resultBody;
    }

    const noteText = `**Downtime: Work**\n*Hero:* ${pc.name}\n\n${resultHeader}\n**Location:** ${workplace} in ${loc}\n**Time Spent:** 5 Days\n\n**${skillName} Check:** ${checkTotal} (Rolled ${d20} ${modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`})\n\n${resultBody}${complicationText}`;

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime working in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-briefcase');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Work resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- 14. DM ASSIGN DOWNTIME ---
// ============================================================================

export const openAssignDowntimeModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) {
        notify("Only the DM can assign downtime days.", "error");
        return;
    }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    const validPCs = camp.playerCharacters || [];
    if (validPCs.length === 0) { 
        notify("There are no heroes enrolled in this campaign.", "error"); 
        return; 
    }

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-500 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hourglass-half mr-2 text-amber-400"></i> Assign Downtime Days</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Grant downtime days to the party, or make an administrative adjustment to a specific hero's balance.</p>

                    <!-- Target Selection -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Assignment Target</label>
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="dt-assign-target" value="all" checked onchange="document.getElementById('dt-assign-pc-wrapper').classList.add('hidden')" class="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer">
                                <span class="text-xs font-bold text-stone-700 group-hover:text-amber-700 transition">Entire Party</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="dt-assign-target" value="specific" onchange="document.getElementById('dt-assign-pc-wrapper').classList.remove('hidden')" class="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer">
                                <span class="text-xs font-bold text-stone-700 group-hover:text-amber-700 transition">Specific Hero</span>
                            </label>
                        </div>
                        
                        <div id="dt-assign-pc-wrapper" class="hidden mt-2 pt-2 border-t border-[#d4c5a9]">
                            <select id="dt-assign-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-stone-50 shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Type & Amount -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div class="bg-stone-50 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Adjustment Type</label>
                            <select id="dt-assign-type" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm">
                                <option value="add">Add Downtime (+)</option>
                                <option value="subtract">Deduct / Remove (-)</option>
                            </select>
                        </div>
                        <div class="bg-stone-50 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Number of Days</label>
                            <input type="number" id="dt-assign-days" value="5" min="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-sm">
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Date of Assignment</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-assign-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-assign-m" onchange="window.updateDayOptions(this.value, 'dt-assign-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-assign-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Reason / Notes</label>
                        <input type="text" id="dt-assign-reason" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner" placeholder="e.g. Returned to Waterdeep, Between adventures...">
                    </div>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeAssignDowntime()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-check mr-2"></i> Confirm Assignment</button>
                </div>
            </div>
        </div>
    `;
};

export const executeAssignDowntime = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const targetType = document.querySelector('input[name="dt-assign-target"]:checked').value;
    const pcId = document.getElementById('dt-assign-pc').value;
    const adjustType = document.getElementById('dt-assign-type').value;
    const daysInput = parseInt(document.getElementById('dt-assign-days').value) || 0;
    const reason = document.getElementById('dt-assign-reason').value.trim();

    if (daysInput <= 0) {
        notify("Please enter a valid number of days.", "error");
        return;
    }

    const actualDays = adjustType === 'add' ? daysInput : -daysInput;
    let namesAffected = [];

    // Update PC balances
    const updatedPCs = camp.playerCharacters.map(pc => {
        if (targetType === 'all' || pc.id === pcId) {
            namesAffected.push(pc.name);
            let current = parseInt(pc.availableDowntime) || 0;
            let newBalance = current + actualDays;
            return { ...pc, availableDowntime: newBalance };
        }
        return pc;
    });

    if (namesAffected.length === 0) return;

    const actionWord = adjustType === 'add' ? 'Granted' : 'Deducted';
    let targetStr = targetType === 'all' ? 'the Entire Party' : namesAffected[0];
    
    let resultBody = `The Dungeon Master ${actionWord.toLowerCase()} **${daysInput} Downtime Day${daysInput !== 1 ? 's' : ''}** for ${targetStr}.`;
    if (reason) {
        resultBody += `\n\n*Reason: ${reason}*`;
    }

    const noteText = `**DM Assignment: Downtime**\n\n${resultBody}`;

    const igY = parseInt(document.getElementById('dt-assign-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-assign-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-assign-d').value, 10) || camp.calendar.currentDay || 1;

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), 
        text: noteText, 
        authorId: camp.dmId, 
        visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), 
        duration: 1, 
        repeatsYearly: false, 
        category: 'Downtime'
    };

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    // Log to Activity Log so the party sees it
    const logMsg = `<span class="font-bold text-amber-700">The Dungeon Master</span> ${actionWord.toLowerCase()} ${daysInput} Downtime Day(s) for ${targetStr}.`;
    
    const newLog = {
        id: generateId(),
        timestamp: Date.now(),
        text: logMsg,
        icon: 'fa-hourglass-half'
    };
    
    updatedCamp.activityLog = [newLog, ...(updatedCamp.activityLog || [])].slice(0, 100);

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Downtime ${actionWord.toLowerCase()} successfully.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    // Binding the new Magic Item logic
    window.appActions.openSellingModal = openSellingModal;
    window.appActions.updateSellingMath = updateSellingMath;
    window.appActions.executeSelling = executeSelling;
    
    // Binding the new Training logic
    window.appActions.openTrainingModal = openTrainingModal;
    window.appActions.updateTrainingMath = updateTrainingMath;
    window.appActions.executeTraining = executeTraining;

    // Binding the new Work logic
    window.appActions.openWorkModal = openWorkModal;
    window.appActions.executeWork = executeWork;
    
    // Binding the DM Assign Downtime logic
    window.appActions.openAssignDowntimeModal = openAssignDowntimeModal;
    window.appActions.executeAssignDowntime = executeAssignDowntime;
}
