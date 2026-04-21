import { auth, onAuthStateChanged } from './firebase-config.js';
import { subscribeToCampaigns, logoutUser } from './firebase-manager.js';
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
        tempPCs: [],
        currentMarkdown: ''
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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');
            if (authStatusText) authStatusText.textContent = "Dungeon Master Access";

            // Show the loading spinner while fetching campaigns
            const container = document.getElementById('app-container');
            if (container) {
                 container.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-amber-500">
                        <i class="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-red-900"></i>
                        <h2 class="text-xl font-serif font-bold tracking-widest uppercase text-amber-600">Retrieving Tomes...</h2>
                    </div>
                 `;
            }

            // Subscribe to the user's campaigns in Firestore
            subscribeToCampaigns(user, (campaigns) => {
                // When campaigns are loaded or updated, push them to data.js which handles re-rendering
                setCampaignsData(campaigns);
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
            window.appData.currentView = 'home';
            
            // Unsubscribe happens automatically in firebase-manager.js when user is null
            subscribeToCampaigns(null, () => {});
        }
    });
});
