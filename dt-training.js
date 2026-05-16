import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 12. TRAINING ---
// ============================================================================

const TRAINING_SUBJECTS = {
    languages: {
        common: { common: "Common", dwarvish: "Dwarvish", elvish: "Elvish", giant: "Giant", gnomish: "Gnomish", goblin: "Goblin", halfling: "Halfling", orc: "Orc" },
        exotic: { aarakocra: "Aarakocra", abyssal: "Abyssal", celestial: "Celestial", draconic: "Draconic", deep: "Deep Speech", infernal: "Infernal", primordial: "Primordial", sylvan: "Sylvan", undercommon: "Undercommon", auran: "Auran", aquan: "Aquan", ignan: "Ignan", terran: "Terran", gith: "Gith", gnoll: "Gnoll" },
        rare: { grippli: "Grippli", aartuk: "Aartuk", abanasinian: "Abanasinian", aklo: "Aklo", angulotl: "Angulotl", ankeshelian: "Ankeshelian", birdfolk: "Birdfolk", blackSpeech: "Black Speech", blinkDog: "Blink Dog", bothii: "Bothii", bullywug: "Bullywug", caligni: "Caligni", capran: "Capran", cervan: "Cervan", citlanes: "Citlanés", daelkyr: "Daelkyr", daemonic: "Daemonic", dalish: "Dalish", dara: "Dara", darakhul: "Darakhul", demodand: "Demodand", derro: "Derro", djaynaian: "Djaynaian", dohwar: "Dohwar", dunlendish: "Dunlendish", eluran: "Eluran", eonic: "Eonic", ergot: "Ergot", erina: "Erina", featherSpeech: "Feather Speech", giantEagle: "Giant Eagle", giantElk: "Giant Elk", giantOwl: "Giant Owl", gibberling: "Gibberling", godstongue: "Godstongue", grell: "Grell", grung: "Grung", hadozee: "Hadozee", halri: "Halri", hedge: "Hedge", hookHorror: "Howler", huginnsspeech: "Huginn's Speech", iceToad: "Ice Toad", istarian: "Istarian", ixitxachitl: "Ixitxachitl", jerbeen: "Jerbeen", kenderspeak: "Kenderspeak", kharolian: "Kharolian", khur: "Khur", khuzdul: "Khuzdul", kothian: "Kothian", kraul: "Kraul", kruthik: "Kruthik", kuranzoi: "Kuran'zoi", lemurfolk: "Lemurfolk", leonin: "Leonin", loxodan: "Loxodan", mapach: "Mapach", marquesian: "Marquesian", maynah: "Maynah", millitaur: "Millitaur", minotaur: "Minotaur", modron: "Modron", nakuNaku: "Naku Naku", naush: "Naush", necril: "Necril", nerakese: "Nerakese", netherese: "Netherese", nordmaarian: "Nordmaarian", northernTongue: "Northern Tongue", nwarian: "N'warian", ogre: "Ogre", olman: "Olman", orkish: "Orkish", otyugh: "Otyugh", quirapu: "Quirapu", quori: "Quori", ravenfolk: "Ravenfolk", riedran: "Riedran", sahuagin: "Sahuagin", sensan: "Sensan", shankhi: "Shankhi", sindarin: "Sindarin", skitterwidget: "Skitterwidget", slaad: "Slaad", solamnic: "Solamnic", sphinx: "Sphinx", swallybog: "Swallybog", telepathy: "Telepathy", thayan: "Thayan", thriKreen: "Thri-kreen", tilia: "Tilia", tletlahtolli: "Tletlahtolli", tlincalli: "Tlincalli", torum: "Torum", tosculi: "Tosculi", troglodyte: "Troglodyte", trollkin: "Trollkin", umberHulk: "Umber Hulk", umbral: "Umbral", varisian: "Varisian", vedalken: "Vedalken", vegepygmy: "Vegepygmy", voidSpeech: "Void Speech", vulpin: "Vulpin", wargSpeech: "Warg-speech", westron: "Westron", winterWolf: "Winter Wolf", worg: "Worg", xingyu: "Xingyu", yeti: "Yeti", yikaria: "Yikaria", zabaani: "Zabaani", zemnian: "Zemnian", ziklight: "Ziklight" }
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

                    <!-- Core Configuration -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-train-pc" onchange="window.appActions.updateTrainingMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-fuchsia-800 font-bold mb-1 tracking-widest"><i class="fa-solid fa-book-open mr-1"></i> Active Studies</label>
                            <div class="flex gap-2">
                                <select id="dt-train-project" onchange="window.appActions.updateTrainingMath('project')" class="flex-grow p-2 border border-fuchsia-300 rounded-sm text-sm font-bold text-fuchsia-900 outline-none focus:border-fuchsia-600 bg-fuchsia-50 shadow-inner">
                                    <option value="new">-- Start New Study --</option>
                                    <!-- Populated dynamically via JS -->
                                </select>
                                <button type="button" id="dt-train-abandon-btn" onclick="window.appActions.abandonTrainingProject()" class="hidden px-3 py-2 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 rounded-sm transition" title="Abandon Study"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- New Project Fields (Hidden if resuming) -->
                    <div id="dt-train-new-config" class="mb-5 bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm transition-all duration-300">
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 border-b border-[#d4c5a9] pb-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Intelligence Modifier</label>
                                <div class="flex items-center">
                                    <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                    <input type="number" id="dt-train-int" value="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner text-center">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Subject of Study</label>
                                <select id="dt-train-subject" onchange="const c = document.getElementById('dt-train-custom'); if(this.value === 'custom') c.classList.remove('hidden'); else c.classList.add('hidden');" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner">
                                    ${buildSubjectOptions()}
                                </select>
                                <input type="text" id="dt-train-custom" class="hidden w-full p-2 mt-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Sylvan, Herbalism Kit...">
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="text-[10px] uppercase text-stone-500 font-bold tracking-widest"><i class="fa-solid fa-user-graduate mr-1 text-fuchsia-700"></i> Instructor Details</h4>
                                <button type="button" class="text-[9px] uppercase tracking-wider font-bold text-fuchsia-600 hover:text-fuchsia-800 transition flex items-center bg-fuchsia-50 border border-fuchsia-200 px-2 py-1 rounded-sm shadow-sm" onclick="
                                    const f=['Elara','Tharivol','Korrin','Vondal','Seraphina','Garrick','Lyra','Bran','Kaelen','Sylas','Mira','Rurik','Ander','Kithri','Eldon'];
                                    const l=['Swiftbrook','Ironfist','Moonwhisper','Starbreeze','Stormrider','Ashdown','Oakenheel','Brightwood','Frostbeard','Shadowstep'];
                                    const s=['Elf','Dwarf','Human','Halfling','Dragonborn','Tiefling','Gnome','Half-Orc','Half-Elf','Tabaxi'];
                                    document.getElementById('dt-train-inst-name').value = f[Math.floor(Math.random()*f.length)] + ' ' + l[Math.floor(Math.random()*l.length)];
                                    document.getElementById('dt-train-inst-species').value = s[Math.floor(Math.random()*s.length)];
                                "><i class="fa-solid fa-dice mr-1"></i> Auto-Fill</button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div class="col-span-1 sm:col-span-2">
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Name</label>
                                    <input type="text" id="dt-train-inst-name" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elara">
                                </div>
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Species</label>
                                    <input type="text" id="dt-train-inst-species" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Elf">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label class="block text-[9px] uppercase text-stone-400 font-bold mb-1">Location</label>
                                    <input type="text" id="dt-train-inst-loc" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 bg-stone-50 shadow-inner" placeholder="e.g. Waterdeep">
                                </div>
                                <div class="flex items-end pb-1.5">
                                    <label class="flex items-center gap-2 cursor-pointer group" title="Check this if a rival is present. It may affect complications.">
                                        <input type="checkbox" id="dt-train-rival" class="w-4 h-4 text-fuchsia-700 rounded-sm cursor-pointer shadow-sm border-stone-400">
                                        <span class="text-[10px] font-bold uppercase tracking-widest text-stone-700 group-hover:text-fuchsia-900 transition">Rival Involved?</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm mt-4">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-train-harper" onchange="document.getElementById('dt-train-harper-details').classList.toggle('hidden'); window.appActions.updateTrainingMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                            </label>
                            <p class="text-[9px] text-blue-700 italic leading-snug">The Harpers' network reduces training time by two workweeks (does not reduce gold cost). Requires travel to a safe house.</p>
                        </div>
                        <div id="dt-train-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                                <input type="text" id="dt-train-harper-loc" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                                <input type="number" id="dt-train-travel" value="0" min="0" oninput="window.appActions.updateTrainingMath()" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-fuchsia-700 shadow-inner bg-stone-50 text-center">
                            </div>
                        </div>

                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <div>
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Scope</span>
                                <span id="dt-train-progress-text" class="text-xs font-bold text-amber-200">0 / 0 Days Complete</span>
                            </div>
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
                                <span id="dt-train-risk" class="text-sm sm:text-base font-bold text-red-500">10%</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">(Evaluated on completion)</p>
                            </div>
                        </div>
                    </div>
                    <p id="dt-train-cost-warning" class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-train-submit-btn" onclick="window.appActions.executeTraining()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-graduation-cap mr-2"></i> Log Training</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.appActions.updateTrainingMath('init');
    }, 50);
};

export const updateTrainingMath = (triggerSource = 'input') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-train-pc')?.value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectSelect = document.getElementById('dt-train-project');
    const newConfigDiv = document.getElementById('dt-train-new-config');
    const abandonBtn = document.getElementById('dt-train-abandon-btn');

    // --- AUTO-CALCULATE MODIFIER ---
    if (pc && (triggerSource === 'pc' || triggerSource === 'init')) {
        const getAbilityMod = (score) => Math.floor(((parseInt(score) || 10) - 10) / 2);
        const intMod = getAbilityMod(pc.int);
        
        const intModEl = document.getElementById('dt-train-int');
        if (intModEl) intModEl.value = intMod;
    }

    // UNLOCK FIELDS IF SWITCHING HEROES OR MANUALLY STARTING A NEW STUDY
    if (triggerSource === 'init' || triggerSource === 'project' || triggerSource === 'pc') {
        const intModEl = document.getElementById('dt-train-int');
        if (intModEl) {
            intModEl.disabled = false;
            intModEl.classList.remove('bg-stone-200', 'text-stone-500');
            intModEl.classList.add('bg-stone-50', 'text-stone-900');
        }
    }

    // Rebuild Projects List if PC changed
    const projects = pc.trainingProjects || {};
    if (triggerSource === 'pc' || triggerSource === 'init') {
        let projHtml = `<option value="new">-- Start New Study --</option>`;
        Object.entries(projects).forEach(([pid, proj]) => {
            projHtml += `<option value="${pid}">${proj.subject} - ${proj.progress}/${proj.totalTime} days</option>`;
        });
        if (projectSelect) projectSelect.innerHTML = projHtml;
    }

    const projectId = projectSelect?.value || 'new';
    const isResuming = projectId !== 'new';

    // Toggle New vs Resume modes
    if (isResuming) {
        if (newConfigDiv) newConfigDiv.classList.add('hidden');
        if (abandonBtn) abandonBtn.classList.remove('hidden');
        const warning = document.getElementById('dt-train-cost-warning');
        if (warning) warning.textContent = "Note: Materials cost was paid when this training began.";
    } else {
        if (newConfigDiv) newConfigDiv.classList.remove('hidden');
        if (abandonBtn) abandonBtn.classList.add('hidden');
        const warning = document.getElementById('dt-train-cost-warning');
        if (warning) warning.textContent = "Note: Material cost must be paid up front when starting.";
    }

    // --- MATH CALCULATION ---
    let totalTime = 0;
    let totalCost = 0;
    let currentProgress = 0;

    if (isResuming) {
        const proj = projects[projectId];
        totalTime = proj.totalTime;
        totalCost = proj.cost;
        currentProgress = proj.progress;
    } else {
        const intMod = parseInt(document.getElementById('dt-train-int')?.value) || 0;
        const hasHarper = document.getElementById('dt-train-harper')?.checked || false;
        
        const baseWorkweeks = Math.max(1, 10 - intMod);
        totalCost = baseWorkweeks * 25; // Gold is based strictly on the un-Harper-modified time!
        
        const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
        totalTime = timeWorkweeks * 5;
    }

    const workRemaining = totalTime - currentProgress;

    // Update Totals UI
    const totalDaysOut = document.getElementById('dt-train-total-days');
    const totalGoldOut = document.getElementById('dt-train-total-gold');
    const progressOut = document.getElementById('dt-train-progress-text');
    
    if (totalDaysOut) totalDaysOut.textContent = `${totalTime} Day${totalTime !== 1 ? 's' : ''}`;
    if (totalGoldOut) totalGoldOut.textContent = `${totalCost.toLocaleString()} gp`;
    if (progressOut) progressOut.textContent = `${currentProgress} / ${totalTime} Days Complete`;

    // Process "Days Spent" Input
    const daysSpentEl = document.getElementById('dt-train-days-spent');
    if (!daysSpentEl) return;

    let daysSpent = parseInt(daysSpentEl.value) || 1;
    if (daysSpent > workRemaining) {
        daysSpent = workRemaining;
        daysSpentEl.value = workRemaining;
    }

    // Complication Risk UI Update (10% per 50 days (10 workweeks) of total project time, evaluated ON COMPLETION)
    const riskEl = document.getElementById('dt-train-risk');
    const willComplete = (currentProgress + daysSpent) >= totalTime;

    if (riskEl) {
        const totalWorkweeks = Math.ceil(totalTime / 5);
        const numChecks = Math.floor(totalWorkweeks / 10);
        
        if (numChecks > 0) {
            riskEl.textContent = willComplete ? `10% (x${numChecks} Checks)` : `${numChecks * 10}% Overall`;
            riskEl.className = "text-sm sm:text-base font-bold text-red-500";
        } else {
            riskEl.textContent = "0% (Too fast)";
            riskEl.className = "text-sm sm:text-base font-bold text-stone-500";
        }
    }

    // Button Toggle
    const submitBtn = document.getElementById('dt-train-submit-btn');
    if (submitBtn) {
        if (willComplete) {
            submitBtn.innerHTML = `<i class="fa-solid fa-graduation-cap mr-2"></i> Complete Training`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-book-reader mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const abandonTrainingProject = async () => {
    const projectId = document.getElementById('dt-train-project')?.value;
    if (projectId === 'new' || !projectId) return;

    if (!confirm("Are you sure you want to permanently abandon this training? The gold spent will be lost.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pcId = document.getElementById('dt-train-pc').value;
    
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId && p.trainingProjects) {
            const newProjects = { ...p.trainingProjects };
            delete newProjects[projectId];
            return { ...p, trainingProjects: newProjects };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    notify("Training abandoned.", "success");
    
    window.appActions.updateTrainingMath('init');
};

export const executeTraining = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-train-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const projectId = document.getElementById('dt-train-project').value;
    const isResuming = projectId !== 'new';
    
    let projectData = {};
    const isRival = document.getElementById('dt-train-rival')?.checked;

    if (isResuming) {
        projectData = JSON.parse(JSON.stringify(pc.trainingProjects[projectId]));
    } else {
        // --- GATHER NEW PROJECT DATA ---
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

        const baseWorkweeks = Math.max(1, 10 - intMod);
        const goldCost = baseWorkweeks * 25; 
        const timeWorkweeks = Math.max(1, baseWorkweeks - (hasHarper ? 2 : 0));
        const effectiveTime = timeWorkweeks * 5;

        projectData = {
            id: generateId(),
            subject: subject,
            totalTime: effectiveTime,
            cost: goldCost,
            progress: 0,
            trainerName: instName,
            trainerLocation: instLoc,
            trainerSpecies: instSpecies,
            harperSupport: hasHarper,
            harperLocation: harperLoc,
            travelDays: travelDays,
            rivalInvolved: isRival
        };
    }

    const daysSpent = parseInt(document.getElementById('dt-train-days-spent').value) || 1;
    const isComplete = (projectData.progress + daysSpent) >= projectData.totalTime;
    const totalDaysLogged = daysSpent + (!isResuming ? projectData.travelDays : 0);

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDaysLogged) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    // --- APPLY MATH & COMPLICATIONS ---
    projectData.progress += isComplete ? (projectData.totalTime - projectData.progress) : daysSpent;

    let complicationText = ``;
    
    // Official Rule: Check 10% chance for EVERY 10 workweeks (50 days) of total project time, upon completion
    if (isComplete) {
        const totalWorkweeks = Math.ceil(projectData.totalTime / 5);
        const numChecks = Math.floor(totalWorkweeks / 10);
        
        if (numChecks > 0) {
            let hasComplication = false;
            let rollLog = [];
            
            for (let i = 0; i < numChecks; i++) {
                const roll = Math.floor(Math.random() * 100) + 1;
                rollLog.push(roll);
                if (roll <= 10) {
                    hasComplication = true;
                    break; // Only trigger one complication per project maximum
                }
            }

            if (hasComplication) {
                const d6 = Math.floor(Math.random() * 6) + 1;
                const compTable = [
                    `Your instructor disappears, forcing you to spend one workweek finding a new one.${projectData.rivalInvolved ? " (Your rival ran them out of town)." : ""}`, 
                    "Your teacher instructs you in rare, archaic methods, which draw comments from others.", 
                    `Your teacher is a spy sent to learn your plans.${projectData.rivalInvolved ? " (Working for your rival)." : ""}`, 
                    "Your teacher is a wanted criminal.", 
                    "Your teacher is a cruel taskmaster.", 
                    "Your teacher asks for help dealing with a threat."
                ];
                complicationText = `\n\n**⚠️ Complication Occurred!**\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
            } else {
                complicationText = `\n\n*No complications arose during your training.*`;
            }
        } else {
            complicationText = `\n\n*Your training completed quickly enough to avoid complications.*`;
        }
    }

    // --- DDB SYNC TASKS ---
    let newTasks = [];
    if (!isResuming && projectData.cost > 0) {
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Deduct ${projectData.cost.toLocaleString()} gp for training materials.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
    }
    if (isComplete) {
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Add proficiency in ${projectData.subject}.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
    }

    // Build the log text
    let resultHeader = `**Objective:** Training (${projectData.subject})`;
    let resultBody = isComplete 
        ? `✅ **Training Completed!** You have successfully gained proficiency in **${projectData.subject}**.\n*(Be sure to add the proficiency to your character sheet!)*` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days training in **${projectData.subject}**. *(Remaining: ${projectData.totalTime - projectData.progress} Days)*`;

    let modifiersNote = "";
    if (projectData.harperSupport) modifiersNote += `\n*Silver Harbingers support was utilized${projectData.harperLocation ? ` at ${projectData.harperLocation}` : ''}.*`;

    let costNote = `**Total Project Material Cost:** ${projectData.cost.toLocaleString()} gp`;
    if (!isResuming) costNote += ` *(Costs must be paid up front when starting a project).*`;

    const noteText = `**Downtime: Training**\n*Hero:* ${pc.name}\n\n${resultHeader}\n**Instructor:** ${projectData.trainerName} (${projectData.trainerSpecies}) at ${projectData.trainerLocation}\n\n**Work Days Logged:** ${daysSpent} Days ${!isResuming && projectData.travelDays > 0 ? `(+${projectData.travelDays} Travel)` : ''}\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    
    // --- UPDATE CHARACTERS & CAMPAIGN ---
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let projectsDict = { ...(p.trainingProjects || {}) };
            if (isComplete) {
                delete projectsDict[projectData.id];
            } else {
                projectsDict[projectData.id] = projectData;
            }
            return { 
                ...p, 
                trainingProjects: projectsDict,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDaysLogged),
                downtimeLog: (p.downtimeLog || '') + `${p.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`
            };
        }
        return p;
    });

    let updatedCamp = { 
        ...camp, 
        playerCharacters: updatedPCs,
        sheetUpdates: [...(camp.sheetUpdates || []), ...newTasks] 
    };

    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime training with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-graduation-cap');

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Training progress logged. ${totalDaysLogged} days deducted.`, "success");
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
    window.appActions.abandonTrainingProject = abandonTrainingProject;
}
