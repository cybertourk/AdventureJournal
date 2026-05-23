/* STREAMING_CHUNK: Defining search filtering helper... */
import { getLibraryTabsHTML } from './ui-core.js';

// --- SEARCH FILTERING HELPER ---
// This global script is bound to the window context so inline inputs can trigger client-side filtering instantly.
window.filterShopInventory = function(query, containerSelector) {
    const lower = query.toLowerCase().trim();
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = container.querySelectorAll('[data-search-name]');
    items.forEach(item => {
        const name = item.getAttribute('data-search-name') || '';
        if (name.includes(lower)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};

// --- HELPER: GET COLOR ASSIGNMENT BY RARITY ---
function getRarityColor(rarity) {
    const r = (rarity || '').toLowerCase().trim();
    if (r === 'uncommon') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (r === 'rare') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (r === 'veryrare' || r === 'very-rare') return 'text-purple-600 bg-purple-50 border-purple-200';
    if (r === 'legendary') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-stone-500 bg-stone-100 border-stone-200'; // Common or Custom
}

// --- HELPER: ESCAPE SPECIAL CHARACTERS FOR SAFETY ---
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/* STREAMING_CHUNK: Building the Bazaars Location layout folders... */
export function getBazaarHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const shops = camp.shops || [];

    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto">
        ${getLibraryTabsHTML('bazaar')}
    `;

    if (shops.length === 0) {
        html += `
            <div class="p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-store text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">No merchants have set up stalls in the Bazaar yet.</p>
                ${isDM ? `<button onclick="window.appActions.openShopEditModal()" class="mt-6 px-6 py-2 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-stone-800 transition shadow-md"><i class="fa-solid fa-plus mr-2"></i> Establish First Shop</button>` : ''}
            </div>
        </div>
        `;
        return html;
    }

    // Header actions for DM
    if (isDM) {
        html += `
        <div class="flex flex-wrap justify-end gap-2 mb-6">
            <button onclick="window.appActions.openShopEditModal()" class="px-4 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-xs shadow-md">
                <i class="fa-solid fa-plus mr-1.5"></i> New Shop
            </button>
        </div>
        `;
    }

    // Group shops by location
    const grouped = {};
    const traveling = [];
    shops.forEach(s => {
        if (s.isTraveling) {
            traveling.push(s);
        } else {
            const loc = s.location || 'Unknown Location';
            if (!grouped[loc]) grouped[loc] = [];
            grouped[loc].push(s);
        }
    });

    const collapsedLocs = state.bazaarCollapsedLocs || [];

    // Helper to render shop grids within folders
    const renderShopGrid = (shopList) => {
        let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
        shopList.forEach(shop => {
            const statusColor = shop.isOpen ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-stone-500 bg-stone-100 border-stone-200';
            const statusLabel = shop.isOpen ? 'Open' : 'Closed';
            const safeShopName = escapeHTML(shop.name);
            const safeDesc = escapeHTML(shop.desc);
            const safeOwner = escapeHTML(shop.ownerName || 'Unknown');
            const safeType = escapeHTML(shop.shopType || 'Merchant');
            
            const portraitHtml = shop.image ? `
                <div class="w-full h-32 bg-stone-900 overflow-hidden relative border-b border-[#d4c5a9]">
                    <img src="${escapeHTML(shop.image)}" class="w-full h-full object-cover object-top" alt="${safeShopName}" onerror="this.style.display='none'">
                </div>
            ` : '';

            gridHtml += `
            <div class="bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between overflow-hidden group hover:border-amber-400 transition-all">
                <div>
                    ${portraitHtml}
                    <div class="p-4 sm:p-5">
                        <div class="flex justify-between items-start mb-2 gap-2">
                            <h3 class="font-serif font-bold text-lg text-stone-900 leading-tight truncate flex-grow" title="${safeShopName}">${safeShopName}</h3>
                            <span class="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border shrink-0 ${statusColor}">${statusLabel}</span>
                        </div>
                        <div class="flex flex-wrap gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">
                            <span><i class="fa-solid fa-tags mr-1"></i>${safeType}</span>
                            <span>•</span>
                            <span><i class="fa-solid fa-user-tie mr-1"></i>${safeOwner}</span>
                        </div>
                        <p class="text-xs text-stone-600 font-serif leading-relaxed line-clamp-3 italic">"${safeDesc || 'Welcome, traveler...'}"</p>
                    </div>
                </div>
                
                <div class="p-4 bg-stone-50 border-t border-[#d4c5a9] flex flex-wrap gap-2 items-center justify-between shrink-0">
                    <div class="flex gap-1">
                        <button onclick="window.appActions.viewStorefront('${shop.id}')" ${!shop.isOpen && !isDM ? 'disabled' : ''} class="px-3 py-1.5 bg-stone-800 text-amber-50 hover:bg-stone-700 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            Storefront
                        </button>
                        ${isDM ? `
                            <button onclick="window.appActions.viewBackroom('${shop.id}')" class="px-3 py-1.5 bg-emerald-700 text-amber-50 hover:bg-emerald-600 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm">
                                Backroom
                            </button>
                        ` : ''}
                    </div>
                    ${isDM ? `
                        <button onclick="window.appActions.openShopEditModal('${shop.id}')" class="text-stone-400 hover:text-emerald-700 p-1.5 transition" title="Edit Shop">
                            <i class="fa-solid fa-pen-nib"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            `;
        });
        gridHtml += `</div>`;
        return gridHtml;
    };

    html += `<div class="space-y-8">`;

    // Static Shops grouped by Location folders
    Object.keys(grouped).sort().forEach(loc => {
        const collapsed = collapsedLocs.includes(loc);
        const shopsInLoc = grouped[loc];
        const openShops = shopsInLoc.filter(s => s.isOpen).length;
        const totalShops = shopsInLoc.length;

        html += `
        <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
            <div class="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 border-b border-transparent gap-3 sm:gap-0">
                <button class="flex items-center gap-3 flex-grow text-left focus:outline-none" onclick="window.appActions.toggleBazaarLocation('${escapeHTML(loc).replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-map-location-dot text-lg w-6 text-center shrink-0"></i>
                    <span class="font-serif font-bold text-base sm:text-lg tracking-wide">${escapeHTML(loc)}</span>
                    <span class="bg-stone-800 text-stone-400 text-[10px] px-2 py-0.5 rounded-full border border-stone-700 font-sans shrink-0">${openShops} / ${totalShops} Open</span>
                    <i class="fa-solid fa-chevron-down transition-transform duration-200 text-stone-500 ${collapsed ? '' : 'rotate-180'} ml-2 shrink-0"></i>
                </button>
                ${isDM ? `
                <div class="flex gap-1 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                    <button onclick="window.appActions.toggleAllShops('${escapeHTML(loc).replace(/'/g, "\\'")}', true)" class="px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-900 transition">Open All</button>
                    <button onclick="window.appActions.toggleAllShops('${escapeHTML(loc).replace(/'/g, "\\'")}', false)" class="px-2 py-1 bg-stone-850 text-stone-400 border border-stone-700 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-stone-800 transition">Close All</button>
                </div>
                ` : ''}
            </div>
            <div class="${collapsed ? 'hidden' : ''} p-4 bg-[#fdfbf7] border-t border-[#d4c5a9]">
                ${renderShopGrid(shopsInLoc)}
            </div>
        </div>
        `;
    });

    // Traveling Merchants folder
    if (traveling.length > 0) {
        const collapsed = collapsedLocs.includes('Traveling');
        const openShops = traveling.filter(s => s.isOpen).length;
        const totalShops = traveling.length;

        html += `
        <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
            <div class="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 border-b border-transparent gap-3 sm:gap-0">
                <button class="flex items-center gap-3 flex-grow text-left focus:outline-none" onclick="window.appActions.toggleBazaarLocation('Traveling')">
                    <i class="fa-solid fa-caravan text-lg w-6 text-center shrink-0"></i>
                    <span class="font-serif font-bold text-base sm:text-lg tracking-wide">Traveling Merchants</span>
                    <span class="bg-stone-800 text-stone-400 text-[10px] px-2 py-0.5 rounded-full border border-stone-700 font-sans shrink-0">${openShops} / ${totalShops} Active</span>
                    <i class="fa-solid fa-chevron-down transition-transform duration-200 text-stone-500 ${collapsed ? '' : 'rotate-180'} ml-2 shrink-0"></i>
                </button>
                ${isDM ? `
                <div class="flex gap-1 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                    <button onclick="window.appActions.toggleAllTravelingShops(true)" class="px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-900 transition">Activate All</button>
                    <button onclick="window.appActions.toggleAllTravelingShops(false)" class="px-2 py-1 bg-stone-850 text-stone-400 border border-stone-700 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-stone-800 transition">Deactivate All</button>
                </div>
                ` : ''}
            </div>
            <div class="${collapsed ? 'hidden' : ''} p-4 bg-[#fdfbf7] border-t border-[#d4c5a9]">
                ${renderShopGrid(traveling)}
            </div>
        </div>
        `;
    }

    html += `</div></div>`;
    return html;
}

/* STREAMING_CHUNK: Rendering the storefront view and item thumbnail images... */
export function getStorefrontHTML(state) {
    const camp = state.activeCampaign;
    const shopId = state.activeShopId;
    if (!camp || !shopId) return '';

    const shop = camp.shops?.find(s => s.id === shopId);
    if (!shop) return '<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Merchant not found.</div>';

    const safeName = escapeHTML(shop.name);
    const safeDesc = escapeHTML(shop.desc);
    const safeOwner = escapeHTML(shop.ownerName || 'Unknown');
    const safeType = escapeHTML(shop.shopType || 'Merchant');
    const safeLoc = escapeHTML(shop.location || 'Traveling');
    const inventory = shop.inventory || [];
    const pendingSales = shop.pendingSales || [];

    const myUid = state.currentUserUid;
    const adv = state.activeAdventure || window.appData?.activeAdventure;
    const activePcIds = adv?.activePcIds || [];
    const pc = camp.playerCharacters?.find(p => p.playerId === myUid && activePcIds.includes(p.id)) 
             || camp.playerCharacters?.find(p => p.playerId === myUid);
    const canInteract = !!pc || camp._isDM;

    let invHtml = '';
    if (inventory.length === 0) {
        invHtml = `<div class="text-center p-8 bg-white border border-[#d4c5a9] rounded-sm text-stone-500 italic text-sm shadow-sm">The shelves are currently bare.</div>`;
    } else {
        invHtml = `
        <div class="mb-4 relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input type="text" oninput="window.filterShopInventory(this.value, '#storefront-inventory-list')" class="w-full pl-9 pr-3 py-2 bg-white border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 shadow-sm placeholder:text-stone-400" placeholder="Search wares...">
        </div>
        <div id="storefront-inventory-list" class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
        
        inventory.forEach(item => {
            const rColor = getRarityColor(item.rarity);
            const safeItemName = escapeHTML(item.name);
            const qtyStr = (item.quantity && item.quantity > 1) ? `<span class="text-amber-600 ml-1.5 font-black text-[10px]">x${item.quantity}</span>` : '';
            const priceStr = item.price > 0 ? `${item.price.toLocaleString()} gp` : `Free`;
            
            // Premium layout integrating small thumbnails with a fallback icon
            const itemImageHtml = item.image 
                ? `<img src="${escapeHTML(item.image)}" class="w-10 h-10 object-contain shrink-0 border border-stone-200 bg-stone-100 rounded-sm p-1 shadow-inner" onerror="this.style.display='none'">` 
                : `<div class="w-10 h-10 bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200 rounded-sm text-stone-400 text-sm"><i class="fa-solid fa-box"></i></div>`;

            invHtml += `
                <div data-search-name="${safeItemName.toLowerCase()}" class="bg-white border border-[#d4c5a9] rounded-sm p-3 shadow-sm flex justify-between items-center gap-3 hover:border-amber-300 transition-colors">
                    <div class="min-w-0 flex-grow pr-2 flex items-center gap-3">
                        ${itemImageHtml}
                        <div class="min-w-0">
                            <span class="font-bold text-sm text-stone-900 block truncate" title="${safeItemName}">${safeItemName} ${qtyStr}</span>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[9px] uppercase font-bold tracking-widest ${rColor}">${item.rarity || 'Item'}</span>
                                <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm border border-amber-200"><i class="fa-solid fa-coins mr-1 text-amber-500"></i>${priceStr}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.appActions.buyItem('${shop.id}', '${item.id}')" ${!canInteract ? 'disabled' : ''} class="shrink-0 px-4 py-2 bg-stone-800 text-amber-50 hover:bg-emerald-700 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        Buy
                    </button>
                </div>
            `;
        });
        invHtml += `</div>`;
    }

    let sellHtml = '';
    if (shop.buysItems) {
        let proposedListHtml = '';
        const myProposals = pendingSales.filter(p => p.playerId === myUid);
        
        if (myProposals.length > 0) {
            proposedListHtml = `<div class="space-y-2 mt-3">`;
            myProposals.forEach(prop => {
                const qtyStr = (prop.quantity && prop.quantity > 1) ? ` (x${prop.quantity})` : '';
                proposedListHtml += `
                <div class="bg-stone-50 p-2.5 border border-[#d4c5a9] rounded-sm text-xs flex justify-between items-center shadow-sm">
                    <div class="min-w-0">
                        <span class="font-bold text-stone-900 block truncate">${escapeHTML(prop.itemName)}${qtyStr}</span>
                        <span class="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-block"><i class="fa-solid fa-coins mr-1"></i>Asking: ${prop.askingPrice.toLocaleString()} gp</span>
                    </div>
                    <button onclick="window.appActions.cancelSaleProposal('${shop.id}', '${prop.id}')" class="text-stone-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider transition p-1.5"><i class="fa-solid fa-trash mr-1"></i> Cancel</button>
                </div>
                `;
            });
            proposedListHtml += `</div>`;
        } else {
            proposedListHtml = `<p class="text-xs text-stone-400 italic mt-3">You have no active sale proposals in this shop.</p>`;
        }

        sellHtml = `
        <div class="mt-8 pt-6 border-t border-[#d4c5a9]">
            <h4 class="font-serif font-bold text-lg text-stone-900 mb-2"><i class="fa-solid fa-hand-holding-dollar mr-2 text-emerald-600"></i> Offer Items for Sale</h4>
            <p class="text-xs text-stone-600 italic leading-relaxed mb-4">This merchant is interested in buying goods. You can offer items from your inventory for gold, subject to DM approval.</p>
            
            <button onclick="window.appActions.openProposeSaleModal('${shop.id}')" ${!canInteract ? 'disabled' : ''} class="px-4 py-2 bg-emerald-700 text-amber-50 hover:bg-emerald-600 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                Propose Item Sale
            </button>
            
            <div class="mt-4">
                <h5 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5 border-b border-stone-200 pb-0.5">My Pending Offers</h5>
                ${proposedListHtml}
            </div>
        </div>
        `;
    }

    // Main layout
    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-5xl mx-auto">
        <div class="bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            
            <!-- Shop Banner/Header -->
            <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-stone-900 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-emerald-700 gap-4 sm:gap-0 shadow-md">
                <div>
                    <h2 class="text-xl sm:text-2xl font-serif font-bold text-amber-50 leading-tight">${safeName}</h2>
                    <div class="flex flex-wrap gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-1.5">
                        <span><i class="fa-solid fa-tags mr-1"></i>${safeType}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-user-tie mr-1"></i>${safeOwner}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-map-location-dot mr-1"></i>${safeLoc}</span>
                    </div>
                </div>
                <button onclick="window.appActions.setView('bazaar')" class="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-50 border border-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md">
                    <i class="fa-solid fa-arrow-left mr-2"></i> Return to Bazaar
                </button>
            </div>

            <!-- Portrait & Content -->
            <div class="p-5 sm:p-8 flex flex-col lg:flex-row gap-6 bg-[#fdfbf7]">
                ${shop.image ? `
                <div class="w-full lg:w-1/3 shrink-0 h-48 sm:h-64 lg:h-auto max-h-[350px] overflow-hidden border border-[#d4c5a9] bg-stone-900 shadow-inner rounded-sm">
                    <img src="${escapeHTML(shop.image)}" class="w-full h-full object-cover object-top" alt="${safeName}">
                </div>
                ` : ''}
                
                <div class="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                        <h4 class="font-serif font-bold text-lg text-stone-900 mb-2 border-b border-stone-200 pb-1">The Atmosphere</h4>
                        <p class="text-stone-700 text-sm leading-relaxed font-serif italic mb-6">"${safeDesc || 'Welcome, traveler. Have a look at our selection...'}"</p>
                        
                        <h4 class="font-serif font-bold text-lg text-stone-900 mb-3 border-b border-stone-200 pb-1">Merchant Inventory</h4>
                        ${invHtml}
                    </div>
                    
                    ${sellHtml}
                </div>
            </div>
            
        </div>
    </div>
    `;
    return html;
}

/* STREAMING_CHUNK: Rendering the DM's backroom panel and listing item records... */
export function getShopBackroomHTML(state) {
    const camp = state.activeCampaign;
    const shopId = state.activeShopId;
    if (!camp || !shopId || !camp._isDM) return '';

    const shop = camp.shops?.find(s => s.id === shopId);
    if (!shop) return '<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Merchant not found.</div>';

    const safeName = escapeHTML(shop.name);
    const safeDesc = escapeHTML(shop.desc);
    const safeOwner = escapeHTML(shop.ownerName || 'Unknown');
    const safeType = escapeHTML(shop.shopType || 'Merchant');
    const safeLoc = escapeHTML(shop.location || 'Traveling');
    
    const inventory = shop.inventory || [];
    const ledger = shop.ledger || [];
    const pendingSales = shop.pendingSales || [];

    let invHtml = '';
    if (inventory.length === 0) {
        invHtml = `<div class="text-center p-6 bg-stone-50 border border-dashed border-[#d4c5a9] rounded-sm text-stone-500 italic text-sm">Inventory is empty. Add items manually or use a themed roll table.</div>`;
    } else {
        invHtml = `
        <div class="mb-4 relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs"></i>
            <input type="text" oninput="window.filterShopInventory(this.value, '#backroom-inventory-list')" class="w-full pl-9 pr-3 py-2 bg-white border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-stone-600 shadow-sm placeholder:text-stone-400" placeholder="Search inventory...">
        </div>
        <div id="backroom-inventory-list" class="space-y-2">`;
        
        inventory.forEach(item => {
            const rColor = getRarityColor(item.rarity);
            const qtyStr = (item.quantity && item.quantity > 1) ? `<span class="text-amber-600 ml-1.5 font-black text-[10px]">x${item.quantity}</span>` : '';
            const safeItemName = escapeHTML(item.name) + qtyStr;
            
            // Dynamic image container for DM backroom inventory
            const itemImageHtml = item.image 
                ? `<img src="${escapeHTML(item.image)}" class="w-10 h-10 object-contain shrink-0 border border-stone-200 bg-stone-100 rounded-sm p-1 shadow-inner" onerror="this.style.display='none'">` 
                : `<div class="w-10 h-10 bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200 rounded-sm text-stone-400 text-sm"><i class="fa-solid fa-box"></i></div>`;

            invHtml += `
                <div data-search-name="${escapeHTML(item.name).toLowerCase()}" class="bg-white border border-[#d4c5a9] rounded-sm p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-amber-300 transition-colors group">
                    <div class="min-w-0 flex-grow pr-2 flex items-center gap-3">
                        ${itemImageHtml}
                        <div class="min-w-0">
                            <span class="font-bold text-sm text-stone-900 block truncate" title="${escapeHTML(item.name)}">${safeItemName}</span>
                            <span class="text-[9px] uppercase font-bold tracking-widest ${rColor}">${item.rarity || 'Item'} ${item.isMagic ? '<i class="fa-solid fa-sparkles ml-1 text-amber-500" title="Magical"></i>' : ''}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                        <div class="flex items-center bg-stone-100 border border-stone-300 rounded shadow-inner overflow-hidden">
                            <span class="px-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest border-r border-stone-300">Price</span>
                            <span class="px-3 py-1.5 text-xs font-bold text-amber-700 bg-white min-w-[60px] text-center">${item.price.toLocaleString()} gp</span>
                            <button onclick="window.appActions.updateItemPrice('${shop.id}', '${item.id}')" class="px-2 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-600 border-l border-stone-300 transition"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        </div>
                        <button onclick="window.appActions.deleteShopItem('${shop.id}', '${item.id}')" class="w-8 h-8 flex items-center justify-center bg-white border border-stone-300 hover:border-red-400 hover:text-red-700 hover:bg-red-50 text-stone-400 rounded transition shadow-sm shrink-0"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </div>
            `;
        });
        invHtml += `</div>`;
    }

    // Build Transaction Ledger History List
    let ledgerHtml = '';
    if (ledger.length === 0) {
        ledgerHtml = `<p class="text-xs text-stone-400 italic">No transaction records logged.</p>`;
    } else {
        ledgerHtml = `<div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">`;
        ledger.forEach(entry => {
            ledgerHtml += `
            <div class="p-2 border-b border-stone-200 last:border-0 text-xs text-stone-700 leading-snug">
                <span class="block text-[8px] uppercase tracking-widest text-stone-400 mb-0.5">${entry.dateStr || 'Recent Transaction'}</span>
                <div>${window.appActions.parseSmartText(entry.text)}</div>
            </div>
            `;
        });
        ledgerHtml += `</div>`;
    }

    // Build Pending Player Proposals Review Panel
    let pendingHtml = '';
    if (pendingSales.length === 0) {
        pendingHtml = `<p class="text-xs text-stone-400 italic">No active offers from players.</p>`;
    } else {
        pendingHtml = `<div class="space-y-3">`;
        pendingSales.forEach(prop => {
            const qtyStr = (prop.quantity && prop.quantity > 1) ? ` (x${prop.quantity})` : '';
            pendingHtml += `
            <div class="bg-[#fdfbf7] p-3 border border-[#d4c5a9] rounded-sm text-xs shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div class="min-w-0">
                    <span class="font-serif text-[10px] text-stone-500 uppercase tracking-widest block font-bold mb-1">Offer from: ${escapeHTML(prop.playerName)}</span>
                    <span class="font-bold text-stone-900 text-sm block truncate" title="${escapeHTML(prop.itemName)}">${escapeHTML(prop.itemName)}${qtyStr}</span>
                    <span class="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1.5 inline-block"><i class="fa-solid fa-coins mr-1 text-amber-500"></i>Asking: ${prop.askingPrice.toLocaleString()} gp</span>
                </div>
                <div class="flex gap-2 shrink-0 self-end sm:self-auto">
                    <button onclick="window.appActions.cancelSaleProposal('${shop.id}', '${prop.id}', true)" class="px-3 py-1.5 bg-stone-200 hover:bg-red-50 text-stone-700 hover:text-red-700 hover:border-red-300 border border-stone-300 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm">Decline</button>
                    <button onclick="window.appActions.approveSaleProposal('${shop.id}', '${prop.id}')" class="px-3 py-1.5 bg-emerald-700 text-amber-50 hover:bg-emerald-600 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm">Approve</button>
                </div>
            </div>
            `;
        });
        pendingHtml += `</div>`;
    }

    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-5xl mx-auto">
        <div class="bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            
            <!-- Backroom Header -->
            <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-stone-900 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-emerald-700 gap-4 sm:gap-0 shadow-md">
                <div>
                    <h2 class="text-xl sm:text-2xl font-serif font-bold text-amber-50 leading-tight">Backroom Management: ${safeName}</h2>
                    <div class="flex flex-wrap gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-1.5">
                        <span><i class="fa-solid fa-tags mr-1"></i>${safeType}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-user-tie mr-1"></i>${safeOwner}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-map-location-dot mr-1"></i>${safeLoc}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.appActions.viewStorefront('${shop.id}')" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-amber-50 border border-emerald-800 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md">
                        Storefront
                    </button>
                    <button onclick="window.appActions.setView('bazaar')" class="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-50 border border-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md">
                        Bazaar
                    </button>
                </div>
            </div>

            <!-- Management Tools Content Grid -->
            <div class="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#fdfbf7]">
                
                <!-- Inventory Column (Left / 2 Cols Wide) -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-[#f4ebd8] p-4 border border-[#d4c5a9] rounded-sm shadow-sm">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 pb-2 border-b border-[#d4c5a9]">
                            <h4 class="font-serif font-bold text-lg text-stone-900"><i class="fa-solid fa-boxes-stacked mr-2 text-stone-600"></i> Stock & Shelves</h4>
                            <div class="flex gap-2 w-full sm:w-auto">
                                <button onclick="window.appActions.rollShopInventory('${shop.id}')" class="flex-grow sm:flex-none px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-50 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm"><i class="fa-solid fa-dice-d20 mr-1.5"></i> Roll Wares</button>
                                <button onclick="window.appActions.openManualItemModal('${shop.id}')" class="flex-grow sm:flex-none px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-amber-50 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm"><i class="fa-solid fa-plus-circle mr-1.5"></i> Add Wares</button>
                            </div>
                        </div>
                        
                        ${invHtml}
                    </div>
                </div>

                <!-- Ledger and Offers Column (Right / 1 Col Wide) -->
                <div class="space-y-6">
                    <!-- Offers review panel -->
                    <div class="bg-[#f4ebd8] p-4 border border-[#d4c5a9] rounded-sm shadow-sm">
                        <h4 class="font-serif font-bold text-lg text-stone-900 mb-4 pb-2 border-b border-[#d4c5a9]"><i class="fa-solid fa-handholding-dollar mr-2 text-stone-600"></i> Player Proposals</h4>
                        ${pendingHtml}
                    </div>

                    <!-- Transaction Ledger Panel -->
                    <div class="bg-[#f4ebd8] p-4 border border-[#d4c5a9] rounded-sm shadow-sm">
                        <h4 class="font-serif font-bold text-lg text-stone-900 mb-4 pb-2 border-b border-[#d4c5a9]"><i class="fa-solid fa-book mr-2 text-stone-600"></i> Shop Ledger</h4>
                        ${ledgerHtml}
                    </div>
                </div>

            </div>
            
        </div>
    </div>
    `;
    return html;
}
