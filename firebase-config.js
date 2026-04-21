import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    deleteDoc,
    onSnapshot,
    collection, 
    getDocs, 
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// FIREBASE CONFIGURATION (Adventure Journal)
const firebaseConfig = {
  apiKey: "AIzaSyB1M2Wmx228hcqM4jE2bwZa5ETcpijp00Y",
  authDomain: "adventure-journal-b065a.firebaseapp.com",
  projectId: "adventure-journal-b065a",
  storageBucket: "adventure-journal-b065a.firebasestorage.app",
  messagingSenderId: "605387184981",
  appId: "1:605387184981:web:4ab5efffb7ace9873e6ddc",
  measurementId: "G-9NEFTVMCGK"
};

// INITIALIZE APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'campaign-log-manager';

// EXPORT SERVICES AND FUNCTIONS
export { 
    app, 
    auth, 
    db, 
    appId,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    
    // FIRESTORE FUNCTIONS
    doc, 
    setDoc, 
    getDoc,  
    deleteDoc,  
    onSnapshot, 
    collection, 
    getDocs, 
    query,
    where
};
