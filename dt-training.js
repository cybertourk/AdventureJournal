import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 12. TRAINING ---
// ============================================================================

const TRAINING_SUBJECTS = {
    languages: {
        common: { common: "Common", dwarvish: "Dwarvish", elvish: "Elvish", giant: "Giant", gnomish: "Gnomish", goblin: "Goblin", halfling: "Halfling", orc: "Orc" },
        exotic: { abyssal: "Abyssal", celestial: "Celestial", draconic: "Draconic", deep: "Deep Speech", infernal: "Infernal", primordial: "Primordial", sylvan: "Sylvan", undercommon: "Undercommon" },
        rare: { aarakocra: "Aarakocra", cant: "Thieves' Cant", druidic: "Druidic", gith: "Gith", khuzdul: "Khuzdul", sahuagin: "Sahuagin", telepathy: "Telepathy", thriKreen: "Thri-kreen" }
    },
    tools: {
        artisan: { alchemist: "Alchemist's Supplies", brewer: "Brewer's Supplies", calligrapher: "Calligrapher's Supplies", carpenter: "Carpenter's Tools", cartographer: "Cartographer's Tools", cobbler: "Cobbler's Tools", cook: "Cook's Utensils", glassblower: "Glassblower's Tools", jeweler: "Jeweler's Tools", leatherworker: "Leatherworker's Tools", mason: "Mason's Tools", painter: "Painter's Supplies", potter: "Potter's Tools", smith: "Smith's Tools", tinker: "Tinker's Tools", weaver: "Weaver's Tools", woodcarver: "Woodcarver's Tools" },
        gaming: { dice: "Dice Set", chess: "Dragonchess Set", card: "Playing Card Set", pdragon: "Three-Dragon Ante Set" },
        instruments: { bagpipes: "Bagpipes", drum: "Drum", dulcimer: "Dulcimer", flute: "Flute", lute: "Lute", lyre: "Lyre", horn: "Horn", pan: "Pan Flute", shawm: "Shawm", viol: "Viol" },
        vehicles: { air: "Air Vehicles", land: "Land Vehicles", space: "Space Vehicles", water: "Water Vehicles" },
        other: { disg: "Disguise Kit", forg: "Forgery Kit", herb: "Herbalism Kit", navg: "Navigator's Tools", pois: "Poisoner's Kit", thief: "Thieves' Tools" }
    }
};

const buildSubjectOptions = () => {
    let html = '';
    
    html += `<optgroup label="--- Common Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.common).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Exotic Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.exotic).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Rare & Secret Languages ---">`;
    Object.values(TRAINING_SUBJECTS.languages.rare).forEach(name => html += `<option value="Language (${name})">${name}</option>`);
    html += `</optgroup><optgroup label="--- Artisan's Tools ---">`;
    Object.values(TRAINING_SUBJECTS.tools.artisan).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Gaming Sets ---">`;
    Object.values(TRAINING_SUBJECTS.tools.gaming).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Musical Instruments ---">`;
    Object.values(TRAINING_SUBJECTS.tools.instruments).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Vehicles ---">`;
    Object.values(TRAINING_SUBJECTS.tools.vehicles).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Other Tools & Kits ---">`;
    Object.values(TRAINING_SUBJECTS.tools.other).forEach(name => html += `<option value="${name}">${name}</option>`);
    html += `</optgroup><optgroup label="--- Custom ---">`;
    html += `<option value="custom">Custom Tool / Language (Type below)</option>`;
    html += `</optgroup>`;
    
    return html;
};

export const openTrainingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-fuchsia-700 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-graduation-cap mr-2 text-fuchsia-400"></i> Training</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend downtime to learn a new language or tool proficiency. The base time is 10 workweeks (50 days), reduced by your Intelligence modifier.</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-train-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner">
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
                                <input type="number" id="dt-train-int" value="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Subject of Study</label>
                            <select id="dt-train-subject" onchange="const c = document.getElementById('dt-train-custom'); if(this.value === 'custom') c.classList.remove('hidden'); else c.classList.add('hidden');" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner">
                                ${buildSubjectOptions()}
                            </select>
                            <input type="text" id="dt-train-custom" class="hidden w-full p-2 mt-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Sylvan, Herbalism Kit...">
                        </div>

                        <div class="border-t border-[#d4c5a9] pt-3 mt-3">
                            <h4 class="text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-solid fa-user-graduate mr-1"></i> Instructor Details</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Name</label>
                                    <input type="text" id="dt-train-inst-name" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elara">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Species / Race</label>
                                    <input type="text" id="dt-train-inst-species" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elf">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Location</label>
                                    <input type="text" id="dt-train-inst-loc" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm mb-4">
                        <label class="flex items-center gap-2 cursor-pointer group mb-1">
                            <input type="checkbox" id="dt-train-harper" onchange="document.getElementById('dt-train-harper-details').classList.toggle('hidden'); window.appActions.updateTrainingMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                        </label>
                        <p class="text-[9px] text-blue-700 italic leading-snug">The Harpers' network reduces training time by two workweeks (does not reduce gold cost). Requires travel to a safe house.</p>
                    </div>

                    <div id="dt-train-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-train-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-train-travel" value="0" min="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Requirements</span>
                            <div class="text-right">
                                <span id="dt-train-total-days" class="text-sm font-bold text-emerald-400 mr-3">50 Days</span>
                                <span id="dt-train-total-gold" class="text-sm font-bold text-amber-400">250 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Work Days Spent <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-train-days-spent" value="5" min="1" step="5" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Complication Risk</span>
                                <span id="dt-train-risk" class="text-xl font-bold text-red-500">10%</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Checked automatically</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-train-submit-btn" onclick="window.appActions.executeTraining()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-graduation-cap mr-2"></i> Log Training</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateTrainingMath, 50);
};

export const updateTrainingMath = () => {
    const intModEl = document.getElementById('dt-train-int');
    const harperEl = document.getElementById('dt-train-harper');
    const daysSpentEl = document.getElementById('dt-train-days-spent');
    
    if (!intModEl || !harperEl || !daysSpentEl) return;

    const intMod = parseInt(intModEl.value) || 0;
    const hasHarper = harperEl.checked;
    
    // Core Math
    const baseWorkweeks = Math.max(1, 10 - intMod);
    const goldCost = baseWorkweeks * 25; // Gold is based strictly on the un-Harper-modified time!
    
    const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
    const effectiveTime = timeWorkweeks * 5;

    // Update Requirements UI
    document.getElementById('dt-train-total-days').textContent = `${effectiveTime} Day${effectiveTime !== 1 ? 's' : ''}`;
    document.getElementById('dt-train-total-gold').textContent = `${goldCost.toLocaleString()} gp`;

    // Cap progress to max required time
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    if (daysSpent > effectiveTime) {
        daysSpent = effectiveTime;
        daysSpentEl.value = effectiveTime;
    }

    // 10% complication risk per workweek (5 days) spent DURING THIS LOG
    const workweeksSpent = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeksSpent * 10);
    document.getElementById('dt-train-risk').textContent = `${risk}%`;

    // Button Toggle
    const submitBtn = document.getElementById('dt-train-submit-btn');
    if (submitBtn) {
        if (daysSpent >= effectiveTime) {
            submitBtn.innerHTML = `<i class="fa-solid fa-graduation-cap mr-2"></i> Complete Training`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-book-reader mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const executeTraining = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-train-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    let subject = document.getElementById('dt-train-subject').value;
    if (subject === 'custom') subject = document.getElementById('dt-train-custom').value.trim();
    
    if (!subject) {
        notify("Please specify the subject you are training.", "error");
        return;
    }

    const instName = document.getElementById('dt-train-inst-name').value.trim();
    const instSpecies = document.getElementById('dt-train-inst-species').value.trim();
    const instLoc = document.getElementById('dt-train-inst-loc').value.trim();

    if (!instName || !instSpecies || !instLoc) {
        notify("Please provide the Instructor's Name, Species, and Location.", "error");
        return;
    }

    const intMod = parseInt(document.getElementById('dt-train-int').value) || 0;
    const hasHarper = document.getElementById('dt-train-harper').checked;
    const travelDays = hasHarper ? (parseInt(document.getElementById('dt-train-travel').value) || 0) : 0;
    const harperLoc = document.getElementById('dt-train-harper-loc').value.trim();

    if (hasHarper && !harperLoc) {
        notify("Please enter the Harper Safe House location.", "error");
        return;
    }

    // Mathematical calculations
    const baseWorkweeks = Math.max(1, 10 - intMod);
    const goldCost = baseWorkweeks * 25; 
    const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
    const effectiveTime = timeWorkweeks * 5;

    const daysSpent = parseInt(document.getElementById('dt-train-days-spent').value) || 1;
    const isComplete = daysSpent >= effectiveTime;
    const totalDaysLogged = daysSpent + travelDays;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDaysLogged) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // --- MATH EXECUTION ---

    // Complication Roll (10% chance per workweek actually spent in this log)
    let complicationText = ``;
    const workweeksSpent = Math.max(1, Math.ceil(daysSpent / 5));
    const risk = Math.min(100, workweeksSpent * 10);
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= risk) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "Your instructor disappears, forcing you to spend one workweek finding a new one.", 
            "Your teacher instructs you in rare, archaic methods, which draw comments from others.", 
            "Your teacher is a spy sent to learn your plans.", 
            "Your teacher is a wanted criminal.", 
            "Your teacher is a cruel taskmaster.", 
            "Your teacher asks for help dealing with a threat."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100 vs ${risk}% Risk)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*No complications arose during your training (${d100}/100).*`;
    }

    // Build the log text
    let resultHeader = `**Objective:** Training (${subject})`;
    let resultBody = isComplete 
        ? `✅ **Training Completed!** You have successfully gained proficiency in **${subject}**.\n*(Be sure to add the proficiency to your character sheet!)*` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days training in **${subject}**. *(Remaining: ${effectiveTime - daysSpent} Days)*`;

    let modifiersNote = "";
    if (hasHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    let costNote = `**Total Project Material Cost:** ${goldCost.toLocaleString()} gp`;
    if (!isComplete) costNote += ` *(Costs must be paid up front when starting a project).*`;

    const noteText = `**Downtime: Training**\n*Hero:* ${pc.name}\n\n${resultHeader}\n**Instructor:** ${instName} (${instSpecies}) at ${instLoc}\n\n**Work Days Logged:** ${daysSpent} Days (+${travelDays} Travel)\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDaysLogged),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime training with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-graduation-cap');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Training progress logged. ${totalDaysLogged} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openTrainingModal = openTrainingModal;
    window.appActions.updateTrainingMath = updateTrainingMath;
    window.appActions.executeTraining = executeTraining;
}
