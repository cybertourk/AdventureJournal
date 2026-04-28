import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';

export const openRulesGlossary = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    // Initialize with example rules if the array doesn't exist yet
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
    
    // Initialize calculators after a tiny delay to ensure the DOM is rendered
    setTimeout(() => {
        if (window.appActions.calculateTravel) window.appActions.calculateTravel();
        if (window.appActions.calculateEncumbrance) window.appActions.calculateEncumbrance();
        if (window.appActions.calculateJump) window.appActions.calculateJump();
    }, 50);
};

export const viewRule = (ruleId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const rule = (camp.rulesGlossary || []).find(r => r.id === ruleId);
    if (!rule) {
        notify("Rule not found.", "error");
        return;
    }

    const isDM = camp._isDM;
    const myUid = window.appData.currentUserUid;
    const canEdit = isDM || rule.authorId === myUid;
    
    // Parse formatting and auto-links for the reading view
    const parsedText = window.appActions.parseSmartText(rule.text);

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[13000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-scale-balanced text-amber-500 text-xl"></i>
                        <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">${rule.name}</h2>
                    </div>
                    <div class="flex gap-2">
                        ${canEdit ? `<button onclick="window.appActions.openRuleModal('${rule.id}')" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center" title="Amend Rule"><i class="fa-solid fa-pen-nib"></i></button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>

                <!-- Body View -->
                <div class="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                    <div class="text-stone-800 text-base font-serif leading-relaxed">
                        ${parsedText}
                    </div>
                </div>
            </div>
        </div>
    `;
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

// --- PINNED UTILITY CALCULATORS ---

export const updateTravelPresets = () => {
    const modeEl = document.getElementById('calc-travel-mode');
    const speedEl = document.getElementById('calc-travel-speed');
    const hoursEl = document.getElementById('calc-travel-hours');
    const diffEl = document.getElementById('calc-travel-difficult');
    const helpEl = document.getElementById('calc-travel-speed-help');

    if (!modeEl || !speedEl || !hoursEl || !diffEl) return;

    const mode = modeEl.value;

    if (mode === 'foot') {
        speedEl.value = 30;
        speedEl.disabled = true;
        speedEl.classList.add('opacity-50');
        hoursEl.value = 8;
        diffEl.disabled = false;
        if (helpEl) helpEl.textContent = "Standard travel ignores individual speed (PHB p.181).";
    } else if (mode === 'mount') {
        speedEl.value = 60; // Riding horse defaults to 60
        speedEl.disabled = false;
        speedEl.classList.remove('opacity-50');
        hoursEl.value = 8;
        diffEl.disabled = false;
        if (helpEl) helpEl.textContent = "Base speed of the mount (e.g., Riding Horse = 60ft).";
    } else if (mode === 'water') {
        speedEl.value = 20; // Sailing ship defaults to 20
        speedEl.disabled = false;
        speedEl.classList.remove('opacity-50');
        hoursEl.value = 24; 
        diffEl.checked = false;
        diffEl.disabled = true; 
        if (helpEl) helpEl.textContent = "Water vessels travel 24 hours/day and ignore paces (DMG p.119).";
    } else if (mode === 'flying') {
        speedEl.value = 80; // Griffon defaults to 80
        speedEl.disabled = false;
        speedEl.classList.remove('opacity-50');
        hoursEl.value = 8;
        diffEl.checked = false;
        diffEl.disabled = true; 
        if (helpEl) helpEl.textContent = "Flying generally ignores difficult terrain and obstacles.";
    }
};

export const calculateTravel = () => {
    const modeEl = document.getElementById('calc-travel-mode');
    const speedEl = document.getElementById('calc-travel-speed');
    const hoursEl = document.getElementById('calc-travel-hours');
    const diffEl = document.getElementById('calc-travel-difficult');
    
    const rowFast = document.getElementById('row-travel-fast');
    const rowSlow = document.getElementById('row-travel-slow');
    const resNormalDesc = document.getElementById('res-travel-normal-desc');
    const extraEl = document.getElementById('res-travel-extra');

    if (!modeEl || !speedEl || !hoursEl || !diffEl) return;

    const mode = modeEl.value; 
    const speed = parseFloat(speedEl.value) || 0;
    const hours = parseFloat(hoursEl.value) || 0;
    const isDifficult = diffEl.checked && !diffEl.disabled;

    let normalMph = 0;
    let fastMph = 0;
    let slowMph = 0;
    let showFastSlow = true;

    // Reset UI visibility
    if (rowFast) rowFast.classList.remove('hidden');
    if (rowSlow) rowSlow.classList.remove('hidden');
    if (extraEl) { extraEl.classList.add('hidden'); extraEl.innerHTML = ''; }
    if (resNormalDesc) resNormalDesc.textContent = "Standard travel";

    if (mode === 'foot') {
        // Standard PHB Overland Math ignores walking speed entirely
        normalMph = 3;
        fastMph = 4;
        slowMph = 2;
    } else if (mode === 'water') {
        // Ships ignore fast/slow pace completely (PHB 181)
        normalMph = speed / 10;
        fastMph = normalMph;
        slowMph = normalMph;
        showFastSlow = false;
        
        if (rowFast) rowFast.classList.add('hidden');
        if (rowSlow) rowSlow.classList.add('hidden');
        if (resNormalDesc) resNormalDesc.textContent = "Vessel speed (ignores paces)";
    } else {
        // Mounts / Flying (Special DMG Math: 1 hour = Speed / 10 miles)
        normalMph = speed / 10;
        fastMph = normalMph * (4/3);
        slowMph = normalMph * (2/3);

        if (mode === 'mount') {
            if (extraEl) {
                extraEl.classList.remove('hidden');
                extraEl.innerHTML = `<i class="fa-solid fa-horse mr-1 text-amber-700"></i> <span class="font-bold text-amber-900">Gallop:</span> A mounted character can ride at a gallop for 1 hour, covering twice the usual distance for a fast pace (<strong>${Math.round(fastMph * 2)} miles</strong>).`;
            }
        }
    }

    if (isDifficult) {
        normalMph /= 2;
        fastMph /= 2;
        slowMph /= 2;
    }

    const formatDist = (val) => Number.isInteger(val) ? val.toString() : val.toFixed(1);

    document.getElementById('res-travel-normal').textContent = `${formatDist(normalMph * hours)} miles`;
    if (showFastSlow) {
        document.getElementById('res-travel-fast').textContent = `${formatDist(fastMph * hours)} miles`;
        document.getElementById('res-travel-slow').textContent = `${formatDist(slowMph * hours)} miles`;
    }

    // Forced March Warning
    const warnEl = document.getElementById('res-travel-exhaustion');
    const dcEl = document.getElementById('res-travel-dc');
    
    // Ships don't cause forced march for passengers. Flying/Mounts usually don't either, but the mounts themselves might exhaust!
    if (hours > 8 && mode !== 'water') {
        warnEl.classList.remove('hidden');
        if (dcEl) dcEl.textContent = 10 + Math.floor(hours - 8);
    } else {
        warnEl.classList.add('hidden');
    }
};

export const calculateEncumbrance = () => {
    const strEl = document.getElementById('calc-enc-str');
    const sizeEl = document.getElementById('calc-enc-size');
    const coinsEl = document.getElementById('calc-enc-coins');
    
    if (!strEl || !sizeEl || !coinsEl) return;

    const str = parseInt(strEl.value) || 0;
    const sizeMult = parseInt(sizeEl.value) || 1;
    const coins = parseInt(coinsEl.value) || 0;

    // Update coin weight purely for display
    const coinWeight = coins / 50;
    document.getElementById('res-coin-weight').textContent = Number.isInteger(coinWeight) ? coinWeight : coinWeight.toFixed(2);

    // Standard Math
    const maxCarry = str * 15 * sizeMult;
    const dragLift = str * 30 * sizeMult;
    document.getElementById('res-enc-standard').textContent = `${maxCarry} lbs`;
    document.getElementById('res-enc-drag').textContent = `${dragLift} lbs`;

    // Variant Math
    const varLight = str * 5 * sizeMult;
    const varHeavy = str * 10 * sizeMult;
    document.getElementById('res-var-light').textContent = `0 to ${varLight} lbs`;
    document.getElementById('res-var-heavy').textContent = `${varLight + 1} to ${varHeavy} lbs`;
    document.getElementById('res-var-max').textContent = `${varHeavy + 1} to ${maxCarry} lbs`;
};

export const calculateJump = () => {
    const strEl = document.getElementById('calc-jump-str');
    const heightEl = document.getElementById('calc-jump-height');

    if (!strEl || !heightEl) return;

    const str = parseInt(strEl.value) || 0;
    const height = parseFloat(heightEl.value) || 0;
    const strMod = Math.floor((str - 10) / 2);

    // Long Jump
    const longRun = str;
    const longStand = Math.max(0, Math.floor(str / 2));

    // High Jump
    const highRun = Math.max(0, 3 + strMod);
    const highStand = Math.max(0, Math.floor((3 + strMod) / 2));
    
    // Reach
    const reach = highRun + (1.5 * height);

    document.getElementById('res-jump-long-run').textContent = `${longRun} ft`;
    document.getElementById('res-jump-long-stand').textContent = `${longStand} ft`;
    
    document.getElementById('res-jump-high-run').textContent = `${highRun} ft`;
    document.getElementById('res-jump-high-stand').textContent = `${highStand} ft`;
    
    document.getElementById('res-jump-high-reach').textContent = `${Number.isInteger(reach) ? reach : reach.toFixed(1)} ft`;
};
