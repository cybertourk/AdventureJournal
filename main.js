import { auth, db, appId, onAuthStateChanged } from './firebase-config.js';
import { subscribeToCampaigns, subscribeToPlayerCampaigns, subscribeToPersonalData, logoutUser } from './firebase-manager.js';
import { initAuthUI } from './ui-auth.js';
import { setCampaignsData } from './data.js';

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

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Login/Register forms
    initAuthUI();

    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const logoutBtn = document.getElementById('logout-btn');
    const authStatusText = document.getElementById('auth-status-text');

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutUser();
        });
    }

    // Temporary storage for our two separate data streams
    let hostedCampaigns = [];
    let playedCampaigns = [];

    // Helper to merge both streams and update the UI
    const mergeAndSetCampaigns = () => {
        const mergedMap = new Map();
        
        // Add campaigns we play in
        playedCampaigns.forEach(c => {
            mergedMap.set(c.id, { ...c, _isPlayer: true });
        });
        
        // Add/Overwrite with campaigns we run (DM status takes precedence)
        hostedCampaigns.forEach(c => {
            mergedMap.set(c.id, { ...c, _isDM: true });
        });

        // Pass the unified, deduplicated list to data.js to trigger a render
        setCampaignsData(Array.from(mergedMap.values()));
    };

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');
            if (authStatusText) authStatusText.textContent = "Welcome to the Archives";

            window.appData.currentUserUid = user.uid;
            window.appData.currentView = 'home';

            // Show the loading spinner while fetching
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
