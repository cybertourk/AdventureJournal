import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';
import { MAGIC_ITEM_TABLES } from './data-roll-tables.js';

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

// --- ITEM BROWSER ENGINE ---
let ITEM_CACHE = [];

const buildItemCache = () => {
    if (ITEM_CACHE.length > 0) return;
    const itemMap = new Map();
    
    const getTableRarity = (tableLetter) => {
        switch(tableLetter) {
            case 'A': return 'common';
            case 'B': case 'F': return 'uncommon';
            case 'C': case 'G': return 'rare';
            case 'D': case 'H': return 'veryRare'; // Maps to our dropdown values
            case 'E': case 'I': return 'legendary';
            default: return 'uncommon';
        }
    };

    const isConsumable = (itemName) => {
        const n = itemName.toLowerCase();
        return n.includes("potion") || n.includes("scroll") || n.includes("ammunition") || 
               n.includes("arrow") || n.includes("bolt") || n.includes("dart") || 
               n.includes("bullet") || n.includes("needle") || n.includes("elixir") || 
               n.includes("oil") || n.includes("dust") || n.includes("solvent") || 
               n.includes("glue") || n.includes("ointment") || n.includes("feather token") || 
               n.includes("bean") || n.includes("bead");
    };

    // Scrape every item from the massive Xanathar's roll tables
    for (const [tableLetter, items] of Object.entries(MAGIC_ITEM_TABLES)) {
        const rarity = getTableRarity(tableLetter);
        items.forEach(row => {
            const itemName = row[2];
            if (!itemMap.has(itemName)) {
                itemMap.set(itemName, { name: itemName, rarity, consumable: isConsumable(itemName) });
            }
        });
    }
    
    // Sort alphabetically for the UI
    ITEM_CACHE = Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
                    
                    <div id="dt-sell-new-config" class="transition-all duration-300">
                        <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> and <b>25 gp</b> to find a buyer for a magic item. Your Persuasion check determines the final offer.</p>

                        <!-- Basic Setup -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                                <select id="dt-sell-pc" onchange="window.appActions.updateSellingMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner">
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
                            
                            <!-- ITEM BROWSER BUTTON -->
                            <div class="mb-4">
                                <button type="button" onclick="window.appActions.openSellItemBrowser()" class="w-full py-2 bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 transition text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm border border-[#d4c5a9] flex items-center justify-center">
                                    <i class="fa-solid fa-search mr-2"></i> Browse Magic Items
                                </button>
                            </div>

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
                                <div class="flex flex-col justify-end pb-2">
                                    <label class="flex items-center gap-2 cursor-pointer group mb-2">
                                        <input type="checkbox" id="dt-sell-consumable" onchange="window.appActions.updateSellingMath()" class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-emerald-700 transition">Is Consumable? (Halves Value)</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" id="dt-sell-rival" class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-emerald-700 transition">Is a rival involved?</span>
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

                    <!-- RESOLVE OFFER STEP -->
                    <div id="dt-sell-resolve-config" class="hidden transition-all duration-300">
                        <div class="bg-white border border-[#d4c5a9] rounded-sm p-5 shadow-sm mb-5">
                            <div class="text-center mb-6">
                                <h3 class="font-serif font-bold text-emerald-800 text-2xl mb-2"><i class="fa-solid fa-handshake mr-2 text-emerald-600"></i> An Offer is Made!</h3>
                                <p class="text-stone-700 text-sm leading-relaxed">After a week of searching and negotiating, you find a buyer interested in your <b id="dt-sell-res-item-name" class="text-stone-900">Item</b>.</p>
                                <div class="mt-4 bg-emerald-50 border border-emerald-200 py-3 px-4 rounded-sm shadow-inner inline-block mx-auto min-w-[200px]">
                                    <span class="block text-[10px] uppercase font-bold text-emerald-800 tracking-widest mb-1">Final Offer</span>
                                    <span id="dt-sell-res-offer-text" class="text-3xl font-black text-emerald-600">0 gp</span>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2 border-t border-[#d4c5a9] pt-4">
                                <div>
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Buyer's Name</label>
                                    <input type="text" id="dt-sell-res-buyer-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner" placeholder="e.g. Lord Neverember">
                                </div>
                                <div>
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Buyer's Location</label>
                                    <input type="text" id="dt-sell-res-buyer-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                                </div>
                            </div>
                        </div>

                        <!-- Hidden inputs to safely pass state between functions -->
                        <input type="hidden" id="dt-sell-res-d20">
                        <input type="hidden" id="dt-sell-res-total">
                        <input type="hidden" id="dt-sell-res-pmod">
                        <input type="hidden" id="dt-sell-res-final-offer">
                        <input type="hidden" id="dt-sell-res-quality">

                        <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Decide narratively if you wish to accept this deal. Your choice determines the final log entry.</p>
                    </div>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs" id="dt-sell-cancel-btn">Cancel</button>
                    
                    <button id="dt-sell-seek-btn" onclick="window.appActions.seekBuyer()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-search mr-2"></i> Seek Buyer</button>
                    
                    <button id="dt-sell-decline-btn" onclick="window.appActions.finalizeSale(false)" class="hidden px-4 py-2 bg-stone-300 text-stone-700 border border-stone-400 rounded-sm hover:bg-red-100 hover:text-red-800 hover:border-red-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs items-center shadow-sm"><i class="fa-solid fa-times mr-1.5"></i> Decline Offer</button>
                    <button id="dt-sell-accept-btn" onclick="window.appActions.finalizeSale(true)" class="hidden px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs items-center shadow-md"><i class="fa-solid fa-handshake mr-2"></i> Accept Sale</button>
                </div>
            </div>

            <!-- ITEM BROWSER OVERLAY -->
            <div id="dt-sell-item-modal" class="hidden absolute inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                    <div class="bg-stone-900 p-3 sm:p-4 border-b-2 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                        <h3 class="text-base font-serif font-bold flex items-center"><i class="fa-solid fa-search mr-2 text-emerald-500"></i> Item Browser</h3>
                        <button onclick="window.appActions.closeSellItemBrowser()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <div class="p-4 sm:p-5 flex-grow flex flex-col min-h-0 bg-[#fdfbf7]">
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="dt-sell-item-search" placeholder="Search Xanathar's Magic Items..." class="flex-grow p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" oninput="window.appActions.filterSellItems()">
                            <select id="dt-sell-item-rarity-filter" class="w-1/3 p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" onchange="window.appActions.filterSellItems()">
                                <option value="all">All Rarities</option>
                                <option value="common">Common</option>
                                <option value="uncommon">Uncommon</option>
                                <option value="rare">Rare</option>
                                <option value="veryRare">Very Rare</option>
                                <option value="legendary">Legendary</option>
                            </select>
                        </div>
                        <div id="dt-sell-item-list" class="flex-grow overflow-y-auto custom-scrollbar space-y-1 border border-[#d4c5a9] rounded-sm p-1 bg-white shadow-inner">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    setTimeout(() => {
        window.appActions.updateSellingMath('init');
    }, 50);
};

export const openSellItemBrowser = () => {
    buildItemCache();
    const modal = document.getElementById('dt-sell-item-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const searchInput = document.getElementById('dt-sell-item-search');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
        }
        window.appActions.filterSellItems(); 
    }
};

export const closeSellItemBrowser = () => {
    const modal = document.getElementById('dt-sell-item-modal');
    if (modal) modal.classList.add('hidden');
};

export const filterSellItems = () => {
    const searchInput = document.getElementById('dt-sell-item-search');
    const listEl = document.getElementById('dt-sell-item-list');
    const rarityFilter = document.getElementById('dt-sell-item-rarity-filter')?.value || 'all';

    if (!searchInput || !listEl) return;
    
    const query = searchInput.value.toLowerCase().trim();
    
    const filtered = ITEM_CACHE.filter(r => {
        const matchName = r.name.toLowerCase().includes(query);
        const matchRarity = rarityFilter === 'all' || r.rarity === rarityFilter;
        return matchName && matchRarity;
    });
    
    if (filtered.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-stone-500 italic p-4 text-center">No items found matching the criteria.</p>`;
        return;
    }

    let html = '';
    filtered.forEach(r => {
        const rarityColor = r.rarity === 'legendary' ? 'text-orange-600' : (r.rarity === 'veryRare' ? 'text-purple-600' : (r.rarity === 'rare' ? 'text-blue-600' : (r.rarity === 'uncommon' ? 'text-emerald-600' : 'text-stone-600')));
        
        // Escape apostrophes
        const safeName = r.name.replace(/'/g, "\\'");
        let displayRarity = r.rarity;
        if (displayRarity === 'veryRare') displayRarity = 'Very Rare';
        
        html += `
            <div class="flex justify-between items-center p-2 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors cursor-pointer group" onclick="window.appActions.selectSellItem('${safeName}', '${r.rarity}', ${r.consumable})">
                <div class="min-w-0 pr-2">
                    <span class="font-bold text-stone-800 text-sm block truncate group-hover:text-emerald-700 transition-colors">${r.name}</span>
                    <span class="text-[9px] uppercase font-bold tracking-widest ${rarityColor}">${displayRarity} ${r.consumable ? '<span class="text-stone-400 italic normal-case tracking-normal ml-1">(Consumable)</span>' : ''}</span>
                </div>
                <button class="shrink-0 px-3 py-1.5 bg-stone-200 text-stone-700 rounded-sm text-[9px] font-bold uppercase tracking-wider group-hover:bg-stone-800 group-hover:text-amber-50 transition shadow-sm border border-[#d4c5a9] group-hover:border-stone-700">Select</button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

export const selectSellItem = (name, rarity, isConsumable) => {
    window.appActions.closeSellItemBrowser();
    
    const nameEl = document.getElementById('dt-sell-item-name');
    if (nameEl) {
        nameEl.value = name;
        nameEl.disabled = true;
        nameEl.classList.add('bg-stone-200', 'text-stone-500');
        nameEl.classList.remove('bg-stone-50', 'text-stone-900');
    }
    
    const rarityEl = document.getElementById('dt-sell-rarity');
    if (rarityEl) {
        rarityEl.value = rarity;
        rarityEl.disabled = true;
        rarityEl.classList.add('bg-stone-200', 'text-stone-500');
        rarityEl.classList.remove('bg-stone-50', 'text-stone-900');
    }
    
    const consEl = document.getElementById('dt-sell-consumable');
    if (consEl) {
        consEl.checked = isConsumable;
        consEl.disabled = true;
    }

    const priceEl = document.getElementById('dt-sell-custom-price');
    if (priceEl) priceEl.value = ''; // Reset custom price

    window.appActions.updateSellingMath('input');
};

export const updateSellingMath = (triggerSource = 'input') => {
    // UNLOCK RECIPE FIELDS IF SWITCHING HEROES OR MANUALLY STARTING OVER
    if (triggerSource === 'init' || triggerSource === 'pc') {
        const nameEl = document.getElementById('dt-sell-item-name');
        const rarityEl = document.getElementById('dt-sell-rarity');
        const consEl = document.getElementById('dt-sell-consumable');
        
        if (nameEl) {
            nameEl.disabled = false;
            nameEl.classList.remove('bg-stone-200', 'text-stone-500');
            nameEl.classList.add('bg-stone-50', 'text-stone-900');
        }
        if (rarityEl) {
            rarityEl.disabled = false;
            rarityEl.classList.remove('bg-stone-200', 'text-stone-500');
            rarityEl.classList.add('bg-stone-50', 'text-stone-900');
        }
        if (consEl) {
            consEl.disabled = false;
        }
    }

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

// --- STEP 1: ROLL THE CHECK AND SHOW THE OFFER ---
export const seekBuyer = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-sell-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

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

    // Swap UI to Resolution Step
    document.getElementById('dt-sell-new-config').classList.add('hidden');
    document.getElementById('dt-sell-resolve-config').classList.remove('hidden');
    
    document.getElementById('dt-sell-seek-btn').classList.add('hidden');
    document.getElementById('dt-sell-decline-btn').classList.remove('hidden');
    document.getElementById('dt-sell-decline-btn').classList.add('flex');
    document.getElementById('dt-sell-accept-btn').classList.remove('hidden');
    document.getElementById('dt-sell-accept-btn').classList.add('flex');

    document.getElementById('dt-sell-res-item-name').textContent = itemName;
    document.getElementById('dt-sell-res-offer-text').textContent = `${finalOffer.toLocaleString()} gp`;

    // Store state in hidden fields for the final step
    document.getElementById('dt-sell-res-d20').value = d20;
    document.getElementById('dt-sell-res-total').value = checkTotal;
    document.getElementById('dt-sell-res-pmod').value = pMod;
    document.getElementById('dt-sell-res-final-offer').value = finalOffer;
    document.getElementById('dt-sell-res-quality').value = offerQuality;
};

// --- STEP 2: LOG THE ACCEPTANCE OR DECLINE ---
export const finalizeSale = async (isAccepted) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-sell-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const itemName = document.getElementById('dt-sell-item-name').value.trim();
    const isRival = document.getElementById('dt-sell-rival').checked;
    
    const d20 = parseInt(document.getElementById('dt-sell-res-d20').value);
    const checkTotal = parseInt(document.getElementById('dt-sell-res-total').value);
    const pMod = parseInt(document.getElementById('dt-sell-res-pmod').value);
    const finalOffer = parseInt(document.getElementById('dt-sell-res-final-offer').value);
    const offerQuality = document.getElementById('dt-sell-res-quality').value;

    let buyerName = "";
    let buyerLoc = "";

    if (isAccepted) {
        buyerName = document.getElementById('dt-sell-res-buyer-name').value.trim();
        buyerLoc = document.getElementById('dt-sell-res-buyer-loc').value.trim();

        if (!buyerName || !buyerLoc) {
            notify("Please enter the Buyer's Name and Location before accepting.", "error");
            return;
        }
    }

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            `Your enemy secretly arranges to buy the item to use it against you.${isRival ? " (Orchestrated by your rival)." : ""}`,
            `A thieves’ guild, alerted to the sale, attempts to steal your item.${isRival ? " (Alerted by your rival)." : ""}`,
            `A foe circulates rumors that your item is a fake.${isRival ? " (Rumor started by your rival)." : ""}`,
            "A sorcerer claims your item as a birthright and demands you hand it over.",
            "Your item’s previous owner, or surviving allies of the owner, vow to retake the item by force.",
            `The buyer is murdered before the sale is finalized.${isRival ? " (Murdered by your rival's agents)." : ""}`
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your efforts to sell the item proceed without incident.*`;
    }

    const resultHeader = `**Objective:** Selling a Magic Item (${itemName})`;
    let resultBody = "";

    if (isAccepted) {
        resultBody = `✅ **Sale Accepted! (${offerQuality})**\nYou successfully negotiated a deal and sold the ${itemName} to **${buyerName}** in ${buyerLoc} for **${finalOffer.toLocaleString()} gp**.\n\n*(Remember to add the gold and remove the item from your inventory manually.)*`;
    } else {
        resultBody = `❌ **Sale Declined. (${offerQuality})**\nYou were offered **${finalOffer.toLocaleString()} gp** for the ${itemName}, but decided to walk away from the deal.\n\n*(The 5 days of effort and 25 gp in expenses are still deducted from your downtime.)*`;
    }

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime negotiating the sale of a magic item with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-coins');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Selling attempt resolved. 5 days deducted from ${pc.name}. Log saved.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openSellingModal = openSellingModal;
    window.appActions.updateSellingMath = updateSellingMath;
    window.appActions.seekBuyer = seekBuyer;
    window.appActions.finalizeSale = finalizeSale;
    
    // Bind Browser Functions
    window.appActions.openSellItemBrowser = openSellItemBrowser;
    window.appActions.closeSellItemBrowser = closeSellItemBrowser;
    window.appActions.filterSellItems = filterSellItems;
    window.appActions.selectSellItem = selectSellItem;
}
