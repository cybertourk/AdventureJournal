import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';
import { generateNpcData } from './actions-npc.js';

// --- DMG BUSINESS TYPE CONFIGURATIONS ---
export const BUSINESS_TYPES = {
    abbey: { label: "Abbey", cost: 20, skilled: 5, untrained: 25 },
    farm: { label: "Farm", cost: 0.5, skilled: 1, untrained: 2 },
    guildhall: { label: "Guildhall (Town/City)", cost: 5, skilled: 5, untrained: 3 },
    inn_rural: { label: "Inn (Rural Roadside)", cost: 10, skilled: 5, untrained: 10 },
    inn_town: { label: "Inn (Town/City)", cost: 5, skilled: 1, untrained: 5 },
    keep: { label: "Keep / Small Castle", cost: 100, skilled: 50, untrained: 50 },
    lodge: { label: "Hunting Lodge", cost: 0.5, skilled: 1, untrained: 0 },
    estate: { label: "Noble Estate", cost: 10, skilled: 3, untrained: 15 },
    outpost: { label: "Outpost / Fort", cost: 50, skilled: 20, untrained: 40 },
    palace: { label: "Palace / Large Castle", cost: 400, skilled: 200, untrained: 100 },
    shop: { label: "Shop", cost: 2, skilled: 1, untrained: 0 },
    temple_large: { label: "Temple (Large)", cost: 25, skilled: 10, untrained: 10 },
    temple_small: { label: "Temple (Small)", cost: 1, skilled: 2, untrained: 0 },
    tower: { label: "Fortified Tower", cost: 25, skilled: 10, untrained: 0 },
    trading_post: { label: "Trading Post", cost: 10, skilled: 4, untrained: 2 }
};

// --- HIRE PROPERTIES RESOLVER ---
export const getQualityInfo = (bonus, type) => {
    if (type === 'skilled') {
        if (bonus === -1) return { tier: "Poor", nextTier: "Average", nextBonus: 0, nextPay: 0, dc: 15 };
        if (bonus === 0) return { tier: "Average", nextTier: "Good", nextBonus: 2, nextPay: 1, dc: 20 };
        if (bonus === 2) return { tier: "Good", nextTier: "Excellent", nextBonus: 4, nextPay: 2, dc: 25 };
        if (bonus === 4) return { tier: "Excellent", dc: Infinity };
    } else { // untrained
        if (bonus === -1) return { tier: "Poor", nextTier: "Average", nextBonus: 0, nextPay: 0, dc: 15 };
        if (bonus === 0) return { tier: "Average", nextTier: "Good", nextBonus: 1, nextPay: 0.1, dc: 20 };
        if (bonus === 1) return { tier: "Good", nextTier: "Excellent", nextBonus: 2, nextPay: 0.2, dc: 25 };
        if (bonus === 2) return { tier: "Excellent", dc: Infinity };
    }
    return { tier: "Unknown", dc: Infinity };
};

// ============================================================================
// --- ENTRY POINT: PORTFOLIO SCREEN ---
// ============================================================================

export const openRunningBusinessModal = () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const myUid = window.appData.currentUserUid;
    const isDM = camp._isDM;

    const validPCs = (camp.playerCharacters || []).filter(pc => isDM || pc.playerId === myUid);
    if (validPCs.length === 0) { notify("You must enroll a hero before establishing a business.", "error"); return; }

    const container = document.getElementById('global-popup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-store mr-2 text-amber-400"></i> Business Portfolio</h2>
                    <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    <div class="mb-5">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Owner Hero</label>
                        <select id="dt-business-pc-select" onchange="window.appActions.renderBusinessPortfolio(this.value)" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                            ${validPCs.map(pc => `<option value="${pc.id}">${pc.name} (${parseInt(pc.availableDowntime) || 0} Days)</option>`).join('')}
                        </select>
                    </div>

                    <div id="dt-portfolio-list-wrapper" class="space-y-4">
                        <!-- Populated dynamically via JS -->
                    </div>
                </div>

                <div class="bg-[#e8dec7] p-4 border-t border-[#d4c5a9] flex justify-between gap-2 shrink-0 z-10 shadow-sm">
                    <button onclick="window.appActions.openDowntimeMenu()" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Main Menu</button>
                    <button onclick="window.appActions.openEstablishBusinessModal()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-plus mr-2"></i> Establish Business</button>
                </div>
            </div>
        </div>
    `;

    // Bind execution to global app actions
    window.appActions.renderBusinessPortfolio = renderBusinessPortfolio;
    window.appActions.openEstablishBusinessModal = openEstablishBusinessModal;
    window.appActions.establishNewBusiness = establishNewBusiness;
    window.appActions.openRosterModal = openRosterModal;
    window.appActions.openBusinessDetailsModal = openBusinessDetailsModal;
    window.appActions.saveBusinessDetails = saveBusinessDetails;
    window.appActions.demolishBusiness = demolishBusiness;
    window.appActions.openHireModal = openHireModal;
    window.appActions.rollRandomNPCForHire = rollRandomNPCForHire;
    window.appActions.finalizeHire = finalizeHire;
    window.appActions.fireWorker = fireWorker;
    window.appActions.openTrainWorkerModal = openTrainWorkerModal;
    window.appActions.executeTrainingSession = executeTrainingSession;
    window.appActions.openRunBusinessModal = openRunBusinessModal;
    window.appActions.updateRunBusinessMath = updateRunBusinessMath;
    window.appActions.executeRunBusiness = executeRunBusiness;
    window.appActions.rollBusinessComplication = rollBusinessComplication;
    window.appActions.resolveComplicationChoice = resolveComplicationChoice;
    window.appActions.openBusinessDebtsModal = openBusinessDebtsModal;
    window.appActions.payBusinessDebt = payBusinessDebt;
    window.appActions.showHirelingFullProfile = showHirelingFullProfile;

    setTimeout(() => {
        const select = document.getElementById('dt-business-pc-select');
        if (select) window.appActions.renderBusinessPortfolio(select.value);
    }, 50);
};

export const renderBusinessPortfolio = (pcId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    const wrapper = document.getElementById('dt-portfolio-list-wrapper');
    if (!pc || !wrapper) return;

    const businesses = pc.businesses || {};
    const businessList = Object.values(businesses);

    if (businessList.length === 0) {
        wrapper.innerHTML = `
            <div class="text-center p-8 bg-stone-50 border border-dashed border-[#d4c5a9] rounded-sm shadow-inner">
                <i class="fa-solid fa-store text-4xl text-stone-300 mb-3"></i>
                <p class="text-sm font-serif italic text-stone-600">This hero currently does not own any commercial enterprises.</p>
            </div>
        `;
        return;
    }

    let html = '';
    businessList.forEach(biz => {
        const typeInfo = BUSINESS_TYPES[biz.type] || { label: "Business", cost: 0, skilled: 0, untrained: 0 };
        const skilledHired = Object.keys(biz.hirelings?.skilled || {}).length;
        const untrainedHired = Object.keys(biz.hirelings?.untrained || {}).length;
        
        const isStaffed = skilledHired >= typeInfo.skilled && untrainedHired >= typeInfo.untrained;
        const statusBadge = isStaffed 
            ? `<span class="bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-users mr-1"></i> Fully Staffed</span>`
            : `<span class="bg-red-100 border border-red-300 text-red-800 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Understaffed</span>`;

        const activeDebts = Object.values(pc.businessDebts || {}).filter(d => d.businessId === biz.id);
        const debtBadge = activeDebts.length > 0
            ? `<span class="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap"><i class="fa-solid fa-file-invoice-dollar mr-1"></i> ${activeDebts.length} Unpaid Debt(s)</span>`
            : '';

        html += `
            <div class="bg-white border border-[#d4c5a9] rounded-sm p-4 shadow-sm hover:border-amber-400 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="min-w-0 flex-grow">
                    <h3 class="font-serif font-bold text-base text-stone-900 leading-tight">${biz.name}</h3>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-1">
                        ${typeInfo.label} <span class="mx-1">•</span> ${biz.location || "Traveling"}
                    </p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${statusBadge}
                        ${debtBadge}
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto shrink-0 flex-wrap justify-end">
                    <button onclick="window.appActions.openBusinessDetailsModal('${pcId}', '${biz.id}')" class="px-2.5 py-1.5 bg-stone-100 border border-stone-300 rounded hover:bg-stone-200 transition text-[10px] font-bold uppercase tracking-wider shadow-sm" title="Edit Business Details"><i class="fa-solid fa-gears"></i></button>
                    <button onclick="window.appActions.openRosterModal('${pcId}', '${biz.id}')" class="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded hover:bg-blue-100 transition text-[10px] font-bold uppercase tracking-wider shadow-sm"><i class="fa-solid fa-users mr-1.5"></i> Roster</button>
                    <button onclick="window.appActions.openRunBusinessModal('${pcId}', '${biz.id}')" class="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100 transition text-[10px] font-bold uppercase tracking-wider shadow-sm"><i class="fa-solid fa-dice-d20 mr-1.5"></i> Run</button>
                </div>
            </div>
        `;
    });

    wrapper.innerHTML = html;
};

// ============================================================================
// --- ESTABLISHING A BUSINESS ---
// ============================================================================

export const openEstablishBusinessModal = () => {
    const pcId = document.getElementById('dt-business-pc-select').value;
    const modal = document.createElement('div');
    modal.id = 'dt-biz-establish-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[19000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    let typeOptions = '';
    Object.entries(BUSINESS_TYPES).forEach(([key, value]) => {
        typeOptions += `<option value="${key}">${value.label} (${value.cost} gp/day Maint)</option>`;
    });

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-md w-full relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <h3 class="font-serif font-bold text-lg text-amber-900 mb-4 pb-2 border-b border-[#d4c5a9]"><i class="fa-solid fa-plus-circle mr-2"></i> Establish Business</h3>
            
            <input type="hidden" id="dt-biz-new-pc-id" value="${pcId}">
            <div class="space-y-4 mb-6">
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Business Name</label>
                    <input type="text" id="dt-biz-new-name" placeholder="e.g. Gilmore's Alchemy Shop" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Enterprise Type</label>
                    <select id="dt-biz-new-type" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-sm">
                        ${typeOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                    <input type="text" id="dt-biz-new-loc" placeholder="e.g. Waterdeep" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-[#d4c5a9]">
                <button onclick="document.getElementById('dt-biz-establish-modal').remove()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                <button onclick="window.appActions.establishNewBusiness()" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md">Establish</button>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const establishNewBusiness = async () => {
    const pcId = document.getElementById('dt-biz-new-pc-id').value;
    const name = document.getElementById('dt-biz-new-name').value.trim();
    const type = document.getElementById('dt-biz-new-type').value;
    const loc = document.getElementById('dt-biz-new-loc').value.trim();

    if (!name || !loc) {
        notify("Name and Location are required to register an enterprise.", "error");
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            const newId = 'biz_' + generateId();
            b[newId] = {
                id: newId,
                name,
                type,
                location: loc,
                description: "",
                reputation: "",
                openingDate: new Date().toLocaleDateString(),
                totalDaysWorked: 0,
                daysTowardsComplication: 0,
                hirelings: { skilled: {}, untrained: {} },
                modifiers: {}
            };
            return { ...p, businesses: b };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `established a new business: <span class="font-bold text-stone-900">${name}</span>.`, 'fa-store');

    await saveCampaign(updatedCamp);
    document.getElementById('dt-biz-establish-modal').remove();
    notify(`"${name}" successfully registered!`, "success");
    window.appActions.renderBusinessPortfolio(pcId);
};

// ============================================================================
// --- DETAILED OPTIONS & DETAILS EDITOR ---
// ============================================================================

export const openBusinessDetailsModal = (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const modal = document.createElement('div');
    modal.id = 'dt-biz-details-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[19000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <h3 class="font-serif font-bold text-lg text-amber-900 mb-4 pb-2 border-b border-[#d4c5a9] shrink-0"><i class="fa-solid fa-gears mr-2"></i> Business Details</h3>
            
            <div class="space-y-4 mb-6 overflow-y-auto custom-scrollbar flex-grow pr-2">
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Business Name</label>
                    <input type="text" id="dt-biz-edit-name" value="${biz.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Location</label>
                    <input type="text" id="dt-biz-edit-loc" value="${biz.location}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Reputation & Status</label>
                    <input type="text" id="dt-biz-edit-rep" value="${biz.reputation || ''}" placeholder="e.g. Well-known locally" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                </div>
                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Description</label>
                    <textarea id="dt-biz-edit-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none focus:border-amber-600 bg-white h-24 shadow-inner custom-scrollbar" placeholder="Atmosphere, target audience, local legends...">${biz.description || ''}</textarea>
                </div>
            </div>

            <div class="flex justify-between gap-2 pt-3 border-t border-[#d4c5a9] shrink-0">
                <button onclick="window.appActions.demolishBusiness('${pcId}', '${bizId}')" class="px-3 py-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 transition rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center shrink-0"><i class="fa-solid fa-trash mr-1.5"></i> Demolish</button>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('dt-biz-details-modal').remove()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                    <button onclick="window.appActions.saveBusinessDetails('${pcId}', '${bizId}')" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const saveBusinessDetails = async (pcId, bizId) => {
    const name = document.getElementById('dt-biz-edit-name').value.trim();
    const loc = document.getElementById('dt-biz-edit-loc').value.trim();
    const rep = document.getElementById('dt-biz-edit-rep').value.trim();
    const desc = document.getElementById('dt-biz-edit-desc').value.trim();

    if (!name || !loc) {
        notify("Name and Location are required fields.", "error");
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            if (b[bizId]) {
                b[bizId] = { ...b[bizId], name, location: loc, reputation: rep, description: desc };
            }
            return { ...p, businesses: b };
        }
        return p;
    });

    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    document.getElementById('dt-biz-details-modal').remove();
    notify("Business details updated successfully.", "success");
    window.appActions.renderBusinessPortfolio(pcId);
};

export const demolishBusiness = async (pcId, bizId) => {
    if (!confirm("Are you sure you want to demolish this enterprise? All assets, hireling rosters, and records will be lost forever. Unpaid debts will remain.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = { ...(p.businesses || {}) };
            delete b[bizId];
            return { ...p, businesses: b };
        }
        return p;
    });

    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    document.getElementById('dt-biz-details-modal').remove();
    notify("Business successfully demolished.", "success");
    window.appActions.renderBusinessPortfolio(pcId);
};

// ============================================================================
// --- ROSTER MANAGEMENT ---
// ============================================================================

export const openRosterModal = (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const typeInfo = BUSINESS_TYPES[biz.type] || { label: "Business", cost: 0, skilled: 0, untrained: 0 };
    const maxSkilled = typeInfo.skilled + 1;
    const maxUntrained = typeInfo.untrained + 2;

    const skilledHired = Object.values(biz.hirelings?.skilled || {});
    const untrainedHired = Object.values(biz.hirelings?.untrained || {});

    const modal = document.createElement('div');
    modal.id = 'dt-biz-roster-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[19000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    const renderEmployeeCard = (h, type) => {
        const info = getQualityInfo(h.qualityBonus, type);
        const canTrain = info.tier !== "Excellent";
        const extraPayStr = h.additionalPay > 0 ? `+${h.additionalPay.toFixed(2)} gp/day` : 'Standard';

        return `
            <div class="bg-stone-50 border border-[#d4c5a9] rounded p-3 flex flex-col justify-between hover:border-amber-400 transition-colors">
                <div class="cursor-pointer" onclick="window.appActions.showHirelingFullProfile('${pcId}', '${bizId}', '${h.id}', '${type}')">
                    <div class="flex justify-between items-start gap-1">
                        <span class="font-bold text-xs text-stone-900 leading-tight">${h.name}</span>
                        <span class="text-[8px] uppercase tracking-wider font-bold bg-amber-100 border border-amber-300 text-amber-800 px-1.5 rounded-sm">${info.tier}</span>
                    </div>
                    <span class="text-[8px] text-stone-400 font-sans block mt-0.5">${h.species || "Commoner"} • Wages: ${extraPayStr}</span>
                </div>
                <div class="flex gap-1.5 mt-3 pt-2 border-t border-stone-200/50 justify-end">
                    <button onclick="window.appActions.openTrainWorkerModal('${pcId}', '${bizId}', '${h.id}', '${type}')" ${!canTrain ? 'disabled' : ''} class="px-2 py-1 bg-stone-900 text-amber-50 rounded hover:bg-stone-800 text-[8px] font-bold uppercase tracking-wider shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">Train</button>
                    <button onclick="window.appActions.fireWorker('${pcId}', '${bizId}', '${h.id}', '${type}')" class="px-2 py-1 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 rounded text-[8px] font-bold uppercase tracking-wider">Fire</button>
                </div>
            </div>
        `;
    };

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-[#d4c5a9] shrink-0">
                <h3 class="font-serif font-bold text-lg text-amber-900 flex items-center"><i class="fa-solid fa-users mr-2"></i> Staff Roster: ${biz.name}</h3>
                <button onclick="document.getElementById('dt-biz-roster-modal').remove()" class="text-stone-400 hover:text-stone-900 transition"><i class="fa-solid fa-times text-xl"></i></button>
            </div>

            <div class="overflow-y-auto custom-scrollbar flex-grow pr-2 space-y-6">
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Skilled Hirelings (${skilledHired.length} / ${typeInfo.skilled})</span>
                        ${skilledHired.length < maxSkilled ? `<button onclick="window.appActions.openHireModal('${pcId}', '${bizId}', 'skilled')" class="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm"><i class="fa-solid fa-plus-circle mr-1"></i> Search Skilled</button>` : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${skilledHired.length === 0 ? '<p class="text-xs text-stone-400 italic col-span-full py-4 text-center border border-dashed border-stone-300 rounded bg-stone-50">No skilled hirelings currently contracted.</p>' : skilledHired.map(h => renderEmployeeCard(h, 'skilled')).join('')}
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Untrained Workers (${untrainedHired.length} / ${typeInfo.untrained})</span>
                        ${untrainedHired.length < maxUntrained ? `<button onclick="window.appActions.openHireModal('${pcId}', '${bizId}', 'untrained')" class="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm"><i class="fa-solid fa-plus-circle mr-1"></i> Search Untrained</button>` : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${untrainedHired.length === 0 ? '<p class="text-xs text-stone-400 italic col-span-full py-4 text-center border border-dashed border-stone-300 rounded bg-stone-50">No untrained laborers currently contracted.</p>' : untrainedHired.map(h => renderEmployeeCard(h, 'untrained')).join('')}
                    </div>
                </div>
            </div>

            <div class="bg-[#e8dec7] p-3 border-t border-[#d4c5a9] flex justify-end shrink-0 mt-4 z-10 shadow-sm">
                <button onclick="document.getElementById('dt-biz-roster-modal').remove()" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded hover:bg-stone-800 transition text-[10px] font-bold uppercase tracking-wider shadow-sm">Close Roster</button>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const showHirelingFullProfile = (pcId, bizId, workerId, type) => {
    const camp = window.appData.activeCampaign;
    const worker = camp.playerCharacters?.find(p => p.id === pcId)?.businesses?.[bizId]?.hirelings?.[type]?.[workerId];
    if (!worker) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-stone-950/90 z-[21000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';
    
    // Render every single piece of generated NPC data if it exists
    const fields = [
        { label: "Full Name", val: worker.name },
        { label: "Species", val: worker.species },
        { label: "Quality", val: getQualityInfo(worker.qualityBonus, type).tier },
        { label: "Additional Pay", val: worker.additionalPay + " gp/day" },
        { label: "Description", val: worker.description },
        { label: "Background / Faith / Origin", val: worker.backstory || "No additional lore." }
    ];

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-sm w-full relative">
            <h3 class="font-serif font-bold text-lg text-amber-900 mb-4 pb-2 border-b border-[#d4c5a9]">Worker Profile: ${worker.name}</h3>
            <div class="space-y-3">
                ${fields.map(f => `<div><span class="text-[9px] uppercase font-bold text-stone-500">${f.label}</span><p class="text-xs font-serif text-stone-900">${f.val || '---'}</p></div>`).join('')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="mt-6 w-full py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px]">Close Profile</button>
        </div>
    `;
    document.body.appendChild(modal);
};

// ============================================================================
// --- SEARCHING FOR & HIRING WORKERS ---
// ============================================================================

export const openHireModal = (pcId, bizId, hireType) => {
    const modal = document.createElement('div');
    modal.id = 'dt-biz-hire-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-[#d4c5a9] shrink-0">
                <h3 class="font-serif font-bold text-base text-amber-900 flex items-center"><i class="fa-solid fa-user-plus mr-2"></i> Contract ${hireType === 'skilled' ? 'Skilled' : 'Untrained'} Worker</h3>
                <button onclick="document.getElementById('dt-biz-hire-modal').remove()" class="text-stone-400 hover:text-stone-900 transition"><i class="fa-solid fa-times text-xl"></i></button>
            </div>

            <div class="space-y-4 mb-6 overflow-y-auto custom-scrollbar pr-2 flex-grow">
                <p class="text-[10px] sm:text-xs text-stone-600 italic leading-snug">Fill out the contract details, or use the <b>Auto-Generate</b> trigger to auto-generate a random worker!</p>
                
                <div class="flex gap-2">
                    <button onclick="window.appActions.rollRandomNPCForHire()" class="w-full py-2 bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 transition text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm border border-[#d4c5a9] flex items-center justify-center">
                        <i class="fa-solid fa-dice mr-2"></i> Auto-Generate Worker
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Worker Name</label>
                        <input type="text" id="dt-hire-name" placeholder="e.g. Alaric" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Species</label>
                        <input type="text" id="dt-hire-species" placeholder="e.g. Human" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Search Effort (1-5 Days)</label>
                        <input type="number" id="dt-hire-effort" min="1" max="5" value="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white shadow-inner text-center">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Description & Traits</label>
                    <textarea id="dt-hire-desc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs text-stone-900 outline-none focus:border-amber-600 bg-white h-16 shadow-inner custom-scrollbar" placeholder="Quirks, background, expertise..."></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-[#d4c5a9] shrink-0 z-10 shadow-sm">
                <button onclick="document.getElementById('dt-biz-hire-modal').remove()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                <button onclick="window.appActions.finalizeHire('${pcId}', '${bizId}', '${hireType}')" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md">Sign Contract</button>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const rollRandomNPCForHire = () => {
    // Integrate the NPC Generator logic
    const npc = generateNpcData();
    
    const nameIn = document.getElementById('dt-hire-name');
    const speciesIn = document.getElementById('dt-hire-species');
    const descIn = document.getElementById('dt-hire-desc');

    if (nameIn) nameIn.value = npc.name;
    if (speciesIn) speciesIn.value = npc.race;
    if (descIn) descIn.value = `${npc.desc}\n${npc.appearance}\n${npc.backstory}`;

    notify("Contractor generated via NPC engine!", "success");
};

export const finalizeHire = async (pcId, bizId, hireType) => {
    const name = document.getElementById('dt-hire-name').value.trim();
    const species = document.getElementById('dt-hire-species').value.trim();
    const effort = parseInt(document.getElementById('dt-hire-effort').value) || 1;
    const desc = document.getElementById('dt-hire-desc').value.trim();

    if (!name || !species) {
        notify("Worker Name and Species are required.", "error");
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    if ((parseInt(pc.availableDowntime) || 0) < effort) {
        notify("Not enough downtime days available to execute searching.", "error");
        return;
    }

    // Roll for quality
    const d20 = Math.floor(Math.random() * 20) + 1;
    const searchBonus = effort - 1;
    const totalRoll = d20 + searchBonus;

    let qBonus = 0;
    let extraWages = 0;
    let tierLabel = "Average";

    if (totalRoll <= 6) {
        qBonus = -1;
        tierLabel = "Poor";
    } else if (totalRoll <= 14) {
        qBonus = 0;
        tierLabel = "Average";
    } else if (totalRoll <= 18) {
        qBonus = 1;
        tierLabel = "Good";
        extraWages = hireType === 'skilled' ? 1.0 : 0.1;
    } else {
        qBonus = 2;
        tierLabel = "Excellent";
        extraWages = hireType === 'skilled' ? 2.0 : 0.2;
    }

    if (hireType === 'skilled' && qBonus > 0) {
        qBonus *= 2;
    }

    const newWorker = {
        id: 'hire_' + generateId(),
        name,
        species,
        description: desc,
        qualityBonus: qBonus,
        additionalPay: extraWages,
        promotionBonus: 0
    };

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            const biz = b[bizId];
            if (biz) {
                if (!biz.hirelings) biz.hirelings = { skilled: {}, untrained: {} };
                if (!biz.hirelings[hireType]) biz.hirelings[hireType] = {};
                biz.hirelings[hireType][newWorker.id] = newWorker;
                biz.totalDaysWorked = (biz.totalDaysWorked || 0) + effort;
            }
            const logAddition = `\n\n---\n\n**Logged on ${new Date().toLocaleDateString()}**\n**Downtime: Running a Business (Hiring)**\n*Hero:* ${p.name}\n\nSpent **${effort} Day(s)** searching and contracted **${name}** (${species}) as a **${hireType} worker**.\n> *Quality Roll (1d20 + ${searchBonus}):* **${totalRoll}** (${tierLabel} Quality • Bonus: ${qBonus > 0 ? '+' : ''}${qBonus} • Wages: +${extraWages.toFixed(2)} gp/day).`;
            return { 
                ...p, 
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - effort),
                businesses: b,
                downtimeLog: (p.downtimeLog || '') + logAddition
            };
        }
        return p;
    });

    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    document.getElementById('dt-biz-hire-modal').remove();
    document.getElementById('dt-biz-roster-modal').remove();
    
    notify(`Contract signed! ${name} hired.`, "success");
    window.appActions.openRosterModal(pcId, bizId);
};

export const fireWorker = async (pcId, bizId, workerId, type) => {
    if (!confirm("Are you sure you want to fire this worker? All training progress and stats will be lost.")) return;

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            const biz = b[bizId];
            if (biz && biz.hirelings?.[type]?.[workerId]) {
                const wName = biz.hirelings[type][workerId].name;
                delete biz.hirelings[type][workerId];
                notify(`Contract terminated for ${wName}.`, "info");
            }
            return { ...p, businesses: b };
        }
        return p;
    });

    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    document.getElementById('dt-biz-roster-modal').remove();
    window.appActions.openRosterModal(pcId, bizId);
};

// ============================================================================
// --- TRAINING & PROMOTIONS ---
// ============================================================================

export const openTrainWorkerModal = (pcId, bizId, workerId, type) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const worker = biz.hirelings?.[type]?.[workerId];
    if (!worker) return;

    const info = getQualityInfo(worker.qualityBonus, type);
    const promotionBonus = worker.promotionBonus || 0;

    const modal = document.createElement('div');
    modal.id = 'dt-biz-train-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-md w-full relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <h3 class="font-serif font-bold text-base text-amber-900 mb-4 pb-2 border-b border-[#d4c5a9]"><i class="fa-solid fa-graduation-cap mr-2"></i> Train: ${worker.name}</h3>
            
            <div class="space-y-4 mb-6">
                <p class="text-xs text-stone-700 leading-relaxed font-serif">Spend 1 to 10 downtime days training <b>${worker.name}</b> (currently <b>${info.tier}</b> quality) to improve their skills.</p>
                <p class="text-xs text-stone-600 italic leading-snug">At the end of training, you will make a <b>Charisma (Persuasion)</b> check. The DC to promote them to <b>${info.nextTier}</b> is <b>DC ${info.dc}</b>.</p>
                
                ${promotionBonus > 0 ? `<div class="bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold p-2 rounded">Promising Pupil: +${promotionBonus} bonus applied to this session!</div>` : ''}

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Persuasion Modifier</label>
                        <input type="number" id="dt-train-pers-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-inner">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Days to Spend (1-10)</label>
                        <input type="number" id="dt-train-days" min="1" max="10" value="5" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-inner">
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-[#d4c5a9]">
                <button onclick="document.getElementById('dt-biz-train-modal').remove()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                <button onclick="window.appActions.executeTrainingSession('${pcId}', '${bizId}', '${workerId}', '${type}')" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md">Start Training</button>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);

    setTimeout(() => {
        const getAbilityMod = (score) => Math.floor(((parseInt(score) || 10) - 10) / 2);
        let pb = 2;
        if (pc.classLevel) {
            const levels = pc.classLevel.match(/\d+/g);
            if (levels) pb = Math.max(2, Math.ceil(levels.reduce((a, b) => a + parseInt(b), 0) / 4) + 1);
        }
        let isProf = false, isExp = false;
        const profStr = ((pc.skills || '') + ',' + (pc.proficiencies || '')).toLowerCase();
        const checkArr = profStr.split(',').map(s => s.trim());
        const match = checkArr.find(s => s.includes('persuasion'));
        if (match) {
            isProf = true;
            if (match.includes('expertise')) isExp = true;
        }
        const persMod = getAbilityMod(pc.cha) + (isExp ? pb * 2 : (isProf ? pb : 0));
        const input = document.getElementById('dt-train-pers-mod');
        if (input) input.value = persMod;
    }, 50);
};

export const executeTrainingSession = async (pcId, bizId, workerId, type) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const worker = biz.hirelings?.[type]?.[workerId];
    if (!worker) return;

    const days = parseInt(document.getElementById('dt-train-days').value) || 1;
    const pMod = parseInt(document.getElementById('dt-train-pers-mod').value) || 0;

    if (days < 1 || days > 10) { notify("Days to train must be between 1 and 10.", "error"); return; }
    if ((parseInt(pc.availableDowntime) || 0) < days) { notify("Not enough available downtime days.", "error"); return; }

    const info = getQualityInfo(worker.qualityBonus, type);
    const pBonus = worker.promotionBonus || 0;
    
    const d20 = Math.floor(Math.random() * 20) + 1;
    const totalRoll = d20 + pMod + days + pBonus;

    let outcomeText = "";
    let status = "failure";
    let logTitle = "Training Session";

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            const activeBiz = b[bizId];
            if (activeBiz) {
                const targetWorker = activeBiz.hirelings[type][workerId];
                
                if (d20 === 1) {
                    status = "quit";
                    outcomeText = `🚨 **Critical Failure (Nat 1)!** Frustrated and overwhelmed by your rigorous training, **${worker.name}** quit on the spot!`;
                    logTitle = "Roster Update: Quit!";
                    delete activeBiz.hirelings[type][workerId];
                } else if (totalRoll < 10) {
                    outcomeText = `❌ **Total Failure.** The training session was ineffective. **${worker.name}** remains **${info.tier}** quality.`;
                } else if (totalRoll < info.dc) {
                    status = " pupil";
                    targetWorker.promotionBonus = 2;
                    outcomeText = `⚠️ **Promising Pupil!** The training shows promise but fell short. **${worker.name}** remains **${info.tier}** quality, but gains a **+2 bonus** on their next promotion check.`;
                } else {
                    status = "promoted";
                    targetWorker.qualityBonus = info.nextBonus;
                    targetWorker.additionalPay = info.nextPay;
                    delete targetWorker.promotionBonus;
                    outcomeText = `🎉 **Success!** The training has paid off! **${worker.name}** has been promoted to **${info.nextTier}** quality (Bonus: ${info.nextBonus > 0 ? '+' : ''}${info.nextBonus} • Wages: +${info.nextPay.toFixed(2)} gp/day).`;
                    logTitle = "Roster Update: Promoted!";
                }

                activeBiz.totalDaysWorked = (activeBiz.totalDaysWorked || 0) + days;
            }

            const logAddition = `\n\n---\n\n**Logged on ${new Date().toLocaleDateString()}**\n**Downtime: Running a Business (Training)**\n*Hero:* ${p.name}\n\nSpent **${days} Day(s)** training **${worker.name}**.\n> *Persuasion Check (1d20 + ${pMod} mod + ${days} days + ${pBonus} pupil):* **${totalRoll}** vs **DC ${info.dc}**.\n\n${outcomeText}`;
            return {
                ...p,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - days),
                businesses: b,
                downtimeLog: (p.downtimeLog || '') + logAddition
            };
        }
        return p;
    });

    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    document.getElementById('dt-biz-train-modal').remove();
    document.getElementById('dt-biz-roster-modal').remove();

    notify(logTitle, "success");
    window.appActions.openRosterModal(pcId, bizId);
};

// ============================================================================
// --- RUNNING THE BUSINESS ---
// ============================================================================

export const openRunBusinessModal = (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const typeInfo = BUSINESS_TYPES[biz.type] || { label: "Business", cost: 0, skilled: 0, untrained: 0 };
    
    const skilledHired = Object.values(biz.hirelings?.skilled || {});
    const untrainedHired = Object.values(biz.hirelings?.untrained || {});
    
    const isStaffed = skilledHired.length >= typeInfo.skilled && untrainedHired.length >= typeInfo.untrained;

    const mods = biz.modifiers || {};
    const rollPenaltyMod = mods.nextRollPenalty || 0;
    const tempBonusReduction = mods.tempBonusReduction || 0;

    const activeDebts = Object.values(pc.businessDebts || {}).filter(d => d.businessId === biz.id);
    const debtPenalty = activeDebts.length * -10;

    const sortedSkilled = [...skilledHired].sort((a,b) => b.qualityBonus - a.qualityBonus);
    const sortedUntrained = [...untrainedHired].sort((a,b) => b.qualityBonus - a.qualityBonus);

    const activeSkilled = sortedSkilled.slice(0, typeInfo.skilled);
    const activeUntrained = sortedUntrained.slice(0, typeInfo.untrained);

    const positivePerformers = [...activeSkilled, ...activeUntrained]
        .filter(h => h.qualityBonus >= 0)
        .reduce((sum, h) => sum + Math.max(0, h.qualityBonus - tempBonusReduction), 0);

    const poorPerformers = [...sortedSkilled, ...sortedUntrained]
        .filter(h => h.qualityBonus < 0)
        .reduce((sum, h) => sum + h.qualityBonus, 0);

    const finalStaffBonus = positivePerformers + poorPerformers;
    const extraWages = parseFloat([...sortedSkilled, ...sortedUntrained].reduce((sum, h) => sum + h.additionalPay, 0).toFixed(2));

    const totalModifiersBonus = finalStaffBonus + rollPenaltyMod + debtPenalty;

    const modal = document.createElement('div');
    modal.id = 'dt-biz-run-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[19000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <h3 class="font-serif font-bold text-lg text-amber-900 mb-4 pb-2 border-b border-[#d4c5a9] shrink-0"><i class="fa-solid fa-dice-d20 mr-2"></i> Run Business: ${biz.name}</h3>
            
            <div class="space-y-4 mb-6 overflow-y-auto custom-scrollbar flex-grow pr-2">
                <div class="bg-stone-50 border border-[#d4c5a9] p-3 rounded shadow-inner text-xs space-y-2">
                    <div class="flex justify-between"><span>Base Maint:</span> <strong>${typeInfo.cost} gp / day</strong></div>
                    <div class="flex justify-between"><span>Extra Wages:</span> <strong>+${extraWages.toFixed(2)} gp / day</strong></div>
                    <div class="flex justify-between border-t border-stone-300 pt-1.5 font-bold text-stone-900">
                        <span>Total Maint:</span> <span id="dt-run-total-maint-rate">${(typeInfo.cost + extraWages).toFixed(2)} gp / day</span>
                    </div>
                </div>

                <div class="bg-stone-50 border border-[#d4c5a9] p-3 rounded shadow-inner text-xs space-y-1.5">
                    <h4 class="font-bold text-stone-800 uppercase tracking-wider text-[9px] border-b border-stone-300 pb-0.5">Active Modifiers</h4>
                    <div class="flex justify-between"><span>Hirelings Quality:</span> <strong>${finalStaffBonus >= 0 ? '+' : ''}${finalStaffBonus}</strong></div>
                    ${rollPenaltyMod !== 0 ? `<div class="flex justify-between text-red-700"><span>Complication Penalty:</span> <strong>${rollPenaltyMod}</strong></div>` : ''}
                    ${debtPenalty !== 0 ? `<div class="flex justify-between text-red-800 font-bold"><span>Debt Penalty (${activeDebts.length} Unpaid):</span> <strong>${debtPenalty}</strong></div>` : ''}
                    <div class="flex justify-between border-t border-stone-300 pt-1 font-bold text-stone-900">
                        <span>Final Roll Mod:</span> <span>${totalModifiersBonus >= 0 ? '+' : ''}${totalModifiersBonus}</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Days to Run (1-30)</label>
                        <input type="number" id="dt-run-days" min="1" max="30" value="7" oninput="window.appActions.updateRunBusinessMath('${pcId}', '${bizId}')" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-amber-600 bg-white text-center shadow-inner">
                    </div>
                    <div class="flex flex-col justify-end">
                        <span class="text-[9px] uppercase font-bold text-stone-500 tracking-wider">Accumulated Risk</span>
                        <span id="dt-run-complication-chance" class="text-sm font-black text-amber-700">0% Complication</span>
                    </div>
                </div>

                <div class="bg-[#1c1917] text-amber-50 p-4 rounded-sm shadow-inner flex justify-between items-center">
                    <div>
                        <span class="block text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Calculated Cost</span>
                        <span id="dt-run-gold-cost-out" class="text-xl font-black text-amber-500">0 gp</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Needed</span>
                        <span id="dt-run-days-out" class="text-lg font-bold text-stone-300">7 Days</span>
                    </div>
                </div>

                ${!isStaffed ? `<p class="text-[9px] text-red-700 font-bold uppercase tracking-widest text-center border border-red-200 bg-red-50 p-2 rounded shadow-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Roster is understaffed! You cannot operate.</p>` : ''}
            </div>

            <div class="flex justify-between gap-2 pt-3 border-t border-[#d4c5a9] shrink-0">
                <button onclick="window.appActions.openBusinessDebtsModal('${pcId}', '${bizId}')" class="px-3 py-1.5 text-stone-600 hover:text-amber-800 hover:bg-stone-50 transition rounded border border-transparent hover:border-stone-300 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-file-invoice-dollar mr-1"></i> Debts</button>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('dt-biz-run-modal').remove()" class="px-3 py-1.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-200 transition font-bold uppercase tracking-wider text-[10px]">Cancel</button>
                    <button id="dt-biz-run-submit-btn" onclick="window.appActions.executeRunBusiness('${pcId}', '${bizId}')" ${!isStaffed ? 'disabled' : ''} class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md disabled:opacity-30 disabled:cursor-not-allowed">Execute Run</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
    setTimeout(() => { window.appActions.updateRunBusinessMath(pcId, bizId); }, 50);
};

export const updateRunBusinessMath = (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    const biz = pc?.businesses?.[bizId];
    if (!biz) return;

    const daysInput = document.getElementById('dt-run-days');
    const costOut = document.getElementById('dt-run-gold-cost-out');
    const daysOut = document.getElementById('dt-run-days-out');
    const compOut = document.getElementById('dt-run-complication-chance');

    if (!daysInput || !costOut || !daysOut || !compOut) return;

    const days = parseInt(daysInput.value) || 0;
    const typeInfo = BUSINESS_TYPES[biz.type];
    const mods = biz.modifiers || {};
    const maintMultiplier = mods.nextMaintenanceMultiplier || 1.0;

    const skilledHired = Object.values(biz.hirelings?.skilled || {});
    const untrainedHired = Object.values(biz.hirelings?.untrained || {});
    const extraWages = parseFloat([...skilledHired, ...untrainedHired].reduce((sum, h) => sum + h.additionalPay, 0).toFixed(2));

    const totalDailyCost = typeInfo.cost + extraWages;
    const finalCalculatedCost = totalDailyCost * days * maintMultiplier;

    costOut.textContent = `${finalCalculatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`;
    daysOut.textContent = `${days} Day${days !== 1 ? 's' : ''}`;

    const currentUnriskedDays = biz.daysTowardsComplication || 0;
    const totalUnrisked = currentUnriskedDays + days;
    const numBlocks = Math.floor(totalUnrisked / 10);
    const compChance = numBlocks * 10;

    compOut.textContent = `${compChance}% Risk`;
};

export const executeRunBusiness = async (pcId, bizId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const days = parseInt(document.getElementById('dt-run-days').value) || 0;
    if (days < 1 || days > 30) { notify("Running period must be between 1 and 30 days.", "error"); return; }
    if ((parseInt(pc.availableDowntime) || 0) < days) { notify("Not enough available downtime days.", "error"); return; }

    if (!confirm(`Commit ${days} downtime days to run ${biz.name}?`)) return;

    const typeInfo = BUSINESS_TYPES[biz.type];
    const mods = biz.modifiers || {};
    const rollPenaltyMod = mods.nextRollPenalty || 0;
    const tempBonusReduction = mods.tempBonusReduction || 0;
    const maintMultiplier = mods.nextMaintenanceMultiplier || 1.0;
    const profitMultiplier = mods.nextProfitMultiplier || 1.0;

    const activeDebts = Object.values(pc.businessDebts || {}).filter(d => d.businessId === biz.id);
    const debtPenalty = activeDebts.length * -10;

    const skilledHired = Object.values(biz.hirelings?.skilled || {});
    const untrainedHired = Object.values(biz.hirelings?.untrained || {});
    const sortedSkilled = [...skilledHired].sort((a,b) => b.qualityBonus - a.qualityBonus);
    const sortedUntrained = [...untrainedHired].sort((a,b) => b.qualityBonus - a.qualityBonus);

    const activeSkilled = sortedSkilled.slice(0, typeInfo.skilled);
    const activeUntrained = sortedUntrained.slice(0, typeInfo.untrained);

    const positivePerformers = [...activeSkilled, ...activeUntrained]
        .filter(h => h.qualityBonus >= 0)
        .reduce((sum, h) => sum + Math.max(0, h.qualityBonus - tempBonusReduction), 0);

    const poorPerformers = [...sortedSkilled, ...sortedUntrained]
        .filter(h => h.qualityBonus < 0)
        .reduce((sum, h) => sum + h.qualityBonus, 0);

    const finalStaffBonus = positivePerformers + poorPerformers;
    const extraWages = parseFloat([...sortedSkilled, ...sortedUntrained].reduce((sum, h) => sum + h.additionalPay, 0).toFixed(2));

    const finalRollMod = finalStaffBonus + rollPenaltyMod + debtPenalty;
    const d100 = Math.floor(Math.random() * 100) + 1;
    const finalRollTotal = d100 + days + finalRollMod;

    const maintenanceCost = (typeInfo.cost + extraWages) * days * maintMultiplier;
    
    let outcomeText = "";
    let profitWon = 0;
    let netLoss = 0;
    let isDebtAccumulated = false;

    if (finalRollTotal <= 20) {
        netLoss = Math.ceil(maintenanceCost * 1.5);
        isDebtAccumulated = true;
        outcomeText = `🚨 **Disaster! (Roll <= 20)** The business has suffered catastrophic losses. You must pay **1.5x maintenance (${netLoss.toLocaleString()} gp)** to keep the doors open, adding to your debts.`;
    } else if (finalRollTotal <= 30) {
        netLoss = Math.ceil(maintenanceCost);
        isDebtAccumulated = true;
        outcomeText = `📉 **Loss (Roll 21-30)** The business struggled. You must pay **1x maintenance (${netLoss.toLocaleString()} gp)** to cover the losses, adding to your debts.`;
    } else if (finalRollTotal <= 40) {
        netLoss = Math.ceil(maintenanceCost * 0.5);
        isDebtAccumulated = true;
        outcomeText = `⚠️ **Deficit (Roll 31-40)** The business operated at a deficit. You must pay **0.5x maintenance (${netLoss.toLocaleString()} gp)** to cover the deficit, adding to your debts.`;
    } else if (finalRollTotal <= 60) {
        outcomeText = `⚖️ **Break Even (Roll 41-60)** The business covered its own operational and maintenance costs. No profit or losses occurred.`;
    } else if (finalRollTotal <= 80) {
        const rollProfit = (Math.floor(Math.random() * 6) + 1) * 5;
        profitWon = Math.ceil(rollProfit * profitMultiplier);
        outcomeText = `📈 **Small Profit (Roll 61-80)** The business covered its costs and generated a small profit of **${profitWon.toLocaleString()} gp**!`;
    } else if (finalRollTotal <= 90) {
        const rollProfit = (Math.floor(Math.random() * 8) + 1 + Math.floor(Math.random() * 8) + 1) * 5;
        profitWon = Math.ceil(rollProfit * profitMultiplier);
        outcomeText = `🎉 **Healthy Profit (Roll 81-90)** The business operated exceptionally well, generating a profit of **${profitWon.toLocaleString()} gp**!`;
    } else {
        const rollProfit = (Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1) * 5;
        profitWon = Math.ceil(rollProfit * profitMultiplier);
        outcomeText = `🏆 **Windfall! (Roll 91+)** A monumental success! The business generated an incredible profit of **${profitWon.toLocaleString()} gp**!`;
    }

    const currentUnriskedDays = biz.daysTowardsComplication || 0;
    const totalUnrisked = currentUnriskedDays + days;
    const numBlocks = Math.floor(totalUnrisked / 10);
    const compChance = numBlocks * 10;
    const remainingUnrisked = totalUnrisked % 10;

    let complicationRolled = "none";
    let rolledD100 = 100;
    if (compChance > 0) {
        rolledD100 = Math.floor(Math.random() * 100) + 1;
        if (rolledD100 <= compChance) {
            const isExternal = Math.random() < 0.5;
            const table = isExternal ? ["rivalry", "supply_chain", "shakedown", "disaster", "regulatory", "recession"] : ["infighting", "poached", "customer_complaint", "theft", "morale", "bad_idea"];
            complicationRolled = table[Math.floor(Math.random() * table.length)];
        }
    }

    let checksText = `**D100 Roll:** ${d100} + ${days} days + ${finalRollMod} mod = **${finalRollTotal}**.\n**Maintenance Incurred:** ${maintenanceCost.toLocaleString()} gp.`;
    const logAddition = `\n\n---\n\n**Logged on ${new Date().toLocaleDateString()}**\n**Downtime: Running a Business (${typeInfo.label})**\n*Hero:* ${pc.name}\n\nOperated **${biz.name}** for **${days} Day(s)**.\n> ${checksText}\n\n${outcomeText}`;

    let newTasks = [];
    let businessDebts = { ...(pc.businessDebts || {}) };

    if (isDebtAccumulated && netLoss > 0) {
        const debtId = 'debt_' + generateId();
        businessDebts[debtId] = { id: debtId, businessId: biz.id, businessName: biz.name, amount: netLoss, date: new Date().toLocaleDateString() };
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Add a business debt of ${netLoss.toLocaleString()} gp for running losses.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
    }

    if (profitWon > 0) {
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Add ${profitWon.toLocaleString()} gp earned from your business profit.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
    }

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            const activeBiz = b[bizId];
            if (activeBiz) {
                activeBiz.daysTowardsComplication = remainingUnrisked;
                activeBiz.totalDaysWorked = (activeBiz.totalDaysWorked || 0) + days;
                activeBiz.modifiers = {};
            }
            return { 
                ...p, 
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - days),
                businesses: b,
                businessDebts,
                downtimeLog: (p.downtimeLog || '') + logAddition
            };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs, sheetUpdates: [...(camp.sheetUpdates || []), ...newTasks] };
    updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `spent downtime running their business: <span class="font-bold text-stone-900">${biz.name}</span>.`, 'fa-store');

    await saveCampaign(updatedCamp);
    document.getElementById('dt-biz-run-modal').remove();

    if (complicationRolled !== "none") {
        setTimeout(() => {
            window.appActions.resolveComplicationChoice(pcId, bizId, complicationRolled, compChance, rolledD100);
        }, 500);
    } else {
        notify("Business run logged!", "success");
        window.appActions.openRunningBusinessModal();
    }
};

export const rollBusinessComplication = async (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const isExternal = Math.random() < 0.5;
    const table = isExternal ? ["rivalry", "supply_chain", "shakedown", "disaster", "regulatory", "recession"] : ["infighting", "poached", "customer_complaint", "theft", "morale", "bad_idea"];
    const complicationKey = table[Math.floor(Math.random() * table.length)];
    
    window.appActions.resolveComplicationChoice(pcId, bizId, complicationKey, 0, 0);
};

export const resolveComplicationChoice = (pcId, bizId, complicationKey, chance, rolledVal) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const modal = document.createElement('div');
    modal.id = 'dt-biz-complication-modal';
    modal.className = 'fixed inset-0 bg-stone-950/90 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm animate-in pointer-events-auto';

    let title = "", desc = "", choicesHtml = "";
    const cost2d10 = (Math.floor(Math.random() * 10) + 1 + Math.floor(Math.random() * 10) + 1) * 5;
    const cost3d6 = (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1) * 10;
    const cost1d6 = (Math.floor(Math.random() * 6) + 1) * 10;
    const cost1d20 = (Math.floor(Math.random() * 20) + 1) * 5;
    const cost1d10 = (Math.floor(Math.random() * 10) + 1) * 10;

    switch(complicationKey) {
        case "rivalry": title = "Competitor Price War!"; desc = "A fierce competitor starts a price war or smear campaign."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'rivalry', 0, 0, -10)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Adapt to Pressure (-10 next roll)</button>`; break;
        case "supply_chain": title = "Supply Chain Failure!"; desc = "Critical raw-materials shipment has been spoiled or stolen."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'supply_chain_maint', 0, 0, 0, 1.5)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Accept +50% next maintenance cost</button>`; break;
        case "shakedown": title = "Official Shakedown!"; desc = "A corrupt guild official demands protection fees."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'shakedown_pay', ${cost2d10}, 0, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Pay them off (${cost2d10} gp added to debt)</button>`; break;
        case "disaster": title = "Minor Disaster!"; desc = "A minor localized fire or building collapse."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'disaster_pay', ${cost3d6}, 0, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Fund repair repairs (${cost3d6} gp added to debt)</button>`; break;
        case "regulatory": title = "Surprise Inspection!"; desc = "A surprise audit forces you to close operations for a workweek and pay a hefty fine."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'reg_fine', ${cost1d6}, 5, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Settle fine (${cost1d6} gp to debt & spend 5 downtime days)</button>`; break;
        case "recession": title = "Local Market Recession!"; desc = "An unexpected economic slump dries up local trade."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'recession', 0, 0, 0, 1.0, 0.5)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Tough out market conditions (Next profits halved)</button>`; break;
        case "infighting": title = "Staff Infighting!"; desc = "Squabbling and petty feuds among your crew threaten to disrupt business."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'infighting_mediate', 0, 5, 0)" class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm mb-2">Mediate dispute (Spend 5 downtime days)</button> <button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'infighting_ignore', 0, 0, -5)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Let them squabble (-5 next roll)</button>`; break;
        case "poached": title = "Key Employee Poached!"; desc = "Your most talented worker has been offered a more lucrative position by a rival firm."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'poach_match', 0, 0, 0)" class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm mb-2">Match offer (Double wages)</button> <button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'poach_letgo', 0, 0, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Let them walk (Erase random worker)</button>`; break;
        case "customer_complaint": title = "Severe Patron Complaint!"; desc = "An influential noble customer is furious over a minor mistake."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'complaint_refund', ${cost1d20}, 0, 0)" class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm mb-2">Appease them with gifts (${cost1d20} gp to debt)</button> <button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'complaint_ignore', 0, 0, -10)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Refuse compensation (-10 next roll)</button>`; break;
        case "theft": title = "Internal Theft!"; desc = "You discover one of your hirelings has been systematically skimming from the cashbox."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'theft_resolved', ${cost1d10}, 0, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Cover losses (${cost1d10} gp added to debt)</button>`; break;
        case "morale": title = "Morale Plummets!"; desc = "Burnout and poor working conditions cause staff morale to plunge."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'morale_slump', 0, 0, 0, 1.0, 1.0, 1)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Accept temporary penalty (-1 staff bonuses next roll)</button>`; break;
        case "bad_idea": title = "A Terrible Idea!"; desc = "An overzealous worker tried to implement a 'brilliant' organizational shortcut that backfired spectacularly."; choicesHtml = `<button onclick="window.appActions.executeComplicationResolution('${pcId}', '${bizId}', 'bad_idea_fix', ${cost1d6}, 0, 0)" class="w-full py-2 bg-red-900 hover:bg-red-800 text-white rounded font-bold uppercase text-[10px] tracking-widest shadow-sm">Pay to fix mess (${cost1d6} gp added to debt)</button>`; break;
    }

    modal.innerHTML = `
        <div class="bg-[#1c1917] text-amber-50 p-6 rounded-sm border-2 border-red-800 shadow-2xl max-w-sm w-full relative overflow-hidden animate-in">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-red-700"></div>
            <div class="text-center mb-4">
                <i class="fa-solid fa-triangle-exclamation text-3xl text-red-600 mb-2 drop-shadow-md animate-pulse"></i>
                <h3 class="font-serif font-bold text-lg text-red-500">${title}</h3>
                <span class="text-[8px] uppercase tracking-wider text-stone-500 font-bold block mt-1">Roll Failure: ${rolledVal}% vs ${chance}% Risk</span>
            </div>
            <p class="text-xs text-stone-300 font-serif leading-relaxed text-center mb-6">${desc}</p>
            <div class="space-y-2">
                ${choicesHtml}
            </div>
        </div>
    `;

    window.appActions.executeComplicationResolution = executeComplicationResolution;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const executeComplicationResolution = async (pcId, bizId, resolutionKey, debtGained = 0, dtLost = 0, penalty = 0, maintMult = 1.0, profitMult = 1.0, staffReduction = 0) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    let businessDebts = { ...(pc.businessDebts || {}) };
    let newTasks = [];
    let logMsg = "";

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    if (dtLost > 0 && (parseInt(pc.availableDowntime) || 0) < dtLost) {
        notify("Not enough available downtime days left to fulfill mediation/reparation requirements.", "error");
        return;
    }

    const activeModifiers = {
        nextRollPenalty: penalty,
        nextMaintenanceMultiplier: maintMult,
        nextProfitMultiplier: profitMult,
        tempBonusReduction: staffReduction
    };

    if (resolutionKey === 'poach_match') {
        const skilled = Object.values(biz.hirelings?.skilled || {});
        const untrained = Object.values(biz.hirelings?.untrained || {});
        const all = [...skilled, ...untrained];
        if (all.length > 0) {
            const victim = all[Math.floor(Math.random() * all.length)];
            const isSkilled = !!biz.hirelings?.skilled?.[victim.id];
            
            const doubledPay = victim.additionalPay > 0 ? victim.additionalPay * 2.0 : 0.5;
            if (isSkilled) {
                biz.hirelings.skilled[victim.id].additionalPay = doubledPay;
            } else {
                biz.hirelings.untrained[victim.id].additionalPay = doubledPay;
            }
            logMsg = `Permanently doubled wages for ${victim.name} to match competitor offer.`;
        }
    } else if (resolutionKey === 'poach_letgo') {
        const skilled = Object.keys(biz.hirelings?.skilled || {});
        const untrained = Object.keys(biz.hirelings?.untrained || {});
        if (skilled.length > 0 || untrained.length > 0) {
            const isSkilled = skilled.length > 0;
            const targetList = isSkilled ? biz.hirelings.skilled : biz.hirelings.untrained;
            const targetId = isSkilled ? skilled[0] : untrained[0];
            const victimName = targetList[targetId].name;
            
            delete targetList[targetId]; 
            logMsg = `Allowed **${victimName}** to be recruited by rival firm.`;
        }
    }

    if (debtGained > 0) {
        const debtId = 'debt_' + generateId();
        businessDebts[debtId] = {
            id: debtId,
            businessId: biz.id,
            businessName: biz.name,
            amount: debtGained,
            date: new Date().toLocaleDateString()
        };
        newTasks.push({
            id: generateId(),
            text: `D&D Beyond Sync (${pc.name}): Add a business debt of ${debtGained.toLocaleString()} gp.`,
            resolvedBy: [],
            visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
            timestamp: Date.now()
        });
        logMsg = `Incurred **${debtGained.toLocaleString()} gp** in debts/fines settling the crisis.`;
    }

    if (dtLost > 0) {
        logMsg += ` Spent **${dtLost} downtime days** resolving logistics.`;
    }

    if (penalty !== 0) {
        logMsg += ` Suffered a **${penalty} roll modifier** for the next operating period.`;
    }

    const logAddition = `\n\n---\n\n**Logged on ${new Date().toLocaleDateString()}**\n**Crisis Resolution: ${biz.name}**\n*Hero:* ${pc.name}\n\nResolved crisis successfully. ${logMsg}`;

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const b = p.businesses || {};
            if (b[bizId]) {
                b[bizId].modifiers = activeModifiers;
            }
            return {
                ...p,
                availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - dtLost),
                businesses: b,
                businessDebts,
                downtimeLog: (p.downtimeLog || '') + logAddition
            };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs, sheetUpdates: [...(camp.sheetUpdates || []), ...newTasks] };
    await saveCampaign(updatedCamp);

    document.getElementById('dt-biz-complication-modal').remove();
    notify("Crisis Resolved", "success");
    window.appActions.openRunningBusinessModal();
};

export const openBusinessDebtsModal = (pcId, bizId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const biz = pc.businesses?.[bizId];
    if (!biz) return;

    const activeDebts = Object.values(pc.businessDebts || {}).filter(d => d.businessId === biz.id);

    const modal = document.createElement('div');
    modal.id = 'dt-biz-debts-modal';
    modal.className = 'fixed inset-0 bg-stone-950/80 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm animate-in';

    let ledgerHtml = '';
    if (activeDebts.length === 0) {
        ledgerHtml = `<p class="text-stone-500 italic text-center py-6">This business is fully solvent with no outstanding debts.</p>`;
    } else {
        ledgerHtml = `<div class="space-y-3">`;
        activeDebts.forEach(d => {
            ledgerHtml += `
                <div class="bg-white p-3 border border-[#d4c5a9] rounded shadow-sm flex justify-between items-center gap-3">
                    <div>
                        <span class="text-xs text-stone-400 block font-bold uppercase tracking-wider">${d.date}</span>
                        <span class="text-base font-black text-amber-900">${d.amount.toLocaleString()} gp</span>
                    </div>
                    <button onclick="window.appActions.payBusinessDebt('${pcId}', '${bizId}', '${d.id}')" class="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-600 transition font-bold uppercase tracking-wider text-[10px] tracking-widest shadow-sm">Pay Off</button>
                </div>
            `;
        });
        ledgerHtml += `</div>`;
    }

    modal.innerHTML = `
        <div class="bg-[#f4ebd8] p-5 sm:p-6 rounded-sm border-2 border-stone-800 shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col max-h-[85vh]">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-[#d4c5a9] shrink-0">
                <h3 class="font-serif font-bold text-base text-amber-900 flex items-center"><i class="fa-solid fa-file-invoice-dollar mr-2"></i> Debt Ledger: ${biz.name}</h3>
                <button onclick="document.getElementById('dt-biz-debts-modal').remove()" class="text-stone-400 hover:text-stone-900 transition"><i class="fa-solid fa-times text-xl"></i></button>
            </div>

            <div class="overflow-y-auto custom-scrollbar flex-grow pr-2">
                ${ledgerHtml}
            </div>

            <div class="bg-[#e8dec7] p-3 border-t border-[#d4c5a9] flex justify-end shrink-0 mt-4 z-10 shadow-sm">
                <button onclick="document.getElementById('dt-biz-debts-modal').remove()" class="px-4 py-1.5 bg-stone-900 text-amber-50 rounded hover:bg-stone-800 transition text-[10px] font-bold uppercase tracking-wider shadow-sm">Dismiss</button>
            </div>
        </div>
    `;
    document.getElementById('global-popup-container').appendChild(modal);
};

export const payBusinessDebt = async (pcId, bizId, debtId) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const pc = camp?.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    const debt = pc.businessDebts?.[debtId];
    if (!debt) return;

    if (!confirm(`Confirm payoff of ${debt.amount.toLocaleString()} gp? This will remove the roll penalty and automatically generate a task to deduct the gold from your character sheet.`)) return;

    const newDebts = { ...(pc.businessDebts || {}) };
    delete newDebts[debtId];

    const logAddition = `\n\n---\n\n**Logged on ${new Date().toLocaleDateString()}**\n**Business Ledger: Debt Settled**\n*Hero:* ${pc.name}\n\nPaid off an outstanding business debt of **${debt.amount.toLocaleString()} gp** for **${debt.businessName}**.\n*(Debt roll penalty of -10 resolved).*`;

    const newTasks = [{
        id: generateId(),
        text: `D&D Beyond Sync (${pc.name}): Deduct ${debt.amount.toLocaleString()} gp for business debt payoff.`,
        resolvedBy: [],
        visibility: { mode: pc.playerId ? 'specific' : 'public', visibleTo: pc.playerId ? [pc.playerId] : [] },
        timestamp: Date.now()
    }];

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            return {
                ...p,
                businessDebts: newDebts,
                downtimeLog: (p.downtimeLog || '') + logAddition
            };
        }
        return p;
    });

    let updatedCamp = { ...camp, playerCharacters: updatedPCs, sheetUpdates: [...(camp.sheetUpdates || []), ...newTasks] };
    updatedCamp = logPlayerActivity(updatedCamp, window.appData.currentUserUid, `settled a business debt of ${debt.amount.toLocaleString()} gp for ${debt.businessName}.`, 'fa-coins');

    await saveCampaign(updatedCamp);
    document.getElementById('dt-biz-debts-modal').remove();
    document.getElementById('dt-biz-run-modal').remove();

    notify("Debt fully paid!", "success");
    window.appActions.openRunBusinessModal(pcId, bizId);
};
