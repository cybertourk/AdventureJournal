import { 
    auth, 
    db, 
    appId, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    doc, 
    setDoc, 
    getDoc, // Added getDoc for fetching campaigns by ID
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where 
} from "./firebase-config.js";

// --- NOTIFICATION HELPER ---
export function notify(msg, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.log(`Notify (${type}): ${msg}`);
        return;
    }
    
    const notif = document.createElement('div');
    // Thematic styling based on notification type
    const bgClass = type === 'error' ? 'bg-red-900' : (type === 'success' ? 'bg-emerald-700' : 'bg-stone-800');
    notif.className = `${bgClass} text-amber-50 px-4 py-3 rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-sm border border-stone-600 font-bold uppercase tracking-wider animate-in transition-opacity duration-500`;
    
    let icon = 'fa-circle-info';
    if (type === 'error') icon = 'fa-skull';
    if (type === 'success') icon = 'fa-check';
    
    notif.innerHTML = `<i class="fa-solid ${icon} mr-2"></i> ${msg}`;
    
    container.appendChild(notif);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

// --- AUTHENTICATION ---

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        notify("Successfully accessed the archives.", "success");
    } catch (error) {
        console.error("Login Error:", error);
        notify("Access Denied: " + error.message, "error");
        throw error;
    }
}

export async function registerUser(email, password, role = 'dm') {
    try {
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create a profile document for the user to track their role and personal data
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), {
            email: email,
            role: role,
            personalCodex: [], // Initialize personal codex for players
            created: new Date().toISOString()
        });
        
        notify("New account forged successfully.", "success");
    } catch (error) {
        console.error("Registration Error:", error);
        notify("Forging Failed: " + error.message, "error");
        throw error;
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        notify("You have left the archives.");
    } catch (error) {
        console.error("Logout Error:", error);
        notify("Error leaving: " + error.message, "error");
    }
}

// --- DATABASE (FIRESTORE) ACTIONS ---

// DM Listener
let currentCampaignsListener = null;

export function subscribeToCampaigns(user, callback) {
    // Clear any existing listeners
    if (currentCampaignsListener) {
        currentCampaignsListener();
        currentCampaignsListener = null;
    }
    
    if (!user) {
        callback([]);
        return;
    }

    // Query: Give me all campaigns where the dmId matches the currently logged-in user
    const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
    const q = query(campaignsRef, where("dmId", "==", user.uid));

    // Listen for real-time updates
    currentCampaignsListener = onSnapshot(q, (snapshot) => {
        const campaigns = [];
        snapshot.forEach(docSnap => {
            campaigns.push(docSnap.data());
        });
        // Pass the updated array back to our app state
        callback(campaigns);
    }, (error) => {
        console.error("Error fetching campaigns:", error);
        notify("Failed to load campaigns from the vault.", "error");
    });
}

// Player Campaigns Listener
let currentPlayerCampaignsListener = null;

export function subscribeToPlayerCampaigns(user, callback) {
    if (currentPlayerCampaignsListener) {
        currentPlayerCampaignsListener();
        currentPlayerCampaignsListener = null;
    }
    
    if (!user) {
        callback([]);
        return;
    }

    // Query: Give me all campaigns where the activePlayers array contains this user's UID
    const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
    const q = query(campaignsRef, where("activePlayers", "array-contains", user.uid));

    currentPlayerCampaignsListener = onSnapshot(q, (snapshot) => {
        const campaigns = [];
        snapshot.forEach(docSnap => {
            campaigns.push(docSnap.data());
        });
        callback(campaigns);
    }, (error) => {
        console.error("Error fetching player campaigns:", error);
        notify("Failed to load joined campaigns from the vault.", "error");
    });
}

// Player Personal Data Listener (For Personal Codex)
let currentPersonalDataListener = null;

export function subscribeToPersonalData(user, callback) {
    if (currentPersonalDataListener) {
        currentPersonalDataListener();
        currentPersonalDataListener = null;
    }

    if (!user) {
        callback(null);
        return;
    }

    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
    currentPersonalDataListener = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error fetching personal data:", error);
    });
}

export async function savePersonalData(dataUpdates) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(userDocRef, dataUpdates, { merge: true });
    } catch (error) {
        console.error("Error saving personal data:", error);
        notify("Failed to sync personal data.", "error");
    }
}

export async function joinCampaign(campaignId) {
    const user = auth.currentUser;
    if (!user) {
        notify("Must be authenticated to join a campaign.", "error");
        return false;
    }

    try {
        const docRef = doc(db, 'artifacts', appId, 'campaigns', campaignId);
        const campSnap = await getDoc(docRef);
        
        if (campSnap.exists()) {
            const data = campSnap.data();
            const activePlayers = data.activePlayers || [];
            
            // Prevent duplicate entries
            if (!activePlayers.includes(user.uid)) {
                activePlayers.push(user.uid);
                await setDoc(docRef, { activePlayers: activePlayers }, { merge: true });
            }
            
            notify(`Successfully joined ${data.name}!`, "success");
            return true;
        } else {
            notify("Campaign not found. Check the ID and try again.", "error");
            return false;
        }
    } catch (error) {
        console.error("Error joining campaign:", error);
        notify("Failed to join the campaign.", "error");
        return false;
    }
}

export async function saveCampaign(campaignData) {
    const user = auth.currentUser;
    if (!user) {
        notify("Must be authenticated to scribe a tome.", "error");
        return;
    }

    try {
        // Ensure the campaign is linked to the DM saving it (if it's new)
        if (!campaignData.dmId) {
            campaignData.dmId = user.uid;
        }
        
        // Ensure activePlayers array exists so players can join
        if (!campaignData.activePlayers) {
            campaignData.activePlayers = [];
        }
        
        const docRef = doc(db, 'artifacts', appId, 'campaigns', campaignData.id);
        
        // Because campaigns are relatively small JSON objects, we overwrite the entire document safely
        await setDoc(docRef, campaignData);
    } catch (error) {
        console.error("Error saving campaign:", error);
        notify("Failed to save campaign to the vault.", "error");
    }
}

export async function deleteCampaign(campaignId) {
    const user = auth.currentUser;
    if (!user) {
        notify("Must be authenticated to burn a tome.", "error");
        return;
    }
    
    if (!confirm("Are you sure you want to completely destroy this Campaign Tome? This action cannot be undone.")) {
        return false;
    }

    try {
        const docRef = doc(db, 'artifacts', appId, 'campaigns', campaignId);
        await deleteDoc(docRef);
        notify("Campaign tome reduced to ashes.", "success");
        return true;
    } catch (error) {
        console.error("Error deleting campaign:", error);
        notify("Failed to destroy the campaign.", "error");
        return false;
    }
}
