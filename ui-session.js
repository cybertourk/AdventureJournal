import { renderLevelOptions, renderSmartField } from './ui-core.js';

// --- VISIBILITY (FOG OF WAR) HELPERS ---

// Helper to generate the visibility toggle button
function renderVisToggle(visObj) {
    const mode = visObj?.mode || 'hidden'; // Default to hidden for new notes so they are private between author and DM
    const players = (visObj?.visibleTo || []).join(',');
    
    let icon = 'fa-eye';
    let label = 'Public';
    let colorClass = 'text-emerald-600 hover:text-emerald-500';
    
    if (mode === 'hidden') {
        icon = 'fa-eye-slash';
        label = 'Hidden';
        colorClass = 'text-red-700 hover:text-red-600';
    } else if (mode === 'specific') {
        icon = 'fa-user-lock';
        label = 'Shared';
        colorClass = 'text-blue-600 hover:text-blue-500';
    }

    return `
        <div class="flex items-center">
            <input type="hidden" class="vis-mode-input" value="${mode}">
            <input type="hidden" class="vis-players-input" value="${players}">
            <button type="button" class="${colorClass} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center bg-[#f4ebd8] border border-[#d4c5a9] rounded-sm shadow-sm" onclick="event.stopPropagation(); window.appActions.openVisibilityMenu(this, 'dom')">
                <i class="fa-solid ${icon} mr-1"></i> ${label}
            </button>
        </div>
    `;
}

// Helper to wrap renderSmartField with Fog of War visibility controls
function renderSmartFieldWithVis(id, labelHtml, value, visObj, placeholderText, rows, isReadonly = false) {
    if (isReadonly) {
        // If readonly, just render the standard field without edit/visibility controls
        return renderSmartField(id, labelHtml, value, placeholderText, rows, '', true);
    }

    const hasText = value && value.trim().length > 0;
    const viewContent = (hasText && window.appActions && window.appActions.parseSmartText) 
        ? window.appActions.parseSmartText(value) 
        : `<span class="text-stone-400 italic font-sans">${placeholderText || "No entry provided."}</span>`;

    const plainLabel = labelHtml.replace(/<[^>]*>?/gm, '').trim().replace(/'/g, "\\'");
    const safeValue = (value || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
    
    return `
    <div class="scene-row vis-container flex flex-col group cursor-text relative bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm mb-4" onclick="window.appActions.openUniversalEditor('input-${id}', '${plainLabel}')">
        <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
            <label class="text-[10px] text-stone-500 font-bold uppercase tracking-widest pointer-events-none flex items-center">${labelHtml}</label>
            <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                ${renderVisToggle(visObj)}
                <div class="w-px h-3 bg-stone-300"></div>
                <button type="button" class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-500 transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('input-${id}', '${plainLabel}')"><i class="fa-solid fa-pen"></i> Edit</button>
            </div>
        </div>
        
        <input type="hidden" id="input-${id}" value="${safeValue}">
        
        <div id="view-input-${id}" class="w-full p-3 text-stone-800 text-xs sm:text-sm min-h-[${rows * 1.5}rem] leading-relaxed whitespace-pre-wrap font-serif group-hover:bg-white transition">
            ${viewContent}
        </div>
    </div>
    `;
}

// Helper to render the new Collaborative Chronicle Log
function renderChronicleLog(session, camp, myUid) {
    const entries = session.chronicle || [];
    const isDM = camp._isDM;
    const playerNames = camp.playerNames || {};

    let html = '<div class="space-y-3 mb-4" id="chronicle-feed">';
    if (entries.length === 0) {
        html += `<div class="p-6 text-center border border-dashed border-stone-400 bg-stone-50 rounded-sm"><p class="text-stone-500 italic text-sm font-serif">The chronicle is silent. Add an entry below to begin the collaborative record.</p></div>`;
    } else {
        entries.forEach(entry => {
            const isAuthor = entry.authorId === myUid;
            const canEdit = isDM || isAuthor;
            const isAuthorDM = entry.authorId === camp.dmId;
            const authorName = isAuthorDM ? 'Dungeon Master' : (playerNames[entry.authorId] || 'Unknown Player');
            const authorIcon = isAuthorDM ? '<i class="fa-solid fa-crown text-amber-500"></i>' : '<i class="fa-solid fa-feather-pointed text-stone-500"></i>';
            
            // Real-time parsing via window.appActions if available
            const parsedText = (window.appActions && window.appActions.parseSmartText) 
                ? window.appActions.parseSmartText(entry.text) 
                : entry.text.replace(/\n/g, '<br>');

            const dateObj = new Date(entry.timestamp);
            const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString();

            html += `
            <div class="bg-white border border-[#d4c5a9] rounded-sm shadow-sm relative group overflow-hidden">
                <div class="bg-[#f4ebd8] border-b border-[#d4c5a9] px-3 py-1.5 flex justify-between items-center">
                    <div class="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-stone-600">
                        ${authorIcon} <span class="text-stone-900">${authorName}</span> <span class="text-stone-400 font-normal ml-1 normal-case tracking-normal hidden sm:inline">${dateString} at ${timeString}</span>
                    </div>
                    ${canEdit ? `
                    <button type="button" onclick="window.appActions.deleteChronicleEntry('${entry.id}')" class="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-800 hover:text-red-600 uppercase font-bold flex items-center" title="Delete Entry"><i class="fa-solid fa-trash sm:mr-1"></i> <span class="hidden sm:inline">Erase</span></button>
                    ` : ''}
                </div>
                <div class="p-3 text-sm text-stone-800 font-serif leading-relaxed whitespace-pre-wrap">
                    ${parsedText}
                </div>
            </div>
            `;
        });
    }
    html += '</div>';

    // Add Input Area
    html += `
    <div class="bg-stone-100 border border-stone-300 rounded-sm p-3 shadow-inner">
        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5"><i class="fa-solid fa-comment-dots mr-1"></i> Contribute to Chronicle</label>
        <textarea id="new-chronicle-input" class="w-full p-3 bg-white border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-red-900 resize-none min-h-[80px] custom-scrollbar shadow-inner" placeholder="Add your perspective, a quote, or a session event... Codex names link automatically."></textarea>
        <div class="flex justify-end mt-2">
            <button type="button" onclick="window.appActions.addChronicleEntry()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center">
                <i class="fa-solid fa-paper-plane mr-2"></i> Submit Entry
            </button>
        </div>
    </div>
    `;
    return html;
}

// --- MAIN SESSION EDITOR HTML GENERATOR ---

export function getSessionEditHTML(state) {
    const camp = state.activeCampaign;
    const adv = state.activeAdventure;
    const session = state.activeSession || {};
    const isNew = !state.activeSessionId;
    const myUid = state.currentUserUid;

    if (!camp || !adv) return '';
    const isDM = camp._isDM;
    
    // Setup the user's specific player note data
    const myNoteData = (session.playerNotes && session.playerNotes[myUid]) ? session.playerNotes[myUid] : { text: '', visibility: { mode: 'hidden', visibleTo: [] } };

    // ==========================================
    // PLAYER VIEW (Collaborative + Personal Notes)
    // ==========================================
    if (!isDM) {
        if (isNew) {
            return `<div class="text-center text-red-500 p-8 font-serif font-bold text-xl">Only the DM can initiate new sessions.</div>`;
        }

        return `
        <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#fdfbf7] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-4xl mx-auto h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] relative">
            
            <!-- Header -->
            <div class="bg-stone-900 p-4 border-b-4 border-blue-900 text-amber-500 flex justify-between items-center shrink-0 shadow-md z-10">
                <h2 class="text-xl sm:text-2xl font-serif font-bold flex items-center">
                    <i class="fa-solid fa-feather-pointed mr-3 text-blue-500"></i> Session Record
                </h2>
                <div class="flex items-center gap-2">
                    <span class="bg-stone-800 text-amber-200 text-[10px] px-2 py-1 rounded border border-stone-600 uppercase tracking-widest shadow-inner hidden sm:inline-block">${adv.name}</span>
                </div>
            </div>

            <!-- Banner Image -->
            ${session.image ? `<div class="w-full h-32 sm:h-48 overflow-hidden bg-stone-900 shrink-0 z-0 relative"><img src="${session.image}" class="w-full h-full object-contain" alt="Session Banner" onerror="this.style.display='none'"></div>` : ''}

            <!-- Content Area -->
            <div class="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-[#fdfbf7]">
                <div class="max-w-3xl mx-auto">
                    <h3 class="w-full pb-4 mb-6 text-stone-900 font-serif font-bold text-2xl border-b-2 border-stone-300">${session.name || 'Session'}</h3>
                    
                    <!-- Collaborative Chronicle -->
                    <div class="mb-10">
                        <h4 class="font-serif font-bold text-lg text-stone-900 border-b border-[#d4c5a9] pb-1 mb-3"><i class="fa-solid fa-users text-amber-600 mr-2"></i> Collaborative Chronicle</h4>
                        <p class="text-stone-500 text-[10px] uppercase tracking-widest font-bold mb-4">A shared record of events, quotes, and memories.</p>
                        ${renderChronicleLog(session, camp, myUid)}
                    </div>

                    <!-- Personal Notes -->
                    <div class="mt-8 border-t-2 border-stone-300 pt-6">
                        <h4 class="font-serif font-bold text-lg text-stone-900 border-b border-[#d4c5a9] pb-1 mb-3"><i class="fa-solid fa-lock text-stone-500 mr-2"></i> Private Details</h4>
                        <p class="text-stone-500 text-xs sm:text-sm mb-4 italic border-l-2 border-blue-500 pl-3">Record your private thoughts, inventory updates, or quest notes for this session. By default, these are only visible to you and the Dungeon Master.</p>
                        ${renderSmartFieldWithVis(`player-note-${myUid}`, `<i class="fa-solid fa-book-open mr-2 text-stone-500"></i> My Hero's Journal`, myNoteData.text, myNoteData.visibility, 'Scribe your personal notes here... Codex names link automatically.', 8, false)}
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="bg-[#e8dec7] p-3 sm:p-4 border-t border-stone-400 flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Discard Changes</button>
                <button onclick="window.appActions.saveSession()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-floppy-disk mr-2"></i> Inscribe Private Notes</button>
            </div>
        </div>
        `;
    }

    // ==========================================
    // DM VIEW (Full Narrative Editor)
    // ==========================================
    const title = isNew ? "Log New Session" : "Amend Session Record";
    const defaultName = isNew ? `Log from ${new Date().toLocaleDateString()}` : (session.name || '');

    // Format the date strings for the input fields
    // If we have an existing timestamp, format it for the date picker (YYYY-MM-DD). Otherwise, use today.
    let defaultRealDate = '';
    try {
        const dateObj = session.timestamp ? new Date(session.timestamp) : new Date();
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        defaultRealDate = `${year}-${month}-${day}`;
    } catch (e) {
        defaultRealDate = new Date().toISOString().split('T')[0];
    }
    
    // In-Game Date Parsing logic to sync cleanly with the Calendar
    let igY = camp.calendar?.currentYear || 1492;
    let igM = camp.calendar?.currentMonth || 0;
    let igD = camp.calendar?.currentDay || 1;

    if (session.inGameDate && typeof session.inGameDate === 'object') {
        igY = session.inGameDate.year;
        igM = session.inGameDate.month;
        igD = session.inGameDate.day;
    }

    // Gather PCs active in this adventure
    const activePcIds = adv.activePcIds || camp.playerCharacters?.map(p => p.id) || [];
    const rosterPCs = (camp.playerCharacters || []).filter(pc => activePcIds.includes(pc.id));

    // --- Dynamic Scenes Builder ---
    let scenesHtml = '';
    if (session.scenes && session.scenes.length > 0) {
        session.scenes.forEach((scene, i) => {
            const safeText = (scene.text || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
            const parsedText = scene.text ? window.appActions.parseSmartText(scene.text) : '<span class="text-stone-400 italic font-sans">Tap to describe the scene...</span>';
            const visHtml = renderVisToggle(scene.visibility);
            
            scenesHtml += `
            <div class="mb-4 scene-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm flex flex-col group cursor-text" onclick="window.appActions.openUniversalEditor('scene-input-${i}', 'Scene ${i + 1}')">
                <div class="flex justify-between items-center bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] rounded-t-sm">
                    <span class="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Scene ${i + 1}</span>
                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                        ${visHtml}
                        <div class="w-px h-3 bg-stone-300"></div>
                        <button type="button" class="text-[10px] text-stone-500 hover:text-blue-600 uppercase font-bold transition" onclick="event.stopPropagation(); window.appActions.openUniversalEditor('scene-input-${i}', 'Scene ${i + 1}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button type="button" class="text-[10px] text-red-800 hover:text-red-600 uppercase font-bold transition" onclick="event.stopPropagation(); this.closest('.scene-row').remove()"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <input type="hidden" id="scene-input-${i}" class="scene-hidden-input" value="${safeText}">
                <div id="view-scene-input-${i}" class="w-full text-stone-800 text-xs sm:text-sm p-3 min-h-[4rem] leading-relaxed whitespace-pre-wrap font-serif group-hover:bg-white transition">
                    ${parsedText}
                </div>
            </div>`;
        });
    }

    // --- Dynamic Clues Builder ---
    let cluesHtml = '';
    if (session.clues && session.clues.length > 0) {
        session.clues.forEach((clue) => {
            const vis = clue.visibility || { mode: 'public' };
            const mode = vis.mode || 'public';
            const players = (vis.visibleTo || []).join(',');
            
            let icon = 'fa-eye';
            let color = 'text-emerald-600 hover:text-emerald-500';
            if (mode === 'hidden') { icon = 'fa-eye-slash'; color = 'text-red-700 hover:text-red-600'; }
            else if (mode === 'specific') { icon = 'fa-user-lock'; color = 'text-blue-600 hover:text-blue-500'; }
            
            cluesHtml += `
            <div class="mb-2 flex gap-2 items-center clue-row vis-container bg-[#fdfbf7] border border-[#d4c5a9] p-1.5 rounded-sm shadow-sm group">
                <i class="fa-solid fa-magnifying-glass text-stone-400 ml-1"></i>
                <input type="hidden" class="vis-mode-input" value="${mode}">
                <input type="hidden" class="vis-players-input" value="${players}">
                
                <input type="text" class="clue-input flex-1 bg-transparent border-none text-stone-900 px-1 text-xs sm:text-sm outline-none placeholder:italic placeholder:text-stone-400" placeholder="Quest update, clue, or objective..." value="${(clue.text || '').replace(/"/g, '&quot;')}">
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" class="${color} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center" onclick="window.appActions.openVisibilityMenu(this, 'dom')">
                        <i class="fa-solid ${icon}"></i>
                    </button>
                    <button type="button" class="text-stone-400 hover:text-red-700 font-bold px-2 transition" onclick="this.closest('.clue-row').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>`;
        });
    }

    return `
    <div class="animate-in slide-in-from-bottom-4 duration-300 bg-[#fdfbf7] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-w-5xl mx-auto h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] relative">
        
        <!-- Header -->
        <div class="bg-stone-900 p-4 border-b-4 border-red-900 text-amber-500 flex justify-between items-center shrink-0 shadow-md z-10">
            <h2 class="text-xl sm:text-2xl font-serif font-bold flex items-center">
                <i class="fa-solid fa-feather-pointed mr-3 text-red-700"></i> ${title}
            </h2>
            <div class="flex items-center gap-2">
                <span class="bg-stone-800 text-amber-200 text-[10px] px-2 py-1 rounded border border-stone-600 uppercase tracking-widest shadow-inner hidden sm:inline-block">${adv.name}</span>
            </div>
        </div>

        <!-- Banner Image -->
        ${session.image ? `<div class="w-full h-32 sm:h-48 overflow-hidden bg-stone-900 shrink-0 z-0 relative"><img src="${session.image}" class="w-full h-full object-contain" alt="Session Banner" onerror="this.style.display='none'"></div>` : ''}

        <!-- Tabs Navigation -->
        <div class="flex bg-[#e8dec7] border-b-2 border-stone-800 shrink-0 px-2 sm:px-4 pt-2 gap-1 overflow-x-auto hide-scrollbar z-10 relative">
            <button id="tab-btn-session" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900" onclick="window.appActions.switchSessionTab('session')">The Narrative</button>
            <button id="tab-btn-pcs" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-transparent hover:text-stone-800" onclick="window.appActions.switchSessionTab('pcs')">Hero Management</button>
            <button id="tab-btn-preview" class="whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-t-sm transition text-stone-600 border-transparent hover:text-stone-800" onclick="window.appActions.switchSessionTab('preview')">Live Scroll Preview</button>
        </div>

        <!-- Tab Content: Session Narrative -->
        <div id="tab-content-session" class="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-[#fdfbf7]">
            <div class="max-w-3xl mx-auto">
                <input type="text" id="draft-name" value="${defaultName}" class="w-full p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif font-bold text-2xl outline-none focus:border-red-900 mb-4 transition-colors" placeholder="Session Title...">

                <!-- Dates Configuration -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1"><i class="fa-regular fa-calendar text-stone-400 mr-1"></i> Real-World Date</label>
                        <input type="date" id="draft-real-date" value="${defaultRealDate}" class="w-full p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm outline-none focus:border-red-900 transition-colors">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1"><i class="fa-solid fa-moon text-stone-400 mr-1"></i> In-Game Date</label>
                        <div class="flex items-center gap-1">
                            <input type="number" id="draft-ingame-y" value="${igY}" class="w-16 p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm outline-none focus:border-red-900 text-center transition-colors">
                            <select id="draft-ingame-m" onchange="window.updateDayOptions(this.value, 'draft-ingame-d')" class="flex-grow p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm outline-none focus:border-red-900 transition-colors">
                                ${(camp.calendar?.months || []).map((m, idx) => {
                                    let mName = m.name;
                                    if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                    return `<option value="${idx}" ${idx === igM ? 'selected' : ''}>${mName}</option>`;
                                }).join('')}
                            </select>
                            <select id="draft-ingame-d" class="w-14 p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm outline-none focus:border-red-900 text-center transition-colors">
                                ${Array.from({ length: Math.max(1, parseInt(camp.calendar?.months[igM]?.days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === igD ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Banner Image Configuration -->
                <div class="mb-8">
                    <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1"><i class="fa-solid fa-image text-stone-400 mr-1"></i> Banner Image URL <span class="text-stone-400 normal-case font-normal">(Optional)</span></label>
                    <input type="text" id="draft-image" value="${(session.image || '').replace(/"/g, '&quot;')}" class="w-full p-2 bg-transparent border-b-2 border-stone-400 text-stone-900 font-serif text-sm outline-none focus:border-red-900 transition-colors" placeholder="https://example.com/session-banner.jpg">
                </div>

                <!-- Dynamic Scenes -->
                <div class="mb-8">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-bold text-stone-800 uppercase tracking-widest flex items-center border-b border-stone-300 w-full pb-1"><i class="fa-solid fa-masks-theater mr-2 text-stone-500"></i> Narrative Scenes</h3>
                    </div>
                    <div id="container-scenes" class="min-h-[10px]">
                        ${scenesHtml}
                    </div>
                    <button onclick="window.appActions.addLogScene()" class="w-full py-3 border border-dashed border-stone-400 text-stone-500 hover:text-stone-800 hover:border-stone-600 hover:bg-stone-200 transition rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center">
                        <i class="fa-solid fa-plus mr-2"></i> Add Scene
                    </button>
                </div>

                <!-- Dynamic Clues -->
                <div class="mb-8">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-bold text-stone-800 uppercase tracking-widest flex items-center border-b border-stone-300 w-full pb-1"><i class="fa-solid fa-magnifying-glass mr-2 text-stone-500"></i> Investigation & Clues</h3>
                    </div>
                    <div id="container-clues" class="min-h-[10px]">
                        ${cluesHtml}
                    </div>
                    <button onclick="window.appActions.addLogClue()" class="w-full py-2.5 border border-dashed border-stone-400 text-stone-500 hover:text-stone-800 hover:border-stone-600 hover:bg-stone-200 transition rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center mt-2">
                        <i class="fa-solid fa-plus mr-2"></i> Add Clue
                    </button>
                </div>

                <!-- Loot & Main Overview -->
                <div class="space-y-6 mb-8">
                    ${renderSmartFieldWithVis('draft-loot', `<i class="fa-solid fa-coins mr-2 text-stone-500"></i> Loot & Rewards`, session.lootText, session.lootVisibility, 'Describe the treasure found...', 4)}
                    ${renderSmartFieldWithVis('draft-notes', `<i class="fa-solid fa-book mr-2 text-stone-500"></i> DM Overview & Context`, session.notes, session.notesVisibility, 'The primary summary or hidden DM notes...', 4)}
                </div>

                <!-- Collaborative Chronicle -->
                <div class="mb-8 mt-6 border-t-2 border-stone-300 pt-6">
                    <h3 class="text-sm font-bold text-stone-800 uppercase tracking-widest flex items-center border-b border-stone-300 w-full pb-1 mb-3"><i class="fa-solid fa-users mr-2 text-stone-500"></i> Collaborative Chronicle</h3>
                    <p class="text-stone-500 text-[10px] uppercase tracking-widest font-bold mb-4">A shared record of events, quotes, and memories.</p>
                    ${renderChronicleLog(session, camp, myUid)}
                </div>

                <!-- DM's Personal Notes Section -->
                <div class="space-y-6 mt-8 border-t-2 border-stone-300 pt-6">
                    ${renderSmartFieldWithVis(`player-note-${myUid}`, `<i class="fa-solid fa-feather mr-2 text-stone-500"></i> My Personal Notes`, myNoteData.text, myNoteData.visibility, 'Record your private DM/player thoughts here...', 4)}
                </div>
            </div>
        </div>

        <!-- Tab Content: PCs -->
        <div id="tab-content-pcs" class="hidden flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 bg-[#fdfbf7]">
            <div class="max-w-3xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                ${rosterPCs.map(pc => {
                    const note = (session.pcNotes && session.pcNotes[pc.id]) ? session.pcNotes[pc.id] : '';
                    return `
                    <div class="bg-white border border-[#d4c5a9] rounded-sm p-4 shadow-sm flex flex-col">
                        <h4 class="font-serif font-bold text-lg text-stone-900 mb-2 border-b border-[#d4c5a9] pb-1">${pc.name}</h4>
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2 text-sm text-stone-700 cursor-pointer group">
                                <input type="checkbox" id="pc-insp-${pc.id}" ${pc.inspiration ? 'checked' : ''} class="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded-sm cursor-pointer"> 
                                <span class="group-hover:text-stone-900 transition-colors">Inspiration</span>
                            </label>
                            <label class="flex items-center gap-2 text-sm text-stone-700 cursor-pointer group">
                                <input type="checkbox" id="pc-auto-${pc.id}" ${pc.automaticSuccess ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded-sm cursor-pointer"> 
                                <span class="group-hover:text-stone-900 transition-colors">Auto-Success</span>
                            </label>
                        </div>
                        <textarea id="input-pc-note-${pc.id}" class="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm text-sm outline-none focus:border-red-900 resize-none flex-grow custom-scrollbar shadow-inner min-h-[100px]" placeholder="Session notes specific to ${pc.name}..."> ${note}</textarea>
                    </div>
                    `;
                }).join('')}
                </div>
                
                <!-- Budget Area -->
                <div class="mt-8 p-5 bg-[#f4ebd8] border border-[#d4c5a9] rounded-sm shadow-sm">
                    <h3 class="text-sm font-bold text-stone-800 uppercase tracking-widest mb-4 border-b border-[#d4c5a9] pb-2"><i class="fa-solid fa-scale-balanced mr-2 text-amber-700"></i> Arc Budget & Settings</h3>
                    <div class="grid grid-cols-3 gap-4 mb-5">
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Start Level</label>
                            <select id="draft-start-level" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:ring-2 focus:ring-red-900 shadow-inner" onchange="window.appActions.updateSessionBudget()">
                                ${renderLevelOptions(adv.startLevel || 1)}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">End Level</label>
                            <select id="draft-end-level" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:ring-2 focus:ring-red-900 shadow-inner" onchange="window.appActions.updateSessionBudget()">
                                ${renderLevelOptions(adv.endLevel || 2)}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Party Size</label>
                            <input type="number" id="draft-num-players" value="${adv.numPlayers || 4}" min="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-xs bg-white outline-none focus:ring-2 focus:ring-red-900 shadow-inner" oninput="window.appActions.updateSessionBudget()">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-stone-900 p-4 rounded-sm text-amber-50 shadow-inner">
                        <div>
                            <span class="block text-[10px] text-stone-400 uppercase tracking-widest">Total Budget</span>
                            <span id="budget-total" class="font-bold text-sm sm:text-base">0 gp</span>
                        </div>
                        <div>
                            <span class="block text-[10px] text-stone-400 uppercase tracking-widest">Loot Distributed</span>
                            <span id="budget-loot" class="font-bold text-sm sm:text-base">0 gp</span>
                        </div>
                        <div>
                            <span class="block text-[10px] text-stone-400 uppercase tracking-widest">Remaining</span>
                            <span id="budget-remain" class="font-bold text-sm sm:text-base text-emerald-400">0 gp</span>
                        </div>
                        <div class="border-l-2 border-stone-700 pl-4">
                            <span class="block text-[10px] text-stone-400 uppercase tracking-widest text-amber-500">This Session</span>
                            <span id="budget-live-calc" class="font-bold text-sm sm:text-base text-amber-500">Calc: 0 gp</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab Content: Preview -->
        <div id="tab-content-preview" class="hidden flex-grow overflow-hidden bg-[#fdfbf7] p-0 relative">
            <div class="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                <div id="draft-preview-text" class="max-w-3xl mx-auto font-serif text-sm text-stone-900 leading-relaxed whitespace-pre-wrap bg-white p-8 rounded-sm shadow-md border border-[#d4c5a9] min-h-full">
                    <div class="text-center text-stone-400 mt-20"><i class="fa-solid fa-spinner fa-spin text-3xl mb-4"></i><p>Generating Preview...</p></div>
                </div>
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="bg-[#e8dec7] p-3 sm:p-4 border-t border-stone-400 flex justify-end gap-2 shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
            <button onclick="window.appActions.setView('adventure')" class="px-4 py-2 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs">Discard Changes</button>
            <button onclick="window.appActions.saveSession()" class="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center shadow-md"><i class="fa-solid fa-floppy-disk mr-2"></i> Inscribe Record</button>
        </div>
    </div>
    `;
}
