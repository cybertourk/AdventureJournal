import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { getLibraryTabsHTML } from './ui-core.js';

export function getRulesHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';

    const isDM = camp._isDM;
    const rules = camp.rulesGlossary || [];
    
    // Sort rules alphabetically
    const sortedRules = [...rules].sort((a,b) => a.name.localeCompare(b.name));

    let listHtml = '';
    
    if (sortedRules.length === 0) {
        listHtml = `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-scale-balanced text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The Glossary of Rulings is empty.</p>
                ${isDM ? `<p class="text-xs sm:text-sm mt-2 font-sans">Scribe your first rule to establish table precedents.</p>` : ''}
            </div>
        `;
    } else {
        listHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">`;
        sortedRules.forEach(r => {
            const parsedText = window.appActions.parseSmartText(r.text);
            // Extract the first 120 characters of plain text from the parsed HTML for the preview snippet
            const plainSnippet = parsedText.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...';

            listHtml += `
            <div class="rule-card bg-white p-4 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 transition duration-200 cursor-pointer" onclick="window.appActions.viewRule('${r.id}')" data-search="${r.name.toLowerCase()}">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="font-serif font-bold text-base text-amber-900 leading-tight pr-2"><i class="fa-solid fa-gavel text-amber-500 mr-1 text-xs"></i> ${r.name}</h3>
                </div>
                <p class="text-xs text-stone-600 font-serif leading-relaxed line-clamp-3">${plainSnippet}</p>
            </div>
            `;
        });
        listHtml += `</div>`;
    }

    let html = `
    <div class="animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto">
        
        ${getLibraryTabsHTML('rules')}

        <!-- Thematic Search Bar & Actions -->
        <div class="flex flex-col md:flex-row gap-3 mb-6">
            <div class="relative flex-grow">
                <i class="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 text-sm"></i>
                <input type="text" id="rule-search" class="w-full pl-10 pr-4 py-3.5 bg-white border border-[#d4c5a9] text-stone-900 text-sm font-bold rounded-full focus:outline-none focus:border-amber-600 shadow-sm placeholder:font-normal placeholder:text-stone-400 transition-colors" placeholder="Search rulings..." onkeyup="window.filterRules()">
            </div>
            ${isDM ? `
            <button onclick="window.appActions.openRuleModal()" class="md:flex-none flex items-center justify-center px-6 py-3.5 bg-amber-700 text-amber-50 border border-amber-800 rounded-full hover:bg-amber-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-sm active:scale-95">
                <i class="fa-solid fa-plus mr-2"></i> New Rule
            </button>
            ` : ''}
        </div>

        <!-- Pinned Utilities Accordion -->
        <div class="mb-8 space-y-3">
            
            <!-- Travel Calculator -->
            <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                <button class="w-full flex items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 hover:bg-stone-800 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180');">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-route text-lg w-6 text-center"></i>
                        <span class="font-serif font-bold text-sm sm:text-base tracking-wide">Travel & Pace Calculator</span>
                    </div>
                    <i class="fa-solid fa-chevron-down transition-transform duration-200 text-stone-500"></i>
                </button>
                <div class="hidden p-4 sm:p-6 bg-white border-t border-[#d4c5a9]">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <!-- Inputs -->
                        <div class="col-span-1 space-y-4 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Method of Travel</label>
                                <select id="calc-travel-mode" onchange="window.appActions.updateTravelPresets(); window.appActions.calculateTravel()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 shadow-sm">
                                    <optgroup label="On Foot">
                                        <option value="foot-standard">🚶 Standard Overland</option>
                                    </optgroup>
                                    <optgroup label="Mounts & Draft Animals">
                                        <option value="mount-riding">🐎 Riding horse / Warhorse (60 ft)</option>
                                        <option value="mount-camel">🐪 Camel (50 ft)</option>
                                        <option value="mount-draft">🐴 Draft horse / Donkey / Mule (40 ft)</option>
                                        <option value="mount-elephant">🐘 Elephant (40 ft)</option>
                                        <option value="mount-mastiff">🐕 Mastiff / Pony (40 ft)</option>
                                    </optgroup>
                                    <optgroup label="Waterborne Vessels">
                                        <option value="water-galley">🚢 Galley (4 mph)</option>
                                        <option value="water-longship">🛶 Longship (3 mph)</option>
                                        <option value="water-warship">⛵ Warship (2.5 mph)</option>
                                        <option value="water-sailing">⛵ Sailing ship (2 mph)</option>
                                        <option value="water-rowboat">🚣 Rowboat (1.5 mph)</option>
                                        <option value="water-keelboat">⛵ Keelboat (1 mph)</option>
                                    </optgroup>
                                    <optgroup label="Flying & Magical">
                                        <option value="flying-creature">🦅 Flying Creature / PC (e.g. Aarakocra 50 ft)</option>
                                        <option value="flying-griffon">🦅 Flying Mount (e.g. Griffon 80 ft)</option>
                                        <option value="flying-carpet">✨ Carpet of Flying (60 ft)</option>
                                        <option value="custom">✨ Custom Magical Speed</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Base Speed (ft/round)</label>
                                <input type="number" id="calc-travel-speed" value="30" min="0" oninput="window.appActions.calculateTravel()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm opacity-50" disabled>
                                <p id="calc-travel-speed-help" class="text-[9px] text-stone-400 mt-1 italic">Standard travel ignores individual speed (PHB p.181).</p>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Hours / Day</label>
                                <input type="number" id="calc-travel-hours" value="8" min="1" max="24" oninput="window.appActions.calculateTravel()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm">
                                <p class="text-[9px] text-stone-400 mt-1 italic">Standard day is 8 hours. Forced march beyond 8.</p>
                            </div>
                            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-[#d4c5a9]">
                                <input type="checkbox" id="calc-travel-difficult" onchange="window.appActions.calculateTravel()" class="w-4 h-4 text-amber-600 rounded-sm border-stone-400 focus:ring-amber-500 cursor-pointer shadow-sm">
                                <label class="text-[10px] uppercase text-amber-700 font-bold tracking-widest cursor-pointer" for="calc-travel-difficult">Difficult Terrain (1/2 Dist)</label>
                            </div>
                        </div>

                        <!-- Results -->
                        <div class="col-span-1 md:col-span-2 flex flex-col justify-center">
                            <table class="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr class="border-b-2 border-[#d4c5a9] text-[10px] uppercase tracking-widest text-stone-500">
                                        <th class="py-2">Pace</th>
                                        <th class="py-2">Distance</th>
                                        <th class="py-2">Effect</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr id="row-travel-fast" class="border-b border-stone-200">
                                        <td class="py-3 font-bold text-amber-700"><i class="fa-solid fa-forward-fast mr-1"></i> Fast</td>
                                        <td class="py-3 font-bold text-stone-800" id="res-travel-fast">30 miles</td>
                                        <td class="py-3 text-stone-600 italic text-xs">-5 penalty to passive Wisdom (Perception) scores</td>
                                    </tr>
                                    <tr id="row-travel-normal" class="border-b border-stone-200">
                                        <td class="py-3 font-bold text-emerald-700"><i class="fa-solid fa-play mr-1"></i> Normal</td>
                                        <td class="py-3 font-bold text-stone-800" id="res-travel-normal">24 miles</td>
                                        <td class="py-3 text-stone-600 italic text-xs" id="res-travel-normal-desc">Standard travel</td>
                                    </tr>
                                    <tr id="row-travel-slow">
                                        <td class="py-3 font-bold text-blue-700"><i class="fa-solid fa-backward-step mr-1"></i> Slow</td>
                                        <td class="py-3 font-bold text-stone-800" id="res-travel-slow">18 miles</td>
                                        <td class="py-3 text-stone-600 italic text-xs">Able to use stealth</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div id="res-travel-extra" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-sm text-xs text-blue-800 hidden shadow-sm leading-relaxed"></div>

                            <div id="res-travel-exhaustion" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800 hidden shadow-sm leading-relaxed">
                                <i class="fa-solid fa-triangle-exclamation mr-1"></i> <span class="font-bold">Forced March:</span> Traveling beyond 8 hours requires a Constitution saving throw at the end of each extra hour (DC <span id="res-travel-dc" class="font-bold"></span>). On a failure, a character suffers one level of exhaustion. <span class="italic block mt-1 opacity-80">(Note: Passengers on vehicles may be exempt, but draft animals can still suffer exhaustion.)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Encumbrance Calculator -->
            <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                <button class="w-full flex items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 hover:bg-stone-800 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180');">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-weight-hanging text-lg w-6 text-center"></i>
                        <span class="font-serif font-bold text-sm sm:text-base tracking-wide">Encumbrance & Coin Weight</span>
                    </div>
                    <i class="fa-solid fa-chevron-down transition-transform duration-200 text-stone-500"></i>
                </button>
                <div class="hidden p-4 sm:p-6 bg-white border-t border-[#d4c5a9]">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <!-- Inputs -->
                        <div class="space-y-4">
                            <div class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                                <h4 class="text-[10px] uppercase text-stone-500 font-bold mb-3 tracking-widest border-b border-[#d4c5a9] pb-1">Capacity Calculator</h4>
                                <div class="flex items-center gap-4">
                                    <div class="flex-1">
                                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Strength Score</label>
                                        <input type="number" id="calc-enc-str" value="10" min="1" max="30" oninput="window.appActions.calculateEncumbrance()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm">
                                    </div>
                                    <div class="flex-1">
                                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Size Category</label>
                                        <select id="calc-enc-size" onchange="window.appActions.calculateEncumbrance()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 shadow-sm">
                                            <option value="1">Tiny / Small / Medium</option>
                                            <option value="2">Large (x2)</option>
                                            <option value="4">Huge (x4)</option>
                                            <option value="8">Gargantuan (x8)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                                <h4 class="text-[10px] uppercase text-stone-500 font-bold mb-3 tracking-widest border-b border-[#d4c5a9] pb-1">Coin Weight Calculator</h4>
                                <div>
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Total Coins (Any Mix)</label>
                                    <div class="flex items-center gap-3">
                                        <input type="number" id="calc-enc-coins" value="0" min="0" oninput="window.appActions.calculateEncumbrance()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm">
                                        <div class="flex-shrink-0 text-sm font-bold text-amber-700 bg-amber-100 px-3 py-2 rounded-sm border border-amber-300 shadow-sm">
                                            = <span id="res-coin-weight">0</span> lbs
                                        </div>
                                    </div>
                                    <p class="text-[9px] text-stone-400 mt-1 italic">50 coins of any denomination equal 1 pound.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Results -->
                        <div class="flex flex-col justify-center space-y-4">
                            <div class="bg-blue-50 border border-blue-200 p-4 rounded-sm shadow-sm">
                                <h4 class="text-xs uppercase text-blue-800 font-bold mb-2 tracking-widest"><i class="fa-solid fa-dumbbell mr-1"></i> Standard Rules</h4>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    <div class="text-stone-600">Max Carrying Capacity:</div>
                                    <div class="font-bold text-stone-900" id="res-enc-standard">-- lbs</div>
                                    <div class="text-stone-600">Push, Drag, or Lift:</div>
                                    <div class="font-bold text-stone-900" id="res-enc-drag">-- lbs</div>
                                </div>
                                <p class="text-[10px] text-stone-500 italic mt-2">While pushing or dragging weight in excess of your carrying capacity, your speed drops to 5 feet.</p>
                            </div>

                            <div class="bg-stone-100 border border-stone-300 p-4 rounded-sm shadow-sm">
                                <h4 class="text-xs uppercase text-stone-600 font-bold mb-2 tracking-widest"><i class="fa-solid fa-scale-unbalanced mr-1"></i> Variant Encumbrance</h4>
                                <p class="text-[10px] text-stone-500 italic mb-3">If your table uses the optional variant rules for detailed weight tracking.</p>
                                <div class="space-y-3 text-sm">
                                    <div class="flex justify-between items-center border-b border-stone-200 pb-1">
                                        <span class="text-stone-600">Lightly Encumbered <span class="text-xs italic">(Normal Speed)</span>:</span>
                                        <span class="font-bold text-stone-900" id="res-var-light">0 to -- lbs</span>
                                    </div>
                                    <div class="flex justify-between items-center border-b border-stone-200 pb-1">
                                        <span class="text-amber-700 font-bold"><i class="fa-solid fa-arrow-down text-xs mr-1"></i> Encumbered <span class="text-xs italic text-stone-600 font-normal">(-10 ft Speed)</span>:</span>
                                        <span class="font-bold text-amber-900" id="res-var-heavy">-- to -- lbs</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-red-700 font-bold"><i class="fa-solid fa-angles-down text-xs mr-1"></i> Heavily Encumbered <span class="text-xs italic text-stone-600 font-normal">(-20 ft Speed, Disadv)</span>:</span>
                                        <span class="font-bold text-red-900" id="res-var-max">-- to -- lbs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Jump Calculator -->
            <div class="bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                <button class="w-full flex items-center justify-between p-3 sm:p-4 bg-stone-900 text-amber-500 hover:bg-stone-800 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180');">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-person-running text-lg w-6 text-center"></i>
                        <span class="font-serif font-bold text-sm sm:text-base tracking-wide">Jump Distance Calculator</span>
                    </div>
                    <i class="fa-solid fa-chevron-down transition-transform duration-200 text-stone-500"></i>
                </button>
                <div class="hidden p-4 sm:p-6 bg-white border-t border-[#d4c5a9]">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <!-- Inputs -->
                        <div class="space-y-4 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner h-min">
                            <div class="flex items-center gap-4">
                                <div class="flex-1">
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Strength Score</label>
                                    <input type="number" id="calc-jump-str" value="10" min="1" max="30" oninput="window.appActions.calculateJump()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm">
                                </div>
                                <div class="flex-1">
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Character Height (ft)</label>
                                    <input type="number" id="calc-jump-height" value="6" min="1" oninput="window.appActions.calculateJump()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" placeholder="e.g. 6">
                                </div>
                            </div>
                        </div>

                        <!-- Results -->
                        <div class="space-y-4">
                            <div class="bg-white border border-[#d4c5a9] rounded-sm overflow-hidden shadow-sm">
                                <div class="bg-stone-200 px-3 py-1 border-b border-[#d4c5a9] text-xs font-bold uppercase tracking-widest text-stone-600">Long Jump</div>
                                <div class="p-3 grid grid-cols-2 gap-2 text-sm">
                                    <div class="text-stone-600">Running (10ft start):</div>
                                    <div class="font-bold text-stone-900" id="res-jump-long-run">-- ft</div>
                                    <div class="text-stone-600">Standing:</div>
                                    <div class="font-bold text-stone-900" id="res-jump-long-stand">-- ft</div>
                                </div>
                            </div>

                            <div class="bg-white border border-[#d4c5a9] rounded-sm overflow-hidden shadow-sm">
                                <div class="bg-stone-200 px-3 py-1 border-b border-[#d4c5a9] text-xs font-bold uppercase tracking-widest text-stone-600">High Jump</div>
                                <div class="p-3 grid grid-cols-2 gap-2 text-sm">
                                    <div class="text-stone-600">Running (10ft start):</div>
                                    <div class="font-bold text-stone-900" id="res-jump-high-run">-- ft</div>
                                    <div class="text-stone-600">Standing:</div>
                                    <div class="font-bold text-stone-900" id="res-jump-high-stand">-- ft</div>
                                    <div class="text-stone-600 pt-2 border-t border-stone-100 mt-1">Max Reach (Running):</div>
                                    <div class="font-bold text-stone-900 pt-2 border-t border-stone-100 mt-1" id="res-jump-high-reach">-- ft</div>
                                </div>
                            </div>
                            
                            <p class="text-[10px] text-stone-500 italic mt-2"><i class="fa-solid fa-circle-info text-amber-600 mr-1"></i> Each foot cleared costs 1 foot of movement speed. Landing in difficult terrain requires a DC 10 Acrobatics check to avoid falling prone.</p>
                        </div>

                    </div>
                </div>
            </div>

        </div>

        <!-- Glossary Grid -->
        ${listHtml}
        
    </div>
    `;

    return html;
}

export const viewRule = (ruleId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const rule = (camp.rulesGlossary || []).find(r => r.id === ruleId);
    if (!rule) {
        notify("Rule not found.", "error");
        return;
    }

    const isDM = camp._isDM;
    const myUid = window.appData.currentUserUid;
    const canEdit = isDM || rule.authorId === myUid;
    
    // Parse formatting and auto-links for the reading view
    const parsedText = window.appActions.parseSmartText(rule.text);

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[13000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-scale-balanced text-amber-500 text-xl"></i>
                        <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">${rule.name}</h2>
                    </div>
                    <div class="flex gap-2">
                        ${canEdit ? `<button onclick="window.appActions.openRuleModal('${rule.id}')" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center" title="Amend Rule"><i class="fa-solid fa-pen-nib"></i></button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>

                <!-- Body View -->
                <div class="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                    <div class="text-stone-800 text-base font-serif leading-relaxed">
                        ${parsedText}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const openRuleModal = (ruleId = null) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    let rule = null;
    if (ruleId) {
        rule = (camp.rulesGlossary || []).find(r => r.id === ruleId);
    }

    const isNew = !rule;
    const id = isNew ? generateId() : rule.id;
    const name = isNew ? '' : rule.name;
    const text = isNew ? '' : rule.text;

    const container = document.getElementById('global-popup-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[13000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-stone-900 p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-scale-balanced text-amber-500 text-xl"></i>
                        <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">${isNew ? 'Scribe New Rule' : 'Amend Rule'}</h2>
                    </div>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-red-400 transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <input type="hidden" id="rule-modal-id" value="${id}">
                    
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rule Title / Topic</label>
                        <input type="text" id="rule-modal-name" value="${name.replace(/"/g, '&quot;')}" class="w-full bg-white text-stone-900 border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner focus:border-amber-600" placeholder="e.g. Fall Damage">
                    </div>

                    <div class="mb-2">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Rule Description</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9]">
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'bold')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'italic')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'list')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                            </div>
                        </div>
                        <textarea id="rule-modal-text" class="w-full h-64 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-amber-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-serif" placeholder="Explain the mechanics or rulings... Codex names link automatically." oninput="window.appActions.handleSmartInput(this)">${text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>
                </div>

                <div class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex justify-between gap-3">
                    <div>
                        ${!isNew ? `<button onclick="window.appActions.deleteRule('${id}')" class="px-4 py-2 text-stone-500 hover:text-red-700 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-sm transition flex items-center"><i class="fa-solid fa-trash mr-1"></i> Erase</button>` : '<div></div>'}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveRule()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Rule</button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const saveRule = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const id = document.getElementById('rule-modal-id').value;
    const name = document.getElementById('rule-modal-name').value.trim();
    const text = document.getElementById('rule-modal-text').value.trim();

    if (!name) {
        notify("The rule must have a title.", "error");
        return;
    }

    const isNew = !(camp.rulesGlossary || []).some(r => r.id === id);
    const myUid = window.appData.currentUserUid;

    const newRule = {
        id: id,
        name: name,
        text: text,
        authorId: isNew ? myUid : ((camp.rulesGlossary || []).find(r => r.id === id)?.authorId || myUid)
    };

    const newGlossary = isNew 
        ? [...(camp.rulesGlossary || []), newRule]
        : camp.rulesGlossary.map(r => r.id === id ? newRule : r);

    camp.rulesGlossary = newGlossary;
    await saveCampaign(camp);

    document.getElementById('global-popup-container').innerHTML = '';
    notify("Rule inscribed.", "success");
    reRender();
};

export const deleteRule = async (id) => {
    if (!confirm("Are you sure you want to permanently erase this rule?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.rulesGlossary) return;

    camp.rulesGlossary = camp.rulesGlossary.filter(r => r.id !== id);
    await saveCampaign(camp);

    document.getElementById('global-popup-container').innerHTML = '';
    notify("Rule erased.", "success");
    reRender();
};

// --- PINNED UTILITY CALCULATORS ---

export const updateTravelPresets = () => {
    const modeEl = document.getElementById('calc-travel-mode');
    const speedEl = document.getElementById('calc-travel-speed');
    const hoursEl = document.getElementById('calc-travel-hours');
    const diffEl = document.getElementById('calc-travel-difficult');
    const helpEl = document.getElementById('calc-travel-speed-help');

    if (!modeEl || !speedEl || !hoursEl || !diffEl) return;

    const mode = modeEl.value;

    // By default, UNLOCK speed and difficult terrain for everything except explicitly locked modes.
    speedEl.disabled = false;
    speedEl.classList.remove('opacity-50');
    diffEl.disabled = false;

    if (mode === 'foot-standard') {
        speedEl.value = 30;
        speedEl.disabled = true; // Overland PHB specifically ignores individual walking speeds
        speedEl.classList.add('opacity-50');
        hoursEl.value = 8;
        if (helpEl) helpEl.textContent = "Standard travel ignores individual speed (PHB p.181).";
    } 
    else if (mode.startsWith('mount-')) {
        hoursEl.value = 8;
        
        if (mode === 'mount-riding') { speedEl.value = 60; if (helpEl) helpEl.textContent = "Riding/Warhorse. Can push to gallop for 1 hour."; }
        if (mode === 'mount-camel') { speedEl.value = 50; if (helpEl) helpEl.textContent = "Camel. Base speed fully editable."; }
        if (mode === 'mount-draft') { speedEl.value = 40; if (helpEl) helpEl.textContent = "Draft Horse/Mule/Vehicle. Base speed fully editable."; }
        if (mode === 'mount-elephant') { speedEl.value = 40; if (helpEl) helpEl.textContent = "Elephant. Base speed fully editable."; }
        if (mode === 'mount-mastiff') { speedEl.value = 40; if (helpEl) helpEl.textContent = "Mastiff/Pony. Base speed fully editable."; }
    } 
    else if (mode.startsWith('water-')) {
        diffEl.checked = false;
        diffEl.disabled = true; // Difficult terrain generally doesn't apply out in open water
        
        if (mode === 'water-galley') { speedEl.value = 40; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Galley (4 mph). Can travel 24 hrs. Speed editable."; }
        if (mode === 'water-longship') { speedEl.value = 30; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Longship (3 mph). Can travel 24 hrs. Speed editable."; }
        if (mode === 'water-warship') { speedEl.value = 25; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Warship (2.5 mph). Can travel 24 hrs. Speed editable."; }
        if (mode === 'water-sailing') { speedEl.value = 20; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Sailing Ship (2 mph). Can travel 24 hrs. Speed editable."; }
        if (mode === 'water-rowboat') { speedEl.value = 15; hoursEl.value = 8; if (helpEl) helpEl.textContent = "Rowboat (1.5 mph). Requires constant rowing (8 hr limit)."; }
        if (mode === 'water-keelboat') { speedEl.value = 10; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Keelboat (1 mph). Can travel 24 hrs. Speed editable."; }
    } 
    else if (mode.startsWith('flying-')) {
        diffEl.checked = false;
        diffEl.disabled = true;
        
        if (mode === 'flying-creature') { 
            speedEl.value = 50; 
            hoursEl.value = 8; 
            diffEl.disabled = false; // Biological flying creatures might still face high winds (difficult terrain)
            if (helpEl) helpEl.textContent = "Biological flying creatures risk exhaustion after 8 hours."; 
        }
        if (mode === 'flying-griffon') { speedEl.value = 80; hoursEl.value = 8; if (helpEl) helpEl.textContent = "Flying generally ignores land-based difficult terrain."; }
        if (mode === 'flying-carpet') { speedEl.value = 60; hoursEl.value = 24; if (helpEl) helpEl.textContent = "Magical vehicles don't tire. Can travel 24 hrs."; }
    }
    else if (mode === 'custom') {
        speedEl.value = 80;
        hoursEl.value = 8;
        if (helpEl) helpEl.textContent = "Enter custom speed. Apply difficult terrain if necessary.";
    }
};

export const calculateTravel = () => {
    const modeEl = document.getElementById('calc-travel-mode');
    const speedEl = document.getElementById('calc-travel-speed');
    const hoursEl = document.getElementById('calc-travel-hours');
    const diffEl = document.getElementById('calc-travel-difficult');
    
    const rowFast = document.getElementById('row-travel-fast');
    const rowSlow = document.getElementById('row-travel-slow');
    const resNormalDesc = document.getElementById('res-travel-normal-desc');
    const extraEl = document.getElementById('res-travel-extra');

    if (!modeEl || !speedEl || !hoursEl || !diffEl) return;

    const mode = modeEl.value; 
    const speed = parseFloat(speedEl.value) || 0;
    const hours = parseFloat(hoursEl.value) || 0;
    const isDifficult = diffEl.checked && !diffEl.disabled;

    let normalMph = 0;
    let fastMph = 0;
    let slowMph = 0;
    let showFastSlow = true;

    // Reset UI visibility
    if (rowFast) rowFast.classList.remove('hidden');
    if (rowSlow) rowSlow.classList.remove('hidden');
    if (extraEl) { extraEl.classList.add('hidden'); extraEl.innerHTML = ''; }
    if (resNormalDesc) resNormalDesc.textContent = "Standard travel";

    if (mode === 'foot-standard') {
        // Standard PHB Overland Math ignores walking speed entirely
        normalMph = 3;
        fastMph = 4;
        slowMph = 2;
    } else if (mode.startsWith('water-')) {
        // Ships ignore fast/slow pace completely (PHB 181)
        normalMph = speed / 10;
        fastMph = normalMph;
        slowMph = normalMph;
        showFastSlow = false;
        
        if (rowFast) rowFast.classList.add('hidden');
        if (rowSlow) rowSlow.classList.add('hidden');
        if (resNormalDesc) resNormalDesc.textContent = "Vessel speed (ignores paces)";
    } else {
        // Mounts / Flying / Custom (Special DMG Math: 1 hour = Speed / 10 miles)
        normalMph = speed / 10;
        fastMph = normalMph * (4/3);
        slowMph = normalMph * (2/3);

        if (mode.startsWith('mount-')) {
            if (extraEl) {
                extraEl.classList.remove('hidden');
                extraEl.innerHTML = `<i class="fa-solid fa-horse mr-1 text-amber-700"></i> <span class="font-bold text-amber-900">Gallop:</span> A mounted character can ride at a gallop for 1 hour, covering twice the usual distance for a fast pace (<strong>${Math.round(fastMph * 2)} miles</strong>).`;
            }
        }
    }

    if (isDifficult) {
        normalMph /= 2;
        fastMph /= 2;
        slowMph /= 2;
    }

    const formatDist = (val) => Number.isInteger(val) ? val.toString() : val.toFixed(1);

    document.getElementById('res-travel-normal').textContent = `${formatDist(normalMph * hours)} miles`;
    if (showFastSlow) {
        document.getElementById('res-travel-fast').textContent = `${formatDist(fastMph * hours)} miles`;
        document.getElementById('res-travel-slow').textContent = `${formatDist(slowMph * hours)} miles`;
    }

    // Forced March Warning Logic
    const warnEl = document.getElementById('res-travel-exhaustion');
    const dcEl = document.getElementById('res-travel-dc');
    
    let showExhaustion = hours > 8;

    // Ships don't cause forced march exhaustion for passengers, nor do magic carpets.
    // Rowboats are the exception—they require constant physical rowing.
    if (mode.startsWith('water-') && mode !== 'water-rowboat') showExhaustion = false;
    if (mode === 'flying-carpet') showExhaustion = false;

    if (showExhaustion) {
        warnEl.classList.remove('hidden');
        if (dcEl) dcEl.textContent = 10 + Math.floor(hours - 8);
    } else {
        warnEl.classList.add('hidden');
    }
};

export const calculateEncumbrance = () => {
    const strEl = document.getElementById('calc-enc-str');
    const sizeEl = document.getElementById('calc-enc-size');
    const coinsEl = document.getElementById('calc-enc-coins');
    
    if (!strEl || !sizeEl || !coinsEl) return;

    const str = parseInt(strEl.value) || 0;
    const sizeMult = parseInt(sizeEl.value) || 1;
    const coins = parseInt(coinsEl.value) || 0;

    // Update coin weight purely for display
    const coinWeight = coins / 50;
    document.getElementById('res-coin-weight').textContent = Number.isInteger(coinWeight) ? coinWeight : coinWeight.toFixed(2);

    // Standard Math
    const maxCarry = str * 15 * sizeMult;
    const dragLift = str * 30 * sizeMult;
    document.getElementById('res-enc-standard').textContent = `${maxCarry} lbs`;
    document.getElementById('res-enc-drag').textContent = `${dragLift} lbs`;

    // Variant Math
    const varLight = str * 5 * sizeMult;
    const varHeavy = str * 10 * sizeMult;
    document.getElementById('res-var-light').textContent = `0 to ${varLight} lbs`;
    document.getElementById('res-var-heavy').textContent = `${varLight + 1} to ${varHeavy} lbs`;
    document.getElementById('res-var-max').textContent = `${varHeavy + 1} to ${maxCarry} lbs`;
};

export const calculateJump = () => {
    const strEl = document.getElementById('calc-jump-str');
    const heightEl = document.getElementById('calc-jump-height');

    if (!strEl || !heightEl) return;

    const str = parseInt(strEl.value) || 0;
    const height = parseFloat(heightEl.value) || 0;
    const strMod = Math.floor((str - 10) / 2);

    // Long Jump
    const longRun = str;
    const longStand = Math.max(0, Math.floor(str / 2));

    // High Jump
    const highRun = Math.max(0, 3 + strMod);
    const highStand = Math.max(0, Math.floor((3 + strMod) / 2));
    
    // Reach
    const reach = highRun + (1.5 * height);

    document.getElementById('res-jump-long-run').textContent = `${longRun} ft`;
    document.getElementById('res-jump-long-stand').textContent = `${longStand} ft`;
    
    document.getElementById('res-jump-high-run').textContent = `${highRun} ft`;
    document.getElementById('res-jump-high-stand').textContent = `${highStand} ft`;
    
    document.getElementById('res-jump-high-reach').textContent = `${Number.isInteger(reach) ? reach : reach.toFixed(1)} ft`;
};
