import { getLibraryTabsHTML } from './ui-core.js';
import { getUnifiedCatalog } from './state.js';
import { notify } from './firebase-manager.js';

// --- SEARCH FILTERING HELPER ---
export function filterRollTables(query) {
    const lower = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.table-item-card');
    cards.forEach(card => {
        const name = card.getAttribute('data-search-name') || '';
        if (name.includes(lower)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- TABLE SIMULATOR ACTIONS ---
export const openTableImporter = () => {
    window.appData.showFoundryImportModal = true;
    window.appActions.reRender(true);
};

export const closeTableImporter = () => {
    window.appData.showFoundryImportModal = false;
    window.appActions.reRender(true);
};

export const executeFoundryImport = async () => {
    const jsonText = document.getElementById('foundry-table-json-input')?.value || '';
    if (!jsonText.trim()) {
        notify("Please paste a valid Foundry VTT Roll Table JSON.", "error");
        return;
    }
    
    const originalBtn = document.getElementById('foundry-import-submit-btn');
    const originalText = originalBtn ? originalBtn.innerHTML : '';
    if (originalBtn) {
        originalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Importing...';
        originalBtn.disabled = true;
    }

    try {
        await window.appActions.importFoundryTable(jsonText);
        window.appData.showFoundryImportModal = false;
        window.appActions.reRender(true);
    } catch (e) {
        console.error("Import error:", e);
        notify("Import failed. Check console for details.", "error");
    } finally {
        if (originalBtn) {
            originalBtn.innerHTML = originalText;
            originalBtn.disabled = false;
        }
    }
};

export const viewTableDetails = (tableId) => {
    window.appData.activeTableId = tableId;
    window.appActions.reRender(true);
};

export const closeTableDetails = () => {
    window.appData.activeTableId = null;
    window.appActions.reRender(true);
};

export const simulateTableRoll = async (tableId) => {
    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
            <div class="text-amber-500 flex flex-col items-center">
                <i class="fa-solid fa-dice-d20 fa-spin text-5xl mb-4 text-amber-500 animate-bounce"></i>
                <p class="font-serif font-bold tracking-widest uppercase text-lg">Consulting Fate's Ledger...</p>
            </div>
        </div>
    `;

    try {
        const rollResult = await window.appActions.rollOnTable(tableId);
        if (!rollResult) {
            container.innerHTML = '';
            return;
        }

        const { rolledValue, totalWeight, formulaUsed, result } = rollResult;
        
        const rColor = result.rarity === 'legendary' ? 'text-orange-600 bg-orange-50 border-orange-200' : 
                       (result.rarity === 'veryrare' || result.rarity === 'very-rare' ? 'text-purple-600 bg-purple-50 border-purple-200' : 
                       (result.rarity === 'rare' ? 'text-blue-600 bg-blue-50 border-blue-200' : 
                       (result.rarity === 'uncommon' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 
                       'text-stone-500 bg-stone-100 border-stone-200')));

        const iconMap = {
            item: 'fa-gem text-amber-500',
            codex: 'fa-book-journal-whills text-red-500',
            character: 'fa-user-shield text-blue-500',
            text: 'fa-align-left text-stone-500'
        };

        const parsedDesc = result.description ? window.appActions.parseSmartText(result.description) : '<p class="italic text-stone-400">No descriptive text is recorded for this entry.</p>';
        
        const portraitHtml = result.image ? `
            <div class="w-full h-36 bg-stone-900 border border-[#d4c5a9] rounded-sm overflow-hidden mb-4 shadow-inner flex justify-center">
                <img src="${result.image}" class="w-full h-full object-contain" alt="${result.name}" onerror="this.style.display='none'">
            </div>
        ` : '';

        container.innerHTML = `
            <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm w-full max-w-sm border-2 border-stone-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] border-t-4 border-t-amber-700">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="absolute top-4 right-4 text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                    
                    <div class="p-6 overflow-y-auto custom-scrollbar flex-grow">
                        <div class="bg-stone-900 text-stone-400 p-2.5 rounded-sm flex justify-between items-center text-[10px] uppercase font-bold tracking-widest mb-4 shadow-inner border border-stone-700">
                            <span>Dice Roll: <b class="text-white">${formulaUsed}</b></span>
                            <span>Result: <b class="text-emerald-400">${rolledValue} / ${totalWeight}</b></span>
                        </div>

                        ${portraitHtml}

                        <div class="mb-4">
                            <h3 class="text-xl font-serif font-bold text-stone-900 leading-snug flex items-start gap-2">
                                <i class="fa-solid ${iconMap[result.resolvedType || 'text']} text-sm mt-1 shrink-0"></i>
                                <span>${result.name}</span>
                            </h3>
                            <div class="flex flex-wrap gap-2 mt-2 text-[9px] font-bold uppercase tracking-wider">
                                <span class="px-2 py-0.5 rounded border ${rColor}">${result.rarity || 'common'}</span>
                                ${result.price ? `<span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded shadow-sm"><i class="fa-solid fa-coins mr-1"></i>${result.price.toLocaleString()} gp</span>` : ''}
                                ${result.resolvedType && result.resolvedType !== 'text' ? `<span class="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded shadow-sm">${result.resolvedType}</span>` : ''}
                            </div>
                        </div>

                        <div class="bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-inner text-xs sm:text-sm font-serif leading-relaxed text-stone-700 max-h-48 overflow-y-auto custom-scrollbar">
                            ${parsedDesc}
                        </div>
                    </div>

                    <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 shadow-inner">
                        ${result.codexId ? `<button onclick="document.getElementById('global-popup-container').innerHTML = ''; window.appActions.viewCodex('${result.codexId}')" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md flex items-center gap-1.5"><i class="fa-solid fa-book-open"></i> Open Codex</button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-5 py-2 bg-stone-200 text-stone-700 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] shadow-sm">Dismiss</button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        notify("Rolling execution encountered a memory fault.", "error");
        container.innerHTML = '';
    }
};

export const addNewTableResult = async (tableId) => {
    const name = prompt("Enter the Name of the item or entity to add to the table:");
    if (!name || !name.trim()) return;

    const weightStr = prompt("Enter relative Weight (higher = more common):", "1");
    const weight = parseInt(weightStr, 10) || 1;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const table = camp?.rollTables?.find(t => t.id === tableId);
    if (!table) return;

    const newResult = {
        id: 'res_' + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        weight: weight,
        range: [1, 1],
        type: "text",
        image: "",
        description: ""
    };

    table.results = [...(table.results || []), newResult];
    await window.appActions.saveRollTable(table);
    notify("Entry added to roll table.", "success");
};

export const deleteTableResult = async (tableId, resultId) => {
    if (!confirm("Are you sure you want to remove this entry from the table?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const table = camp?.rollTables?.find(t => t.id === tableId);
    if (!table) return;

    table.results = (table.results || []).filter(r => r.id !== resultId);
    await window.appActions.saveRollTable(table);
    notify("Entry removed from roll table.", "success");
};

export const updateTableResultWeight = async (tableId, resultId, currentWeight) => {
    const weightStr = prompt("Enter new relative weight:", currentWeight);
    if (weightStr === null) return;

    const weight = parseInt(weightStr, 10) || 1;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const table = camp?.rollTables?.find(t => t.id === tableId);
    if (!table) return;

    table.results = (table.results || []).map(r => r.id === resultId ? { ...r, weight } : r);
    await window.appActions.saveRollTable(table);
    notify("Entry weight updated.", "success");
};

// --- CORE LAYOUT GENERATOR ---
export function getTablesHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const tables = camp.rollTables || [];
    const activeTableId = state.activeTableId;

    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto flex flex-col h-full">
        ${getLibraryTabsHTML('tables')}
    `;

    if (activeTableId) {
        const table = tables.find(t => t.id === activeTableId);
        if (!table) return `<div class="text-center text-red-500 p-8 font-serif">Table not found.</div>`;

        const totalWeight = (table.results || []).reduce((sum, r) => sum + (parseInt(r.weight) || 1), 0);

        let resultsListHtml = '';
        if (!table.results || table.results.length === 0) {
            resultsListHtml = `
                <div class="text-center p-6 bg-white border border-[#d4c5a9] rounded-sm text-stone-500 italic text-xs">
                    This table has no rows. Click "Add Result" to populate it manually.
                </div>
            `;
        } else {
            resultsListHtml = `
            <div class="overflow-x-auto rounded-sm border border-[#d4c5a9] bg-white shadow-sm">
                <table class="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                        <tr class="bg-stone-100 border-b border-[#d4c5a9] text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                            <th class="p-3 w-16 text-center">Weight</th>
                            <th class="p-3 w-20 text-center">Probability</th>
                            <th class="p-3">Result / Entity Name</th>
                            ${isDM ? `<th class="p-3 w-24 text-right">Actions</th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
            `;

            table.results.forEach(res => {
                const weight = parseInt(res.weight) || 1;
                const percent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0.0';
                
                resultsListHtml += `
                    <tr class="border-b border-stone-200 last:border-0 hover:bg-stone-50/50 transition-colors">
                        <td class="p-3 text-center font-bold text-stone-700 bg-stone-50 border-r border-stone-200">${weight}</td>
                        <td class="p-3 text-center font-bold text-emerald-700 bg-emerald-50/30 border-r border-stone-200">${percent}%</td>
                        <td class="p-3">
                            <div class="flex items-center gap-2">
                                ${res.image ? `<img src="${res.image}" class="w-5 h-5 object-contain shrink-0" onerror="this.style.display='none'">` : ''}
                                <span class="font-serif font-bold text-stone-900">${res.name}</span>
                            </div>
                        </td>
                        ${isDM ? `
                            <td class="p-3 text-right">
                                <div class="flex gap-1 justify-end">
                                    <button onclick="window.appActions.updateTableResultWeight('${table.id}', '${res.id}', ${weight})" class="text-[10px] bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-2 py-1 rounded transition-colors" title="Change Weight"><i class="fa-solid fa-weight-hanging"></i></button>
                                    <button onclick="window.appActions.deleteTableResult('${table.id}', '${res.id}')" class="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded transition-colors" title="Delete Result"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        ` : ''}
                    </tr>
                `;
            });

            resultsListHtml += `</tbody></table></div>`;
        }

        html += `
        <div class="bg-[#fdfbf7] rounded-sm border-2 sm:border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col flex-grow">
            <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-stone-900 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-500 shrink-0 border-b-2 sm:border-b-4 border-amber-700 gap-4 sm:gap-0 shadow-md">
                <div>
                    <h2 class="text-xl sm:text-2xl font-serif font-bold text-amber-50 leading-tight">${table.name}</h2>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1"><i class="fa-solid fa-dice-d20 mr-1.5 text-stone-500"></i> Calculated Weight Pool: ${totalWeight}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.appActions.simulateTableRoll('${table.id}')" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-amber-50 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md flex items-center gap-1.5">
                        <i class="fa-solid fa-dice-d20"></i> Simulate Roll
                    </button>
                    <button onclick="window.appActions.closeTableDetails()" class="px-4 py-2 bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-700 rounded-sm text-xs font-bold uppercase tracking-wider transition shadow-md">
                        <i class="fa-solid fa-arrow-left mr-2"></i> Return to Tables
                    </button>
                </div>
            </div>
            <div class="p-5 sm:p-8 flex-grow">
                <div class="mb-6">
                    <h3 class="text-xs uppercase text-stone-500 font-bold tracking-widest mb-1.5 border-b border-[#d4c5a9] pb-1">Table Description</h3>
                    <p class="text-sm text-stone-700 font-serif leading-relaxed italic">"${table.desc || 'A random catalog of items and events.'}"</p>
                </div>
                <div class="mb-6 flex justify-between items-end shrink-0">
                    <h3 class="text-xs uppercase text-stone-500 font-bold tracking-widest border-b border-[#d4c5a9] pb-1">Table Entries</h3>
                    ${isDM ? `<button onclick="window.appActions.addNewTableResult('${table.id}')" class="text-[10px] font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900 flex items-center gap-1"><i class="fa-solid fa-plus-circle"></i> Add Entry</button>` : ''}
                </div>
                ${resultsListHtml}
            </div>
        </div>
        `;
        return html;
    }

    let tablesListHtml = `
        <div class="relative mb-6">
            <i class="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 text-sm"></i>
            <input type="text" oninput="window.filterRollTables(this.value)" class="w-full pl-10 pr-4 py-3.5 bg-white border border-[#d4c5a9] text-stone-900 text-sm font-bold rounded-full focus:outline-none focus:border-amber-600 shadow-sm placeholder:font-normal placeholder:text-stone-400 transition-colors" placeholder="Search roll tables...">
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    if (tables.length === 0) {
        tablesListHtml = `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-table-list text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">No custom roll tables are configured for this campaign.</p>
                ${isDM ? `<button onclick="window.appActions.openTableImporter()" class="mt-6 px-6 py-2 bg-stone-900 text-amber-50 font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-stone-800 transition shadow-md"><i class="fa-solid fa-file-import mr-2"></i> Import Table JSON</button>` : ''}
            </div>
        `;
    } else {
        tables.forEach(table => {
            const entryCount = table.results ? table.results.length : 0;
            const tableImg = table.image || "https://assets.forge-vtt.com/bazaar/core/icons/environment/settlement/market-stall.webp";
            const totalWeight = (table.results || []).reduce((sum, r) => sum + (parseInt(r.weight) || 1), 0);

            tablesListHtml += `
            <div class="table-item-card bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between overflow-hidden group hover:border-amber-400 transition-all cursor-pointer" onclick="window.appActions.viewTableDetails('${table.id}')" data-search-name="${table.name.toLowerCase()}">
                <div>
                    <div class="w-full h-32 bg-stone-900 overflow-hidden relative border-b border-[#d4c5a9]">
                        <img src="${tableImg}" class="w-full h-full object-cover object-top" alt="${table.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="p-4 sm:p-5 pl-5">
                        <h3 class="font-serif font-bold text-lg text-stone-900 leading-tight truncate group-hover:text-amber-800 transition-colors" title="${table.name}">${table.name}</h3>
                        <div class="flex flex-wrap gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider mt-2">
                            <span><i class="fa-solid fa-list mr-1"></i>${entryCount} Rows</span>
                            <span>•</span>
                            <span><i class="fa-solid fa-dice mr-1"></i>Formula: ${table.formula || `1d${totalWeight}`}</span>
                        </div>
                        <p class="text-xs text-stone-600 font-serif leading-relaxed line-clamp-3 italic mt-3">"${table.desc || 'Click to view entries and rolls...'}"</p>
                    </div>
                </div>
                
                <div class="p-4 bg-stone-50 border-t border-[#d4c5a9] flex justify-between items-center shrink-0">
                    <button class="px-3 py-1.5 bg-stone-850 text-amber-50 hover:bg-stone-700 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm">
                        View Table
                    </button>
                    ${isDM ? `
                        <button onclick="event.stopPropagation(); window.appActions.deleteRollTable('${table.id}')" class="text-stone-400 hover:text-red-700 p-1.5 transition" title="Delete Table">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            `;
        });
        tablesListHtml += `</div>`;
    }

    html += `
        ${isDM ? `
            <div class="flex justify-end gap-2 mb-6">
                <button onclick="window.appActions.openTableImporter()" class="px-4 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-xs shadow-md">
                    <i class="fa-solid fa-file-import mr-1.5"></i> Import Foundry Table
                </button>
            </div>
        ` : ''}

        ${tablesListHtml}
    `;

    // --- FOUNDRY IMPORTER DIALOG (DM ONLY) ---
    if (isDM && state.showFoundryImportModal) {
        html += `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-emerald-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-file-import mr-2 text-emerald-400"></i> Import Foundry Roll Table</h2>
                    <button onclick="window.appActions.closeTableImporter()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>
                
                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-sm shadow-sm text-emerald-900 text-xs sm:text-sm leading-snug mb-4">
                        <i class="fa-solid fa-circle-info mr-1.5 text-emerald-600"></i> Paste the raw exported <b>RollTable JSON</b> from Foundry VTT. The app will parse weights, compile roll brackets, and dynamically link items into your inventory catalog.
                    </div>
                    
                    <div class="flex flex-col gap-2">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Foundry Table JSON Export</label>
                        <textarea id="foundry-table-json-input" class="w-full h-80 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-xs focus:border-emerald-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-mono" placeholder='{ "name": "SHOP Martial Melee Common", "results": [ ... ] }'></textarea>
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-sm">
                    <button onclick="window.appActions.closeTableImporter()" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="foundry-import-submit-btn" onclick="window.appActions.executeFoundryImport()" class="px-5 py-2 bg-emerald-700 text-amber-50 rounded-sm hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-file-import mr-1.5"></i> Parse & Save Table</button>
                </div>
            </div>
        </div>
        `;
    }

    html += `</div>`;
    return html;
}
