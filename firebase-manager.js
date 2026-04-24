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
    where,
    getDocs
} from "./firebase-config.js";
import { deleteUser } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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

export async function deleteUserAccount() {
    const user = auth.currentUser;
    if (!user) {
        notify("You must be logged in to delete your account.", "error");
        return false;
    }

    if (!confirm("FINAL WARNING: Are you sure you want to permanently delete your account and all personal data? This cannot be undone.")) {
        return false;
    }

    try {
        const uid = user.uid;

        // 1. DATA CLEANUP: Remove user from all campaigns they have joined
        const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
        const q = query(campaignsRef, where("activePlayers", "array-contains", uid));
        const snapshot = await getDocs(q);

        const updatePromises = [];
        snapshot.forEach(docSnap => {
            const campData = docSnap.data();
            const campId = campData.id;
            
            const updatedPlayers = (campData.activePlayers || []).filter(id => id !== uid);
            const updatedNames = { ...campData.playerNames };
            delete updatedNames[uid];
            
            const docRef = doc(db, 'artifacts', appId, 'campaigns', campId);
            updatePromises.push(setDoc(docRef, { 
                ...campData,
                activePlayers: updatedPlayers, 
                playerNames: updatedNames
            }));

            // NEW: Must also scrub the user from the PlayerCharacters Subcollection!
            const cleanupPCs = async () => {
                const pcsRef = collection(db, 'artifacts', appId, 'campaigns', campId, 'playerCharacters');
                const pcsSnap = await getDocs(pcsRef);
                const batchPromises = [];
                pcsSnap.forEach((pcDoc) => {
                    const pcData = pcDoc.data();
                    if (pcData.playerId === uid) {
                        batchPromises.push(setDoc(pcDoc.ref, { ...pcData, playerId: '' }, { merge: true }));
                    }
                });
                await Promise.all(batchPromises);
            };
            updatePromises.push(cleanupPCs());
        });

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        // 2. Delete user profile document from Firestore
        const userDocRef = doc(db, 'artifacts', appId, 'users', uid);
        await deleteDoc(userDocRef);

        // 3. Delete the user from Firebase Authentication
        await deleteUser(user);

        notify("Your account and data have been permanently deleted.", "success");
        return true;
    } catch (error) {
        console.error("Error deleting account:", error);
        if (error.code === 'auth/requires-recent-login') {
            notify("Security check: You must log out and log back in before deleting your account.", "error");
        } else {
            notify("Failed to delete account: " + error.message, "error");
        }
        return false;
    }
}

// --- DATABASE (FIRESTORE) REAL-TIME LISTENERS & CACHE ---

// To prevent React/Vanilla JS state tearing, we build the campaign out of subcollections 
// in memory here, and fire the callbacks exactly as the app expects them.
const campaignCache = {};
const subListeners = {}; 

let dmCallback = null;
let playerCallback = null;
let dmCampaignIds = [];
let playerCampaignIds = [];
let currentCampaignsListener = null;
let currentPlayerCampaignsListener = null;

function getFullCampaign(id) {
    const c = campaignCache[id];
    if (!c || !c.base) return null;
    return {
        ...c.base,
        playerCharacters: c.pcs || [],
        adventures: c.adventures || [],
        codex: c.codex || [],
        sheetUpdates: c.sheetUpdates || []
    };
}

function fireCallbacks() {
    if (dmCallback) dmCallback(dmCampaignIds.map(getFullCampaign).filter(Boolean));
    if (playerCallback) playerCallback(playerCampaignIds.map(getFullCampaign).filter(Boolean));
}

function setupSubListeners(campId) {
    if (subListeners[campId]) return; 
    subListeners[campId] = [];

    const attach = (subName, cacheKey) => {
        const subRef = collection(db, 'artifacts', appId, 'campaigns', campId, subName);
        const unsub = onSnapshot(subRef, snap => {
            if (campaignCache[campId]) {
                campaignCache[campId][cacheKey] = snap.docs.map(d => d.data());
                fireCallbacks();
            }
        }, err => console.error(`Error syncing ${subName}:`, err));
        subListeners[campId].push(unsub);
    };

    attach('playerCharacters', 'pcs');
    attach('adventures', 'adventures');
    attach('codex', 'codex');
    attach('sheetUpdates', 'sheetUpdates');
}

function cleanupSubListeners(campId) {
    if (subListeners[campId]) {
        subListeners[campId].forEach(unsub => unsub());
        delete subListeners[campId];
    }
    delete campaignCache[campId];
}

// DM Listener: Campaigns I created
export function subscribeToCampaigns(user, callback) {
    dmCallback = callback;
    if (currentCampaignsListener) {
        currentCampaignsListener();
        currentCampaignsListener = null;
    }
    
    if (!user) {
        dmCampaignIds = [];
        fireCallbacks();
        return;
    }

    const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
    const q = query(campaignsRef, where("dmId", "==", user.uid));

    currentCampaignsListener = onSnapshot(q, (snapshot) => {
        const newIds = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            newIds.push(data.id);

            if (!campaignCache[data.id]) {
                campaignCache[data.id] = { base: data, pcs: [], adventures: [], codex: [], sheetUpdates: [] };
                setupSubListeners(data.id);
            } else {
                campaignCache[data.id].base = data;
            }
        });

        // Cleanup orphaned listeners
        dmCampaignIds.forEach(id => {
            if (!newIds.includes(id) && !playerCampaignIds.includes(id)) {
                cleanupSubListeners(id);
            }
        });

        dmCampaignIds = newIds;
        fireCallbacks();
    }, (error) => {
        console.error("Error fetching DM campaigns:", error);
        notify("Failed to load your GM campaigns.", "error");
    });
}

// Player Listener: Campaigns I joined
export function subscribeToPlayerCampaigns(user, callback) {
    playerCallback = callback;
    if (currentPlayerCampaignsListener) {
        currentPlayerCampaignsListener();
        currentPlayerCampaignsListener = null;
    }
    
    if (!user) {
        playerCampaignIds = [];
        fireCallbacks();
        return;
    }

    const campaignsRef = collection(db, 'artifacts', appId, 'campaigns');
    const q = query(campaignsRef, where("activePlayers", "array-contains", user.uid));

    currentPlayerCampaignsListener = onSnapshot(q, (snapshot) => {
        const newIds = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            newIds.push(data.id);

            if (!campaignCache[data.id]) {
                campaignCache[data.id] = { base: data, pcs: [], adventures: [], codex: [], sheetUpdates: [] };
                setupSubListeners(data.id);
            } else {
                campaignCache[data.id].base = data;
            }
        });

        // Cleanup orphaned listeners
        playerCampaignIds.forEach(id => {
            if (!newIds.includes(id) && !dmCampaignIds.includes(id)) {
                cleanupSubListeners(id);
            }
        });

        playerCampaignIds = newIds;
        fireCallbacks();
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
        // SECURITY SCRUB
        const cleanData = { ...campaignData };
        delete cleanData._isDM;
        delete cleanData._isPlayer;

        if (!cleanData.dmId) cleanData.dmId = user.uid;
        if (!cleanData.activePlayers) cleanData.activePlayers = [];
        if (!cleanData.playerNames) cleanData.playerNames = {};

        // EXTRACT ARRAYS FOR SUBCOLLECTIONS
        const pcs = cleanData.playerCharacters || [];
        const advs = cleanData.adventures || [];
        const codex = cleanData.codex || [];
        const sheetUpdates = cleanData.sheetUpdates || [];

        delete cleanData.playerCharacters;
        delete cleanData.adventures;
        delete cleanData.codex;
        delete cleanData.sheetUpdates;
        
        // 1. Save Base Campaign Document
        const docRef = doc(db, 'artifacts', appId, 'campaigns', cleanData.id);
        await setDoc(docRef, cleanData);

        // 2. Helper to cleanly sync an array to a Firestore Subcollection
        const syncSubcollection = async (subName, newArray) => {
            const subRef = collection(db, 'artifacts', appId, 'campaigns', cleanData.id, subName);
            
            // Diff checking: Fetch current items in the DB to see if any were deleted
            const currentSnap = await getDocs(subRef);
            const currentIds = currentSnap.docs.map(d => d.id);
            const newIds = newArray.map(item => item.id);

            // Delete orphaned documents (Handles deleting a PC, Session, etc.)
            for (const oldId of currentIds) {
                if (!newIds.includes(oldId)) {
                    await deleteDoc(doc(db, 'artifacts', appId, 'campaigns', cleanData.id, subName, oldId));
                }
            }

            // Upsert remaining documents individually
            for (const item of newArray) {
                if (!item.id) continue;
                await setDoc(doc(db, 'artifacts', appId, 'campaigns', cleanData.id, subName, item.id), item);
            }
        };

        // 3. Fire Subcollection Syncs (Race condition safe!)
        await syncSubcollection('playerCharacters', pcs);
        await syncSubcollection('adventures', advs);
        await syncSubcollection('codex', codex);
        await syncSubcollection('sheetUpdates', sheetUpdates);

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
        // Deep cleanup: Delete all documents in all subcollections first
        const deleteSubcollection = async (subName) => {
            const subRef = collection(db, 'artifacts', appId, 'campaigns', campaignId, subName);
            const snap = await getDocs(subRef);
            const batchPromises = [];
            snap.forEach(d => batchPromises.push(deleteDoc(d.ref)));
            await Promise.all(batchPromises);
        };

        await deleteSubcollection('playerCharacters');
        await deleteSubcollection('adventures');
        await deleteSubcollection('codex');
        await deleteSubcollection('sheetUpdates');

        // Finally, delete the base Campaign Document
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
