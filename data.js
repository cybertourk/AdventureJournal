/* STREAMING_CHUNK: Importing core state modules and actions... */
import { setCampaignsData, updateDerivedState, reRender } from './state.js'; 

// Import UI Core Navigation & Layout Controls
import { navigateBack, toggleActionMenu } from './ui-core.js';

// Import Campaign & Hero Management 
import { 
    setView, 
    openCampaign, 
    openAdventure, 
    toggleNewCampaignForm, 
    createCampaign, 
    deleteCampaignAction, 
    copyCampaignId, 
    toggleJoinCampaignForm, 
    joinCampaignAction, 
    toggleNewAdventureForm, 
    createAdventure, 
    deleteAdventure, 
    openEditAdventureModal, 
    saveEditAdventure, 
    refreshPartyBoons, 
    openAdvRoster, 
    toggleAdvRosterPc, 
    saveAdvRoster, 
    openActivityLog, 
    clearActivityLog, 
    openPCEdit, 
    calculateBirthdaysLive, 
    savePCEdit, 
    deletePC, 
    kickPlayer, 
    openChecklistMenu, 
    closeChecklistMenu, 
    addSheetUpdate, 
    toggleSheetUpdateResolved, 
    toggleSheetUpdateVis, 
    deleteSheetUpdate, 
    openDndBeyondImportModal, 
    fetchAndAnalyzeDndBeyond, 
    executeDndBeyondImport, 
    quickSyncDDB 
} from './actions-campaign.js'; 

// Import Session, Narrative, & Visibility Controls 
import { 
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
    submitSessionClue, 
    deleteSessionClue, 
    openVisibilityMenu, 
    toggleVisSpecificList, 
    saveVisibility, 
    _saveCampaignHelper, 
    openUniversalEditor, 
    closeUniversalEditor, 
    saveUniversalEditor, 
    formatText, 
    addChronicleEntry, 
    editChronicleEntry, 
    cancelChronicleEdit, 
    deleteChronicleEntry, 
    syncSessionDates 
} from './actions-session.js'; 

// Import Codex, Smart-Text, & Journal Functionality 
import { 
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
    updateLocEditFields,
    preventLinkFromSelection,
    insertImagePlaceholder
} from './actions-codex.js'; 

// Import Calendar Functionality
import { 
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
    importFoundryCalendarNotes 
} from './actions-calendar.js';

// Import Rules Glossary Content
import { 
    openRulesGlossary, 
    viewRule, 
    openRuleModal, 
    saveRule, 
    deleteRule, 
    updateTravelPresets, 
    calculateTravel, 
    calculateEncumbrance, 
    calculateJump 
} from './actions-rules.js';

// Import Atlas & Map Functionality
import { 
    initAtlas, 
    setAtlasMode, 
    updateAtlasGridAndScale, 
    updateAtlasDistanceCalc, 
    atlasUndoLastPoint, 
    atlasFinishDrawing, 
    confirmAtlasPin, 
    confirmAtlasRoute, 
    deleteAtlasPin, 
    deleteAtlasRoute, 
    toggleAtlasSettings, 
    saveAtlasSettings, 
    searchAtlasCodex, 
    selectAtlasCodexEntry, 
    viewOnMap, 
    toggleAtlasLayers, 
    toggleAtlasRouteVis, 
    refreshAtlasEntities, 
    toggleAtlasFullScreen, 
    calculateAtlasRouteLive, 
    addAtlasRouteStop, 
    atlasMarkLastPointAsStop 
} from './actions-atlas.js';

// Import Relationship Web Functionality
import { 
    createNewWeb, 
    deleteCurrentWeb, 
    switchWeb, 
    toggleWebGroup, 
    openWebEditModal, 
    openWebMoveModal, 
    saveWebMove, 
    saveWebEdit, 
    addWebNode, 
    addWebConnection, 
    removeWebNode, 
    removeWebConnection, 
    toggleWebVisibility, 
    cleanupWebOrphans, 
    syncWebWithCodex, 
    searchWebCodex, 
    selectWebCodexEntry, 
    setWebZoom, 
    renderMermaidWeb 
} from './actions-webs.js';

// Import Downtime Menu Hub
import { openDowntimeMenu } from './actions-downtime.js';

// --- MODULAR DOWNTIME IMPORTS ---
import { openBuyMagicItemModal, updateBuyMagicItemMath, executeBuyMagicItem } from './dt-buy-magic-item.js';
import { 
    openCarousingModal, 
    updateCarousingMath, 
    executeCarousing, 
    attemptDisguiseCheck, 
    openCarouseContacts, 
    closeCarouseContacts, 
    prepDefineContact, 
    renderCarouseContactsList, 
    saveNewCarouseContact, 
    markCarouseContactUsed, 
    reactivateCarouseContact, 
    deleteCarouseContact, 
    deleteBankedContact 
} from './dt-carousing.js';
import { 
    openCraftingModal, 
    updateCraftingMath, 
    executeCrafting, 
    abandonCraftingProject, 
    openRecipeBrowser, 
    closeRecipeBrowser, 
    filterRecipes, 
    selectRecipe 
} from './dt-crafting.js';
import { openCrimeModal, updateCrimeMath, executeCrime, clearCrimeRecord } from './dt-crime.js';
import { openGamblingModal, updateGamblingMath, executeGambling } from './dt-gambling.js';
import { openPitFightingModal, updatePitFightingMath, executePitFighting, searchPitLocation, selectPitLocation } from './dt-pit-fighting.js';
import { openRelaxationModal, updateRelaxationMath, executeRelaxation } from './dt-relaxation.js';
import { openReligiousServiceModal, updateReligiousServiceMath, executeReligiousService } from './dt-religious-service.js';
import { openResearchModal, updateResearchMath, executeResearch } from './dt-research.js';
import { 
    openScribingModal, 
    updateScribingMath, 
    executeScribing, 
    abandonScribingProject, 
    openSpellBrowser, 
    closeSpellBrowser, 
    filterSpells, 
    selectSpell 
} from './dt-scribing.js';
import { 
    openSellingModal, 
    updateSellingMath, 
    seekBuyer, 
    finalizeSale, 
    openSellItemBrowser, 
    closeSellItemBrowser, 
    filterSellItems, 
    selectSellItem 
} from './dt-selling.js';
import { openTrainingModal, updateTrainingMath, executeTraining } from './dt-training.js';
import { openWorkModal, updateWorkMath, executeWork } from './dt-work.js';
import { openAssignDowntimeModal, executeAssignDowntime } from './dt-assign.js';

// --- SHOPS & BAZAAR IMPORTS ---
import { 
    openBazaar, 
    openShopEditModal, 
    saveShop, 
    deleteShop, 
    viewStorefront, 
    viewBackroom, 
    buyItem, 
    openManualItemModal, 
    searchBazaarDatabase, 
    addBazaarItemToShop, 
    submitCustomItem, 
    updateItemPrice, 
    deleteShopItem, 
    rollShopInventory, 
    executeRollWares, 
    openProposeSaleModal, 
    submitSaleProposal, 
    cancelSaleProposal, 
    approveSaleProposal, 
    toggleBazaarLocation, 
    toggleAllShops, 
    toggleAllTravelingShops 
} from './actions-shops.js';

// --- NPC GENERATOR IMPORTS ---
import { openNpcGeneratorUI, updateNpcSubraceDropdown } from './ui-npc.js';
import { executeNpcGeneration } from './actions-npc.js';

// --- CUSTOM SMART ROLL TABLE IMPORTS ---
import {
    saveRollTable,
    deleteRollTable,
    importFoundryTable,
    rollOnTable,
    resolveTableResult
} from './actions-tables.js';

// --- ROLL TABLE UI ACTIONS IMPORTS ---
import {
    filterRollTables,
    openTableImporter,
    closeTableImporter,
    executeFoundryImport,
    viewTableDetails,
    closeTableDetails,
    simulateTableRoll,
    addNewTableResult,
    deleteTableResult,
    updateTableResultWeight,
    toggleTableFolder,
    handleFoundryFileSelect,
    openTableSettingsModal,
    saveTableSettings
} from './ui-tables.js';

/* STREAMING_CHUNK: Importing our new, highly detailed Database view handlers... */
import {
    getDatabasesHTML,
    searchDatabase,
    filterDatabaseCategory,
    filterDatabaseRarity,
    openDatabaseItemDetails,
    openItemForgeModal,
    updateForgeInputStats,
    saveForgedItem,
    deleteForgedItem,
    openItemJsonImporter,
    handleItemFileSelect,
    executeItemJsonImport,
    renderDatabaseResults
} from './ui-databases.js';

// --- APP ACTIONS HUB --- 
if (typeof window !== 'undefined') {
    window.appActions = { 
      reRender, 
      
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
      calculateBirthdaysLive,
      savePCEdit, 
      deletePC, 
      kickPlayer, 
      openChecklistMenu, 
      closeChecklistMenu, 
      addSheetUpdate, 
      toggleSheetUpdateResolved, 
      toggleSheetUpdateVis, 
      deleteSheetUpdate, 
      
      // D&D Beyond Import
      openDndBeyondImportModal,
      fetchAndAnalyzeDndBeyond,
      executeDndBeyondImport,
      quickSyncDDB,

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
      submitSessionClue, 
      deleteSessionClue,
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
      updateLocEditFields,
      preventLinkFromSelection,
      insertImagePlaceholder,

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
      calculateJump,
      
      // Atlas / Interactive Maps
      initAtlas,
      setAtlasMode,
      updateAtlasGridAndScale,
      updateAtlasDistanceCalc,
      atlasUndoLastPoint,
      atlasFinishDrawing,
      confirmAtlasPin,
      confirmAtlasRoute,
      deleteAtlasPin,
      deleteAtlasRoute,
      toggleAtlasSettings,
      saveAtlasSettings,
      searchAtlasCodex,
      selectAtlasCodexEntry,
      viewOnMap,
      toggleAtlasLayers,
      toggleAtlasRouteVis,
      refreshAtlasEntities,
      toggleAtlasFullScreen,
      calculateAtlasRouteLive,
      addAtlasRouteStop,
      atlasMarkLastPointAsStop,

      // Relationship Webs
      createNewWeb,
      deleteCurrentWeb,
      switchWeb,
      toggleWebGroup,
      openWebEditModal,
      openWebMoveModal,
      saveWebMove,
      saveWebEdit,
      addWebNode,
      addWebConnection,
      removeWebNode,
      removeWebConnection,
      toggleWebVisibility,
      cleanupWebOrphans,
      syncWebWithCodex,
      searchWebCodex,
      selectWebCodexEntry,
      setWebZoom,
      renderMermaidWeb,

      // Modular Downtime Activities
      openDowntimeMenu,
      
      openBuyMagicItemModal,
      updateBuyMagicItemMath,
      executeBuyMagicItem,
      
      openCarousingModal,
      updateCarousingMath,
      executeCarousing,
      attemptDisguiseCheck,
      openCarouseContacts,
      closeCarouseContacts,
      prepDefineContact,
      renderCarouseContactsList,
      saveNewCarouseContact,
      markCarouseContactUsed,
      reactivateCarouseContact,
      deleteCarouseContact,
      deleteBankedContact,
      
      openCraftingModal,
      updateCraftingMath,
      executeCrafting,
      abandonCraftingProject,
      openRecipeBrowser,
      closeRecipeBrowser,
      filterRecipes,
      selectRecipe,
      
      openCrimeModal,
      updateCrimeMath,
      executeCrime,
      clearCrimeRecord,
      
      openGamblingModal,
      updateGamblingMath,
      executeGambling,
      
      openPitFightingModal,
      updatePitFightingMath,
      executePitFighting,
      searchPitLocation,
      selectPitLocation,

      openRelaxationModal,
      updateRelaxationMath,
      executeRelaxation,

      openReligiousServiceModal,
      updateReligiousServiceMath,
      executeReligiousService,

      openResearchModal,
      updateResearchMath,
      executeResearch,

      openScribingModal,
      updateScribingMath,
      executeScribing,
      abandonScribingProject,
      openSpellBrowser,
      closeSpellBrowser,
      filterSpells,
      selectSpell,

      openSellingModal,
      updateSellingMath,
      seekBuyer,
      finalizeSale,
      openSellItemBrowser,
      closeSellItemBrowser,
      filterSellItems,
      selectSellItem,

      openTrainingModal,
      updateTrainingMath,
      executeTraining,

      openWorkModal,
      updateWorkMath,
      executeWork,

      openAssignDowntimeModal,
      executeAssignDowntime,

      // Shops & Bazaar
      openBazaar,
      openShopEditModal,
      saveShop,
      deleteShop,
      viewStorefront,
      viewBackroom,
      buyItem,
      openManualItemModal,
      searchBazaarDatabase,
      addBazaarItemToShop,
      submitCustomItem,
      updateItemPrice,
      deleteShopItem,
      rollShopInventory,
      executeRollWares,
      openProposeSaleModal,
      submitSaleProposal,
      cancelSaleProposal,
      approveSaleProposal,
      toggleBazaarLocation,
      toggleAllShops,
      toggleAllTravelingShops,

      // NPC Generator
      openNpcGeneratorUI,
      updateNpcSubraceDropdown,
      executeNpcGeneration,

      // Custom Smart Roll Tables
      saveRollTable,
      deleteRollTable,
      importFoundryTable,
      rollOnTable,
      resolveTableResult,

      // Roll Table UI Interactivity
      openTableImporter,
      closeTableImporter,
      executeFoundryImport,
      viewTableDetails,
      closeTableDetails,
      simulateTableRoll,
      addNewTableResult,
      deleteTableResult,
      updateTableResultWeight,
      
      toggleTableFolder,
      handleFoundryFileSelect,
      openTableSettingsModal,
      saveTableSettings,

      /* STREAMING_CHUNK: Binding our new visual Database actions... */
      getDatabasesHTML,
      searchDatabase,
      filterDatabaseCategory,
      filterDatabaseRarity,
      openDatabaseItemDetails,
      openItemForgeModal,
      updateForgeInputStats,
      saveForgedItem,
      deleteForgedItem,
      openItemJsonImporter,
      handleItemFileSelect,
      executeItemJsonImport,
      renderDatabaseResults
    };

    // Bind the table search filter directly to window as expected by the inline HTML oninput handler
    window.filterRollTables = filterRollTables;
}

// --- HISTORY API INTERCEPTOR (Native Phone Back Button Support) ---
// ============================================================================

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
    // Set the initial anchor state so the browser knows where "Home" is
    history.replaceState({
        currentView: 'home',
        activeCampaignId: null,
        activeAdventureId: null,
        activeSessionId: null
    }, "", "#home");

    // Intercept our internal navigation router to push states automatically
    const originalSetView = window.appActions.setView;
    window.appActions.setView = function(viewName, skipHistory = false) {
        // If we are leaving the Atlas, automatically compress it out of Full Screen mode
        if (viewName !== 'atlas' && window.appData?.isAtlasFullScreen) {
            window.appData.isAtlasFullScreen = false;
        }

        // Execute the visual change first
        originalSetView(viewName);
        
        // Map & Mermaid Init Hooks - Mount right after the DOM renders
        if (viewName === 'atlas') {
            setTimeout(() => window.appActions.initAtlas(), 50);
        }
        if (viewName === 'webs') {
            setTimeout(() => window.appActions.renderMermaidWeb(), 50);
        }
        
        // Push the resulting state to the browser history
        if (!skipHistory) {
            const stateObj = {
                currentView: viewName,
                activeCampaignId: window.appData?.activeCampaignId || null,
                activeAdventureId: window.appData?.activeAdventureId || null,
                activeSessionId: window.appData?.activeSessionId || null
            };
            history.pushState(stateObj, "", '#' + viewName);
        }
    };

    // Override the visual App Header Back Arrow to use the browser history
    window.appActions.navigateBack = function() {
        history.back(); // This naturally triggers the popstate listener below!
    };

    // Listen for the Phone's physical Back Button or Swipe gestures
    window.addEventListener('popstate', (event) => {
        
        // Soft-Close open modals instead of navigating away!
        const popupContainer = document.getElementById('global-popup-container');
        const actionSheet = document.getElementById('action-sheet');
        const checklist = document.getElementById('checklist-modal');
        const univEditor = document.getElementById('universal-editor-modal');
        const settingsModal = document.getElementById('account-settings-modal');
        const visibilityModal = document.getElementById('visibility-modal');
        
        let modalClosed = false;
        
        // Check if Atlas is in Full Screen Mode
        if (window.appData && window.appData.isAtlasFullScreen) {
            window.appActions.toggleAtlasFullScreen();
            modalClosed = true;
        } else if (visibilityModal && !visibilityModal.classList.contains('hidden')) {
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
            // We intercepted the back button to close a modal or exit Full Screen.
            // We must push the current state back onto the stack so the underlying page doesn't change.
            const recoveredState = {
                currentView: window.appData?.currentView || 'home',
                activeCampaignId: window.appData?.activeCampaignId || null,
                activeAdventureId: window.appData?.activeAdventureId || null,
                activeSessionId: window.appData?.activeSessionId || null
            };
            history.pushState(recoveredState, "", '#' + (window.appData?.currentView || 'home'));
            return;
        }

        // Perform actual deep navigation back through the app history
        if (event.state && window.appData) {
            window.appData.currentView = event.state.currentView;
            window.appData.activeCampaignId = event.state.activeCampaignId;
            window.appData.activeAdventureId = event.state.activeAdventureId;
            window.appData.activeSessionId = event.state.activeSessionId;
            
            updateDerivedState();
            reRender();

            // Map & Mermaid Re-Init Hook for Back/Forward navigation
            if (event.state.currentView === 'atlas') {
                setTimeout(() => window.appActions.initAtlas(), 50);
            }
            if (event.state.currentView === 'webs') {
                setTimeout(() => window.appActions.renderMermaidWeb(), 50);
            }

        } else {
            // Fallback to Home if we lose state
            if (window.appData) window.appData.currentView = 'home';
            reRender();
        }
    });
}

export { setCampaignsData };
