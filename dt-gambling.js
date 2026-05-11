import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 5. GAMBLING ---
// ============================================================================

export const openGamblingModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-dice mr-2 text-amber-400"></i> Gambling</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-gamble-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
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
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Gold Piece Stake</label>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="dt-gamble-stake-slider" min="10" max="1000" value="10" step="5" oninput="window.appActions.updateGamblingMath(this.value, 'slider')" class="flex-grow accent-amber-600">
                                    <input type="number" id="dt-gamble-stake-text" min="10" max="1000" value="10" oninput="window.appActions.updateGamblingMath(this.value, 'text')" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-stone-50 shadow-inner">
                                </div>
                                <p class="text-[9px] text-stone-400 mt-1 italic">Set the amount of gold (10-1000gp) you are risking.</p>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                                <input type="text" id="dt-gamble-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-stone-50 shadow-inner" placeholder="e.g. The Yawning Portal">
                            </div>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                    <p class="text-[10px] text-stone-500 italic mb-4">You will make three checks against randomly generated DCs (5 + 2d10).</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Insight</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-gamble-ins" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Deception</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-gamble-dec" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Intimidation</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-gamble-itm" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Gaming Set Override -->
                    <div class="bg-amber-50 border border-amber-200 p-4 rounded-sm shadow-sm mb-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="flex-grow w-full">
                            <label class="flex items-center gap-2 cursor-pointer group mb-2">
                                <input type="checkbox" id="dt-gamble-tool-toggle" onchange="const g = document.getElementById('dt-gamble-tool-group'); g.classList.toggle('opacity-50'); g.classList.toggle('pointer-events-none');" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                                <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition">Use Gaming Set Proficiency</span>
                            </label>
                            <p class="text-[9px] text-amber-800 italic">Replace ONE of the standard checks above with your Gaming Set modifier.</p>
                        </div>
                        
                        <div id="dt-gamble-tool-group" class="flex items-center gap-2 opacity-50 pointer-events-none transition-opacity w-full sm:w-auto">
                            <select id="dt-gamble-tool-skill" class="w-2/3 p-2 border border-amber-300 rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                                <option value="ins">Replace Insight</option>
                                <option value="dec">Replace Deception</option>
                                <option value="itm">Replace Intimidation</option>
                            </select>
                            <div class="flex items-center w-1/3">
                                <span class="bg-stone-200 border border-r-0 border-amber-300 px-2 py-2 text-xs font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-gamble-tool-mod" value="0" class="w-full p-2 border border-amber-300 rounded-r-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center" title="Gaming Set Modifier">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Gold At Risk</span>
                            <span id="dt-gamble-stake-out" class="text-2xl font-black text-amber-500">10 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeGambling()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice mr-2"></i> Roll the Dice</button>
                </div>
            </div>
        </div>
    `;
};

export const updateGamblingMath = (val, source) => {
    const slider = document.getElementById('dt-gamble-stake-slider');
    const textbox = document.getElementById('dt-gamble-stake-text');
    const readout = document.getElementById('dt-gamble-stake-out');
    
    if (!slider || !textbox || !readout) return;

    let cleanVal = parseInt(val) || 10;
    if (cleanVal < 10) cleanVal = 10;
    if (cleanVal > 1000) cleanVal = 1000;

    if (source === 'slider') textbox.value = cleanVal;
    if (source === 'text') slider.value = cleanVal;

    readout.textContent = `${cleanVal.toLocaleString()} gp`;
};

export const executeGambling = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-gamble-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const stake = parseInt(document.getElementById('dt-gamble-stake-text').value) || 10;
    const loc = document.getElementById('dt-gamble-loc').value.trim();

    if (!loc) {
        notify("Please enter the Location where you are gambling.", "error");
        return;
    }

    let modIns = parseInt(document.getElementById('dt-gamble-ins').value) || 0;
    let modDec = parseInt(document.getElementById('dt-gamble-dec').value) || 0;
    let modItm = parseInt(document.getElementById('dt-gamble-itm').value) || 0;

    const useTool = document.getElementById('dt-gamble-tool-toggle').checked;
    const toolReplaceSkill = document.getElementById('dt-gamble-tool-skill').value;
    const modTool = parseInt(document.getElementById('dt-gamble-tool-mod').value) || 0;

    let skillReplacedText = "";
    if (useTool) {
        if (toolReplaceSkill === 'ins') { modIns = modTool; skillReplacedText = " (Insight replaced by Gaming Set)"; }
        if (toolReplaceSkill === 'dec') { modDec = modTool; skillReplacedText = " (Deception replaced by Gaming Set)"; }
        if (toolReplaceSkill === 'itm') { modItm = modTool; skillReplacedText = " (Intimidation replaced by Gaming Set)"; }
    }

    // --- MATH EXECUTION ---
    
    // Generate the 3 random DCs (5 + 2d10)
    const dc1 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc2 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc3 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;

    // Player Rolls
    const rollIns = Math.floor(Math.random() * 20) + 1;
    const rollDec = Math.floor(Math.random() * 20) + 1;
    const rollItm = Math.floor(Math.random() * 20) + 1;

    const totalIns = rollIns + modIns;
    const totalDec = rollDec + modDec;
    const totalItm = rollItm + modItm;

    let successes = 0;
    if (totalIns >= dc1) successes++;
    if (totalDec >= dc2) successes++;
    if (totalItm >= dc3) successes++;

    let resultBody = ``;

    if (successes === 0) {
        resultBody = `🚨 **0 Successes**\n\nYou lose your entire stake of **${stake} gp** and accrue a debt of equal value.\n*(Total Loss: ${stake * 2} gp)*`;
    } 
    else if (successes === 1) {
        resultBody = `❌ **1 Success**\n\nYou lose half your stake.\n*(Net Loss: ${stake / 2} gp)*`;
    } 
    else if (successes === 2) {
        const winnings = stake * 1.5;
        resultBody = `⚠️ **2 Successes**\n\nYou win **${winnings} gp**!\n*(Net Profit: ${stake * 0.5} gp)*`;
    } 
    else if (successes === 3) {
        const bigWinnings = stake * 2;
        resultBody = `✅ **3 Successes**\n\nYou win big! A total payout of **${bigWinnings} gp**!\n*(Net Profit: ${stake} gp)*`;
    }

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "You are accused of cheating. You decide whether you actually did cheat or were framed.",
            "The town guards raid the gambling hall and throw you in jail.",
            "A noble in town loses badly to you and loudly vows to get revenge.",
            "You won a sum from a low-ranking member of a thieves’ guild, and the guild wants its money back.",
            "A local crime boss insists you start frequenting the boss’s gambling parlor and no others.",
            "A high-stakes gambler comes to town and insists that you take part in a game."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose during your gambling.*`;
    }

    let checksText = `**Insight (DC ${dc1}):** ${totalIns} (Rolled ${rollIns})\n**Deception (DC ${dc2}):** ${totalDec} (Rolled ${rollDec})\n**Intimidation (DC ${dc3}):** ${totalItm} (Rolled ${rollItm})`;

    const noteText = `**Downtime: Gambling**\n*Hero:* ${pc.name}\n\n**Objective:** Gambling at ${loc}\n**Gold Staked:** ${stake} gp\n**Time Spent:** 5 Days\n\n${checksText}${skillReplacedText}\n\n${resultBody}${complicationText}`;

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime gambling with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-dice');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Gambling resolved. 5 days deducted from ${pc.name}. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openGamblingModal = openGamblingModal;
    window.appActions.updateGamblingMath = updateGamblingMath;
    window.appActions.executeGambling = executeGambling;
}
