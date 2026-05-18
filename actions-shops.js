import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

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
        ledger: []
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
        ledger: existingShop ? existingShop.ledger : []
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
            visibility: { mode: 'public' } // Shops are public by default so their names link!
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

// --- INVENTORY & BUYING LOGIC ---

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

    const pc = camp.playerCharacters?.find(p => p.playerId === myUid);
    if (!pc && !camp._isDM) {
        notify("You must enroll a hero to make purchases.", "error");
        return;
    }
    
    const buyerName = camp._isDM ? "The Dungeon Master" : pc.name;

    if (!confirm(`Buy '${item.name}' for ${item.price.toLocaleString()} gp? This will generate a task to deduct the gold from your character sheet.`)) return;

    // 1. Remove Item from Inventory
    const newInventory = shop.inventory.filter(i => i.id !== itemId);

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
            visibility: { mode: 'specific', visibleTo: [myUid] }, 
            timestamp: Date.now()
        };
        camp.sheetUpdates = [...(camp.sheetUpdates || []), newTask];
        
        // Log Activity
        camp = logPlayerActivity(camp, myUid, `purchased **${item.name}** at ${shop.name}.`, 'fa-coins');
    }

    await saveCampaign(camp);
    notify(`Purchased ${item.name}! Check your Tasks to sync your sheet.`, "success");
    reRender();
};

export const addManualItem = async (shopId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const name = prompt("Enter the item name:");
    if (!name) return;
    
    const priceStr = prompt("Enter the price in gold pieces:");
    const price = parseInt(priceStr) || 0;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    const newItem = {
        id: generateId(),
        name: name.trim(),
        price: price,
        rarity: 'custom',
        isMagic: false
    };

    camp.shops[shopIndex].inventory.push(newItem);
    await saveCampaign(camp);
    notify("Item added to shelves.", "success");
    reRender();
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

    if (!confirm("Remove this item from the shop's inventory?")) return;

    const shopIndex = camp.shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) return;

    camp.shops[shopIndex].inventory = camp.shops[shopIndex].inventory.filter(i => i.id !== itemId);

    await saveCampaign(camp);
    reRender();
};

export const rollShopInventory = async (shopId) => {
    // Placeholder function! We will expand this with your themed roll tables shortly.
    notify("Themed Roll Tables are coming in the next update!", "info");
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
    window.appActions.addManualItem = addManualItem;
    window.appActions.updateItemPrice = updateItemPrice;
    window.appActions.deleteShopItem = deleteShopItem;
    window.appActions.rollShopInventory = rollShopInventory;
}
