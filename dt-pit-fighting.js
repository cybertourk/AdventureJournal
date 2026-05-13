import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 6. PIT FIGHTING ---
// ============================================================================

export const openPitFightingModal = () => {
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
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hand-fist mr-2 text-stone-400"></i> Pit Fighting</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Workflow Instructions -->
                    <div class="bg-red-900/5 border border-red-900/20 p-4 rounded-sm shadow-sm mb-5">
                        <h3 class="text-xs font-bold text-red-900 uppercase tracking-widest mb-2"><i class="fa-solid fa-clipboard-list mr-1.5 text-red-700"></i> Pit Fighting Workflow</h3>
                        <ul class="text-[10px] sm:text-xs text-red-950 space-y-1.5 leading-snug font-serif">
                            <li><b>Step 1:</b> Select your <b>Hero</b> and enter the <b>Location</b> of the fighting pits.</li>
                            <li><b>Step 2:</b> Input your modifiers for <b>Athletics</b>, <b>Acrobatics</b>, and <b>Constitution</b>. Ensure your <b>Largest Hit Die</b> is correctly selected (it is rolled and added to your Constitution check).</li>
                            <li><b>Step 3:</b> <i>(Optional)</i> You may choose to replace ONE of the standard checks with an <b>Attack Roll</b> using one of your weapons.</li>
                            <li><b>Step 4:</b> Fight! You will make three checks against randomly generated DCs (5 + 2d10) to determine your winnings.</li>
                        </ul>
                    </div>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-pit-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                            <div class="flex items-center gap-3">
                                <input type="text" id="dt-pit-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner" placeholder="e.g. The Gory Colosseum">
                                <label class="flex items-center gap-2 cursor-pointer group shrink-0" title="Check this if a rival is present. It may affect complications.">
                                    <input type="checkbox" id="dt-pit-rival" class="w-4 h-4 text-red-900 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                    <span class="text-[10px] font-bold uppercase tracking-widest text-stone-700 group-hover:text-red-900 transition">Rival?</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Athletics</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-pit-ath" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Acrobatics</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-pit-acr" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Constitution</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-pit-con" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Largest Hit Die</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">d</span>
                                <select id="dt-pit-hd" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center cursor-pointer">
                                    <option value="6">6</option>
                                    <option value="8">8</option>
                                    <option value="10">10</option>
                                    <option value="12">12</option>
                                </select>
                            </div>
                            <p class="text-[9px] text-stone-400 mt-1 italic">Automatically rolled and added to Constitution check.</p>
                        </div>
                    </div>

                    <!-- Weapon Attack Override -->
                    <div class="bg-red-50 border border-red-200 p-4 rounded-sm shadow-sm mb-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="flex-grow w-full">
                            <label class="flex items-center gap-2 cursor-pointer group mb-2">
                                <input type="checkbox" id="dt-pit-replace-toggle" onchange="window.appActions.updatePitFightingMath()" class="w-4 h-4 text-red-700 rounded-sm cursor-pointer shadow-sm border-red-400">
                                <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-900 group-hover:text-red-700 transition">Use Weapon Attack</span>
                            </label>
                            <p class="text-[9px] text-red-800 italic">Replace ONE of the standard checks above with your Attack modifier.</p>
                        </div>
                        
                        <div id="dt-pit-replace-group" class="flex items-center gap-2 opacity-50 pointer-events-none transition-opacity w-full sm:w-auto">
                            <select id="dt-pit-replace-target" class="w-2/3 p-2 border border-red-300 rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner">
                                <option value="ath">Replace Athletics</option>
                                <option value="acr">Replace Acrobatics</option>
                                <option value="con">Replace Constitution</option>
                            </select>
                            <div class="flex items-center w-1/3">
                                <span class="bg-stone-200 border border-r-0 border-red-300 px-2 py-2 text-xs font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-pit-atk" value="0" class="w-full p-2 border border-red-300 rounded-r-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center" title="Attack Modifier">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Maximum Payout (3 Successes)</span>
                            <span class="text-2xl font-black text-amber-500">200 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be added to your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executePitFighting()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hand-fist mr-2"></i> Fight!</button>
                </div>
            </div>
        </div>
    `;
};

export const updatePitFightingMath = () => {
    const toggle = document.getElementById('dt-pit-replace-toggle');
    const group = document.getElementById('dt-pit-replace-group');
    if (!toggle || !group) return;

    if (toggle.checked) {
        group.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        group.classList.add('opacity-50', 'pointer-events-none');
    }
};

export const executePitFighting = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-pit-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const loc = document.getElementById('dt-pit-loc').value.trim();

    if (!loc) {
        notify("Please enter the Location of the pit fight.", "error");
        return;
    }

    const isRival = document.getElementById('dt-pit-rival').checked;

    const modAth = parseInt(document.getElementById('dt-pit-ath').value) || 0;
    const modAcr = parseInt(document.getElementById('dt-pit-acr').value) || 0;
    const modCon = parseInt(document.getElementById('dt-pit-con').value) || 0;
    const hdSize = parseInt(document.getElementById('dt-pit-hd').value) || 6;

    const useAtk = document.getElementById('dt-pit-replace-toggle').checked;
    const replaceTarget = document.getElementById('dt-pit-replace-target').value;
    const modAtk = parseInt(document.getElementById('dt-pit-atk').value) || 0;

    // --- MATH EXECUTION ---
    
    // Generate the 3 random DCs (5 + 2d10)
    const dc1 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc2 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;
    const dc3 = 5 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1;

    // Player Rolls
    const rollAth = Math.floor(Math.random() * 20) + 1;
    const rollAcr = Math.floor(Math.random() * 20) + 1;
    const rollCon = Math.floor(Math.random() * 20) + 1;
    const rollHd = Math.floor(Math.random() * hdSize) + 1;
    const rollAtk = Math.floor(Math.random() * 20) + 1;

    let totAth = rollAth + modAth;
    let totAcr = rollAcr + modAcr;
    let totCon = rollCon + modCon + rollHd;

    let textAth = `**Athletics (DC ${dc1}):** ${totAth} (Rolled ${rollAth})`;
    let textAcr = `**Acrobatics (DC ${dc2}):** ${totAcr} (Rolled ${rollAcr})`;
    let textCon = `**Constitution (DC ${dc3}):** ${totCon} (Rolled ${rollCon} + ${rollHd} on d${hdSize})`;

    let replacedText = "";
    if (useAtk) {
        const atkStr = `**Weapon Attack (DC ${replaceTarget === 'ath' ? dc1 : replaceTarget === 'acr' ? dc2 : dc3}):** ${rollAtk + modAtk} (Rolled ${rollAtk})`;
        if (replaceTarget === 'ath') {
            totAth = rollAtk + modAtk;
            textAth = atkStr;
            replacedText = " (Weapon Attack replaced Athletics)";
        } else if (replaceTarget === 'acr') {
            totAcr = rollAtk + modAtk;
            textAcr = atkStr;
            replacedText = " (Weapon Attack replaced Acrobatics)";
        } else if (replaceTarget === 'con') {
            totCon = rollAtk + modAtk;
            textCon = atkStr;
            replacedText = " (Weapon Attack replaced Constitution)";
        }
    }

    let successes = 0;
    if (totAth >= dc1) successes++;
    if (totAcr >= dc2) successes++;
    if (totCon >= dc3) successes++;

    let resultBody = ``;

    if (successes === 0) {
        resultBody = `🚨 **0 Successes**\n\nYou lose your bouts, earning nothing.`;
    } 
    else if (successes === 1) {
        resultBody = `❌ **1 Success**\n\nYou win **50 gp**!`;
    } 
    else if (successes === 2) {
        resultBody = `⚠️ **2 Successes**\n\nYou win **100 gp**!`;
    } 
    else if (successes === 3) {
        resultBody = `✅ **3 Successes**\n\nYou are victorious, winning **200 gp**!`;
    }

    // Complication Roll (10% flat chance per workweek - 5 days)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            `An opponent swears to take revenge on you.${isRival ? " (It turns out to be your rival or one of their associates)." : ""}`,
            "A crime boss approaches you and offers to pay you to intentionally lose a few matches.",
            `You defeat a popular local champion, drawing the crowd’s ire.${isRival ? " (The champion was sponsored by your rival)." : ""}`,
            "You defeat a noble’s servant, drawing the wrath of the noble’s house.",
            `You are accused of cheating. Whether the allegation is true or not, your reputation is tarnished.${isRival ? " (Your rival orchestrated the accusation)." : ""}`,
            "You accidentally deliver a near-fatal wound to a foe."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*You emerge from the pits without further incident (${d100}/100).*`;
    }

    let checksText = `*Target DCs:* ${dc1}, ${dc2}, ${dc3}\n${textAth}\n${textAcr}\n${textCon}`;

    const noteText = `**Downtime: Pit Fighting**\n*Hero:* ${pc.name}\n\n**Objective:** Fighting at ${loc}\n**Time Spent:** 5 Days\n\n${checksText}${replacedText}\n\n${resultBody}${complicationText}`;

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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime pit fighting in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hand-fist');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Pit Fighting resolved. 5 days deducted from ${pc.name}. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openPitFightingModal = openPitFightingModal;
    window.appActions.updatePitFightingMath = updatePitFightingMath;
    window.appActions.executePitFighting = executePitFighting;
}
