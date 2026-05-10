import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 7. RELAXATION ---
// ============================================================================

export const openRelaxationModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-sky-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-bed mr-2 text-sky-300"></i> Relaxation</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-relax-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-relax-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-relax-m" onchange="window.updateDayOptions(this.value, 'dt-relax-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-relax-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                                <input type="text" id="dt-relax-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-stone-50 shadow-inner" placeholder="e.g. The Salty Siren Inn">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Lifestyle Maintained</label>
                                <select id="dt-relax-lifestyle" onchange="window.appActions.updateRelaxationMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-sky-700 bg-stone-50 shadow-inner">
                                    <option value="wretched">Wretched (0 gp)</option>
                                    <option value="squalid">Squalid (1 sp/day)</option>
                                    <option value="poor">Poor (2 sp/day)</option>
                                    <option value="modest" selected>Modest (1 gp/day)</option>
                                    <option value="comfortable">Comfortable (2 gp/day)</option>
                                    <option value="wealthy">Wealthy (4 gp/day)</option>
                                    <option value="aristocratic">Aristocratic (10+ gp/day)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mt-4 pt-3 border-t border-[#d4c5a9]">
                            <p id="dt-relax-desc" class="text-[10px] sm:text-xs text-stone-600 leading-snug italic"></p>
                        </div>
                    </div>

                    <!-- Recovery Benefits -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-heart-pulse mr-2 text-red-600"></i> Recovery Benefits</h3>
                    
                    <div id="dt-relax-benefit-group" class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner transition-opacity mb-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Benefit Gained</label>
                                <select id="dt-relax-benefit-type" onchange="window.appActions.updateRelaxationMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm">
                                    <option value="hp">End effect preventing HP regain</option>
                                    <option value="ability">Restore reduced ability score</option>
                                    <option value="other">Other (Describe manually)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Effect Description</label>
                                <input type="text" id="dt-relax-benefit-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-sky-700 bg-white shadow-sm" placeholder="Describe what you recovered from...">
                            </div>
                        </div>
                    </div>
                    
                    <p id="dt-relax-warning" class="hidden text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-sm mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> A Modest lifestyle or better is required to recover from lingering effects.</p>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Estimated Cost</span>
                            <span id="dt-relax-gold-out" class="text-2xl font-black text-amber-500">5 gp</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold/Silver must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeRelaxation()" class="px-5 py-2 bg-blue-900 text-amber-50 rounded-sm hover:bg-blue-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-bed mr-2"></i> Relax & Recover</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateRelaxationMath, 50);
};

export const updateRelaxationMath = () => {
    const lifestyleEl = document.getElementById('dt-relax-lifestyle');
    const benefitTypeEl = document.getElementById('dt-relax-benefit-type');
    const benefitDescEl = document.getElementById('dt-relax-benefit-desc');
    const benefitGroup = document.getElementById('dt-relax-benefit-group');
    const warningEl = document.getElementById('dt-relax-warning');
    const descEl = document.getElementById('dt-relax-desc');
    const goldOut = document.getElementById('dt-relax-gold-out');

    if (!lifestyleEl || !benefitGroup || !goldOut) return;

    const lifestyleData = {
        wretched: { cost: 0, benefit: false, desc: "You live in inhumane conditions, sheltering wherever you can. Violence, disease, and hunger follow you wherever you go." },
        squalid: { cost: 0.1, benefit: false, desc: "You live in a leaky stable or vermin-infested boarding house in the worst part of town, rife with disease and misfortune." },
        poor: { cost: 0.2, benefit: false, desc: "You go without comforts. Simple food and lodgings, threadbare clothing, and unpredictable conditions." },
        modest: { cost: 1, benefit: true, desc: "You live in an older part of town, renting a clean, simple room. You don’t go hungry or thirsty." },
        comfortable: { cost: 2, benefit: true, desc: "You can afford nicer clothing and live in a small cottage or a private room at a fine inn." },
        wealthy: { cost: 4, benefit: true, desc: "You live a life of luxury, with respectable lodgings and a small staff of servants." },
        aristocratic: { cost: 10, benefit: true, desc: "You live a life of plenty and comfort, moving in circles populated by the most powerful people in the community." }
    };

    const choice = lifestyleEl.value;
    const data = lifestyleData[choice];

    descEl.textContent = data.desc;

    // Toggle Benefit Group visibility based on Lifestyle
    if (data.benefit) {
        benefitGroup.classList.remove('opacity-50', 'pointer-events-none');
        warningEl.classList.add('hidden');
    } else {
        benefitGroup.classList.add('opacity-50', 'pointer-events-none');
        warningEl.classList.remove('hidden');
    }

    // Auto-fill description based on benefit dropdown if they haven't explicitly typed "other"
    if (document.activeElement !== benefitDescEl) {
        if (benefitTypeEl.value === 'hp') benefitDescEl.value = "Ending an effect that prevents hit point regeneration.";
        else if (benefitTypeEl.value === 'ability') benefitDescEl.value = "Restoring a drained ability score (e.g., Strength).";
        else if (benefitTypeEl.value === 'other' && (benefitDescEl.value === "Ending an effect that prevents hit point regeneration." || benefitDescEl.value === "Restoring a drained ability score (e.g., Strength).")) {
            benefitDescEl.value = "";
        }
    }

    const totalCost = data.cost * 5;
    let costStr = totalCost < 1 ? `${totalCost * 10} sp` : `${totalCost} gp`;
    if (totalCost === 0) costStr = "0 gp";

    goldOut.textContent = costStr;
};

export const executeRelaxation = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-relax-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const loc = document.getElementById('dt-relax-loc').value.trim();
    if (!loc) {
        notify("Please enter a location.", "error");
        return;
    }

    const lifestyleChoice = document.getElementById('dt-relax-lifestyle').value;
    const effectDesc = document.getElementById('dt-relax-benefit-desc').value.trim();

    const lifestyleData = {
        wretched: { cost: 0, label: "Wretched", benefit: false },
        squalid: { cost: 0.1, label: "Squalid", benefit: false },
        poor: { cost: 0.2, label: "Poor", benefit: false },
        modest: { cost: 1, label: "Modest", benefit: true },
        comfortable: { cost: 2, label: "Comfortable", benefit: true },
        wealthy: { cost: 4, label: "Wealthy", benefit: true },
        aristocratic: { cost: 10, label: "Aristocratic", benefit: true }
    };

    const data = lifestyleData[lifestyleChoice];

    if (data.benefit && !effectDesc) {
        notify("Please describe the effect you are ending, as your lifestyle supports it.", "error");
        return;
    }

    const totalCostNum = data.cost * 5;
    let costStr = totalCostNum < 1 ? `${totalCostNum * 10} sp` : `${totalCostNum} gp`;
    if (totalCostNum === 0) costStr = "0 gp";

    const igY = parseInt(document.getElementById('dt-relax-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-relax-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-relax-d').value, 10) || camp.calendar.currentDay || 1;

    // --- FORMAT RESULTS ---
    let recoveryMessage = ``;
    if (data.benefit && effectDesc) {
        recoveryMessage = `✅ **Recovery Successful!**\nAt the week's end, ${pc.name} recovered from the following effect:\n> *"${effectDesc}"*`;
    } else {
        recoveryMessage = `❌ **No Lingering Effects Cured**\nThis lifestyle was not sufficient to recover from any long-term ailments.`;
    }

    const noteText = `**Downtime: Relaxation**\n*Hero:* ${pc.name}\n\n**Location:** ${loc}\n**Time Spent:** 5 Days\n**Lifestyle Maintained:** ${data.label} (${costStr})\n\n${recoveryMessage}\n\n*(Note: During this week, ${pc.name} also gains advantage on saving throws against long-acting diseases and poisons).*`;

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime relaxing in ${loc} with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-bed');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Relaxation resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- 8. RELIGIOUS SERVICE ---
// ============================================================================

const DEITY_PANTHEONS = {
    "The Faerûnian Pantheon": [
        { name: "Akadi", title: "goddess of air", alignment: "N", domains: "Tempest", temple: "The Azure Spire", service: "Maintaining an ever-burning censer of exotic incense." }, { name: "Amaunator", title: "god of the sun", alignment: "LN", domains: "Life, Light", temple: "The Monastery of the Eternal Sun", service: "Conducting meticulous solar observations and recording prophecies." }, { name: "Asmodeus", title: "god of indulgence", alignment: "LE", domains: "Knowledge, Trickery", temple: "The Ruby Sanctum", service: "Drafting infernal contracts and brokering diabolical deals." }, { name: "Auril", title: "goddess of winter", alignment: "NE", domains: "Nature, Tempest", temple: "The Winter Palace", service: "Carving ice sculptures for a winter festival." }, { name: "Azuth", title: "god of wizardry", alignment: "LN", domains: "Arcana, Knowledge", temple: "The House of the High One", service: "Scribing magical texts in the temple library." }, { name: "Bane", title: "god of tyranny", alignment: "LE", domains: "War", temple: "The Black Bastion", service: "Training temple guards in brutal combat techniques." }, { name: "Beshaba", title: "goddess of misfortune", alignment: "CE", domains: "Trickery", temple: "The House of Ill Fortune", service: "Spreading misfortune by orchestrating 'accidents'." }, { name: "Bhaal", title: "god of murder", alignment: "NE", domains: "Death", temple: "The Court of Murder", service: "Performing secret rites over the remains of the slain." }, { name: "Chauntea", title: "goddess of agriculture", alignment: "NG", domains: "Life", temple: "The Golden Sheaf", service: "Assisting local farmers with planting or harvest." }, { name: "Cyric", title: "god of lies", alignment: "CE", domains: "Trickery", temple: "The Basilica of the Black Sun", service: "Spreading insidious rumors to sow discord." }, { name: "Deneir", title: "god of writing", alignment: "NG", domains: "Arcana, Knowledge", temple: "The Scriptorium of the All-Seeing", service: "Copying rare books and illuminating manuscripts." }, { name: "Eldath", title: "goddess of peace", alignment: "NG", domains: "Life, Nature", temple: "The Quiet Glade", service: "Tending to a sacred grove or waterfall." }, { name: "Gond", title: "god of craft", alignment: "N", domains: "Knowledge", temple: "The House of Wonder", service: "Repairing or inventing new devices in a workshop." }, { name: "Grumbar", title: "god of earth", alignment: "N", domains: "Knowledge", temple: "The Bedrock Maw", service: "Carving new geological maps of the Underdark." }, { name: "Gwaeron Windstrom", title: "god of tracking", alignment: "NG", domains: "Knowledge, Nature", temple: "The Ranger's Rest", service: "Guiding lost travelers or mapping new trails in the wilderness." }, { name: "Helm", title: "god of watchfulness", alignment: "LN", domains: "Life, Light", temple: "The Citadel of the Vigilant", service: "Standing guard over a holy site or relic." }, { name: "Hoar", title: "god of revenge and retribution", alignment: "LN", domains: "War", temple: "The Hall of Just Vengeance", service: "Publicly reading a list of grievances against a known criminal." }, { name: "Ilmater", title: "god of endurance", alignment: "LG", domains: "Life", temple: "The Hospice of the Broken God", service: "Tending to the sick and injured in an infirmary." }, { name: "Istishia", title: "god of water", alignment: "N", domains: "Tempest", temple: "The Grotto of the Wave", service: "Purifying a local well or spring." }, { name: "Jergal", title: "scribe of the dead", alignment: "LN", domains: "Knowledge, Death", temple: "The Mausoleum of the Final Record", service: "Recording the genealogies of the recently deceased." }, { name: "Kelemvor", title: "god of the dead", alignment: "LN", domains: "Death", temple: "The Crystal Spire of Judgment", service: "Performing last rites for the unclaimed dead." }, { name: "Kossuth", title: "god of fire", alignment: "N", domains: "Light", temple: "The Ashen Sanctum", service: "Keeping a sacred bonfire burning through a storm." }, { name: "Lathander", title: "god of dawn and renewal", alignment: "NG", domains: "Life, Light", temple: "The Morninglow Tower", service: "Leading a dawn prayer service for the community." }, { name: "Leira", title: "goddess of illusion", alignment: "CN", domains: "Trickery", temple: "The Hall of Mists", service: "Creating illusions for a local festival or play." }, { name: "Lliira", title: "goddess of joy", alignment: "CG", domains: "Life", temple: "The Pavilion of Joy", service: "Organizing and participating in a joyous celebration." }, { name: "Loviatar", title: "goddess of pain", alignment: "LE", domains: "Death", temple: "The Palace of Pain", service: "Overseeing the ritual self-flagellation of the faithful." }, { name: "Malar", title: "god of the hunt", alignment: "CE", domains: "Nature", temple: "The Savage Den", service: "Leading a ceremonial hunt in the wilderness." }, { name: "Mask", title: "god of thieves", alignment: "CN", domains: "Trickery", temple: "The Shadow Keep", service: "Running a shell game to 'collect' donations for the temple." }, { name: "Mielikki", title: "goddess of forests", alignment: "NG", domains: "Nature", temple: "The Deepwood Shrine", service: "Guiding lost travelers safely out of the woods." }, { name: "Milil", title: "god of poetry and song", alignment: "NG", domains: "Light", temple: "The Conservatory of Song", service: "Composing a new hymn or epic poem for the church." }, { name: "Myrkul", title: "god of death", alignment: "NE", domains: "Death", temple: "The Crypt of the Lord of Bones", service: "Animating skeletons to serve as temple guardians." }, { name: "Mystra", title: "goddess of magic", alignment: "NG", domains: "Arcana, Knowledge", temple: "The House of the Weave", service: "Tutoring young acolytes in the basics of the Weave." }, { name: "Oghma", title: "god of knowledge", alignment: "N", domains: "Knowledge", temple: "The Great Library", service: "Debating philosophy and sharing knowledge with scholars." }, { name: "The Red Knight", title: "goddess of strategy", alignment: "LN", domains: "War", temple: "The Citadel of Strategy", service: "Playing and analyzing war games with temple masters." }, { name: "Savras", title: "god of divination and fate", alignment: "LN", domains: "Arcana, Knowledge", temple: "The Orb of Fates", service: "Performing divinations for common folk." }, { name: "Selûne", title: "goddess of the moon", alignment: "CG", domains: "Knowledge, Life", temple: "The House of the Moon", service: "Guarding against lycanthropes on a full moon." }, { name: "Shar", title: "goddess of darkness and loss", alignment: "NE", domains: "Death, Trickery", temple: "The Cavern of Dark Secrets", service: "Extinguishing lights and spreading despair in secret." }, { name: "Silvanus", title: "god of wild nature", alignment: "N", domains: "Nature", temple: "The Oak Father's Grove", service: "Planting trees and restoring a blighted part of a forest." }, { name: "Sune", title: "goddess of love and beauty", alignment: "CG", domains: "Life, Light", temple: "The Temple of Beauty", service: "Creating a beautiful work of art to adorn the temple." }, { name: "Talona", title: "goddess of poison and disease", alignment: "CE", domains: "Death", temple: "The Poisoned Cup", service: "Concocting new plagues in a hidden laboratory." }, { name: "Talos", title: "god of storms", alignment: "CE", domains: "Tempest", temple: "The Fane of the Stormlord", service: "Calling down lightning to inspire fear and reverence." }, { name: "Tempus", title: "god of war", alignment: "N", domains: "War", temple: "The Hall of Warriors", service: "Presiding over ritual combat between champions." }, { name: "Torm", title: "god of courage and self-sacrifice", alignment: "LG", domains: "War", temple: "The Hall of Justice", service: "Drilling with the local militia to defend the weak." }, { name: "Tymora", title: "goddess of good fortune", alignment: "CG", domains: "Trickery", temple: "The Lady's Hall of Luck", service: "Donating unexpected winnings to the needy." }, { name: "Tyr", title: "god of justice", alignment: "LG", domains: "War", temple: "The Court of the Just God", service: "Acting as an arbiter in a legal dispute for the poor." }, { name: "Umberlee", title: "goddess of the sea", alignment: "CE", domains: "Tempest", temple: "The Queen's Spire", service: "Demanding sacrifices from sailors before a big storm." }, { name: "Valkur", title: "Northlander god of sailors", alignment: "CG", domains: "Tempest, War", temple: "The Great Shiphouse", service: "Repairing sails and rigging for the local fleet." }, { name: "Waukeen", title: "goddess of trade", alignment: "N", domains: "Knowledge, Trickery", temple: "The Gold Chamber", service: "Auditing the temple's finances to ensure profitable returns." }
    ],
    "The Dwarven Pantheon": [
        { name: "Abbathor", title: "god of greed", alignment: "NE", domains: "Trickery", temple: "The Gilded Claw", service: "Salting a depleted mine with fake gemstones to sell it." }, { name: "Berronar Truesilver", title: "goddess of hearth and home", alignment: "LG", domains: "Life, Light", temple: "The Hearth of Home", service: "Officiating a wedding or blessing a new home." }, { name: "Clangeddin Silverbeard", title: "god of war", alignment: "LG", domains: "War", temple: "The Silver Hall", service: "Leading combat drills for young warriors." }, { name: "Deep Duerra", title: "duergar goddess of conquest", alignment: "LE", domains: "Arcana, War", temple: "The Psychic Spire", service: "Leading a telepathic choir to channel psionic energy." }, { name: "Dugmaren Brightmantle", title: "god of discovery", alignment: "CG", domains: "Knowledge", temple: "The Glimmering Grotto", service: "Researching a new form of invention or spell." }, { name: "Dumathoin", title: "god of buried secrets", alignment: "N", domains: "Death, Knowledge", temple: "The Silent Crypt", service: "Guarding a tomb from would-be robbers." }, { name: "Gorm Gulthyn", title: "god of vigilance", alignment: "LG", domains: "War", temple: "The Sentinel's Post", service: "Standing watch at a dangerous outpost." }, { name: "Haela Brightaxe", title: "goddess of war-luck", alignment: "CG", domains: "War", temple: "The Spiraled Blade", service: "Blessing the weapons of warriors before a battle." }, { name: "Laduguer", title: "duergar god of magic and slavery", alignment: "LE", domains: "Arcana, Death", temple: "The Iron Spire", service: "Crafting magic weapons intended for slave masters." }, { name: "Marthammor Duin", title: "god of wanderers", alignment: "NG", domains: "Nature, Trickery", temple: "The Open Road", service: "Helping a lost caravan find its way." }, { name: "Moradin", title: "god of creation", alignment: "LG", domains: "Knowledge", temple: "The Soul Forge", service: "Smithing a ceremonial weapon or piece of armor." }, { name: "Sharindlar", title: "goddess of healing", alignment: "CG", domains: "Life", temple: "The Crystal Grotto", service: "Brewing potions of healing for the community." }, { name: "Vergadain", title: "god of luck and wealth", alignment: "N", domains: "Trickery", temple: "The Merchant's Coin", service: "Appraising gems and jewelry for a local merchant guild." }
    ],
    "The Elven Pantheon": [
        { name: "Aerdrie Faenya", title: "goddess of the sky", alignment: "CG", domains: "Tempest, Trickery", temple: "The Aerie", service: "Tending to giant eagles or other flying mounts." }, { name: "Angharradh", title: "triple goddess of wisdom", alignment: "CG", domains: "Knowledge, Life", temple: "The Trinity Grove", service: "Mediating a dispute between elven families." }, { name: "Corellon Larethian", title: "god of art and magic", alignment: "CG", domains: "Arcana, Light", temple: "The Gilded Lyceum", service: "Creating a masterwork piece of art or arcane calligraphy." }, { name: "Deep Sashelas", title: "god of the sea", alignment: "CG", domains: "Nature, Tempest", temple: "The Coral Spire", service: "Protecting a pod of dolphins from shark hunters." }, { name: "Erevan Ilesere", title: "god of mischief", alignment: "CN", domains: "Trickery", temple: "The Feygrove", service: "Organizing a series of harmless, entertaining pranks for a festival." }, { name: "Fenmarel Mestarine", title: "god of outcasts", alignment: "CN", domains: "Trickery", temple: "The Hidden Clearing", service: "Helping a group of outcasts find a safe place to live." }, { name: "Hanali Celanil", title: "goddess of love and beauty", alignment: "CG", domains: "Life", temple: "The Golden Heart", service: "Acting as a matchmaker for two lonely elves." }, { name: "Labelas Enoreth", title: "god of time", alignment: "CG", domains: "Arcana, Knowledge", temple: "The Sundial Spire", service: "Updating and maintaining the temple's historical records." }, { name: "Rillifane Rallathil", title: "god of nature", alignment: "CG", domains: "Nature", temple: "The Great Oak", service: "Pruning and caring for an ancient, sacred tree." }, { name: "Sehanine Moonbow", title: "goddess of divination", alignment: "CG", domains: "Knowledge", temple: "The Moonlit Arch", service: "Interpreting dreams and omens for the community." }, { name: "Shevarash", title: "god of vengeance", alignment: "CN", domains: "War", temple: "The Black Arrow", service: "Leading a raid against a nearby drow encampment." }, { name: "Solonor Thelandira", title: "god of archery", alignment: "CG", domains: "War", temple: "The Fletcher's Grove", service: "Fletching ceremonial arrows for a competition." }
    ],
    "The Drow Pantheon": [
        { name: "Eilistraee", title: "goddess of song and moonlight", alignment: "CG", domains: "Light, Nature", temple: "The Singing Cave", service: "Leading a midnight dance and song under the full moon." }, { name: "Kiaransalee", title: "goddess of necromancy", alignment: "CE", domains: "Arcana", temple: "The Ossuary of Vengeance", service: "Animating a powerful undead to send against a hated enemy." }, { name: "Lolth", title: "goddess of spiders", alignment: "CE", domains: "Trickery", temple: "The Demonweb Pits", service: "Sacrificing a captured surface-dweller in a ritual." }, { name: "Selvetarm", title: "god of warriors", alignment: "CE", domains: "War", temple: "The Spider's Blade", service: "Fighting to the death in a gladiatorial arena to prove one's worth." }, { name: "Vhaeraun", title: "god of thieves", alignment: "CE", domains: "Trickery", temple: "The Shadowed Hall", service: "Planning a heist against a rival drow house." }
    ],
    "The Halfling Pantheon": [
        { name: "Arvoreen", title: "god of vigilance and war", alignment: "LG", domains: "War", temple: "The Watchful Knoll", service: "Training the local militia in defensive tactics." }, { name: "Brandobaris", title: "god of thievery and adventure", alignment: "N", domains: "Trickery", temple: "The Open Road Tavern", service: "Telling tall tales of adventure to inspire wanderlust." }, { name: "Cyrrollalee", title: "goddess of hearth and home", alignment: "LG", domains: "Life", temple: "The Open Door", service: "Baking bread and pies for a community feast." }, { name: "Sheela Peryroyl", title: "goddess of agriculture and weather", alignment: "N", domains: "Nature, Tempest", temple: "The Green Burrows", service: "Helping local farmers with planting and tending to crops." }, { name: "Urogalan", title: "god of earth and death", alignment: "LN", domains: "Death, Knowledge", temple: "The Silent Mound", service: "Tending to the graves of the village elders." }, { name: "Yondalla", title: "goddess of fertility and protection", alignment: "LG", domains: "Life", temple: "The Bountiful Horn", service: "Blessing the fields and homes of the community." }
    ],
    "The Gnomish Pantheon": [
        { name: "Baervan Wildwanderer", title: "god of woodlands", alignment: "NG", domains: "Nature", temple: "The Raccoon's Burrow", service: "Tending to sick or injured forest animals." }, { name: "Baravar Cloakshadow", title: "god of illusion", alignment: "NG", domains: "Arcana, Trickery", temple: "The Veiled Grotto", service: "Creating illusions for a gnomish festival." }, { name: "Callarduran Smoothhands", title: "god of mining", alignment: "N", domains: "Knowledge, Nature", temple: "The Deepest Mine", service: "Surveying new tunnels for precious gems." }, { name: "Flandal Steelskin", title: "god of metalwork", alignment: "NG", domains: "Knowledge", temple: "The Flaming Forge", service: "Crafting a complex new invention or tool." }, { name: "Gaerdal Ironhand", title: "god of protection", alignment: "LG", domains: "War", temple: "The Iron Band", service: "Forging shields and armor for the community's defenders." }, { name: "Garl Glittergold", title: "god of trickery and gems", alignment: "LG", domains: "Trickery", temple: "The Gemstone Grotto", service: "Cutting and setting a particularly valuable gemstone." }, { name: "Nebelun", title: "god of invention and luck", alignment: "CG", domains: "Knowledge, Trickery", temple: "The Tinkerer's Workshop", service: "Designing a new, bizarre, and questionably useful invention." }, { name: "Segojan Earthcaller", title: "god of earth", alignment: "NG", domains: "Light", temple: "The Glowing Cavern", service: "Tending to a garden of glowing mushrooms." }, { name: "Urdlen", title: "god of greed and murder", alignment: "CE", domains: "Death, War", temple: "The Bloodied Hole", service: "Digging a tunnel to undermine a rival's stronghold." }
    ],
    "The Orc Pantheon": [
        { name: "Bahgtru", title: "god of strength", alignment: "LE", domains: "War", temple: "The Bone Breaker", service: "Winning a bare-knuckle brawl against a larger opponent." }, { name: "Gruumsh", title: "god of storms and war", alignment: "CE", domains: "Tempest, War", temple: "The Unblinking Eye", service: "Leading a raid on a nearby settlement." }, { name: "Ilneval", title: "god of strategy", alignment: "LE", domains: "War", temple: "The Bloodied Blade", service: "Drawing up battle plans for an upcoming raid." }, { name: "Luthic", title: "goddess of fertility and healing", alignment: "LE", domains: "Life, Nature", temple: "The Cave of Life", service: "Overseeing the birth of many orc children." }, { name: "Shargaas", title: "god of stealth and darkness", alignment: "NE", domains: "Trickery", temple: "The Shadowed Den", service: "Scouting enemy territory without being seen." }, { name: "Yurtrus", title: "god of death and disease", alignment: "NE", domains: "Death", temple: "The White Hand", service: "Brewing a virulent plague to unleash upon enemies." }
    ]
};

export const openReligiousServiceModal = () => {
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

    let deityOptionsHtml = '';
    for (const pantheonName in DEITY_PANTHEONS) {
        deityOptionsHtml += `<optgroup label="--- ${pantheonName} ---">`;
        deityOptionsHtml += DEITY_PANTHEONS[pantheonName].map(d => `<option value="${d.name}">${d.name}, ${d.title} (${d.alignment} - ${d.domains})</option>`).join('');
        deityOptionsHtml += `</optgroup>`;
    }
    deityOptionsHtml += `<option value="other">-- Custom / Unlisted Patron --</option>`;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-blue-900 p-4 border-b-4 border-yellow-500 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hands-praying mr-2 text-yellow-400"></i> Religious Service</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Basic Setup -->
                    <div class="grid grid-cols-1 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-relig-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-relig-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-yellow-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-relig-m" onchange="window.updateDayOptions(this.value, 'dt-relig-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-relig-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-yellow-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Patron Deity</label>
                            <select id="dt-relig-deity" onchange="window.appActions.updateReligiousServiceMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner">
                                ${deityOptionsHtml}
                            </select>
                        </div>
                        <div id="dt-relig-custom-group" class="hidden">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Custom Patron Name</label>
                            <input type="text" id="dt-relig-custom-deity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner" placeholder="e.g. My Custom God">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Temple Name</label>
                                <input type="text" id="dt-relig-temple" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner" placeholder="e.g. The Morninglow Tower">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                                <input type="text" id="dt-relig-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Service Performed</label>
                            <input type="text" id="dt-relig-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner" placeholder="What are you doing for the temple?">
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifier</h3>
                    <div class="bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-4 flex flex-col sm:flex-row gap-4">
                        <div class="w-full sm:w-2/3">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Skill to Use</label>
                            <select id="dt-relig-skill" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-sm">
                                <option value="rel">Intelligence (Religion)</option>
                                <option value="per">Charisma (Persuasion)</option>
                            </select>
                        </div>
                        <div class="w-full sm:w-1/3">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-relig-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Live Math Output -->
                    <div class="mt-6 bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Potential Favors</span>
                            <span class="text-xl font-bold text-yellow-500">Up to 2</span>
                        </div>
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                            <span class="text-sm font-bold text-stone-300">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Keep track of any earned favors in your Private Journal.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeReligiousService()" class="px-5 py-2 bg-blue-900 text-amber-50 rounded-sm hover:bg-blue-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hands-praying mr-2"></i> Perform Service</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateReligiousServiceMath, 50);
};

export const updateReligiousServiceMath = () => {
    const deitySelect = document.getElementById('dt-relig-deity');
    const customGroup = document.getElementById('dt-relig-custom-group');
    const templeInput = document.getElementById('dt-relig-temple');
    const descInput = document.getElementById('dt-relig-desc');

    if (!deitySelect || !customGroup || !templeInput || !descInput) return;

    const deityName = deitySelect.value;
    
    if (deityName === 'other') {
        customGroup.classList.remove('hidden');
        if (document.activeElement !== templeInput) templeInput.value = "";
        if (document.activeElement !== descInput) descInput.value = "";
        templeInput.placeholder = "Enter temple name...";
        descInput.placeholder = "Describe the custom service...";
    } else {
        customGroup.classList.add('hidden');
        
        // Find the matching deity to auto-fill the inputs
        const allDeities = Object.values(DEITY_PANTHEONS).flat();
        const deity = allDeities.find(d => d.name === deityName);
        
        if (deity && document.activeElement !== templeInput && document.activeElement !== descInput) {
            templeInput.value = deity.temple;
            descInput.value = deity.service;
        }
    }
};

export const executeReligiousService = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-relig-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    let deityName = document.getElementById('dt-relig-deity').value;
    if (deityName === 'other') deityName = document.getElementById('dt-relig-custom-deity').value.trim();
    
    const temple = document.getElementById('dt-relig-temple').value.trim();
    const loc = document.getElementById('dt-relig-loc').value.trim();
    const desc = document.getElementById('dt-relig-desc').value.trim();

    if (!deityName || !temple || !loc || !desc) {
        notify("Please fill out the Deity, Temple, Location, and Service Description.", "error");
        return;
    }

    const patron = `${deityName} (${temple}, ${loc})`;
    
    const skillVal = document.getElementById('dt-relig-skill').value;
    const skillName = skillVal === 'rel' ? "Religion" : "Persuasion";
    const modifier = parseInt(document.getElementById('dt-relig-mod').value) || 0;

    const igY = parseInt(document.getElementById('dt-relig-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-relig-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-relig-d').value, 10) || camp.calendar.currentDay || 1;

    // --- MATH EXECUTION ---
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + modifier;
    
    let favorsGained = 0;
    if (checkTotal >= 21) favorsGained = 2;
    else if (checkTotal >= 11) favorsGained = 1;

    // Complication Roll (10% flat chance)
    let complicationText = ``;
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= 10) {
        const d6 = Math.floor(Math.random() * 6) + 1;
        const compTable = [
            "You have offended a priest through your words or actions.", 
            "Blasphemy is still blasphemy, even if you did it by accident.", 
            "A secret sect in the temple offers you membership.", 
            "Another temple tries to recruit you as a spy.", 
            "The temple elders implore you to take up a holy quest.", 
            "You accidentally discover that an important person in the temple is a fiend worshiper."
        ];
        complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
    } else {
        complicationText = `\n\n*Your service proceeds without incident.*`;
    }

    let resultBody = ``;
    if (favorsGained > 0) {
        resultBody = `✅ **Favor Gained!**\nYou earned **${favorsGained} Favor(s)** from ${patron}.\n\n*(Be sure to record these favors in your hero's Private Journal so you don't forget to call them in!)*`;
    } else {
        resultBody = `❌ **No Favor Gained**\nYour efforts failed to make a lasting impression on the temple leadership, and you gain no new favors.`;
    }

    const noteText = `**Downtime: Religious Service**\n*Hero:* ${pc.name}\n\n**Patron:** ${patron}\n**Service:** *${desc}*\n**Time Spent:** 5 Days\n\n**${skillName} Check:** ${checkTotal} (Rolled ${d20} ${modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`})\n\n${resultBody}${complicationText}`;

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

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime performing religious service with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hands-praying');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Religious Service resolved and logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openRelaxationModal = openRelaxationModal;
    window.appActions.updateRelaxationMath = updateRelaxationMath;
    window.appActions.executeRelaxation = executeRelaxation;
    
    window.appActions.openReligiousServiceModal = openReligiousServiceModal;
    window.appActions.updateReligiousServiceMath = updateReligiousServiceMath;
    window.appActions.executeReligiousService = executeReligiousService;
}
