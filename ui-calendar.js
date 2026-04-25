export function getCalendarHTML(state) {
    const camp = state.activeCampaign;
    if (!camp || !camp.calendar) return '';

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    const cal = camp.calendar;
    
    const viewYear = state.calendarViewYear !== undefined ? state.calendarViewYear : cal.currentYear;
    const viewMonthIdx = state.calendarViewMonth !== undefined ? state.calendarViewMonth : cal.currentMonth;
    
    // Safety fallback if months got deleted
    const safeMonthIdx = Math.max(0, Math.min(viewMonthIdx, cal.months.length - 1));
    const activeMonth = cal.months[safeMonthIdx] || { name: "Unknown", days: 0 };
    
    // --- Visibility Helper ---
    const getVisStatus = (visObj) => {
        const mode = visObj?.mode || 'hidden'; // Default hidden for new notes
        const players = (visObj?.visibleTo || []).join(',');
        let icon = 'fa-eye'; let text = 'Public'; let color = 'text-emerald-600 hover:text-emerald-500';
        if (mode === 'hidden') { icon = 'fa-eye-slash'; text = 'Hidden'; color = 'text-red-700 hover:text-red-600'; }
        else if (mode === 'specific') { icon = 'fa-user-lock'; text = 'Shared'; color = 'text-blue-600 hover:text-blue-500'; }
        return { mode, players, icon, text, color };
    };

    // --- MAIN CALENDAR VIEW ---
    let html = `
    <div class="animate-in fade-in duration-300 max-w-5xl mx-auto pb-20">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-4 border-b-2 border-stone-800 pb-4">
            <div class="w-full md:w-auto">
                <h2 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-500 leading-tight">Chronicle</h2>
                <p class="text-stone-400 text-xs sm:text-sm font-sans mt-2 flex items-center">
                    <i class="fa-solid fa-calendar-days mr-2"></i> ${cal.name}
                </p>
            </div>
            <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <button onclick="window.appActions.jumpToCurrentDate()" class="flex-1 md:flex-none px-4 py-2 bg-stone-800 text-stone-300 border border-stone-600 rounded-sm hover:text-amber-400 transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-location-crosshairs mr-2"></i> Current Date
                </button>
                ${isDM ? `
                <button onclick="window.appActions.openCalendarSettings()" class="flex-1 md:flex-none px-4 py-2 bg-stone-800 text-stone-300 border border-stone-600 rounded-sm hover:text-white transition font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-md">
                    <i class="fa-solid fa-gear mr-2"></i> Configure
                </button>
                ` : ''}
            </div>
        </div>

        <!-- Navigation & Month Display -->
        <div class="bg-[#f4ebd8] border-2 border-stone-700 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
            <div class="bg-stone-900 p-4 border-b-4 border-amber-700 text-amber-500 flex justify-between items-center">
                <button onclick="window.appActions.navCalendarMonth(-1)" class="w-10 h-10 flex justify-center items-center rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition shadow-inner">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                
                <div class="text-center">
                    <h3 class="text-2xl sm:text-3xl font-serif font-bold text-amber-50 mb-1">${activeMonth.name}</h3>
                    <div class="text-stone-400 text-xs sm:text-sm font-bold uppercase tracking-widest">Year ${viewYear}</div>
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
                        <p class="text-sm text-stone-500 italic">This special event or leap day does not occur in the year ${viewYear}.</p>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(${cal.daysInWeek}, minmax(0, 1fr)); gap: 0.5rem sm:gap-1rem;">
                        ${Array.from({ length: activeMonth.days }).map((_, i) => {
                            const d = i + 1;
                            const dateKey = `${viewYear}-${safeMonthIdx}-${d}`;
                            const isCurrent = cal.currentYear === viewYear && cal.currentMonth === safeMonthIdx && cal.currentDay === d;
                            const note = (cal.notes && cal.notes[dateKey]) ? cal.notes[dateKey] : null;
                            
                            // Check visibility
                            let canViewNote = false;
                            if (isDM && note) canViewNote = true;
                            else if (note && note.visibility) {
                                if (note.visibility.mode === 'public') canViewNote = true;
                                if (note.visibility.mode === 'specific' && note.visibility.visibleTo.includes(myUid)) canViewNote = true;
                            }

                            const hasVisibleNote = note && canViewNote;
                            
                            // Styling
                            let bgClass = "bg-white";
                            let borderClass = "border-[#d4c5a9]";
                            let textClass = "text-stone-700";
                            let currentBadge = "";
                            
                            if (isCurrent) {
                                bgClass = "bg-amber-100";
                                borderClass = "border-amber-500 border-2";
                                textClass = "text-amber-900 font-bold";
                                currentBadge = `<div class="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm text-white text-[10px]"><i class="fa-solid fa-star"></i></div>`;
                            }

                            return `
                                <div onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, ${d})" 
                                     class="relative flex flex-col aspect-square p-1 sm:p-2 cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-sm ${bgClass} ${borderClass}">
                                    ${currentBadge}
                                    <span class="text-sm sm:text-lg font-serif ${textClass}">${d}</span>
                                    ${hasVisibleNote ? `
                                        <div class="mt-auto self-end sm:self-center bg-blue-100 text-blue-700 w-full text-center py-0.5 rounded-[2px] border border-blue-200">
                                            <i class="fa-solid fa-scroll text-[10px] sm:text-xs"></i>
                                            <span class="hidden sm:inline-block text-[9px] font-bold uppercase ml-1">Note</span>
                                        </div>
                                    ` : ''}
                                    ${(isDM && note && !canViewNote) ? `
                                        <div class="mt-auto self-end sm:self-center bg-red-100 text-red-700 w-full text-center py-0.5 rounded-[2px] border border-red-200" title="Hidden Note">
                                            <i class="fa-solid fa-eye-slash text-[10px] sm:text-xs"></i>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>
    </div>
    `;

    // --- DAY INSPECTOR MODAL ---
    if (state.activeCalendarDate) {
        const { year, monthIndex, day } = state.activeCalendarDate;
        const dateKey = `${year}-${monthIndex}-${day}`;
        const note = (cal.notes && cal.notes[dateKey]) ? cal.notes[dateKey] : null;
        const isCurrent = cal.currentYear === year && cal.currentMonth === monthIndex && cal.currentDay === day;
        
        // FOW Filter
        let canViewNote = false;
        if (isDM) canViewNote = true; // DM can always view (and edit)
        else if (note && note.visibility) {
            if (note.visibility.mode === 'public') canViewNote = true;
            if (note.visibility.mode === 'specific' && note.visibility.visibleTo.includes(myUid)) canViewNote = true;
        }

        const visStatus = getVisStatus(note?.visibility);
        const parsedNoteText = (note && note.text) ? window.appActions.parseSmartText(note.text) : '';
        const modalMonthName = cal.months[monthIndex]?.name || "Unknown";

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
                    
                    ${isDM ? `
                        <!-- DM Edit Mode -->
                        <div id="cal-note-editor">
                            <div class="flex justify-between items-end mb-2">
                                <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Day's Events & Notes</label>
                                <div class="flex items-center">
                                    <input type="hidden" class="vis-mode-input" value="${visStatus.mode}">
                                    <input type="hidden" class="vis-players-input" value="${visStatus.players}">
                                    <button type="button" class="${visStatus.color} font-bold px-2 py-1 text-[10px] uppercase tracking-widest transition flex items-center bg-stone-200 border border-[#d4c5a9] rounded-sm shadow-sm" onclick="window.appActions.openVisibilityMenu(this, 'dom')">
                                        <i class="fa-solid ${visStatus.icon} mr-1"></i> ${visStatus.text}
                                    </button>
                                </div>
                            </div>
                            <textarea id="cal-note-text" class="w-full h-48 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-amber-600 outline-none resize-none rounded-sm shadow-inner custom-scrollbar font-serif" placeholder="Scribe the events of this day... Codex names link automatically.">${note ? note.text : ''}</textarea>
                        </div>
                    ` : `
                        <!-- Player Read Mode -->
                        <div>
                            <h3 class="text-[10px] uppercase text-stone-500 font-bold tracking-widest mb-3 border-b border-[#d4c5a9] pb-1">Day's Events</h3>
                            <div class="text-stone-800 text-sm leading-relaxed font-serif min-h-[10rem]">
                                ${canViewNote ? parsedNoteText : '<span class="text-stone-400 italic font-sans">No public records exist for this day.</span>'}
                            </div>
                        </div>
                    `}

                    ${(isDM && !isCurrent) ? `
                        <div class="mt-8 pt-4 border-t border-[#d4c5a9] flex justify-center">
                            <button onclick="window.appActions.setCurrentCampaignDate(${year}, ${monthIndex}, ${day})" class="px-4 py-2 bg-stone-200 text-stone-700 hover:text-amber-900 hover:bg-amber-100 border border-[#d4c5a9] rounded-sm transition font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center">
                                <i class="fa-solid fa-location-crosshairs mr-2"></i> Set as Current Campaign Date
                            </button>
                        </div>
                    ` : ''}
                </div>

                ${isDM ? `
                <div class="p-4 bg-stone-200 border-t border-[#d4c5a9] flex justify-between gap-3">
                    <div>
                        ${note ? `<button onclick="window.appActions.deleteCalendarNote(${year}, ${monthIndex}, ${day})" class="px-4 py-2 text-stone-500 hover:text-red-700 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-sm transition flex items-center"><i class="fa-solid fa-trash mr-1"></i> Erase</button>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.appActions.closeCalendarDay()" class="px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-300 transition">Cancel</button>
                        <button onclick="window.appActions.saveCalendarNote()" class="px-5 py-2 bg-stone-800 text-amber-50 rounded-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-stone-700 transition">Inscribe</button>
                    </div>
                </div>
                ` : ''}
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
                        <p class="text-[10px] text-stone-500 italic mt-2">Hint: Set a month's days to 0 if it is a leap day that does not occur this year.</p>
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
