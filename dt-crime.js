import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 4. CRIME ---
// ============================================================================

export const openCrimeModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-red-900 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-mask mr-2 text-stone-400"></i> Commit a Crime</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-crime-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Target DC</label>
                                <select id="dt-crime-dc" onchange="window.appActions.updateCrimeMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner">
                                    <option value="10">DC 10 (Rob a struggling merchant)</option>
                                    <option value="15">DC 15 (Rob a prosperous merchant)</option>
                                    <option value="20">DC 20 (Rob a noble)</option>
                                    <option value="25">DC 25 (Rob the richest figure in town)</option>
                                </select>
                            </div>
                            <div class="flex items-end pb-2">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="dt-crime-rival" class="w-4 h-4 text-red-900 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-red-900 transition">Is a rival involved?</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                            <input type="text" id="dt-crime-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Crime Description</label>
                            <input type="text" id="dt-crime-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner" placeholder="e.g. Breaking into the manor vault">
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Stealth</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-crime-stealth" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Thieves' Tools</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-crime-tools" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">
                                <select id="dt-crime-third-skill" class="bg-transparent outline-none font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer">
                                    <option value="Investigation">Investigation</option>
                                    <option value="Perception">Perception</option>
                                    <option value="Deception">Deception</option>
                                </select>
                            </label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-crime-third-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Potential Payout</span>
                            <span id="dt-crime-payout-out" class="text-2xl font-black text-amber-500">50 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days & 25 gp (Expenses)</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeCrime()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-mask mr-2"></i> Commit Crime</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateCrimeMath, 50);
};

export const updateCrimeMath = () => {
    const dcEl = document.getElementById('dt-crime-dc');
    const payoutOut = document.getElementById('dt-crime-payout-out');
    
    if (!dcEl || !payoutOut) return;

    const dc = parseInt(dcEl.value) || 10;
    
    let payout = 50;
    if (dc === 15) payout = 100;
    else if (dc === 20) payout = 200;
    else if (dc === 25) payout = 1000;
    
    payoutOut.textContent = `${payout.toLocaleString()} gp`;
};

export const executeCrime = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-crime-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const dc = parseInt(document.getElementById('dt-crime-dc').value) || 10;
    const thirdSkillName = document.getElementById('dt-crime-third-skill').value;
    const isRival = document.getElementById('dt-crime-rival').checked;
    
    const loc = document.getElementById('dt-crime-loc').value.trim();
    const desc = document.getElementById('dt-crime-desc').value.trim();

    if (!loc || !desc) {
        notify("Please enter the Location and Crime Description.", "error");
        return;
    }

    const modStealth = parseInt(document.getElementById('dt-crime-stealth').value) || 0;
    const modTools = parseInt(document.getElementById('dt-crime-tools').value) || 0;
    const modThird = parseInt(document.getElementById('dt-crime-third-mod').value) || 0;

    // --- MATH EXECUTION ---
    let payoutMax = 50;
    if (dc === 15) payoutMax = 100;
    else if (dc === 20) payoutMax = 200;
    else if (dc === 25) payoutMax = 1000;

    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    const roll3 = Math.floor(Math.random() * 20) + 1;

    const totalStealth = roll1 + modStealth;
    const totalTools = roll2 + modTools;
    const totalThird = roll3 + modThird;

    let successes = 0;
    if (totalStealth >= dc) successes++;
    if (totalTools >= dc) successes++;
    if (totalThird >= dc) successes++;

    let resultHeader = `**Crime:** ${desc} at ${loc} (DC ${dc})`;
    let resultBody = ``;
    let complicationText = ``;

    if (successes === 0) {
        const fine = payoutMax;
        const jailWeeks = Math.ceil(fine / 25);
        const jailDays = jailWeeks * 7;
        const bribeCost = fine + (jailDays * 10);
        
        resultBody = `🚨 **Caught! (0 Successes)**\n\nYour heist was a spectacular failure. You have been sentenced to **${jailWeeks} week(s) (${jailDays} days)** in jail and must pay a fine of **${fine} gp**.\n*(Alternatively, you can bribe your way out for ${bribeCost} gp).*`;
    } 
    else if (successes === 1) {
        resultBody = `❌ **Failure (1 Success)**\n\nYou failed to secure the loot, but you managed to escape without being caught.`;
    } 
    else if (successes === 2) {
        resultBody = `⚠️ **Partial Success (2 Successes)**\n\nThings got messy, but you made off with loot worth **${payoutMax / 2} gp**.`;
    } 
    else if (successes === 3) {
        resultBody = `✅ **Full Success (3 Successes)**\n\nA perfect heist! You earn the full loot of **${payoutMax} gp**.`;
    }

    if (successes === 1 || (successes === 2 && isRival)) {
        const d8 = Math.floor(Math.random() * 8) + 1;
        const compTable = [
            "A bounty equal to your earnings is offered for information about your crime.", 
            "An unknown person contacts you, threatening to reveal your crime if you don’t render a service.",
            "Your victim is financially ruined by your crime.", 
            "Someone who knows of your crime has been arrested on an unrelated matter.",
            "Your loot is a single, easily identified item that you can’t fence in this region.", 
            "You robbed someone who was under a local crime lord’s protection, and who now wants revenge.",
            "Your victim calls in a favor from a guard, doubling the efforts to solve the case.", 
            "Your victim asks one of your adventuring companions to solve the crime."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d8=${d8}):* ${compTable[d8 - 1]}`;
    } else if (successes > 0) {
        complicationText = `\n\n*No complications arose during the heist.*`;
    }

    let checksText = `**Stealth Check:** ${totalStealth} (Rolled ${roll1})\n**Thieves' Tools Check:** ${totalTools} (Rolled ${roll2})\n**${thirdSkillName} Check:** ${totalThird} (Rolled ${roll3})`;

    const noteText = `**Downtime: Crime**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** 25 gp\n\n${checksText}\n\n${resultBody}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - 5),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime attempting a heist with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-mask');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Crime resolved. 5 days deducted from ${pc.name}. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openCrimeModal = openCrimeModal;
    window.appActions.updateCrimeMath = updateCrimeMath;
    window.appActions.executeCrime = executeCrime;
}
