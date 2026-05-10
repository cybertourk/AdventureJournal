import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// --- DOWNTIME MENU HUB ---

const DOWNTIME_ACTIVITIES = {
    "Buying a Magic Item": { icon: "fa-gem", desc: "Seek out and purchase magic items.", action: "openBuyMagicItemModal" },
    "Carousing": { icon: "fa-beer-mug-empty", desc: "Socialize and make new contacts.", action: "openCarousingModal" },
    "Crafting an Item": { icon: "fa-hammer", desc: "Create nonmagical or magical items.", action: "openCraftingModal" },
    "Crime": { icon: "fa-mask", desc: "Attempt illicit activities for profit.", action: "openCrimeModal" },
    "Gambling": { icon: "fa-dice", desc: "Play games of chance to win or lose money.", action: "openGamblingModal" },
    "Pit Fighting": { icon: "fa-hand-fist", desc: "Engage in combat to win prize money.", action: "openPitFightingModal" },
    "Relaxation": { icon: "fa-bed", desc: "Recover from injuries or stress.", action: "comingSoon" },
    "Religious Service": { icon: "fa-hands-praying", desc: "Serve a temple to earn favors.", action: "comingSoon" },
    "Research": { icon: "fa-book-open", desc: "Delve into lore about a specific topic.", action: "comingSoon" },
    "Scribing a Spell Scroll": { icon: "fa-scroll", desc: "Transfer a spell to a scroll.", action: "comingSoon" },
    "Selling a Magic Item": { icon: "fa-coins", desc: "Find a buyer for a magic item.", action: "comingSoon" },
    "Training": { icon: "fa-dumbbell", desc: "Learn a new language or tool proficiency.", action: "comingSoon" },
    "Work": { icon: "fa-briefcase", desc: "Perform honest labor to earn a living.", action: "comingSoon" },
};

export const openDowntimeMenu = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    let activitiesHtml = '';
    Object.entries(DOWNTIME_ACTIVITIES).forEach(([name, data]) => {
        const isReady = data.action !== "comingSoon";
        const btnClass = isReady 
            ? "bg-white border-[#d4c5a9] hover:border-blue-500 hover:shadow-md cursor-pointer group" 
            : "bg-stone-100 border-stone-300 opacity-60 cursor-not-allowed";
        
        const clickAction = isReady ? `onclick="window.appActions.${data.action}()"` : '';
        const statusBadge = !isReady ? `<span class="absolute top-2 right-2 text-[8px] bg-stone-300 text-stone-600 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-widest">Coming Soon</span>` : '';

        activitiesHtml += `
            <div class="p-3 border rounded-sm transition relative ${btnClass}" ${clickAction}>
                ${statusBadge}
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-8 h-8 rounded-sm bg-stone-200 flex items-center justify-center text-stone-600 ${isReady ? 'group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors' : ''}">
                        <i class="fa-solid ${data.icon} text-lg"></i>
                    </div>
                    <h3 class="font-bold text-sm text-stone-900 font-serif leading-tight pr-12">${name}</h3>
                </div>
                <p class="text-[10px] text-stone-500 mt-1 leading-snug">${data.desc}</p>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] p-5 rounded-sm w-full max-w-4xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="flex justify-between items-center mb-4 border-b border-[#d4c5a9] pb-3 shrink-0">
                    <h2 class="text-xl sm:text-2xl font-serif font-bold text-blue-900 flex items-center">
                        <i class="fa-solid fa-hourglass-half mr-3 text-blue-700"></i> Downtime Activities
                    </h2>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-500 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-xl p-1"></i></button>
                </div>

                <p class="text-xs text-stone-600 italic mb-4 shrink-0 border-l-2 border-blue-500 pl-2">Select a downtime activity to automatically roll checks, calculate costs, and log the results directly to the campaign calendar.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    ${activitiesHtml}
                </div>
            </div>
        </div>
    `;
};

// --- 1. BUYING A MAGIC ITEM ---

export const openBuyMagicItemModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-gem mr-2 text-amber-400"></i> Buying a Magic Item</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-buy-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Persuasion Modifier</label>
                            <div class="flex items-center">
                                <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-3 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                <input type="number" id="dt-buy-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-buy-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-buy-m" onchange="window.updateDayOptions(this.value, 'dt-buy-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-buy-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 border-t border-[#d4c5a9] pt-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Time Spent Searching</label>
                            <select id="dt-buy-days" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="5">1 Workweek (5 Days)</option><option value="10">2 Workweeks (10 Days)</option><option value="15">3 Workweeks (15 Days)</option><option value="20">4 Workweeks (20 Days)</option><option value="25">5 Workweeks (25 Days)</option><option value="30">6 Workweeks (30 Days)</option><option value="35">7 Workweeks (35 Days)</option><option value="40">8 Workweeks (40 Days)</option><option value="45">9 Workweeks (45 Days)</option><option value="50">10 Workweeks (50 Days)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Gold Spent (Expenses)</label>
                            <select id="dt-buy-gold" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-amber-900 outline-none focus:border-blue-600 bg-amber-50 shadow-inner">
                                <option value="100">100 gp (+0)</option><option value="200">200 gp (+1)</option><option value="300">300 gp (+2)</option><option value="400">400 gp (+3)</option><option value="500">500 gp (+4)</option><option value="600">600 gp (+5)</option><option value="700">700 gp (+6)</option><option value="800">800 gp (+7)</option><option value="900">900 gp (+8)</option><option value="1000">1000 gp (+9)</option><option value="1100">1100 gp (+10)</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-5 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                        <div class="flex items-center gap-2 mb-3">
                            <input type="checkbox" id="dt-buy-specific-toggle" onchange="const g = document.getElementById('dt-buy-specific-group'); g.classList.toggle('opacity-50'); g.classList.toggle('pointer-events-none');" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-stone-400">
                            <label class="text-xs font-bold uppercase tracking-widest text-stone-800 cursor-pointer" for="dt-buy-specific-toggle">Seeking a Specific Item?</label>
                        </div>
                        <div id="dt-buy-specific-group" class="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none transition-opacity">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                                <input type="text" id="dt-buy-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm" placeholder="e.g. Flame Tongue">
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rarity DC</label>
                                <select id="dt-buy-rarity" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm">
                                    <option value="common">Common (DC 10)</option><option value="uncommon">Uncommon (DC 15)</option><option value="rare">Rare (DC 20)</option><option value="very-rare">Very Rare (DC 25)</option><option value="legendary">Legendary (DC 30)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">World Magic Level</label>
                            <select id="dt-buy-magic-lvl" onchange="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="none">Normal Settings (+0)</option><option value="low">Low Magic World (-10)</option><option value="high">High Magic World (+10)</option>
                            </select>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-2 rounded-sm shadow-sm flex flex-col justify-center">
                            <div class="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="dt-buy-harper-toggle" onchange="document.getElementById('dt-buy-harper-details').classList.toggle('hidden'); window.appActions.updateBuyMagicItemMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <label class="text-[10px] font-bold uppercase tracking-widest text-blue-900 cursor-pointer" for="dt-buy-harper-toggle">Harper Network Support</label>
                            </div>
                            <p class="text-[9px] text-blue-700 italic leading-snug">Doubles the bonus received from spending extra workweeks searching.</p>
                        </div>
                    </div>

                    <div id="dt-buy-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-buy-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-buy-harper-travel" value="0" min="0" oninput="window.appActions.updateBuyMagicItemMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <div class="mt-6 bg-[#292524] text-amber-50 p-4 rounded-sm shadow-inner flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Calculated Roll Bonus</span>
                            <span id="dt-buy-bonus-out" class="text-2xl font-black text-emerald-400">+0</span>
                        </div>
                        <div class="text-right">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Downtime Required</span>
                            <span id="dt-buy-days-out" class="text-xl font-bold text-amber-400">5 Days</span>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center mt-2 italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button onclick="window.appActions.executeBuyMagicItem()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-dice-d20 mr-2"></i> Execute Search</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateBuyMagicItemMath, 50);
};

export const updateBuyMagicItemMath = () => {
    const daysEl = document.getElementById('dt-buy-days');
    const goldEl = document.getElementById('dt-buy-gold');
    const modEl = document.getElementById('dt-buy-mod');
    const magicLvlEl = document.getElementById('dt-buy-magic-lvl');
    const harperToggle = document.getElementById('dt-buy-harper-toggle');
    const travelEl = document.getElementById('dt-buy-harper-travel');
    
    const bonusOut = document.getElementById('dt-buy-bonus-out');
    const daysOut = document.getElementById('dt-buy-days-out');

    if (!daysEl || !bonusOut) return;

    const days = parseInt(daysEl.value) || 0;
    const gold = parseInt(goldEl.value) || 0;
    const pMod = parseInt(modEl.value) || 0;
    
    const isHarper = harperToggle.checked;
    const travelDays = isHarper ? (parseInt(travelEl.value) || 0) : 0;
    const magicLvl = magicLvlEl.value;

    const workweeks = Math.floor(days / 5);
    let workweeksBonus = Math.max(0, workweeks - 1);
    if (isHarper) workweeksBonus *= 2;
    workweeksBonus = Math.min(10, workweeksBonus); 

    const goldBonus = Math.max(0, (gold - 100) / 100);
    
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + workweeksBonus + goldBonus + magicBonus;
    
    bonusOut.textContent = totalBonus >= 0 ? `+${totalBonus}` : `${totalBonus}`;
    
    const totalDays = days + travelDays;
    daysOut.textContent = `${totalDays} Day${totalDays !== 1 ? 's' : ''}`;
};

export const executeBuyMagicItem = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-buy-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const days = parseInt(document.getElementById('dt-buy-days').value) || 0;
    const gold = parseInt(document.getElementById('dt-buy-gold').value) || 0;
    const pMod = parseInt(document.getElementById('dt-buy-mod').value) || 0;
    const isSpecific = document.getElementById('dt-buy-specific-toggle').checked;
    const itemName = document.getElementById('dt-buy-item-name').value.trim();
    const itemRarity = document.getElementById('dt-buy-rarity').value;
    const isHarper = document.getElementById('dt-buy-harper-toggle').checked;
    const harperLoc = document.getElementById('dt-buy-harper-loc').value.trim();
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-buy-harper-travel').value) || 0) : 0;
    const totalDays = days + travelDays;

    if (isSpecific && !itemName) { notify("Please enter the specific item name you are searching for.", "error"); return; }
    if (isHarper && !harperLoc) { notify("Please enter the Harper Safe House location.", "error"); return; }

    const igY = parseInt(document.getElementById('dt-buy-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-buy-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-buy-d').value, 10) || camp.calendar.currentDay || 1;

    const workweeks = Math.floor(days / 5);
    let workweeksBonus = Math.max(0, workweeks - 1);
    if (isHarper) workweeksBonus *= 2;
    workweeksBonus = Math.min(10, workweeksBonus); 
    const goldBonus = Math.max(0, (gold - 100) / 100);
    const magicLvl = document.getElementById('dt-buy-magic-lvl').value;
    let magicBonus = 0;
    if (magicLvl === 'low') magicBonus = -10;
    if (magicLvl === 'high') magicBonus = 10;

    const totalBonus = pMod + workweeksBonus + goldBonus + magicBonus;
    
    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + totalBonus;
    
    const d100 = Math.floor(Math.random() * 100) + 1;
    const hasComplication = d100 <= 10;
    
    let complicationText = "";
    if (hasComplication) {
        const d12 = Math.floor(Math.random() * 12) + 1;
        const compTable = [
            "The item is a fake.", "The item is stolen.", "The item is cursed.", "The item's original owner wants it back.",
            "The item is at the center of a dark prophecy.", "The seller is murdered.", "The seller is a devil.", 
            "The item is the key to freeing an evil entity.", "A third party bids on the item, doubling its price.", 
            "The item is an enslaved, intelligent entity.", "The item is tied to a cult.", "Enemies spread rumors that your work is evil."
        ];
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result:* ${compTable[d12 - 1]}`;
    } else {
        complicationText = `\n\n*No complications occurred during the search (${d100}/100).*`;
    }

    let resultHeader = "";
    let resultBody = "";

    if (isSpecific) {
        resultHeader = `**Objective:** Searching for ${itemName}`;
        const dcMap = { "common": 10, "uncommon": 15, "rare": 20, "very-rare": 25, "legendary": 30 };
        const dc = dcMap[itemRarity];
        
        if (checkTotal >= dc) {
            resultBody = `✅ **Success!** You found a seller for the **${itemName}** (DC ${dc}).`;
        } else {
            resultBody = `❌ **Failure.** You could not locate a seller for the **${itemName}** (DC ${dc}).`;
        }
    } else {
        resultHeader = `**Objective:** Searching for General Magic Items`;
        const itemTables = [
            { name: "Table A", req: 1 }, { name: "Table B", req: 6 },
            { name: "Table C", req: 11 }, { name: "Table D", req: 16 },
            { name: "Table E", req: 21 }, { name: "Table F", req: 26 },
            { name: "Table G", req: 31 }, { name: "Table H", req: 36 },
            { name: "Table I", req: 41 }
        ];
        
        const unlockedTables = itemTables.filter(t => checkTotal >= t.req);
        
        if (unlockedTables.length > 0) {
            const highestTable = unlockedTables[unlockedTables.length - 1].name;
            resultBody = `✅ **Success!** You unlocked items up to **${highestTable}**.\n*(Ask the DM to roll on the appropriate treasure tables).*`;
        } else {
            resultBody = `❌ **Failure.** Your search yielded no results.`;
        }
    }

    let modifiersNote = "";
    if (isHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    const noteText = `**Downtime: Buying a Magic Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** ${days} Days (+${travelDays} Travel)\n**Gold Spent (Expenses):** ${gold} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${totalBonus >= 0 ? `+ ${totalBonus}` : `- ${Math.abs(totalBonus)}`})\n\n${resultBody}${modifiersNote}${complicationText}`;

    const dateKey = `${igY}-${igM}-${igD}`;
    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: totalDays, repeatsYearly: false, category: 'Downtime'
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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime searching for magic items with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-gem');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Downtime complete! Results inscribed into the calendar.", "success");
    reRender();
};


// --- 2. CAROUSING ---

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

    const cal = camp.calendar;
    const igY = cal?.currentYear || 1492;
    const igM = cal?.currentMonth || 0;
    const igD = cal?.currentDay || 1;

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
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
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

                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-carouse-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-carouse-m" onchange="window.updateDayOptions(this.value, 'dt-carouse-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-carouse-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
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
                        <div class="text-right">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Downtime Required</span>
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

    const pMod = parseInt(document.getElementById('dt-carouse-mod').value) || 0;
    const socialClass = document.getElementById('dt-carouse-class').value;
    
    let goldCost = 10;
    if (socialClass === 'middle') goldCost = 50;
    if (socialClass === 'upper') goldCost = 250;

    const igY = parseInt(document.getElementById('dt-carouse-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-carouse-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-carouse-d').value, 10) || camp.calendar.currentDay || 1;

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
            lower: ["A pickpocket lifts 1d10 × 5 gp from you.", "A bar brawl leaves you with a scar.", "You have fuzzy memories of doing something illegal...", "You are banned from a tavern.", "You swore to pursue a dangerous quest.", "Surprise! You’re married.", "Streaking naked seemed like a great idea...", "Everyone is calling you an embarrassing nickname."],
            middle: ["You accidentally insulted a guild master.", "You swore a quest for a temple or a guild.", "A social gaffe has made you the talk of the town.", "An obnoxious person has taken a romantic interest in you.", "You have made a foe of a local spellcaster.", "You've been recruited to help run a local event.", "You made a drunken toast that scandalized the locals.", "You spent an additional 100 gp trying to impress people."],
            upper: ["A pushy noble family wants to marry off one of their scions to you.", "You tripped during a dance, and people can’t stop talking about it.", "You have agreed to take on a noble’s debts.", "You have been challenged to a joust by a knight.", "You have made a foe of a local noble.", "A boring noble insists you visit each day.", "You are the target of embarrassing rumors.", "You spent an additional 500 gp trying to impress people."]
        };
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result (d8=${d8}):* ${compTables[socialClass][d8 - 1]}\n\n*(Any specific gold losses, scars, or relationships must be applied to your hero's sheet manually).*`;
    }

    let resultBody = ``;
    if (hostileGained > 0) resultBody += `❌ You made a poor impression and gained **${hostileGained} Hostile Contact(s)** in the ${socialClass} class.`;
    else if (alliedGained > 0) resultBody += `✅ You socialized successfully and gained **${alliedGained} Allied Contact(s)** in the ${socialClass} class!`;
    else resultBody += `You made no notable new contacts during this time.`;

    const noteText = `**Downtime: Carousing (${socialClass.charAt(0).toUpperCase() + socialClass.slice(1)} Class)**\n*Hero:* ${pc.name}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** ${goldCost} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${pMod >= 0 ? `+ ${pMod}` : `- ${Math.abs(pMod)}`})\n\n${resultBody}\n*(Be sure to scribe any new named contacts into your hero's Private Journal under Allies/Enemies!)*${complicationText}`;

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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime carousing with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-beer-mug-empty');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Carousing complete! Results inscribed into the calendar.", "success");
    reRender();
};


// --- 3. CRAFTING AN ITEM ---

export const openCraftingModal = () => {
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
                
                <div class="bg-blue-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hammer mr-2 text-amber-400"></i> Crafting an Item</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Core Configuration -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-craft-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                ${validPCs.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Project Type</label>
                            <select id="dt-craft-type" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
                                <option value="nonmagical">Nonmagical Item</option>
                                <option value="magic">Magic Item</option>
                                <option value="healing_potion">Standard Potion of Healing</option>
                                <option value="other_potion">Other Potion</option>
                            </select>
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="mb-5 bg-stone-100 p-3 rounded-sm border border-[#d4c5a9] shadow-inner">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-2 tracking-widest"><i class="fa-regular fa-calendar mr-1"></i> Start Date on Calendar</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="dt-craft-y" value="${igY}" class="w-20 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Year">
                            <select id="dt-craft-m" onchange="window.updateDayOptions(this.value, 'dt-craft-d')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-sm" title="Month">
                                ${(cal?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="dt-craft-d" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-blue-600 text-center bg-white shadow-sm" title="Day">
                                ${Array.from({ length: Math.max(1, parseInt(cal?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Dynamic Fields based on Project Type -->
                    <div class="mb-5 bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm transition-all duration-300">
                        
                        <!-- Name Input (Shared by most) -->
                        <div id="dt-craft-name-wrapper" class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Name</label>
                            <input type="text" id="dt-craft-item-name" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner" placeholder="e.g. Plate Armor">
                        </div>

                        <!-- Nonmagical specific -->
                        <div id="dt-craft-nonmagical-fields" class="mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Market Price (gp)</label>
                            <input type="number" id="dt-craft-cost" min="1" value="50" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner text-center">
                            <p class="text-[9px] text-stone-400 mt-1 italic">Crafting requires materials worth half the market value.</p>
                        </div>

                        <!-- Magical / Potion shared rarity -->
                        <div id="dt-craft-rarity-fields" class="hidden mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Item Rarity</label>
                                <select id="dt-craft-rarity" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="very-rare">Very Rare</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>
                            <div id="dt-craft-consumable-wrapper" class="flex flex-col justify-center">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="dt-craft-consumable" onchange="window.appActions.updateCraftingMath()" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                    <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-700 group-hover:text-blue-800 transition">Is Consumable?</span>
                                </label>
                                <p class="text-[9px] text-stone-400 mt-1 italic">Halves required time and cost.</p>
                            </div>
                        </div>

                        <!-- Standard Healing Potion specific -->
                        <div id="dt-craft-healing-fields" class="hidden mb-4">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Potion Type</label>
                            <select id="dt-craft-healing-type" onchange="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-stone-50 shadow-inner">
                                <option value="healing">Potion of Healing (1 d / 25 gp)</option>
                                <option value="greater">Greater Healing (5 d / 100 gp)</option>
                                <option value="superior">Superior Healing (15 d / 1,000 gp)</option>
                                <option value="supreme">Supreme Healing (20 d / 10,000 gp)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Modifiers -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div class="bg-amber-50 border border-amber-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-artificer" onchange="window.appActions.updateCraftingMath()" class="w-4 h-4 text-amber-600 rounded-sm cursor-pointer shadow-sm border-amber-400">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-amber-900 group-hover:text-amber-700 transition">Artificer Magic Item Adept</span>
                            </label>
                            <p class="text-[9px] text-amber-700 italic leading-snug">Quarter time & half cost for Common/Uncommon magic items and standard potions.</p>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-sm shadow-sm">
                            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                                <input type="checkbox" id="dt-craft-harper" onchange="document.getElementById('dt-craft-harper-details').classList.toggle('hidden'); window.appActions.updateCraftingMath();" class="w-4 h-4 text-blue-600 rounded-sm cursor-pointer shadow-sm border-blue-300">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900 group-hover:text-blue-700 transition">Harper Network Support</span>
                            </label>
                            <p class="text-[9px] text-blue-700 italic leading-snug">Reduces time & cost. Requires a safe house.</p>
                        </div>
                    </div>

                    <!-- Harper Details (Hidden by default) -->
                    <div id="dt-craft-harper-details" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-white p-3 border border-[#d4c5a9] shadow-sm rounded-sm">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Safe House Location</label>
                            <input type="text" id="dt-craft-harper-loc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50" placeholder="e.g. Waterdeep">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Travel Days Required</label>
                            <input type="number" id="dt-craft-harper-travel" value="0" min="0" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 shadow-inner bg-stone-50 text-center">
                        </div>
                    </div>

                    <!-- Progress Input -->
                    <div class="bg-stone-900 text-amber-50 p-4 rounded-sm shadow-inner mb-2">
                        <div class="flex justify-between items-center mb-3 pb-2 border-b border-stone-700">
                            <span class="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Project Requirements</span>
                            <div class="text-right">
                                <span id="dt-craft-total-days" class="text-sm font-bold text-emerald-400 mr-3">0 Days</span>
                                <span id="dt-craft-total-gold" class="text-sm font-bold text-amber-400">0 gp</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <label class="block text-[10px] uppercase text-stone-400 font-bold mb-1 tracking-widest">Work Days Spent <span class="normal-case font-normal">(Progress)</span></label>
                                <input type="number" id="dt-craft-days-spent" value="1" min="1" oninput="window.appActions.updateCraftingMath()" class="w-full p-2 border border-stone-600 rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-500 text-center bg-stone-200">
                            </div>
                            <div class="flex-1 text-right flex flex-col justify-end">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Total Days Logged</span>
                                <span id="dt-craft-logged-days" class="text-xl font-bold text-amber-500">1 Day</span>
                                <p class="text-[8px] text-stone-500 italic mt-0.5">Includes travel time</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[9px] text-stone-500 text-center italic font-bold uppercase tracking-widest">Note: Gold must be deducted from your inventory manually.</p>

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-craft-submit-btn" onclick="window.appActions.executeCrafting()" class="px-5 py-2 bg-blue-800 text-amber-50 rounded-sm hover:bg-blue-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hammer mr-2"></i> Log Crafting</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(window.appActions.updateCraftingMath, 50);
};

export const updateCraftingMath = () => {
    const typeEl = document.getElementById('dt-craft-type');
    const nameEl = document.getElementById('dt-craft-item-name');
    const costEl = document.getElementById('dt-craft-cost');
    const rarityEl = document.getElementById('dt-craft-rarity');
    const consEl = document.getElementById('dt-craft-consumable');
    const healTypeEl = document.getElementById('dt-craft-healing-type');
    
    const isHarper = document.getElementById('dt-craft-harper').checked;
    const isArtificer = document.getElementById('dt-craft-artificer').checked;
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
    
    const daysSpentEl = document.getElementById('dt-craft-days-spent');
    
    if (!typeEl || !daysSpentEl) return;
    
    const cType = typeEl.value;
    
    // Toggle Visibility
    document.getElementById('dt-craft-name-wrapper').classList.remove('hidden');
    document.getElementById('dt-craft-nonmagical-fields').classList.add('hidden');
    document.getElementById('dt-craft-rarity-fields').classList.add('hidden');
    document.getElementById('dt-craft-healing-fields').classList.add('hidden');
    document.getElementById('dt-craft-consumable-wrapper').classList.remove('hidden');

    if (cType === 'nonmagical') {
        document.getElementById('dt-craft-nonmagical-fields').classList.remove('hidden');
    } else if (cType === 'magic') {
        document.getElementById('dt-craft-rarity-fields').classList.remove('hidden');
    } else if (cType === 'healing_potion') {
        document.getElementById('dt-craft-name-wrapper').classList.add('hidden');
        document.getElementById('dt-craft-healing-fields').classList.remove('hidden');
    } else if (cType === 'other_potion') {
        document.getElementById('dt-craft-rarity-fields').classList.remove('hidden');
        document.getElementById('dt-craft-consumable-wrapper').classList.add('hidden'); // Potions are always consumable
    }

    let baseTime = 0;
    let baseCost = 0;
    let isConsumable = false;

    // Base Math
    if (cType === 'nonmagical') {
        const mCost = parseInt(costEl.value) || 0;
        baseTime = Math.max(1, Math.ceil(mCost / 10));
        baseCost = Math.ceil(mCost / 2);
    } else if (cType === 'healing_potion') {
        const hType = healTypeEl.value;
        const healingData = {
            healing: { time: 1, cost: 25 },
            greater: { time: 5, cost: 100 },
            superior: { time: 15, cost: 1000 },
            supreme: { time: 20, cost: 10000 }
        };
        baseTime = healingData[hType].time;
        baseCost = healingData[hType].cost;
        isConsumable = true;
    } else { // Magic Item or Other Potion
        const rarity = rarityEl.value;
        isConsumable = cType === 'other_potion' ? true : consEl.checked;
        
        const rarityData = {
            common: { workweeks: 1, cost: 50 },
            uncommon: { workweeks: 2, cost: 200 },
            rare: { workweeks: 10, cost: 2000 },
            'very-rare': { workweeks: 25, cost: 20000 },
            legendary: { workweeks: 50, cost: 100000 }
        };
        
        let rw = rarityData[rarity].workweeks;
        let rc = rarityData[rarity].cost;
        
        baseTime = (isConsumable ? Math.max(1, Math.ceil(rw / 2)) : rw) * 5;
        baseCost = isConsumable ? Math.max(1, Math.ceil(rc / 2)) : rc;
    }

    let effectiveTime = baseTime;
    let effectiveCost = baseCost;

    // Apply Artificer (Applies to common/uncommon magic items, or healing/greater potions)
    let applyArtificer = false;
    if (isArtificer) {
        if (cType === 'healing_potion' && (healTypeEl.value === 'healing' || healTypeEl.value === 'greater')) applyArtificer = true;
        if ((cType === 'magic' || cType === 'other_potion') && (rarityEl.value === 'common' || rarityEl.value === 'uncommon')) applyArtificer = true;
    }

    if (applyArtificer) {
        effectiveTime = Math.ceil(baseTime * 0.25);
        effectiveCost = Math.ceil(baseCost * 0.5);
    }

    // Apply Harper
    if (isHarper) {
        effectiveTime = Math.ceil(effectiveTime * 0.8);
        effectiveCost = isConsumable ? Math.ceil(effectiveCost * 0.75) : Math.ceil(effectiveCost * 0.9);
    }

    // Update Totals UI
    document.getElementById('dt-craft-total-days').textContent = `${effectiveTime} Days`;
    document.getElementById('dt-craft-total-gold').textContent = `${effectiveCost} gp`;

    // Process "Days Spent" vs "Total Required"
    let daysSpent = parseInt(daysSpentEl.value) || 1;
    
    // Auto-cap input to max time needed to prevent over-spending
    if (daysSpent > effectiveTime) {
        daysSpent = effectiveTime;
        daysSpentEl.value = effectiveTime;
    }

    const totalLogged = daysSpent + travelDays;
    document.getElementById('dt-craft-logged-days').textContent = `${totalLogged} Day${totalLogged !== 1 ? 's' : ''}`;

    const submitBtn = document.getElementById('dt-craft-submit-btn');
    if (submitBtn) {
        if (daysSpent >= effectiveTime) {
            submitBtn.innerHTML = `<i class="fa-solid fa-hammer mr-2"></i> Complete Project`;
            submitBtn.className = submitBtn.className.replace('bg-blue-800', 'bg-emerald-700').replace('hover:bg-blue-700', 'hover:bg-emerald-600');
        } else {
            submitBtn.innerHTML = `<i class="fa-solid fa-person-digging mr-2"></i> Log Progress`;
            submitBtn.className = submitBtn.className.replace('bg-emerald-700', 'bg-blue-800').replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        }
    }
};

export const executeCrafting = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-craft-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const cType = document.getElementById('dt-craft-type').value;
    let itemName = document.getElementById('dt-craft-item-name').value.trim();
    
    if (cType === 'healing_potion') {
        const hType = document.getElementById('dt-craft-healing-type').value;
        if (hType === 'healing') itemName = 'Potion of Healing';
        if (hType === 'greater') itemName = 'Potion of Greater Healing';
        if (hType === 'superior') itemName = 'Potion of Superior Healing';
        if (hType === 'supreme') itemName = 'Potion of Supreme Healing';
    }

    if (!itemName) { notify("Please enter the item name you are crafting.", "error"); return; }

    const isHarper = document.getElementById('dt-craft-harper').checked;
    const harperLoc = document.getElementById('dt-craft-harper-loc').value.trim();
    const travelDays = isHarper ? (parseInt(document.getElementById('dt-craft-harper-travel').value) || 0) : 0;
    
    if (isHarper && !harperLoc) { notify("Please enter the Harper Safe House location.", "error"); return; }

    // Re-run the exact math logic to get the final target numbers
    let baseTime = 0, baseCost = 0, isConsumable = false;
    const isArtificer = document.getElementById('dt-craft-artificer').checked;
    const rarity = document.getElementById('dt-craft-rarity').value;

    if (cType === 'nonmagical') {
        const mCost = parseInt(document.getElementById('dt-craft-cost').value) || 0;
        baseTime = Math.max(1, Math.ceil(mCost / 10));
        baseCost = Math.ceil(mCost / 2);
    } else if (cType === 'healing_potion') {
        const hType = document.getElementById('dt-craft-healing-type').value;
        const healingData = { healing: { time: 1, cost: 25 }, greater: { time: 5, cost: 100 }, superior: { time: 15, cost: 1000 }, supreme: { time: 20, cost: 10000 } };
        baseTime = healingData[hType].time; baseCost = healingData[hType].cost; isConsumable = true;
    } else {
        isConsumable = cType === 'other_potion' ? true : document.getElementById('dt-craft-consumable').checked;
        const rarityData = { common: { workweeks: 1, cost: 50 }, uncommon: { workweeks: 2, cost: 200 }, rare: { workweeks: 10, cost: 2000 }, 'very-rare': { workweeks: 25, cost: 20000 }, legendary: { workweeks: 50, cost: 100000 } };
        baseTime = (isConsumable ? Math.max(1, Math.ceil(rarityData[rarity].workweeks / 2)) : rarityData[rarity].workweeks) * 5;
        baseCost = isConsumable ? Math.max(1, Math.ceil(rarityData[rarity].cost / 2)) : rarityData[rarity].cost;
    }

    let effectiveTime = baseTime, effectiveCost = baseCost;
    let applyArtificer = false;
    if (isArtificer) {
        if (cType === 'healing_potion' && (itemName.includes('Greater') || itemName === 'Potion of Healing')) applyArtificer = true;
        if ((cType === 'magic' || cType === 'other_potion') && (rarity === 'common' || rarity === 'uncommon')) applyArtificer = true;
    }
    if (applyArtificer) { effectiveTime = Math.ceil(baseTime * 0.25); effectiveCost = Math.ceil(baseCost * 0.5); }
    if (isHarper) { effectiveTime = Math.ceil(effectiveTime * 0.8); effectiveCost = isConsumable ? Math.ceil(effectiveCost * 0.75) : Math.ceil(effectiveCost * 0.9); }

    const daysSpent = parseInt(document.getElementById('dt-craft-days-spent').value) || 1;
    const totalDaysLogged = daysSpent + travelDays;
    const isComplete = daysSpent >= effectiveTime;

    // Complication Roll (10% flat chance for magic items/potions)
    let complicationText = "";
    if (cType !== 'nonmagical') {
        const d100 = Math.floor(Math.random() * 100) + 1;
        if (d100 <= 10) {
            const d6 = Math.floor(Math.random() * 6) + 1;
            const compTable = [
                "Rumors swirl that what you’re working on is unstable and a threat to the community.",
                "Your tools are stolen, forcing you to buy new ones.",
                "A local wizard shows keen interest in your work and insists on observing you.",
                "A powerful noble offers a hefty price for your work and is not interested in hearing no for an answer.",
                "A dwarf clan accuses you of stealing its secret lore to fuel your work.",
                "A competitor spreads rumors that your work is shoddy and prone to failure."
            ];
            complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result:* ${compTable[d6 - 1]}`;
        } else {
            complicationText = `\n\n*No complications occurred (${d100}/100).*`;
        }
    }

    // Build the log text
    let resultHeader = `**Objective:** Crafting ${itemName}`;
    let resultBody = isComplete 
        ? `✅ **Project Completed!** You have successfully crafted the **${itemName}**.` 
        : `⏳ **Progress Logged:** You spent ${daysSpent} days working on the **${itemName}**. *(Remaining: ${effectiveTime - daysSpent} Days)*`;

    let modifiersNote = "";
    if (applyArtificer) modifiersNote += `\n*Magic Item Adept bonus applied.*`;
    if (isHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    let costNote = `**Total Project Material Cost:** ${effectiveCost} gp`;
    if (!isComplete) costNote += ` *(Materials must be purchased up front when starting a project).*`;

    const noteText = `**Downtime: Crafting an Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Work Days Logged:** ${daysSpent} Days (+${travelDays} Travel)\n${costNote}\n\n${resultBody}${modifiersNote}${complicationText}`;

    // Capture Calendar Settings
    const igY = parseInt(document.getElementById('dt-craft-y').value, 10) || camp.calendar.currentYear || 1492;
    const igM = parseInt(document.getElementById('dt-craft-m').value, 10) || camp.calendar.currentMonth || 0;
    const igD = parseInt(document.getElementById('dt-craft-d').value, 10) || camp.calendar.currentDay || 1;
    const dateKey = `${igY}-${igM}-${igD}`;

    const newNote = {
        id: generateId(), text: noteText, authorId: myUid, visibility: { mode: 'public', visibleTo: [] },
        timestamp: Date.now(), duration: totalDaysLogged, repeatsYearly: false, category: 'Downtime'
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
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime crafting with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hammer');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Crafting progress logged to the calendar.", "success");
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    // Binding the new Magic Item logic
    window.appActions.openBuyMagicItemModal = openBuyMagicItemModal;
    window.appActions.updateBuyMagicItemMath = updateBuyMagicItemMath;
    window.appActions.executeBuyMagicItem = executeBuyMagicItem;
    
    // Binding the new Carousing logic
    window.appActions.openCarousingModal = openCarousingModal;
    window.appActions.updateCarousingMath = updateCarousingMath;
    window.appActions.executeCarousing = executeCarousing;

    // Binding the new Crafting logic
    window.appActions.openCraftingModal = openCraftingModal;
    window.appActions.updateCraftingMath = updateCraftingMath;
    window.appActions.executeCrafting = executeCrafting;
    
    // Coming soon placeholder
    window.appActions.comingSoon = () => {
        notify("This downtime activity is currently being forged.", "info");
    };
}
