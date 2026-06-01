import { generateId, updateDerivedState } from './state.js';
import { saveCampaign, notify } from './firebase-manager.js';
import { generateSessionMarkdown, generateAdventureMarkdown, generateCampaignMarkdown } from './markdown.js';
import { logPlayerActivity } from './actions-campaign.js';

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

    // NEW HARD BLOCK: If it is a PC and it's marked private, but NOT owned by the player, block it immediately.
    const pc = camp.playerCharacters?.find(p => p.id === id);
    if (pc && pc.isPrivate) return false;

    // 2. Look for formal codex entry
    const entry = camp.codex?.find(c => c.id === id);

    // 3. If there is no formal codex entry but it is a PC, default to public
    if (!entry && pc) return true;

    if (entry) {
        const vis = entry.visibility || { mode: 'public' };
        if (vis.mode === 'public') return true;
        if (vis.mode === 'specific' && vis.visibleTo?.includes(myUid)) return true;
    }

    return false; // Otherwise, locked down!
};

export const parseSmartText = (text, contextId = null) => {
    if (!text) return "";
    
    // STRIP INVISIBLE PLACEHOLDERS FIRST (Pattern Magic Resolutions)
    let safeText = text.replace(/<!--\s*RESOLUTION_PLACEHOLDER_[a-zA-Z0-9_-]+\s*-->/gi, '');

    safeText = safeText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // --- 0. PARSE EMBEDDED IMAGES ---
    // Matches Markdown image syntax: ![Alt Text](URL)
    // Wrapped in a beautifully styled parchment container with a custom error fallback image.
    // Direct, explicit trigger added to onclick bypassing parent propagation blocks!
    safeText = safeText.replace(/!\[(.*?)\]\((.*?)\)/gi, (match, alt, url) => {
        return `<div class="my-4 flex flex-col items-center justify-center bg-stone-100 p-2.5 border border-[#d4c5a9] rounded-sm shadow-sm max-w-full relative z-10" onclick="event.stopPropagation();">
            <img src="${url}" alt="${alt}" class="max-h-[350px] max-w-full object-contain rounded-sm shadow-md cursor-zoom-in hover:opacity-95 transition" onclick="if(window.appActions && window.appActions.openFullscreenImage){ window.appActions.openFullscreenImage(this.src); } event.stopPropagation();" onerror="this.onerror=null; this.src='https://placehold.co/600x400?text=Image+Not+Found';">
            ${alt ? `<span class="text-[10px] text-stone-500 italic mt-2 font-sans">${alt}</span>` : ''}
        </div>`;
    });

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

    // --- 1.5. PARSE CURRENCY HIGHLIGHTING ---
    // Finds values like "50 gp", "1,500 gold pieces", "5.5 pp", "100 silver", "50 gp x 10" etc.
    const currencyRegex = /\b((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(cp|sp|ep|gp|pp|copper|silver|electrum|gold|platinum)(?:\s+(?:pieces?|coins?))?\b(?:\s*[*x]\s*(?:\d{1,3}(?:,\d{3})+|\d+))?\b/gi;
    safeText = safeText.replace(currencyRegex, '<span class="inline-flex items-center font-bold text-amber-800 bg-amber-100/60 border border-amber-300 px-1.5 py-0.5 rounded-sm shadow-sm whitespace-nowrap mx-0.5 text-xs"><i class="fa-solid fa-coins text-amber-500 mr-1.5 drop-shadow-sm"></i>$&</span>');

    // --- 2. PARSE CODEX LINKS (SAFARI COMPATIBLE, ALIAS SUPPORT & FOG OF WAR PROTECTED) ---
    // We sort by length descending. This guarantees we match "Corval Shaedmokker" before matching just "Corval"
    // to prevent nesting links incorrectly!
    const sortedCache = [...window.appData.codexCache].sort((a,b) => b.text.length - a.text.length);

    if (sortedCache.length > 0) {
        // Build one massive regex pattern that matches ANY of our known aliases or full names
        const escapedNames = sortedCache.map(e => e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const massiveRegex = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

        // Track which IDs have already been linked in this block of text to prevent over-linking
        const linkedIds = new Set();

        // Split the text by HTML tags to safely ONLY run our Regex replacement on plain text nodes
        let parts = safeText.split(/(<[^>]+>)/g);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith('<') && parts[i].endsWith('>')) continue;
            parts[i] = parts[i].replace(massiveRegex, (match, p1, offset, string) => {
                const entry = sortedCache.find(e => e.text.toLowerCase() === match.toLowerCase());
                
                if (entry) {
                    // PREVENT AUTO-LINKING CHECK
                    // If the word is prefixed with a backslash '\', skip linking it entirely!
                    // This prevents it from entering the 'linkedIds' set, forcing the auto-linker 
                    // to find the NEXT instance of the word in the text block to link instead.
                    if (offset > 0 && string.charAt(offset - 1) === '\\') {
                        return match; 
                    }

                    // PREVENT SELF-LINKING: Don't link an entry to itself if we are currently viewing it
                    if (entry.id === contextId) return match;
                    
                    // PREVENT OVER-LINKING: Only link an entity once per text block
                    if (linkedIds.has(entry.id)) return match;
                    
                    // SECURITY CHECK: Only generate a link if the current user has permission to see the entry!
                    if (_canViewCodex(entry.id)) {
                        linkedIds.add(entry.id);
                        return `<span class="codex-link" onclick="window.appActions.viewCodex('${entry.id}')">${match}</span>`;
                    }
                }
                return match; // If hidden or skipped, return plain unclickable text
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

    // CLEANUP: Strip the escape backslash '\' used to prevent linking so it renders cleanly
    safeText = safeText.replace(/\\(?=[a-zA-Z0-9])/g, '');

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

// --- CREATE ENTRY FROM HIGHLIGHTED TEXT ---
export const defineEntryFromSelection = async (textareaId) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    // 1. Grab the text the user has highlighted BEFORE we potentially save and destroy the DOM element
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
    
    if (!selectedText) {
        notify("Please highlight a word or phrase to define.", "error");
        return;
    }

    // 2. Auto-save mechanisms for Modals that share the global-popup-container to prevent data loss
    if (textareaId === 'cx-modal-desc' || textareaId === 'cx-modal-dmnotes') {
        const nameInput = document.getElementById('cx-modal-name');
        if (!nameInput || !nameInput.value.trim()) {
            notify("Please name this entry before defining links inside it.", "error");
            return;
        }
        await window.appActions.saveCodexEntry();
    } 
    else if (textareaId === 'rule-modal-text') {
        const nameInput = document.getElementById('rule-modal-name');
        if (!nameInput || !nameInput.value.trim()) {
            notify("Please title this rule before defining links inside it.", "error");
            return;
        }
        await window.appActions.saveRule();
    }
    else if (textareaId === 'cal-note-text') {
        const textInput = document.getElementById('cal-note-text');
        if (!textInput || !textInput.value.trim()) {
            notify("Please write something in your note before defining links.", "error");
            return;
        }
        await window.appActions.saveCalendarNote();
    }
    else if (textareaId === 'ue-textarea') {
        // Synchronously dump the Universal Editor contents back to the underlying form
        window.appActions.saveUniversalEditor();
    }

    // 3. Open a fresh Codex Modal, prefilling the name! 
    window.appActions._openCodexModal({ isNew: true, name: selectedText });
};

// --- PREVENT AUTO-LINKING FROM SELECTION ---
export const preventLinkFromSelection = async (textareaId) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end).trim();
    
    if (!selectedText) {
        notify("Please highlight a word to prevent it from linking.", "error");
        return;
    }

    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    // Inject a backslash immediately before the highlighted word
    textarea.value = before + '\\' + text.substring(start, end) + after;

    // Auto-save mechanisms to ensure data isn't lost if they exit
    if (textareaId === 'cx-modal-desc' || textareaId === 'cx-modal-dmnotes') {
        await window.appActions.saveCodexEntry();
    } 
    else if (textareaId === 'rule-modal-text') {
        await window.appActions.saveRule();
    }
    else if (textareaId === 'cal-note-text') {
        await window.appActions.saveCalendarNote();
    }
    else if (textareaId === 'ue-textarea') {
        window.appActions.saveUniversalEditor();
    } else {
        textarea.dispatchEvent(new Event('input'));
    }

    // Restore selection focus
    textarea.focus();
    textarea.setSelectionRange(start, end + 1); 
};

// --- NEW FEATURE: DYNAMICALLY EMBED Markdown Image Placeholders ---
export const insertImagePlaceholder = (textareaId) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end).trim() || "Image Description";

    const imageUrl = prompt("Enter the direct image URL:", "https://");
    if (imageUrl === null) return; // Cancelled
    
    const markdownImage = `![${selectedText}](${imageUrl || 'https://example.com/image.jpg'})`;

    const before = text.substring(0, start);
    const after = text.substring(end);

    textarea.value = before + markdownImage + after;

    // Trigger input event to let autosave or state tracking fire
    textarea.dispatchEvent(new Event('input'));
    
    textarea.focus();
    textarea.setSelectionRange(start + 2, start + 2 + selectedText.length);
};

// --- DYNAMIC LOCATION FIELDS TOGGLE ---
export const updateLocEditFields = () => {
    const scale = document.getElementById('cx-loc-scale')?.value;
    if (!scale) return;

    const pop = document.getElementById('loc-pop-wrap');
    const gov = document.getElementById('loc-gov-wrap');
    const eco = document.getElementById('loc-eco-wrap');
    const def = document.getElementById('loc-def-wrap');

    const hidePopGov = ['Building / Establishment', 'Dungeon / Ruin', 'Geographical Feature'].includes(scale);
    const hideEco = ['Dungeon / Ruin', 'Geographical Feature'].includes(scale);
    const hideDef = ['Geographical Feature'].includes(scale);

    if (pop) pop.style.display = hidePopGov ? 'none' : 'block';
    if (gov) gov.style.display = hidePopGov ? 'none' : 'block';
    if (eco) eco.style.display = hideEco ? 'none' : 'block';
    if (def) def.style.display = hideDef ? 'none' : 'block';
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
        
        let fallbackVis = { mode: 'public' };
        if (pc.isPrivate) {
            fallbackVis = pc.playerId ? { mode: 'specific', visibleTo: [pc.playerId] } : { mode: 'hidden', visibleTo: [] };
        }
        
        entry = {
            id: pc.id,
            name: pc.name,
            type: 'PC',
            tags: ['Hero', pc.race, pc.classLevel].filter(Boolean),
            desc: 'Rumors and public knowledge surrounding this hero are yet to be penned.',
            visibility: fallbackVis,
            image: pc.image || ""
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
    const image = entry.image || "";

    // Check editing permissions
    const isDM = camp._isDM;
    const myUid = window.appData.currentUserUid;
    const linkedPC = camp.playerCharacters?.find(p => p.id === id);
    const isHeroOwner = linkedPC && linkedPC.playerId === myUid;
    const isAuthor = entry.authorId === myUid;
    const canEdit = isDM || isHeroOwner || isAuthor || isNew;
    const canDelete = (isDM || isAuthor) && !linkedPC; // Core Hero profiles can only be deleted via the PC manager

    const viewHidden = isNew ? "hidden" : "";
    const editHidden = isNew ? "" : "hidden";

    let tagsHTML = `<span class="codex-tag">${type}</span>`;
    if (entry.tags) {
        tagsHTML += entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
    }

    const resolvedImage = image || (linkedPC ? linkedPC.image : "");
    const imgHTML = resolvedImage ? `<div class="mb-5 w-full h-48 sm:h-64 bg-stone-900 border border-[#d4c5a9] rounded-sm overflow-hidden shadow-inner"><img src="${resolvedImage}" class="w-full h-full object-contain object-top" alt="${name}" onerror="this.style.display='none'"></div>` : '';

    // --- DYNAMIC HERO, NPC & LOCATION INJECTION (Unifies Public & Private Knowledge) ---
    let charDataHTML = '';
    let locationDataHTML = '';
    let privateDataHTML = '';

    const isCharacter = type === 'PC' || type === 'NPC';
    const isLocation = type === 'Location';
    
    // Universally bind dataSrc so ALL entries (Lore, Factions, Items, etc.) can display DM Notes
    const dataSrc = linkedPC ? linkedPC : entry;

    if (isCharacter && dataSrc) {
        const parsedApp = dataSrc.appearance ? window.appActions.parseSmartText(dataSrc.appearance, id) : '<span class="text-stone-400 italic font-sans">No appearance recorded...</span>';
        
        charDataHTML = `
            <div class="mb-6 bg-white border border-[#d4c5a9] p-4 rounded-sm shadow-inner text-sm">
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-3"><i class="fa-solid fa-clipboard-user mr-1"></i> Characteristics</h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-700 mb-4">
                    <div><span class="font-bold text-stone-900 block">Race / Lineage</span> ${dataSrc.race || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Class / Level</span> ${dataSrc.classLevel || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Background</span> ${dataSrc.background || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Alignment</span> ${dataSrc.alignment || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Faith</span> ${dataSrc.faith || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Gender</span> ${dataSrc.gender || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Age</span> ${dataSrc.age || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Size</span> ${dataSrc.size || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Height</span> ${dataSrc.height || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Weight</span> ${dataSrc.weight || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Eyes</span> ${dataSrc.eyes || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Hair</span> ${dataSrc.hair || '--'}</div>
                    <div><span class="font-bold text-stone-900 block">Skin</span> ${dataSrc.skin || '--'}</div>
                </div>
                <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-eye mr-1"></i> Appearance</h4>
                <div class="text-stone-800 text-sm leading-relaxed font-serif">${parsedApp}</div>
            </div>
        `;
    }

    if (isLocation && dataSrc) {
        const parsedPOI = dataSrc.pointsOfInterest ? window.appActions.parseSmartText(dataSrc.pointsOfInterest, id) : '';
        
        let locDetails = '';
        if (dataSrc.locationType) locDetails += `<div><span class="font-bold text-stone-900 block">Scale / Type</span> ${dataSrc.locationType}</div>`;
        if (dataSrc.region) locDetails += `<div><span class="font-bold text-stone-900 block">Region / Territory</span> ${dataSrc.region}</div>`;
        if (dataSrc.population) locDetails += `<div><span class="font-bold text-stone-900 block">Population</span> ${dataSrc.population}</div>`;
        if (dataSrc.government) locDetails += `<div><span class="font-bold text-stone-900 block">Government / Ruler</span> ${dataSrc.government}</div>`;
        if (dataSrc.economy) locDetails += `<div><span class="font-bold text-stone-900 block">Economy / Trade</span> ${dataSrc.economy}</div>`;
        if (dataSrc.defenses) locDetails += `<div class="col-span-1 sm:col-span-2"><span class="font-bold text-stone-900 block">Defenses / Hazards</span> ${dataSrc.defenses}</div>`;

        if (locDetails) {
            locDetails = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 mb-4">${locDetails}</div>`;
        }

        if (locDetails || parsedPOI) {
            locationDataHTML = `
            <div class="mb-6 bg-white border border-[#d4c5a9] p-4 rounded-sm shadow-inner text-sm">
                <h4 class="font-bold text-emerald-900 border-b border-[#d4c5a9] pb-1 mb-3"><i class="fa-solid fa-map-location-dot mr-1"></i> Location Details</h4>
                ${locDetails}
                ${parsedPOI ? `
                <h4 class="font-bold text-emerald-900 border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-location-dot mr-1"></i> Points of Interest</h4>
                <div class="text-stone-800 text-sm leading-relaxed font-serif">${parsedPOI}</div>
                ` : ''}
            </div>
            `;
        }
    }

    // Render Private Info for Authorized Users
    if (dataSrc) {
        const canViewPrivate = isDM || isHeroOwner || (!linkedPC && isAuthor);
        
        if (canViewPrivate) {
            const renderPrivateBlock = (blockTitle, content) => content ? `
                <div class="mb-4">
                    <h5 class="font-bold text-stone-800 text-[10px] uppercase tracking-widest border-b border-stone-300 pb-1 mb-1.5">${blockTitle}</h5>
                    <div class="text-sm text-stone-700 font-serif leading-relaxed">${window.appActions.parseSmartText(content, id)}</div>
                </div>` : '';
            
            // Check if there is ANY private data to show
            const hasPrivateData = dataSrc.backstory || dataSrc.traits || dataSrc.ideals || dataSrc.bonds || dataSrc.flaws || dataSrc.organizations || dataSrc.allies || dataSrc.enemies || dataSrc.dmNotes || dataSrc.secrets;

            if (hasPrivateData) {
                privateDataHTML = `
                <div class="mt-8 border-t-4 border-stone-800 pt-6">
                    <h4 class="font-serif font-bold text-xl text-stone-900 mb-4 flex items-center"><i class="fa-solid fa-lock mr-2 text-stone-500"></i> Private Information</h4>
                    <div class="bg-stone-200 p-5 rounded-sm border border-[#d4c5a9] shadow-inner">
                        ${renderPrivateBlock('Backstory', dataSrc.backstory)}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            ${renderPrivateBlock('Personality Traits', dataSrc.traits)}
                            ${renderPrivateBlock('Ideals', dataSrc.ideals)}
                            ${renderPrivateBlock('Bonds', dataSrc.bonds)}
                            ${renderPrivateBlock('Flaws', dataSrc.flaws)}
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2">
                            ${renderPrivateBlock('Organizations', dataSrc.organizations)}
                            ${renderPrivateBlock('Allies', dataSrc.allies)}
                            ${renderPrivateBlock('Enemies', dataSrc.enemies)}
                        </div>
                        ${renderPrivateBlock('<i class="fa-solid fa-user-secret text-stone-800 mr-1"></i> Hidden Secrets', dataSrc.secrets)}
                        ${renderPrivateBlock('<i class="fa-solid fa-eye text-red-800 mr-1"></i> Secret Notes (DM)', dataSrc.dmNotes)}
                    </div>
                </div>
                `;
            }
        }
    }

    const parsedDesc = desc ? window.appActions.parseSmartText(desc, id) : '<span class="text-stone-400 italic font-sans">No entries found...</span>';
    
    let descLabel = "Description";
    let descPlaceholder = "Description... Codex names link automatically.";
    if (isCharacter) {
        descLabel = "Public Knowledge (Rumors & Repute)";
        descPlaceholder = "What do people know about this character? Scribe their rumors, repute, and public knowledge...";
    } else if (isLocation) {
        descLabel = "Location Description (Public)";
        descPlaceholder = "Scribe the visual description, atmosphere, and public knowledge about this location...";
    }

    // --- ATLAS MAP INTEGRATION ---
    let mapBtnHtml = '';
    const linkedPin = camp.atlasPins?.find(p => p.codexId === id);
    const linkedRoute = camp.atlasRoutes?.find(r => r.codexId === id);
    if ((linkedPin || linkedRoute) && !isNew) {
        mapBtnHtml = `
            <button onclick="document.getElementById('global-popup-container').innerHTML = ''; window.appActions.viewOnMap('${id}')" class="mt-4 w-full py-2 border border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 rounded-sm text-[10px] font-bold uppercase tracking-wider transition shadow-sm flex items-center justify-center">
                <i class="fa-solid fa-map-location-dot mr-2"></i> View on Atlas
            </button>
        `;
    }

    // --- SUPPLEMENTARY EDIT FIELDS INJECTION ---
    const extendedEditHtml = `
    <div id="npc-edit-fields" class="${type === 'NPC' && !linkedPC ? '' : 'hidden'} mt-6 pt-6 border-t-2 border-stone-300">
        <div class="bg-blue-900/10 border-l-4 border-blue-600 p-3 rounded-sm text-xs text-stone-800 italic mb-6">
            <i class="fa-solid fa-circle-info text-blue-600 mr-1"></i> <strong>NPC Details:</strong> Characteristics and Appearance are Public. Backstory and Traits remain Private (visible to the author and DM).
        </div>
        
        <h4 class="text-[10px] font-bold text-red-900 uppercase tracking-widest mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-clipboard-user mr-1"></i> Characteristics (Public)</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Race / Lineage</label><input type="text" id="cx-npc-race" value="${entry.race || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Class / Level</label><input type="text" id="cx-npc-class" value="${entry.classLevel || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Background</label><input type="text" id="cx-npc-background" value="${entry.background || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Alignment</label><input type="text" id="cx-npc-alignment" value="${entry.alignment || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Faith</label><input type="text" id="cx-npc-faith" value="${entry.faith || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Gender</label><input type="text" id="cx-npc-gender" value="${entry.gender || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Age</label><input type="text" id="cx-npc-age" value="${entry.age || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Size</label><input type="text" id="cx-npc-size" value="${entry.size || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm" placeholder="Medium"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Height</label><input type="text" id="cx-npc-height" value="${entry.height || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Weight</label><input type="text" id="cx-npc-weight" value="${entry.weight || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Eyes</label><input type="text" id="cx-npc-eyes" value="${entry.eyes || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Hair</label><input type="text" id="cx-npc-hair" value="${entry.hair || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Skin</label><input type="text" id="cx-npc-skin" value="${entry.skin || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-red-900 shadow-sm"></div>
        </div>

        <div class="mb-6">
            <div class="flex justify-between items-end mb-1">
                <label class="block text-[9px] uppercase text-stone-500 font-bold">Appearance (Public)</label>
                <div class="flex gap-1 bg-stone-200 p-0.5 rounded-sm border border-[#d4c5a9]">
                    <button type="button" onclick="window.appActions.formatText('cx-npc-appearance', 'bold')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Bold"><i class="fa-solid fa-bold"></i></button>
                    <button type="button" onclick="window.appActions.formatText('cx-npc-appearance', 'italic')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Italic"><i class="fa-solid fa-italic"></i></button>
                    <button type="button" onclick="window.appActions.insertImagePlaceholder('cx-npc-appearance')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                </div>
            </div>
            <textarea id="cx-npc-appearance" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white text-stone-900 h-24 font-serif outline-none focus:border-red-900 shadow-inner custom-scrollbar placeholder:italic" placeholder="Detailed physical description, scars, clothing...">${(entry.appearance || '').replace(/"/g, '&quot;')}</textarea>
        </div>

        <h4 class="text-[10px] font-bold text-stone-700 uppercase tracking-widest mb-3 mt-8 border-b border-stone-300 pb-1"><i class="fa-solid fa-lock mr-1"></i> Private Information</h4>
        
        <div class="mb-4">
            <div class="flex justify-between items-end mb-1">
                <label class="block text-[9px] uppercase text-stone-500 font-bold">Backstory</label>
                <div class="flex gap-1 bg-stone-200 p-0.5 rounded-sm border border-[#d4c5a9]">
                    <button type="button" onclick="window.appActions.formatText('cx-npc-backstory', 'bold')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Bold"><i class="fa-solid fa-bold"></i></button>
                    <button type="button" onclick="window.appActions.formatText('cx-npc-backstory', 'italic')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Italic"><i class="fa-solid fa-italic"></i></button>
                    <button type="button" onclick="window.appActions.insertImagePlaceholder('cx-npc-backstory')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                </div>
            </div>
            <textarea id="cx-npc-backstory" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white text-stone-900 h-24 font-serif outline-none focus:border-red-900 shadow-inner custom-scrollbar placeholder:italic" placeholder="Origins, secrets, and history...">${(entry.backstory || '').replace(/"/g, '&quot;')}</textarea>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Personality Traits</label><textarea id="cx-npc-traits" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 shadow-inner bg-white h-20 custom-scrollbar placeholder:italic" placeholder="Quirks, mannerisms...">${(entry.traits || '').replace(/"/g, '&quot;')}</textarea></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Ideals</label><textarea id="cx-npc-traits" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 shadow-inner bg-white h-20 custom-scrollbar placeholder:italic" placeholder="What drives them...">${(entry.ideals || '').replace(/"/g, '&quot;')}</textarea></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Bonds</label><textarea id="cx-npc-bonds" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 shadow-inner bg-white h-20 custom-scrollbar placeholder:italic" placeholder="Ties to others...">${(entry.bonds || '').replace(/"/g, '&quot;')}</textarea></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Flaws</label><textarea id="cx-npc-flaws" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 shadow-inner bg-white h-20 custom-scrollbar placeholder:italic" placeholder="Weaknesses, secrets...">${(entry.flaws || '').replace(/"/g, '&quot;')}</textarea></div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Organizations</label><input type="text" id="cx-npc-organizations" value="${(entry.organizations || '').replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:border-red-900 shadow-inner"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Allies</label><input type="text" id="cx-npc-allies" value="${(entry.allies || '').replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:border-red-900 shadow-inner"></div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Enemies</label><input type="text" id="cx-npc-enemies" value="${(entry.enemies || '').replace(/"/g, '&quot;')}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:border-red-900 shadow-inner"></div>
        </div>
    </div>
    
    <div id="location-edit-fields" class="${type === 'Location' ? '' : 'hidden'} mt-6 pt-6 border-t-2 border-stone-300">
        <div class="bg-emerald-900/10 border-l-4 border-emerald-600 p-3 rounded-sm text-xs text-stone-800 italic mb-6">
            <i class="fa-solid fa-circle-info text-emerald-600 mr-1"></i> <strong>Location Details:</strong> Region, demographics, and points of interest are Public. Secrets remain Private (visible to the author and DM).
        </div>
        
        <h4 class="text-[10px] font-bold text-emerald-900 uppercase tracking-widest mb-3 border-b border-[#d4c5a9] pb-1"><i class="fa-solid fa-map-pin mr-1"></i> Details (Public)</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
                <label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Scale / Type</label>
                <select id="cx-loc-scale" onchange="if(window.appActions.updateLocEditFields) window.appActions.updateLocEditFields();" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm font-bold">
                    <option value="" ${!entry.locationType ? 'selected' : ''}>-- Select Scale --</option>
                    <option value="Realm / Plane" ${entry.locationType === 'Realm / Plane' ? 'selected' : ''}>Realm / Plane</option>
                    <option value="Continent" ${entry.locationType === 'Continent' ? 'selected' : ''}>Continent</option>
                    <option value="Region / Province" ${entry.locationType === 'Region / Province' ? 'selected' : ''}>Region / Province</option>
                    <option value="City / Settlement" ${entry.locationType === 'City / Settlement' ? 'selected' : ''}>City / Settlement</option>
                    <option value="District / Neighborhood" ${entry.locationType === 'District / Neighborhood' ? 'selected' : ''}>District / Neighborhood</option>
                    <option value="Building / Establishment" ${entry.locationType === 'Building / Establishment' ? 'selected' : ''}>Building / Establishment</option>
                    <option value="Dungeon / Ruin" ${entry.locationType === 'Dungeon / Ruin' ? 'selected' : ''}>Dungeon / Ruin</option>
                    <option value="Geographical Feature" ${entry.locationType === 'Geographical Feature' ? 'selected' : ''}>Geographical Feature</option>
                </select>
            </div>
            <div><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Region / Territory</label><input type="text" id="cx-loc-region" value="${entry.region || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm" placeholder="e.g. Sword Coast"></div>
            
            <div id="loc-pop-wrap"><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Population</label><input type="text" id="cx-loc-population" value="${entry.population || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm" placeholder="e.g. ~130,000 (Diverse)"></div>
            <div id="loc-gov-wrap"><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Government / Ruler</label><input type="text" id="cx-loc-government" value="${entry.government || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm" placeholder="e.g. Masked Lords"></div>
            <div id="loc-eco-wrap"><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Economy / Trade</label><input type="text" id="cx-loc-economy" value="${entry.economy || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm" placeholder="e.g. Trade Hub, Fishing"></div>
            <div id="loc-def-wrap" class="sm:col-span-2"><label class="block text-[9px] uppercase text-stone-500 font-bold mb-1">Defenses / Hazards</label><input type="text" id="cx-loc-defenses" value="${entry.defenses || ''}" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs bg-white text-stone-900 outline-none focus:border-emerald-900 shadow-sm" placeholder="e.g. City Guard, High Walls, Traps"></div>
        </div>

        <div class="mb-6">
            <div class="flex justify-between items-end mb-1">
                <label class="block text-[9px] uppercase text-stone-500 font-bold">Points of Interest (Public)</label>
                <div class="flex gap-1 bg-stone-200 p-0.5 rounded-sm border border-[#d4c5a9]">
                    <button type="button" onclick="window.appActions.formatText('cx-loc-poi', 'bold')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Bold"><i class="fa-solid fa-bold"></i></button>
                    <button type="button" onclick="window.appActions.formatText('cx-loc-poi', 'italic')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Italic"><i class="fa-solid fa-italic"></i></button>
                    <button type="button" onclick="window.appActions.formatText('cx-loc-poi', 'list')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                    <button type="button" onclick="window.appActions.insertImagePlaceholder('cx-loc-poi')" class="w-5 h-5 flex items-center justify-center text-[10px] text-stone-600 hover:bg-[#d4c5a9] rounded-sm" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                </div>
            </div>
            <textarea id="cx-loc-poi" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm bg-white text-stone-900 h-24 font-serif outline-none focus:border-emerald-900 shadow-inner custom-scrollbar placeholder:italic" placeholder="Taverns, shops, notable structures...">${(entry.pointsOfInterest || '').replace(/"/g, '&quot;')}</textarea>
        </div>

        <h4 class="text-[10px] font-bold text-stone-700 uppercase tracking-widest mb-3 mt-8 border-b border-stone-300 pb-1"><i class="fa-solid fa-lock mr-1"></i> Private Information</h4>
        
        <div class="mb-2">
            <label class="block text-[9px] uppercase text-stone-500 font-bold mb-1"><i class="fa-solid fa-user-secret mr-1"></i> Hidden Secrets & DM Notes</label>
            <textarea id="cx-loc-secrets" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 shadow-inner bg-stone-200 border-l-4 border-l-red-900 text-stone-900 h-24 custom-scrollbar placeholder:italic" placeholder="Underground cults, hidden treasure, traps, or DM only details...">${(entry.secrets || '').replace(/"/g, '&quot;')}</textarea>
        </div>
    </div>
    `;

    container.innerHTML = `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[17000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-red-900 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-book-journal-whills text-amber-500 text-xl"></i>
                        <div>
                            <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">Codex Entry</h2>
                            <p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">${isCharacter ? 'Character Profile' : 'Knowledge Base'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${(!isNew && canEdit) ? `<button id="cx-edit-btn" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition flex items-center justify-center" title="Edit Entry"><i class="fa-solid fa-pen-nib"></i></button>` : ''}
                        <button onclick="document.getElementById('global-popup-container').innerHTML = '';" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>

                <!-- View Mode -->
                <div id="cx-view-mode" class="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] ${viewHidden}">
                    ${imgHTML}
                    <div class="mb-6">
                        <h3 class="text-2xl sm:text-3xl font-serif font-bold text-stone-900">${name}</h3>
                        <div class="mt-2">${tagsHTML}</div>
                        ${mapBtnHtml}
                    </div>
                    
                    ${charDataHTML}
                    ${locationDataHTML}
                    
                    <h4 class="font-bold text-red-900 border-b border-[#d4c5a9] pb-1 mb-2">${descLabel}</h4>
                    <div class="text-stone-800 text-sm font-serif leading-relaxed">${parsedDesc}</div>
                    
                    ${privateDataHTML}
                </div>

                <!-- Edit Mode -->
                <div id="cx-edit-mode" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] ${editHidden}">
                    <input type="hidden" id="cx-modal-id" value="${id}">
                    <div class="bg-red-900 text-amber-50 text-xs font-bold uppercase tracking-wider py-1 px-3 inline-block rounded-sm mb-4 shadow-sm">
                        ${isNew ? 'Define New Entity' : 'Amend Record'}
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Name (Auto-Link Trigger)</label>
                        <input type="text" id="cx-modal-name" value="${name}" ${linkedPC ? 'readonly disabled' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-sm font-bold outline-none rounded-sm shadow-inner">
                    </div>

                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Type</label>
                        <select id="cx-modal-type" ${linkedPC ? 'disabled' : ''} onchange="document.getElementById('npc-edit-fields').classList.toggle('hidden', this.value !== 'NPC'); document.getElementById('location-edit-fields').classList.toggle('hidden', this.value !== 'Location');" class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold">
                            <option value="PC" ${type==='PC'?'selected':''}>PC</option>
                            <option value="NPC" ${type==='NPC'?'selected':''}>NPC</option>
                            <option value="Location" ${type==='Location'?'selected':''}>Location</option>
                            <option value="Faction" ${type==='Faction'?'selected':''}>Faction</option>
                            <option value="Route" ${type==='Route'?'selected':''}>Route</option>
                            <option value="Item" ${type==='Item'?'selected':''}>Item</option>
                            <option value="Lore" ${type==='Lore'?'selected':''}>Lore</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Tags (Comma Separated)</label>
                            ${linkedPC ? '<span class="text-[8px] text-amber-600 font-bold italic">Editable for Hero Profiles</span>' : ''}
                        </div>
                        <input type="text" id="cx-modal-tags" value="${tags}" class="w-full bg-white text-stone-900 focus:border-red-900 border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold" placeholder="e.g. Hero, Ranger, Faction Name">
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Image URL</label>
                        <input type="text" id="cx-modal-image" value="${image}" ${linkedPC ? 'readonly disabled title="Edit this hero\'s image in the PC Manager"' : ''} class="w-full ${linkedPC ? 'bg-stone-200 text-stone-500' : 'bg-white text-stone-900 focus:border-red-900'} border border-[#d4c5a9] p-2 text-xs outline-none rounded-sm shadow-inner font-bold" placeholder="https://example.com/portrait.jpg">
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">${descLabel}</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9] overflow-x-auto hide-scrollbar">
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'bold')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'italic')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'underline')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h1')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'h2')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-desc', 'list')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                                <button type="button" onclick="window.appActions.insertImagePlaceholder('cx-modal-desc')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.defineEntryFromSelection('cx-modal-desc')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Define Highlighted Text"><i class="fa-solid fa-book-medical mr-1"></i> Define</button>
                                <button type="button" onclick="window.appActions.preventLinkFromSelection('cx-modal-desc')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-500 hover:text-red-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Prevent Auto-Linking"><i class="fa-solid fa-link-slash mr-1"></i> Unlink</button>
                            </div>
                        </div>
                        <textarea id="cx-modal-desc" class="w-full h-40 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-red-900 outline-none resize-none rounded-sm shadow-inner custom-scrollbar" placeholder="${descPlaceholder}">${desc}</textarea>
                    </div>
                    
                    ${isDM ? `
                    <div class="mb-4 mt-4">
                        <div class="flex justify-between items-end mb-1">
                            <label class="block text-[10px] uppercase text-red-800 font-bold tracking-widest"><i class="fa-solid fa-eye mr-1"></i> Secret Notes (DM Only)</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9] overflow-x-auto hide-scrollbar">
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'bold')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'italic')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'underline')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'h1')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'h2')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cx-modal-dmnotes', 'list')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                                <button type="button" onclick="window.appActions.insertImagePlaceholder('cx-modal-dmnotes')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Insert Image"><i class="fa-solid fa-image"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.defineEntryFromSelection('cx-modal-dmnotes')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Define Highlighted Text"><i class="fa-solid fa-book-medical mr-1"></i> Define</button>
                                <button type="button" onclick="window.appActions.preventLinkFromSelection('cx-modal-dmnotes')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-500 hover:text-red-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Prevent Auto-Linking"><i class="fa-solid fa-link-slash mr-1"></i> Unlink</button>
                            </div>
                        </div>
                        <textarea id="cx-modal-dmnotes" class="w-full h-32 bg-stone-200 border border-[#d4c5a9] border-l-4 border-l-red-900 text-stone-900 p-3 text-sm focus:border-red-900 outline-none resize-none rounded-sm shadow-inner custom-scrollbar" placeholder="True motives, hidden stats, traps, or DM-only details... Codex names link automatically.">${(entry.dmNotes || '').replace(/"/g, '&quot;')}</textarea>
                    </div>
                    ` : ''}

                    ${extendedEditHtml}

                </div>

                <!-- Actions -->
                <div id="cx-edit-actions" class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between gap-3 shrink-0 ${editHidden}">
                    ${(!isNew && canDelete) ? `<button onclick="window.appActions.deleteCodexEntry('${id}')" class="w-full sm:w-auto px-4 py-2 bg-red-900 text-white rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-red-800 transition"><i class="fa-solid fa-trash mr-1"></i> Delete</button>` : `<div class="hidden sm:block">${linkedPC ? '<span class="text-[10px] uppercase text-stone-500 font-bold"><i class="fa-solid fa-lock mr-1"></i> Core Hero Profile</span>' : ''}</div>`}
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="${isNew ? `document.getElementById('global-popup-container').innerHTML = '';` : `document.getElementById('cx-view-mode').classList.remove('hidden'); document.getElementById('cx-edit-mode').classList.add('hidden'); document.getElementById('cx-edit-actions').classList.add('hidden');`}" class="flex-1 sm:flex-none px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveCodexEntry()" class="flex-1 sm:flex-none px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save</button>
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
                // Ensure dynamic fields are synced when entering edit mode
                if (window.appActions.updateLocEditFields) window.appActions.updateLocEditFields();
            };
        }
    }

    // Force an initial update of the location fields
    setTimeout(() => {
        if (window.appActions.updateLocEditFields) window.appActions.updateLocEditFields();
    }, 50);
};

export const saveCodexEntry = async () => {
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const id = document.getElementById('cx-modal-id').value;
    const name = document.getElementById('cx-modal-name').value.trim();
    const typeVal = document.getElementById('cx-modal-type').value;

    if (!name) {
        notify("A name is required for Codex auto-linking.", "error");
        return;
    }

    const myUid = window.appData.currentUserUid;
    const existingEntry = camp.codex?.find(c => c.id === id);
    const exists = !!existingEntry; // Evaluates if the entry is instantiated in the database

    let npcData = {};
    if (typeVal === 'NPC') {
        npcData = {
            race: document.getElementById('cx-npc-race')?.value.trim() || '',
            classLevel: document.getElementById('cx-npc-class')?.value.trim() || '',
            background: document.getElementById('cx-npc-background')?.value.trim() || '',
            alignment: document.getElementById('cx-npc-alignment')?.value.trim() || '',
            faith: document.getElementById('cx-npc-faith')?.value.trim() || '',
            gender: document.getElementById('cx-npc-gender')?.value.trim() || '',
            age: document.getElementById('cx-npc-age')?.value.trim() || '',
            size: document.getElementById('cx-npc-size')?.value.trim() || '',
            height: document.getElementById('cx-npc-height')?.value.trim() || '',
            weight: document.getElementById('cx-npc-weight')?.value.trim() || '',
            eyes: document.getElementById('cx-npc-eyes')?.value.trim() || '',
            hair: document.getElementById('cx-npc-hair')?.value.trim() || '',
            skin: document.getElementById('cx-npc-skin')?.value.trim() || '',
            appearance: document.getElementById('cx-npc-appearance')?.value || '',
            backstory: document.getElementById('cx-npc-backstory')?.value || '',
            traits: document.getElementById('cx-npc-traits')?.value || '',
            ideals: document.getElementById('cx-npc-ideals')?.value || '',
            bonds: document.getElementById('cx-npc-bonds')?.value || '',
            flaws: document.getElementById('cx-npc-flaws')?.value || '',
            organizations: document.getElementById('cx-npc-organizations')?.value.trim() || '',
            allies: document.getElementById('cx-npc-allies')?.value.trim() || '',
            enemies: document.getElementById('cx-npc-enemies')?.value.trim() || ''
        };
    }

    let locData = {};
    if (typeVal === 'Location') {
        const scale = document.getElementById('cx-loc-scale')?.value || '';
        locData = {
            locationType: scale,
            region: document.getElementById('cx-loc-region')?.value.trim() || '',
            population: document.getElementById('cx-loc-population')?.value.trim() || '',
            government: document.getElementById('cx-loc-government')?.value.trim() || '',
            economy: document.getElementById('cx-loc-economy')?.value.trim() || '',
            defenses: document.getElementById('cx-loc-defenses')?.value.trim() || '',
            pointsOfInterest: document.getElementById('cx-loc-poi')?.value || '',
            secrets: document.getElementById('cx-loc-secrets')?.value || ''
        };

        // Enforce cleanup on save so hidden fields don't retain ghost data in the database
        const hidePopGov = ['Building / Establishment', 'Dungeon / Ruin', 'Geographical Feature'].includes(scale);
        const hideEco = ['Dungeon / Ruin', 'Geographical Feature'].includes(scale);
        const hideDef = ['Geographical Feature'].includes(scale);

        if (hidePopGov) { locData.population = ''; locData.government = ''; }
        if (hideEco) { locData.economy = ''; }
        if (hideDef) { locData.defenses = ''; }
    }

    const dmNotesEl = document.getElementById('cx-modal-dmnotes');
    const dmNotesVal = dmNotesEl ? dmNotesEl.value : (existingEntry?.dmNotes || '');

    const newEntry = {
        id: id || generateId(),
        name: name,
        type: typeVal,
        tags: document.getElementById('cx-modal-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('cx-modal-desc').value,
        image: document.getElementById('cx-modal-image').value.trim(),
        authorId: exists ? (existingEntry?.authorId || myUid) : myUid,
        visibility: existingEntry?.visibility || { mode: 'public' },
        dmNotes: dmNotesVal,
        ...npcData,
        ...locData
    };

    const newCodexArray = exists ? camp.codex.map(c => c.id === id ? newEntry : c) : [...(camp.codex || []), newEntry];
    
    let updatedCamp = { ...camp, codex: newCodexArray };

    // Track Player Edits!
    if (!camp._isDM) {
        if (!exists) {
            updatedCamp = logPlayerActivity(updatedCamp, myUid, `added a new Codex entry for <span class="font-bold text-amber-700">${name}</span>.`, 'fa-book-medical');
        } else {
            updatedCamp = logPlayerActivity(updatedCamp, myUid, `amended the Codex entry for <span class="font-bold text-amber-700">${name}</span>.`, 'fa-pen-to-square');
        }
    }

    await saveCampaign(updatedCamp);
    document.getElementById('global-popup-container').innerHTML = '';
    notify("Codex updated.", "success");
};

export const deleteCodexEntry = async (id) => {
    if (!confirm("Destroy this Codex entry? Auto-links using this name will no longer function.")) return;
    
    updateDerivedState();
    const camp = window.appData.activeCampaign;
    if (!camp) return;

    const entryToDelete = (camp.codex || []).find(c => c.id === id);
    const name = entryToDelete ? entryToDelete.name : 'an unknown entry';

    let updatedCamp = {
        ...camp,
        codex: (camp.codex || []).filter(c => c.id !== id)
    };

    // Track Player Edits!
    if (!camp._isDM) {
        const myUid = window.appData.currentUserUid;
        updatedCamp = logPlayerActivity(updatedCamp, myUid, `erased the Codex entry for <span class="font-bold text-amber-700">${name}</span>.`, 'fa-eraser');
    }

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

if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.updateLocEditFields = updateLocEditFields;
    window.appActions.preventLinkFromSelection = preventLinkFromSelection;
    window.appActions.insertImagePlaceholder = insertImagePlaceholder;
    window.appActions.defineEntryFromSelection = defineEntryFromSelection;
    window.appActions.viewCodex = viewCodex;
    window.appActions.saveCodexEntry = saveCodexEntry;
    window.appActions.deleteCodexEntry = deleteCodexEntry;
    window.appActions.parseSmartText = parseSmartText;
    window.appActions.handleSmartInput = handleSmartInput;
    window.appActions.openJournal = openJournal;
    window.appActions.closeJournal = closeJournal;
    window.appActions.copyJournal = copyJournal;
    window.appActions._openCodexModal = _openCodexModal;
}
