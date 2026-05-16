import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';
import { MAGIC_ITEM_TABLES } from './data-roll-tables.js'; 

// ============================================================================
// --- 3. CRAFTING AN ITEM ---
// ============================================================================

// --- RECIPE BROWSER ENGINE ---
let RECIPE_CACHE = [];

const buildRecipeCache = () => {
    if (RECIPE_CACHE.length > 0) return;
    const itemMap = new Map();
    
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
            // If the item appears on multiple tables, keep the highest rarity version (or first found)
            if (!itemMap.has(itemName)) {
                const cons = isConsumable(itemName);
                const isPotion = itemName.toLowerCase().includes("potion") || itemName.toLowerCase().includes("elixir") || itemName.toLowerCase().includes("oil");
                const type = isPotion ? 'other_potion' : 'magic';
                itemMap.set(itemName, { name: itemName, rarity, type, consumable: cons });
            }
        });
    }
    
    // Sort alphabetically for the UI
    RECIPE_CACHE = Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

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
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-craft-pc" onchange="window.appActions.updateCraftingMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-amber-700 font-bold mb-1 tracking-widest"><i class="fa-solid fa-book-open mr-1"></i> Active Projects</label>
                            <div class="flex gap-2">
                                <select id="dt-craft-project" onchange="window.appActions.updateCraftingMath('project')" class="flex-grow p-2 border border-amber-300 rounded-sm text-sm font-bold text-amber-900 outline-none focus:border-amber-600 bg-amber-50 shadow-inner">
                                    <option value="new">-- Start New Project --</option>
                                    <!-- Populated dynamically via JS -->
                                </select>
                                <button type="button" id="dt-craft-abandon-btn" onclick="window.appActions.abandonCraftingProject()" class="hidden px-3 py-2 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 rounded-sm transition" title="Abandon Project"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- New Project Fields (Hidden if resuming) -->
                    <div id="dt-craft-new-config" class="mb-5 bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm transition-all duration-300">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Project Type</label>
                                <select id="dt-craft-type" onchange="window.appActions.updateCraftingMath('type')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                    <option value="nonmagical">Nonmagical Item</option>
                                    <option value="magic">Magic Item</option>
                                    <option value="healing_potion">Standard Potion of Healing</option>
                                    <option value="other_potion">Other Potion</option>
                                </select>
                            </div>
                            <div id="dt-craft-name-wrapper">
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                                <input type="text" id="dt-craft-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner" placeholder="e.g. Plate Armor">
                            </div>
                            
                            <!-- RECIPE BROWSER BUTTON -->
                            <div class="col-span-1 sm:col-span-2 mb-1" id="dt-craft-recipe-btn-wrapper">
                                <button type="button" onclick="window.appActions.openRecipeBrowser()" class="w-full py-2 bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 transition text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm border border-[#d4c5a9] flex items-center justify-center">
                                    <i class="fa-solid fa-search mr-2"></i> Browse Magic Item Recipes
                                </button>
                            </div>
                        </div>

                        <!-- Nonmagical specific -->
                        <div id="dt-craft-nonmagical-fields" class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Market Price (gp)</label>
                            <input type="number" id="dt-craft-cost" min="1" value="50" oninput="window.appActions.updateCraftingMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner text-center">
                            <p class="text-[9px] text-stone-400 mt-1 italic">Crafting requires materials worth half the market value.</p>
                        </div>

                        <!-- Magical / Potion shared rarity -->
                        <div id="dt-craft-rarity-fields" class="hidden mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Rarity</label>
                                <select id="dt-craft-rarity" onchange="window.appActions.updateCraftingMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="very-rare">Very Rare</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>
                            <div id="dt-craft-consumable-wrapper" class="flex flex-col justify-center">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="dt-craft-consumable" onchange="window.appActions.updateCraftingMath('input')" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-blue-800 transition">Is Consumable?</span>
                                </label>
                                <p class="text-[9px] text-stone-400 mt-1 italic">Halves required time and cost.</p>
                            </div>
                        </div>

                        <!-- Standard Healing Potion specific -->
                        <div id="dt-craft-healing-fields" class="hidden mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Potion Type</label>
                            <select id="dt-craft-healing-type" onchange="window.appActions.updateCraftingMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                <option value="healing">Potion of Healing (1 d / 25 gp)</option>
                                <option value="greater">Greater Healing (5 d / 100 gp)</option>
                                <option value="superior">Superior Healing (15 d / 1,000 gp)</option>
                                <option value="supreme">Supreme Healing (20 d / 10,000 gp)</option>
                            </select>
                        </div>
                        
                        <div class="border-t border-[#d4c5a9] pt-3 mt-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Proficiency Used <span class="text-red-500">*</span></label>
                            <select id="dt-craft-prof" onchange="if(this.value === 'other') document.getElementById('dt-craft-prof-custom').classList.remove('hidden'); else document.getElementById('dt-craft-prof-custom').classList.add('hidden');" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                <option value="">-- Select Proficiency --</option>
                            </select>
                            <input type="text" id="dt-craft-prof-custom" class="hidden w-full mt-2 p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner" placeholder="Type custom proficiency...">
                        </div>
                    </div>

                    <!-- Modifiers & Collaborators -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-users-gear mr-2 text-stone-500"></i> Modifiers & Collaborators</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div class="bg-amber-50 border border-amber-200 p-3 rounded-sm shadow-sm" id="dt-craft-artificer-box">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-artificer" onchange="window.appActions.updateCraftingMath('input')" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition">Artificer Magic Item Adept</span>
                            </label>
                            <p class="text-[9px] text-amber-700 italic leading-snug">Quarter time & half cost for Common/Uncommon magic items and standard potions.</p>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm" id="dt-craft-harper-box">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-harper" onchange="document.getElementById('dt-craft-harper-details').classList.toggle('hidden'); window.appActions.updateCraftingMath('input');" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                            </label>
                            <p class="text-[9px] text-blue-700 italic leading-snug">Reduces time & cost. Requires a safe house.</p>
                        </div>
                        <div class="sm:col-span-2 bg-stone-100 border border-[#d4c5a9] p-3 rounded-sm shadow-inner">
                            <label class="block text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-2">Select Assistants</label>
                            <div id="dt-craft-collaborators" class="flex flex-wrap gap-2">
                                <!-- Populated dynamically -->
                            </div>
                            <p class="text-[9px] text-stone-500 italic leading-snug mt-2">Multiple characters combining their efforts divide the time needed to create an item. Days spent will be deducted from all selected helpers. <span class="font-bold text-stone-600">Everyone who collaborates must possess the selected tool/skill proficiency.</span></p>
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
                            <input type="number" id="dt-craft-harper-travel" value="0" min="0" oninput="window.appActions.updateCraftingMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <div>
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Scope</span>
                                <span id="dt-craft-progress-text" class="text-xs font-bold text-amber-200">0 / 0 Days Complete</span>
                            </div>
                            <div class="text-right">
                                <span id="dt-craft-total-days" class="text-sm font-bold text-emerald-400 mr-3">0 Days</span>
                                <span id="dt-craft-total-gold" class="text-sm font-bold text-amber-400">0 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Downtime to Spend <span class="normal-case font-normal">(Per Hero)</span></label>
                                <input type="number" id="dt-craft-days-spent" value="1" min="1" oninput="window.appActions.updateCraftingMath('input')" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                                <p id="dt-craft-progress-rate" class="text-[9px] text-emerald-400 italic mt-1 font-bold text-center hidden"></p>
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <div class="flex justify-end gap-3 mb-0.5">
                                    <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold">Complication Risk</span>
                                    <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold">Days Deducted</span>
                                </div>
                                <div class="flex justify-end gap-3 items-end">
                                    <span id="dt-craft-risk-text" class="text-lg font-bold text-red-500" title="10% risk per 25 work-days spent">10%</span>
                                    <span id="dt-craft-logged-days" class="text-xl font-bold text-amber-500">1 Day</span>
                                </div>
                                <p class="text-[8px] text-stone-500 italic mt-0.5 text-right w-full pr-1">Includes travel time</p>
                            </div>
                        </div>
                    </div>
                    <p id="dt-craft-cost-warning" class="text-[10px] text-stone-500 text-center italic font-bold uppercase tracking-widest mt-2">Note: Materials cost must be paid up front when starting.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-craft-submit-btn" onclick="window.appActions.executeCrafting()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hammer mr-2"></i> Log Crafting</button>
                </div>
            </div>
            
            <!-- RECIPE BROWSER OVERLAY -->
            <div id="dt-craft-recipe-modal" class="hidden absolute inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                    <div class="bg-stone-900 p-3 sm:p-4 border-b-2 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                        <h3 class="text-base font-serif font-bold flex items-center"><i class="fa-solid fa-search mr-2 text-amber-500"></i> Recipe Browser</h3>
                        <button onclick="window.appActions.closeRecipeBrowser()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    <div class="p-4 sm:p-5 flex-grow flex flex-col min-h-0 bg-[#fdfbf7]">
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="dt-craft-recipe-search" placeholder="Search Xanathar's Magic Items..." class="flex-grow p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner" oninput="window.appActions.filterRecipes()">
                            <select id="dt-craft-recipe-rarity" class="w-1/3 p-2.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner" onchange="window.appActions.filterRecipes()">
                                <option value="all">All Rarities</option>
                                <option value="common">Common</option>
                                <option value="uncommon">Uncommon</option>
                                <option value="rare">Rare</option>
                                <option value="very-rare">Very Rare</option>
                                <option value="legendary">Legendary</option>
                            </select>
                        </div>
                        <div id="dt-craft-recipe-list" class="flex-grow overflow-y-auto custom-scrollbar space-y-1 border border-[#d4c5a9] rounded-sm p-1 bg-white shadow-inner">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // Initialize dynamic UI elements
    setTimeout(() => {
        window.appActions.updateCraftingMath('init');
    }, 50);
};

export const openRecipeBrowser = () => {
    buildRecipeCache();
    const modal = document.getElementById('dt-craft-recipe-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const searchInput = document.getElementById('dt-craft-recipe-search');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
        }
        window.appActions.filterRecipes(); 
    }
};

export const closeRecipeBrowser = () => {
    const modal = document.getElementById('dt-craft-recipe-modal');
    if (modal) modal.classList.add('hidden');
};

export const filterRecipes = () => {
    const searchInput = document.getElementById('dt-craft-recipe-search');
    const listEl = document.getElementById('dt-craft-recipe-list');
    const rarityFilter = document.getElementById('dt-craft-recipe-rarity')?.value || 'all';

    if (!searchInput || !listEl) return;
    
    const query = searchInput.value.toLowerCase().trim();
    
    const filtered = RECIPE_CACHE.filter(r => {
        const matchName = r.name.toLowerCase().includes(query);
        const matchRarity = rarityFilter === 'all' || r.rarity === rarityFilter;
        return matchName && matchRarity;
    });
    
    if (filtered.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-stone-500 italic p-4 text-center">No recipes found matching the criteria.</p>`;
        return;
    }

    let html = '';
    filtered.forEach(r => {
        const rarityColor = r.rarity === 'legendary' ? 'text-orange-600' : (r.rarity === 'very-rare' ? 'text-purple-600' : (r.rarity === 'rare' ? 'text-blue-600' : (r.rarity === 'uncommon' ? 'text-emerald-600' : 'text-stone-600')));
        
        // Escape apostrophes to prevent breaking the onclick handler
        const safeName = r.name.replace(/'/g, "\\'");
        
        html += `
            <div class="flex justify-between items-center p-2 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors cursor-pointer group" onclick="window.appActions.selectRecipe('${safeName}', '${r.rarity}', '${r.type}', ${r.consumable})">
                <div class="min-w-0 pr-2">
                    <span class="font-bold text-stone-800 text-sm block truncate group-hover:text-amber-700 transition-colors">${r.name}</span>
                    <span class="text-[9px] uppercase font-bold tracking-widest ${rarityColor}">${r.rarity.replace('-', ' ')} ${r.consumable ? '<span class="text-stone-400 italic normal-case tracking-normal ml-1">(Consumable)</span>' : ''}</span>
                </div>
                <button class="shrink-0 px-3 py-1.5 bg-stone-200 text-stone-700 rounded-sm text-[9px] font-bold uppercase tracking-wider group-hover:bg-stone-800 group-hover:text-amber-50 transition shadow-sm border border-[#d4c5a9] group-hover:border-stone-700">Select</button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

export const selectRecipe = (name, rarity, type, isConsumable) => {
    window.appActions.closeRecipeBrowser();
    
    // Switch the primary Project Type dropdown
    const typeEl = document.getElementById('dt-craft-type');
    if (typeEl) typeEl.value = type;
    
    // Force the DOM to reveal the correct fields based on the new type
    window.appActions.updateCraftingMath('type'); 

    // Apply specific locked values so they can't mess with the recipe logic
    const nameEl = document.getElementById('dt-craft-item-name');
    if (nameEl) {
        nameEl.value = name;
        nameEl.disabled = true;
        nameEl.classList.add('bg-stone-200', 'text-stone-500');
        nameEl.classList.remove('bg-stone-50', 'text-stone-900');
    }
    
    if (type === 'magic' || type === 'other_potion') {
        const rarityEl = document.getElementById('dt-craft-rarity');
        if (rarityEl) {
            rarityEl.value = rarity;
            rarityEl.disabled = true;
            rarityEl.classList.add('bg-stone-200', 'text-stone-500');
            rarityEl.classList.remove('bg-stone-50', 'text-stone-900');
        }
        
        if (type === 'magic') {
            const consEl = document.getElementById('dt-craft-consumable');
            if (consEl) {
                consEl.checked = isConsumable;
                consEl.disabled = true;
            }
        }
    }
    
    // Trigger final recalculation of days and gold
    window.appActions.updateCraftingMath('input');
};

export const updateCraftingMath = (triggerSource = 'input') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-craft-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectSelect = document.getElementById('dt-craft-project');
    const newConfigDiv = document.getElementById('dt-craft-new-config');
    const abandonBtn = document.getElementById('dt-craft-abandon-btn');
    const harperBox = document.getElementById('dt-craft-harper-box');
    const artificerBox = document.getElementById('dt-craft-artificer-box');

    // UNLOCK RECIPE FIELDS IF MANUALLY CHANGING PROJECT TYPE OR SWITCHING HEROES
    if (triggerSource === 'type' || triggerSource === 'init' || triggerSource === 'project' || triggerSource === 'pc') {
        const nameEl = document.getElementById('dt-craft-item-name');
        const rarityEl = document.getElementById('dt-craft-rarity');
        const consEl = document.getElementById('dt-craft-consumable');
        
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

    // NEW: Auto-populate Proficiency dropdown & Artificer feature based on imported Sheet
    if (triggerSource === 'pc' || triggerSource === 'init') {
        const profSelect = document.getElementById('dt-craft-prof');
        if (profSelect) {
            const currentProf = profSelect.value;
            // Clean out the "(Expertise)" tags so the list is clean
            const skills = (pc.skills || '').split(',').map(s => s.replace(/\(Expertise\)/ig, '').trim()).filter(Boolean);
            const profs = (pc.proficiencies || '').split(',').map(s => s.trim()).filter(Boolean);
            
            const excludedTerms = [
                'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc',
                'abyssal', 'celestial', 'draconic', 'deep speech', 'infernal', 'primordial', 'sylvan', 'undercommon',
                'druidic', "thieves' cant", 'auran', 'aquan', 'ignan', 'terran', 'telepathy',
                'light armor', 'medium armor', 'heavy armor', 'shields', 'simple weapons', 'martial weapons'
            ];

            const allProfs = [...new Set([...skills, ...profs])]
                .filter(p => {
                    const pl = p.toLowerCase();
                    if (excludedTerms.includes(pl)) return false;
                    if (pl.includes(' armor') || pl.includes(' weapons') || pl === 'shields') return false;
                    if (pl.includes('language')) return false;
                    return true;
                })
                .sort();
            
            let html = '<option value="">-- Select Proficiency --</option>';
            allProfs.forEach(p => {
                html += `<option value="${p}">${p}</option>`;
            });
            html += `<option value="other">Other / Not Listed</option>`;
            
            profSelect.innerHTML = html;
            if (currentProf && html.includes(`value="${currentProf}"`)) {
                profSelect.value = currentProf;
            }
        }

        const artificerBoxEl = document.getElementById('dt-craft-artificer');
        if (artificerBoxEl && pc.classLevel) {
            const classStr = pc.classLevel.toLowerCase();
            const match = classStr.match(/artificer\s+(\d+)/);
            if (match && parseInt(match[1], 10) >= 10) {
                artificerBoxEl.checked = true;
            } else if (triggerSource === 'pc') {
                artificerBoxEl.checked = false;
            }
        }
    }

    // Rebuild Collaborators List if PC changed
    if (triggerSource === 'pc' || triggerSource === 'init') {
        const collabDiv = document.getElementById('dt-craft-collaborators');
        if (collabDiv) {
            let collabHtml = '';
            camp.playerCharacters.forEach(otherPc => {
                if (otherPc.id !== pcId) {
                    const days = parseInt(otherPc.availableDowntime) || 0;
                    collabHtml += `
                        <label class="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 border border-[#d4c5a9] rounded-sm hover:bg-amber-50 transition">
                            <input type="checkbox" value="${otherPc.id}" class="dt-collab-check w-3 h-3 text-amber-600 rounded-sm" onchange="window.appActions.updateCraftingMath('input')">
                            <span class="text-[10px] font-bold text-stone-700">${otherPc.name} <span class="font-normal italic text-stone-500">(${days}d)</span></span>
                        </label>
                    `;
                }
            });
            collabDiv.innerHTML = collabHtml || '<span class="text-[10px] text-stone-500 italic">No other heroes available.</span>';
        }
    }

    // Rebuild Projects List if PC changed
    const projects = pc.craftingProjects || {};
    if (triggerSource === 'pc' || triggerSource === 'init') {
        let projHtml = `<option value="new">-- Start New Project --</option>`;
        Object.entries(projects).forEach(([pid, proj]) => {
            projHtml += `<option value="${pid}">${proj.name} (${proj.progress}/${proj.totalTime} days)</option>`;
        });
        projectSelect.innerHTML = projHtml;
    }

    const projectId = projectSelect.value;
    const isResuming = projectId !== 'new';
    
    // Toggle New vs Resume modes
    if (isResuming) {
        newConfigDiv.classList.add('hidden');
        abandonBtn.classList.remove('hidden');
        harperBox.classList.add('opacity-50', 'pointer-events-none');
        artificerBox.classList.add('opacity-50', 'pointer-events-none');
        document.getElementById('dt-craft-cost-warning').textContent = "Note: Materials cost was paid when this project began.";
    } else {
        newConfigDiv.classList.remove('hidden');
        abandonBtn.classList.add('hidden');
        harperBox.classList.remove('opacity-50', 'pointer-events-none');
        artificerBox.classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('dt-craft-cost-warning').textContent = "Note: Materials cost must be paid up front when starting.";
    }

    // --- MATH CALCULATION ---
    let totalTime = 0;
    let totalCost = 0;
    let currentProgress = 0;
    let itemName = "";

    if (isResuming) {
        const proj = projects[projectId];
        totalTime = proj.totalTime;
        totalCost = proj.cost;
        currentProgress = proj.progress;
        itemName = proj.name;
    } else {
        // Calculate New Project from Inputs
        const typeEl = document.getElementById('dt-craft-type');
        const cType = typeEl.value;
        itemName = document.getElementById('dt-craft-item-name').value.trim() || "Unknown Item";
        
        // Visibility Logic for New Form
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
            itemName = "Potion of Healing"; // Generic placeholder for live UI
        } else if (cType === 'other_potion') {
            document.getElementById('dt-craft-rarity-fields').classList.remove('hidden');
            document.getElementById('dt-craft-consumable-wrapper').classList.add('hidden'); 
        }

        let baseTime = 0;
        let baseCost = 0;
        let isConsumable = false;
        const rarityEl = document.getElementById('dt-craft-rarity');

        if (cType === 'nonmagical') {
            const mCost = parseInt(document.getElementById('dt-craft-cost').value) || 0;
            baseTime = Math.max(1, Math.ceil(mCost / 10)); // Time is purely based on value / 50 gp * 5 days = / 10 days
            baseCost = Math.ceil(mCost / 2);
        } else if (cType === 'healing_potion') {
            const hType = document.getElementById('dt-craft-healing-type').value;
            const healingData = {
                healing: { time: 1, cost: 25 },
                greater: { time: 5, cost: 100 },
                superior: { time: 15, cost: 1000 },
                supreme: { time: 20, cost: 10000 }
            };
            baseTime = healingData[hType].time;
            baseCost = healingData[hType].cost;
            isConsumable = true;
        } else {
            const rarity = rarityEl.value;
            isConsumable = cType === 'other_potion' ? true : document.getElementById('dt-craft-consumable').checked;
            
            const rarityData = {
                common: { workweeks: 1, cost: 50 },
                uncommon: { workweeks: 2, cost: 200 },
                rare: { workweeks: 10, cost: 2000 },
                'very-rare': { workweeks: 25, cost: 20000 },
                legendary: { workweeks: 50, cost: 100000 }
            };
            
            let rw = rarityData[rarity].workweeks;
            let rc = rarityData[rarity].cost;
            
            let baseDays = rw * 5;
            baseTime = isConsumable ? Math.max(1, Math.ceil(baseDays / 2)) : baseDays;
            baseCost = isConsumable ? Math.max(1, Math.ceil(rc / 2)) : rc;
        }

        let applyArtificer = false;
        const isArtificer = document.getElementById('dt-craft-artificer').checked;
        if (isArtificer) {
            const hType = document.getElementById('dt-craft-healing-type').value;
            if (cType === 'healing_potion' && (hType === 'healing' || hType === 'greater')) applyArtificer = true;
            if ((cType === 'magic' || cType === 'other_potion') && (rarityEl.value === 'common' || rarityEl.value === 'uncommon')) applyArtificer = true;
        }

        if (applyArtificer) {
            baseTime = Math.ceil(baseTime * 0.25);
            baseCost = Math.ceil(baseCost * 0.5);
        }

        const isHarper = document.getElementById('dt-craft-harper').checked;
        if (isHarper) {
            baseTime = Math.ceil(baseTime * 0.8);
            baseCost = isConsumable ? Math.ceil(baseCost * 0.75) : Math.ceil(baseCost * 0.9);
        }

        totalTime = baseTime;
        totalCost = baseCost;
    }

    // --- APPLY COLLABORATORS TO REMAINING TIME ---
    const checkedCollabs = Array.from(document.querySelectorAll('.dt-collab-check:checked'));
    const numWorkers = 1 + checkedCollabs.length;
    
    const workRemaining = totalTime - currentProgress;
    const effectiveDaysToComplete = Math.max(1, Math.ceil(workRemaining / numWorkers));

    // Update Totals UI (Dynamically update the label if collaborators are selected to make the math transparent!)
    if (numWorkers > 1) {
        const perHero = Math.ceil(totalTime / numWorkers);
        document.getElementById('dt-craft-total-days').innerHTML = `${totalTime} Work-Days <span class="text-[10px] text-stone-400 normal-case">(${perHero} Days Each)</span>`;
    } else {
        document.getElementById('dt-craft-total-days').textContent = `${totalTime} Days`;
    }
    document.getElementById('dt-craft-total-gold').textContent = `${totalCost} gp`;
    document.getElementById('dt-craft-progress-text').textContent = `${currentProgress} / ${totalTime} Days Complete`;

    // Process "Days Spent" Input
    const daysSpentEl = document.getElementById('dt-craft-days-spent');
    const rateEl = document.getElementById('dt-craft-progress-rate');
    const riskEl = document.getElementById('dt-craft-risk-text');
    
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    
    if (daysSpent > effectiveDaysToComplete) {
        daysSpent = effectiveDaysToComplete;
        daysSpentEl.value = effectiveDaysToComplete;
    }

    // Complication Risk UI Update (XGtE Rule: 10% chance per 5 workweeks (25 days) spent)
    if (riskEl) {
        const typeEl = document.getElementById('dt-craft-type')?.value;
        const isMagical = isResuming ? (projects[projectId].type !== 'nonmagical') : (typeEl !== 'nonmagical');
        
        if (isMagical) {
            const risk = Math.min(100, Math.max(1, Math.round((daysSpent / 25) * 10)));
            riskEl.textContent = `${risk}%`;
        } else {
            riskEl.textContent = `0%`;
            riskEl.title = "Nonmagical crafting has no risk of magical complications.";
        }
    }

    // Reveal the rate multiplier if there are helpers so the player understands the speed boost
    if (numWorkers > 1) {
        if (rateEl) {
            rateEl.textContent = `Generates ${numWorkers} days of progress per day spent!`;
            rateEl.classList.remove('hidden');
        }
    } else {
        if (rateEl) rateEl.classList.add('hidden');
    }

    const travelDays = document.getElementById('dt-craft-harper').checked && !isResuming ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
    const totalLogged = daysSpent + travelDays;
    
    document.getElementById('dt-craft-logged-days').textContent = `${totalLogged} Day${totalLogged !== 1 ? 's' : ''}`;

    const willComplete = (currentProgress + (daysSpent * numWorkers)) >= totalTime;

    const submitBtn = document.getElementById('dt-craft-submit-btn');
    if (submitBtn) {
        if (willComplete) {
            submitBtn.innerHTML = `<i class="fa-solid fa-hammer mr-2"></i> Complete Project`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-person-digging mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const abandonCraftingProject = async () => {
    const projectId = document.getElementById('dt-craft-project').value;
    if (projectId === 'new') return;

    if (!confirm("Are you sure you want to permanently abandon this incomplete project? The materials will be lost.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pcId = document.getElementById('dt-craft-pc').value;
    
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId && p.craftingProjects) {
            const newProjects = { ...p.craftingProjects };
            delete newProjects[projectId];
            return { ...p, craftingProjects: newProjects };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    notify("Project abandoned.", "success");
    
    // Refresh modal
    window.appActions.updateCraftingMath('init');
};

export const executeCrafting = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-craft-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectId = document.getElementById('dt-craft-project').value;
    const isResuming = projectId !== 'new';
    
    let projectData = {};
    const checkedCollabs = Array.from(document.querySelectorAll('.dt-collab-check:checked')).map(el => camp.playerCharacters.find(p => p.id === el.value));
    const numWorkers = 1 + checkedCollabs.length;
    let travelDays = 0;

    if (isResuming) {
        projectData = JSON.parse(JSON.stringify(pc.craftingProjects[projectId]));
    } else {
        // --- GATHER NEW PROJECT DATA ---
        const cType = document.getElementById('dt-craft-type').value;
        let itemName = document.getElementById('dt-craft-item-name').value.trim();
        
        if (cType === 'healing_potion') {
            const hType = document.getElementById('dt-craft-healing-type').value;
            if (hType === 'healing') itemName = 'Potion of Healing';
            if (hType === 'greater') itemName = 'Potion of Greater Healing';
            if (hType === 'superior') itemName = 'Potion of Superior Healing';
            if (hType === 'supreme') itemName = 'Potion of Supreme Healing';
        }

        if (!itemName) { notify("Please enter the item name.", "error"); return; }

        const isHarper = document.getElementById('dt-craft-harper').checked;
        const harperLoc = document.getElementById('dt-craft-harper-loc').value.trim();
        travelDays = isHarper ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
        
        if (isHarper && !harperLoc) { notify("Please enter the Harper Safe House location.", "error"); return; }

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
            
            let baseDays = rarityData[rarity].workweeks * 5;
            baseTime = isConsumable ? Math.max(1, Math.ceil(baseDays / 2)) : baseDays;
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

        let profVal = document.getElementById('dt-craft-prof').value;
        if (profVal === 'other') {
            profVal = document.getElementById('dt-craft-prof-custom').value.trim();
        }
        
        if (!profVal) {
            notify("You must specify the tool or skill proficiency used for crafting.", "error");
            return;
        }

        projectData = {
            id: generateId(),
            name: itemName,
            type: cType,
            totalTime: effectiveTime,
            cost: effectiveCost,
            progress: 0,
            prof: profVal
        };
        
        if (applyArtificer) projectData.artificerNote = true;
        if (isHarper) projectData.harperNote = harperLoc;
    }

    const daysSpent = parseInt(document.getElementById('dt-craft-days-spent').value) || 1;
    const progressMade = daysSpent * numWorkers;
    const isComplete = (projectData.progress + progressMade) >= projectData.totalTime;

    // We only charge the primary hero for travel days on new projects. Collaborators just pay standard days.
    const primaryDowntimeCost = daysSpent + travelDays;

    // VERIFY EVERYONE HAS ENOUGH TIME!
    if ((parseInt(pc.availableDowntime) || 0) < primaryDowntimeCost) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error"); return;
    }
    for (const collab of checkedCollabs) {
        if ((parseInt(collab.availableDowntime) || 0) < daysSpent) {
            notify(`${collab.name} does not have enough downtime days to help.`, "error"); return;
        }
    }

    // --- APPLY MATH & COMPLICATIONS ---
    
    // Update progress safely
    projectData.progress += isComplete ? (projectData.totalTime - projectData.progress) : progressMade;

    let complicationText = "";
    if (projectData.type !== 'nonmagical') {
        // XGtE Rule: 10% chance per 5 workweeks (25 days) spent
        const risk = Math.min(100, Math.max(1, Math.round((daysSpent / 25) * 10)));
        const d100 = Math.floor(Math.random() * 100) + 1;
        
        if (d100 <= risk) {
            const d6 = Math.floor(Math.random() * 6) + 1;
            const compTable = [
                "Rumors swirl that what you’re working on is unstable and a threat to the community.",
                "Your tools are stolen, forcing you to buy new ones.",
                "A local wizard shows keen interest in your work and insists on observing you.",
                "A powerful noble offers a hefty price for your work and is not interested in hearing no for an answer.",
                "A dwarf clan accuses you of stealing its secret lore to fuel your work.",
                "A competitor spreads rumors that your work is shoddy and prone to failure."
            ];
            complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100 vs ${risk}% Risk)\n> *Result:* ${compTable[d6 - 1]}`;
        } else {
            complicationText = `\n\n*No complications occurred (${d100}/100).*`;
        }
    }

    // --- BUILD PRIMARY LOG ---
    let resultHeader = `**Objective:** Crafting ${projectData.name}`;
    if (projectData.prof) resultHeader += ` (using ${projectData.prof})`;

    const collabNamesStr = checkedCollabs.map(c => c.name).join(', ');
    const helpMsg = collabNamesStr ? ` (with help from ${collabNamesStr})` : ``;

    let resultBody = isComplete 
        ? `✅ **Project Completed!** You${helpMsg} have successfully crafted the **${projectData.name}**.` 
        : `⏳ **Progress Logged:** You${helpMsg} spent ${daysSpent} days working on the **${projectData.name}**.\n**Progress:** ${projectData.progress} / ${projectData.totalTime} work-days.`;

    let modifiersNote = "";
    if (projectData.artificerNote) modifiersNote += `\n*Magic Item Adept bonus applied.*`;
    if (projectData.harperNote) modifiersNote += `\n*Silver Harbingers support utilized at ${projectData.harperNote}.*`;

    let costNote = `**Total Project Material Cost:** ${projectData.cost.toLocaleString()} gp`;
    if (!isResuming) costNote += ` *(Materials must be purchased up front when starting a project).*`;

    const primaryNoteText = `**Downtime: Crafting an Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Work Days Logged:** ${daysSpent} Days ${travelDays > 0 ? `(+${travelDays} Travel)` : ''}\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;
    const timestampStr = new Date().toLocaleDateString();
    
    // --- BUILD COLLABORATOR LOG ---
    const collabNoteText = `**Downtime: Assisted Crafting**\n*Hero:* {CollabName}\n\n**Objective:** Assisting ${pc.name} with ${projectData.name}\n**Work Days Logged:** ${daysSpent} Days\n\n${isComplete ? `✅ **Project Completed!** With your help, the item was finished.` : `⏳ **Progress Logged:** The project is now at ${projectData.progress} / ${projectData.totalTime} work-days.`}`;

    // --- UPDATE ALL CHARACTERS ---
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let projectsDict = { ...(p.craftingProjects || {}) };
            if (isComplete) {
                delete projectsDict[projectData.id];
            } else {
                projectsDict[projectData.id] = projectData;
            }
            return { 
                ...p, 
                craftingProjects: projectsDict,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - primaryDowntimeCost),
                downtimeLog: (p.downtimeLog || '') + `${p.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${primaryNoteText}`
            };
        }
        
        const isCollab = checkedCollabs.find(c => c.id === p.id);
        if (isCollab) {
            const specificCollabLog = collabNoteText.replace('{CollabName}', p.name);
            return {
                ...p,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - daysSpent),
                downtimeLog: (p.downtimeLog || '') + `${p.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${specificCollabLog}`
            };
        }
        
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime crafting with <span class="font-bold text-amber-700">${pc.name}</span>${collabNamesStr ? ` and allies` : ''}.`, 'fa-hammer');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Crafting progress logged for all participants.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openCraftingModal = openCraftingModal;
    window.appActions.updateCraftingMath = updateCraftingMath;
    window.appActions.executeCrafting = executeCrafting;
    window.appActions.abandonCraftingProject = abandonCraftingProject;
    
    // Bind Recipe Browser Functions
    window.appActions.openRecipeBrowser = openRecipeBrowser;
    window.appActions.closeRecipeBrowser = closeRecipeBrowser;
    window.appActions.filterRecipes = filterRecipes;
    window.appActions.selectRecipe = selectRecipe;
}
