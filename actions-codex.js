import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { generateSessionMarkdown, generateAdventureMarkdown, generateCampaignMarkdown } from './markdown.js';

// --- Smart Text & Codex Interactions ---

// Core security helper to ensure players only link/see what they are allowed to see
export const _canViewCodex = (id) => {
    const camp = window.appData.activeCampaign;
    if (!camp) return false;
    if (camp._isDM) return true; // DM sees everything
    const myUid = window.appData.currentUserUid;

    // 1. Is it a PC owned by the player?
    const isHeroOwner = camp.playerCharacters?.some(p => p.id === id && p.playerId === myUid);
    if (isHeroOwner) return true;

    // 2. Look for formal codex entry
    const entry = camp.codex?.find(c => c.id === id);

    // 3. If there is no formal codex entry but it is a PC, default to public
    if (!entry && camp.playerCharacters?.some(p => p.id === id)) return true;

    if (entry) {
        const vis = entry.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
    }

    return false; // Otherwise, locked down!
};

export const parseSmartText = (text) => {
    if (!text) return "";
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // --- 1. PARSE MARKDOWN FORMATTING ---
    // Enhanced Headings and Dividers to perfectly support the markdown generator outputs
    safeText = safeText.replace(/^#### (.*?)$/gim, '<h4 class="text-sm font-bold mt-4 mb-1 text-stone-800">$1</h4>');
    safeText = safeText.replace(/^### (.*?)$/gim, '<h3 class="text-base font-bold mt-5 mb-2 text-stone-900 border-b border-[#d4c5a9] pb-1">$1</h3>');
    safeText = safeText.replace(/^## (.*?)$/gim, '<h2 class="text-lg font-bold mt-6 mb-2 text-stone-900 border-b-2 border-stone-400 pb-1">$1</h2>');
    safeText = safeText.replace(/^# (.*?)$/gim, '<h1 class="text-xl font-bold mt-6 mb-3 text-red-900 uppercase tracking-wider border-b-2 border-red-900 pb-2">$1</h1>');
    safeText = safeText.replace(/^---$/gim, '<hr class="my-4 border-[#d4c5a9]">');

    // Lists
    safeText = safeText.replace(/^- (.*?)$/gim, '<li class="ml-4 list-disc marker:text-stone-400">$1</li>');

    // Bold, Underline, Italic (Safari Safe)
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>');
    safeText = safeText.replace(/__(.*?)__/g, '<u class="underline decoration-stone-400 underline-offset-2">$1</u>');
    safeText = safeText.replace(/(^|[^\w])\*(.*?)\*(?!\w)/g, '$1<em class="italic text-stone-800">$2</em>');
    safeText = safeText.replace(/\b_(.*?)_\b/g, '<em class="italic text-stone-800">$1</em>');

    // --- 2. PARSE CODEX LINKS (SAFARI COMPATIBLE, ALIAS SUPPORT & FOG OF WAR PROTECTED) ---
    // We sort by length descending. This guarantees we match "Corval Shaedmokker" before matching just "Corval"
    // to prevent nesting links incorrectly!
    const sortedCache = [...window.appData.codexCache].sort((a,b) => b.text.length - a.text.length);

    if (sortedCache.length > 0) {
        // Build one massive regex pattern that matches ANY of our known aliases or full names
        const escapedNames = sortedCache.map(e => e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const massiveRegex = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

        // Split the text by HTML tags to safely ONLY run our Regex replacement on plain text nodes
        let parts = safeText.split(/(<[^>]+>)/g);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith('<') && parts[i].endsWith('>')) continue;
            parts[i] = parts[i].replace(massiveRegex, (match) => {
                const entry = sortedCache.find(e => e.text.toLowerCase() === match.toLowerCase());
                // SECURITY CHECK: Only generate a link if the current user has permission to see the entry!
                if (entry && _canViewCodex(entry.id)) {
                    return `<span class="codex-link" onclick="window.appActions.viewCodex('${entry.id}')">${match}</span>`;
                }
                return match; // If hidden, return plain unclickable text
            });
        }
        safeText = parts.join('');
    }

    // --- 3. LINE BREAKS ---
    safeText = safeText.replace(/\n/g, '<br>');

    // Cleanup trailing tags immediately following block elements
    safeText = safeText.replace(/<\/h1><br>/g, '</h1>');
    safeText = safeText.replace(/<\/h2><br>/g, '</h2>');
    safeText = safeText.replace(/<\/h3><br>/g, '</h3>');
    safeText = safeText.replace(/<\/h4><br>/g, '</h4>');
    safeText = safeText.replace(/<\/li><br>/g, '</li>');
    safeText = safeText.replace(/(<hr[^>]*>)<br>/g, '$1');

    return safeText;
};

export const handleSmartInput = (textarea) => {
    window.appData.activeSmartTextarea = textarea;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // Extract the last 40 characters before cursor to process auto-complete
    const textBefore = text.substring(Math.max(0, cursorPos - 40), cursorPos);
    
    let bestMatches = [];
    let matchLength = 0;

    const sortedCache = [...window.appData.codexCache].sort((a,b) => b.text.length - a.text.length);

    for (let entry of sortedCache) {
        // SECURITY CHECK: Do not suggest hidden codex entries in the autocomplete box
        if (!_canViewCodex(entry.id)) continue;

        const lowerName = entry.text.toLowerCase();
        // Check substrings from 3 chars up to the full length of the codex name
        for (let i = 3; i <= entry.text.length; i++) {
            const prefix = lowerName.substring(0, i);
            if (textBefore.toLowerCase().endsWith(prefix)) {
                // Ensure we are matching from the start of a word to prevent spam
                const charBeforeMatch = textBefore.charAt(textBefore.length - i - 1);
                if (textBefore.length === i || /[ \n\t]/.test(charBeforeMatch)) {
                    if (i > matchLength) {
                        matchLength = i;
                        bestMatches = [entry.text];
                    } else if (i === matchLength && !bestMatches.includes(entry.text)) {
                        bestMatches.push(entry.text);
                    }
                }
            }
        }
    }

    if (bestMatches.length > 0 && bestMatches.length <= 5) {
        const typedWord = textBefore.substring(textBefore.length - matchLength).toLowerCase();
        const isExactAliasMatch = window.appData.codexCache.some(c => c.text.toLowerCase() === typedWord);
        
        // If what they typed perfectly matches an existing alias/short name (e.g. "Corval"), hide the annoying box!
        if (isExactAliasMatch) {
            document.getElementById('autocomplete-suggestions').style.display = 'none';
            return;
        }

        _showSuggestions(bestMatches, textarea, cursorPos, matchLength);
        return;
    }

    document.getElementById('autocomplete-suggestions').style.display = 'none';
};

export const _showSuggestions = (matches, inputEl, cursor, triggerLen) => {
    const suggestions = document.getElementById('autocomplete-suggestions');
    if(!suggestions) return;
    
    suggestions.innerHTML = '';
    const rect = inputEl.getBoundingClientRect();
    suggestions.style.left = (rect.left + window.scrollX + 20) + 'px';
    suggestions.style.top = (rect.top + window.scrollY + 30) + 'px';
    suggestions.style.display = 'block';

    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = "autocomplete-item";
        div.innerText = m;
        div.onmousedown = (e) => {
            e.preventDefault();
            const text = inputEl.value;
            const before = text.substring(0, cursor - triggerLen);
            const after = text.substring(cursor);
            inputEl.value = before + m + after;
            suggestions.style.display = 'none';
        };
        suggestions.appendChild(div);
    });
};

export const viewCodex = (id) => {
    // SECURITY CHECK: Final hard block if someone explicitly triggers viewCodex on a hidden ID
    if (!_canViewCodex(id)) {
        notify("The contents of this entry are sealed.", "error");
        return;
    }

    updateDerivedState();
    const camp = window.appData.activeCampaign;
    let entry = (camp?.codex || []).find(c => c.id === id);

    // Fallback for Legacy PCs that don't have a generated codex entry yet
    if (!entry && camp?.playerCharacters?.some(p => p.id === id)) {
        const pc = camp.playerCharacters.find(p => p.id === id);
        entry = {
            id: pc.id,
            name: pc.name,
            type: 'PC',
            tags: ['Hero', pc.race, pc.classLevel].filter(Boolean),
            desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
            visibility: { mode: 'public' }
        };
    }

    if (!entry) {
        notify("Codex entry not found.", "error");
        return;
    }
    _openCodexModal(entry);
};

export const _openCodexModal = (entry) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const container = document.getElementById('global-popup-container');
    if (!container || !camp) return;

    const isNew = entry.isNew || !entry.id;
    const id = entry.id || "";
    const name = entry.name || "";
    const type = entry.type || "NPC";
    const desc = entry.desc || "";
    const tags = entry.tags ? entry.tags.join(', ') : "";

    // Check editing permissions
    const isDM = camp._isDM;
    const myUid = window.appData.currentUserUid;
    const linkedPC = camp.playerCharacters?.find(p => p.id === id);
    const isHeroOwner = linkedPC && linkedPC.playerId === myUid;
    const canEdit = isDM || isHeroOwner;
    const canDelete = isDM && !linkedPC; // Core Hero profiles can only be deleted via the PC manager

    const viewHidden = isNew ? "hidden" : "";
    const editHidden = isNew ? "" : "hidden";

    let tagsHTML = `<span class="codex-tag">${type}</span>`;
    if (entry.tags) {
        tagsHTML += entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
    }

    // --- DYNAMIC HERO INJECTION ---
    let pcDataHTML = '';
    if (linkedPC) {
        const parsedApp = linkedPC.appearance ? parseSmartText(linkedPC.appearance) : '<span class="text-stone-400 italic">No appearance recorded...</span>';
        pcDataHTML = `
            <div class="mb-4 bg-white border border-[#d4c5a9] p-3 rounded-sm shadow-inner text-sm">
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">Characteristics</h4>
                <div class="grid grid-cols-2 gap-2 text-xs text-stone-700 mb-3">
                    <div><span class="font-bold text-stone-900">Gender:</span> ${linkedPC.gender || '--'}</div>
                    <div><span class="font-bold text-stone-900">Age:</span> ${linkedPC.age || '--'}</div>
                    <div><span class="font-bold text-stone-900">Size:</span> ${linkedPC.size || '--'}</div>
                    <div><span class="font-bold text-stone-900">Height:</span> ${linkedPC.height || '--'}</div>
                    <div><span class="font-bold text-stone-900">Weight:</span> ${linkedPC.weight || '--'}</div>
                    <div><span class="font-bold text-stone-900">Eyes:</span> ${linkedPC.eyes || '--'}</div>
                    <div><span class="font-bold text-stone-900">Hair:</span> ${linkedPC.hair || '--'}</div>
                    <div><span class="font-bold text-stone-900">Skin:</span> ${linkedPC.skin || '--'}</div>
                </div>
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">Appearance</h4>
                <div class="text-stone-800 text-sm leading-relaxed">${parsedApp}</div>
            </div>
        `;
    }

    const parsedDesc = desc ? parseSmartText(desc) : '<span class="text-stone-400 italic">No entries found...</span>';
    const descLabel = linkedPC ? "Public Knowledge (Rumors & Repute)" : "Description";
    const descPlaceholder = linkedPC ? "What do people know about this hero? Scribe their rumors, repute, and public knowledge..." : "Description... Codex names link automatically.";

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-lg border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-red-900 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-book-journal-whills text-amber-500 text-xl"></i>
                        <div>
                            <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">Codex Entry</h2>
                            <p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">${linkedPC ? 'Hero Profile' : 'Knowledge Base'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${(!isNew && canEdit) ? `<button id="cx-edit-btn" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center" title="Edit Entry"><i class="fa-solid fa-pen-nib"></i></button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>

                <!-- View Mode -->
                <div id="cx-view-mode" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] ${viewHidden}">
                    <div class="mb-4">
                        <h3 class="text-2xl font-serif font-bold text-stone-900">${name}</h3>
                        <div class="mt-2">${tagsHTML}</div>
                    </div>
                    ${pcDataHTML}
                    <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">${descLabel}</h4>
                    <div class="text-stone-800 text-sm leading-relaxed">${parsedDesc}</div>
                </div>

                <!-- Edit Mode -->
                <div id="cx-edit-mode" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] ${editHidden}">
                    <input type="hidden" id="cx-modal-id" value="${id}">
                    <div class="bg-red-900 text-amber-50 text-xs font-bold uppercase tracking-wider py-1 px-3 inline-block rounded-sm mb-4 shadow-sm">
                        ${isNew ? 'Define New Entity' : 'Amend Record'}
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Name (Auto-Link Trigger)</label>
                        <input type="text" id="cx-modal-name" value="${name}" ${linkedPC ? 'readonly disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-[#fdfbf7] text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner">
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type</label>
                        <select id="cx-modal-type" ${linkedPC ? 'disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-[#fdfbf7] text-stone-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner">
                            <option value="PC" ${type==='PC'?'selected':''}>PC</option>
                            <option value="NPC" ${type==='NPC'?'selected':''}>NPC</option>
                            <option value="Location" ${type==='Location'?'selected':''}>Location</option>
                            <option value="Faction" ${type==='Faction'?'selected':''}>Faction</option>
                            <option value="Item" ${type==='Item'?'selected':''}>Item</option>
                            <option value="Lore" ${type==='Lore'?'selected':''}>Lore / Rule</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Tags (Comma Separated)</label>
                        <input type="text" id="cx-modal-tags" value="${tags}" ${linkedPC ? 'readonly disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-[#fdfbf7] text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner" placeholder="e.g. Ally, Vendor">
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">${descLabel}</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9]">
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'bold')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'italic')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'underline')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1"></div>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h1')" class="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h2')" class="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'list')" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                            </div>
                        </div>
                        <textarea id="cx-modal-desc" class="w-full h-40 bg-[#fdfbf7] border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-red-900 outline-none resize-none rounded-b-sm shadow-inner custom-scrollbar" placeholder="${descPlaceholder}">${desc}</textarea>
                    </div>
                </div>

                <!-- Actions -->
                <div id="cx-edit-actions" class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex justify-between gap-3 ${editHidden}">
                    ${(!isNew && canDelete) ? `<button onclick="window.appActions.deleteCodexEntry('${id}')" class="px-4 py-2 bg-red-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-red-800 transition"><i class="fa-solid fa-trash mr-1"></i> Delete</button>` : `<div>${linkedPC ? '<span class="text-[10px] uppercase text-stone-500 font-bold"><i class="fa-solid fa-lock mr-1"></i> Core Hero Profile</span>' : ''}</div>`}
                    <div class="flex gap-3">
                        <button onclick="${isNew ? `document.getElementById('global-popup-container').innerHTML = '';` : `document.getElementById('cx-view-mode').classList.remove('hidden'); document.getElementById('cx-edit-mode').classList.add('hidden'); document.getElementById('cx-edit-actions').classList.add('hidden');`}" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveCodexEntry()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!isNew && canEdit) {
        const editBtn = document.getElementById('cx-edit-btn');
        if (editBtn) {
            editBtn.onclick = () => {
                document.getElementById('cx-view-mode').classList.add('hidden');
                document.getElementById('cx-edit-mode').classList.remove('hidden');
                document.getElementById('cx-edit-actions').classList.remove('hidden');
            };
        }
    }
};

export const saveCodexEntry = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const id = document.getElementById('cx-modal-id').value;
    const name = document.getElementById('cx-modal-name').value.trim();
    if (!name) {
        notify("A name is required for Codex auto-linking.", "error");
        return;
    }

    const newEntry = {
        id: id || generateId(),
        name: name,
        type: document.getElementById('cx-modal-type').value,
        tags: document.getElementById('cx-modal-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('cx-modal-desc').value
    };

    const isNew = !id;
    const newCodexArray = isNew ? [...(camp.codex || []), newEntry] : camp.codex.map(c => c.id === id ? newEntry : c);
    
    const updatedCamp = { ...camp, codex: newCodexArray };
    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Codex updated.", "success");
};

export const deleteCodexEntry = async (id) => {
    if (!confirm("Destroy this Codex entry? Auto-links using this name will no longer function.")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const updatedCamp = {
        ...camp,
        codex: (camp.codex || []).filter(c => c.id !== id)
    };

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Entry destroyed.", "success");
};

// --- Journal Viewing ---
export const openJournal = (scope, sessionId = null) => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    const adv = window.appData.activeAdventure;
    if (!camp) return;

    let md = '';
    if (scope === 'session' && sessionId) {
        window.appData.activeSessionId = sessionId;
        updateDerivedState();
        const session = window.appData.activeSession;
        if (session) md = generateSessionMarkdown(session, camp);
    } else if (scope === 'adventure' && adv) {
        window.appData.activeSessionId = null;
        md = generateAdventureMarkdown(adv, camp);
    } else if (scope === 'campaign') {
        window.appData.activeAdventureId = null;
        window.appData.activeSessionId = null;
        md = generateCampaignMarkdown(camp);
    }

    window.appData.currentMarkdown = md;
    window.appActions.setView('journal');
};

export const closeJournal = () => {
    if (window.appData.activeSessionId) {
        window.appData.activeSessionId = null;
        window.appActions.setView('adventure');
    } else if (window.appData.activeAdventureId) {
        window.appActions.setView('adventure');
    } else {
        window.appActions.setView('campaign');
    }
};

export const copyJournal = () => {
    const text = window.appData.currentMarkdown || '';
    const btn = document.getElementById('journal-copy-btn');
    const originalHtml = btn ? btn.innerHTML : '';
    
    const handleSuccess = () => {
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Scribed!`;
            btn.className = "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-emerald-700 text-white border border-emerald-900";
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.className = "flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider flex justify-center items-center transition shadow-md bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500";
            }, 2000);
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(handleSuccess);
    } else {
        let textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            handleSuccess();
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    }
};
