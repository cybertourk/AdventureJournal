export function getCalendarHTML(state) {
    const camp = state.activeCampaign;
    if (!camp || !camp.calendar) return '';

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    const cal = camp.calendar;
    const playerNames = camp.playerNames || {};
    
    const viewYear = state.calendarViewYear !== undefined ? state.calendarViewYear : cal.currentYear;
    const viewMonthIdx = state.calendarViewMonth !== undefined ? state.calendarViewMonth : cal.currentMonth;
    
    // Safety fallback if months got deleted
    const safeMonthIdx = Math.max(0, Math.min(viewMonthIdx, cal.months.length - 1));
    const activeMonth = cal.months[safeMonthIdx] || { name: "Unknown", days: 0 };
    
    // Parse the month name to separate the primary name from the seasonal title (in parentheses)
    let displayMonthName = activeMonth.name;
    let monthTooltip = "";
    const parenMatch = displayMonthName.match(/(.*?)\s*\((.*?)\)/);
    if (parenMatch) {
        displayMonthName = parenMatch[1].trim();
        monthTooltip = parenMatch[2].trim();
    }

    // --- Visibility Helper ---
    const getVisStatus = (visObj) => {
        const mode = visObj?.mode || 'public'; // Default public for player convenience, though DM defaults to hidden if missing
        const players = (visObj?.visibleTo || []).join(',');
        let icon = 'fa-eye'; let text = 'Public'; let color = 'text-emerald-600 hover:text-emerald-500';
        if (mode === 'hidden') { icon = 'fa-eye-slash'; text = 'Hidden'; color = 'text-red-700 hover:text-red-600'; }
        else if (mode === 'specific') { icon = 'fa-user-lock'; text = 'Shared'; color = 'text-blue-600 hover:text-blue-500'; }
        return { mode, players, icon, text, color };
    };

    const canViewNote = (note) => {
        if (isDM || note.authorId === myUid) return true;
        if (note.visibility) {
            if (note.visibility.mode === 'public') return true;
            if (note.visibility.mode === 'specific' && note.visibility.visibleTo.includes(myUid)) return true;
        }
        return false;
    };

    // --- Chronological Monthly Notes Builder ---
    let monthlyNotesHtml = '';
    let monthlyNotesCount = 0;
    
    for (let d = 1; d <= activeMonth.days; d++) {
        const dateKey = `${viewYear}-${safeMonthIdx}-${d}`;
        let rawNotes = cal.notes ? cal.notes[dateKey] : null;
        
        if (rawNotes) {
            // Backward compatibility
            if (!Array.isArray(rawNotes)) rawNotes = [{ id: 'legacy', text: rawNotes.text, visibility: rawNotes.visibility, authorId: camp.dmId }];
            
            rawNotes.forEach(note => {
                if (canViewNote(note)) {
                    monthlyNotesCount++;
                    const parsed = window.appActions.parseSmartText(note.text);
                    const isAuthorDM = note.authorId === camp.dmId || !note.authorId;
                    const authorName = isAuthorDM ? 'Dungeon Master' : (playerNames[note.authorId] || 'Unknown Player');
                    const authorIcon = isAuthorDM ? '<i class="fa-solid fa-crown text-amber-500 mr-1"></i>' : '<i class="fa-solid fa-feather-pointed text-stone-400 mr-1"></i>';
                    
                    monthlyNotesHtml += `
                        <div class="mb-4 bg-white border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                            <div class="bg-[#f4ebd8] px-3 py-2 border-b border-[#d4c5a9] flex justify-between items-center">
                                <span class="font-serif font-bold text-amber-900 cursor-pointer hover:underline" onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, ${d})">
                                    ${displayMonthName} ${d}, ${viewYear}
                                </span>
                                <span class="text-[10px] uppercase font-bold text-stone-500 tracking-wider flex items-center">
                                    ${authorIcon} Scribed by ${authorName}
                                </span>
                            </div>
                            <div class="p-4 text-sm text-stone-800 font-serif leading-relaxed">
                                ${parsed}
                            </div>
                        </div>
                    `;
                }
            });
        }
    }

    if (monthlyNotesCount === 0) {
        monthlyNotesHtml = `
            <div class="text-center p-8 bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm shadow-sm">
                <i class="fa-solid fa-wind text-3xl text-stone-300 mb-3"></i>
                <p class="text-stone-500 italic text-sm font-serif">The winds of time hold no records for this month.</p>
            </div>
        `;
    }

    // --- MAIN CALENDAR VIEW ---
    let html = `
    <div class="animate-in fade-in duration-300 max-w-5xl mx-auto pb-20">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full lg:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Chronicle</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 flex items-center">
                    <i class="fa-solid fa-calendar-days mr-2"></i> ${cal.name}
                </p>
            </div>

            <!-- Global Dropdown Navigation -->
            <div class="flex flex-wrap gap-2 w-full lg:w-auto items-center bg-stone-900 p-2 sm:p-3 rounded-sm border border-stone-700 shadow-inner">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <input type="number" id="jump-year" value="${viewYear}" class="w-20 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold text-center">
                    <select id="jump-month" class="flex-grow sm:w-32 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold">
                        ${cal.months.map((m, idx) => {
                            let mName = m.name;
                            if (mName.includes('(')) mName = mName.split('(')[0].trim();
                            return `<option value="${idx}" ${idx === safeMonthIdx ? 'selected' : ''}>${mName}</option>`;
                        }).join('')}
                    </select>
                    <select id="jump-day" class="w-20 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold text-center">
                        <option value="">Day...</option>
                        ${Array.from({ length: activeMonth.days }).map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                    </select>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button onclick="window.appActions.jumpToSpecificDate()" class="flex-1 sm:flex-none px-4 py-1.5 sm:py-2 bg-amber-700 text-amber-50 rounded-sm hover:bg-amber-600 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                        Go
                    </button>
                    <button onclick="window.appActions.jumpToCurrentDate()" class="flex-1 sm:flex-none px-4 py-1.5 sm:py-2 bg-stone-800 text-stone-300 border border-stone-600 rounded-sm hover:text-amber-400 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md" title="Jump to Current Campaign Date">
                        <i class="fa-solid fa-location-crosshairs"></i>
                    </button>
                    ${isDM ? `
                    <button onclick="window.appActions.openCalendarSettings()" class="px-4 py-1.5 sm:py-2 bg-stone-800 text-stone-300 border border-stone-600 rounded-sm hover:text-white transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md" title="Configure Calendar">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Navigation & Month Display -->
        <div class="bg-[#f4ebd8] border-2 border-stone-700 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden mb-8">
            <div class="bg-stone-900 p-4 border-b-4 border-amber-700 text-amber-500 flex justify-between items-center">
                <button onclick="window.appActions.navCalendarMonth(-1)" class="w-10 h-10 flex justify-center items-center rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition shadow-inner">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                
                <div class="text-center">
                    <h3 class="text-2xl sm:text-3xl font-serif font-bold text-amber-50 mb-1 flex items-center justify-center gap-2">
                        ${displayMonthName}
                        ${monthTooltip ? `<i class="fa-solid fa-circle-info text-base text-stone-400 hover:text-amber-400 cursor-help transition" title="${monthTooltip}"></i>` : ''}
                    </h3>
                    <div class="text-stone-400 text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer hover:opacity-80 transition" title="Scroll to Monthly Summary" onclick="document.getElementById('chronological-summary').scrollIntoView({behavior:'smooth'})">Year ${viewYear}</div>
                </div>
                
                <button onclick="window.appActions.navCalendarMonth(1)" class="w-10 h-10 flex justify-center items-center rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition shadow-inner">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Calendar Grid -->
            <div class="p-4 sm:p-6 lg:p-8 bg-[#fdfbf7]">
                ${activeMonth.days === 0 ? `
                    <div class="text-center py-12">
                        <i class="fa-solid fa-moon text-5xl text-stone-300 mb-4"></i>
                        <h4 class="font-serif text-xl font-bold text-stone-600 mb-2">Intercalary Observance</h4>
                        <p class="text-sm text-stone-500 italic flex items-center justify-center gap-2">
                            This special event or leap day does not occur in the year ${viewYear}.
                            ${monthTooltip ? `<i class="fa-solid fa-circle-info text-stone-400 cursor-help" title="${monthTooltip}"></i>` : ''}
                        </p>
                        <button onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, 1)" class="mt-4 px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-stone-200 transition">View / Add Notes</button>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(${cal.daysInWeek}, minmax(0, 1fr)); gap: 0.5rem;">
                        ${Array.from({ length: activeMonth.days }).map((_, i) => {
                            const d = i + 1;
                            const dateKey = `${viewYear}-${safeMonthIdx}-${d}`;
                            const isCurrent = cal.currentYear === viewYear && cal.currentMonth === safeMonthIdx && cal.currentDay === d;
                            
                            let rawNotes = cal.notes ? cal.notes[dateKey] : null;
                            if (rawNotes && !Array.isArray(rawNotes)) rawNotes = [rawNotes];
                            
                            let visibleCount = 0;
                            let hasHidden = false;
                            
                            if (rawNotes) {
                                rawNotes.forEach(n => {
                                    if (canViewNote(n)) visibleCount++;
                                    else if (isDM) hasHidden = true;
                                });
                            }
                            
                            // Styling
                            let bgClass = "bg-white";
                            let borderClass = "border-[#d4c5a9]";
                            let textClass = "text-stone-700";
                            let currentBadge = "";
                            
                            if (isCurrent) {
                                bgClass = "bg-amber-100";
                                borderClass = "border-amber-500 border-2";
                                textClass = "text-amber-900 font-bold";
                                currentBadge = `<div class="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm text-white text-[10px] z-10"><i class="fa-solid fa-star"></i></div>`;
                            }

                            return `
                                <div onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, ${d})" 
                                     class="relative flex flex-col aspect-square p-1 sm:p-2 cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-sm ${bgClass} ${borderClass}">
                                    ${currentBadge}
                                    <span class="text-sm sm:text-lg font-serif ${textClass}">${d}</span>
                                    
                                    <div class="mt-auto flex flex-col gap-1 w-full">
                                        ${visibleCount > 0 ? `
                                            <div class="self-end sm:self-center bg-blue-100 text-blue-700 w-full text-center py-0.5 rounded-[2px] border border-blue-200" title="${visibleCount} Note(s)">
                                                <i class="fa-solid fa-scroll text-[10px] sm:text-xs"></i>
                                                ${visibleCount > 1 ? `<span class="text-[9px] font-bold ml-0.5">${visibleCount}</span>` : ''}
                                            </div>
                                        ` : ''}
                                        ${hasHidden ? `
                                            <div class="self-end sm:self-center bg-red-100 text-red-700 w-full text-center py-0.5 rounded-[2px] border border-red-200" title="Hidden Note(s)">
                                                <i class="fa-solid fa-eye-slash text-[10px] sm:text-xs"></i>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>

        <!-- Chronological Monthly Summary -->
        <div id="chronological-summary" class="mt-12">
            <h3 class="text-xl font-serif font-bold text-amber-500 mb-6 flex items-center border-b border-stone-700 pb-3">
                <i class="fa-solid fa-book-open mr-3 text-stone-500"></i> Records for ${displayMonthName}, ${viewYear}
            </h3>
            <div class="space-y-4">
                ${monthlyNotesHtml}
            </div>
        </div>
    </div>
    `;

    // --- DAY INSPECTOR MODAL (MULTIPLE NOTES SUPPORT) ---
    if (state.activeCalendarDate) {
        const { year, monthIndex, day } = state.activeCalendarDate;
        const dateKey = `${year}-${monthIndex}-${day}`;
        const isCurrent = cal.currentYear === year && cal.currentMonth === monthIndex && cal.currentDay === day;
        
        let modalMonthName = cal.months[monthIndex]?.name || "Unknown";
        if (modalMonthName.includes('(')) modalMonthName = modalMonthName.split('(')[0].trim();

        let dayNotes = cal.notes ? cal.notes[dateKey] : null;
        if (dayNotes && !Array.isArray(dayNotes)) {
            // Hotfix legacy format on display
            dayNotes = [{ id: 'legacy', text: dayNotes.text, visibility: dayNotes.visibility, authorId: camp.dmId }];
        }
        if (!dayNotes) dayNotes = [];

        // Build list of existing visible notes
        let existingNotesHtml = '';
        dayNotes.forEach(note => {
            if (canViewNote(note)) {
                const parsedText = window.appActions.parseSmartText(note.text);
                const isAuthorDM = note.authorId === camp.dmId || !note.authorId;
                const authorName = isAuthorDM ? 'Dungeon Master' : (playerNames[note.authorId] || 'Unknown Player');
                const isMyNote = isDM || note.authorId === myUid;
                
                const vis = getVisStatus(note.visibility);
                let badgeHtml = `<span class="text-[9px] uppercase tracking-wider font-bold text-stone-400 bg-stone-200 px-1.5 py-0.5 rounded-sm"><i class="fa-solid fa-feather-pointed mr-1"></i> ${authorName}</span>`;
                if (isAuthorDM) badgeHtml = `<span class="text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm"><i class="fa-solid fa-crown mr-1"></i> ${authorName}</span>`;

                existingNotesHtml += `
                    <div class="mb-4 bg-white border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden relative group">
                        <div class="bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                ${badgeHtml}
                                ${isMyNote ? `<span class="text-[9px] uppercase font-bold tracking-widest ${vis.color}" title="${vis.text}"><i class="fa-solid ${vis.icon}"></i></span>` : ''}
                            </div>
                            ${isMyNote ? `
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onclick="window.appActions.editCalendarNote('${note.id}')" class="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 transition"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
                                    <button onclick="window.appActions.deleteCalendarNote(${year}, ${monthIndex}, ${day}, '${note.id}')" class="text-[10px] uppercase font-bold tracking-wider text-red-600 hover:text-red-800 transition"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="p-3 text-sm text-stone-800 font-serif leading-relaxed">
                            ${parsedText}
                        </div>
                    </div>
                `;
            }
        });

        if (existingNotesHtml === '') {
            existingNotesHtml = `<p class="text-stone-400 italic font-sans text-sm mb-4">No public records exist for this day.</p>`;
        }

        html += `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-2xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Header -->
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-scroll text-amber-500 text-xl"></i>
                        <div>
                            <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">Chronicle: ${modalMonthName} ${day}, ${year}</h2>
                            <p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">${isCurrent ? 'Current Campaign Date' : 'Historical Record'}</p>
                        </div>
                    </div>
                    <button onclick="window.appActions.closeCalendarDay()" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7]">
                    
                    <!-- Existing Notes -->
                    <h3 class="text-[10px] uppercase text-stone-500 font-bold tracking-widest mb-3 border-b border-[#d4c5a9] pb-1">Day's Events</h3>
                    <div class="mb-6">
                        ${existingNotesHtml}
                    </div>

                    <!-- Add / Edit Note Editor -->
                    <div id="cal-note-editor" class="border-t-2 border-stone-300 pt-6 mt-4">
                        <input type="hidden" id="cal-note-id" value="">
                        <div class="flex justify-between items-end mb-2">
                            <label class="block text-[10px] uppercase text-amber-700 font-bold tracking-widest"><i class="fa-solid fa-feather-pointed mr-1"></i> Scribe a New Note</label>
                            <div class="flex items-center">
                                <input type="hidden" class="vis-mode-input" value="public"> <!-- Default public for convenience -->
                                <input type="hidden" class="vis-players-input" value="">
                                <button type="button" class="text-emerald-600 hover:text-emerald-500 font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center bg-stone-200 border border-[#d4c5a9] rounded-sm shadow-sm" onclick="window.appActions.openVisibilityMenu(this, 'dom')">
                                    <i class="fa-solid fa-eye mr-1"></i> Public
                                </button>
                            </div>
                        </div>
                        <textarea id="cal-note-text" class="w-full h-32 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-amber-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-serif" placeholder="Add your perspective... Codex names link automatically."></textarea>
                        
                        <div class="mt-3 flex justify-end">
                            <button onclick="window.appActions.saveCalendarNote()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Note</button>
                        </div>
                    </div>

                    ${(isDM && !isCurrent) ? `
                        <div class="mt-8 pt-4 border-t border-[#d4c5a9] flex justify-center">
                            <button onclick="window.appActions.setCurrentCampaignDate(${year}, ${monthIndex}, ${day})" class="px-4 py-2 bg-stone-200 text-stone-700 hover:text-amber-900 hover:bg-amber-100 border border-[#d4c5a9] rounded-sm transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center">
                                <i class="fa-solid fa-location-crosshairs mr-2"></i> Set as Current Campaign Date
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }

    // --- DM CALENDAR SETTINGS MODAL ---
    if (isDM && state.showCalendarSettings) {
        html += `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-3xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-700 text-amber-500 flex justify-between items-center shrink-0">
                    <h2 class="text-xl font-serif font-bold flex items-center"><i class="fa-solid fa-gear mr-3"></i> Calendar Configuration</h2>
                    <button onclick="window.appActions.closeCalendarSettings()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <div class="bg-amber-100 text-amber-900 p-3 rounded-sm border border-amber-300 text-xs sm:text-sm mb-6 flex items-start shadow-inner">
                        <i class="fa-solid fa-triangle-exclamation mt-0.5 mr-3 text-amber-600"></i>
                        <p>Altering the fundamental structure of the calendar (like days in a week or removing months) will not delete your existing notes, but it may shift how historical dates align on the grid.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Calendar Name</label>
                            <input type="text" id="cal-config-name" value="${cal.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Days in a Week</label>
                            <input type="number" id="cal-config-week" value="${cal.daysInWeek}" min="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" placeholder="e.g. 10 for Harptos">
                        </div>
                    </div>

                    <div class="border-t border-[#d4c5a9] pt-4">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Months of the Year</label>
                            <button onclick="window.appActions.addCalendarMonthRow()" class="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition flex items-center"><i class="fa-solid fa-plus mr-1"></i> Add Month / Leap Day</button>
                        </div>
                        
                        <div id="cal-months-container" class="space-y-2">
                            ${cal.months.map((m, idx) => `
                                <div class="flex gap-2 items-center mb-2 cal-month-row group">
                                    <i class="fa-solid fa-bars text-stone-300 cursor-grab hover:text-stone-500"></i>
                                    <input type="text" value="${m.name}" class="flex-grow p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white font-bold text-stone-900" placeholder="Month Name">
                                    <input type="number" min="0" value="${m.days}" class="w-24 p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700" placeholder="Days">
                                    <button type="button" class="px-3 py-2 text-stone-400 hover:text-red-700 hover:bg-red-100 rounded-sm transition" onclick="this.parentElement.remove()" title="Remove Month"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <p class="text-[10px] text-stone-500 italic mt-2">Hint: Set a month's days to 0 if it is a leap day that does not occur this year. Add seasonal details in parentheses like "Hammer (Deepwinter)".</p>
                    </div>

                    <!-- External Data Importer -->
                    <div class="border-t border-[#d4c5a9] pt-4 mt-6">
                        <h3 class="text-[10px] uppercase text-stone-500 font-bold tracking-widest mb-3">Data Management</h3>
                        <div class="flex items-center gap-4">
                            <input type="file" id="foundry-import-file" class="hidden" accept=".json" onchange="window.appActions.importFoundryCalendarNotes(event)">
                            <button onclick="document.getElementById('foundry-import-file').click()" class="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-sm transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center">
                                <i class="fa-solid fa-file-import mr-2"></i> Import Foundry VTT Notes (JSON)
                            </button>
                        </div>
                        <p class="text-[10px] text-stone-500 italic mt-2">Imports notes exported from Foundry VTT (Simple Calendar format). Existing notes on matching dates will be safely kept alongside the imported ones.</p>
                    </div>

                </div>

                <div class="bg-stone-200 p-4 border-t border-[#d4c5a9] flex flex-wrap-reverse sm:flex-nowrap justify-between gap-3 shrink-0">
                    <button onclick="window.appActions.resetCalendarToDefault()" class="w-full sm:w-auto px-4 py-2 text-stone-500 hover:text-amber-700 hover:bg-amber-100 rounded-sm transition font-bold uppercase tracking-wider text-[10px] flex items-center justify-center border border-transparent hover:border-amber-300">
                        <i class="fa-solid fa-rotate-left mr-2"></i> Reset to Harptos Defaults
                    </button>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="window.appActions.closeCalendarSettings()" class="flex-1 sm:flex-none px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveCalendarSettings()" class="flex-1 sm:flex-none px-6 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Save Layout</button>
                    </div>
                </div>

            </div>
        </div>
        `;
    }

    return html;
}
