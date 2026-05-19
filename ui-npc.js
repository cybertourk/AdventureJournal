import { updateDerivedState } from './state.js';
import { NPC_TABLES } from './data-npc.js';

export function openNpcGeneratorUI() {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    // Build the Dropdown Options dynamically from the imported Roll Tables
    const getOptionsHtml = (tableName) => {
        const table = NPC_TABLES[tableName];
        if (!table || !table.results) return '<option value="random">Random</option>';
        
        let html = '<option value="random">Random</option>';
        table.results.forEach(res => {
            html += `<option value="${res.text.replace(/"/g, '&quot;')}">${res.text}</option>`;
        });
        return html;
    };

    const raceOptions = getOptionsHtml("Race (Primary)");
    const genderOptions = getOptionsHtml("Gender");
    const professionOptions = getOptionsHtml("Professions / Occupation");

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-sm border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col">
                
                <div class="bg-stone-900 p-4 border-b-4 border-fuchsia-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-user-plus mr-2 text-fuchsia-400"></i> Generate NPC</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 bg-[#fdfbf7] flex-grow">
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Select specific traits to lock them in, or leave them set to random to let the dice decide. The NPC will be saved securely to your Codex.</p>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Race</label>
                            <select id="npc-gen-race" onchange="window.appActions.updateNpcSubraceDropdown()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-600 bg-white shadow-inner">
                                ${raceOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Sub-Race</label>
                            <select id="npc-gen-subrace" disabled class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-500 outline-none focus:border-fuchsia-600 bg-stone-200 shadow-inner">
                                <option value="random">Random</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Gender</label>
                                <select id="npc-gen-gender" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-600 bg-white shadow-inner">
                                    ${genderOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Profession</label>
                                <select id="npc-gen-prof" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-600 bg-white shadow-inner">
                                    ${professionOptions}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeNpcGeneration()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice mr-2"></i> Roll Character</button>
                </div>
            </div>
        </div>
    `;
}

export function updateNpcSubraceDropdown() {
    const raceSelect = document.getElementById('npc-gen-race');
    const subraceSelect = document.getElementById('npc-gen-subrace');
    if (!raceSelect || !subraceSelect) return;

    const selectedRace = raceSelect.value;
    
    // Reset and disable if random
    if (selectedRace === 'random') {
        subraceSelect.innerHTML = '<option value="random">Random</option>';
        subraceSelect.disabled = true;
        subraceSelect.classList.add('bg-stone-200', 'text-stone-500');
        subraceSelect.classList.remove('bg-white', 'text-stone-900');
        return;
    }

    // Check if a sub-race table exists for this specific race (e.g. "Sub-Race (Dwarf)")
    const subtableName = `Sub-Race (${selectedRace})`;
    const subTable = NPC_TABLES[subtableName];

    if (subTable && subTable.results && subTable.results.length > 0) {
        let html = '<option value="random">Random</option>';
        subTable.results.forEach(res => {
            html += `<option value="${res.text.replace(/"/g, '&quot;')}">${res.text}</option>`;
        });
        subraceSelect.innerHTML = html;
        subraceSelect.disabled = false;
        subraceSelect.classList.remove('bg-stone-200', 'text-stone-500');
        subraceSelect.classList.add('bg-white', 'text-stone-900');
    } else {
        subraceSelect.innerHTML = '<option value="random">None Available</option>';
        subraceSelect.disabled = true;
        subraceSelect.classList.add('bg-stone-200', 'text-stone-500');
        subraceSelect.classList.remove('bg-white', 'text-stone-900');
    }
}

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openNpcGeneratorUI = openNpcGeneratorUI;
    window.appActions.updateNpcSubraceDropdown = updateNpcSubraceDropdown;
}
