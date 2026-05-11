import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 10. SCRIBING A SPELL SCROLL ---
// ============================================================================

export const openScribingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-fuchsia-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-scroll mr-2 text-fuchsia-400"></i> Scribing a Spell Scroll</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-scribe-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner">
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
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Spell Level</label>
                                <select id="dt-scribe-level" onchange="window.appActions.updateScribingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner">
                                    <option value="0">Cantrip (Level 0)</option>
                                    <option value="1" selected>1st Level</option>
                                    <option value="2">2nd Level</option>
                                    <option value="3">3rd Level</option>
                                    <option value="4">4th Level</option>
                                    <option value="5">5th Level</option>
                                    <option value="6">6th Level</option>
                                    <option value="7">7th Level</option>
                                    <option value="8">8th Level</option>
                                    <option value="9">9th Level</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Spell Name</label>
                                <input type="text" id="dt-scribe-spell-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Fireball">
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="dt-scribe-materials" class="w-4 h-4 text-fuchsia-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <label class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 cursor-pointer" for="dt-scribe-materials">Material Components Provided?</label>
                        </div>
                        <p class="text-[9px] text-stone-400 mt-1 italic leading-snug">You must provide any material components required by the spell in addition to the standard cost of the scroll.</p>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Requirements</span>
                            <div class="text-right">
                                <span id="dt-scribe-total-days" class="text-sm font-bold text-emerald-400 mr-3">1 Day</span>
                                <span id="dt-scribe-total-gold" class="text-sm font-bold text-amber-400">25 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Work Days Spent <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-scribe-days-spent" value="1" min="1" oninput="window.appActions.updateScribingMath()" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Complication Risk</span>
                                <span id="dt-scribe-risk" class="text-xl font-bold text-red-500">10%</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Checked automatically</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold and material components must be deducted manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-scribe-submit-btn" onclick="window.appActions.executeScribing()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-scroll mr-2"></i> Log Scribing</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateScribingMath, 50);
};

export const updateScribingMath = () => {
    const levelEl = document.getElementById('dt-scribe-level');
    const daysSpentEl = document.getElementById('dt-scribe-days-spent');
    
    if (!levelEl || !daysSpentEl) return;

    const level = parseInt(levelEl.value) || 0;
    
    const scrollCosts = {
        0: { t: 1, c: 15 }, 
        1: { t: 1, c: 25 }, 
        2: { t: 3, c: 250 },
        3: { t: 5, c: 500 }, 
        4: { t: 10, c: 2500 }, 
        5: { t: 20, c: 5000 },
        6: { t: 40, c: 15000 }, 
        7: { t: 80, c: 25000 }, 
        8: { t: 160, c: 50000 },
        9: { t: 240, c: 250000 }
    };

    const effectiveTime = scrollCosts[level].t;
    const effectiveCost = scrollCosts[level].c;

    // Update Requirements UI
    document.getElementById('dt-scribe-total-days').textContent = `${effectiveTime} Day${effectiveTime !== 1 ? 's' : ''}`;
    document.getElementById('dt-scribe-total-gold').textContent = `${effectiveCost.toLocaleString()} gp`;

    // Cap progress to max required time
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    if (daysSpent > effectiveTime) {
        daysSpent = effectiveTime;
        daysSpentEl.value = effectiveTime;
    }

    // 10% complication risk per workweek (5 days) spent DURING THIS LOG
    const workweeks = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeks * 10);
    document.getElementById('dt-scribe-risk').textContent = `${risk}%`;

    // Button Toggle
    const submitBtn = document.getElementById('dt-scribe-submit-btn');
    if (submitBtn) {
        if (daysSpent >= effectiveTime) {
            submitBtn.innerHTML = `<i class="fa-solid fa-scroll mr-2"></i> Complete Project`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-pen-fancy mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const executeScribing = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-scribe-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const spellName = document.getElementById('dt-scribe-spell-name').value.trim();
    if (!spellName) {
        notify("Please enter the name of the spell you are scribing.", "error");
        return;
    }

    // Ensure material checkbox is ticked
    const materialsChecked = document.getElementById('dt-scribe-materials').checked;
    if (!materialsChecked) {
        notify("You must confirm you have provided the required material components.", "error");
        return;
    }

    const level = parseInt(document.getElementById('dt-scribe-level').value) || 0;
    
    const scrollCosts = {
        0: { t: 1, c: 15 }, 1: { t: 1, c: 25 }, 2: { t: 3, c: 250 },
        3: { t: 5, c: 500 }, 4: { t: 10, c: 2500 }, 5: { t: 20, c: 5000 },
        6: { t: 40, c: 15000 }, 7: { t: 80, c: 25000 }, 8: { t: 160, c: 50000 },
        9: { t: 240, c: 250000 }
    };

    const effectiveTime = scrollCosts[level].t;
    const effectiveCost = scrollCosts[level].c;

    const daysSpent = parseInt(document.getElementById('dt-scribe-days-spent').value) || 1;
    const isComplete = daysSpent >= effectiveTime;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < daysSpent) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // --- MATH EXECUTION ---

    // Complication Roll (10% chance per workweek)
    let complicationText = ``;
    const workweeks = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeks * 10);
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= risk) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "You bought up the last of the rare ink used to craft scrolls, angering a wizard in town.", 
            "The priest of a temple of good accuses you of trafficking in dark magic.",
            "A wizard eager to collect one of your spells in a book presses you to sell the scroll.", 
            "Due to a strange error in creating the scroll, it is instead a random spell of the same level.",
            "The rare parchment you bought for your scroll has a barely visible map on it.", 
            "A thief attempts to break into your workroom."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100 vs ${risk}% Risk)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose during your work (${d100}/100).*`;
    }

    // Build the log text
    let resultHeader = `**Objective:** Spell Scroll (${spellName})`;
    let resultBody = isComplete 
        ? `✅ **Project Completed!** You have successfully scribed a **Spell Scroll of ${spellName}**.` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days working on the **Spell Scroll of ${spellName}**. *(Remaining: ${effectiveTime - daysSpent} Days)*`;

    let costNote = `**Total Project Material Cost:** ${effectiveCost.toLocaleString()} gp`;
    if (!isComplete) costNote += ` *(Costs must be paid up front when starting a project).*`;

    const noteText = `**Downtime: Scribing a Spell Scroll**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Work Days Logged:** ${daysSpent} Days\n${costNote}\n\n${resultBody}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - daysSpent),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime scribing a spell scroll with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-scroll');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Scribing progress logged. ${daysSpent} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openScribingModal = openScribingModal;
    window.appActions.updateScribingMath = updateScribingMath;
    window.appActions.executeScribing = executeScribing;
}
