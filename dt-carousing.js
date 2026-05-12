import { generateId, updateDerivedState, reRender } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { logPlayerActivity } from './actions-campaign.js';

// ============================================================================
// --- 2. CAROUSING ---
// ============================================================================

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

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[18000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm w-full max-w-2xl border border-[#d4c5a9] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-blue-900 p-4 border-b-4 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                    <div class="flex items-center gap-3">
                        <h2 class="text-lg font-serif font-bold flex items-center"><i class="fa-solid fa-beer-mug-empty mr-2 text-amber-400"></i> Carousing</h2>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.appActions.openCarouseContacts()" class="text-[10px] font-bold uppercase tracking-widest bg-stone-900/50 hover:bg-stone-900 px-3 py-1.5 rounded-sm border border-amber-500/50 hover:border-amber-400 transition shadow-sm"><i class="fa-solid fa-address-book mr-1.5"></i> Manage Contacts</button>
                        <button onclick="window.appActions.openDowntimeMenu()" class="text-stone-400 hover:text-white transition" title="Back to Menu"><i class="fa-solid fa-arrow-left text-xl"></i></button>
                    </div>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Select Hero</label>
                            <select id="dt-carouse-pc" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner">
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
                                <input type="number" id="dt-carouse-mod" value="0" class="w-full p-2 border border-[#d4c5a9] rounded-r-sm text-sm font-bold text-stone-900 outline-none focus:border-blue-600 bg-white shadow-inner text-center" title="Your Persuasion modifier determines your maximum contact limit">
                            </div>
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
                        <div class="text-right border-l-2 border-stone-800 pl-4">
                            <span class="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">Downtime Requirements</span>
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
            
            <!-- Contacts Management Modal (Hidden by default, overlays the Carousing Modal) -->
            <div id="dt-carouse-contacts-modal" class="hidden absolute inset-0 bg-stone-950/95 flex items-center justify-center p-4 z-[19000] backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm w-full max-w-lg border border-[#d4c5a9] shadow-2xl relative flex flex-col max-h-[90vh]">
                    <div class="bg-stone-900 p-3 sm:p-4 border-b-2 border-amber-600 shadow-md shrink-0 flex justify-between items-center text-amber-50">
                        <h3 class="text-base font-serif font-bold flex items-center"><i class="fa-solid fa-address-book mr-2 text-amber-500"></i> Manage Contacts</h3>
                        <button onclick="window.appActions.closeCarouseContacts()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                    
                    <div class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                        <input type="hidden" id="dt-carouse-contact-pc-id">
                        
                        <!-- Banked Contacts Container -->
                        <div id="dt-carouse-banked-list" class="mb-5"></div>
                        
                        ${isDM ? `<button onclick="window.appActions.prepDefineContact('', 'ally', 'lower')" class="text-[9px] font-bold uppercase tracking-widest text-blue-600 mb-5 flex items-center hover:text-blue-800 transition"><i class="fa-solid fa-plus mr-1"></i> DM Override: Force Add Contact</button>` : ''}

                        <!-- Add New Contact Form (Hidden by default until a Banked Contact is Defined) -->
                        <div id="dt-carouse-contact-form" class="hidden bg-stone-100 p-3 sm:p-4 border border-[#d4c5a9] rounded-sm shadow-inner mb-6 relative">
                            <input type="hidden" id="dt-carouse-define-id">
                            <div class="flex justify-between items-center mb-3 border-b border-[#d4c5a9] pb-2">
                                <h4 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest"><i class="fa-solid fa-feather-pointed mr-1 text-stone-400"></i> Define Contact</h4>
                                <button onclick="document.getElementById('dt-carouse-contact-form').classList.add('hidden')" class="text-stone-400 hover:text-red-900 transition"><i class="fa-solid fa-xmark text-sm"></i></button>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" id="dt-carouse-contact-name" placeholder="Contact Name" class="col-span-2 p-2 text-xs border border-[#d4c5a9] rounded-sm outline-none focus:border-amber-600 shadow-sm bg-white font-bold text-stone-900">
                                <select id="dt-carouse-contact-type" class="p-2 text-xs border border-[#d4c5a9] rounded-sm outline-none focus:border-amber-600 shadow-sm bg-white font-bold text-stone-900 disabled:bg-stone-200 disabled:text-stone-500">
                                    <option value="ally">Ally</option>
                                    <option value="hostile">Hostile</option>
                                </select>
                                <select id="dt-carouse-contact-class" class="p-2 text-xs border border-[#d4c5a9] rounded-sm outline-none focus:border-amber-600 shadow-sm bg-white font-bold text-stone-900 disabled:bg-stone-200 disabled:text-stone-500">
                                    <option value="lower">Lower Class</option>
                                    <option value="middle">Middle Class</option>
                                    <option value="upper">Upper Class</option>
                                </select>
                                <textarea id="dt-carouse-contact-desc" placeholder="Description & Notes..." class="col-span-2 p-2 text-xs border border-[#d4c5a9] rounded-sm outline-none focus:border-amber-600 shadow-sm bg-white font-serif resize-none h-20 custom-scrollbar"></textarea>
                            </div>
                            <div class="flex justify-end">
                                <button onclick="window.appActions.saveNewCarouseContact()" class="px-4 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] shadow-md flex items-center"><i class="fa-solid fa-floppy-disk mr-1.5"></i> Save & Bind Contact</button>
                            </div>
                        </div>

                        <!-- Existing Contacts List -->
                        <div>
                            <h4 class="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-users mr-1 text-stone-400"></i> Known Contacts</h4>
                            <div id="dt-carouse-contacts-list" class="space-y-3">
                                <!-- Populated via JS -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    setTimeout(window.appActions.updateCarousingMath, 50);
};

// --- NEW CONTACT MANAGEMENT SYSTEM ---

export const openCarouseContacts = () => {
    const pcId = document.getElementById('dt-carouse-pc').value;
    if (!pcId) return notify("Please select a hero first.", "error");

    const modal = document.getElementById('dt-carouse-contacts-modal');
    if (modal) {
        // Ensure form is hidden upon opening
        document.getElementById('dt-carouse-contact-form').classList.add('hidden');
        modal.classList.remove('hidden');
        window.appActions.renderCarouseContactsList(pcId);
    }
};

export const closeCarouseContacts = () => {
    const modal = document.getElementById('dt-carouse-contacts-modal');
    if (modal) modal.classList.add('hidden');
};

export const prepDefineContact = (id, type, socialClass) => {
    const form = document.getElementById('dt-carouse-contact-form');
    if (!form) return;

    form.classList.remove('hidden');
    document.getElementById('dt-carouse-define-id').value = id || '';
    
    const typeSelect = document.getElementById('dt-carouse-contact-type');
    const classSelect = document.getElementById('dt-carouse-contact-class');
    
    typeSelect.value = type;
    classSelect.value = socialClass;
    
    // Lock inputs to force compliance with the Banked Contact attributes (Unlock if DM override)
    if (id) {
        typeSelect.disabled = true;
        classSelect.disabled = true;
    } else {
        typeSelect.disabled = false;
        classSelect.disabled = false;
    }

    document.getElementById('dt-carouse-contact-name').value = '';
    document.getElementById('dt-carouse-contact-desc').value = '';

    setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('dt-carouse-contact-name').focus();
    }, 100);
};

export const renderCarouseContactsList = (pcId) => {
    const camp = window.appData.activeCampaign;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    const listContainer = document.getElementById('dt-carouse-contacts-list');
    const bankedContainer = document.getElementById('dt-carouse-banked-list');
    if (!pc || !listContainer || !bankedContainer) return;

    // 1. Render Banked Contacts
    const banked = pc.bankedContacts || [];
    if (banked.length > 0) {
        let bankedHtml = `<h4 class="text-[10px] uppercase font-bold text-amber-700 tracking-widest mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-user-clock mr-1 text-amber-600"></i> Banked Contacts (Awaiting Definition)</h4><div class="space-y-2">`;
        banked.forEach(b => {
            const typeIcon = b.type === 'ally' ? '<i class="fa-solid fa-handshake text-emerald-600" title="Ally"></i>' : '<i class="fa-solid fa-skull-crossbones text-red-600" title="Hostile"></i>';
            bankedHtml += `
                <div class="bg-white p-2.5 border border-[#d4c5a9] rounded-sm shadow-sm flex justify-between items-center gap-2 hover:border-amber-400 transition-colors">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-5 flex justify-center shrink-0">${typeIcon}</div>
                        <span class="text-[10px] sm:text-xs font-bold text-stone-800 uppercase tracking-widest truncate">Unidentified ${b.type}</span>
                        <span class="text-[8px] uppercase tracking-widest text-stone-500 bg-stone-100 px-1.5 py-0.5 border border-stone-200 rounded-sm shrink-0 whitespace-nowrap">${b.socialClass}</span>
                    </div>
                    <button onclick="window.appActions.prepDefineContact('${b.id}', '${b.type}', '${b.socialClass}')" class="px-3 py-1 bg-stone-800 text-amber-50 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-stone-700 transition shadow-sm shrink-0">Define</button>
                </div>
            `;
        });
        bankedHtml += `</div>`;
        bankedContainer.innerHTML = bankedHtml;
        bankedContainer.classList.remove('hidden');
    } else {
        bankedContainer.innerHTML = '';
        bankedContainer.classList.add('hidden');
    }

    // 2. Render Known Contacts
    const contacts = pc.carousingContacts || [];
    let html = '';

    if (contacts.length === 0) {
        html = '<p class="text-stone-500 italic text-xs py-2 border border-dashed border-[#d4c5a9] rounded-sm bg-stone-50 text-center">No active contacts recorded yet.</p>';
    } else {
        contacts.forEach(c => {
            const statusColor = c.active ? 'text-emerald-700' : 'text-stone-400';
            const statusBg = c.active ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-300';
            const statusText = c.active ? '<i class="fa-solid fa-check mr-1"></i> Active' : '<i class="fa-solid fa-times mr-1"></i> Inactive';
            const typeIcon = c.type === 'ally' ? '<i class="fa-solid fa-handshake text-emerald-600" title="Ally"></i>' : '<i class="fa-solid fa-skull-crossbones text-red-600" title="Hostile"></i>';
            
            html += `
            <div class="bg-white p-3 sm:p-4 border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col gap-2 relative group hover:border-amber-300 transition-colors">
                <div class="flex justify-between items-start border-b border-[#d4c5a9] pb-2">
                    <div class="min-w-0 pr-2 flex items-center gap-2">
                        <div class="w-5 flex justify-center shrink-0">${typeIcon}</div>
                        <div>
                            <span class="font-bold text-stone-900 text-sm truncate block leading-tight">${c.name}</span>
                            <span class="text-[8px] uppercase tracking-widest text-stone-500 font-bold block mt-0.5">${c.socialClass} Class</span>
                        </div>
                    </div>
                    <div class="flex gap-2 items-center shrink-0">
                        <button onclick="window.appActions.toggleCarouseContact('${pcId}', '${c.id}')" class="text-[9px] uppercase tracking-widest font-bold ${statusColor} ${statusBg} px-2 py-1 rounded shadow-sm hover:brightness-95 transition whitespace-nowrap w-20 text-center">${statusText}</button>
                        <button onclick="window.appActions.deleteCarouseContact('${pcId}', '${c.id}')" class="text-stone-400 hover:text-red-700 transition ml-1" title="Delete Contact"><i class="fa-solid fa-trash text-sm p-1"></i></button>
                    </div>
                </div>
                <p class="text-xs text-stone-700 font-serif leading-relaxed mt-1">${(c.description || '').replace(/"/g, '&quot;').replace(/\n/g, '<br>')}</p>
            </div>
            `;
        });
    }
    
    listContainer.innerHTML = html;
    document.getElementById('dt-carouse-contact-pc-id').value = pcId;
};

export const saveNewCarouseContact = async () => {
    const pcId = document.getElementById('dt-carouse-contact-pc-id').value;
    const defineId = document.getElementById('dt-carouse-define-id').value;
    
    const name = document.getElementById('dt-carouse-contact-name').value.trim();
    const type = document.getElementById('dt-carouse-contact-type').value;
    const socialClass = document.getElementById('dt-carouse-contact-class').value;
    const desc = document.getElementById('dt-carouse-contact-desc').value.trim();

    if (!name || !desc) {
        notify("Name and Description are required.", "error");
        return;
    }

    const camp = window.appData.activeCampaign;
    const pc = camp.playerCharacters?.find(p => p.id === pcId);
    if (!pc) return;

    if (!defineId && !camp._isDM) {
        notify("You must select 'Define' on a Banked Contact to add them to your sheet.", "error");
        return;
    }

    const newContact = {
        id: generateId(),
        name,
        type,
        socialClass,
        description: desc,
        active: true
    };

    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            let banked = p.bankedContacts || [];
            if (defineId) {
                banked = banked.filter(b => b.id !== defineId);
            }
            return { ...p, carousingContacts: [...(p.carousingContacts || []), newContact], bankedContacts: banked };
        }
        return p;
    });

    const updatedCamp = { ...camp, playerCharacters: updatedPCs };
    await saveCampaign(updatedCamp);
    
    // Hide form and re-render
    document.getElementById('dt-carouse-contact-form').classList.add('hidden');
    window.appActions.renderCarouseContactsList(pcId);
    notify("Contact bound successfully.", "success");
};

export const toggleCarouseContact = async (pcId, contactId) => {
    const camp = window.appData.activeCampaign;
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const updatedContacts = (p.carousingContacts || []).map(c => 
                c.id === contactId ? { ...c, active: !c.active } : c
            );
            return { ...p, carousingContacts: updatedContacts };
        }
        return p;
    });
    
    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    window.appActions.renderCarouseContactsList(pcId);
};

export const deleteCarouseContact = async (pcId, contactId) => {
    if(!confirm("Are you sure you want to permanently erase this contact?")) return;
    
    const camp = window.appData.activeCampaign;
    const updatedPCs = camp.playerCharacters.map(p => {
        if (p.id === pcId) {
            const updatedContacts = (p.carousingContacts || []).filter(c => c.id !== contactId);
            return { ...p, carousingContacts: updatedContacts };
        }
        return p;
    });
    
    await saveCampaign({ ...camp, playerCharacters: updatedPCs });
    window.appActions.renderCarouseContactsList(pcId);
};

// --- CORE CAROUSING MATH ---

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

    // DOWNTIME DAYS CHECK
    if ((parseInt(pc.availableDowntime) || 0) < 5) {
        notify(`Not enough downtime days. ${pc.name} only has ${parseInt(pc.availableDowntime) || 0} days available.`, "error");
        return;
    }

    const pMod = parseInt(document.getElementById('dt-carouse-mod').value) || 0;
    const socialClass = document.getElementById('dt-carouse-class').value;
    
    let goldCost = 10;
    if (socialClass === 'middle') goldCost = 50;
    if (socialClass === 'upper') goldCost = 250;

    const d20 = Math.floor(Math.random() * 20) + 1;
    const checkTotal = d20 + pMod;
    
    let baseAlliedGained = 0;
    let hostileGained = 0;
    
    if (checkTotal <= 5) hostileGained = 1;
    else if (checkTotal <= 15) baseAlliedGained = 1;
    else if (checkTotal <= 20) baseAlliedGained = 2;
    else baseAlliedGained = 3;

    // --- ENFORCE MAX ALLIED CONTACTS LIMIT ---
    let bankedContacts = pc.bankedContacts || [];
    let currentBankedAllies = bankedContacts.filter(c => c.type === 'ally').length;
    const maxAllies = Math.max(1, 1 + pMod); // Charisma/Persuasion cap

    let actualAlliedGained = 0;
    let lostAllies = 0;

    for (let i = 0; i < baseAlliedGained; i++) {
        if (currentBankedAllies + actualAlliedGained < maxAllies) {
            bankedContacts.push({ id: generateId(), type: 'ally', socialClass: socialClass, timestamp: Date.now() });
            actualAlliedGained++;
        } else {
            lostAllies++;
        }
    }

    for (let i = 0; i < hostileGained; i++) {
        bankedContacts.push({ id: generateId(), type: 'hostile', socialClass: socialClass, timestamp: Date.now() });
    }

    const d100 = Math.floor(Math.random() * 100) + 1;
    const hasComplication = d100 <= 10;
    
    let complicationText = "";
    if (hasComplication) {
        const d8 = Math.floor(Math.random() * 8) + 1;
        const compTables = {
            lower: [
                "A pickpocket lifts 1d10 × 5 gp from you.", 
                "A bar brawl leaves you with a scar.", 
                "You have fuzzy memories of doing something illegal...", 
                "You are banned from a tavern.", 
                "You swore to pursue a dangerous quest.", 
                "Surprise! You’re married.", 
                "Streaking naked seemed like a great idea...", 
                "Everyone is calling you an embarrassing nickname."
            ],
            middle: [
                "You accidentally insulted a guild master.", 
                "You swore a quest for a temple or a guild.", 
                "A social gaffe has made you the talk of the town.", 
                "An obnoxious person has taken a romantic interest in you.", 
                "You have made a foe of a local spellcaster.", 
                "You've been recruited to help run a local event.", 
                "You made a drunken toast that scandalized the locals.", 
                "You spent an additional 100 gp trying to impress people."
            ],
            upper: [
                "A pushy noble family wants to marry off one of their scions to you.", 
                "You tripped during a dance, and people can’t stop talking about it.", 
                "You have agreed to take on a noble’s debts.", 
                "You have been challenged to a joust by a knight.", 
                "You have made a foe of a local noble.", 
                "A boring noble insists you visit each day.", 
                "You are the target of embarrassing rumors.", 
                "You spent an additional 500 gp trying to impress people."
            ]
        };
        complicationText = `\n\n**⚠️ Complication Rolled!** (${d100}/100)\n> *Result (d8=${d8}):* ${compTables[socialClass][d8 - 1]}\n\n*(Any specific gold losses, scars, or relationships must be applied to your hero's sheet manually).*`;
    }

    let resultBody = ``;
    if (hostileGained > 0) resultBody += `❌ You made a poor impression and gained **${hostileGained} Hostile Contact(s)** in the ${socialClass} class.\n`;
    if (actualAlliedGained > 0) resultBody += `✅ You socialized successfully and gained **${actualAlliedGained} Allied Contact(s)** in the ${socialClass} class!\n`;
    if (lostAllies > 0) resultBody += `⚠️ **Limit Reached:** You met ${lostAllies} more potential allies, but your social network is full! Banked Allies are capped by your Persuasion modifier (Max: ${maxAllies}).\n`;
    if (hostileGained === 0 && actualAlliedGained === 0 && lostAllies === 0) resultBody += `You made no notable new contacts during this time.\n`;

    const noteText = `**Downtime: Carousing (${socialClass.charAt(0).toUpperCase() + socialClass.slice(1)} Class)**\n*Hero:* ${pc.name}\n\n**Time Spent:** 5 Days\n**Gold Spent (Expenses):** ${goldCost} gp\n**Check Result:** ${checkTotal} (Rolled ${d20} ${pMod >= 0 ? `+ ${pMod}` : `- ${Math.abs(pMod)}`})\n\n${resultBody}\n*(Be sure to check your Banked Contacts using the **Manage Contacts** button!)*${complicationText}`;

    const timestampStr = new Date().toLocaleDateString();
    const logAddition = `${pc.downtimeLog ? '\n\n---\n\n' : ''}**Logged on ${timestampStr}**\n${noteText}`;

    const updatedPCs = camp.playerCharacters.map(p => 
        p.id === pc.id ? { 
            ...p, 
            availableDowntime: Math.max(0, (parseInt(p.availableDowntime) || 0) - 5),
            downtimeLog: (p.downtimeLog || '') + logAddition,
            bankedContacts: bankedContacts
        } : p
    );

    let updatedCamp = { ...camp, playerCharacters: updatedPCs };
    updatedCamp = logPlayerActivity(updatedCamp, myUid, `spent downtime carousing with <span class="font-bold text-amber-700">${pc.name}</span>.`, 'fa-beer-mug-empty');

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    
    // Auto-open the contacts manager if they gained anyone!
    if (actualAlliedGained > 0 || hostileGained > 0) {
        setTimeout(() => {
            window.appActions.openCarousingModal();
            setTimeout(() => {
                document.getElementById('dt-carouse-pc').value = pc.id;
                window.appActions.openCarouseContacts();
            }, 100);
        }, 500);
        notify(`Carousing complete! ${actualAlliedGained + hostileGained} contacts banked.`, "success");
    } else {
        notify(`Carousing complete! 5 days deducted. Log saved to Hero Journal.`, "success");
        reRender();
    }
};

// ============================================================================
// --- GLOBAL EXPORTS BINDING ---
// ============================================================================

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    // Core Carousing
    window.appActions.openCarousingModal = openCarousingModal;
    window.appActions.updateCarousingMath = updateCarousingMath;
    window.appActions.executeCarousing = executeCarousing;
    
    // Contact Management System
    window.appActions.openCarouseContacts = openCarouseContacts;
    window.appActions.closeCarouseContacts = closeCarouseContacts;
    window.appActions.prepDefineContact = prepDefineContact;
    window.appActions.renderCarouseContactsList = renderCarouseContactsList;
    window.appActions.saveNewCarouseContact = saveNewCarouseContact;
    window.appActions.toggleCarouseContact = toggleCarouseContact;
    window.appActions.deleteCarouseContact = deleteCarouseContact;
}
