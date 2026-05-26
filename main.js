import { auth, db, appId, onAuthStateChanged } from './firebase-config.js';
import { subscribeToCampaigns, subscribeToPlayerCampaigns, subscribeToPersonalData, logoutUser, deleteUserAccount } from './firebase-manager.js';
import { initAuthUI } from './ui-auth.js';
import { setCampaignsData } from './data.js';
import { updateDerivedState, reRender } from './state.js'; 

// Ensure the global state is available
if (!window.appData) {
    window.appData = {
        campaigns: [], // We will store ALL combined campaigns here
        currentView: 'home',
        activeCampaignId: null,
        activeAdventureId: null,
        activeSessionId: null,
        activePcId: null,
        personalCodex: [], // Tracks the player's private codex entries
        tempPCs: [],
        tempAdvRoster: [],
        currentMarkdown: '',
        codexCache: [],
        activeSmartTextarea: null,
        currentUserUid: null // Critical for knowing our exact identity across the app
    };
}

// Fullscreen Image Functions
const openFullscreenImage = (src) => {
    const viewer = document.getElementById('fullscreen-image-viewer');
    const img = document.getElementById('fullscreen-image-display');
    if (!viewer || !img) return;
    
    img.src = src;
    viewer.classList.remove('hidden');
    // Trigger reflow for transition
    void viewer.offsetWidth;
    viewer.classList.remove('opacity-0');
    img.classList.remove('scale-95');
    img.classList.add('scale-100');
    
    // Push history state to intercept phone back button
    if (typeof history !== 'undefined') {
        history.pushState({ fullscreenImage: true }, "", "#image");
    }
};

const closeFullscreenImage = () => {
    const viewer = document.getElementById('fullscreen-image-viewer');
    const img = document.getElementById('fullscreen-image-display');
    if (!viewer || viewer.classList.contains('hidden')) return;
    
    viewer.classList.add('opacity-0');
    if (img) {
        img.classList.remove('scale-100');
        img.classList.add('scale-95');
    }
    
    setTimeout(() => {
        viewer.classList.add('hidden');
        if (img) img.src = '';
    }, 300);
};

// Bind entry router globally
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    
    window.appActions.openFullscreenImage = openFullscreenImage;
    window.appActions.closeFullscreenImage = closeFullscreenImage;
    
    window.appActions.enterApp = () => {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        
        if (authScreen) authScreen.classList.add('hidden');
        if (appScreen) appScreen.classList.remove('hidden');

        // Check local storage for auto-routing
        const lastCampId = localStorage.getItem('lastAccessedCampaignId');
        if (lastCampId) {
            window.appActions.openCampaign(lastCampId);
        } else {
            window.appActions.setView('home');
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Login/Register forms
    initAuthUI();

    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const logoutBtn = document.getElementById('logout-btn');
    const authStatusText = document.getElementById('auth-status-text');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('account-settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutUser();
        });
    }

    // Handle Settings Modal UI
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    // Handle Delete Account Execution
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            // Visual feedback while communicating with Firebase
            const originalText = deleteAccountBtn.innerHTML;
            deleteAccountBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Deleting...`;
            deleteAccountBtn.disabled = true;

            const success = await deleteUserAccount();
            
            if (success) {
                // Hide modal on success (auth state listener will automatically bounce them to login screen)
                settingsModal.classList.add('hidden');
            } else {
                // Reset button if it failed (e.g. requires recent login)
                deleteAccountBtn.innerHTML = originalText;
                deleteAccountBtn.disabled = false;
            }
        });
    }

    // Global Image Click Listener for Full Screen Viewer
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            // Ignore Leaflet map tiles
            if (e.target.classList.contains('leaflet-tile')) return;
            // Ignore thumbnails inside clickable codex cards to prevent double-triggering
            if (e.target.closest('.codex-card')) return;
            // Ignore the fullscreen viewer's own image to avoid closing/reopening loops
            if (e.target.closest('#fullscreen-image-viewer')) return;
            // Ignore tiny UI icons or avatars
            if (e.target.clientWidth < 40 && e.target.clientHeight < 40) return;

            const src = e.target.src;
            if (src && window.appActions && window.appActions.openFullscreenImage) {
                window.appActions.openFullscreenImage(src);
            }
        }
    });

    // Temporary storage for our two separate data streams
    let hostedCampaigns = [];
    let playedCampaigns = [];

    // Helper to merge both streams and update the UI safely
    const mergeAndSetCampaigns = () => {
        const mergedMap = new Map();
        
        // Add campaigns we play in
        playedCampaigns.forEach(c => {
            // SECURITY SCRUB: Remove any leaked flags from the database
            const cleanData = { ...c };
            delete cleanData._isDM;
            delete cleanData._isPlayer;
            
            mergedMap.set(cleanData.id, { ...cleanData, _isPlayer: true });
        });
        
        // Add/Overwrite with campaigns we run (DM status takes precedence)
        hostedCampaigns.forEach(c => {
            // SECURITY SCRUB: Remove any leaked flags from the database
            const cleanData = { ...c };
            delete cleanData._isDM;
            delete cleanData._isPlayer;
            
            // Retain the _isPlayer flag if we are somehow both
            const existing = mergedMap.get(cleanData.id);
            mergedMap.set(cleanData.id, { ...cleanData, _isDM: true, _isPlayer: existing ? true : false });
        });

        // Pass the unified, deduplicated, and securely flagged list to data.js
        setCampaignsData(Array.from(mergedMap.values()));
    };

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in. We NO LONGER hide the auth screen automatically here!
            if (authStatusText) authStatusText.textContent = "Identity Confirmed";

            window.appData.currentUserUid = user.uid;

            // Trigger the UI change in ui-auth.js to morph the login form into an "Enter" button
            if (window.appActions && window.appActions.showAuthenticatedReadyState) {
                window.appActions.showAuthenticatedReadyState(user);
            }

            // Show the loading spinner in the background app-container
            const container = document.getElementById('app-container');
            if (container) {
                 container.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-amber-500">
                        <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-red-900"></i>
                        <h2 class="text-xl font-serif font-bold tracking-widest uppercase text-amber-600">Retrieving Tomes...</h2>
                    </div>
                 `;
            }

            // 1. Subscribe to campaigns I DM
            subscribeToCampaigns(user, (campaigns) => {
                hostedCampaigns = campaigns;
                mergeAndSetCampaigns();
            });

            // 2. Subscribe to campaigns I Play In
            subscribeToPlayerCampaigns(user, (campaigns) => {
                playedCampaigns = campaigns;
                mergeAndSetCampaigns();
            });

            // 3. Fetch Personal Data (Private Codex)
            subscribeToPersonalData(user, (data) => {
                if (data && data.personalCodex) {
                    window.appData.personalCodex = data.personalCodex;
                } else {
                    window.appData.personalCodex = [];
                }
            });

        } else {
            // User is signed out.
            if (authScreen) authScreen.classList.remove('hidden');
            if (appScreen) appScreen.classList.add('hidden');
            if (authStatusText) authStatusText.textContent = "Identify Yourself";
            
            // Revert UI to standard login
            if (window.appActions && window.appActions.resetAuthUI) {
                window.appActions.resetAuthUI();
            }
            
            // Clear local state
            window.appData.campaigns = [];
            window.appData.activeCampaignId = null;
            window.appData.activeAdventureId = null;
            window.appData.activeSessionId = null;
            window.appData.activePcId = null;
            window.appData.personalCodex = [];
            window.appData.currentUserUid = null;
            window.appData.currentView = 'home';
            
            hostedCampaigns = [];
            playedCampaigns = [];
            
            // Unsubscribe listeners when logged out
            subscribeToCampaigns(null, () => {});
            subscribeToPlayerCampaigns(null, () => {});
            subscribeToPersonalData(null, () => {});
        }
    });
});

// --- HISTORY API INTERCEPTOR (Native Phone Back Button Support) ---
// ============================================================================

if (typeof window !== 'undefined' && typeof history !== 'undefined') {
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
        const imageViewer = document.getElementById('fullscreen-image-viewer');
        
        let modalClosed = false;
        
        // Check if Atlas is in Full Screen Mode
        if (window.appData && window.appData.isAtlasFullScreen) {
            window.appActions.toggleAtlasFullScreen();
            modalClosed = true;
        } else if (imageViewer && !imageViewer.classList.contains('hidden')) {
            window.appActions.closeFullscreenImage();
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
