import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- MAGIC ITEM TABLES (DMG Tables A - I) ---
// ============================================================================
const MAGIC_ITEM_TABLES = {
    'A': [
        [1, 50, "Potion of healing"], [51, 60, "Spell scroll (cantrip)"], [61, 70, "Potion of climbing"],
        [71, 90, "Spell scroll (1st level)"], [91, 94, "Spell scroll (2nd level)"], [95, 98, "Potion of healing (greater)"],
        [99, 99, "Bag of holding"], [100, 100, "Driftglobe"]
    ],
    'B': [
        [1, 15, "Potion of healing (greater)"], [16, 22, "Potion of fire breath"], [23, 29, "Potion of resistance"],
        [30, 34, "Ammunition, +1"], [35, 39, "Potion of animal friendship"], [40, 44, "Potion of hill giant strength"],
        [45, 49, "Potion of growth"], [50, 54, "Potion of water breathing"], [55, 59, "Spell scroll (2nd level)"],
        [60, 64, "Spell scroll (3rd level)"], [65, 67, "Bag of holding"], [68, 70, "Keoghtom's ointment"],
        [71, 73, "Oil of slipperiness"], [74, 75, "Dust of disappearance"], [76, 77, "Dust of dryness"],
        [78, 79, "Dust of sneezing and choking"], [80, 81, "Elemental gem"], [82, 83, "Philter of love"],
        [84, 84, "Alchemy jug"], [85, 85, "Cap of water breathing"], [86, 86, "Cloak of the manta ray"],
        [87, 87, "Driftglobe"], [88, 88, "Goggles of night"], [89, 89, "Helm of comprehending languages"],
        [90, 90, "Immovable rod"], [91, 91, "Lantern of revealing"], [92, 92, "Mariner's armor"],
        [93, 93, "Mithral armor"], [94, 94, "Potion of poison"], [95, 95, "Ring of swimming"],
        [96, 96, "Robe of useful items"], [97, 97, "Rope of climbing"], [98, 98, "Saddle of the cavalier"],
        [99, 99, "Wand of magic detection"], [100, 100, "Wand of secrets"]
    ],
    'C': [
        [1, 15, "Potion of healing (superior)"], [16, 22, "Spell scroll (4th level)"], [23, 27, "Ammunition, +2"],
        [28, 32, "Potion of clairvoyance"], [33, 37, "Potion of diminution"], [38, 42, "Potion of gaseous form"],
        [43, 47, "Potion of frost giant strength"], [48, 52, "Potion of stone giant strength"], [53, 57, "Potion of heroism"],
        [58, 62, "Potion of invulnerability"], [63, 67, "Potion of mind reading"], [68, 72, "Spell scroll (5th level)"],
        [73, 75, "Elixir of health"], [76, 78, "Oil of etherealness"], [79, 81, "Potion of fire giant strength"],
        [82, 84, "Quaal's feather token"], [85, 87, "Scroll of protection"], [88, 89, "Bag of beans"],
        [90, 91, "Bead of force"], [92, 92, "Chime of opening"], [93, 93, "Decanter of endless water"],
        [94, 94, "Eyes of minute seeing"], [95, 95, "Folding boat"], [96, 96, "Heward's handy haversack"],
        [97, 97, "Horseshoes of speed"], [98, 98, "Necklace of fireballs"], [99, 99, "Periapt of health"],
        [100, 100, "Sending stones"]
    ],
    'D': [
        [1, 20, "Potion of healing (supreme)"], [21, 30, "Potion of invisibility"], [31, 40, "Potion of speed"],
        [41, 50, "Spell scroll (6th level)"], [51, 57, "Spell scroll (7th level)"], [58, 62, "Ammunition, +3"],
        [63, 67, "Oil of sharpness"], [68, 72, "Potion of flying"], [73, 77, "Potion of cloud giant strength"],
        [78, 82, "Potion of longevity"], [83, 87, "Potion of vitality"], [88, 92, "Spell scroll (8th level)"],
        [93, 95, "Horseshoes of a zephyr"], [96, 98, "Nolzur's marvelous pigments"], [99, 99, "Bag of devouring"],
        [100, 100, "Portable hole"]
    ],
    'E': [
        [1, 30, "Spell scroll (8th level)"], [31, 55, "Potion of storm giant strength"], [56, 70, "Potion of healing (supreme)"],
        [71, 85, "Spell scroll (9th level)"], [86, 93, "Universal solvent"], [94, 98, "Arrow of slaying"],
        [99, 100, "Sovereign glue"]
    ],
    'F': [
        [1, 15, "Weapon, +1"], [16, 18, "Shield, +1"], [19, 21, "Sentinel shield"], [22, 23, "Amulet of proof against detection and location"],
        [24, 25, "Boots of elvenkind"], [26, 27, "Boots of striding and springing"], [28, 29, "Bracers of archery"],
        [30, 31, "Brooch of shielding"], [32, 33, "Broom of flying"], [34, 35, "Cloak of elvenkind"],
        [36, 37, "Cloak of protection"], [38, 39, "Gauntlets of ogre power"], [40, 41, "Hat of disguise"],
        [42, 43, "Javelin of lightning"], [44, 45, "Pearl of power"], [46, 47, "Rod of the pact keeper, +1"],
        [48, 49, "Slippers of spider climbing"], [50, 51, "Staff of the adder"], [52, 53, "Staff of the python"],
        [54, 55, "Sword of vengeance"], [56, 57, "Trident of fish command"], [58, 59, "Wand of magic missiles"],
        [60, 61, "Wand of the war mage, +1"], [62, 63, "Wand of web"], [64, 65, "Weapon of warning"],
        [66, 66, "Adamantine armor (chain mail)"], [67, 67, "Adamantine armor (chain shirt)"], [68, 68, "Adamantine armor (scale mail)"],
        [69, 69, "Bag of tricks (gray)"], [70, 70, "Bag of tricks (rust)"], [71, 71, "Bag of tricks (tan)"],
        [72, 72, "Boots of the winterlands"], [73, 73, "Circlet of blasting"], [74, 74, "Deck of illusions"],
        [75, 75, "Eversmoking bottle"], [76, 76, "Eyes of charming"], [77, 77, "Eyes of the eagle"],
        [78, 78, "Figurine of wondrous power (silver raven)"], [79, 79, "Gem of brightness"], [80, 80, "Gloves of missile snaring"],
        [81, 81, "Gloves of swimming and climbing"], [82, 82, "Gloves of thievery"], [83, 83, "Headband of intellect"],
        [84, 84, "Helm of telepathy"], [85, 85, "Instrument of the bards (Doss lute)"], [86, 86, "Instrument of the bards (Fochlucan bandore)"],
        [87, 87, "Instrument of the bards (Mac-Fuirmidh cittern)"], [88, 88, "Medallion of thoughts"], [89, 89, "Necklace of adaptation"],
        [90, 90, "Periapt of wound closure"], [91, 91, "Pipes of haunting"], [92, 92, "Pipes of the sewers"],
        [93, 93, "Ring of jumping"], [94, 94, "Ring of mind shielding"], [95, 95, "Ring of warmth"],
        [96, 96, "Ring of water walking"], [97, 97, "Quiver of Ehlonna"], [98, 98, "Stone of good luck (luckstone)"],
        [99, 99, "Wind fan"], [100, 100, "Winged boots"]
    ],
    'G': [
        [1, 11, "Weapon, +2"], [12, 14, "Figurine of wondrous power (roll d8)"], [15, 15, "Adamantine armor (breastplate)"],
        [16, 16, "Adamantine armor (splint)"], [17, 17, "Amulet of health"], [18, 18, "Armor of vulnerability"],
        [19, 19, "Arrow-catching shield"], [20, 20, "Belt of dwarvenkind"], [21, 21, "Belt of hill giant strength"],
        [22, 22, "Berserker axe"], [23, 23, "Boots of levitation"], [24, 24, "Boots of speed"],
        [25, 25, "Bowl of commanding water elementals"], [26, 26, "Bracers of defense"], [27, 27, "Brazier of commanding fire elementals"],
        [28, 28, "Cape of the mountebank"], [29, 29, "Censer of controlling air elementals"], [30, 30, "Armor, +1 chain mail"],
        [31, 31, "Armor of resistance (chain mail)"], [32, 32, "Armor, +1 chain shirt"], [33, 33, "Armor of resistance (chain shirt)"],
        [34, 34, "Cloak of displacement"], [35, 35, "Cloak of the bat"], [36, 36, "Cube of force"],
        [37, 37, "Daern's instant fortress"], [38, 38, "Dagger of venom"], [39, 39, "Dimensional shackles"],
        [40, 40, "Dragon slayer"], [41, 41, "Elven chain"], [42, 42, "Flame tongue"],
        [43, 43, "Gem of seeing"], [44, 44, "Giant slayer"], [45, 45, "Glamoured studded leather"],
        [46, 46, "Helm of teleportation"], [47, 47, "Horn of blasting"], [48, 48, "Horn of Valhalla (silver or brass)"],
        [49, 49, "Instrument of the bards (Canaith mandolin)"], [50, 50, "Instrument of the bards (Cli lyre)"], [51, 51, "Ioun stone (awareness)"],
        [52, 52, "Ioun stone (protection)"], [53, 53, "Ioun stone (reserve)"], [54, 54, "Ioun stone (sustenance)"],
        [55, 55, "Iron bands of Bilarro"], [56, 56, "Armor, +1 leather"], [57, 57, "Armor of resistance (leather)"],
        [58, 58, "Mace of disruption"], [59, 59, "Mace of smiting"], [60, 60, "Mace of terror"],
        [61, 61, "Mantle of spell resistance"], [62, 62, "Necklace of prayer beads"], [63, 63, "Periapt of proof against poison"],
        [64, 64, "Ring of animal influence"], [65, 65, "Ring of evasion"], [66, 66, "Ring of feather falling"],
        [67, 67, "Ring of free action"], [68, 68, "Ring of protection"], [69, 69, "Ring of resistance"],
        [70, 70, "Ring of spell storing"], [71, 71, "Ring of the ram"], [72, 72, "Ring of X-ray vision"],
        [73, 73, "Robe of eyes"], [74, 74, "Rod of rulership"], [75, 75, "Rod of the pact keeper, +2"],
        [76, 76, "Rope of entanglement"], [77, 77, "Armor, +1 scale mail"], [78, 78, "Armor of resistance (scale mail)"],
        [79, 79, "Shield, +2"], [80, 80, "Shield of missile attraction"], [81, 81, "Staff of charming"],
        [82, 82, "Staff of healing"], [83, 83, "Staff of swarming insects"], [84, 84, "Staff of the woodlands"],
        [85, 85, "Staff of withering"], [86, 86, "Stone of controlling earth elementals"], [87, 87, "Sun blade"],
        [88, 88, "Sword of life stealing"], [89, 89, "Sword of wounding"], [90, 90, "Tentacle rod"],
        [91, 91, "Vicious weapon"], [92, 92, "Wand of binding"], [93, 93, "Wand of enemy detection"],
        [94, 94, "Wand of fear"], [95, 95, "Wand of fireballs"], [96, 96, "Wand of lightning bolts"],
        [97, 97, "Wand of paralysis"], [98, 98, "Wand of the war mage, +2"], [99, 99, "Wand of wonder"],
        [100, 100, "Wings of flying"]
    ],
    'H': [
        [1, 10, "Weapon, +3"], [11, 12, "Amulet of the planes"], [13, 14, "Carpet of flying"], [15, 16, "Crystal ball (very rare version)"],
        [17, 18, "Ring of regeneration"], [19, 20, "Ring of shooting stars"], [21, 22, "Ring of telekinesis"],
        [23, 24, "Robe of scintillating colors"], [25, 26, "Robe of stars"], [27, 28, "Rod of absorption"],
        [29, 30, "Rod of alertness"], [31, 32, "Rod of security"], [33, 34, "Rod of the pact keeper, +3"],
        [35, 36, "Scimitar of speed"], [37, 38, "Shield, +3"], [39, 40, "Staff of fire"],
        [41, 42, "Staff of frost"], [43, 44, "Staff of power"], [45, 46, "Staff of striking"],
        [47, 48, "Staff of thunder and lightning"], [49, 50, "Sword of sharpness"], [51, 52, "Wand of polymorph"],
        [53, 54, "Wand of the war mage, +3"], [55, 55, "Adamantine armor (half plate)"], [56, 56, "Adamantine armor (plate)"],
        [57, 57, "Animated shield"], [58, 58, "Belt of fire giant strength"], [59, 59, "Belt of frost giant strength (or stone)"],
        [60, 60, "Armor, +1 breastplate"], [61, 61, "Armor of resistance (breastplate)"], [62, 62, "Candle of invocation"],
        [63, 63, "Armor, +2 chain mail"], [64, 64, "Armor, +2 chain shirt"], [65, 65, "Cloak of arachnida"],
        [66, 66, "Dancing sword"], [67, 67, "Demon armor"], [68, 68, "Dragon scale mail"],
        [69, 69, "Dwarven plate"], [70, 70, "Dwarven thrower"], [71, 71, "Efreeti bottle"],
        [72, 72, "Figurine of wondrous power (obsidian steed)"], [73, 73, "Frost brand"], [74, 74, "Helm of brilliance"],
        [75, 75, "Horn of Valhalla (bronze)"], [76, 76, "Instrument of the bards (Anstruth harp)"], [77, 77, "Ioun stone (absorption)"],
        [78, 78, "Ioun stone (agility)"], [79, 79, "Ioun stone (fortitude)"], [80, 80, "Ioun stone (insight)"],
        [81, 81, "Ioun stone (intellect)"], [82, 82, "Ioun stone (leadership)"], [83, 83, "Ioun stone (strength)"],
        [84, 84, "Armor, +2 leather"], [85, 85, "Manual of bodily health"], [86, 86, "Manual of gainful exercise"],
        [87, 87, "Manual of golems"], [88, 88, "Manual of quickness of action"], [89, 89, "Mirror of life trapping"],
        [90, 90, "Nine lives stealer"], [91, 91, "Oathbow"], [92, 92, "Armor, +2 scale mail"],
        [93, 93, "Spellguard shield"], [94, 94, "Armor, +1 splint"], [95, 95, "Armor of resistance (splint)"],
        [96, 96, "Armor, +1 studded leather"], [97, 97, "Armor of resistance (studded leather)"], [98, 98, "Tome of clear thought"],
        [99, 99, "Tome of leadership and influence"], [100, 100, "Tome of understanding"]
    ],
    'I': [
        [1, 5, "Defender"], [6, 10, "Hammer of thunderbolts"], [11, 15, "Luck blade"], [16, 20, "Sword of answering"],
        [21, 23, "Holy avenger"], [24, 26, "Ring of djinni summoning"], [27, 29, "Ring of invisibility"],
        [30, 32, "Ring of spell turning"], [33, 35, "Rod of lordly might"], [36, 38, "Staff of the magi"],
        [39, 41, "Vorpal sword"], [42, 43, "Belt of cloud giant strength"], [44, 45, "Armor, +2 breastplate"],
        [46, 47, "Armor, +3 chain mail"], [48, 49, "Armor, +3 chain shirt"], [50, 51, "Cloak of invisibility"],
        [52, 53, "Crystal ball (legendary version)"], [54, 55, "Armor, +1 half plate"], [56, 57, "Iron flask"],
        [58, 59, "Armor, +3 leather"], [60, 61, "Armor, +1 plate"], [62, 63, "Robe of the archmagi"],
        [64, 65, "Rod of resurrection"], [66, 67, "Armor, +1 scale mail"], [68, 69, "Scarab of protection"],
        [70, 71, "Armor, +2 splint"], [72, 73, "Armor, +2 studded leather"], [74, 75, "Well of many worlds"],
        [76, 76, "Magic armor (roll d12)"], [77, 77, "Apparatus of Kwalish"], [78, 78, "Armor of invulnerability"],
        [79, 79, "Belt of storm giant strength"], [80, 80, "Cubic gate"], [81, 81, "Deck of many things"],
        [82, 82, "Efreeti chain"], [83, 83, "Armor of resistance (half plate)"], [84, 84, "Horn of Valhalla (iron)"],
        [85, 85, "Instrument of the bards (Ollamh harp)"], [86, 86, "Ioun stone (greater absorption)"], [87, 87, "Ioun stone (mastery)"],
        [88, 88, "Ioun stone (regeneration)"], [89, 89, "Plate armor of etherealness"], [90, 90, "Armor of resistance (plate)"],
        [91, 91, "Ring of air elemental command"], [92, 92, "Ring of earth elemental command"], [93, 93, "Ring of fire elemental command"],
        [94, 94, "Ring of three wishes"], [95, 95, "Ring of water elemental command"], [96, 96, "Sphere of annihilation"],
        [97, 97, "Talisman of pure good"], [98, 98, "Talisman of the sphere"], [99, 99, "Talisman of ultimate evil"],
        [100, 100, "Tome of the stilled tongue"]
    ]
};

// ============================================================================
// --- 1. BUYING A MAGIC ITEM ---
// ============================================================================

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
                                <input type="number" id="dt-buy-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner text-center">
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
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

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < totalDays) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

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
        
        let tableLetter = 'A';
        let rollCount = 0;
        
        if (checkTotal >= 41) { tableLetter = 'I'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 36) { tableLetter = 'H'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 31) { tableLetter = 'G'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 26) { tableLetter = 'F'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 21) { tableLetter = 'E'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 16) { tableLetter = 'D'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 11) { tableLetter = 'C'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 6) { tableLetter = 'B'; rollCount = Math.floor(Math.random() * 4) + 1; }
        else if (checkTotal >= 1) { tableLetter = 'A'; rollCount = Math.floor(Math.random() * 6) + 1; }
        
        if (rollCount > 0) {
            const foundItems = [];
            for (let i = 0; i < rollCount; i++) {
                const roll = Math.floor(Math.random() * 100) + 1;
                const tableData = MAGIC_ITEM_TABLES[tableLetter];
                let found = "Unknown Item";
                for (let r of tableData) {
                    if (roll >= r[0] && roll <= r[1]) {
                        found = r[2];
                        break;
                    }
                }
                foundItems.push(found);
            }
            
            const counts = {};
            foundItems.forEach(i => counts[i] = (counts[i] || 0) + 1);
            
            let itemsStr = "";
            Object.keys(counts).forEach(k => {
                itemsStr += `\n> • **${k}**` + (counts[k] > 1 ? ` (x${counts[k]})` : '');
            });
            
            resultBody = `✅ **Success!** You found a seller offering the following items (Table ${tableLetter}):${itemsStr}\n\n*(Prices are determined by the DM based on the item's rarity and the seller's disposition).*`;
        } else {
            resultBody = `❌ **Failure.** Your search yielded no results.`;
        }
    }

    let modifiersNote = "";
    if (isHarper) modifiersNote += `\n*Silver Harbingers support was utilized${harperLoc ? ` at ${harperLoc}` : ''}.*`;

    const noteText = `**Downtime: Buying a Magic Item**\n*Hero:* ${pc.name}\n\n${resultHeader}\n\n**Time Spent:** ${days} Days (+${travelDays} Travel)\n**Gold Spent (Expenses):** ${gold} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${totalBonus >= 0 ? `+ ${totalBonus}` : `- ${Math.abs(totalBonus)}`})\n\n${resultBody}${modifiersNote}${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - totalDays),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime searching for magic items with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-gem');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify(`Downtime complete! ${totalDays} days deducted. Log saved to Hero Journal.`, "success");
    reRender();
};
