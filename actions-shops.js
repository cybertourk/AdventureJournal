/* STREAMING_CHUNK: Importing core state modules and actions... */
import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

/* STREAMING_CHUNK: Importing our new roll table engine... */
import { rollOnTable } from './actions-tables.js';

let LOCAL_BAZAAR_DB = null;

const SHOP_THEMES = {
    "Blacksmith & Armory": ["melee", "armor", "shield", "weapon", "smith"],
    "Bowyer / Fletcher": ["ranged", "ammunition", "bow", "arrow", "bolt"],
    "Apothecary / Alchemist": ["potion", "poison", "herbalist", "alchem", "elixir"],
    "Arcane Mystic": ["scroll", "wand", "rod", "ring", "wonderous", "wondrous", "arcane", "magic", "focus", "staff"],
    "General Store / Provisioner": ["adventuring", "pack", "tool", "clothing", "container", "standard", "gear", "ration", "pouch", "bag"],
    "Jeweler / Gem Merchant": ["gem", "ring", "jewelry", "art object", "crystal", "gemstone"],
    "Stablemaster": ["mount", "vehicle", "livestock", "animal", "saddle"],
    "Raw Materials": ["ore", "metal", "lumber", "log", "woven", "bone", "carpentry", "material", "leather"],
    "Tavern / Innkeeper": ["food", "tavern", "gaming", "musical", "drink", "ale", "wine", "goods"]
};

// ============================================================================
// --- BAZAAR & SHOP MANAGEMENT ---
// ============================================================================

export const openBazaar = () => {
    window.appActions.setView('bazaar');
};

export const openShopEditModal = (shopId = null) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    let shop = {
        id: generateId(),
        name: '',
        desc: '',
        image: '',
        shopType: 'General Store',
        location: '',
        isTraveling: false,
        ownerName: '',
        isOpen: false,
        buysItems: false,
        dmNotes: '',
        inventory: [],
        ledger: [],
        pendingSales: []
    };

    const isNew = !shopId;
    if (!isNew) {
        shop = camp.shops?.find(s => s.id === shopId) || shop;
    }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-store mr-2 text-emerald-400"></i> ${isNew ? 'Establish New Shop' : 'Edit Shop Details'}</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <input type="hidden" id="shop-edit-id" value="${shop.id}">
                    
                    <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-sm shadow-inner flex flex-wrap gap-4 items-center mb-5">
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" id="shop-edit-isopen" ${shop.isOpen ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-900 group-hover:text-emerald-700 transition">Open to Party</span>
                        </label>
                        <div class="w-px h-4 bg-emerald-300 hidden sm:block"></div>
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" id="shop-edit-buys" ${shop.buysItems ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-900 group-hover:text-emerald-700 transition">Will Buy Items</span>
                        </label>
                        <div class="w-px h-4 bg-emerald-300 hidden sm:block"></div>
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" id="shop-edit-istraveling" ${shop.isTraveling ? 'checked' : ''} class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition"><i class="fa-solid fa-caravan mr-1"></i> Traveling Merchant</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div class="sm:col-span-2">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Shop Name</label>
                            <input type="text" id="shop-edit-name" value="${shop.name.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="e.g. Gilmore's Wonders">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Shop Type</label>
                            <input type="text" id="shop-edit-type" value="${shop.shopType.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="e.g. Apothecary, Blacksmith">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                            <input type="text" id="shop-edit-loc" value="${shop.location.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Owner / Proprietor</label>
                            <input type="text" id="shop-edit-owner" value="${shop.ownerName.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="e.g. Shaun Gilmore">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Portrait Image URL</label>
                            <input type="text" id="shop-edit-image" value="${shop.image.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="https://...">
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Public Description (Atmosphere & Wares)</label>
                        <textarea id="shop-edit-desc" class="w-full p-3 h-24 border border-[#d4c5a9] rounded-sm text-sm text-stone-900 font-serif outline-none focus:border-emerald-600 bg-white shadow-inner custom-scrollbar resize-y">${shop.desc.replace(/"/g, '&quot;')}</textarea>
                    </div>

                    <div class="mb-2">
                        <label class="block text-[10px] uppercase text-red-800 font-bold mb-1 tracking-widest"><i class="fa-solid fa-eye mr-1"></i> DM Secrets & Notes</label>
                        <textarea id="shop-edit-notes" class="w-full p-3 h-24 border border-[#d4c5a9] rounded-sm text-sm text-stone-900 font-serif outline-none focus:border-emerald-600 bg-stone-200 border-l-4 border-l-red-800 shadow-inner custom-scrollbar resize-y" placeholder="Hidden motives, true identity of owner, security measures...">${shop.dmNotes.replace(/"/g, '&quot;')}</textarea>
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-between items-center shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    ${!isNew ? `<button onclick="window.appActions.deleteShop('${shop.id}')" class="px-3 py-2 text-stone-500 hover:text-red-700 hover:bg-red-50 transition rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center"><i class="fa-solid fa-trash mr-1.5"></i> Demolish</button>` : `<div></div>`}
                    <div class="flex gap-2">
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                        <button onclick="window.appActions.saveShop()" class="px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save Shop</button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const saveShop = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const id = document.getElementById('shop-edit-id').value;
    const name = document.getElementById('shop-edit-name').value.trim();
    
    if (!name) {
        notify("Shop must have a name.", "error");
        return;
    }

    const isNew = !(camp.shops || []).some(s => s.id === id);
    const existingShop = camp.shops?.find(s => s.id === id);

    const newShop = {
        id: id,
        name: name,
        desc: document.getElementById('shop-edit-desc').value.trim(),
        image: document.getElementById('shop-edit-image').value.trim(),
        shopType: document.getElementById('shop-edit-type').value.trim(),
        location: document.getElementById('shop-edit-loc').value.trim(),
        isTraveling: document.getElementById('shop-edit-istraveling').checked,
        ownerName: document.getElementById('shop-edit-owner').value.trim(),
        isOpen: document.getElementById('shop-edit-isopen').checked,
        buysItems: document.getElementById('shop-edit-buys').checked,
        dmNotes: document.getElementById('shop-edit-notes').value.trim(),
        inventory: existingShop ? existingShop.inventory : [],
        ledger: existingShop ? existingShop.ledger : [],
        pendingSales: existingShop ? (existingShop.pendingSales || []) : []
    };

    const newShops = isNew 
        ? [...(camp.shops || []), newShop] 
        : camp.shops.map(s => s.id === id ? newShop : s);

    // --- AUTO-UPDATE CODEX ---
    let updatedCodex = camp.codex || [];
    const codexEntryIndex = updatedCodex.findIndex(c => c.id === id);
    
    const codexDesc = `**Proprietor:** ${newShop.ownerName}\n**Location:** ${newShop.location}\n**Type:** ${newShop.shopType}\n\n${newShop.desc}`;

    if (codexEntryIndex > -1) {
        updatedCodex[codexEntryIndex] = {
            ...updatedCodex[codexEntryIndex],
            name: newShop.name,
            desc: codexDesc,
            image: newShop.image,
            dmNotes: newShop.dmNotes
        };
    } else {
        updatedCodex.push({
            id: newShop.id,
            name: newShop.name,
            type: 'Location',
            tags: ['Shop', newShop.shopType],
            desc: codexDesc,
            image: newShop.image,
            dmNotes: newShop.dmNotes,
            authorId: camp.dmId,
            visibility: { mode: 'public' } 
        });
    }

    camp.shops = newShops;
    camp.codex = updatedCodex;

    await saveCampaign(camp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Shop saved.", "success");
    reRender();
};

export const deleteShop = async (shopId) => {
    if (!confirm("Are you sure you want to permanently delete this shop, its inventory, and its ledger? (The Codex entry will remain safely in the archives).")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    camp.shops = camp.shops.filter(s => s.id !== shopId);
    
    await saveCampaign(camp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Shop demolished.", "success");
    reRender();
};

// ============================================================================
// --- FOLDER & BULK TOGGLE LOGIC ---
// ============================================================================

export const toggleBazaarLocation = (location) => {
    const state = window.appData;
    if (!state.bazaarCollapsedLocs) state.bazaarCollapsedLocs = [];
    
    if (state.bazaarCollapsedLocs.includes(location)) {
        state.bazaarCollapsedLocs = state.bazaarCollapsedLocs.filter(l => l !== location);
    } else {
        state.bazaarCollapsedLocs.push(location);
    }
    
    reRender();
};

export const toggleAllShops = async (location, isOpen) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.shops) return;

    let changed = false;
    camp.shops.forEach(shop => {
        if (!shop.isTraveling && shop.location === location && shop.isOpen !== isOpen) {
            shop.isOpen = isOpen;
            changed = true;
        }
    });

    if (changed) {
        await saveCampaign(camp);
        notify(`Successfully ${isOpen ? 'opened' : 'closed'} all shops in ${location}.`, "success");
        reRender();
    }
};

export const toggleAllTravelingShops = async (isOpen) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.shops) return;

    let changed = false;
    camp.shops.forEach(shop => {
        if (shop.isTraveling && shop.isOpen !== isOpen) {
            shop.isOpen = isOpen;
            changed = true;
        }
    });

    if (changed) {
        await saveCampaign(camp);
        notify(`Successfully ${isOpen ? 'opened' : 'closed'} all traveling merchants.`, "success");
        reRender();
    }
};

// ============================================================================
// --- INVENTORY & BUYING LOGIC ---
// ============================================================================

export const buyItem = async (shopId, itemId) => {
    updateDerivedState();
    let camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;
    const shop = camp.shops[shopIndex];

    const itemIndex = shop.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    const item = shop.inventory[itemIndex];

    // UNIFIED MULTIPLE CHARACTERS RESOLUTION: Look for the PC in the active adventure first!
    const adv = window.appData.activeAdventure;
    const activePcIds = adv?.activePcIds || [];
    const pc = camp.playerCharacters?.find(p => p.playerId === myUid && activePcIds.includes(p.id)) 
             || camp.playerCharacters?.find(p => p.playerId === myUid);

    if (!pc && !camp._isDM) {
        notify("You must enroll a hero to make purchases.", "error");
        return;
    }
    
    const buyerName = camp._isDM ? "The Dungeon Master" : pc.name;

    if (!confirm(`Buy '${item.name}' for ${item.price.toLocaleString()} gp? This will generate a task to deduct the gold from your character sheet.`)) return;

    // 1. Remove Item or Decrement Quantity
    let newInventory = [...shop.inventory];
    if (item.quantity && item.quantity > 1) {
        newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
    } else {
        newInventory = shop.inventory.filter(i => i.id !== itemId);
    }

    // 2. Add to Ledger
    const timestampStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ledgerEntry = {
        id: generateId(),
        text: `**${buyerName}** purchased **${item.name}** for **${item.price.toLocaleString()} gp**.`,
        timestamp: Date.now(),
        dateStr: timestampStr
    };
    const newLedger = [ledgerEntry, ...(shop.ledger || [])];

    camp.shops[shopIndex] = { ...shop, inventory: newInventory, ledger: newLedger };

    // 3. Generate Task (If not DM)
    if (!camp._isDM && pc) {
        const newTask = {
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Deduct ${item.price.toLocaleString()} gp and add '${item.name}' to inventory. (Purchased at ${shop.name})`,
            authorId: myUid,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] }, 
            timestamp: Date.now()
        };
        camp.sheetUpdates = [...(camp.sheetUpdates || []), ...[newTask]];
        
        // Log Activity
        camp = logPlayerActivity(camp, myUid, `purchased **${item.name}** at ${shop.name}.`, 'fa-coins');
    }

    await saveCampaign(camp);
    notify(`Purchased ${item.name}! Check your Tasks to sync your sheet.`, "success");
    reRender();
};

export const openManualItemModal = async (shopId) => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    // Show loading state while importing the massive JSON database
    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
            <div class="text-amber-500 flex flex-col items-center">
                <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-emerald-500"></i>
                <p class="font-bold tracking-widest uppercase">Consulting Logistics...</p>
            </div>
        </div>
    `;

    if (!LOCAL_BAZAAR_DB) {
        try {
            const module = await import('./data-bazaar.js');
            LOCAL_BAZAAR_DB = module.BAZAAR_ITEMS || [];
        } catch(e) {
            console.error("Dynamic import error for data-bazaar.js:", e);
            notify("Error loading data-bazaar.js. Ensure the file has no syntax errors.", "error");
            container.innerHTML = '';
            return;
        }
    }

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-box-open mr-2 text-emerald-400"></i> Add Wares to Shop</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = ''; window.appActions.reRender();" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 bg-[#fdfbf7] flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    
                    <!-- Search Database Panel -->
                    <div class="bg-emerald-50 p-4 border border-emerald-200 rounded-sm shadow-sm">
                        <h3 class="text-[10px] font-bold uppercase tracking-widest text-emerald-900 mb-2 border-b border-emerald-200 pb-1"><i class="fa-solid fa-magnifying-glass mr-1 text-emerald-700"></i> Search Master Database</h3>
                        <p class="text-[9px] italic text-emerald-800 mb-3">Search thousands of pre-configured items. Clicking an item adds it directly to the shop's shelves.</p>
                        
                        <div class="relative">
                            <input type="text" id="manual-item-search" oninput="window.appActions.searchBazaarDatabase('${shopId}', this.value)" placeholder="Search items, weapons, potions..." class="w-full p-2 border border-emerald-300 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" autocomplete="off">
                            <div id="manual-item-results" class="absolute z-10 w-full bg-white border border-[#d4c5a9] rounded-b-sm shadow-xl max-h-48 overflow-y-auto hidden top-[38px] custom-scrollbar text-xs"></div>
                        </div>
                    </div>

                    <div class="flex items-center gap-4 opacity-50">
                        <div class="h-px bg-[#d4c5a9] flex-grow"></div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-stone-500">OR</span>
                        <div class="h-px bg-[#d4c5a9] flex-grow"></div>
                    </div>

                    <!-- Custom Item Panel -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm">
                        <h3 class="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-hammer mr-1 text-stone-400"></i> Forge Custom Item</h3>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                                <input type="text" id="custom-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner" placeholder="e.g. Glowing Sword of Doom">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Price (gp)</label>
                                <input type="number" id="custom-item-price" min="0" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rarity</label>
                                <select id="custom-item-rarity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-stone-50 shadow-inner">
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="veryrare">Very Rare</option>
                                    <option value="legendary">Legendary</option>
                                    <option value="custom">Custom / Homebrew</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t border-stone-100">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" id="custom-item-magic" class="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-stone-700 group-hover:text-emerald-700 transition">Is Magical?</span>
                            </label>
                            <button onclick="window.appActions.submitCustomItem('${shopId}')" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center"><i class="fa-solid fa-plus mr-1.5"></i> Add Custom</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
};

export const searchBazaarDatabase = (shopId, query) => {
    const resultsDiv = document.getElementById('manual-item-results');
    if (!resultsDiv || !LOCAL_BAZAAR_DB) return;

    if (!query || query.length < 2) {
        resultsDiv.innerHTML = '';
        resultsDiv.classList.add('hidden');
        return;
    }

    const lowerQ = query.toLowerCase();
    const matches = LOCAL_BAZAAR_DB.filter(i => i.name.toLowerCase().includes(lowerQ)).slice(0, 50); // Limit to 50 for performance
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="p-3 text-stone-500 text-xs italic text-center">No matching items found in the master database.</div>';
    } else {
        resultsDiv.innerHTML = matches.map(m => {
            const safeName = m.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeRarity = (m.rarity || 'common').replace(/'/g, "\\'");
            return `
            <div class="p-2.5 border-b border-stone-200 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group transition-colors" onclick="window.appActions.addBazaarItemToShop('${shopId}', '${safeName}', ${m.price || 0}, '${safeRarity}', ${m.isMagic || false})">
                <div class="min-w-0 pr-2">
                    <span class="font-bold text-stone-800 text-sm block truncate group-hover:text-emerald-700 transition-colors">${m.name}</span>
                    <span class="text-[9px] uppercase font-bold tracking-widest text-stone-500">${m.rarity || 'common'} ${m.isMagic ? '<i class="fa-solid fa-sparkles text-amber-500 ml-1"></i>' : ''}</span>
                </div>
                <span class="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-1 rounded-sm shadow-sm whitespace-nowrap shrink-0 group-hover:bg-amber-200 transition-colors">${m.price || 0} gp</span>
            </div>`;
        }).join('');
    }
    resultsDiv.classList.remove('hidden');
};

export const addBazaarItemToShop = async (shopId, name, price, rarity, isMagic) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    let currentInventory = [...(camp.shops[shopIndex].inventory || [])];
    const existingIndex = currentInventory.findIndex(item => item.name === name);

    if (existingIndex > -1) {
        currentInventory[existingIndex] = {
            ...currentInventory[existingIndex],
            quantity: (currentInventory[existingIndex].quantity || 1) + 1
        };
    } else {
        currentInventory.push({
            id: generateId(),
            name: name,
            price: price,
            rarity: rarity,
            isMagic: isMagic,
            quantity: 1
        });
    }

    camp.shops[shopIndex].inventory = currentInventory;
    await saveCampaign(camp);
    notify(`Added ${name} to shop inventory.`, "success");

    const searchInput = document.getElementById('manual-item-search');
    const resultsDiv = document.getElementById('manual-item-results');
    if (searchInput) searchInput.value = '';
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.classList.add('hidden');
    }
};

export const submitCustomItem = async (shopId) => {
    const name = document.getElementById('custom-item-name').value.trim();
    if (!name) {
        notify("Custom item must have a name.", "error");
        return;
    }
    
    const price = parseInt(document.getElementById('custom-item-price').value) || 0;
    const rarity = document.getElementById('custom-item-rarity').value;
    const isMagic = document.getElementById('custom-item-magic').checked;

    await addBazaarItemToShop(shopId, name, price, rarity, isMagic);
    
    document.getElementById('custom-item-name').value = '';
    document.getElementById('custom-item-price').value = '0';
};

export const updateItemPrice = async (shopId, itemId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;
    
    const itemIndex = camp.shops[shopIndex].inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const currentPrice = camp.shops[shopIndex].inventory[itemIndex].price;
    const priceStr = prompt("Enter new price in gold pieces:", currentPrice);
    if (priceStr === null) return; 

    const price = parseInt(priceStr) || 0;
    camp.shops[shopIndex].inventory[itemIndex].price = price;

    await saveCampaign(camp);
    reRender();
};

export const deleteShopItem = async (shopId, itemId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    if (!confirm("Remove this item stack from the shop's inventory?")) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    camp.shops[shopIndex].inventory = camp.shops[shopIndex].inventory.filter(i => i.id !== itemId);

    await saveCampaign(camp);
    reRender();
};

// ============================================================================
// --- SMART ROLL TABLES INTEGRATION ---
// ============================================================================

export const rollShopInventory = async (shopId) => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
            <div class="text-amber-500 flex flex-col items-center">
                <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-emerald-500"></i>
                <p class="font-bold tracking-widest uppercase">Consulting Inventory Ledgers...</p>
            </div>
        </div>
    `;

    if (!LOCAL_BAZAAR_DB) {
        try {
            const module = await import('./data-bazaar.js');
            LOCAL_BAZAAR_DB = module.BAZAAR_ITEMS || [];
        } catch(e) {
            console.error("Dynamic import error for data-bazaar.js:", e);
            notify(`Error loading data-bazaar.js: ${e.message}`, "error");
            container.innerHTML = '';
            return;
        }
    }

    const folders = new Set();
    LOCAL_BAZAAR_DB.forEach(item => {
        if (item.folder && item.folder.trim() !== '') {
            folders.add(item.folder.trim());
        }
    });
    
    const sortedFolders = Array.from(folders).sort((a,b) => a.localeCompare(b));
    let folderOptions = sortedFolders.map(f => `<option value="folder:${f.replace(/"/g, '&quot;')}">📁 ${f}</option>`).join('');

    let themeOptions = '';
    for (const theme of Object.keys(SHOP_THEMES)) {
        themeOptions += `<option value="theme:${theme}">${theme}</option>`;
    }

    /* STREAMING_CHUNK: Fetching dynamically imported/custom roll tables... */
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const campaignTables = camp?.rollTables || [];
    let customTableOptions = '';
    if (campaignTables.length > 0) {
        customTableOptions += `<optgroup label="--- Custom Campaign Tables ---">`;
        campaignTables.forEach(t => {
            customTableOptions += `<option value="table:${t.id}">🎲 ${t.name}</option>`;
        });
        customTableOptions += `</optgroup>`;
    }

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative flex flex-col">
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-dice-d20 mr-2 text-emerald-400"></i> Stock Shelves</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div class="p-5 bg-[#fdfbf7] flex-grow overflow-y-auto">
                    <p class="text-xs text-stone-600 italic mb-4 leading-snug">Stock this merchant's shelves with random items. You can choose a standard database theme, a folder, or roll directly on one of your custom-imported Foundry VTT tables!</p>
                    <input type="hidden" id="roll-shop-id" value="${shopId}">
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Source / Theme</label>
                            <select id="roll-theme" onchange="const r=document.getElementById('rarity-group'); if(this.value.startsWith('table:')) r.classList.add('hidden'); else r.classList.remove('hidden');" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner">
                                <option value="all">General Store (Everything)</option>
                                <option value="magic">Arcane Shop (Magic Items Only)</option>
                                ${customTableOptions}
                                <optgroup label="Broad Themes">
                                    ${themeOptions}
                                </optgroup>
                                <optgroup label="Foundry Folders">
                                    ${folderOptions}
                                </optgroup>
                            </select>
                        </div>
                        <div id="rarity-group">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Maximum Rarity Allowed</label>
                            <select id="roll-rarity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner">
                                <option value="common">Up to Common</option>
                                <option value="uncommon" selected>Up to Uncommon</option>
                                <option value="rare">Up to Rare</option>
                                <option value="veryrare">Up to Very Rare</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Items to Generate</label>
                            <input type="number" id="roll-qty" value="5" min="1" max="50" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner">
                        </div>
                    </div>
                </div>
                
                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-sm">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                    <button onclick="window.appActions.executeRollWares()" class="px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] shadow-md flex items-center"><i class="fa-solid fa-dice mr-1.5"></i> Roll Wares</button>
                </div>
            </div>
        </div>
    `;
};

export const executeRollWares = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const shopId = document.getElementById('roll-shop-id').value;
    const theme = document.getElementById('roll-theme').value;
    const qty = parseInt(document.getElementById('roll-qty').value) || 1;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    let currentInventory = [...(camp.shops[shopIndex].inventory || [])];

    /* STREAMING_CHUNK: Detecting if rolling on custom tables... */
    if (theme.startsWith('table:')) {
        const tableId = theme.split(':')[1];
        
        let successfulRollsCount = 0;
        for (let i = 0; i < qty; i++) {
            try {
                // Execute dynamic, weighted lottery on custom roll table
                const rollData = await rollOnTable(tableId);
                if (rollData && rollData.result) {
                    const itemResult = rollData.result;
                    
                    const existingIndex = currentInventory.findIndex(item => item.name === itemResult.name);
                    
                    if (existingIndex > -1) {
                        currentInventory[existingIndex] = {
                            ...currentInventory[existingIndex],
                            quantity: (currentInventory[existingIndex].quantity || 1) + 1
                        };
                    } else {
                        currentInventory.push({
                            id: generateId(),
                            name: itemResult.name,
                            price: itemResult.price || 0,
                            rarity: itemResult.rarity || 'common',
                            isMagic: itemResult.isMagic || false,
                            quantity: 1
                        });
                    }
                    successfulRollsCount++;
                }
            } catch (err) {
                console.error("Custom Table rolling error:", err);
            }
        }

        if (successfulRollsCount === 0) {
            notify("Roll Table execution failed. Table is empty or invalid.", "error");
            document.getElementById('global-popup-container').innerHTML = '';
            return;
        }

        camp.shops[shopIndex].inventory = currentInventory;
        await saveCampaign(camp);
        document.getElementById('global-popup-container').innerHTML = '';
        notify(`Shelves successfully stocked with ${successfulRollsCount} items from table!`, "success");
        reRender();
        return;
    }

    // --- STANDARD FALLBACK ROLLING ENGINE ---
    if (!LOCAL_BAZAAR_DB || LOCAL_BAZAAR_DB.length === 0) {
        notify("Master database is empty or failed to load.", "error");
        return;
    }

    const maxRarity = document.getElementById('roll-rarity').value;
    const rRank = { 'common': 1, 'uncommon': 2, 'rare': 3, 'veryrare': 4, 'legendary': 5 };
    const maxRank = rRank[maxRarity] || 1;

    // Weights for the lottery system
    const rWeight = { 'common': 100, 'uncommon': 40, 'rare': 10, 'veryrare': 2, 'legendary': 1, 'custom': 10 };

    let pool = LOCAL_BAZAAR_DB.filter(item => {
        const itemRarity = (item.rarity || 'common').toLowerCase().replace(/\s+/g, '');
        if ((rRank[itemRarity] || 1) > maxRank) return false;

        if (theme === 'magic') {
            return item.isMagic;
        } else if (theme.startsWith('folder:')) {
            const targetFolder = theme.substring(7); // Remove 'folder:' prefix
            return item.folder === targetFolder;
        } else if (theme.startsWith('theme:')) {
            const themeName = theme.substring(6); // Remove 'theme:' prefix
            const keywords = SHOP_THEMES[themeName] || [];
            
            const folderStr = (item.folder || "").toLowerCase();
            const typeStr = (item.type || "").toLowerCase();
            const nameStr = (item.name || "").toLowerCase();
            
            return keywords.some(kw => folderStr.includes(kw) || typeStr.includes(kw) || nameStr.includes(kw));
        }
        return true; // 'all' (General Store)
    });

    if (pool.length === 0) {
        notify("No items in the database match these specific filters.", "error");
        return;
    }

    // Assign weights and calculate total weight for the lottery
    let totalWeight = 0;
    pool.forEach(item => {
        const itemRarity = (item.rarity || 'common').toLowerCase().replace(/\s+/g, '');
        item.selectionWeight = rWeight[itemRarity] || 100;
        totalWeight += item.selectionWeight;
    });

    for(let i=0; i<qty; i++) {
        let randomNum = Math.floor(Math.random() * totalWeight);
        let selectedItem = null;

        for (const item of pool) {
            randomNum -= item.selectionWeight;
            if (randomNum < 0) {
                selectedItem = item;
                break;
            }
        }
        
        if (!selectedItem) selectedItem = pool[pool.length - 1];
        
        const existingIndex = currentInventory.findIndex(item => item.name === selectedItem.name);
        
        if (existingIndex > -1) {
            currentInventory[existingIndex] = {
                ...currentInventory[existingIndex],
                quantity: (currentInventory[existingIndex].quantity || 1) + 1
            };
        } else {
            currentInventory.push({
                id: generateId(),
                name: selectedItem.name,
                price: selectedItem.price || 0,
                rarity: selectedItem.rarity || 'common',
                isMagic: selectedItem.isMagic || false,
                quantity: 1
            });
        }
    }

    camp.shops[shopIndex].inventory = currentInventory;

    await saveCampaign(camp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Shelves stocked with ${qty} item(s)!`, "success");
    reRender();
};

// ============================================================================
// --- PLAYER PROPOSE SALE TO SHOP ---
// ============================================================================

export const openProposeSaleModal = (shopId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const shop = camp.shops?.find(s => s.id === shopId);
    if (!shop || !shop.buysItems) return;

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hand-holding-dollar mr-2 text-emerald-400"></i> Propose Sale</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <div class="p-5 bg-[#fdfbf7] flex-grow overflow-y-auto custom-scrollbar">
                    <p class="text-xs text-stone-600 italic mb-4">Offer an item from your inventory to the merchant. The DM will review your asking price before finalizing the transaction.</p>
                    <input type="hidden" id="sale-shop-id" value="${shopId}">
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item to Sell</label>
                        <input type="text" id="sale-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner" placeholder="e.g. Goblin Scimitar">
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Asking Price (gp)</label>
                            <input type="number" id="sale-item-price" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" placeholder="e.g. 25" min="0">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Quantity</label>
                            <input type="number" id="sale-item-qty" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-emerald-600 bg-white shadow-inner" value="1" min="1">
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-400 italic">Asking price is for the ENTIRE stack combined.</p>
                </div>
                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-sm">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                    <button onclick="window.appActions.submitSaleProposal()" class="px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] shadow-md"><i class="fa-solid fa-paper-plane mr-1.5"></i> Send Offer</button>
                </div>
            </div>
        </div>
    `;
};

export const submitSaleProposal = async () => {
    const shopId = document.getElementById('sale-shop-id').value;
    const itemName = document.getElementById('sale-item-name').value.trim();
    const askingPrice = parseInt(document.getElementById('sale-item-price').value) || 0;
    const qty = parseInt(document.getElementById('sale-item-qty').value) || 1;

    if (!itemName) {
        notify("Please enter the name of the item you wish to sell.", "error");
        return;
    }

    updateDerivedState();
    let camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    const adv = window.appData.activeAdventure;
    const activePcIds = adv?.activePcIds || [];
    const pc = camp.playerCharacters?.find(p => p.playerId === myUid && activePcIds.includes(p.id)) 
             || camp.playerCharacters?.find(p => p.playerId === myUid);

    if (!pc && !camp._isDM) {
        notify("You must enroll a hero to sell items.", "error");
        return;
    }

    const proposal = {
        id: generateId(),
        playerId: myUid,
        playerName: pc ? pc.name : "The Dungeon Master",
        itemName: itemName,
        askingPrice: askingPrice,
        quantity: qty,
        timestamp: Date.now()
    };

    const shop = camp.shops[shopIndex];
    const pendingSales = [...(shop.pendingSales || []), proposal];
    
    camp.shops[shopIndex] = { ...shop, pendingSales };

    if (!camp._isDM) {
        const qtyStr = qty > 1 ? ` (x${qty})` : '';
        camp = logPlayerActivity(camp, myUid, `offered to sell **${itemName}${qtyStr}** to ${shop.name}.`, 'fa-hand-holding-dollar');
    }

    await saveCampaign(camp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Offer sent to ${shop.name}! Awaiting DM approval.`, "success");
    reRender();
};

export const cancelSaleProposal = async (shopId, proposalId, isDMDeclining = false) => {
    if (!isDMDeclining && !confirm("Cancel this sale offer?")) return;
    if (isDMDeclining && !confirm("Decline this player's offer?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    const shop = camp.shops[shopIndex];
    const pendingSales = (shop.pendingSales || []).filter(p => p.id !== proposalId);

    camp.shops[shopIndex] = { ...shop, pendingSales };

    await saveCampaign(camp);
    notify(isDMDeclining ? "Offer declined." : "Offer canceled.", "success");
    reRender();
};

export const approveSaleProposal = async (shopId, proposalId) => {
    if (!confirm("Approve this sale? This will add the item to the shop's inventory, log it in the ledger, and generate a task for the player to collect their gold.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    const shop = camp.shops[shopIndex];
    const proposal = (shop.pendingSales || []).find(p => p.id === proposalId);
    if (!proposal) return;

    const pendingSales = shop.pendingSales.filter(p => p.id !== proposalId);

    let currentInventory = [...(shop.inventory || [])];
    const existingIndex = currentInventory.findIndex(item => item.name === proposal.itemName);
    const inQty = proposal.quantity || 1;
    
    const perItemBuyPrice = proposal.askingPrice / inQty;
    const shelfPrice = Math.ceil(perItemBuyPrice * 2);

    if (existingIndex > -1) {
        currentInventory[existingIndex] = {
            ...currentInventory[existingIndex],
            quantity: (currentInventory[existingIndex].quantity || 1) + inQty
        };
    } else {
        currentInventory.push({
            id: generateId(),
            name: proposal.itemName,
            price: shelfPrice, 
            rarity: 'custom',
            isMagic: false,
            quantity: inQty
        });
    }

    const qtyStr = inQty > 1 ? ` (x${inQty})` : '';
    const timestampStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ledgerEntry = {
        id: generateId(),
        text: `Purchased **${proposal.itemName}${qtyStr}** from **${proposal.playerName}** for **${proposal.askingPrice.toLocaleString()} gp**.`,
        timestamp: Date.now(),
        dateStr: timestampStr
    };
    const ledger = [ledgerEntry, ...(shop.ledger || [])];

    camp.shops[shopIndex] = { ...shop, pendingSales, inventory: currentInventory, ledger };

    if (proposal.playerId) {
        const adv = window.appData.activeAdventure;
        const activePcIds = adv?.activePcIds || [];
        const pc = camp.playerCharacters?.find(p => p.playerId === proposal.playerId && activePcIds.includes(p.id)) 
                 || camp.playerCharacters?.find(p => p.playerId === proposal.playerId);

        if (pc) {
            const newTask = {
                id: generateId(),
                text: `D&D Beyond Sync (${pc.name}): Add ${proposal.askingPrice.toLocaleString()} gp from selling '${proposal.itemName}'${qtyStr} to ${shop.name}. Make sure to remove the item(s) from your inventory!`,
                authorId: camp.dmId,
                resolvedBy: [],
                visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] }, 
                timestamp: Date.now()
            };
            camp.sheetUpdates = [...(camp.sheetUpdates || []), ...[newTask]];
        }
    }

    await saveCampaign(camp);
    notify(`Purchased ${proposal.itemName} from ${proposal.playerName}.`, "success");
    reRender();
};

// ============================================================================
// --- VIEW ROUTING BINDINGS ---
// ============================================================================

export const viewStorefront = (shopId) => {
    window.appData.activeShopId = shopId;
    window.appActions.setView('storefront');
};

export const viewBackroom = (shopId) => {
    window.appData.activeShopId = shopId;
    window.appActions.setView('shop-backroom');
};

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openBazaar = openBazaar;
    window.appActions.openShopEditModal = openShopEditModal;
    window.appActions.saveShop = saveShop;
    window.appActions.deleteShop = deleteShop;
    window.appActions.viewStorefront = viewStorefront;
    window.appActions.viewBackroom = viewBackroom;
    window.appActions.buyItem = buyItem;
    window.appActions.updateItemPrice = updateItemPrice;
    window.appActions.deleteShopItem = deleteShopItem;
    
    window.appActions.toggleBazaarLocation = toggleBazaarLocation;
    window.appActions.toggleAllShops = toggleAllShops;
    window.appActions.toggleAllTravelingShops = toggleAllTravelingShops;
    
    window.appActions.openManualItemModal = openManualItemModal;
    window.appActions.searchBazaarDatabase = searchBazaarDatabase;
    window.appActions.addBazaarItemToShop = addBazaarItemToShop;
    window.appActions.submitCustomItem = submitCustomItem;
    
    window.appActions.rollShopInventory = rollShopInventory;
    window.appActions.executeRollWares = executeRollWares;
    
    window.appActions.openProposeSaleModal = openProposeSaleModal;
    window.appActions.submitSaleProposal = submitSaleProposal;
    window.appActions.cancelSaleProposal = cancelSaleProposal;
    window.appActions.approveSaleProposal = approveSaleProposal;
}
