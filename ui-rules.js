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
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Rules Glossary</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic">Table Rulings & Mechanics for ${camp.name}</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <div class="relative flex-grow md:flex-grow-0">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 text-xs"></i>
                    <input type="text" id="rule-search" class="w-full md:w-48 pl-8 pr-3 py-2 bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-sm focus:outline-none focus:border-amber-600 shadow-inner placeholder-stone-600" placeholder="Search rulings..." onkeyup="window.filterRules()">
                </div>
                ${isDM ? `
                <button onclick="window.appActions.openRuleModal()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-amber-600 text-stone-950 border border-amber-500 rounded-sm hover:bg-amber-500 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-plus mr-2"></i> New Rule
                </button>
                ` : ''}
            </div>
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
                                    <option value="foot">🚶 On Foot</option>
                                    <option value="mount">🐎 Mounted (Land)</option>
                                    <option value="water">⛵ Waterborne Vessel</option>
                                    <option value="flying">🦅 Flying / Magical</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Base Speed (ft/round)</label>
                                <input type="number" id="calc-travel-speed" value="30" min="0" oninput="window.appActions.calculateTravel()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm">
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
                                <i class="fa-solid fa-triangle-exclamation mr-1"></i> <span class="font-bold">Forced March:</span> Traveling beyond 8 hours requires a Constitution saving throw at the end of each extra hour (DC <span id="res-travel-dc" class="font-bold"></span>). On a failure, a character suffers one level of exhaustion.
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

window.filterRules = function() {
    const input = document.getElementById('rule-search');
    if(!input) return;
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll('.rule-card');
    cards.forEach(card => {
        const searchData = card.getAttribute('data-search');
        if (searchData.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};
