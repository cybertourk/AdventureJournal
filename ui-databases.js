/* STREAMING_CHUNK: Importing core layout and state resolvers... */
import { getLibraryTabsHTML } from './ui-core.js';
import { getUnifiedCatalog, updateDerivedState, generateId } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

/* STREAMING_CHUNK: Helper functions defined at the top to ensure scope visibility... */
export function getRarityColor(rarity) {
    const r = (rarity || '').toLowerCase().trim();
    if (r === 'uncommon') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (r === 'rare') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (r === 'veryrare' || r === 'very-rare') return 'text-purple-600 bg-purple-50 border-purple-200';
    if (r === 'legendary') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-stone-500 bg-stone-100 border-stone-200';
}

let LOCAL_CACHE = [];
let DATABASE_SEARCH_QUERY = "";
let DATABASE_FILTER_CATEGORY = "all";
let DATABASE_FILTER_RARITY = "all";

const CATEGORIES = {
    all: "All Categories",
    equipment: "🛡️ General Equipment",
    weapon: "⚔️ Weapons",
    consumable: "🧪 Consumables / Potions",
    tool: "🛠️ Tools & Kits",
    container: "🎒 Bags & Containers",
    magic: "✨ Magical Assets"
};

// --- CLIENT-SIDE PRE-LOAD COMPILER ---
const loadDatabaseCache = async () => {
    try {
        LOCAL_CACHE = await getUnifiedCatalog();
    } catch (e) {
        console.error("Failed to compile Database cache:", e);
        LOCAL_CACHE = [];
    }
};

// --- SEARCH FILTERING ---
export const searchDatabase = (val) => {
    DATABASE_SEARCH_QUERY = val.toLowerCase().trim();
    renderDatabaseResults();
};

export const filterDatabaseCategory = (cat) => {
    DATABASE_FILTER_CATEGORY = cat;
    renderDatabaseResults();
};

export const filterDatabaseRarity = (rarity) => {
    DATABASE_FILTER_RARITY = rarity;
    renderDatabaseResults();
};

// --- ITEM DETAILS INSPECTOR ---
export const openDatabaseItemDetails = async (itemName) => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    await loadDatabaseCache();
    const item = LOCAL_CACHE.find(i => i.name === itemName);
    if (!item) return;

    const isDM = window.appData.activeCampaign?._isDM;
    const rColor = getRarityColor(item.rarity);

    const iconMap = {
        item: 'fa-gem text-amber-500',
        codex: 'fa-book-journal-whills text-red-500',
        character: 'fa-user-shield text-blue-500',
        text: 'fa-align-left text-stone-500'
    };

    const parsedDesc = item.description ? window.appActions.parseSmartText(item.description) : '<p class="italic text-stone-400">No descriptive text is recorded for this entry.</p>';
    
    const portraitHtml = item.image ? `
        <div class="w-full h-36 bg-stone-900 border border-[#d4c5a9] rounded-sm overflow-hidden mb-4 shadow-inner flex justify-center">
            <img src="${item.image}" class="w-full h-full object-contain" alt="${item.name}" onerror="this.style.display='none'">
        </div>
    ` : '';

    // Stats sheet assembly
    let statsHtml = '';
    const stats = item.stats || {};
    if (stats.ac) {
        statsHtml += `
        <div class="bg-stone-50 border border-stone-200 p-2.5 rounded-sm shadow-inner grid grid-cols-2 gap-2 text-xs text-stone-700">
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Armor Class (AC)</span> ${stats.ac}</div>
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Dex Limit</span> ${stats.dexCap !== null ? stats.dexCap : 'None'}</div>
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Armor Group</span> ${stats.armorType || 'Medium'}</div>
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Strength Req</span> ${stats.strengthReq || 0}</div>
            <div class="col-span-2"><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Stealth Check Disadvantage?</span> ${stats.stealthDisadv ? 'Yes' : 'No'}</div>
        </div>`;
    } else if (stats.damage) {
        statsHtml += `
        <div class="bg-stone-50 border border-stone-200 p-2.5 rounded-sm shadow-inner grid grid-cols-2 gap-2 text-xs text-stone-700">
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Base Damage</span> ${stats.damage}</div>
            <div><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Damage Type</span> ${stats.damageType || 'Bludgeoning'}</div>
            <div class="col-span-2"><span class="font-bold text-stone-900 block uppercase tracking-wider text-[8px]">Properties</span> ${stats.properties || 'None'}</div>
        </div>`;
    }

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-md border-2 border-stone-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-4 border-t-amber-700">
                <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-4 right-4 text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                
                <div class="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    ${portraitHtml}

                    <div class="mb-4">
                        <h3 class="text-xl font-serif font-bold text-stone-900 leading-snug flex items-start gap-2">
                            <i class="fa-solid ${iconMap[item.resolvedType || 'item']} text-sm mt-1 shrink-0"></i>
                            <span>${item.name}</span>
                        </h3>
                        <div class="flex flex-wrap gap-2 mt-2 text-[9px] font-bold uppercase tracking-wider">
                            <span class="px-2 py-0.5 rounded border ${rColor}">${item.rarity || 'common'}</span>
                            ${item.price ? `<span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded shadow-sm"><i class="fa-solid fa-coins mr-1"></i>${item.price.toLocaleString()} gp</span>` : ''}
                            ${item.resolvedType && item.resolvedType !== 'text' ? `<span class="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded shadow-sm">${item.resolvedType}</span>` : ''}
                        </div>
                    </div>

                    <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-inner text-xs sm:text-sm font-serif leading-relaxed text-stone-700 max-h-48 overflow-y-auto custom-scrollbar">
                        ${parsedDesc}
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 shadow-inner">
                    ${isDM && item.id && item.id.startsWith('item_') ? `<button onclick="window.appActions.deleteForgedItem('${item.id}')" class="px-4 py-2 bg-red-900 text-white rounded-sm text-[10px] font-bold uppercase tracking-wider hover:bg-red-800 transition"><i class="fa-solid fa-trash mr-1.5"></i> Dissolve</button>` : ''}
                    ${isDM ? `<button onclick="window.appActions.openItemForgeModal('${item.id || ''}', '${item.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px]"><i class="fa-solid fa-hammer mr-1.5"></i> Forge Options</button>` : ''}
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-5 py-2 bg-stone-200 text-stone-700 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px]">Dismiss</button>
                </div>
            </div>
        </div>
    `;
};

// --- ITEM FORGING & MANAGEMENT ---
export const openItemForgeModal = async (itemId = "", prefilledName = "") => {
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    await loadDatabaseCache();
    let item = { id: "", name: prefilledName, type: "equipment", price: 0, rarity: "common", isMagic: false, image: "", description: "", weight: 0, stats: {} };
    if (itemId) {
        item = LOCAL_CACHE.find(i => i.id === itemId) || item;
    } else if (prefilledName) {
        const catalogItem = LOCAL_CACHE.find(i => i.name.toLowerCase().trim() === prefilledName.toLowerCase().trim());
        if (catalogItem) item = { ...catalogItem, id: catalogItem.id || "" };
    }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
    <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
        <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] border-t-4 border-t-amber-700">
            <div class="bg-stone-900 p-4 border-b border-[#d4c5a9] flex justify-between items-center text-amber-50 shrink-0">
                <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hammer mr-2 text-amber-500"></i> ${item.id ? 'Modify Item Forge' : 'Forge Custom Item'}</h2>
                <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
            </div>
            
            <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] space-y-4">
                <input type="hidden" id="forge-item-id" value="${item.id}">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                        <input type="text" id="forge-item-name" value="${item.name.replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none bg-stone-50 focus:border-amber-600">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Price (gp)</label>
                        <input type="number" id="forge-item-price" value="${item.price || 0}" min="0" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none bg-stone-50 focus:border-amber-600 text-center">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rarity</label>
                        <select id="forge-item-rarity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none bg-stone-50 focus:border-amber-600">
                            <option value="common" ${item.rarity==='common'?'selected':''}>Common</option>
                            <option value="uncommon" ${item.rarity==='uncommon'?'selected':''}>Uncommon</option>
                            <option value="rare" ${item.rarity==='rare'?'selected':''}>Rare</option>
                            <option value="veryrare" ${item.rarity==='veryrare'||item.rarity==='very-rare'?'selected':''}>Very Rare</option>
                            <option value="legendary" ${item.rarity==='legendary'?'selected':''}>Legendary</option>
                            <option value="custom" ${item.rarity==='custom'?'selected':''}>Custom / Homebrew</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Category Type</label>
                        <select id="forge-item-type" onchange="window.appActions.updateForgeInputStats(this.value)" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none bg-stone-50 focus:border-amber-600">
                            <option value="equipment" ${item.type==='equipment'?'selected':''}>Equipment / Wonderous Item</option>
                            <option value="weapon" ${item.type==='weapon'?'selected':''}>Weapon</option>
                            <option value="armor" ${item.type==='armor'||item.type==='shield'?'selected':''}>Armor / Shield</option>
                            <option value="consumable" ${item.type==='consumable'?'selected':''}>Consumable</option>
                            <option value="tool" ${item.type==='tool'?'selected':''}>Tool / Kit</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Weight (lbs)</label>
                        <input type="number" id="forge-item-weight" value="${item.weight || 0}" min="0" step="0.1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none bg-stone-50 focus:border-amber-600 text-center">
                    </div>
                </div>

                <div id="forge-stats-armor" class="hidden bg-stone-50 border border-stone-200 p-3 rounded-sm space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Armor Class (AC)</label>
                            <input type="number" id="forge-ac-val" value="${item.stats?.ac || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs text-center font-bold">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Dex Cap</label>
                            <input type="number" id="forge-ac-dex" value="${item.stats?.dexCap !== null && item.stats?.dexCap !== undefined ? item.stats.dexCap : ''}" placeholder="None" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs text-center font-bold">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Strength Req</label>
                            <input type="number" id="forge-ac-str" value="${item.stats?.strengthReq || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs text-center font-bold">
                        </div>
                        <div class="flex items-center pt-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="forge-ac-stealth" ${item.stats?.stealthDisadv ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded">
                                <span class="text-[9px] uppercase font-bold text-stone-500">Stealth Disadv?</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div id="forge-stats-weapon" class="hidden bg-stone-50 border border-stone-200 p-3 rounded-sm space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Damage (e.g. 1d8)</label>
                            <input type="text" id="forge-wpn-dmg" value="${item.stats?.damage || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs text-center font-bold" placeholder="1d8">
                        </div>
                        <div>
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Damage Type</label>
                            <input type="text" id="forge-wpn-type" value="${item.stats?.damageType || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs text-center font-bold" placeholder="Slashing">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-[9px] uppercase font-bold text-stone-500">Properties (comma separated)</label>
                            <input type="text" id="forge-wpn-prop" value="${item.stats?.properties || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded bg-white text-xs font-bold" placeholder="Finesse, Light, Thrown">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Image URL</label>
                    <input type="text" id="forge-item-image" value="${item.image || ''}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-700 shadow-inner outline-none bg-stone-50 focus:border-amber-600" placeholder="https://example.com/item.png">
                </div>

                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Description / Lore</label>
                    <textarea id="forge-item-desc" class="w-full h-32 p-3 border border-[#d4c5a9] rounded-sm text-sm text-stone-900 font-serif outline-none focus:border-amber-600 bg-stone-50 shadow-inner custom-scrollbar resize-y">${item.description || ''}</textarea>
                </div>

                <div class="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="forge-item-magic" ${item.isMagic ? 'checked' : ''} class="w-4 h-4 text-amber-600 rounded-sm border-stone-400 focus:ring-amber-500">
                    <label class="text-[10px] uppercase text-amber-800 font-bold tracking-widest cursor-pointer" for="forge-item-magic">Mark as Magical Item</label>
                </div>
            </div>

            <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-sm">
                <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                <button onclick="window.appActions.saveForgedItem()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Forge Item</button>
            </div>
        </div>
    </div>
    `;

    window.appActions.updateForgeInputStats(item.type);
};

export const updateForgeInputStats = (type) => {
    const armorDiv = document.getElementById('forge-stats-armor');
    const weaponDiv = document.getElementById('forge-stats-weapon');
    if (!armorDiv || !weaponDiv) return;

    armorDiv.classList.add('hidden');
    weaponDiv.classList.add('hidden');

    if (type === 'armor' || type === 'shield') {
        armorDiv.classList.remove('hidden');
    } else if (type === 'weapon') {
        weaponDiv.classList.remove('hidden');
    }
};

export const saveForgedItem = async () => {
    const name = document.getElementById('forge-item-name')?.value.trim();
    if (!name) {
        notify("Item Name is required.", "error");
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const id = document.getElementById('forge-item-id').value || 'item_' + generateId();
    const type = document.getElementById('forge-item-type').value;
    const price = parseInt(document.getElementById('forge-item-price').value) || 0;
    const rarity = document.getElementById('forge-item-rarity').value;
    const weight = parseFloat(document.getElementById('forge-item-weight').value) || 0;
    const image = document.getElementById('forge-item-image').value.trim();
    const description = document.getElementById('forge-item-desc').value.trim();
    const isMagic = document.getElementById('forge-item-magic').checked;

    const stats = {};
    if (type === 'armor') {
        stats.ac = parseInt(document.getElementById('forge-ac-val').value) || 10;
        const dex = document.getElementById('forge-ac-dex').value;
        stats.dexCap = dex !== '' ? parseInt(dex) : null;
        stats.strengthReq = parseInt(document.getElementById('forge-ac-str').value) || 0;
        stats.stealthDisadv = document.getElementById('forge-ac-stealth').checked;
    } else if (type === 'weapon') {
        stats.damage = document.getElementById('forge-wpn-dmg').value.trim();
        stats.damageType = document.getElementById('forge-wpn-type').value.trim();
        stats.properties = document.getElementById('forge-wpn-prop').value.trim();
    }

    const forgedItem = { id, name, type, price, rarity, isMagic, image, description, weight, stats };

    const currentCustom = camp.customItems || [];
    const isNew = !currentCustom.some(i => i.id === id);

    const updatedCustom = isNew 
        ? [...currentCustom, forgedItem] 
        : currentCustom.map(i => i.id === id ? forgedItem : i);

    camp.customItems = updatedCustom;
    await saveCampaign(camp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`"${name}" forged successfully!`, "success");
    window.appActions.reRender(true);
};

export const deleteForgedItem = async (itemId) => {
    if (!confirm("Are you sure you want to permanently dissolve this custom item from the archives?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    camp.customItems = (camp.customItems || []).filter(i => i.id !== itemId);
    await saveCampaign(camp);

    document.getElementById('global-popup-container').innerHTML = '';
    notify("Custom item dissolved.", "success");
    window.appActions.reRender(true);
};

export const openItemJsonImporter = () => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
    <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
        <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-file-import mr-2 text-emerald-400"></i> Import VTT Item</h2>
                <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
            </div>
            
            <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] space-y-4">
                <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-sm shadow-sm text-emerald-900 text-xs sm:text-sm leading-snug">
                    <i class="fa-solid fa-circle-info mr-1.5 text-emerald-600"></i> Paste the raw exported <b>Foundry VTT Item JSON</b> (such as an Armor, Weapon, or Scroll). The Item Forge will automatically parse, structure, and catalog the item globally!
                </div>

                <div class="bg-stone-50 border border-[#d4c5a9] p-4 rounded-sm shadow-inner flex items-center gap-4">
                    <input type="file" id="item-import-file-input" accept=".json" class="hidden" onchange="window.appActions.handleItemFileSelect(event)">
                    <button type="button" onclick="document.getElementById('item-import-file-input').click()" class="px-4 py-2 border border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-sm transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center gap-2">
                        <i class="fa-solid fa-file-arrow-up text-xs"></i> Select Exported JSON File
                    </button>
                    <span class="text-[10px] text-stone-500 italic">Load item .json from your computer</span>
                </div>
                
                <div class="flex flex-col gap-2">
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Foundry Item JSON Export</label>
                    <textarea id="item-import-json-input" class="w-full h-64 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-xs focus:border-emerald-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-mono" placeholder='{ "name": "Armor of Gleaming", "type": "equipment", "system": { ... } }'></textarea>
                </div>
            </div>

            <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-sm">
                <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                <button id="item-import-submit-btn" onclick="window.appActions.executeItemJsonImport()" class="px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md"><i class="fa-solid fa-file-import mr-1.5"></i> Parse & Save Item</button>
            </div>
        </div>
    </div>
    `;
};

export const handleItemFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            const formatted = JSON.stringify(parsed, null, 2);
            
            const textarea = document.getElementById('item-import-json-input');
            if (textarea) {
                textarea.value = formatted;
                notify("Item file loaded successfully.", "success");
            }
        } catch (err) {
            console.error("Item File Reader Error:", err);
            notify("Failed to parse file. Make sure it is a valid JSON export.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

export const executeItemJsonImport = async () => {
    const jsonText = document.getElementById('item-import-json-input')?.value || '';
    if (!jsonText.trim()) {
        notify("Please paste or load a valid VTT Item JSON.", "error");
        return;
    }

    try {
        const parsed = JSON.parse(jsonText.trim());
        const rawArray = Array.isArray(parsed) ? parsed : [parsed];
        
        updateDerivedState();
        const camp = window.appData.activeCampaign;
        if (!camp || !camp._isDM) return;

        const currentCustom = camp.customItems || [];
        let importedCount = 0;

        rawArray.forEach(rawItem => {
            const sys = rawItem.system || {};
            
            let rarity = sys.rarity || "common";
            if (typeof rarity === "string") rarity = rarity.toLowerCase().trim();

            let isMagic = false;
            if (sys.properties && Array.isArray(sys.properties)) isMagic = sys.properties.includes("mgc");
            else if (sys.properties && typeof sys.properties === "object") isMagic = sys.properties.mgc === true;
            if (rarity && rarity !== "common" && rarity !== "default") isMagic = true;

            let itemType = rawItem.type || "equipment";
            if (itemType === "weapon") itemType = "weapon";
            else if (itemType === "backpack" || itemType === "container") itemType = "container";
            else if (itemType === "consumable") itemType = "consumable";
            else if (itemType === "tool") itemType = "tool";
            else itemType = "equipment";

            const stats = {};
            if (sys.armor) {
                stats.ac = sys.armor.value || null;
                stats.dexCap = sys.armor.dex !== undefined ? sys.armor.dex : null;
                stats.armorType = sys.type?.value || null;
                stats.strengthReq = sys.strength || 0;
                stats.stealthDisadv = sys.properties?.includes("ste") || sys.stealth === true || false;
            }
            if (sys.damage) {
                const dmgParts = sys.damage.parts || [];
                if (dmgParts.length > 0 && Array.isArray(dmgParts[0])) { stats.damage = dmgParts[0][0] || ""; stats.damageType = dmgParts[0][1] || ""; }
                else if (sys.damage.parts && sys.damage.parts[0]) { stats.damage = sys.damage.parts[0]; stats.damageType = sys.damage.type || ""; }
                if (sys.properties) {
                    stats.properties = Array.isArray(sys.properties) 
                        ? sys.properties.join(", ") 
                        : Object.keys(sys.properties).filter(k => sys.properties[k] === true).join(", ");
                }
            }
            if (sys.uses) stats.charges = sys.uses.max || null;

            const forgedItem = {
                id: 'item_' + generateId(),
                name: rawItem.name,
                type: itemType,
                price: parseInt(sys.price?.value) || 0,
                rarity: rarity,
                isMagic: isMagic,
                image: rawItem.img || "icons/svg/item-bag.svg",
                description: sys.description?.value || sys.description || "",
                weight: sys.weight?.value || sys.weight || 0,
                folder: rawItem.folder?.name || "",
                stats: stats
            };

            const existsIdx = currentCustom.findIndex(i => i.name.toLowerCase().trim() === forgedItem.name.toLowerCase().trim());
            if (existsIdx > -1) currentCustom[existsIdx] = forgedItem;
            else currentCustom.push(forgedItem);
            importedCount++;
        });

        camp.customItems = currentCustom;
        await saveCampaign(camp);

        document.getElementById('global-popup-container').innerHTML = '';
        notify(`Successfully imported ${importedCount} item(s) globally!`, "success");
        window.appActions.reRender(true);

    } catch (e) {
        console.error("Failed to parse JSON file:", e);
        notify("Import failed. Ensure the JSON conforms to standard VTT format.", "error");
    }
};

export const renderDatabaseResults = () => {
    const listEl = document.getElementById('database-inventory-list');
    if (!listEl) return;

    // Apply Search and Filters to Cache
    let filtered = LOCAL_CACHE.filter(item => {
        const matchQuery = !DATABASE_SEARCH_QUERY || item.name.toLowerCase().includes(DATABASE_SEARCH_QUERY);
        const matchRarity = DATABASE_FILTER_RARITY === 'all' || item.rarity === DATABASE_FILTER_RARITY || (DATABASE_FILTER_RARITY === 'very-rare' && item.rarity === 'veryrare');
        
        let matchCategory = true;
        if (DATABASE_FILTER_CATEGORY !== 'all') {
            if (DATABASE_FILTER_CATEGORY === 'magic') {
                matchCategory = item.isMagic === true;
            } else {
                matchCategory = item.type === DATABASE_FILTER_CATEGORY;
            }
        }

        return matchQuery && matchRarity && matchCategory;
    });

    // Paginate / limit rendering to prevent DOM freeze
    const displayLimit = 100;
    const totalMatches = filtered.length;
    const displayList = filtered.slice(0, displayLimit);

    if (displayList.length === 0) {
        listEl.innerHTML = `
            <div class="col-span-full p-8 text-center text-stone-500 italic text-xs">
                No matching items found in the master index or your customized campaign archive.
            </div>
        `;
        return;
    }

    let html = '';
    displayList.forEach(item => {
        const rColor = getRarityColor(item.rarity);
        const isCustom = item.id && item.id.startsWith('item_');
        const customBadge = isCustom ? `<span class="bg-blue-100 text-blue-800 border border-blue-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shrink-0" title="Custom Campaign Item"><i class="fa-solid fa-hammer"></i> Custom</span>` : '';
        
        // Thumbnail displays
        const itemImageHtml = item.image 
            ? `<img src="${item.image}" class="w-8 h-8 object-contain shrink-0 border border-stone-200 bg-stone-100 rounded p-0.5" onerror="this.style.display='none'">` 
            : `<div class="w-8 h-8 bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200 rounded text-stone-400 text-xs"><i class="fa-solid fa-box"></i></div>`;

        html += `
            <div onclick="window.appActions.openDatabaseItemDetails('${item.name.replace(/'/g, "\\'")}')" class="bg-white border border-[#d4c5a9] rounded-sm p-2.5 shadow-sm flex justify-between items-center gap-3 hover:border-amber-400 transition cursor-pointer">
                <div class="min-w-0 flex-grow pr-2 flex items-center gap-2.5">
                    ${itemImageHtml}
                    <div class="min-w-0">
                        <span class="font-bold text-xs text-stone-900 block truncate" title="${item.name}">${item.name}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[9px] uppercase font-bold tracking-widest ${rColor}">${item.rarity || 'Item'}</span>
                            <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm border border-amber-200"><i class="fa-solid fa-coins mr-1 text-amber-500"></i>${(item.price || 0).toLocaleString()} gp</span>
                            ${customBadge}
                        </div>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-stone-300 text-xs"></i>
            </div>`;
    });

    if (totalMatches > displayLimit) {
        html += `
        <div class="col-span-full text-center py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-100 border border-[#d4c5a9] rounded-sm">
            Showing first 100 matches (out of ${totalMatches.toLocaleString()}). Refine search to filter.
        </div>
        `;
    }

    listEl.innerHTML = html;
};

// --- GLOBAL EXPORTS ---
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.searchDatabase = searchDatabase;
    window.appActions.filterDatabaseCategory = filterDatabaseCategory;
    window.appActions.filterDatabaseRarity = filterDatabaseRarity;
    window.appActions.openDatabaseItemDetails = openDatabaseItemDetails;
    window.appActions.openItemForgeModal = openItemForgeModal;
    window.appActions.updateForgeInputStats = updateForgeInputStats;
    window.appActions.saveForgedItem = saveForgedItem;
    window.appActions.deleteForgedItem = deleteForgedItem;
    window.appActions.openItemJsonImporter = openItemJsonImporter;
    window.appActions.handleItemFileSelect = handleItemFileSelect;
    window.appActions.executeItemJsonImport = executeItemJsonImport;
    window.appActions.renderDatabaseResults = renderDatabaseResults;
}
