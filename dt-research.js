import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 9. RESEARCH ---
// ============================================================================

export const openResearchModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-teal-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-book-open mr-2 text-teal-400"></i> Research</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-research-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Intelligence Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-research-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Research Topic</label>
                            <input type="text" id="dt-research-topic" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 bg-stone-50 shadow-inner" placeholder="e.g. The vulnerabilities of the Aboleth...">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Additional Gold Spent (Bribes & Fees)</label>
                            <select id="dt-research-gold" onchange="window.appActions.updateResearchMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 bg-stone-50 shadow-inner">
                                <option value="0">0 gp (+0 Bonus)</option>
                                <option value="50">50 gp (+1 Bonus)</option>
                                <option value="100">100 gp (+2 Bonus)</option>
                                <option value="150">150 gp (+3 Bonus)</option>
                                <option value="200">200 gp (+4 Bonus)</option>
                                <option value="250">250 gp (+5 Bonus)</option>
                                <option value="300">300 gp (+6 Bonus)</option>
                            </select>
                            <p class="text-[9px] text-stone-500 italic mt-1 leading-snug">You can spend up to 300 extra gold to gain a bonus on your research check (on top of the 50 gp base cost).</p>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-gem mr-2 text-teal-600"></i> Advantages & Network Support</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div class="bg-teal-50 border border-teal-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-research-adv" onchange="document.getElementById('dt-research-loc-details').classList.remove('hidden'); window.appActions.updateResearchMath();" class="w-4 h-4 text-teal-600 rounded-sm cursor-pointer shadow-sm border-teal-400">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-teal-900 group-hover:text-teal-700 transition">Use Superior Resources</span>
                            </label>
                            <p class="text-[9px] text-teal-800 italic leading-snug">Gain advantage on the check if you have access to a well-stocked library or knowledgeable sages. Requires a location.</p>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-research-harper" onchange="document.getElementById('dt-research-loc-details').classList.remove('hidden'); window.appActions.updateResearchMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                            </label>
                            <p class="text-[9px] text-blue-800 italic leading-snug">The Harpers' network of lore masters reduces the total gold cost by 50%. Requires a location.</p>
                        </div>
                    </div>

                    <!-- Location Details (Hidden by default unless advantage or harper is checked) -->
                    <div id="dt-research-loc-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location of Research</label>
                            <input type="text" id="dt-research-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 shadow-inner bg-stone-50" placeholder="e.g. Candlekeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-research-travel" value="0" min="0" oninput="window.appActions.updateResearchMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-teal-700 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Gold Cost</span>
                            <span id="dt-research-gold-out" class="text-2xl font-black text-amber-500">50 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span id="dt-research-days-out" class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeResearch()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-book-open mr-2"></i> Begin Research</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateResearchMath, 50);
};

export const updateResearchMath = () => {
    const goldSelect = document.getElementById('dt-research-gold');
    const harperToggle = document.getElementById('dt-research-harper');
    const advToggle = document.getElementById('dt-research-adv');
    const travelInput = document.getElementById('dt-research-travel');
    
    const goldOut = document.getElementById('dt-research-gold-out');
    const daysOut = document.getElementById('dt-research-days-out');
    const locDetails = document.getElementById('dt-research-loc-details');

    if (!goldSelect || !goldOut || !daysOut) return;

    const isHarper = harperToggle.checked;
    const hasAdv = advToggle.checked;
    
    if (isHarper || hasAdv) {
        locDetails.classList.remove('hidden');
    } else {
        locDetails.classList.add('hidden');
    }

    const travelDays = (isHarper || hasAdv) ? (parseInt(travelInput.value) || 0) : 0;
    const extraGold = parseInt(goldSelect.value) || 0;
    
    let totalGold = 50 + extraGold;
    if (isHarper) {
        totalGold = Math.ceil(totalGold * 0.5);
    }

    const totalDays = 5 + travelDays;

    goldOut.textContent = `${totalGold} gp`;
    daysOut.textContent = `${totalDays} Day${totalDays !== 1 ? 's' : ''}`;
};

export const executeResearch = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-research-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const topic = document.getElementById('dt-research-topic').value.trim();
    if (!topic) {
        notify("Please specify a research topic.", "error");
        return;
    }

    const hasAdvantage = document.getElementById('dt-research-adv').checked;
    const hasHarperSupport = document.getElementById('dt-research-harper').checked;
    const useLocation = hasAdvantage || hasHarperSupport;
    const loc = useLocation ? document.getElementById('dt-research-loc').value.trim() : '';

    if (useLocation && !loc) {
        notify("Please enter the Location of Research when using Superior Resources or Harpers Support.", "error");
        return;
    }

    const travelDays = useLocation ? (parseInt(document.getElementById('dt-research-travel').value) || 0) : 0;
    const additionalGold = parseInt(document.getElementById('dt-research-gold').value) || 0;
    const intMod = parseInt(document.getElementById('dt-research-mod').value) || 0;

    const goldBonus = additionalGold / 50;

    let totalGoldCost = 50 + additionalGold;
    if (hasHarperSupport) totalGoldCost = Math.ceil(totalGoldCost * 0.5);
    const totalDaysCost = 5 + travelDays;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDaysCost) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // --- MATH EXECUTION ---
    const roll1 = Math.floor(Math.random() * 20) + 1;
    let d20 = roll1;
    let rollText = `Rolled ${roll1}`;
    
    if (hasAdvantage) {
        const roll2 = Math.floor(Math.random() * 20) + 1;
        d20 = Math.max(roll1, roll2);
        rollText = `Rolled [${roll1}, ${roll2}] - Kept ${d20}`;
    }

    const totalBonus = intMod + goldBonus;
    const checkTotal = d20 + totalBonus;

    let lorePieces = 0;
    if (checkTotal >= 21) lorePieces = 3;
    else if (checkTotal >= 11) lorePieces = 2;
    else if (checkTotal >= 6) lorePieces = 1;

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "You accidentally damage a rare book.", 
            "You offend a sage, who demands an extravagant gift.",
            "If you had known that book was cursed, you never would have opened it.", 
            "A sage becomes obsessed with convincing you of a number of strange theories about reality.",
            "Your actions cause you to be banned from a library until you make reparations.", 
            "You uncovered useful lore, but only by promising to complete a dangerous task in return."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your research proceeds without incident.*`;
    }

    let resultBody = ``;
    if (lorePieces > 0) {
        resultBody = `✅ **Research Successful!**\nYou uncovered **${lorePieces} piece${lorePieces > 1 ? 's' : ''} of lore** regarding the topic.\n*(A piece of lore is the equivalent of one true statement about a person, place, or thing. You may edit this chronicle entry later once the DM shares the lore with you!)*`;
    } else {
        resultBody = `❌ **Research Failed**\nYour time in the archives yielded no useful information.`;
    }

    let modifiersNote = "";
    if (hasAdvantage) modifiersNote += `\n*Superior Resources provided advantage on the check.*`;
    if (hasHarperSupport) modifiersNote += `\n*Silver Harbingers support reduced the gold cost.*`;
    if (loc) modifiersNote += `\n*Location:* ${loc}`;

    const noteText = `**Downtime: Research**\n*Hero:* ${pc.name}\n\n**Topic:** *${topic}*\n**Time Spent:** ${totalDaysCost} Days (${travelDays} Travel)\n**Gold Spent:** ${totalGoldCost} gp\n\n**Intelligence Check:** ${checkTotal} (${rollText} ${totalBonus >= 0 ? `+ ${totalBonus}` : `- ${Math.abs(totalBonus)}`})\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDaysCost),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime researching with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-book-open');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Research resolved. ${totalDaysCost} days deducted from ${pc.name}. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openResearchModal = openResearchModal;
    window.appActions.updateResearchMath = updateResearchMath;
    window.appActions.executeResearch = executeResearch;
}
