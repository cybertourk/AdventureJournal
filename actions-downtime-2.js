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

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

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

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-crime-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-crime-m" onchange="window.updateDayOptions(this.value, 'dt-crime-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-crime-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
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

    const igY = parseInt(document.getElementById('dt-crime-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-crime-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-crime-d').value, 10) || camp.calendar.currentDay || 1;

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

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'hidden', visibleTo: [] },
        timestamp: Date.now(), duration: 5, repeatsYearly: false, category: 'Downtime'
    };

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { ...p, availableDowntime: (parseInt(p.availableDowntime) || 0) - 5 } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime attempting a heist with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-mask');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Crime resolved. 5 days deducted from ${pc.name}.`, "success");
    reRender();
};

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

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

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

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-gamble-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-gamble-m" onchange="window.updateDayOptions(this.value, 'dt-gamble-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-gamble-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
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

    const igY = parseInt(document.getElementById('dt-gamble-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-gamble-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-gamble-d').value, 10) || camp.calendar.currentDay || 1;

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

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: 5, repeatsYearly: false, category: 'Downtime'
    };

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { ...p, availableDowntime: (parseInt(p.availableDowntime) || 0) - 5 } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime gambling with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-dice');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Gambling resolved. 5 days deducted from ${pc.name}.`, "success");
    reRender();
};

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

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-red-900 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hand-fist mr-2 text-stone-400"></i> Pit Fighting</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-pit-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-pit-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-pit-m" onchange="window.updateDayOptions(this.value, 'dt-pit-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-pit-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-red-900 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                            <input type="text" id="dt-pit-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-stone-50 shadow-inner" placeholder="e.g. The Gory Colosseum">
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                    <p class="text-[10px] text-stone-500 italic mb-4">You will make three checks against randomly generated DCs (5 + 2d10).</p>
                    
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
                                <select id="dt-pit-hd" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-red-900 bg-white shadow-inner text-center">
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
                    <div class="bg-red-900/5 border border-red-900/20 p-4 rounded-sm shadow-sm mb-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="flex-grow w-full">
                            <label class="flex items-center gap-2 cursor-pointer group mb-2">
                                <input type="checkbox" id="dt-pit-replace-toggle" onchange="window.appActions.updatePitFightingMath()" class="w-4 h-4 text-red-700 rounded-sm cursor-pointer shadow-sm border-red-300">
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
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Maximum Payout</span>
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

    const modAth = parseInt(document.getElementById('dt-pit-ath').value) || 0;
    const modAcr = parseInt(document.getElementById('dt-pit-acr').value) || 0;
    const modCon = parseInt(document.getElementById('dt-pit-con').value) || 0;
    const hdSize = parseInt(document.getElementById('dt-pit-hd').value) || 6;

    const useAtk = document.getElementById('dt-pit-replace-toggle').checked;
    const replaceTarget = document.getElementById('dt-pit-replace-target').value;
    const modAtk = parseInt(document.getElementById('dt-pit-atk').value) || 0;

    const igY = parseInt(document.getElementById('dt-pit-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-pit-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-pit-d').value, 10) || camp.calendar.currentDay || 1;

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

    if (useAtk) {
        const atkStr = `**Weapon Attack (DC ${replaceTarget === 'ath' ? dc1 : replaceTarget === 'acr' ? dc2 : dc3}):** ${rollAtk + modAtk} (Rolled ${rollAtk})`;
        if (replaceTarget === 'ath') {
            totAth = rollAtk + modAtk;
            textAth = atkStr;
        } else if (replaceTarget === 'acr') {
            totAcr = rollAtk + modAtk;
            textAcr = atkStr;
        } else if (replaceTarget === 'con') {
            totCon = rollAtk + modAtk;
            textCon = atkStr;
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

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "An opponent swears to take revenge on you.",
            "A crime boss approaches you and offers to pay you to intentionally lose a few matches.",
            "You defeat a popular local champion, drawing the crowd’s ire.",
            "You defeat a noble’s servant, drawing the wrath of the noble’s house.",
            "You are accused of cheating. Whether the allegation is true or not, your reputation is tarnished.",
            "You accidentally deliver a near-fatal wound to a foe."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*You emerge from the pits without further incident.*`;
    }

    let checksText = `${textAth}\n${textAcr}\n${textCon}`;

    const noteText = `**Downtime: Pit Fighting**\n*Hero:* ${pc.name}\n\n**Objective:** Fighting at ${loc}\n**Time Spent:** 5 Days\n\n${checksText}\n\n${resultBody}${complicationText}`;

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: 5, repeatsYearly: false, category: 'Downtime'
    };

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { ...p, availableDowntime: (parseInt(p.availableDowntime) || 0) - 5 } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime pit fighting with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hand-fist');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Pit Fighting resolved. 5 days deducted from ${pc.name}.`, "success");
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
    
    window.appActions.openGamblingModal = openGamblingModal;
    window.appActions.updateGamblingMath = updateGamblingMath;
    window.appActions.executeGambling = executeGambling;

    window.appActions.openPitFightingModal = openPitFightingModal;
    window.appActions.updatePitFightingMath = updatePitFightingMath;
    window.appActions.executePitFighting = executePitFighting;
}
