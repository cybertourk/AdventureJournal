import { setCampaignsData, updateDerivedState, reRender } from './state.js'; 

// Import UI Core Navigation & Layout Controls
import { navigateBack, toggleActionMenu } from './ui-core.js';

// Import Campaign & Hero Management 
import { setView, openCampaign, openAdventure, toggleNewCampaignForm, createCampaign, deleteCampaignAction, copyCampaignId, toggleJoinCampaignForm, joinCampaignAction, toggleNewAdventureForm, createAdventure, deleteAdventure, openEditAdventureModal, saveEditAdventure, refreshPartyBoons, openAdvRoster, toggleAdvRosterPc, saveAdvRoster, openActivityLog, clearActivityLog, openPCEdit, savePCEdit, deletePC, kickPlayer, openChecklistMenu, closeChecklistMenu, addSheetUpdate, toggleSheetUpdateResolved, toggleSheetUpdateVis, deleteSheetUpdate } from './actions-campaign.js'; 

// Import Session, Narrative, & Visibility Controls 
import { openSessionEdit, switchSessionTab, updateSessionBudget, _readDynamicList, _gatherSessionDraft, updateSessionPreview, saveSession, deleteSession, addLogScene, addLogClue, openVisibilityMenu, toggleVisSpecificList, saveVisibility, _saveCampaignHelper, openUniversalEditor, closeUniversalEditor, saveUniversalEditor, formatText, addChronicleEntry, editChronicleEntry, cancelChronicleEdit, deleteChronicleEntry, syncSessionDates } from './actions-session.js'; 

// Import Codex, Smart-Text, & Journal Functionality 
import { _canViewCodex, parseSmartText, handleSmartInput, _showSuggestions, viewCodex, _openCodexModal, saveCodexEntry, deleteCodexEntry, openJournal, closeJournal, copyJournal, defineEntryFromSelection } from './actions-codex.js'; 

// Import Calendar Functionality
import { openCalendar, navCalendarMonth, jumpToCurrentDate, jumpToSpecificDate, openCalendarLore, closeCalendarLore, openMonthInfo, closeMonthInfo, openCalendarDay, closeCalendarDay, setCurrentCampaignDate, syncCalendarNoteDates, saveCalendarNote, editCalendarNote, deleteCalendarNote, openCalendarSettings, closeCalendarSettings, addCalendarMonthRow, saveCalendarSettings, resetCalendarToDefault, importFoundryCalendarNotes } from './actions-calendar.js';

// Import Rules Glossary Functionality
import { openRulesGlossary, viewRule, openRuleModal, saveRule, deleteRule, updateTravelPresets, calculateTravel, calculateEncumbrance, calculateJump } from './actions-rules.js';

// --- APP ACTIONS HUB --- 
// We bind all our imported modular functions back to the global window.appActions 
// object so that the UI's inline onclick handlers can still reach them! 
window.appActions = { 
  // Navigation & UI Core
  navigateBack,
  toggleActionMenu,

  // Navigation & Campaigns 
  setView, 
  openCampaign, 
  openAdventure, 
  toggleNewCampaignForm, 
  createCampaign, 
  deleteCampaign: deleteCampaignAction, 
  openActivityLog,
  clearActivityLog,
  
  // Player Actions 
  copyCampaignId, 
  toggleJoinCampaignForm, 
  joinCampaign: joinCampaignAction, 
  
  // Adventures 
  toggleNewAdventureForm, 
  createAdventure, 
  deleteAdventure, 
  openEditAdventureModal,
  saveEditAdventure,
  refreshPartyBoons,
  openAdvRoster, 
  toggleAdvRosterPc, 
  saveAdvRoster, 
  
  // PC Manager & Sheet Updates 
  openPCEdit, 
  savePCEdit, 
  deletePC, 
  kickPlayer, 
  openChecklistMenu, 
  closeChecklistMenu, 
  addSheetUpdate, 
  toggleSheetUpdateResolved, 
  toggleSheetUpdateVis, 
  deleteSheetUpdate, 
  
  // Session Editing & Collaborative Chronicle
  openSessionEdit, 
  switchSessionTab, 
  updateSessionBudget, 
  _readDynamicList, 
  _gatherSessionDraft, 
  updateSessionPreview, 
  saveSession, 
  deleteSession, 
  addLogScene, 
  addLogClue, 
  addChronicleEntry,
  editChronicleEntry,
  cancelChronicleEdit,
  deleteChronicleEntry,
  syncSessionDates,
  
  // Visibility 
  openVisibilityMenu, 
  toggleVisSpecificList, 
  saveVisibility, 
  _saveCampaignHelper, 
  
  // Universal Editor 
  openUniversalEditor, 
  closeUniversalEditor, 
  saveUniversalEditor, 
  formatText, 
  
  // Smart Text & Codex 
  _canViewCodex, 
  parseSmartText, 
  handleSmartInput, 
  _showSuggestions, 
  viewCodex, 
  _openCodexModal, 
  saveCodexEntry, 
  deleteCodexEntry, 
  openJournal, 
  closeJournal, 
  copyJournal,
  defineEntryFromSelection,

  // Calendar System
  openCalendar,
  navCalendarMonth,
  jumpToCurrentDate,
  jumpToSpecificDate,
  openCalendarLore,
  closeCalendarLore,
  openMonthInfo,
  closeMonthInfo,
  openCalendarDay,
  closeCalendarDay,
  setCurrentCampaignDate,
  syncCalendarNoteDates,
  saveCalendarNote,
  editCalendarNote,
  deleteCalendarNote,
  openCalendarSettings,
  closeCalendarSettings,
  addCalendarMonthRow,
  saveCalendarSettings,
  resetCalendarToDefault,
  importFoundryCalendarNotes,

  // Rules Glossary & Calculators
  openRulesGlossary,
  viewRule,
  openRuleModal,
  saveRule,
  deleteRule,
  updateTravelPresets,
  calculateTravel,
  calculateEncumbrance,
  calculateJump
}; 

// ============================================================================
// --- HISTORY API INTERCEPTOR (Native Phone Back Button Support) ---
// ============================================================================

// 1. Set the initial anchor state so the browser knows where "Home" is
history.replaceState({
    currentView: 'home',
    activeCampaignId: null,
    activeAdventureId: null,
    activeSessionId: null
}, "", "#home");

// 2. Intercept our internal navigation router to push states automatically
const originalSetView = window.appActions.setView;
window.appActions.setView = function(viewName, skipHistory = false) {
    // Execute the visual change first
    originalSetView(viewName);
    
    // Push the resulting state to the browser history
    if (!skipHistory) {
        const stateObj = {
            currentView: viewName,
            activeCampaignId: window.appData?.activeCampaignId || null,
            activeAdventureId: window.appData?.activeAdventureId || null,
            activeSessionId: window.appData?.activeSessionId || null
        };
        history.pushState(stateObj, "", `#${viewName}`);
    }
};

// 3. Override the visual App Header Back Arrow to use the browser history
window.appActions.navigateBack = function() {
    history.back(); // This naturally triggers the popstate listener below!
};

// 4. Listen for the Phone's physical Back Button or Swipe gestures
window.addEventListener('popstate', (event) => {
    
    // A. Soft-Close open modals instead of navigating away!
    const popupContainer = document.getElementById('global-popup-container');
    const actionSheet = document.getElementById('action-sheet');
    const checklist = document.getElementById('checklist-modal');
    const univEditor = document.getElementById('universal-editor-modal');
    const settingsModal = document.getElementById('account-settings-modal');
    const visibilityModal = document.getElementById('visibility-modal');
    
    let modalClosed = false;
    
    if (visibilityModal && !visibilityModal.classList.contains('hidden')) {
        visibilityModal.classList.add('hidden');
        modalClosed = true;
    } else if (popupContainer && popupContainer.innerHTML.trim() !== '') {
        popupContainer.innerHTML = '';
        modalClosed = true;
    } else if (actionSheet && actionSheet.classList.contains('open')) {
        window.appActions.toggleActionMenu();
        modalClosed = true;
    } else if (checklist && !checklist.classList.contains('hidden')) {
        window.appActions.closeChecklistMenu();
        modalClosed = true;
    } else if (univEditor && !univEditor.classList.contains('hidden')) {
        window.appActions.closeUniversalEditor();
        modalClosed = true;
    } else if (settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
        modalClosed = true;
    }

    if (modalClosed) {
        // We intercepted the back button to close a modal. 
        // We must push the current state back onto the stack so the underlying page doesn't change.
        const recoveredState = {
            currentView: window.appData?.currentView || 'home',
            activeCampaignId: window.appData?.activeCampaignId || null,
            activeAdventureId: window.appData?.activeAdventureId || null,
            activeSessionId: window.appData?.activeSessionId || null
        };
        history.pushState(recoveredState, "", `#${window.appData?.currentView || 'home'}`);
        return;
    }

    // B. Perform actual deep navigation back through the app history
    if (event.state && window.appData) {
        window.appData.currentView = event.state.currentView;
        window.appData.activeCampaignId = event.state.activeCampaignId;
        window.appData.activeAdventureId = event.state.activeAdventureId;
        window.appData.activeSessionId = event.state.activeSessionId;
        
        updateDerivedState();
        reRender();
    } else {
        // Fallback to Home if we lose state
        if (window.appData) window.appData.currentView = 'home';
        reRender();
    }
});

export { setCampaignsData };
