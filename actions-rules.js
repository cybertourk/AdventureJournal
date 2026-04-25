import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

export const openRulesGlossary = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    // Initialize with an example rule if the array doesn't exist yet
    if (!camp.rulesGlossary) {
        camp.rulesGlossary = [
            {
                id: generateId(),
                name: "Grappling",
                text: "When you want to grab a creature or wrestle with it, you can use the Attack action to make a Special melee attack, a grapple. If you're able to make multiple attacks with the Attack action, this attack replaces one of them.\n\nThe target of your grapple must be no more than one size larger than you and must be within your reach. Using at least one free hand, you try to seize the target by making a grapple check instead of an attack roll: a **Strength (Athletics)** check contested by the target's **Strength (Athletics)** or **Dexterity (Acrobatics)** check (the target chooses the ability to use).\n\nIf you succeed, you subject the target to the grappled condition.",
                authorId: camp.dmId
            }
        ];
        await saveCampaign(camp);
    }

    window.appActions.setView('rules');
};

export const openRuleModal = (ruleId = null) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    let rule = null;
    if (ruleId) {
        rule = (camp.rulesGlossary || []).find(r => r.id === ruleId);
    }

    const isNew = !rule;
    const id = isNew ? generateId() : rule.id;
    const name = isNew ? '' : rule.name;
    const text = isNew ? '' : rule.text;

    const container = document.getElementById('global-popup-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[13000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-stone-900 p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-scale-balanced text-amber-500 text-xl"></i>
                        <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">${isNew ? 'Scribe New Rule' : 'Amend Rule'}</h2>
                    </div>
                    <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="text-stone-400 hover:text-red-400 transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <input type="hidden" id="rule-modal-id" value="${id}">
                    
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Rule Title / Topic</label>
                        <input type="text" id="rule-modal-name" value="${name.replace(/"/g, '&quot;')}" class="w-full bg-white text-stone-900 border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner focus:border-amber-600" placeholder="e.g. Fall Damage">
                    </div>

                    <div class="mb-2">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Rule Description</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9]">
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'bold')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'italic')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('rule-modal-text', 'list')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                            </div>
                        </div>
                        <textarea id="rule-modal-text" class="w-full h-64 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-amber-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-serif" placeholder="Explain the mechanics or rulings... Codex names link automatically." oninput="window.appActions.handleSmartInput(this)">${text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>
                </div>

                <div class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex justify-between gap-3">
                    <div>
                        ${!isNew ? `<button onclick="window.appActions.deleteRule('${id}')" class="px-4 py-2 text-stone-500 hover:text-red-700 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-sm transition flex items-center"><i class="fa-solid fa-trash mr-1"></i> Erase</button>` : '<div></div>'}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveRule()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Rule</button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const saveRule = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const id = document.getElementById('rule-modal-id').value;
    const name = document.getElementById('rule-modal-name').value.trim();
    const text = document.getElementById('rule-modal-text').value.trim();

    if (!name) {
        notify("The rule must have a title.", "error");
        return;
    }

    const isNew = !(camp.rulesGlossary || []).some(r => r.id === id);
    const myUid = window.appData.currentUserUid;

    const newRule = {
        id: id,
        name: name,
        text: text,
        authorId: isNew ? myUid : ((camp.rulesGlossary || []).find(r => r.id === id)?.authorId || myUid)
    };

    const newGlossary = isNew 
        ? [...(camp.rulesGlossary || []), newRule]
        : camp.rulesGlossary.map(r => r.id === id ? newRule : r);

    camp.rulesGlossary = newGlossary;
    await saveCampaign(camp);

    document.getElementById('global-popup-container').innerHTML = '';
    notify("Rule inscribed.", "success");
    reRender();
};

export const deleteRule = async (id) => {
    if (!confirm("Are you sure you want to permanently erase this rule?")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp || !camp.rulesGlossary) return;

    camp.rulesGlossary = camp.rulesGlossary.filter(r => r.id !== id);
    await saveCampaign(camp);

    document.getElementById('global-popup-container').innerHTML = '';
    notify("Rule erased.", "success");
    reRender();
};
