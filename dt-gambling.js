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
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-dice-d20 mr-2 text-amber-500"></i> Gambling</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> to risk your coin in games of chance. You must make three checks (Insight, Deception, Intimidation) against randomly generated DCs (5 + 2d10).</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-gamble-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                            <input type="text" id="dt-gamble-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner" placeholder="e.g. The Yawning Portal">
                        </div>
                    </div>

                    <!-- Stake -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-3 tracking-widest">Gold Piece Stake (10 - 1,000 gp)</label>
                        <div class="flex items-center gap-4">
                            <input type="range" id="dt-gamble-slider" min="10" max="1000" value="10" step="10" oninput="window.appActions.updateGamblingMath('slider')" class="w-full cursor-pointer accent-amber-600">
                            <div class="flex items-center shrink-0">
                                <input type="number" id="dt-gamble-stake" value="10" min="10" max="1000" oninput="window.appActions.updateGamblingMath('input')" class="w-20 p-2 border border-amber-300 rounded-l-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-amber-50 shadow-inner text-center">
                                <span class="bg-amber-200 border border-l-0 border-amber-300 px-2 py-2 text-xs font-bold text-amber-900 rounded-r-sm shadow-inner uppercase tracking-wider">GP</span>
                            </div>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-clipboard-user mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
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

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-amber-50 p-4 border border-amber-200 rounded-sm shadow-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-amber-800 font-bold mb-1 tracking-widest">Gaming Set Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-amber-100 border border-r-0 border-amber-300 px-2 py-2 text-sm font-bold text-amber-800 rounded-l-sm">+</span>
                                <input type="number" id="dt-gamble-tool" value="0" class="w-full p-2 border border-amber-300 rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-amber-800 font-bold mb-1 tracking-widest">Replace Skill Check</label>
                            <select id="dt-gamble-replace" class="w-full p-2 border border-amber-300 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                                <option value="none">-- Do Not Replace --</option>
                                <option value="ins">Replace Insight</option>
                                <option value="dec">Replace Deception</option>
                                <option value="itm">Replace Intimidation</option>
                            </select>
                            <p class="text-[9px] text-amber-700 mt-1 italic">Swap one check for a Gaming Set check.</p>
                        </div>
                    </div>

                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Maximum Payout (3 Successes)</span>
                            <span id="dt-gamble-payout-out" class="text-2xl font-black text-amber-500">20 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted/added to your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeGambling()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice-d20 mr-2"></i> Gamble!</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.appActions.updateGamblingMath('init');
    }, 50);
};

export const updateGamblingMath = (triggerSource) => {
    const slider = document.getElementById('dt-gamble-slider');
    const input = document.getElementById('dt-gamble-stake');
    const payoutOut = document.getElementById('dt-gamble-payout-out');
    
    if (!slider || !input || !payoutOut) return;

    let stake = 10;
    if (triggerSource === 'slider') {
        stake = parseInt(slider.value) || 10;
        input.value = stake;
    } else {
        stake = parseInt(input.value) || 10;
        if (stake > 1000) { stake = 1000; input.value = 1000; }
        if (stake < 10) { stake = 10; input.value = 10; }
        slider.value = stake;
    }

    // 3 successes = gain amount equal to bet (total payout = 2x stake)
    const maxWin = stake * 2;
    payoutOut.textContent = `${maxWin.toLocaleString()} gp`;
};

export const executeGambling = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-gamble-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const loc = document.getElementById('dt-gamble-loc').value.trim();
    if (!loc) {
        notify("Please enter a location for the gambling activity.", "error");
        return;
    }

    const stake = parseInt(document.getElementById('dt-gamble-stake').value) || 10;
    
    if (!confirm(`Spend 5 downtime days and risk ${stake} gp gambling in ${loc}?`)) return;

    let modIns = parseInt(document.getElementById('dt-gamble-ins').value) || 0;
    let modDec = parseInt(document.getElementById('dt-gamble-dec').value) || 0;
    let modItm = parseInt(document.getElementById('dt-gamble-itm').value) || 0;
    
    const replaceTarget = document.getElementById('dt-gamble-replace').value;
    const modTool = parseInt(document.getElementById('dt-gamble-tool').value) || 0;

    let toolUsed = null;
    if (replaceTarget === 'ins') { modIns = modTool; toolUsed = 'Insight'; }
    if (replaceTarget === 'dec') { modDec = modTool; toolUsed = 'Deception'; }
    if (replaceTarget === 'itm') { modItm = modTool; toolUsed = 'Intimidation'; }

    // Roll DCs (5 + 2d10)
    const dc1 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc2 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc3 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;

    // Roll Player Checks
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

    let resultHeader = `**Gambling in ${loc}**`;
    let resultBody = ``;

    if (successes === 0) {
        resultBody = `💀 **0 Successes:** You lose your entire stake of **${stake} gp** and accrue a debt of equal value!\n*(You now owe an additional ${stake} gp to someone!)*`;
    } else if (successes === 1) {
        resultBody = `📉 **1 Success:** You lose half your stake: **${Math.ceil(stake / 2)} gp**.`;
    } else if (successes === 2) {
        resultBody = `📈 **2 Successes:** You win! You gain half your stake back in profit for a total payout of **${Math.ceil(stake * 1.5)} gp**.`;
    } else if (successes === 3) {
        resultBody = `🏆 **3 Successes:** You win big! You double your money for a total payout of **${stake * 2} gp**!`;
    }

    // Complication (10% chance)
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
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100)\n> *Result:* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose (${d100}/100).*`;
    }

    let insLabel = toolUsed === 'Insight' ? `**Gaming Set (replaces Insight):**` : `**Insight Check:**`;
    let decLabel = toolUsed === 'Deception' ? `**Gaming Set (replaces Deception):**` : `**Deception Check:**`;
    let itmLabel = toolUsed === 'Intimidation' ? `**Gaming Set (replaces Intimidation):**` : `**Intimidation Check:**`;

    let checksText = `*Target DCs:* ${dc1}, ${dc2}, ${dc3}\n${insLabel} ${totalIns} (vs DC ${dc1})\n${decLabel} ${totalDec} (vs DC ${dc2})\n${itmLabel} ${totalItm} (vs DC ${dc3})`;

    const noteText = `**Downtime: Gambling**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** 5 Days\n**Stake:** ${stake} gp\n\n${checksText}\n\n${resultBody}${complicationText}`;
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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime gambling in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-dice-d20');

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
