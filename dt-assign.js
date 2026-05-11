import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

// ============================================================================
// --- 14. DM ASSIGN DOWNTIME ---
// ============================================================================

export const openAssignDowntimeModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) {
        notify("Only the DM can assign downtime days.", "error");
        return;
    }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    const validPCs = camp.playerCharacters || [];
    if (validPCs.length === 0) { 
        notify("There are no heroes enrolled in this campaign.", "error"); 
        return; 
    }

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-500 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hourglass-half mr-2 text-amber-400"></i> Assign Downtime Days</h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Grant downtime days to the party, or make an administrative adjustment to a specific hero's balance.</p>

                    <!-- Target Selection -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Assignment Target</label>
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="dt-assign-target" value="all" checked onchange="document.getElementById('dt-assign-pc-wrapper').classList.add('hidden')" class="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer">
                                <span class="text-xs font-bold text-stone-700 group-hover:text-amber-700 transition">Entire Party</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="radio" name="dt-assign-target" value="specific" onchange="document.getElementById('dt-assign-pc-wrapper').classList.remove('hidden')" class="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer">
                                <span class="text-xs font-bold text-stone-700 group-hover:text-amber-700 transition">Specific Hero</span>
                            </label>
                        </div>
                        
                        <div id="dt-assign-pc-wrapper" class="hidden mt-2 pt-2 border-t border-[#d4c5a9]">
                            <select id="dt-assign-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-stone-50 shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Type & Amount -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div class="bg-stone-50 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Adjustment Type</label>
                            <select id="dt-assign-type" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm">
                                <option value="add">Add Downtime (+)</option>
                                <option value="subtract">Deduct / Remove (-)</option>
                            </select>
                        </div>
                        <div class="bg-stone-50 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest">Number of Days</label>
                            <input type="number" id="dt-assign-days" value="5" min="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-sm">
                        </div>
                    </div>

                    <!-- Date Selection (Kept for Historical DM Logging) -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Date of Assignment</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-assign-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-assign-m" onchange="window.updateDayOptions(this.value, 'dt-assign-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-assign-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                        <p class="text-[9px] text-stone-500 italic mt-2">Downtime assignments will still be stamped into the campaign calendar timeline for historical reference.</p>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Reason / Notes</label>
                        <input type="text" id="dt-assign-reason" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner" placeholder="e.g. Returned to Waterdeep, Between adventures...">
                    </div>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeAssignDowntime()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-check mr-2"></i> Confirm Assignment</button>
                </div>
            </div>
        </div>
    `;
};

export const executeAssignDowntime = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp._isDM) return;

    const targetType = document.querySelector('input[name="dt-assign-target"]:checked').value;
    const pcId = document.getElementById('dt-assign-pc').value;
    const adjustType = document.getElementById('dt-assign-type').value;
    const daysInput = parseInt(document.getElementById('dt-assign-days').value) || 0;
    const reason = document.getElementById('dt-assign-reason').value.trim();

    if (daysInput <= 0) {
        notify("Please enter a valid number of days.", "error");
        return;
    }

    const actualDays = adjustType === 'add' ? daysInput : -daysInput;
    let namesAffected = [];

    const actionWord = adjustType === 'add' ? 'Granted' : 'Deducted';
    let targetStr = targetType === 'all' ? 'the Entire Party' : 'Target Hero';
    
    let resultBody = `The Dungeon Master ${actionWord.toLowerCase()} **${daysInput} Downtime Day${daysInput !== 1 ? 's' : ''}**.`;
    if (reason) {
        resultBody += `\n\n*Reason: ${reason}*`;
    }

    const noteText = `**DM Assignment: Downtime**\n\n${resultBody}`;
    
    // Also push the assignment record to the players' personal logs so they see the adjustment!
    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `\n\n---\n\n**Logged on ${timestampStr}**\n${noteText}`;

    // Update PC balances and append personal log
    const updatedPCs = camp.playerCharacters.map(pc => {
        if (targetType === 'all' || pc.id === pcId) {
            namesAffected.push(pc.name);
            let current = parseInt(pc.availableDowntime) || 0;
            let newBalance = Math.max(0, current + actualDays);
            return { 
                ...pc, 
                availableDowntime: newBalance,
                downtimeLog: (pc.downtimeLog || '') + logAddition
            };
        }
        return pc;
    });

    if (namesAffected.length === 0) return;
    if (targetType !== 'all') targetStr = namesAffected[0];

    const igY = parseInt(document.getElementById('dt-assign-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-assign-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-assign-d').value, 10) || camp.calendar.currentDay || 1;

    // --- SAVE TO CALENDAR ---
    // DM assignments still go to the Calendar because they define "When" a 6-month break occurred between adventures.
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), 
        text: `**DM Assignment: Downtime**\n\nThe Dungeon Master ${actionWord.toLowerCase()} **${daysInput} Downtime Day${daysInput !== 1 ? 's' : ''}** for ${targetStr}.${reason ? `\n\n*Reason: ${reason}*` : ''}`, 
        authorId: camp.dmId, 
        visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), 
        duration: 1, 
        repeatsYearly: false, 
        category: 'Downtime'
    };

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

    // Log to Activity Log so the party sees it
    const logMsg = `<span class="font-bold text-amber-700">The Dungeon Master</span> ${actionWord.toLowerCase()} ${daysInput} Downtime Day(s) for ${targetStr}.`;
    
    const newLog = {
        id: generateId(),
        timestamp: Date.now(),
        text: logMsg,
        icon: 'fa-hourglass-half'
    };
    
    updatedCamp.activityLog = [newLog, ...(updatedCamp.activityLog || [])].slice(0, 100);

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Downtime ${actionWord.toLowerCase()} successfully.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openAssignDowntimeModal = openAssignDowntimeModal;
    window.appActions.executeAssignDowntime = executeAssignDowntime;
}
