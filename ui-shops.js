import { getLibraryTabsHTML } from './ui-core.js';

const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const getRarityColor = (rarity) => {
    switch((rarity || '').toLowerCase()) {
        case 'legendary': return 'text-orange-600';
        case 'very-rare': case 'very rare': return 'text-purple-600';
        case 'rare': return 'text-blue-600';
        case 'uncommon': return 'text-emerald-600';
        case 'common': return 'text-stone-500';
        case 'custom': return 'text-amber-700';
        default: return 'text-stone-500';
    }
};

export function getBazaarHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const allShops = camp.shops || [];
    
    // Players only see Open shops
    const visibleShops = isDM ? allShops : allShops.filter(s => s.isOpen);
    
    // Sort alphabetically by name first to ensure predictable ordering within groups
    const sortedShops = [...visibleShops].sort((a,b) => a.name.localeCompare(b.name));

    let listHtml = '';
    
    if (sortedShops.length === 0) {
        listHtml = `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-store-slash text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">There are no merchants available.</p>
                ${isDM ? `<p class="text-xs sm:text-sm mt-2 font-sans">Establish your first shop to give players a place to spend their gold.</p>` : ''}
            </div>
        `;
    } else {
        // --- GROUPING ENGINE ---
        const groupedShops = {};
        const travelingShops = [];

        sortedShops.forEach(shop => {
            if (shop.isTraveling) {
                travelingShops.push(shop);
            } else {
                const loc = shop.location ? shop.location.trim() : 'Unknown Location';
                if (!groupedShops[loc]) groupedShops[loc] = [];
                groupedShops[loc].push(shop);
            }
        });

        const sortedLocations = Object.keys(groupedShops).sort((a, b) => a.localeCompare(b));

        const renderShopGrid = (shops) => {
            let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">`;
            
            shops.forEach(shop => {
                const safeName = escapeHTML(shop.name);
                const safeType = escapeHTML(shop.shopType || 'Merchant');
                const safeLoc = escapeHTML(shop.location || 'Unknown Location');
                const itemCount = (shop.inventory || []).length;
                
                const statusBadge = shop.isOpen 
                    ? `<span class="absolute top-2 right-2 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase font-bold px-2 py-0.5 rounded-sm shadow-sm z-10"><i class="fa-solid fa-door-open mr-1"></i> Open</span>`
                    : `<span class="absolute top-2 right-2 text-[9px] bg-red-100 text-red-800 border border-red-300 uppercase font-bold px-2 py-0.5 rounded-sm shadow-sm z-10"><i class="fa-solid fa-door-closed mr-1"></i> Closed</span>`;

                const imgHtml = shop.image 
                    ? `<div class="w-full h-32 bg-stone-900 overflow-hidden relative shrink-0"><img src="${shop.image}" class="w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 transition-opacity" alt="${safeName}"></div>`
                    : `<div class="w-full h-12 bg-stone-200 border-b border-[#d4c5a9] shrink-0"></div>`;

                const onClickAction = isDM ? `window.appActions.viewBackroom('${shop.id}')` : `window.appActions.viewStorefront('${shop.id}')`;
                
                gridHtml += `
                <div class="bg-white rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col group relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition duration-200 cursor-pointer" onclick="${onClickAction}">
                    <div class="absolute top-0 left-0 w-1 h-full bg-emerald-700 group-hover:bg-emerald-500 transition-colors z-20"></div>
                    ${isDM ? statusBadge : ''}
                    ${imgHtml}
                    <div class="p-4 flex flex-col flex-grow relative z-10">
                        <h3 class="font-serif font-bold text-lg text-emerald-900 leading-tight mb-1 truncate pr-8">${safeName}</h3>
                        ${shop.isTraveling ? `<p class="text-[10px] uppercase font-bold text-amber-700 tracking-widest mb-3 truncate"><i class="fa-solid fa-caravan mr-1"></i> Spotted near ${safeLoc}</p>` : `<p class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-3 truncate"><i class="fa-solid fa-map-pin mr-1"></i> ${safeLoc}</p>`}
                        
                        <div class="mt-auto flex justify-between items-center pt-3 border-t border-stone-100">
                            <span class="text-xs font-bold text-stone-700"><i class="fa-solid fa-tag text-amber-600 mr-1.5"></i> ${itemCount} Wares</span>
                            <span class="text-[10px] uppercase font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-sm">${safeType}</span>
                        </div>
                    </div>
                </div>
                `;
            });
            
            gridHtml += `</div>`;
            return gridHtml;
        };

        // Render standard locations first
        sortedLocations.forEach(loc => {
            listHtml += `
                <h3 class="text-lg font-serif font-bold text-stone-800 mb-4 flex items-center border-b-2 border-stone-300 pb-2">
                    <i class="fa-solid fa-map-location-dot mr-2 text-stone-400"></i> ${escapeHTML(loc)}
                </h3>
            `;
            listHtml += renderShopGrid(groupedShops[loc]);
        });

        // Render traveling merchants in their own block at the bottom
        if (travelingShops.length > 0) {
            listHtml += `
                <div class="mt-8">
                    <h3 class="text-lg font-serif font-bold text-emerald-900 mb-4 flex items-center border-b-2 border-emerald-300 pb-2">
                        <i class="fa-solid fa-caravan mr-2 text-emerald-600"></i> Traveling Merchants
                    </h3>
                    ${renderShopGrid(travelingShops)}
                </div>
            `;
        }
    }

    return `
    <div class="animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto">
        ${getLibraryTabsHTML('bazaar')}

        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#d4c5a9] pb-4">
            <div>
                <h2 class="text-2xl sm:text-3xl font-serif font-bold text-emerald-900 leading-tight flex items-center">
                    <i class="fa-solid fa-store mr-3 text-emerald-600"></i> The Bazaar
                </h2>
                <p class="text-stone-500 text-xs font-sans mt-1 italic">Merchants, markets, and purveyors of fine goods.</p>
            </div>
            
            ${isDM ? `
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <button onclick="window.appActions.openShopEditModal()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-emerald-800 text-amber-50 border border-emerald-900 rounded-sm hover:bg-emerald-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm active:scale-95">
                    <i class="fa-solid fa-plus mr-1.5"></i> Establish Shop
                </button>
            </div>
            ` : ''}
        </div>
        ${listHtml}
    </div>
    `;
}

export function getStorefrontHTML(state) {
    const camp = state.activeCampaign;
    const shopId = state.activeShopId;
    if (!camp || !shopId) return '';

    const shop = camp.shops?.find(s => s.id === shopId);
    if (!shop) return '<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Merchant not found.</div>';

    const safeName = escapeHTML(shop.name);
    const safeDesc = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(shop.desc) : shop.desc.replace(/\n/g, '<br>');
    const safeOwner = escapeHTML(shop.ownerName || 'The Proprietor');
    const safeType = escapeHTML(shop.shopType || 'General Goods');
    const safeLoc = escapeHTML(shop.location || 'Unknown');

    const inventory = shop.inventory || [];
    
    // Check if player can buy/sell
    const myUid = state.currentUserUid;
    const pc = camp.playerCharacters?.find(p => p.playerId === myUid);
    const canInteract = !!pc || camp._isDM;

    let invHtml = '';
    if (inventory.length === 0) {
        invHtml = `<div class="text-center p-8 bg-white border border-[#d4c5a9] rounded-sm text-stone-500 italic text-sm shadow-sm">The shelves are currently bare.</div>`;
    } else {
        invHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
        inventory.forEach(item => {
            const rColor = getRarityColor(item.rarity);
            const safeItemName = escapeHTML(item.name);
            const priceStr = item.price > 0 ? `${item.price.toLocaleString()} gp` : `Free`;
            
            invHtml += `
                <div class="bg-white border border-[#d4c5a9] rounded-sm p-3 shadow-sm flex justify-between items-center gap-2 hover:border-amber-300 transition-colors">
                    <div class="min-w-0 flex-grow pr-2">
                        <span class="font-bold text-sm text-stone-900 block truncate" title="${safeItemName}">${safeItemName}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[9px] uppercase font-bold tracking-widest ${rColor}">${item.rarity || 'Item'}</span>
                            <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm border border-amber-200"><i class="fa-solid fa-coins mr-1 text-amber-500"></i>${priceStr}</span>
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

    // Sell Items / Proposal HTML
    let buysHtml = '';
    if (shop.buysItems) {
        buysHtml = `
        <div class="mt-6 bg-emerald-50 border border-emerald-200 p-4 rounded-sm shadow-sm">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-scale-balanced text-emerald-600 mt-1 text-lg"></i>
                <div>
                    <h4 class="text-xs text-emerald-900 font-bold uppercase tracking-widest mb-1">Purchasing Wares</h4>
                    <p class="text-xs text-emerald-800 leading-snug mb-3">This merchant is currently accepting offers for items. Submit a proposal, and the DM will review it.</p>
                    <button onclick="window.appActions.openProposeSaleModal('${shop.id}')" ${!canInteract ? 'disabled title="Enroll a hero first"' : ''} class="px-4 py-2 bg-emerald-700 text-amber-50 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm"><i class="fa-solid fa-hand-holding-dollar mr-1.5"></i> Make an Offer</button>
                </div>
            </div>
        </div>
        `;
    }

    // Add pending sales visible to the current player
    const myPending = (shop.pendingSales || []).filter(p => p.playerId === myUid);
    if (myPending.length > 0) {
        buysHtml += `<div class="mt-4 space-y-2">`;
        buysHtml += `<h4 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest border-b border-[#d4c5a9] pb-1 mb-2">My Pending Offers</h4>`;
        myPending.forEach(p => {
            buysHtml += `
            <div class="bg-white border border-[#d4c5a9] p-2 sm:p-3 rounded-sm shadow-sm flex justify-between items-center group">
                <div>
                    <span class="block text-xs font-bold text-stone-800">${escapeHTML(p.itemName)}</span>
                    <span class="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Asking: <span class="text-amber-600">${p.askingPrice.toLocaleString()} gp</span></span>
                </div>
                <button onclick="window.appActions.cancelSaleProposal('${shop.id}', '${p.id}')" class="text-[9px] px-3 py-1.5 text-red-700 hover:text-white hover:bg-red-700 border border-red-200 rounded-sm transition uppercase font-bold tracking-wider shadow-sm opacity-50 group-hover:opacity-100">Cancel</button>
            </div>
            `;
        });
        buysHtml += `</div>`;
    }

    return `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#fdfbf7] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-5xl mx-auto h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] relative">
        
        <div class="bg-stone-900 p-4 border-b-4 border-emerald-700 text-amber-500 flex justify-between items-center shrink-0 shadow-md z-10">
            <h2 class="text-xl sm:text-2xl font-serif font-bold flex items-center min-w-0 pr-4">
                <i class="fa-solid fa-store mr-3 text-emerald-500 shrink-0"></i> 
                <span class="truncate text-amber-50">${safeName}</span>
            </h2>
            <button onclick="window.appActions.setView('bazaar')" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center shrink-0"><i class="fa-solid fa-times"></i></button>
        </div>

        <div class="flex-grow overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
            
            <!-- Left Info Panel -->
            <div class="w-full md:w-1/3 bg-[#f4ebd8] border-r border-[#d4c5a9] flex flex-col shrink-0">
                ${shop.image ? `<div class="w-full h-48 md:h-64 bg-stone-900 shrink-0 border-b border-[#d4c5a9]"><img src="${shop.image}" class="w-full h-full object-cover object-center" alt="Proprietor"></div>` : ''}
                <div class="p-5 sm:p-6 flex-grow">
                    <h3 class="font-serif font-bold text-lg text-emerald-900 mb-1">${safeOwner}</h3>
                    <div class="flex flex-wrap gap-2 mb-4">
                        <span class="text-[9px] uppercase font-bold text-stone-500 bg-white px-2 py-0.5 rounded shadow-sm border border-[#d4c5a9]">${safeType}</span>
                        ${shop.isTraveling ? `<span class="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shadow-sm border border-amber-200"><i class="fa-solid fa-caravan mr-1"></i>Traveling</span>` : ''}
                        <span class="text-[9px] uppercase font-bold text-stone-500 bg-white px-2 py-0.5 rounded shadow-sm border border-[#d4c5a9]"><i class="fa-solid fa-map-pin mr-1"></i>${safeLoc}</span>
                    </div>
                    <div class="text-sm font-serif text-stone-800 leading-relaxed">${safeDesc || '<i class="text-stone-400">No public description provided.</i>'}</div>
                    
                    ${buysHtml}
                </div>
            </div>

            <!-- Right Inventory Panel -->
            <div class="w-full md:w-2/3 bg-[#fdfbf7] p-5 sm:p-6 lg:p-8">
                <div class="flex justify-between items-end mb-4 border-b border-[#d4c5a9] pb-2">
                    <h3 class="text-lg font-serif font-bold text-stone-900 flex items-center"><i class="fa-solid fa-boxes-stacked mr-2 text-amber-700"></i> Wares & Inventory</h3>
                    ${!canInteract ? `<span class="text-[9px] uppercase font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 shadow-sm"><i class="fa-solid fa-circle-exclamation mr-1"></i> Enroll Hero to Interact</span>` : ''}
                </div>
                ${invHtml}
            </div>

        </div>
    </div>
    `;
}

export function getShopBackroomHTML(state) {
    const camp = state.activeCampaign;
    const shopId = state.activeShopId;
    if (!camp || !camp._isDM || !shopId) return '';

    const shop = camp.shops?.find(s => s.id === shopId);
    if (!shop) return '<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Merchant not found.</div>';

    const safeName = escapeHTML(shop.name);
    const inventory = shop.inventory || [];
    const ledger = shop.ledger || [];
    const pendingSales = shop.pendingSales || [];

    // --- PENDING SALES TRAY (DM) ---
    let proposalsHtml = '';
    if (pendingSales.length > 0) {
        proposalsHtml = `
        <div class="bg-blue-50 border border-blue-200 p-4 sm:p-5 rounded-sm shadow-sm mb-8 animate-in slide-in-from-top-4">
            <h3 class="text-lg font-serif font-bold text-blue-900 flex items-center mb-4 border-b border-blue-200 pb-2"><i class="fa-solid fa-inbox mr-2"></i> Pending Player Offers</h3>
            <div class="space-y-3">
        `;
        pendingSales.forEach(p => {
            proposalsHtml += `
            <div class="bg-white p-3 border border-blue-200 rounded-sm shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <span class="block text-sm font-bold text-stone-900">${escapeHTML(p.itemName)}</span>
                    <div class="text-[10px] uppercase font-bold tracking-widest mt-1 flex flex-wrap items-center gap-2">
                        <span class="text-stone-500"><i class="fa-solid fa-user mr-1"></i> ${escapeHTML(p.playerName)}</span>
                        <span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shadow-sm">Asking: ${p.askingPrice.toLocaleString()} gp</span>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="window.appActions.cancelSaleProposal('${shop.id}', '${p.id}', true)" class="px-4 py-2 bg-white text-red-700 border border-red-200 hover:bg-red-50 rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-sm">Decline</button>
                    <button onclick="window.appActions.approveSaleProposal('${shop.id}', '${p.id}')" class="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-600 rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-md flex items-center"><i class="fa-solid fa-check mr-1.5"></i> Approve</button>
                </div>
            </div>
            `;
        });
        proposalsHtml += `</div></div>`;
    }

    let invHtml = '';
    if (inventory.length === 0) {
        invHtml = `<div class="text-center p-6 bg-stone-50 border border-dashed border-[#d4c5a9] rounded-sm text-stone-500 italic text-sm">Inventory is empty. Add items manually or use a themed roll table.</div>`;
    } else {
        invHtml = `<div class="space-y-2">`;
        inventory.forEach(item => {
            const rColor = getRarityColor(item.rarity);
            const safeItemName = escapeHTML(item.name);
            
            invHtml += `
                <div class="bg-white border border-[#d4c5a9] rounded-sm p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:border-amber-300 transition-colors group">
                    <div class="min-w-0 flex-grow pr-2">
                        <span class="font-bold text-sm text-stone-900 block truncate" title="${safeItemName}">${safeItemName}</span>
                        <span class="text-[9px] uppercase font-bold tracking-widest ${rColor}">${item.rarity || 'Item'} ${item.isMagic ? '<i class="fa-solid fa-sparkles ml-1 text-amber-500" title="Magical"></i>' : ''}</span>
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

    let ledgerHtml = '';
    if (ledger.length === 0) {
        ledgerHtml = `<div class="text-center p-6 bg-[#f4ebd8] border border-dashed border-[#d4c5a9] rounded-sm text-stone-500 italic text-sm">No transactions recorded yet.</div>`;
    } else {
        ledgerHtml = `<div class="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#d4c5a9] before:to-transparent">`;
        ledger.forEach(entry => {
            const parsedText = window.appActions.parseSmartText(entry.text);
            ledgerHtml += `
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#fdfbf7] bg-stone-200 text-stone-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                        <i class="fa-solid fa-file-invoice-dollar text-xs"></i>
                    </div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded border border-[#d4c5a9] shadow-sm">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] font-bold uppercase tracking-widest text-stone-400">${entry.dateStr}</span>
                        </div>
                        <div class="text-xs text-stone-800 font-serif leading-snug">${parsedText}</div>
                    </div>
                </div>
            `;
        });
        ledgerHtml += `</div>`;
    }

    return `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#fdfbf7] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-5xl mx-auto h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] relative">
        
        <div class="bg-stone-900 p-4 border-b-4 border-stone-500 text-amber-500 flex justify-between items-center shrink-0 shadow-md z-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
            <h2 class="text-xl sm:text-2xl font-serif font-bold flex items-center min-w-0 pr-4">
                <i class="fa-solid fa-key mr-3 text-stone-400 shrink-0"></i> 
                <span class="truncate text-amber-50">DM Backroom: ${safeName}</span>
            </h2>
            <div class="flex gap-2 shrink-0">
                <button onclick="window.appActions.openShopEditModal('${shop.id}')" class="px-3 py-1.5 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center border border-stone-600 shadow-sm text-[10px] font-bold uppercase tracking-wider hidden sm:flex"><i class="fa-solid fa-pen mr-1.5"></i> Edit Shop</button>
                <button onclick="window.appActions.setView('bazaar')" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center border border-stone-600 shadow-sm"><i class="fa-solid fa-times"></i></button>
            </div>
        </div>

        <div class="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
            
            <!-- Quick Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-sm text-center">
                    <span class="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Status</span>
                    ${shop.isOpen ? `<span class="text-sm font-black text-emerald-600"><i class="fa-solid fa-door-open mr-1"></i> Open to Party</span>` : `<span class="text-sm font-black text-red-600"><i class="fa-solid fa-door-closed mr-1"></i> Closed</span>`}
                </div>
                <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-sm text-center">
                    <span class="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Buying</span>
                    ${shop.buysItems ? `<span class="text-sm font-black text-blue-600"><i class="fa-solid fa-scale-balanced mr-1"></i> Active</span>` : `<span class="text-sm font-black text-stone-400"><i class="fa-solid fa-ban mr-1"></i> Refusing</span>`}
                </div>
                <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-sm text-center">
                    <span class="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Total Wares</span>
                    <span class="text-sm font-black text-stone-800">${inventory.length}</span>
                </div>
                <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-sm text-center">
                    <span class="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Ledger Entries</span>
                    <span class="text-sm font-black text-stone-800">${ledger.length}</span>
                </div>
            </div>

            <!-- PROPOSALS TRAY INJECTION -->
            ${proposalsHtml}

            <!-- Inventory Manager -->
            <div class="bg-[#f4ebd8] p-4 sm:p-5 border border-[#d4c5a9] rounded-sm shadow-inner">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 border-b border-[#d4c5a9] pb-3">
                    <h3 class="text-lg font-serif font-bold text-stone-900 flex items-center"><i class="fa-solid fa-boxes-stacked mr-2 text-stone-500"></i> Manage Inventory</h3>
                    <div class="flex gap-2">
                        <button onclick="window.appActions.addManualItem('${shop.id}')" class="flex-1 sm:flex-none px-3 py-1.5 bg-white text-stone-700 hover:text-stone-900 border border-[#d4c5a9] rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-sm whitespace-nowrap"><i class="fa-solid fa-plus mr-1"></i> Manual Item</button>
                        <button onclick="window.appActions.rollShopInventory('${shop.id}')" class="flex-1 sm:flex-none px-3 py-1.5 bg-stone-900 text-amber-50 hover:bg-stone-800 border border-stone-950 rounded-sm transition text-[10px] font-bold uppercase tracking-wider shadow-md whitespace-nowrap"><i class="fa-solid fa-dice-d20 mr-1"></i> Roll Themed Wares</button>
                    </div>
                </div>
                ${invHtml}
            </div>

            <!-- Transaction Ledger -->
            <div>
                <h3 class="text-lg font-serif font-bold text-stone-900 flex items-center mb-4 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-book-open mr-2 text-stone-500"></i> Transaction Ledger</h3>
                ${ledgerHtml}
            </div>

        </div>
    </div>
    `;
}
