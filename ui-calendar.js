export function getCalendarHTML(state) {
    const camp = state.activeCampaign;
    if (!camp || !camp.calendar) return '';

    const isDM = camp._isDM;
    const myUid = state.currentUserUid;
    const cal = camp.calendar;
    const playerNames = camp.playerNames || {};
    
    const viewYear = state.calendarViewYear !== undefined ? parseInt(state.calendarViewYear, 10) : parseInt(cal.currentYear, 10);
    const viewMonthIdx = state.calendarViewMonth !== undefined ? parseInt(state.calendarViewMonth, 10) : parseInt(cal.currentMonth, 10);
    
    // Safety fallback if months got deleted
    const safeMonthIdx = Math.max(0, Math.min(viewMonthIdx, cal.months.length - 1));
    const activeMonth = cal.months[safeMonthIdx] || { name: "Unknown", days: 0 };
    
    // Clean Month Name
    let displayMonthName = activeMonth.name;
    let hasExtraInfo = activeMonth.nickname || activeMonth.lore || activeMonth.description || activeMonth.season;

    // Backward compatibility for old format "Hammer (Deepwinter)"
    if (activeMonth.lore === undefined && activeMonth.nickname === undefined) {
        const parenMatch = displayMonthName.match(/(.*?)\s*\((.*?)\)/);
        if (parenMatch) {
            displayMonthName = parenMatch[1].trim();
            hasExtraInfo = true;
        }
    }

    // --- SPANNING & REPEATING CALENDAR MATH ENGINE ---
    const totalDaysPerYear = cal.months.reduce((sum, m) => sum + parseInt(m.days || 0, 10), 0);
    const getDayOfYear = (mIdx, day) => {
        let doy = 0;
        for(let i=0; i<mIdx; i++) doy += parseInt(cal.months[i].days || 0, 10);
        return doy + parseInt(day, 10);
    };

    // Pre-flatten all notes to easily filter across year and month boundaries
    const allNotes = [];
    Object.entries(cal.notes || {}).forEach(([key, notesArr]) => {
        if(!Array.isArray(notesArr)) notesArr = [notesArr]; // legacy safety
        const [yStr, mStr, dStr] = key.split('-');
        const sy = parseInt(yStr, 10), sm = parseInt(mStr, 10), sd = parseInt(dStr, 10);
        notesArr.forEach(n => {
            allNotes.push({ ...n, sy, sm, sd });
        });
    });

    const getActiveNotesForDay = (checkYear, checkMonthIdx, checkDay) => {
        const targetDOY = getDayOfYear(checkMonthIdx, checkDay);
        
        return allNotes.filter(n => {
            const duration = parseInt(n.duration || 1, 10);
            const repeats = n.repeatsYearly || false;

            // Simple exact match
            if (!repeats && n.sy === checkYear && n.sm === checkMonthIdx && n.sd === checkDay) return true;

            // Check math for spans and repeats
            let startYearsToCheck = [n.sy];
            if (repeats) {
                // If it repeats yearly, we treat the current view year (and the previous year, in case it spans over New Year's Eve) as the start years
                startYearsToCheck = [checkYear - 1, checkYear];
            }

            for (let checkY of startYearsToCheck) {
                if (!repeats && checkY !== n.sy) continue;

                const startDOY = getDayOfYear(n.sm, n.sd);
                let daysDiff = (checkYear - checkY) * totalDaysPerYear + targetDOY - startDOY;
                
                if (daysDiff >= 0 && daysDiff < duration) {
                    return true;
                }
            }
            return false;
        });
    };

    // --- Visibility & Category Helpers ---
    const getVisStatus = (visObj) => {
        const mode = visObj?.mode || 'public'; 
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
            if (note.visibility.mode === 'specific' && note.visibility.visibleTo && note.visibility.visibleTo.includes(myUid)) return true;
        }
        return false;
    };

    const getCategoryColors = (category) => {
        switch(category) {
            case 'Adventure': return 'bg-red-600 text-white border-red-700';
            case 'Session': return 'bg-indigo-600 text-white border-indigo-700'; // New Session Color!
            case 'Birthday': return 'bg-purple-600 text-white border-purple-700';
            case 'Holiday': return 'bg-amber-500 text-amber-950 border-amber-600';
            case 'Downtime': return 'bg-blue-500 text-white border-blue-600';
            case 'Travel': return 'bg-emerald-600 text-white border-emerald-700';
            default: return 'bg-stone-500 text-white border-stone-600'; // Misc
        }
    };

    // =========================================================================
    // HORIZONTAL LANE ASSIGNMENT SYSTEM
    // Ensures spanning notes stay perfectly aligned vertically across multiple days
    // =========================================================================
    const monthActiveNotes = [];
    const uniqueNotesMap = new Map();
    
    // Gather all visible notes for the entire month
    for (let d = 1; d <= activeMonth.days; d++) {
        let dayNotes = getActiveNotesForDay(viewYear, safeMonthIdx, d).filter(canViewNote);
        dayNotes.forEach(n => {
            if (!uniqueNotesMap.has(n.id)) {
                uniqueNotesMap.set(n.id, n);
                monthActiveNotes.push(n);
            }
        });
    }

    // Sort by duration descending (longest events on top), then oldest timestamp
    monthActiveNotes.sort((a, b) => {
        const aDur = parseInt(a.duration || 1, 10);
        const bDur = parseInt(b.duration || 1, 10);
        if (bDur !== aDur) return bDur - aDur;
        return a.timestamp - b.timestamp;
    });

    const noteToLane = {};
    const laneAllocations = []; // Array of Sets containing "Absolute Days" occupied

    monthActiveNotes.forEach(note => {
        const startDOY = getDayOfYear(note.sm, note.sd);
        let absStart = (note.sy * totalDaysPerYear) + startDOY;
        const dur = parseInt(note.duration || 1, 10);
        
        if (note.repeatsYearly) {
            let thisYearStart = (viewYear * totalDaysPerYear) + startDOY;
            let lastYearStart = ((viewYear - 1) * totalDaysPerYear) + startDOY;
            const viewMonthStart = (viewYear * totalDaysPerYear) + getDayOfYear(safeMonthIdx, 1);
            
            if (lastYearStart + dur - 1 >= viewMonthStart) {
                absStart = lastYearStart;
            } else {
                absStart = thisYearStart;
            }
        }
        
        const absEnd = absStart + dur - 1;
        
        // Find an empty lane
        let placed = false;
        for (let i = 0; i < laneAllocations.length; i++) {
            let hasOverlap = false;
            for (let d = absStart; d <= absEnd; d++) {
                if (laneAllocations[i].has(d)) {
                    hasOverlap = true;
                    break;
                }
            }
            if (!hasOverlap) {
                for (let d = absStart; d <= absEnd; d++) laneAllocations[i].add(d);
                noteToLane[note.id] = i;
                placed = true;
                break;
            }
        }
        
        // If no empty lane, create a new one
        if (!placed) {
            const newSet = new Set();
            for (let d = absStart; d <= absEnd; d++) newSet.add(d);
            laneAllocations.push(newSet);
            noteToLane[note.id] = laneAllocations.length - 1;
        }
    });

    // --- Chronological Monthly Notes Builder ---
    let monthlyNotesHtml = '';
    let monthlyNotesCount = 0;
    
    for (let d = 1; d <= activeMonth.days; d++) {
        let dayNotes = getActiveNotesForDay(viewYear, safeMonthIdx, d);
        
        if (dayNotes.length > 0) {
            dayNotes.forEach(note => {
                if (canViewNote(note)) {
                    const targetAbsolute = (viewYear * totalDaysPerYear) + getDayOfYear(safeMonthIdx, d);
                    const noteStartDOY = getDayOfYear(note.sm, note.sd);
                    const dur = parseInt(note.duration || 1, 10);
                    
                    let effectiveStartAbsolute = (note.sy * totalDaysPerYear) + noteStartDOY;
                    if (note.repeatsYearly) {
                        let thisYearStart = (viewYear * totalDaysPerYear) + noteStartDOY;
                        let lastYearStart = ((viewYear - 1) * totalDaysPerYear) + noteStartDOY;
                        if (lastYearStart + dur - 1 >= targetAbsolute) {
                            effectiveStartAbsolute = lastYearStart;
                        } else {
                            effectiveStartAbsolute = thisYearStart;
                        }
                    }

                    // Only show in summary if it's the absolute START of the note (prevents 10 entries for a 10-day trip)
                    const isStartOfDay = targetAbsolute === effectiveStartAbsolute;

                    if (isStartOfDay || d === 1) { 
                        // Avoid duplicates if we already showed it on the 1st
                        if (d === 1 && !isStartOfDay) {
                            const viewMonthStartAbsolute = (viewYear * totalDaysPerYear) + getDayOfYear(safeMonthIdx, 1);
                            if (effectiveStartAbsolute > viewMonthStartAbsolute) return; 
                        }

                        monthlyNotesCount++;
                        const parsed = window.appActions.parseSmartText(note.text);
                        const isAuthorDM = note.authorId === camp.dmId || !note.authorId;
                        const authorName = isAuthorDM ? 'Dungeon Master' : (playerNames[note.authorId] || 'Unknown Player');
                        const authorIcon = isAuthorDM ? '<i class="fa-solid fa-crown text-amber-500 mr-1"></i>' : '<i class="fa-solid fa-feather-pointed text-stone-400 mr-1"></i>';
                        
                        let badgesHtml = '';
                        if (dur > 1) badgesHtml += `<span class="text-[9px] uppercase tracking-wider font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-sm shadow-sm" title="Spans ${dur} days"><i class="fa-solid fa-arrows-left-right"></i> ${dur} Days</span>`;
                        if (note.repeatsYearly) badgesHtml += `<span class="text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm shadow-sm"><i class="fa-solid fa-rotate-right"></i> Yearly</span>`;
                        
                        const catColor = getCategoryColors(note.category).split(' ')[0]; // Just grab the BG color
                        badgesHtml += `<span class="text-[9px] uppercase tracking-wider font-bold text-white ${catColor} px-1.5 py-0.5 rounded-sm shadow-sm">${note.category || 'Misc'}</span>`;

                        monthlyNotesHtml += `
                            <div class="mb-4 bg-white border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden">
                                <div class="bg-[#f4ebd8] px-3 py-2 border-b border-[#d4c5a9] flex justify-between items-center flex-wrap gap-2">
                                    <div class="flex items-center gap-2">
                                        <span class="font-serif font-bold text-amber-900 cursor-pointer hover:underline" onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, ${d})">
                                            ${displayMonthName} ${d}, ${viewYear}
                                        </span>
                                        ${badgesHtml}
                                    </div>
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
                <div class="flex items-center flex-wrap gap-3 mt-2">
                    <p class="text-stone-400 text-xs sm:text-sm font-sans flex items-center">
                        <i class="fa-solid fa-calendar-days mr-2"></i> ${cal.name}
                    </p>
                    <button onclick="window.appActions.openCalendarLore()" class="text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-500 transition border border-amber-700/50 bg-amber-900/20 px-2 py-0.5 rounded-sm flex items-center shadow-sm">
                        <i class="fa-solid fa-book-journal-whills mr-1.5"></i> Lore
                    </button>
                </div>
            </div>

            <!-- Global Dropdown Navigation -->
            <div class="flex flex-wrap gap-2 w-full lg:w-auto items-center bg-stone-900 p-2 sm:p-3 rounded-sm border border-stone-700 shadow-inner">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <input type="number" id="jump-year" value="${viewYear}" class="w-20 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold text-center">
                    <select id="jump-month" onchange="window.updateDayOptions(this.value, 'jump-day')" class="flex-grow sm:w-32 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold">
                        ${cal.months.map((m, idx) => {
                            let mName = m.name;
                            if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                            return `<option value="${idx}" ${idx === safeMonthIdx ? 'selected' : ''}>${mName}</option>`;
                        }).join('')}
                    </select>
                    <select id="jump-day" class="w-20 p-1.5 sm:p-2 bg-stone-800 text-amber-50 text-xs sm:text-sm border border-stone-600 rounded-sm outline-none focus:border-amber-600 font-bold text-center">
                        <option value="">Day...</option>
                        ${Array.from({ length: Math.max(1, parseInt(activeMonth.days || 1, 10)) }).map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
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
                        ${hasExtraInfo ? `<button onclick="window.appActions.openMonthInfo(${safeMonthIdx})" class="flex items-center justify-center text-stone-400 hover:text-amber-400 transition"><i class="fa-solid fa-circle-info text-base"></i></button>` : ''}
                    </h3>
                    <div class="text-stone-400 text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer hover:opacity-80 transition" title="Scroll to Monthly Summary" onclick="document.getElementById('chronological-summary').scrollIntoView({behavior:'smooth'})">Year ${viewYear}</div>
                </div>
                
                <button onclick="window.appActions.navCalendarMonth(1)" class="w-10 h-10 flex justify-center items-center rounded-sm bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition shadow-inner">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Calendar Grid -->
            <div class="p-2 sm:p-4 lg:p-6 bg-[#f4ebd8]">
                ${parseInt(activeMonth.days || 0, 10) === 0 ? `
                    <div class="text-center py-12 bg-white border border-[#d4c5a9] rounded-sm">
                        <i class="fa-solid fa-moon text-5xl text-stone-300 mb-4"></i>
                        <h4 class="font-serif text-xl font-bold text-stone-600 mb-2">Intercalary Observance</h4>
                        <p class="text-sm text-stone-500 italic flex items-center justify-center gap-2">
                            This special event or leap day does not occur in the year ${viewYear}.
                            ${hasExtraInfo ? `<button onclick="window.appActions.openMonthInfo(${safeMonthIdx})" class="text-stone-400 hover:text-stone-600 transition"><i class="fa-solid fa-circle-info"></i></button>` : ''}
                        </p>
                        <button onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, 1)" class="mt-4 px-4 py-2 border border-stone-400 text-stone-600 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-stone-200 transition">View / Add Notes</button>
                    </div>
                ` : `
                    <div class="border-l border-t border-[#d4c5a9] rounded-sm overflow-hidden bg-white shadow-sm">
                        <div class="grid w-full" style="grid-template-columns: repeat(${parseInt(cal.daysInWeek || 7, 10)}, minmax(0, 1fr));">
                            ${Array.from({ length: parseInt(activeMonth.days || 1, 10) }).map((_, i) => {
                                const d = i + 1;
                                const isCurrent = parseInt(cal.currentYear, 10) === viewYear && parseInt(cal.currentMonth, 10) === safeMonthIdx && parseInt(cal.currentDay, 10) === d;
                                
                                let rawNotes = getActiveNotesForDay(viewYear, safeMonthIdx, d);
                                const visibleNotes = rawNotes.filter(canViewNote);
                                let hasHidden = isDM ? rawNotes.some(n => !canViewNote(n)) : false;
                                
                                // Map visible notes to their permanent lanes for this month
                                const dayLanes = [];
                                let maxLane = -1;
                                visibleNotes.forEach(n => {
                                    const lane = noteToLane[n.id];
                                    if (lane !== undefined) {
                                        dayLanes[lane] = n;
                                        if (lane > maxLane) maxLane = lane;
                                    }
                                });
                                
                                // Build the spanning bars based on exact lane positions
                                let spanBarsHtml = '';
                                for (let laneIdx = 0; laneIdx <= maxLane; laneIdx++) {
                                    const note = dayLanes[laneIdx];
                                    
                                    if (note) {
                                        const catColorClass = getCategoryColors(note.category);
                                        const dur = parseInt(note.duration || 1, 10);
                                        
                                        let mClass = 'mx-1 border';
                                        let rClass = 'rounded-sm';
                                        let zClass = '';
                                        let textOpacity = 'text-current';
                                        let shadowClass = 'shadow-sm';

                                        if (dur > 1) {
                                            zClass = 'relative z-10';
                                            shadowClass = ''; // Remove shadow from spanning blocks so they merge visually
                                            
                                            const targetAbsolute = (viewYear * totalDaysPerYear) + getDayOfYear(safeMonthIdx, d);
                                            const noteStartDOY = getDayOfYear(note.sm, note.sd);
                                            
                                            let effectiveStartAbsolute = (note.sy * totalDaysPerYear) + noteStartDOY;
                                            if (note.repeatsYearly) {
                                                let thisYearStart = (viewYear * totalDaysPerYear) + noteStartDOY;
                                                let lastYearStart = ((viewYear - 1) * totalDaysPerYear) + noteStartDOY;
                                                if (lastYearStart + dur - 1 >= targetAbsolute) {
                                                    effectiveStartAbsolute = lastYearStart;
                                                } else {
                                                    effectiveStartAbsolute = thisYearStart;
                                                }
                                            }
                                            
                                            const effectiveEndAbsolute = effectiveStartAbsolute + dur - 1;

                                            const isStart = targetAbsolute === effectiveStartAbsolute;
                                            const isEnd = targetAbsolute === effectiveEndAbsolute;

                                            const daysInWeekInt = parseInt(cal.daysInWeek || 7, 10);
                                            const isRowStart = ((d - 1) % daysInWeekInt) === 0;
                                            const isRowEnd = (d % daysInWeekInt) === 0 || d === parseInt(activeMonth.days, 10);

                                            const leftTouches = !isStart && !isRowStart; 
                                            const rightTouches = !isEnd && !isRowEnd;

                                            if (leftTouches && rightTouches) {
                                                mClass = '-mx-px border-y border-x-transparent';
                                                rClass = 'rounded-none';
                                                textOpacity = 'text-transparent select-none'; // Hide text in the middle
                                            } else if (leftTouches && !rightTouches) {
                                                mClass = '-ml-px mr-1 border-y border-r border-l-transparent';
                                                rClass = 'rounded-l-none rounded-r-sm';
                                                textOpacity = 'text-transparent select-none'; // Hide text at the end segment
                                            } else if (!leftTouches && rightTouches) {
                                                mClass = 'ml-1 -mr-px border-y border-l border-r-transparent';
                                                rClass = 'rounded-l-sm rounded-r-none';
                                            } else {
                                                // 1-day span that wraps perfectly into its own row (rare edge case)
                                                mClass = 'mx-1 border';
                                                rClass = 'rounded-sm';
                                                shadowClass = 'shadow-sm';
                                            }
                                        }

                                        const plainText = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(note.text).replace(/<[^>]*>?/gm, '').trim() : note.text;
                                        
                                        spanBarsHtml += `
                                            <div class="text-[9px] sm:text-[10px] leading-tight px-1.5 flex items-center truncate ${catColorClass} ${rClass} ${mClass} ${zClass} ${shadowClass} h-[16px] sm:h-[18px] mb-[2px]" title="${plainText}">
                                                <span class="${textOpacity}">${plainText}</span>
                                            </div>
                                        `;
                                    } else {
                                        // Invisible Spacer to maintain exact vertical offset for the lane!
                                        spanBarsHtml += `<div class="h-[16px] sm:h-[18px] mb-[2px] w-full invisible"></div>`;
                                    }
                                }

                                let bgClass = "bg-[#fdfbf7]";
                                let textClass = "text-stone-700";
                                
                                if (isCurrent) {
                                    bgClass = "bg-amber-50";
                                    textClass = "text-amber-900 font-bold";
                                }

                                return `
                                    <div onclick="window.appActions.openCalendarDay(${viewYear}, ${safeMonthIdx}, ${d})" 
                                         class="relative flex flex-col min-h-[5rem] sm:min-h-[7rem] cursor-pointer transition hover:bg-white border-r border-b border-[#d4c5a9] ${bgClass}">
                                        
                                        ${isCurrent ? `<div class="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm text-white text-[8px] sm:text-[10px] z-20" title="Current Campaign Date"><i class="fa-solid fa-star"></i></div>` : ''}
                                        
                                        <span class="text-xs sm:text-sm font-serif ${textClass} p-1 sm:p-2 pb-0 opacity-70">${d}</span>
                                        
                                        <div class="flex flex-col w-full z-0 flex-grow py-1">
                                            ${spanBarsHtml}
                                        </div>

                                        ${hasHidden ? `
                                            <div class="absolute bottom-1 right-1 text-red-300" title="Hidden Note(s)">
                                                <i class="fa-solid fa-eye-slash text-[8px] sm:text-[10px]"></i>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
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

    // --- GLOBAL CALENDAR LORE MODAL ---
    if (state.showCalendarLore) {
        const parsedDesc = (window.appActions && window.appActions.parseSmartText)
            ? window.appActions.parseSmartText(cal.description || '')
            : (cal.description || '');

        html += `
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[5000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-3xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md shrink-0">
                    <div class="flex items-center gap-3 text-amber-500">
                        <i class="fa-solid fa-book-journal-whills text-xl"></i>
                        <div>
                            <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">Calendar Lore & Mechanics</h2>
                            <p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">${cal.name}</p>
                        </div>
                    </div>
                    <button onclick="window.appActions.closeCalendarLore()" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] text-sm text-stone-800 font-serif leading-relaxed space-y-4">
                    ${parsedDesc || '<p class="italic text-stone-500">No lore has been inscribed for this calendar.</p>'}
                </div>
            </div>
        </div>
        `;
    }

    // --- MONTH INFO MODAL ---
    if (state.viewMonthInfoIdx !== null && state.viewMonthInfoIdx !== undefined) {
        const mInfo = cal.months[state.viewMonthInfoIdx];
        if (mInfo) {
            let mName = mInfo.name;
            let mNick = mInfo.nickname || "";
            let mSeason = mInfo.season || "";
            let mLore = mInfo.lore || "";
            let mDesc = mInfo.description || "";

            // Fallback for legacy
            if (!mNick && !mLore && mName.includes('(')) {
                const pMatch = mName.match(/(.*?)\s*\((.*?)\)/);
                if (pMatch) {
                    mName = pMatch[1].trim();
                    mNick = pMatch[2].trim();
                }
            }

            const parsedLore = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(mLore) : mLore;
            const parsedDesc = (window.appActions && window.appActions.parseSmartText) ? window.appActions.parseSmartText(mDesc) : mDesc;

            html += `
            <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in">
                <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-lg border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                    
                    <div class="bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#292524] p-4 flex justify-between items-center border-b-2 border-amber-600 shadow-md">
                        <div class="flex items-center gap-3 text-amber-500">
                            <i class="fa-solid fa-moon text-xl"></i>
                            <div>
                                <h2 class="text-lg font-serif font-bold text-amber-50 leading-tight">${mName}</h2>
                                ${mNick ? `<p class="text-stone-400 text-[10px] uppercase tracking-widest font-bold">"${mNick}"</p>` : ''}
                            </div>
                        </div>
                        <button onclick="window.appActions.closeMonthInfo()" class="w-8 h-8 rounded bg-stone-800 text-stone-300 hover:text-red-400 hover:bg-stone-700 transition flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
                    </div>

                    <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-[#fdfbf7] space-y-4">
                        ${mSeason ? `
                            <div>
                                <h3 class="text-[10px] uppercase text-amber-700 font-bold tracking-widest border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-leaf mr-1"></i> Season</h3>
                                <p class="text-sm font-sans text-stone-800 font-bold">${mSeason}</p>
                            </div>
                        ` : ''}
                        
                        ${mLore ? `
                            <div>
                                <h3 class="text-[10px] uppercase text-amber-700 font-bold tracking-widest border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-book-journal-whills mr-1"></i> Lore & Traditions</h3>
                                <div class="text-sm font-serif text-stone-800 leading-relaxed">${parsedLore}</div>
                            </div>
                        ` : ''}

                        ${mDesc ? `
                            <div>
                                <h3 class="text-[10px] uppercase text-amber-700 font-bold tracking-widest border-b border-[#d4c5a9] pb-1 mb-2"><i class="fa-solid fa-feather mr-1"></i> General Notes</h3>
                                <div class="text-sm font-serif text-stone-800 leading-relaxed">${parsedDesc}</div>
                            </div>
                        ` : ''}
                        
                        ${(!mSeason && !mLore && !mDesc) ? `
                            <p class="text-sm text-stone-500 italic text-center py-4">No extensive records exist for this month.</p>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }
    }


    // --- DAY INSPECTOR MODAL (MULTIPLE NOTES SUPPORT) ---
    if (state.activeCalendarDate) {
        const { year, monthIndex, day } = state.activeCalendarDate;
        const isCurrent = parseInt(cal.currentYear, 10) === year && parseInt(cal.currentMonth, 10) === monthIndex && parseInt(cal.currentDay, 10) === day;
        
        let modalMonthName = cal.months[monthIndex]?.name || "Unknown";
        if (cal.months[monthIndex]?.nickname === undefined && cal.months[monthIndex]?.lore === undefined && modalMonthName.includes('(')) {
            modalMonthName = modalMonthName.split('(')[0].trim();
        }

        let dayNotes = getActiveNotesForDay(year, monthIndex, day);

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

                const catColor = getCategoryColors(note.category).split(' ')[0]; // Just grab the BG color for the badge
                let catBadge = `<span class="text-[9px] uppercase tracking-wider font-bold text-white ${catColor} px-1.5 py-0.5 rounded-sm">${note.category || 'Misc'}</span>`;

                let sourceBadge = '';
                if (parseInt(note.sy, 10) !== year || parseInt(note.sm, 10) !== monthIndex || parseInt(note.sd, 10) !== day) {
                    let origMName = cal.months[note.sm]?.name || "Unknown";
                    if (origMName.includes('(')) origMName = origMName.split('(')[0].trim();
                    sourceBadge = `<span class="text-[9px] uppercase tracking-wider font-bold text-stone-400 ml-2" title="Original Anchor Date">Anchored: ${origMName} ${note.sd}${!note.repeatsYearly ? `, ${note.sy}` : ''}</span>`;
                }

                existingNotesHtml += `
                    <div class="mb-4 bg-white border border-[#d4c5a9] rounded-sm shadow-sm overflow-hidden relative group">
                        <div class="bg-[#f4ebd8] px-3 py-1.5 border-b border-[#d4c5a9] flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                ${badgeHtml}
                                ${catBadge}
                                ${isMyNote ? `<span class="text-[9px] uppercase font-bold tracking-widest ${vis.color}" title="${vis.text}"><i class="fa-solid ${vis.icon}"></i></span>` : ''}
                                ${sourceBadge}
                            </div>
                            ${isMyNote ? `
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onclick="window.appActions.editCalendarNote('${note.id}', ${note.sy}, ${note.sm}, ${note.sd})" class="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 transition"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
                                    <button onclick="window.appActions.deleteCalendarNote(${note.sy}, ${note.sm}, ${note.sd}, '${note.id}')" class="text-[10px] uppercase font-bold tracking-wider text-red-600 hover:text-red-800 transition"><i class="fa-solid fa-trash"></i></button>
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
                    <div id="cal-note-editor" class="border-t-2 border-stone-300 pt-6 mt-4 vis-container">
                        <input type="hidden" id="cal-note-id" value="">
                        <input type="hidden" id="cal-note-orig-y" value="">
                        <input type="hidden" id="cal-note-orig-m" value="">
                        <input type="hidden" id="cal-note-orig-d" value="">

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
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 border-b border-[#d4c5a9] pb-3 bg-white p-3 rounded-sm shadow-inner">
                            
                            <!-- Start Date -->
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Start Date</label>
                                <div class="flex items-center gap-1">
                                    <input type="number" id="cal-note-start-y" value="${year}" onchange="window.appActions.syncCalendarNoteDates('startdate')" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" title="Year">
                                    <select id="cal-note-start-m" onchange="window.updateDayOptions(this.value, 'cal-note-start-d'); window.appActions.syncCalendarNoteDates('startdate')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-sm" title="Month">
                                        ${cal.months.map((m, idx) => {
                                            let mName = m.name;
                                            if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                            return `<option value="${idx}" ${idx === monthIndex ? 'selected' : ''}>${mName}</option>`;
                                        }).join('')}
                                    </select>
                                    <select id="cal-note-start-d" onchange="window.appActions.syncCalendarNoteDates('startdate')" class="w-14 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" title="Day">
                                        ${Array.from({ length: Math.max(1, parseInt(cal.months[monthIndex].days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === day ? 'selected' : ''}>${i+1}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Category -->
                            <div>
                                <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Category</label>
                                <select id="cal-note-category" class="w-full p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-sm">
                                    <option value="Adventure">Adventure</option>
                                    <option value="Session">Session</option>
                                    <option value="Birthday">Birthday</option>
                                    <option value="Holiday">Holiday</option>
                                    <option value="Downtime">Downtime</option>
                                    <option value="Travel">Travel</option>
                                    <option value="Misc" selected>Misc</option>
                                </select>
                            </div>

                            <!-- Duration & End Date synced logic -->
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end bg-stone-50 p-2 border border-stone-200 rounded-sm sm:col-span-2">
                                <div>
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Duration</label>
                                    <div class="flex items-center gap-1">
                                        <input type="number" id="cal-note-duration" value="1" min="1" oninput="window.appActions.syncCalendarNoteDates('duration')" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" title="Days">
                                        <span class="text-[10px] uppercase text-stone-500 font-bold tracking-widest ml-1">Days</span>
                                    </div>
                                </div>
                                <div class="hidden sm:flex items-center pb-2 px-1">
                                    <span class="text-[10px] uppercase text-stone-400 font-bold tracking-widest">OR</span>
                                </div>
                                <div class="flex-grow">
                                    <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">End Date</label>
                                    <div class="flex items-center gap-1">
                                        <input type="number" id="cal-note-end-y" value="${year}" onchange="window.appActions.syncCalendarNoteDates('enddate')" class="w-16 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" title="Year">
                                        <select id="cal-note-end-m" onchange="window.updateDayOptions(this.value, 'cal-note-end-d'); window.appActions.syncCalendarNoteDates('enddate')" class="flex-grow p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 shadow-sm" title="Month">
                                            ${cal.months.map((m, idx) => {
                                                let mName = m.name;
                                                if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) mName = mName.split('(')[0].trim();
                                                return `<option value="${idx}" ${idx === monthIndex ? 'selected' : ''}>${mName}</option>`;
                                            }).join('')}
                                        </select>
                                        <select id="cal-note-end-d" onchange="window.appActions.syncCalendarNoteDates('enddate')" class="w-14 p-1.5 border border-[#d4c5a9] rounded-sm text-xs font-bold text-stone-900 outline-none focus:border-amber-600 text-center shadow-sm" title="Day">
                                            ${Array.from({ length: Math.max(1, parseInt(cal.months[monthIndex].days || 1, 10)) }).map((_, i) => `<option value="${i+1}" ${i+1 === day ? 'selected' : ''}>${i+1}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Options -->
                            <div class="flex items-center justify-between sm:col-span-2 pt-1 border-t border-stone-200">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" id="cal-note-repeats" class="w-4 h-4 text-amber-600 rounded-sm border-stone-400 focus:ring-amber-500 cursor-pointer">
                                    <span class="text-[10px] uppercase text-stone-600 font-bold tracking-widest group-hover:text-amber-700 transition">Repeats Yearly (e.g. Birthdays)</span>
                                </label>
                            </div>
                        </div>

                        <div class="flex flex-wrap justify-between items-end mb-1 mt-3 gap-2">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Note Details</label>
                            <div class="flex gap-1 bg-stone-200 p-1 rounded-sm border border-[#d4c5a9] shadow-sm ml-auto overflow-x-auto hide-scrollbar">
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'bold')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'italic')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'underline')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Underline"><i class="fa-solid fa-underline"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-0.5 sm:mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'h1')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 1">H1</button>
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'h2')" class="w-6 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Heading 2">H2</button>
                                <button type="button" onclick="window.appActions.formatText('cal-note-text', 'list')" class="w-6 h-6 flex shrink-0 items-center justify-center text-xs text-stone-600 hover:text-stone-900 hover:bg-[#d4c5a9] rounded-sm transition" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
                                <div class="w-px bg-[#d4c5a9] mx-0.5 sm:mx-1 shrink-0"></div>
                                <button type="button" onclick="window.appActions.defineEntryFromSelection('cal-note-text')" class="px-2 h-6 flex shrink-0 items-center justify-center text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:bg-[#d4c5a9] rounded-sm transition uppercase tracking-wider" title="Define Highlighted Text"><i class="fa-solid fa-book-medical mr-1"></i> Define</button>
                            </div>
                        </div>
                        <textarea id="cal-note-text" oninput="window.appActions.handleSmartInput(this)" class="w-full h-32 bg-white border border-[#d4c5a9] text-stone-900 p-3 text-sm focus:border-amber-600 outline-none resize-none rounded-b-sm shadow-inner custom-scrollbar font-serif" placeholder="Add your perspective... Codex names link automatically."></textarea>
                        
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
        <div class="fixed inset-0 bg-stone-900 bg-opacity-80 flex items-center justify-center p-4 z-[5000] backdrop-blur-sm animate-in">
            <div class="bg-[#f4ebd8] rounded-sm shadow-2xl w-full max-w-4xl border border-[#d4c5a9] overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="bg-stone-900 p-4 border-b-4 border-amber-700 text-amber-500 flex justify-between items-center shrink-0">
                    <h2 class="text-xl font-serif font-bold flex items-center"><i class="fa-solid fa-gear mr-3"></i> Calendar Configuration</h2>
                    <button onclick="window.appActions.closeCalendarSettings()" class="text-stone-400 hover:text-white transition"><i class="fa-solid fa-times text-xl"></i></button>
                </div>

                <div class="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow bg-[#fdfbf7]">
                    
                    <div class="bg-amber-100 text-amber-900 p-3 rounded-sm border border-amber-300 text-xs sm:text-sm mb-6 flex items-start shadow-inner">
                        <i class="fa-solid fa-triangle-exclamation mt-0.5 mr-3 text-amber-600"></i>
                        <p>Altering the fundamental structure of the calendar (like days in a week or removing months) will not delete your existing notes, but it may shift how historical dates align on the grid.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Calendar Name</label>
                            <input type="text" id="cal-config-name" value="${cal.name}" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Days in a Week</label>
                            <input type="number" id="cal-config-week" value="${cal.daysInWeek}" min="1" class="w-full p-2 border border-[#d4c5a9] rounded-sm text-sm font-bold text-stone-900 shadow-inner outline-none focus:border-amber-600 bg-white" placeholder="e.g. 10 for Harptos">
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-[10px] uppercase text-stone-500 font-bold mb-1 tracking-widest">Global Calendar Lore & Mechanics</label>
                        <textarea id="cal-config-desc" class="w-full h-32 p-3 border border-[#d4c5a9] rounded-sm text-sm font-serif outline-none focus:border-amber-600 bg-white text-stone-800 shadow-inner custom-scrollbar" placeholder="General mechanics, holidays, seasons...">${(cal.description || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>

                    <div class="border-t border-[#d4c5a9] pt-4">
                        <div class="flex justify-between items-center mb-3">
                            <label class="block text-[10px] uppercase text-stone-500 font-bold tracking-widest">Months of the Year</label>
                            <button onclick="window.appActions.addCalendarMonthRow()" class="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition flex items-center"><i class="fa-solid fa-plus mr-1"></i> Add Month / Leap Day</button>
                        </div>
                        
                        <div id="cal-months-container" class="space-y-4">
                            ${cal.months.map((m) => {
                                let mName = m.name;
                                let mNick = m.nickname !== undefined ? m.nickname : "";
                                let mSeason = m.season !== undefined ? m.season : "";
                                let mLore = m.lore !== undefined ? m.lore : "";
                                let mDesc = m.description !== undefined ? m.description : "";

                                // Extract legacy lore into the new explicit input fields during edit
                                if (m.nickname === undefined && m.lore === undefined && mName.includes('(')) {
                                    const parenMatch = mName.match(/(.*?)\s*\((.*?)\)/);
                                    if (parenMatch) {
                                        mName = parenMatch[1].trim();
                                        mNick = parenMatch[2].trim();
                                    }
                                }
                                return `
                                    <div class="cal-month-row bg-stone-100 p-3 sm:p-4 border border-[#d4c5a9] rounded-sm shadow-sm relative group">
                                        <div class="absolute right-3 top-3">
                                            <button type="button" class="text-stone-400 hover:text-red-700 transition" onclick="this.closest('.cal-month-row').remove()" title="Remove Month"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                        <div class="flex items-center gap-2 mb-3 cursor-grab text-stone-400 hover:text-stone-600 w-max pr-8">
                                            <i class="fa-solid fa-bars"></i> <span class="text-[10px] font-bold uppercase tracking-widest">Reorder Month</span>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Name</label>
                                                <input type="text" value="${mName.replace(/"/g, '&quot;')}" class="cal-month-name w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white font-bold text-stone-900 shadow-inner" placeholder="e.g. Hammer">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Nickname</label>
                                                <input type="text" value="${mNick.replace(/"/g, '&quot;')}" class="cal-month-nickname w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner" placeholder="e.g. Deepwinter">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Season</label>
                                                <input type="text" value="${mSeason.replace(/"/g, '&quot;')}" class="cal-month-season w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner" placeholder="e.g. Winter">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Days</label>
                                                <input type="number" min="0" value="${m.days}" class="cal-month-days w-full p-2 border border-[#d4c5a9] rounded-sm text-sm outline-none focus:border-red-900 bg-white text-stone-900 font-mono shadow-inner" placeholder="Days">
                                            </div>
                                        </div>
                                        <div class="space-y-3">
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">Lore & Traditions</label>
                                                <textarea class="cal-month-lore w-full p-2 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner resize-y min-h-[60px]" placeholder="Festivals, celestial alignments, common traditions...">${mLore.replace(/"/g, '&quot;')}</textarea>
                                            </div>
                                            <div>
                                                <label class="block text-[9px] uppercase text-stone-500 font-bold tracking-widest mb-1">General Notes</label>
                                                <textarea class="cal-month-desc w-full p-2 border border-[#d4c5a9] rounded-sm text-xs sm:text-sm outline-none focus:border-red-900 bg-white text-stone-700 shadow-inner resize-y min-h-[60px]" placeholder="Additional info, weather patterns, DM secrets...">${mDesc.replace(/"/g, '&quot;')}</textarea>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
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

// --- GLOBAL WINDOW BINDINGS FOR INLINE HTML ---
window.updateDayOptions = function(monthIdx, targetSelectId) {
    const camp = window.appData?.activeCampaign;
    if (!camp || !camp.calendar) return;
    
    const month = camp.calendar.months[monthIdx];
    const daySelect = document.getElementById(targetSelectId);
    if (!month || !daySelect) return;

    const currentVal = parseInt(daySelect.value, 10) || 1;
    const numDays = Math.max(1, parseInt(month.days, 10) || 1); 
    
    let optionsHtml = '';
    if (targetSelectId === 'jump-day') {
        optionsHtml += '<option value="">Day...</option>';
    }
    
    for (let i = 1; i <= numDays; i++) {
        optionsHtml += `<option value="${i}">${i}</option>`;
    }
    
    daySelect.innerHTML = optionsHtml;
    
    if (targetSelectId !== 'jump-day') {
        daySelect.value = currentVal > numDays ? numDays : currentVal;
    } else if (daySelect.value !== '') {
        daySelect.value = currentVal > numDays ? numDays : currentVal;
    }
};
