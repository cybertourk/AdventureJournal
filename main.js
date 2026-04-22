import { auth, db, appId, doc, getDoc, onAuthStateChanged } from './firebase-config.js';
import { subscribeToCampaigns, subscribeToPlayerCampaigns, subscribeToPersonalData, logoutUser } from './firebase-manager.js';
import { initAuthUI } from './ui-auth.js';
import { renderApp } from './ui-core.js';
import { setCampaignsData } from './data.js';

// Ensure the global state is available
if (!window.appData) {
    window.appData = {
        campaigns: [],
        currentView: 'home',
        activeCampaignId: null,
        activeAdventureId: null,
        activeSessionId: null,
        activePcId: null,
        userRole: null, // Tracks if the logged-in user is 'dm' or 'player'
        personalCodex: [], // Tracks the player's private codex entries
        tempPCs: [],
        tempAdvRoster: [],
        currentMarkdown: '',
        codexCache: [],
        activeSmartTextarea: null
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

    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in.
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');

            // Show the loading spinner while fetching the profile and campaigns
            const container = document.getElementById('app-container');
            if (container) {
                 container.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-amber-500">
                        <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-red-900"></i>
                        <h2 class="text-xl font-serif font-bold tracking-widest uppercase text-amber-600">Retrieving Tomes...</h2>
                    </div>
                 `;
            }

            try {
                // Determine the user's role from their profile document
                const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                let role = 'player'; // Default to player for safety
                if (userDoc.exists() && userDoc.data().role) {
                    role = userDoc.data().role;
                }

                window.appData.userRole = role;

                if (role === 'dm') {
                    if (authStatusText) authStatusText.textContent = "Dungeon Master Access";
                    window.appData.currentView = 'home';
                    
                    // Subscribe to the DM's campaigns in Firestore
                    subscribeToCampaigns(user, (campaigns) => {
                        setCampaignsData(campaigns);
                    });
                } else {
                    if (authStatusText) authStatusText.textContent = "Player Access";
                    window.appData.currentView = 'player-home';
                    
                    // Fetch Campaigns the Player has joined
                    subscribeToPlayerCampaigns(user, (campaigns) => {
                        setCampaignsData(campaigns);
                    });

                    // Fetch the Player's Personal Data (like their private Codex)
                    subscribeToPersonalData(user, (data) => {
                        if (data && data.personalCodex) {
                            window.appData.personalCodex = data.personalCodex;
                        } else {
                            window.appData.personalCodex = [];
                        }
                    });
                }

            } catch (error) {
                console.error("Error fetching user profile:", error);
                // Fallback safely to player on error
                window.appData.userRole = 'player';
                if (authStatusText) authStatusText.textContent = "Player Access";
                window.appData.currentView = 'player-home';
                setCampaignsData([]);
            }

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
            window.appData.userRole = null;
            window.appData.personalCodex = [];
            window.appData.currentView = 'home';
            
            // Unsubscribe listeners when logged out
            subscribeToCampaigns(null, () => {});
            subscribeToPlayerCampaigns(null, () => {});
            subscribeToPersonalData(null, () => {});
        }
    });
});
