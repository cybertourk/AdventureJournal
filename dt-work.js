import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 13. WORK ---
// ============================================================================

const WORK_EXAMPLES = {
    "Strength (Athletics)": "e.g., Bouncer, Laborer, Guard, Porter",
    "Dexterity (Acrobatics)": "e.g., Acrobat, Tumbler, Daredevil",
    "Charisma (Performance)": "e.g., Storyteller, Orator, Actor",
    "Alchemist's Supplies": "e.g., Apothecary's Assistant, Potion Brewer",
    "Brewer's Supplies": "e.g., Tavern Brewer, Distillery Worker",
    "Calligrapher's Supplies": "e.g., Scribe, Forger of Documents",
    "Carpenter's Tools": "e.g., Shipwright, General Construction",
    "Cartographer's Tools": "e.g., Map Maker, Surveyor's Assistant",
    "Cobbler's Tools": "e.g., Shoemaker, Leather Repair",
    "Cook's Utensils": "e.g., Tavern Chef, Baker",
    "Glassblower's Tools": "e.g., Bottle Maker, Artisan Glazier",
    "Jeweler's Tools": "e.g., Gem Cutter, Fine Jeweler",
    "Leatherworker's Tools": "e.g., Tanner, Armor Repair",
    "Mason's Tools": "e.g., Stoneworker, Sculptor's Apprentice",
    "Painter's Supplies": "e.g., Portrait Artist, House Painter",
    "Potter's Tools": "e.g., Clay Worker, Kiln Operator",
    "Smith's Tools": "e.g., Blacksmith, Farrier, Armorer",
    "Tinker's Tools": "e.g., General Repairs, Gadget Maker",
    "Weaver's Tools": "e.g., Tailor, Sailmaker",
    "Woodcarver's Tools": "e.g., Furniture Maker, Whittler",
    "Disguise Kit": "e.g., Master of Disguise for a noble, Spy work",
    "Forgery Kit": "e.g., Document Copier, Forger for hire",
    "Herbalism Kit": "e.g., Herbalist, Forager, Poultice Maker",
    "Navigator's Tools": "e.g., Ship Navigator, Cartographer's Aide",
    "Poisoner's Kit": "e.g., Rat Catcher, Alchemical Assistant",
    "Thieves' Tools": "e.g., Locksmith, Trap Specialist",
    "Land Vehicles": "e.g., Caravan Guard, Teamster",
    "Water Vehicles": "e.g., Sailor, Ferryman",
    "Air Vehicles": "e.g., Airship Crew, Gryphon Tamer",
    "Space Vehicles": "e.g., Spelljammer Crew",
    "Bagpipes": "e.g., Town Piper, Ceremonial Musician",
    "Drum": "e.g., Marching Band, Tavern Performer",
    "Dulcimer": "e.g., Court Musician, Minstrel",
    "Flute": "e.g., Private Tutor, Solo Performer",
    "Lute": "e.g., Tavern Bard, Noble's Entertainment",
    "Lyre": "e.g., Temple Musician, Poet's Accompanist",
    "Horn": "e.g., Town Crier's Herald, Hunting Horn Blower",
    "Pan Flute": "e.g., Street Performer, Feywild Entertainer",
    "Shawm": "e.g., Festival Musician, Outdoor Performer",
    "Viol": "e.g., Chamber Musician, Somber Balladeer"
};

export const openWorkModal = () => {
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
                
                <div class="bg-stone-900 p-4 border-b-4 border-orange-700 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-briefcase mr-2 text-orange-500"></i> Work</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <p class="text-xs text-stone-600 italic mb-5 leading-snug">Spend <b>1 workweek (5 days)</b> performing a job. Make an ability check to determine your earnings and lifestyle coverage.</p>

                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-work-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-inner">
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
                            <input type="number" id="dt-work-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-work-m" onchange="window.updateDayOptions(this.value, 'dt-work-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-work-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-orange-700 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Job Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Skill / Tool Used</label>
                                <select id="dt-work-skill-name" onchange="window.appActions.updateWorkMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner">
                                    <optgroup label="Core Skills">
                                        <option value="Strength (Athletics)">Strength (Athletics)</option>
                                        <option value="Dexterity (Acrobatics)">Dexterity (Acrobatics)</option>
                                        <option value="Charisma (Performance)">Charisma (Performance)</option>
                                    </optgroup>
                                    <optgroup label="Artisan's Tools">
                                        <option value="Alchemist's Supplies">Alchemist's Supplies</option>
                                        <option value="Brewer's Supplies">Brewer's Supplies</option>
                                        <option value="Calligrapher's Supplies">Calligrapher's Supplies</option>
                                        <option value="Carpenter's Tools">Carpenter's Tools</option>
                                        <option value="Cartographer's Tools">Cartographer's Tools</option>
                                        <option value="Cobbler's Tools">Cobbler's Tools</option>
                                        <option value="Cook's Utensils">Cook's Utensils</option>
                                        <option value="Glassblower's Tools">Glassblower's Tools</option>
                                        <option value="Jeweler's Tools">Jeweler's Tools</option>
                                        <option value="Leatherworker's Tools">Leatherworker's Tools</option>
                                        <option value="Mason's Tools">Mason's Tools</option>
                                        <option value="Painter's Supplies">Painter's Supplies</option>
                                        <option value="Potter's Tools">Potter's Tools</option>
                                        <option value="Smith's Tools">Smith's Tools</option>
                                        <option value="Tinker's Tools">Tinker's Tools</option>
                                        <option value="Weaver's Tools">Weaver's Tools</option>
                                        <option value="Woodcarver's Tools">Woodcarver's Tools</option>
                                    </optgroup>
                                    <optgroup label="Other Tools & Kits">
                                        <option value="Disguise Kit">Disguise Kit</option>
                                        <option value="Forgery Kit">Forgery Kit</option>
                                        <option value="Herbalism Kit">Herbalism Kit</option>
                                        <option value="Navigator's Tools">Navigator's Tools</option>
                                        <option value="Poisoner's Kit">Poisoner's Kit</option>
                                        <option value="Thieves' Tools">Thieves' Tools</option>
                                    </optgroup>
                                    <optgroup label="Vehicles">
                                        <option value="Land Vehicles">Land Vehicles</option>
                                        <option value="Water Vehicles">Water Vehicles</option>
                                        <option value="Air Vehicles">Air Vehicles</option>
                                        <option value="Space Vehicles">Space Vehicles</option>
                                    </optgroup>
                                    <optgroup label="Musical Instruments">
                                        <option value="Bagpipes">Bagpipes</option>
                                        <option value="Drum">Drum</option>
                                        <option value="Dulcimer">Dulcimer</option>
                                        <option value="Flute">Flute</option>
                                        <option value="Lute">Lute</option>
                                        <option value="Lyre">Lyre</option>
                                        <option value="Horn">Horn</option>
                                        <option value="Pan Flute">Pan Flute</option>
                                        <option value="Shawm">Shawm</option>
                                        <option value="Viol">Viol</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type of Work</label>
                                <input type="text" id="dt-work-type" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g., Bouncer, Laborer, Guard, Porter">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Workplace</label>
                                <input type="text" id="dt-work-workplace" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. The Yawning Portal">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location (City/Town)</label>
                                <input type="text" id="dt-work-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                            </div>
                            <div class="flex items-end pb-2">
                                <label class="flex items-center gap-2 cursor-pointer group" title="Check this if a rival is present. It may affect complications.">
                                    <input type="checkbox" id="dt-work-rival" class="w-4 h-4 text-orange-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                    <span class="text-[10px] font-bold uppercase tracking-widest text-stone-700 group-hover:text-orange-900 transition">Rival Present?</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Notes (Optional)</label>
                            <input type="text" id="dt-work-notes" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-stone-50 shadow-inner" placeholder="Any special context for this job...">
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifier</h3>
                    <div class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-4 flex gap-4 items-center">
                        <div class="flex-grow">
                            <p class="text-[10px] text-stone-500 italic leading-snug">Enter your total modifier for the check. Typically, manual labor uses Athletics, acrobatics uses Acrobatics, and entertaining uses Performance or a Musical Instrument. Crafting items uses Artisan's Tools.</p>
                        </div>
                        <div class="w-1/3 shrink-0">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest text-center">Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-work-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-orange-700 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Potential Wages <span class="text-[9px] text-stone-500 font-normal lowercase tracking-normal">(Based on Check)</span></span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-bold">
                                <span class="text-stone-400" title="Roll 9 or lower"><i class="fa-solid fa-arrow-down mr-1"></i> < 10 : <span class="text-amber-500 ml-1">Poor (or 1 gp)</span></span>
                                <span class="text-stone-300" title="Roll 10 to 14"><i class="fa-solid fa-minus mr-1"></i> 10-14 : <span class="text-amber-500 ml-1">Modest (or 5 gp)</span></span>
                                <span class="text-emerald-400" title="Roll 15 to 20"><i class="fa-solid fa-arrow-up mr-1"></i> 15-20 : <span class="text-amber-500 ml-1">Comfortable (or 10 gp)</span></span>
                                <span class="text-amber-400" title="Roll 21 or higher"><i class="fa-solid fa-star mr-1"></i> 21+ : <span class="text-amber-500 ml-1">Comfortable + 25 gp</span></span>
                            </div>
                        </div>
                        <div class="sm:text-right border-t sm:border-t-0 sm:border-l-2 border-stone-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-end shrink-0">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Required</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be added to your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeWork()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-briefcase mr-2"></i> Work for a Week</button>
                </div>
            </div>
        </div>
    `;

    // Initialize math and placeholders
    setTimeout(() => {
        window.appActions.updateWorkMath();
    }, 50);
};

export const updateWorkMath = () => {
    const skillName = document.getElementById('dt-work-skill-name')?.value;
    const workTypeEl = document.getElementById('dt-work-type');
    
    if (skillName && workTypeEl && WORK_EXAMPLES[skillName]) {
        workTypeEl.placeholder = WORK_EXAMPLES[skillName];
    }
};

export const executeWork = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-work-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const workType = document.getElementById('dt-work-type').value.trim();
    const skillName = document.getElementById('dt-work-skill-name').value;
    const workplace = document.getElementById('dt-work-workplace').value.trim();
    const loc = document.getElementById('dt-work-loc').value.trim();
    const notes = document.getElementById('dt-work-notes').value.trim();
    const isRival = document.getElementById('dt-work-rival').checked;

    if (!workType || !workplace || !loc || !skillName) {
        notify("Please enter the Type of Work, Skill Used, Workplace, and Location.", "error");
        return;
    }

    const modifier = parseInt(document.getElementById('dt-work-mod').value) || 0;

    const igY = parseInt(document.getElementById('dt-work-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-work-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-work-d').value, 10) || camp.calendar.currentDay || 1;

    // --- MATH EXECUTION ---
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + modifier;

    let lifestyleText = "";
    let cashValue = 0;

    if (checkTotal <= 9) {
        lifestyleText = "a **Poor lifestyle** for the week";
        cashValue = 1; 
    } else if (checkTotal <= 14) {
        lifestyleText = "a **Modest lifestyle** for the week";
        cashValue = 5; 
    } else if (checkTotal <= 20) {
        lifestyleText = "a **Comfortable lifestyle** for the week";
        cashValue = 10; 
    } else {
        lifestyleText = "a **Comfortable lifestyle** for the week, plus an extra 25 gp";
        cashValue = 35; 
    }

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            `A difficult customer or a fight with a coworker reduces the wages you earn by one category.${isRival ? " (The customer/coworker was provoked by your rival)." : ""}`,
            `Your employer’s financial difficulties result in your not being paid.${isRival ? " (Your rival sabotaged their business)." : ""}`,
            `A coworker with ties to an important family in town takes a dislike to you.${isRival ? " (They are an associate of your rival)." : ""}`,
            "Your employer is involved with a dark cult or a criminal enterprise.",
            `A crime ring targets your business for extortion.${isRival ? " (Hired by your rival)." : ""}`,
            `You gain a reputation for laziness (unjustified or not, as you choose), giving you disadvantage on checks made for this downtime activity for the next six workweeks you devote to it.${isRival ? " (Your rival started these rumors)." : ""}`
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your work week passes uneventfully.*`;
    }

    const resultHeader = `**Objective:** Working as a ${workType}`;
    
    let resultBody = `**Wages Earned:**\nYour work was sufficient to cover ${lifestyleText}.\n\n*Alternatively, you can collect your pay as **${cashValue} gp**.*\n*(Remember to handle lifestyle costs or add the gold to your sheet manually.)*`;
    
    if (notes) {
        resultBody = `*Notes: ${notes}*\n\n` + resultBody;
    }

    const noteText = `**Downtime: Work**\n*Hero:* ${pc.name}\n\n${resultHeader}\n**Location:** ${workplace} in ${loc}\n**Time Spent:** 5 Days\n\n**${skillName} Check:** ${checkTotal} (Rolled ${d20} ${modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`})\n\n${resultBody}${complicationText}`;

    // --- SAVE TO CALENDAR ---
    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: 5, repeatsYearly: false, category: 'Downtime'
    };

    let updatedCamp = { ...camp };
    if (!updatedCamp.calendar) updatedCamp.calendar = {};
    if (!updatedCamp.calendar.notes) updatedCamp.calendar.notes = {};
    
    let dayNotes = updatedCamp.calendar.notes[dateKey];
    if (dayNotes && !Array.isArray(dayNotes)) {
        dayNotes = [{ id: generateId(), text: dayNotes.text, visibility: dayNotes.visibility, authorId: updatedCamp.dmId, category: 'Misc' }];
    }
    if (!dayNotes) dayNotes = [];

    dayNotes.push(newNote);
    updatedCamp.calendar.notes[dateKey] = dayNotes;

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime working in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-briefcase');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Work resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openWorkModal = openWorkModal;
    window.appActions.updateWorkMath = updateWorkMath;
    window.appActions.executeWork = executeWork;
}
