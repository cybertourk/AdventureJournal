import { updateDerivedState } from './state.js';

// ============================================================================
// --- DOWNTIME MENU HUB ---
// ============================================================================

const DOWNTIME_ACTIVITIES = {
    "Buying a Magic Item": { icon: "fa-gem", desc: "Seek out and purchase magic items.", action: "openBuyMagicItemModal" },
    "Carousing": { icon: "fa-beer-mug-empty", desc: "Socialize and make new contacts.", action: "openCarousingModal" },
    "Crafting an Item": { icon: "fa-hammer", desc: "Create nonmagical or magical items.", action: "openCraftingModal" },
    "Crime": { icon: "fa-mask", desc: "Attempt illicit activities for profit.", action: "openCrimeModal" },
    "Gambling": { icon: "fa-dice", desc: "Play games of chance to win or lose money.", action: "openGamblingModal" },
    "Pit Fighting": { icon: "fa-hand-fist", desc: "Engage in combat to win prize money.", action: "openPitFightingModal" },
    "Relaxation": { icon: "fa-bed", desc: "Recover from injuries or stress.", action: "openRelaxationModal" },
    "Religious Service": { icon: "fa-hands-praying", desc: "Serve a temple to earn favors.", action: "openReligiousServiceModal" },
    "Research": { icon: "fa-book-open", desc: "Delve into lore about a specific topic.", action: "openResearchModal" },
    "Scribing a Spell Scroll": { icon: "fa-scroll", desc: "Transfer a spell to a scroll.", action: "openScribingModal" },
    "Selling a Magic Item": { icon: "fa-coins", desc: "Find a buyer for a magic item.", action: "openSellingModal" },
    "Training": { icon: "fa-dumbbell", desc: "Learn a new language or tool proficiency.", action: "openTrainingModal" },
    "Work": { icon: "fa-briefcase", desc: "Perform honest labor to earn a living.", action: "openWorkModal" },
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

                <p class="text-xs text-stone-600 italic mb-4 shrink-0 border-l-2 border-blue-500 pl-2">Select a downtime activity to automatically roll checks, deduct days, and log the results directly to your hero's Private Journal.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    ${activitiesHtml}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.openDowntimeMenu = openDowntimeMenu;
    
    window.appActions.comingSoon = () => {
        const { notify } = require('./firebase-manager.js');
        notify("This downtime activity is currently being forged.", "info");
    };
}
