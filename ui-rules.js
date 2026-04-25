export function getRulesHTML(state) {
    const camp = state.activeCampaign;
    if (!camp) return '';
    
    const rules = camp.rulesGlossary || [];
    
    // Sort rules alphabetically by name
    const sortedRules = [...rules].sort((a, b) => a.name.localeCompare(b.name));

    let html = `
    <div class="animate-in fade-in duration-300 max-w-5xl mx-auto pb-20">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Rules Glossary</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 italic flex items-center">
                    <i class="fa-solid fa-scale-balanced mr-2"></i> Frequently referenced mechanics and rulings
                </p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <div class="relative flex-grow md:flex-grow-0">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 text-xs"></i>
                    <input type="text" id="rules-search" class="w-full md:w-48 pl-8 pr-3 py-2 bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-sm focus:outline-none focus:border-amber-600 shadow-inner placeholder-stone-600" placeholder="Search rules..." onkeyup="window.filterRules()">
                </div>
                <button onclick="window.appActions.openRuleModal()" class="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-stone-800 text-stone-300 border border-stone-600 rounded-sm hover:text-white hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-plus mr-2"></i> Scribe Rule
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" id="rules-grid">
    `;

    if (sortedRules.length === 0) {
        html += `
            <div class="col-span-full p-8 sm:p-12 text-center text-stone-500 bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-sm">
                <i class="fa-solid fa-scale-balanced text-4xl sm:text-6xl mx-auto text-stone-400 mb-3 sm:mb-4 opacity-50"></i>
                <p class="font-serif text-base sm:text-lg">The glossary is currently empty.</p>
                <p class="text-xs sm:text-sm mt-2 font-sans">Scribe rules to build a quick-reference library for your party.</p>
            </div>
        `;
    } else {
        sortedRules.forEach(rule => {
            html += `
            <div class="rule-card bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col hover:shadow-md transition relative group overflow-hidden cursor-pointer" data-search="${rule.name.toLowerCase()}" onclick="window.appActions.viewRule('${rule.id}')">
                <div class="absolute top-0 left-0 w-1 h-full bg-stone-400 group-hover:bg-amber-600 transition-colors z-20"></div>
                
                <div class="p-4 pl-5 sm:pl-6 flex items-center justify-between">
                    <h3 class="font-serif font-bold text-base sm:text-lg text-amber-900 truncate pr-4">${rule.name}</h3>
                    <i class="fa-solid fa-book-open text-stone-300 group-hover:text-amber-500 transition"></i>
                </div>
            </div>
            `;
        });
    }

    html += `
        </div>
    </div>
    `;
    
    return html;
}

// --- GLOBAL WINDOW BINDINGS FOR INLINE HTML ---

window.filterRules = function() {
    const input = document.getElementById('rules-search');
    if(!input) return;
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll('.rule-card');
    cards.forEach(card => {
        const searchData = card.getAttribute('data-search');
        if (searchData.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};
