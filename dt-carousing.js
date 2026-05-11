import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 2. CAROUSING ---
// ============================================================================

export const openCarousingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-beer-mug-empty mr-2 text-amber-400"></i> Carousing</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-carouse-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Persuasion Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-carouse-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <div class="mb-5 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Carousing Social Class</label>
                                <select id="dt-carouse-class" onchange="window.appActions.updateCarousingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm">
                                    <option value="lower">Lower Class (10 gp)</option>
                                    <option value="middle">Middle Class (50 gp)</option>
                                    <option value="upper" disabled>Upper Class (250 gp)</option>
                                </select>
                            </div>
                            
                            <div class="flex flex-col justify-center">
                                <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                    <input type="checkbox" id="dt-carouse-noble-toggle" onchange="window.appActions.updateCarousingMath()" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition">Has Noble Background</span>
                                </label>
                                <p class="text-[9px] text-stone-500 italic">Check this box to unlock Upper Class carousing (or if you succeeded on a Deception check with a Disguise Kit).</p>
                            </div>
                        </div>
                        
                        <div class="mt-4 pt-3 border-t border-[#d4c5a9]">
                            <p id="dt-carouse-desc-lower" class="text-xs text-stone-700 leading-snug"><b>Lower-class contacts</b> include criminals, laborers, mercenaries, the town guard, and anyone else who frequents the grimiest taverns in town.</p>
                            <p id="dt-carouse-desc-middle" class="hidden text-xs text-stone-700 leading-snug"><b>Middle-class contacts</b> include guild members, spellcasters, town officials, and merchants.</p>
                            <p id="dt-carouse-desc-upper" class="hidden text-xs text-stone-700 leading-snug"><b>Upper-class contacts</b> are nobles and their personal servants. Carousing with them requires access to the local nobility.</p>
                        </div>
                    </div>

                    <div class="mt-6 bg-[#292524] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Estimated Gold Cost</span>
                            <span id="dt-carouse-gold-out" class="text-2xl font-black text-amber-400">10 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-xl font-bold text-emerald-400">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeCarousing()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice-d20 mr-2"></i> Execute Carousing</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateCarousingMath, 50);
};

export const updateCarousingMath = () => {
    const classSelect = document.getElementById('dt-carouse-class');
    const nobleToggle = document.getElementById('dt-carouse-noble-toggle');
    const goldOut = document.getElementById('dt-carouse-gold-out');
    
    if (!classSelect || !nobleToggle || !goldOut) return;

    const upperOption = classSelect.querySelector('option[value="upper"]');
    if (upperOption) {
        upperOption.disabled = !nobleToggle.checked;
        if (!nobleToggle.checked && classSelect.value === 'upper') {
            classSelect.value = 'middle';
        }
    }

    document.getElementById('dt-carouse-desc-lower').classList.add('hidden');
    document.getElementById('dt-carouse-desc-middle').classList.add('hidden');
    document.getElementById('dt-carouse-desc-upper').classList.add('hidden');
    
    const selectedClass = classSelect.value;
    document.getElementById(`dt-carouse-desc-${selectedClass}`).classList.remove('hidden');

    let cost = 10;
    if (selectedClass === 'middle') cost = 50;
    if (selectedClass === 'upper') cost = 250;
    goldOut.textContent = `${cost} gp`;
};

export const executeCarousing = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-carouse-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const pMod = parseInt(document.getElementById('dt-carouse-mod').value) || 0;
    const socialClass = document.getElementById('dt-carouse-class').value;
    
    let goldCost = 10;
    if (socialClass === 'middle') goldCost = 50;
    if (socialClass === 'upper') goldCost = 250;

    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + pMod;
    
    let alliedGained = 0;
    let hostileGained = 0;
    
    if (checkTotal <= 5) hostileGained = 1;
    else if (checkTotal <= 15) alliedGained = 1;
    else if (checkTotal <= 20) alliedGained = 2;
    else alliedGained = 3;

    const d100 = Math.floor(Math.random() * 100) + 1;
    const hasComplication = d100 <= 10;
    
    let complicationText = "";
    if (hasComplication) {
        const d8 = Math.floor(Math.random() * 8) + 1;
        const compTables = {
            lower: [
                "A pickpocket lifts 1d10 × 5 gp from you.", 
                "A bar brawl leaves you with a scar.", 
                "You have fuzzy memories of doing something illegal...", 
                "You are banned from a tavern.", 
                "You swore to pursue a dangerous quest.", 
                "Surprise! You’re married.", 
                "Streaking naked seemed like a great idea...", 
                "Everyone is calling you an embarrassing nickname."
            ],
            middle: [
                "You accidentally insulted a guild master.", 
                "You swore a quest for a temple or a guild.", 
                "A social gaffe has made you the talk of the town.", 
                "An obnoxious person has taken a romantic interest in you.", 
                "You have made a foe of a local spellcaster.", 
                "You've been recruited to help run a local event.", 
                "You made a drunken toast that scandalized the locals.", 
                "You spent an additional 100 gp trying to impress people."
            ],
            upper: [
                "A pushy noble family wants to marry off one of their scions to you.", 
                "You tripped during a dance, and people can’t stop talking about it.", 
                "You have agreed to take on a noble’s debts.", 
                "You have been challenged to a joust by a knight.", 
                "You have made a foe of a local noble.", 
                "A boring noble insists you visit each day.", 
                "You are the target of embarrassing rumors.", 
                "You spent an additional 500 gp trying to impress people."
            ]
        };
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result (d8=${d8}):* ${compTables[socialClass][d8 - 1]}\n\n*(Any specific gold losses, scars, or relationships must be applied to your hero's sheet manually).*`;
    }

    let resultBody = ``;
    if (hostileGained > 0) resultBody += `❌ You made a poor impression and gained **${hostileGained} Hostile Contact(s)** in the ${socialClass} class.`;
    else if (alliedGained > 0) resultBody += `✅ You socialized successfully and gained **${alliedGained} Allied Contact(s)** in the ${socialClass} class!`;
    else resultBody += `You made no notable new contacts during this time.`;

    const noteText = `**Downtime: Carousing (${socialClass.charAt(0).toUpperCase() + socialClass.slice(1)} Class)**\n*Hero:* ${pc.name}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** ${goldCost} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${pMod >= 0 ? `+ ${pMod}` : `- ${Math.abs(pMod)}`})\n\n${resultBody}\n*(Be sure to scribe any new named contacts into your hero's Private Journal under Allies/Enemies!)*${complicationText}`;

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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime carousing with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-beer-mug-empty');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Carousing complete! 5 days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};
