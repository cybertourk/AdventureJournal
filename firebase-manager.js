import { 
    auth, 
    db, 
    appId, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    doc, 
    setDoc, 
    getDoc, 
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
    const bgClass = type === 'error' ? 'bg-red-900' : (type === 'success' ? 'bg-emerald-700' : 'bg-stone-800');
    notif.className = `${bgClass} text-amber-50 px-4 py-3 rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-sm border border-stone-600 font-bold uppercase tracking-wider animate-in transition-opacity duration-500`;
    
    let icon = 'fa-circle-info';
    if (type === 'error') icon = 'fa-skull';
    if (type === 'success') icon = 'fa-check';
    
    notif.innerHTML = `<i class="fa-solid ${icon} mr-2"></i> ${msg}`;
    
    container.appendChild(notif);
    
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

export async function registerUser(email, password, displayName, role = 'user') {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Every user is a generic 'user' now, and we save their Display Name
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid), {
            email: email,
            displayName: displayName || "Nameless Hero",
            role: role,
            personalCodex: [], 
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

// DM Listener: Campaigns I created
let currentCampaignsListener = null;

export function subscribeToCampaigns(user, callback) {
    if (currentCampaignsListener) {
        currentCampaignsListener();
        currentCampaignsListener = null;
    }
    
    if (!user) {
        callback([]);
        return;
    }

    const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
    const q = query(campaignsRef, where("dmId", "==", user.uid));

    currentCampaignsListener = onSnapshot(q, (snapshot) => {
        const campaigns = [];
        snapshot.forEach(docSnap => {
            campaigns.push(docSnap.data());
        });
        callback(campaigns);
    }, (error) => {
        console.error("Error fetching DM campaigns:", error);
        notify("Failed to load your GM campaigns.", "error");
    });
}

// Player Listener: Campaigns I joined
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
        notify("Failed to load joined campaigns.", "error");
    });
}

// Personal Data Listener (For Private Codex)
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
        // Fetch the user's display name from their profile
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const displayName = userSnap.exists() && userSnap.data().displayName 
            ? userSnap.data().displayName 
            : "Unknown Player";

        const docRef = doc(db, 'artifacts', appId, 'campaigns', campaignId);
        const campSnap = await getDoc(docRef);
        
        if (campSnap.exists()) {
            const data = campSnap.data();
            const activePlayers = data.activePlayers || [];
            const playerNames = data.playerNames || {};
            
            // Prevent duplicate entries, but always ensure the name map is up to date
            if (!activePlayers.includes(user.uid)) {
                activePlayers.push(user.uid);
            }
            playerNames[user.uid] = displayName;
            
            await setDoc(docRef, { activePlayers: activePlayers, playerNames: playerNames }, { merge: true });
            
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
        // SECURITY SCRUB: Ensure we never save local UI flags to the database
        const cleanData = { ...campaignData };
        delete cleanData._isDM;
        delete cleanData._isPlayer;

        if (!cleanData.dmId) {
            cleanData.dmId = user.uid;
        }
        
        if (!cleanData.activePlayers) {
            cleanData.activePlayers = [];
        }
        
        // Ensure playerNames map exists
        if (!cleanData.playerNames) {
            cleanData.playerNames = {};
        }
        
        const docRef = doc(db, 'artifacts', appId, 'campaigns', cleanData.id);
        await setDoc(docRef, cleanData);
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
