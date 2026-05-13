import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

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

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-blue-900 p-4 border-b-4 border-yellow-500 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-hands-praying mr-2 text-yellow-400"></i> Religious Service</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <!-- Workflow Instructions -->
                    <div class="bg-yellow-900/5 border border-yellow-900/20 p-4 rounded-sm shadow-sm mb-5">
                        <h3 class="text-xs font-bold text-yellow-900 uppercase tracking-widest mb-2"><i class="fa-solid fa-clipboard-list mr-1.5 text-yellow-700"></i> Religious Service Workflow</h3>
                        <ul class="text-[10px] sm:text-xs text-yellow-950 space-y-1.5 leading-snug font-serif">
                            <li><b>Step 1:</b> Select your <b>Hero</b>. The Deity list will automatically filter to patrons aligned with your character's morality.</li>
                            <li><b>Step 2:</b> You may either perform a new service to earn favors, or <b>Expend</b> a previously earned favor from your active bank.</li>
                            <li><b>Step 3:</b> Provide your <b>Charisma Modifier</b> to determine the maximum number of unspent favors you can hold at one time.</li>
                            <li><b>Step 4:</b> If performing a new service, roll <b>Religion</b> or <b>Persuasion</b>. Success grants banked favors for future use!</li>
                        </ul>
                    </div>

                    <!-- Basic Setup & Favor Selection -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-relig-pc" onchange="window.appActions.updateReligiousServiceMath('pc')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-inner">
                                ${validPCs.map(pc => {
                                    const currentDays = parseInt(pc.availableDowntime) || 0;
                                    return `<option value="${pc.id}">${pc.name} (${currentDays} Days)</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-yellow-800 font-bold mb-1 tracking-widest"><i class="fa-solid fa-hand-holding-heart mr-1 text-yellow-700"></i> Banked Favors</label>
                            <div class="flex gap-2">
                                <select id="dt-relig-favor-select" onchange="window.appActions.updateReligiousServiceMath('favor')" class="flex-grow p-2 border border-yellow-300 rounded-sm text-sm font-bold text-yellow-900 outline-none focus:border-yellow-600 bg-yellow-50 shadow-inner">
                                    <option value="new">-- Perform New Service --</option>
                                    <!-- Populated dynamically via JS -->
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- NEW SERVICE CONFIGURATION                  -->
                    <!-- ========================================== -->
                    <div id="dt-relig-new-config" class="transition-all duration-300">
                        <!-- Details -->
                        <div class="bg-white p-4 border border-[#d4c5a9] rounded-sm shadow-sm mb-5 space-y-4">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest flex justify-between">
                                    <span>Patron Deity</span>
                                    <span id="dt-relig-align-hint" class="text-[9px] text-stone-400 italic font-normal">Filtered by Alignment</span>
                                </label>
                                <select id="dt-relig-deity" onchange="window.appActions.updateReligiousServiceMath('deity')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-stone-50 shadow-inner">
                                    <!-- Populated dynamically via JS -->
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
                        <h3 class="text-xs sm:text-sm font-bold text-stone-800 font-serif mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-dice mr-2 text-stone-500"></i> Ability Check Modifiers</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-stone-50 p-4 border border-[#d4c5a9] rounded-sm shadow-inner">
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest" title="Determines Maximum Banked Favors">Charisma Modifier</label>
                                <div class="flex items-center">
                                    <span class="bg-stone-200 border border-r-0 border-[#d4c5a9] px-2 py-2 text-sm font-bold text-stone-600 rounded-l-sm">+</span>
                                    <input type="number" id="dt-relig-cha-mod" value="0" oninput="window.appActions.updateReligiousServiceMath('input')" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-inner text-center">
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Skill to Use</label>
                                <select id="dt-relig-skill" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-yellow-600 bg-white shadow-sm">
                                    <option value="rel">Intelligence (Religion)</option>
                                    <option value="per">Charisma (Persuasion)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest" title="Used for the actual roll">Skill Modifier</label>
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
                                <span id="dt-relig-potential-out" class="text-xl font-bold text-yellow-500">Up to 2 <span class="text-[10px] text-stone-400 font-normal ml-1">(Cap: 1)</span></span>
                            </div>
                            <div class="text-right border-l-2 border-stone-800 pl-4">
                                <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
                                <span class="text-sm font-bold text-stone-300">5 Days</span>
                            </div>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- EXPEND FAVOR CONFIGURATION                 -->
                    <!-- ========================================== -->
                    <div id="dt-relig-expend-config" class="hidden transition-all duration-300">
                        <div class="bg-white border border-[#d4c5a9] rounded-sm p-4 shadow-sm mb-5">
                            <h3 class="font-serif font-bold text-yellow-900 text-lg mb-2 flex items-center border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-hand-sparkles mr-2 text-yellow-700"></i> Call in a Favor</h3>
                            <p class="text-stone-700 text-sm font-bold mb-1">Patron: <span id="dt-relig-expend-patron" class="font-serif font-normal text-stone-600 italic">Unknown</span></p>
                            <p class="text-stone-700 text-sm font-bold mb-4">Date Earned: <span id="dt-relig-expend-date" class="font-serif font-normal text-stone-600 italic">Unknown</span></p>
                            
                            <div class="bg-yellow-50 border border-yellow-200 p-3 rounded-sm shadow-inner">
                                <label class="block text-[10px] uppercase font-bold text-yellow-800 tracking-widest mb-1.5"><i class="fa-solid fa-feather mr-1"></i> Describe the Request</label>
                                <textarea id="dt-relig-expend-desc" class="w-full p-2 border border-yellow-300 rounded-sm text-sm font-serif outline-none focus:border-yellow-600 bg-white h-24 custom-scrollbar resize-none placeholder:italic" placeholder="e.g. Requesting a minor healing spell, political backing, or sanctuary..."></textarea>
                                <p class="text-[9px] text-yellow-700 italic mt-1.5 leading-snug">Expending a favor is an instant narrative action and does not cost downtime days.</p>
                            </div>
                        </div>
                    </div>
                    <!-- ========================================== -->

                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cancel</button>
                    <button id="dt-relig-submit-btn" onclick="window.appActions.executeReligiousService('new')" class="px-5 py-2 bg-blue-900 text-amber-50 rounded-sm hover:bg-blue-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-hands-praying mr-2"></i> Perform Service</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.appActions.updateReligiousServiceMath('init');
    }, 50);
};

export const updateReligiousServiceMath = (triggerSource = 'input') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const pcId = document.getElementById('dt-relig-pc')?.value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const favorSelect = document.getElementById('dt-relig-favor-select');
    const newConfigDiv = document.getElementById('dt-relig-new-config');
    const expendConfigDiv = document.getElementById('dt-relig-expend-config');
    const submitBtn = document.getElementById('dt-relig-submit-btn');

    // 1. Rebuild Deity Options based on Alignment (if PC changed or Init)
    if (triggerSource === 'pc' || triggerSource === 'init') {
        const charAlignment = pc.alignment || "Not Set";
        
        // Aggressively clean the alignment string: remove spaces, punctuation, and lowercase it
        const cleanAlign = charAlignment.toLowerCase().replace(/[^a-z]/g, '');

        const alignmentAbbr = { 
            'lawfulgood': 'LG', 'lg': 'LG',
            'neutralgood': 'NG', 'ng': 'NG',
            'chaoticgood': 'CG', 'cg': 'CG',
            'lawfulneutral': 'LN', 'ln': 'LN',
            'neutral': 'N', 'trueneutral': 'N', 'n': 'N',
            'chaoticneutral': 'CN', 'cn': 'CN',
            'lawfulevil': 'LE', 'le': 'LE',
            'neutralevil': 'NE', 'ne': 'NE',
            'chaoticevil': 'CE', 'ce': 'CE'
        };
        const alignmentSteps = { 'LG': ['LG', 'NG', 'LN'], 'NG': ['LG', 'NG', 'CG', 'N'], 'CG': ['NG', 'CG', 'CN'], 'LN': ['LG', 'LN', 'LE', 'N'], 'N': ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'], 'CN': ['CG', 'N', 'CN', 'CE'], 'LE': ['LN', 'LE', 'NE'], 'NE': ['LE', 'NE', 'CE', 'N'], 'CE': ['NE', 'CE', 'CN'] };
        
        const abbr = alignmentAbbr[cleanAlign];
        let pantheonsToShow = DEITY_PANTHEONS;
        let hintText = "Filtered by Alignment";

        if (abbr && alignmentSteps[abbr]) {
            const allowed = alignmentSteps[abbr];
            pantheonsToShow = {};
            for (const pName in DEITY_PANTHEONS) {
                const filtered = DEITY_PANTHEONS[pName].filter(d => allowed.includes(d.alignment));
                if (filtered.length > 0) pantheonsToShow[pName] = filtered;
            }
        } else {
            hintText = "Showing All (Unknown Alignment)";
        }

        const hintEl = document.getElementById('dt-relig-align-hint');
        if (hintEl) hintEl.textContent = hintText;

        let deityOptionsHtml = '';
        for (const pantheonName in pantheonsToShow) {
            deityOptionsHtml += `<optgroup label="--- ${pantheonName} ---">`;
            deityOptionsHtml += pantheonsToShow[pantheonName].map(d => `<option value="${d.name}">${d.name}, ${d.title} (${d.alignment} - ${d.domains})</option>`).join('');
            deityOptionsHtml += `</optgroup>`;
        }
        deityOptionsHtml += `<option value="other">-- Custom / Unlisted Patron --</option>`;
        
        const deitySelect = document.getElementById('dt-relig-deity');
        if (deitySelect) {
            // Try to preserve current selection if it still exists in the filtered list safely
            const currentVal = deitySelect.value;
            deitySelect.innerHTML = deityOptionsHtml;
            
            const optionExists = Array.from(deitySelect.options).some(opt => opt.value === currentVal);
            if (currentVal && optionExists) {
                deitySelect.value = currentVal;
            }
        }
    }

    // 2. Auto-fill Temple & Service Description
    const deitySelect = document.getElementById('dt-relig-deity');
    const customGroup = document.getElementById('dt-relig-custom-group');
    const templeInput = document.getElementById('dt-relig-temple');
    const descInput = document.getElementById('dt-relig-desc');

    if (deitySelect && customGroup && templeInput && descInput) {
        const deityName = deitySelect.value;
        const shouldAutoFill = ['deity', 'pc', 'init'].includes(triggerSource);
        
        if (deityName === 'other') {
            customGroup.classList.remove('hidden');
            if (shouldAutoFill) {
                templeInput.value = "";
                descInput.value = "";
            }
            templeInput.placeholder = "Enter temple name...";
            descInput.placeholder = "Describe the custom service...";
        } else {
            customGroup.classList.add('hidden');
            const allDeities = Object.values(DEITY_PANTHEONS).flat();
            const deity = allDeities.find(d => d.name === deityName);
            
            if (deity && shouldAutoFill) {
                templeInput.value = deity.temple;
                descInput.value = deity.service;
            }
        }
    }

    // 3. Rebuild Banked Favors Dropdown
    const favors = pc.religiousFavors || [];
    if (triggerSource === 'pc' || triggerSource === 'init') {
        let fHtml = `<option value="new">-- Perform New Service --</option>`;
        favors.forEach(f => {
            const dateStr = new Date(f.timestamp).toLocaleDateString();
            fHtml += `<option value="${f.id}">Favor: ${f.patron} (${dateStr})</option>`;
        });
        if (favorSelect) favorSelect.innerHTML = fHtml;
    }

    // 4. Toggle Modes (New vs Expend)
    const favorId = favorSelect?.value;
    const isExpending = favorId !== 'new';

    if (isExpending) {
        newConfigDiv.classList.add('hidden');
        expendConfigDiv.classList.remove('hidden');
        
        const fTarget = favors.find(f => f.id === favorId);
        if (fTarget) {
            document.getElementById('dt-relig-expend-patron').textContent = fTarget.patron;
            document.getElementById('dt-relig-expend-date').textContent = new Date(fTarget.timestamp).toLocaleDateString();
        }

        if (submitBtn) {
            submitBtn.innerHTML = `<i class="fa-solid fa-hand-sparkles mr-2"></i> Expend Favor`;
            submitBtn.className = submitBtn.className.replace('bg-blue-900', 'bg-yellow-700').replace('hover:bg-blue-800', 'hover:bg-yellow-600');
            submitBtn.onclick = () => window.appActions.executeReligiousService('expend');
        }
    } else {
        newConfigDiv.classList.remove('hidden');
        expendConfigDiv.classList.add('hidden');

        if (submitBtn) {
            submitBtn.innerHTML = `<i class="fa-solid fa-hands-praying mr-2"></i> Perform Service`;
            submitBtn.className = submitBtn.className.replace('bg-yellow-700', 'bg-blue-900').replace('hover:bg-yellow-600', 'hover:bg-blue-800');
            submitBtn.onclick = () => window.appActions.executeReligiousService('new');
        }

        // Live Math (Charisma Cap)
        const chaMod = parseInt(document.getElementById('dt-relig-cha-mod')?.value) || 0;
        const maxFavors = Math.max(1, 1 + chaMod);
        const currentCount = favors.length;
        
        const potOut = document.getElementById('dt-relig-potential-out');
        if (potOut) {
            let capWarn = '';
            if (currentCount >= maxFavors) capWarn = `<span class="text-red-500 font-normal ml-1 text-[10px] uppercase">(Bank Full)</span>`;
            else capWarn = `<span class="text-stone-400 font-normal ml-1 text-[10px] uppercase">(Bank: ${currentCount}/${maxFavors})</span>`;
            
            potOut.innerHTML = `Up to 2 ${capWarn}`;
        }
    }
};

export const executeReligiousService = async (actionType = 'new') => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const myUid = window.appData.currentUserUid;
    if (!camp) return;

    const pcId = document.getElementById('dt-relig-pc').value;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const favorId = document.getElementById('dt-relig-favor-select').value;
    const isExpending = favorId !== 'new';
    
    let logAddition = "";
    let daysToDeduct = 0;
    let favorsArray = [...(pc.religiousFavors || [])];

    if (isExpending) {
        // --- PROCESS FAVOR EXPENDITURE ---
        const fTargetIndex = favorsArray.findIndex(f => f.id === favorId);
        if (fTargetIndex === -1) return;
        const fTarget = favorsArray[fTargetIndex];

        const requestDesc = document.getElementById('dt-relig-expend-desc').value.trim();
        if (!requestDesc) {
            notify("Please describe the favor you are requesting.", "error");
            return;
        }

        if (!confirm(`Are you sure you want to permanently expend your favor from ${fTarget.patron}?`)) return;

        // Remove favor
        favorsArray.splice(fTargetIndex, 1);
        daysToDeduct = 0; // Narrative action

        const resText = `**Downtime: Favor Expended**\n*Hero:* ${pc.name}\n\n**Patron:** ${fTarget.patron}\n**Request:** *${requestDesc}*\n\n✅ **Favor Called In!**\nYou successfully cashed in your influence with the temple. You now have ${favorsArray.length} banked favor(s) remaining.`;

        const timestampStr = new Date().toLocaleDateString();
        logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${resText}`;

    } else {
        // --- PROCESS NEW SERVICE ---
        daysToDeduct = 5;

        if ((parseInt(pc.availableDowntime) || 0) < daysToDeduct) {
            notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
            return;
        }

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
        
        const chaMod = parseInt(document.getElementById('dt-relig-cha-mod').value) || 0;
        const maxFavors = Math.max(1, 1 + chaMod);

        const skillVal = document.getElementById('dt-relig-skill').value;
        const skillName = skillVal === 'rel' ? "Religion" : "Persuasion";
        const modifier = parseInt(document.getElementById('dt-relig-mod').value) || 0;

        // --- MATH EXECUTION ---
        const d20 = Math.floor(Math.random() * 20) + 1;
        const checkTotal = d20 + modifier;
        
        let favorsRolled = 0;
        if (checkTotal >= 21) favorsRolled = 2;
        else if (checkTotal >= 11) favorsRolled = 1;

        let actualGained = 0;
        let wasted = 0;
        let currentBanked = favorsArray.length;

        for (let i = 0; i < favorsRolled; i++) {
            if (currentBanked + actualGained < maxFavors) {
                favorsArray.push({
                    id: generateId(),
                    patron: patron,
                    timestamp: Date.now()
                });
                actualGained++;
            } else {
                wasted++;
            }
        }

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
            complicationText = `\n\n**⚠️ Complication Occurred!** (${d100}/100)\n> *Result (d6=${d6}):* ${compTable[d6 - 1]}`;
        } else {
            complicationText = `\n\n*Your service proceeds without incident (${d100}/100).*`;
        }

        let resultBody = ``;
        if (actualGained > 0) {
            resultBody += `✅ **Favor Gained!**\nYou earned **${actualGained} Banked Favor(s)** from ${patron}.\n`;
        }
        if (wasted > 0) {
            resultBody += `⚠️ **Limit Reached:** You earned ${wasted} more potential favor(s), but your influence at the temple is already at its peak! (Cap: ${maxFavors}).\n`;
        }
        if (favorsRolled === 0) {
            resultBody += `❌ **No Favor Gained**\nYour efforts failed to make a lasting impression on the temple leadership, and you gain no new favors.\n`;
        }

        const noteText = `**Downtime: Religious Service**\n*Hero:* ${pc.name}\n\n**Patron:** ${patron}\n**Service:** *${desc}*\n**Time Spent:** 5 Days\n\n**${skillName} Check:** ${checkTotal} (Rolled ${d20} ${modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`})\n\n${resultBody}${complicationText}`;

        const timestampStr = new Date().toLocaleDateString();
        logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;
    }

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            religiousFavors: favorsArray,
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - daysToDeduct),
            downtimeLog: (p.downtimeLog || '') + logAddition
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    
    if (isExpending) {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `called in a religious favor for <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hand-sparkles');
    } else {
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime performing religious service with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-hands-praying');
    }

    await saveCampaign(updatedCamp);
    
    document.getElementById('global-popup-container').innerHTML = '';
    
    if (isExpending) notify(`Favor expended successfully. Log saved.`, "success");
    else notify(`Service resolved. 5 days deducted. Log saved.`, "success");
    
    reRender();
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openReligiousServiceModal = openReligiousServiceModal;
    window.appActions.updateReligiousServiceMath = updateReligiousServiceMath;
    window.appActions.executeReligiousService = executeReligiousService;
}
