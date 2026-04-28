import { setCampaignsData } from './state.js'; 

// Import Campaign & Hero Management 
import { setView, openCampaign, openAdventure, toggleNewCampaignForm, createCampaign, deleteCampaignAction, copyCampaignId, toggleJoinCampaignForm, joinCampaignAction, toggleNewAdventureForm, createAdventure, deleteAdventure, openAdvRoster, toggleAdvRosterPc, saveAdvRoster, openPCEdit, savePCEdit, deletePC, kickPlayer, openChecklistMenu, closeChecklistMenu, addSheetUpdate, toggleSheetUpdateResolved, toggleSheetUpdateVis, deleteSheetUpdate } from './actions-campaign.js'; 

// Import Session, Narrative, & Visibility Controls 
import { openSessionEdit, switchSessionTab, updateSessionBudget, _readDynamicList, _gatherSessionDraft, updateSessionPreview, saveSession, deleteSession, addLogScene, addLogClue, openVisibilityMenu, toggleVisSpecificList, saveVisibility, _saveCampaignHelper, openUniversalEditor, closeUniversalEditor, saveUniversalEditor, formatText, addChronicleEntry, deleteChronicleEntry } from './actions-session.js'; 

// Import Codex, Smart-Text, & Journal Functionality 
import { _canViewCodex, parseSmartText, handleSmartInput, _showSuggestions, viewCodex, _openCodexModal, saveCodexEntry, deleteCodexEntry, openJournal, closeJournal, copyJournal } from './actions-codex.js'; 

// Import Calendar Functionality
import { openCalendar, navCalendarMonth, jumpToCurrentDate, jumpToSpecificDate, openCalendarLore, closeCalendarLore, openMonthInfo, closeMonthInfo, openCalendarDay, closeCalendarDay, setCurrentCampaignDate, syncCalendarNoteDates, saveCalendarNote, editCalendarNote, deleteCalendarNote, openCalendarSettings, closeCalendarSettings, addCalendarMonthRow, saveCalendarSettings, resetCalendarToDefault, importFoundryCalendarNotes } from './actions-calendar.js';

// Import Rules Glossary Functionality
import { openRulesGlossary, viewRule, openRuleModal, saveRule, deleteRule, updateTravelPresets, calculateTravel, calculateEncumbrance, calculateJump } from './actions-rules.js';

// --- APP ACTIONS HUB --- 
// We bind all our imported modular functions back to the global window.appActions 
// object so that the UI's inline onclick handlers can still reach them! 
window.appActions = { 
  // Navigation & Campaigns 
  setView, 
  openCampaign, 
  openAdventure, 
  toggleNewCampaignForm, 
  createCampaign, 
  deleteCampaign: deleteCampaignAction, // Mapped to match the UI's expected function name 
  
  // Player Actions 
  copyCampaignId, 
  toggleJoinCampaignForm, 
  joinCampaign: joinCampaignAction, // Mapped to match the UI's expected function name 
  
  // Adventures 
  toggleNewAdventureForm, 
  createAdventure, 
  deleteAdventure, 
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
  deleteChronicleEntry,
  
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

// Export the core initialization function so main.js can use it to boot the app 
export { setCampaignsData };
