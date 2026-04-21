import React, { useState, useMemo, useEffect } from 'react';
import { 
  Book, Plus, Feather, Users, Save, X, ChevronRight, 
  Skull, Shield, Flame, ArrowLeft, Scroll, Copy, Check, Map 
} from 'lucide-react';

// --- Firebase Initialization ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const isCanvasEnv = typeof __firebase_config !== 'undefined';

// If you move this to your own GitHub/Hosting, replace the placeholder below with your Firebase Project Config
const firebaseConfig = isCanvasEnv ? JSON.parse(__firebase_config) : {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'standalone-campaign-logger';

// --- Constants & Utilities ---
const BUDGET_BY_LEVEL = { 
  1: 0, 2: 100, 3: 200, 4: 400, 5: 700, 6: 3000, 7: 5400, 8: 8600, 
  9: 12000, 10: 17000, 11: 21000, 12: 30000, 13: 39000, 14: 57000, 
  15: 75000, 16: 103000, 17: 130000, 18: 214000, 19: 383000, 20: 552000, 21: 805000 
};

function calculateLootValue(text) {
  if (!text) return 0;
  const processedText = text.toLowerCase()
    .replace(/\bplatinum\b/g, 'pp').replace(/\bgold\b/g, 'gp')
    .replace(/\belectrum\b/g, 'ep').replace(/\bsilver\b/g, 'sp').replace(/\bcopper\b/g, 'cp');
  
  const currencyRegex = /(\d+(\.\d+)?)\s*(pp|gp|ep|sp|cp)/g;
  const conversion = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
  let totalGP = 0;
  for (const match of processedText.matchAll(currencyRegex)) {
    totalGP += parseFloat(match[1]) * (conversion[match[3]] || 0);
  }
  return totalGP;
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

const copyToClipboard = (text, setCopied) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  } else {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  }
};

// --- Markdown Generators ---
function generateSessionMarkdown(session, campaign) {
  let md = `### ${session.name}\n`;
  md += `*Logged on ${new Date(session.timestamp).toLocaleDateString()}*\n\n`;

  if (session.events?.trim()) md += `#### Events\n${session.events}\n\n`;
  if (session.npcs?.trim()) md += `#### NPCs\n${session.npcs}\n\n`;
  if (session.locations?.trim()) md += `#### Locations\n${session.locations}\n\n`;
  
  if (session.lootText?.trim()) {
    md += `#### Loot (${session.lootValue.toLocaleString()} gp)\n${session.lootText}\n\n`;
  }

  if (session.notes?.trim()) md += `#### General Notes\n${session.notes}\n\n`;

  const pcNotesKeys = Object.keys(session.pcNotes || {});
  if (pcNotesKeys.length > 0 && campaign?.playerCharacters?.length > 0) {
    md += `#### Player Character Notes\n`;
    campaign.playerCharacters.forEach(pc => {
      const note = session.pcNotes[pc.id];
      const hasNote = note && note.trim() !== '';
      const statuses = [];
      if (pc.inspiration) statuses.push('Inspiration');
      if (pc.automaticSuccess) statuses.push('Auto-Success');
      
      if (hasNote || statuses.length > 0) {
        let statusStr = statuses.length > 0 ? ` [${statuses.join(' | ')}]` : '';
        md += `- **${pc.name}${statusStr}:** ${hasNote ? note : '*No specific notes this session.*'}\n`;
      }
    });
    md += `\n`;
  }
  return md;
}

function generateAdventureMarkdown(adventure, campaign) {
  let md = `## Adventure Arc: ${adventure.name}\n`;
  md += `*Level ${adventure.startLevel} - ${adventure.endLevel} | ${adventure.numPlayers} Players | Arc Loot: ${adventure.totalLootGP.toLocaleString()} gp*\n\n`;
  const sortedSessions = [...adventure.sessions].sort((a, b) => a.timestamp - b.timestamp);
  if (sortedSessions.length === 0) {
    md += `*No sessions logged in this arc yet.*\n\n`;
  } else {
    sortedSessions.forEach(session => {
      md += generateSessionMarkdown(session, campaign);
      md += `---\n\n`;
    });
  }
  return md;
}

function generateCampaignMarkdown(campaign) {
  let md = `# Campaign: ${campaign.name}\n\n`;
  const totalLoot = campaign.adventures.reduce((sum, adv) => sum + adv.totalLootGP, 0);
  md += `*Total Campaign Loot: ${totalLoot.toLocaleString()} gp*\n\n---\n\n`;
  if (campaign.adventures.length === 0) {
    md += `*No adventures recorded yet.*\n`;
  } else {
    campaign.adventures.forEach(adv => {
      md += generateAdventureMarkdown(adv, campaign);
    });
  }
  return md;
}

// --- Main App Component ---
export default function App() {
  // --- Firebase & Auth State ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- App State ---
  const [campaigns, setCampaigns] = useState([]);
  const [currentView, setCurrentView] = useState('home'); // home, campaign, adventure, session-edit, pc-manager, journal
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeAdventureId, setActiveAdventureId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Derived state
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  const activeAdventure = activeCampaign?.adventures.find(a => a.id === activeAdventureId);
  const activeSession = activeAdventure?.sessions.find(s => s.id === activeSessionId);

  // --- Firebase Effects ---
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const campaignsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'campaigns');
    
    const unsubscribe = onSnapshot(campaignsRef, (snapshot) => {
      const camps = [];
      snapshot.forEach(d => camps.push({ id: d.id, ...d.data() }));
      setCampaigns(camps);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Firebase Handlers ---
  const handleCreateCampaign = async (name) => {
    if (!name.trim() || !user || !db) return;
    const newCamp = { id: generateId(), name, playerCharacters: [], adventures: [] };
    
    // Save to Firebase (Snapshot will handle UI update)
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', newCamp.id), newCamp);
    setActiveCampaignId(newCamp.id);
    setCurrentView('campaign');
  };

  const handleDeleteCampaign = async (id) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', id));
    if (activeCampaignId === id) {
      setCurrentView('home');
      setActiveCampaignId(null);
      setActiveAdventureId(null);
    }
  };

  const handleUpdateCampaignPCs = async (campId, newPCs) => {
    const camp = campaigns.find(c => c.id === campId);
    if (!camp || !user || !db) return;
    const updatedCamp = { ...camp, playerCharacters: newPCs };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', campId), updatedCamp);
    setCurrentView('campaign');
  };

  const handleCreateAdventure = async (name, startLevel, endLevel) => {
    if (!name.trim() || !activeCampaign || !user || !db) return;
    const newAdv = {
      id: generateId(), name, startLevel: parseInt(startLevel) || 1, endLevel: parseInt(endLevel) || 2,
      numPlayers: activeCampaign.playerCharacters.length || 4, totalLootGP: 0, sessions: []
    };
    const updatedCamp = { ...activeCampaign, adventures: [...activeCampaign.adventures, newAdv] };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', activeCampaign.id), updatedCamp);
    setActiveAdventureId(newAdv.id);
    setCurrentView('adventure');
  };

  const handleDeleteAdventure = async (id) => {
    if (!activeCampaign || !user || !db) return;
    const updatedCamp = { ...activeCampaign, adventures: activeCampaign.adventures.filter(a => a.id !== id) };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', activeCampaign.id), updatedCamp);
    if (activeAdventureId === id) {
      setCurrentView('campaign');
      setActiveAdventureId(null);
    }
  };

  const handleSaveSession = async (sessionData, updatedPCs, advSettings) => {
    if (!activeCampaign || !user || !db) return;

    const newAdventures = activeCampaign.adventures.map(adv => {
      if (adv.id !== activeAdventureId) return adv;
      const isNew = !adv.sessions.some(s => s.id === sessionData.id);
      const newSessions = isNew ? [...adv.sessions, sessionData] : adv.sessions.map(s => s.id === sessionData.id ? sessionData : s);
      return {
        ...adv, ...advSettings,
        totalLootGP: newSessions.reduce((acc, s) => acc + s.lootValue, 0),
        sessions: newSessions
      };
    });

    const updatedCamp = { ...activeCampaign, playerCharacters: updatedPCs, adventures: newAdventures };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', updatedCamp.id), updatedCamp);
    setCurrentView('adventure');
  };

  const handleDeleteSession = async (sessionId) => {
    if (!activeCampaign || !user || !db) return;
    const newAdventures = activeCampaign.adventures.map(adv => {
      if (adv.id !== activeAdventureId) return adv;
      const newSessions = adv.sessions.filter(s => s.id !== sessionId);
      return { ...adv, sessions: newSessions, totalLootGP: newSessions.reduce((acc, s) => acc + s.lootValue, 0) };
    });
    const updatedCamp = { ...activeCampaign, adventures: newAdventures };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'campaigns', activeCampaign.id), updatedCamp);
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-amber-500 font-sans">
        <Scroll className="w-16 h-16 animate-pulse mb-6 text-red-900" />
        <h2 className="text-2xl font-serif font-bold tracking-widest uppercase text-amber-600 drop-shadow-md">Unsealing the Vault...</h2>
        <p className="text-stone-500 mt-2 text-sm italic">Connecting to Database</p>
      </div>
    );
  }

  // --- Views ---
  const renderBreadcrumbs = () => (
    <div className="flex items-center text-xs sm:text-sm text-amber-200/60 mb-6 bg-stone-900 border border-stone-800 p-2 sm:p-3 rounded font-sans shadow-md overflow-x-auto whitespace-nowrap hide-scrollbar">
      <button onClick={() => setCurrentView('home')} className="hover:text-amber-400 flex items-center uppercase tracking-wider font-bold transition flex-shrink-0">
        <Book className="w-4 h-4 mr-2" /> Library
      </button>
      
      {activeCampaign && (
        <>
          <ChevronRight className="w-4 h-4 mx-2 text-stone-600 flex-shrink-0" />
          <button 
            onClick={() => setCurrentView('campaign')} 
            className={`hover:text-amber-400 uppercase tracking-wider font-bold truncate max-w-[120px] sm:max-w-xs transition flex-shrink-0 ${currentView === 'campaign' ? 'text-amber-500' : ''}`}
          >
            {activeCampaign.name}
          </button>
        </>
      )}

      {(activeAdventure || currentView === 'pc-manager') && activeCampaign && currentView !== 'campaign' && (
        <>
          <ChevronRight className="w-4 h-4 mx-2 text-stone-600 flex-shrink-0" />
          {currentView === 'pc-manager' ? (
            <span className="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">Manage Party</span>
          ) : (
            <button 
              onClick={() => setCurrentView('adventure')} 
              className={`hover:text-amber-400 uppercase tracking-wider font-bold truncate max-w-[120px] sm:max-w-xs transition flex-shrink-0 ${currentView === 'adventure' ? 'text-amber-500' : ''}`}
            >
              {activeAdventure?.name}
            </button>
          )}
        </>
      )}

      {(currentView === 'session-edit' || currentView === 'journal') && (
        <>
          <ChevronRight className="w-4 h-4 mx-2 text-stone-600 flex-shrink-0" />
          <span className="uppercase tracking-wider font-bold text-amber-500 flex-shrink-0">
            {currentView === 'session-edit' && (activeSessionId ? 'Amend Record' : 'New Record')}
            {currentView === 'journal' && (activeSessionId ? 'Session Scroll' : activeAdventureId ? 'Arc Scroll' : 'Campaign Tome')}
          </span>
        </>
      )}
    </div>
  );

  const HomeView = () => {
    const [newCampName, setNewCampName] = useState('');
    const [showNew, setShowNew] = useState(false);

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-3xl font-serif font-bold text-amber-500 mb-6 border-b-2 border-stone-800 pb-3 flex items-center">
          Your Campaigns
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {campaigns.map(camp => {
            const totalSessions = camp.adventures.reduce((sum, adv) => sum + adv.sessions.length, 0);
            return (
              <div key={camp.id} className="bg-[#f4ebd8] p-5 rounded-sm border border-[#d4c5a9] shadow-[2px_2px_8px_rgba(0,0,0,0.4)] flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-900"></div>
                <div className="pl-2">
                  <h3 className="font-serif font-bold text-xl text-stone-900 truncate" title={camp.name}>{camp.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-600 mt-2">
                    {camp.adventures.length} Adventures <span className="mx-1">•</span> {camp.playerCharacters.length} Heroes
                  </p>
                  <p className="text-sm text-stone-700 italic mt-1">{totalSessions} total sessions recorded</p>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#d4c5a9]/50 pl-2">
                  <button 
                    onClick={() => { setActiveCampaignId(camp.id); setCurrentView('campaign'); }}
                    className="text-red-900 hover:text-red-700 text-xs font-bold uppercase tracking-wider flex items-center transition"
                  >
                    Open Campaign <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="text-stone-400 hover:text-red-800 p-1 rounded transition"
                    title="Burn Tome (Delete Campaign)"
                  >
                    <Skull className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {!showNew ? (
            <button 
              onClick={() => setShowNew(true)}
              className="border-2 border-dashed border-stone-700 rounded-sm p-5 flex flex-col items-center justify-center text-stone-500 hover:text-amber-500 hover:border-amber-600 hover:bg-stone-800/50 transition min-h-[160px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-bold uppercase tracking-wider text-sm">Forge New Campaign</span>
            </button>
          ) : (
            <div className="border border-stone-600 bg-stone-800 rounded-sm p-5 flex flex-col justify-center min-h-[160px] shadow-lg">
              <input 
                autoFocus
                type="text" 
                placeholder="Campaign Title..." 
                className="w-full p-2 bg-[#f4ebd8] text-stone-900 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-red-900 mb-4 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500"
                value={newCampName}
                onChange={e => setNewCampName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCampaign(newCampName); if (e.key === 'Escape') setShowNew(false); }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider transition">Cancel</button>
                <button onClick={() => handleCreateCampaign(newCampName)} className="px-4 py-1.5 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 text-xs font-bold uppercase tracking-wider shadow-md transition">Create</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CampaignView = () => {
    const [newAdvName, setNewAdvName] = useState('');
    const [newAdvStart, setNewAdvStart] = useState(1);
    const [newAdvEnd, setNewAdvEnd] = useState(2);
    const [showNew, setShowNew] = useState(false);

    if (!activeCampaign) return null;
    const totalCampLoot = activeCampaign.adventures.reduce((sum, a) => sum + a.totalLootGP, 0);

    const renderLevelOptions = () => Object.keys(BUDGET_BY_LEVEL).map(lvl => (
      <option key={lvl} value={lvl}>Level {lvl === '21' ? '20+' : lvl}</option>
    ));

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b-2 border-stone-800 pb-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-500 leading-tight">{activeCampaign.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-stone-400 text-sm font-sans mt-2">
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">{activeCampaign.adventures.length} Adventures</span>
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">{activeCampaign.playerCharacters.length} Heroes</span>
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">{totalCampLoot.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Total Loot</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setCurrentView('pc-manager')}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-stone-800 text-amber-500 border border-stone-600 rounded-sm hover:bg-stone-700 transition font-bold uppercase tracking-wider text-xs shadow-md"
            >
              <Users className="w-4 h-4 mr-2" /> Manage Party
            </button>
            <button 
              onClick={() => { setActiveAdventureId(null); setActiveSessionId(null); setCurrentView('journal'); }}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-[#f4ebd8] text-stone-900 border border-[#d4c5a9] rounded-sm hover:bg-[#e8dec7] transition font-bold uppercase tracking-wider text-xs shadow-md"
              title="Read full campaign tome"
            >
              <Book className="w-4 h-4 mr-2 text-stone-700" /> Read Grand Tome
            </button>
          </div>
        </div>

        <h3 className="text-xl font-serif font-bold text-amber-400 mb-4 flex items-center">
          <Map className="w-5 h-5 mr-2" /> Adventures in this Campaign
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {activeCampaign.adventures.map(adv => (
            <div key={adv.id} className="bg-[#fdfbf7] p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col justify-between group relative overflow-hidden hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-1 h-full bg-stone-500"></div>
              <div className="pl-2">
                <h3 className="font-serif font-bold text-lg text-stone-900 truncate" title={adv.name}>{adv.name}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-2">
                  Lvl {adv.startLevel}-{adv.endLevel} <span className="mx-1">•</span> {adv.numPlayers} Players <span className="mx-1">•</span> {adv.totalLootGP.toLocaleString()} gp
                </p>
                <p className="text-sm text-stone-700 italic mt-1">{adv.sessions.length} sessions logged</p>
              </div>
              <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#d4c5a9]/50 pl-2">
                <button 
                  onClick={() => { setActiveAdventureId(adv.id); setCurrentView('adventure'); }}
                  className="text-stone-700 hover:text-stone-900 text-xs font-bold uppercase tracking-wider flex items-center transition"
                >
                  Open Arc <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                </button>
                <button 
                  onClick={() => handleDeleteAdventure(adv.id)}
                  className="text-stone-400 hover:text-red-800 p-1 rounded transition"
                  title="Delete Adventure"
                >
                  <Skull className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {!showNew ? (
            <button 
              onClick={() => setShowNew(true)}
              className="border-2 border-dashed border-stone-600/50 rounded-sm p-5 flex flex-col items-center justify-center text-stone-400 hover:text-amber-500 hover:border-amber-600/50 hover:bg-stone-800/30 transition min-h-[160px]"
            >
              <Plus className="w-6 h-6 mb-2" />
              <span className="font-bold uppercase tracking-wider text-xs">Start New Adventure</span>
            </button>
          ) : (
            <div className="border border-stone-600 bg-stone-800 rounded-sm p-4 flex flex-col justify-center min-h-[160px] shadow-lg">
              <input 
                autoFocus
                type="text" 
                placeholder="Adventure Title..." 
                className="w-full p-2 bg-[#f4ebd8] text-stone-900 border border-stone-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-red-900 mb-3 font-serif font-bold placeholder:font-sans placeholder:font-normal placeholder:text-stone-500 text-sm"
                value={newAdvName}
                onChange={e => setNewAdvName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAdventure(newAdvName, newAdvStart, newAdvEnd); if (e.key === 'Escape') setShowNew(false); }}
              />
              <div className="flex items-center gap-2 mb-4">
                 <select className="p-1 border border-stone-600 rounded-sm text-xs bg-stone-700 text-stone-200 outline-none flex-1" value={newAdvStart} onChange={e => setNewAdvStart(e.target.value)}>
                   {renderLevelOptions()}
                 </select>
                 <span className="text-stone-400 text-xs italic">to</span>
                 <select className="p-1 border border-stone-600 rounded-sm text-xs bg-stone-700 text-stone-200 outline-none flex-1" value={newAdvEnd} onChange={e => setNewAdvEnd(e.target.value)}>
                   {renderLevelOptions()}
                 </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNew(false)} className="px-3 py-1 text-stone-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition">Cancel</button>
                <button onClick={() => handleCreateAdventure(newAdvName, newAdvStart, newAdvEnd)} className="px-3 py-1 bg-stone-600 text-amber-50 rounded-sm hover:bg-stone-500 text-[10px] font-bold uppercase tracking-wider shadow-md transition">Begin</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdventureView = () => {
    if (!activeCampaign || !activeAdventure) return null;

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b-2 border-stone-800 pb-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-500 leading-tight">{activeAdventure.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-stone-400 text-sm font-sans mt-2">
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">Level {activeAdventure.startLevel}-{activeAdventure.endLevel}</span>
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner">{activeAdventure.numPlayers} Heroes Active</span>
              <span className="bg-stone-900 px-2 py-1 rounded border border-stone-700 shadow-inner font-bold text-amber-600">{activeAdventure.totalLootGP.toLocaleString(undefined, {minimumFractionDigits: 2})} gp Arc Loot</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => { setActiveSessionId(null); setCurrentView('journal'); }}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-[#f4ebd8] text-stone-900 border border-[#d4c5a9] rounded-sm hover:bg-[#e8dec7] transition font-bold uppercase tracking-wider text-xs shadow-md"
              title="Read adventure scroll"
            >
              <Scroll className="w-4 h-4 mr-2 text-stone-700" /> Read Arc Scroll
            </button>
            <button 
              onClick={() => { setActiveSessionId(null); setCurrentView('session-edit'); }}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-xs shadow-md"
            >
              <Feather className="w-4 h-4 mr-2" /> Log Session
            </button>
          </div>
        </div>

        <div className="bg-[#f4ebd8] rounded-sm border border-[#d4c5a9] shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden">
          {activeAdventure.sessions.length === 0 ? (
            <div className="p-12 text-center text-stone-500 flex flex-col items-center">
              <Feather className="w-16 h-16 mx-auto text-stone-400 mb-4 opacity-50" />
              <p className="font-serif text-lg">The pages of this arc are currently blank.</p>
              <p className="text-sm mt-2 font-sans">Click "Log Session" to ink your first entry.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#d4c5a9]/50">
              {[...activeAdventure.sessions].sort((a, b) => b.timestamp - a.timestamp).map(session => (
                <li key={session.id} className="p-5 hover:bg-[#fbf4e6] transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                  <div className="flex-grow">
                    <h4 className="font-serif font-bold text-xl text-stone-900">{session.name}</h4>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mt-1">
                      {new Date(session.timestamp).toLocaleDateString()} <span className="mx-1">•</span> <span className="text-red-900">{session.lootValue.toLocaleString()} gp</span> discovered
                    </p>
                    {session.notes && <p className="text-sm text-stone-700 mt-3 italic border-l-2 border-stone-400 pl-3">"{session.notes}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setActiveSessionId(session.id); setCurrentView('journal'); }}
                      className="px-3 py-1.5 text-stone-800 bg-stone-300 rounded-sm hover:bg-stone-400 border border-stone-400 transition text-xs font-bold uppercase tracking-wider flex-1 sm:flex-none justify-center flex items-center shadow-sm"
                      title="Read Entry"
                    >
                      <Scroll className="w-4 h-4 mr-1" /> Read
                    </button>
                    <button 
                      onClick={() => { setActiveSessionId(session.id); setCurrentView('session-edit'); }}
                      className="px-3 py-1.5 text-amber-50 bg-stone-800 rounded-sm hover:bg-stone-700 border border-stone-600 transition text-xs font-bold uppercase tracking-wider flex-1 sm:flex-none justify-center flex items-center shadow-sm"
                    >
                      <Feather className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteSession(session.id)}
                      className="px-3 py-1.5 text-amber-50 bg-red-900 rounded-sm hover:bg-red-800 border border-red-950 transition text-xs font-bold uppercase tracking-wider flex-1 sm:flex-none justify-center flex items-center shadow-sm"
                    >
                      <Skull className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const PCManagerView = () => {
    const [pcs, setPcs] = useState([...(activeCampaign?.playerCharacters || [])]);
    const [newPcName, setNewPcName] = useState('');

    const handleAddPC = () => {
      if (!newPcName.trim()) return;
      setPcs([...pcs, { id: generateId(), name: newPcName.trim(), inspiration: false, automaticSuccess: false }]);
      setNewPcName('');
    };

    const handleRemovePC = (id) => setPcs(pcs.filter(pc => pc.id !== id));
    
    const handleSave = () => {
      handleUpdateCampaignPCs(activeCampaign.id, pcs);
    };

    return (
      <div className="animate-in fade-in duration-300 max-w-2xl mx-auto bg-[#f4ebd8] p-6 rounded-sm border border-[#d4c5a9] shadow-[0_8px_24px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-600"></div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif font-bold text-stone-900 flex items-center border-b-2 border-stone-300 pb-2 w-full">
            <Users className="mr-3 text-red-900" /> Assemble Party
          </h2>
          <button onClick={() => setCurrentView('campaign')} className="text-stone-500 hover:text-red-900 transition ml-4 absolute right-6 top-6">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-stone-600 italic mb-4">These heroes will persist across all adventures within the <strong>{activeCampaign?.name}</strong> campaign.</p>

        <div className="mb-6 flex gap-2">
          <input 
            type="text" placeholder="Enter Hero's Name..." 
            className="flex-grow p-3 bg-[#fdfbf7] border border-[#d4c5a9] rounded-sm focus:ring-2 focus:ring-red-900 focus:outline-none font-serif text-lg shadow-inner"
            value={newPcName} onChange={e => setNewPcName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPC()}
          />
          <button onClick={handleAddPC} className="px-5 py-2 bg-stone-900 text-amber-50 rounded-sm hover:bg-stone-800 transition flex items-center font-bold uppercase tracking-wider text-sm shadow-md">
            <Plus className="w-5 h-5 mr-1" /> Add
          </button>
        </div>

        <div className="bg-[#e8dec7] border border-[#d4c5a9] rounded-sm p-4 mb-6 min-h-[200px] shadow-inner">
          {pcs.length === 0 ? (
            <p className="text-stone-500 text-center mt-12 font-serif italic">The tavern is empty. No heroes have joined yet.</p>
          ) : (
            <ul className="space-y-3">
              {pcs.map(pc => (
                <li key={pc.id} className="flex justify-between items-center p-3 bg-[#f4ebd8] border border-[#d4c5a9] rounded-sm shadow-sm">
                  <span className="font-serif font-bold text-lg text-stone-900">{pc.name}</span>
                  <button onClick={() => handleRemovePC(pc.id)} className="text-red-900 hover:text-red-700 p-1.5 bg-red-900/10 rounded-sm transition" title="Remove Hero">
                    <Skull className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setCurrentView('campaign')} className="px-5 py-2.5 text-stone-600 border border-stone-400 rounded-sm hover:bg-stone-300 transition font-bold uppercase tracking-wider text-sm">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 bg-red-900 text-amber-50 rounded-sm hover:bg-red-800 transition font-bold uppercase tracking-wider text-sm flex items-center shadow-md">
            <Save className="w-4 h-4 mr-2" /> Commit Party
          </button>
        </div>
      </div>
    );
  };

  const SessionEditView = () => {
    const isNew = !activeSession;
    const [activeTab, setActiveTab] = useState('session'); // 'session' | 'pcs' | 'preview'
    const [previewCopied, setPreviewCopied] = useState(false);
    
    // Draft State
    const [draftName, setDraftName] = useState(activeSession?.name || `Log from ${new Date().toLocaleDateString()}`);
    const [draftStartLevel, setDraftStartLevel] = useState(activeAdventure.startLevel);
    const [draftEndLevel, setDraftEndLevel] = useState(activeAdventure.endLevel);
    const [draftNumPlayers, setDraftNumPlayers] = useState(activeAdventure.numPlayers);
    
    const [draftLootText, setDraftLootText] = useState(activeSession?.lootText || '');
    const [draftEvents, setDraftEvents] = useState(activeSession?.events || '');
    const [draftNpcs, setDraftNpcs] = useState(activeSession?.npcs || '');
    const [draftLocations, setDraftLocations] = useState(activeSession?.locations || '');
    const [draftNotes, setDraftNotes] = useState(activeSession?.notes || '');
    
    // Copy PC state for editing within session (using Campaign-level PCs)
    const [draftPCs, setDraftPCs] = useState(
      (activeCampaign?.playerCharacters || []).map(pc => ({
        ...pc,
        sessionNote: activeSession?.pcNotes?.[pc.id] || ''
      }))
    );

    // Budget Calculations
    const lootBeforeThisSession = activeAdventure.sessions
      .filter(s => s.id !== activeSession?.id)
      .reduce((acc, s) => acc + s.lootValue, 0);
    
    const currentLootValue = useMemo(() => calculateLootValue(draftLootText), [draftLootText]);
    
    const budgetStats = useMemo(() => {
      const startBudget = BUDGET_BY_LEVEL[draftStartLevel] || 0;
      const endBudget = BUDGET_BY_LEVEL[draftEndLevel] || 0;
      const budgetPerPC = (draftEndLevel > draftStartLevel) ? (endBudget - startBudget) : 0;
      const totalPartyBudget = budgetPerPC * draftNumPlayers;
      const currentTotalLoot = lootBeforeThisSession + currentLootValue;
      const remainingBudget = totalPartyBudget - currentTotalLoot;
      return { totalPartyBudget, currentTotalLoot, remainingBudget };
    }, [draftStartLevel, draftEndLevel, draftNumPlayers, lootBeforeThisSession, currentLootValue]);

    const handlePCSwitch = (id, field) => {
      setDraftPCs(prev => prev.map(pc => pc.id === id ? { ...pc, [field]: !pc[field] } : pc));
    };

    const handlePSTextChange = (id, text) => {
      setDraftPCs(prev => prev.map(pc => pc.id === id ? { ...pc, sessionNote: text } : pc));
    };

    const draftSession = useMemo(() => ({
      id: activeSession?.id || 'draft',
      name: draftName,
      timestamp: activeSession?.timestamp || Date.now(),
      lootText: draftLootText,
      lootValue: currentLootValue,
      events: draftEvents,
      npcs: draftNpcs,
      locations: draftLocations,
      notes: draftNotes,
      pcNotes: draftPCs.reduce((acc, pc) => ({ ...acc, [pc.id]: pc.sessionNote }), {})
    }), [activeSession, draftName, draftLootText, currentLootValue, draftEvents, draftNpcs, draftLocations, draftNotes, draftPCs]);

    const previewMarkdown = useMemo(() => generateSessionMarkdown(draftSession, activeCampaign), [draftSession, activeCampaign]);

    const handlePreviewCopy = () => copyToClipboard(previewMarkdown, setPreviewCopied);

    const handleSave = () => {
      const sessionData = {
        id: activeSession?.id || generateId(),
        name: draftName,
        timestamp: activeSession?.timestamp || Date.now(),
        lootText: draftLootText,
        lootValue: currentLootValue,
        events: draftEvents,
        npcs: draftNpcs,
        locations: draftLocations,
        notes: draftNotes,
        pcNotes: draftPCs.reduce((acc, pc) => ({ ...acc, [pc.id]: pc.sessionNote }), {})
      };

      // Strip sessionNote out before saving back to campaign level PCs
      const updatedPCs = draftPCs.map(({ sessionNote, ...rest }) => rest);
      
      const advSettings = {
        startLevel: draftStartLevel,
        endLevel: draftEndLevel,
        numPlayers: draftNumPlayers
      };

      handleSaveSession(sessionData, updatedPCs, advSettings);
    };

    const renderLevelOptions = () => Object.keys(BUDGET_BY_LEVEL).map(lvl => (
      <option key={lvl} value={lvl}>Level {lvl === '21' ? '20+' : lvl}</option>
    ));

    return (
      <div className="animate-in slide-in-from-bottom-4 duration-300 bg-[#f4ebd8] rounded-sm border-2 border-stone-700 shadow-[0_15px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 150px)' }}>
        
        {/* Header */}
        <div className="bg-stone-900 p-4 border-b-4 border-red-900 text-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
          <div className="flex-grow w-full sm:w-auto z-10">
            <input 
              type="text" 
              value={draftName} 
              onChange={e => setDraftName(e.target.value)}
              className="bg-stone-800 text-amber-400 px-3 py-1.5 rounded-sm border border-stone-600 focus:border-amber-500 focus:outline-none w-full sm:w-80 font-serif font-bold text-xl shadow-inner"
              placeholder="Session Title..."
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto self-end z-10">
             <button onClick={() => setCurrentView('adventure')} className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 border border-stone-500 rounded-sm transition font-bold uppercase tracking-wider text-xs flex-1 sm:flex-none text-center shadow-md">Cancel</button>
             <button onClick={handleSave} className="px-5 py-2 bg-red-900 hover:bg-red-800 text-amber-50 border border-red-950 rounded-sm transition font-bold uppercase tracking-wider flex items-center justify-center text-xs flex-1 sm:flex-none shadow-md">
               <Feather className="w-4 h-4 mr-2" /> Record Entry
             </button>
          </div>
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
             <Scroll className="w-24 h-24 text-amber-50" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#d4c5a9] bg-[#e8dec7] px-4 pt-2">
          <button 
            className={`px-5 py-2.5 font-bold uppercase tracking-wider text-xs rounded-t-sm transition ${activeTab === 'session' ? 'text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900' : 'text-stone-600 border-transparent hover:text-stone-800'}`}
            onClick={() => setActiveTab('session')}
          >
            Session Events
          </button>
          <button 
            className={`px-5 py-2.5 font-bold uppercase tracking-wider text-xs rounded-t-sm transition ${activeTab === 'pcs' ? 'text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900' : 'text-stone-600 border-transparent hover:text-stone-800'}`}
            onClick={() => setActiveTab('pcs')}
          >
            Hero Status
          </button>
          <button 
            className={`px-5 py-2.5 font-bold uppercase tracking-wider text-xs rounded-t-sm transition ${activeTab === 'preview' ? 'text-stone-900 bg-[#f4ebd8] border-t-2 border-l border-r border-[#d4c5a9] border-t-red-900' : 'text-stone-600 border-transparent hover:text-stone-800'}`}
            onClick={() => setActiveTab('preview')}
          >
            Live Journal
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-[#f4ebd8]">
          
          {/* TAB: SESSION */}
          <div className={activeTab === 'session' ? 'block' : 'hidden'}>
            
            {/* Top Settings Bar */}
            <div className="bg-[#fdfbf7] p-4 rounded-sm border border-[#d4c5a9] shadow-sm mb-6 flex flex-wrap gap-6 items-end">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Level Range</label>
                <div className="flex items-center gap-2">
                  <select className="p-1.5 border border-[#d4c5a9] rounded-sm text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" value={draftStartLevel} onChange={e => setDraftStartLevel(parseInt(e.target.value))}>
                    {renderLevelOptions()}
                  </select>
                  <span className="text-stone-400 font-serif italic">to</span>
                  <select className="p-1.5 border border-[#d4c5a9] rounded-sm text-sm bg-white font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" value={draftEndLevel} onChange={e => setDraftEndLevel(parseInt(e.target.value))}>
                    {renderLevelOptions()}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Party Size</label>
                <input type="number" min="1" className="p-1.5 border border-[#d4c5a9] rounded-sm text-sm w-20 text-center font-bold text-stone-700 shadow-sm outline-none focus:border-red-900" value={draftNumPlayers} onChange={e => setDraftNumPlayers(parseInt(e.target.value) || 1)} />
              </div>

              {/* Budget Display */}
              <div className="ml-auto w-full lg:w-auto bg-stone-900 border border-stone-700 p-3 rounded-sm flex gap-6 text-center items-center justify-between lg:justify-start shadow-inner">
                 <div>
                   <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Party Treasury</div>
                   <div className="text-sm font-bold text-amber-500">{budgetStats.totalPartyBudget.toLocaleString()} gp</div>
                 </div>
                 <div className="w-px h-8 bg-stone-700"></div>
                 <div>
                   <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Hoard Total</div>
                   <div className="text-sm font-bold text-amber-500">{budgetStats.currentTotalLoot.toLocaleString(undefined, {minimumFractionDigits: 2})} gp</div>
                 </div>
                 <div className="w-px h-8 bg-stone-700"></div>
                 <div>
                   <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Remaining</div>
                   <div className={`text-sm font-bold ${budgetStats.remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                     {budgetStats.remainingBudget.toLocaleString(undefined, {minimumFractionDigits: 2})} gp
                   </div>
                 </div>
              </div>
            </div>

            {/* Text Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-800 font-serif mb-2 flex justify-between items-baseline border-b border-[#d4c5a9] pb-1">
                    Loot (Treasures & Coin) <span className="font-sans font-bold text-red-900 text-xs">Calculated: {currentLootValue} gp</span>
                  </label>
                  <textarea rows={6} className="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400" placeholder="e.g. 50 gp, 2 pp, +1 Longsword..." value={draftLootText} onChange={e => setDraftLootText(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-800 font-serif mb-2 border-b border-[#d4c5a9] pb-1">General Notes</label>
                  <textarea rows={6} className="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400" placeholder="Overall summary of the session..." value={draftNotes} onChange={e => setDraftNotes(e.target.value)} />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-800 font-serif mb-2 border-b border-[#d4c5a9] pb-1">Events</label>
                  <textarea rows={3} className="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400" placeholder="Key happenings..." value={draftEvents} onChange={e => setDraftEvents(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-800 font-serif mb-2 border-b border-[#d4c5a9] pb-1">NPCs Met</label>
                  <textarea rows={3} className="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400" placeholder="Characters encountered..." value={draftNpcs} onChange={e => setDraftNpcs(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-800 font-serif mb-2 border-b border-[#d4c5a9] pb-1">Locations Visited</label>
                  <textarea rows={3} className="w-full p-3 border border-[#d4c5a9] bg-[#fdfbf7] rounded-sm focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400" placeholder="Dungeons, towns, ruins..." value={draftLocations} onChange={e => setDraftLocations(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* TAB: PCs */}
          <div className={activeTab === 'pcs' ? 'block' : 'hidden'}>
            {draftPCs.length === 0 ? (
              <div className="text-center p-12 bg-[#fdfbf7] rounded-sm border border-[#d4c5a9] shadow-sm">
                <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl text-stone-700">No Heroes Assigned</h3>
                <p className="text-stone-500 mb-6 font-sans">Return to the campaign overview to add players to the party.</p>
                <button onClick={() => setCurrentView('campaign')} className="px-5 py-2.5 bg-stone-200 text-stone-800 border border-stone-300 rounded-sm hover:bg-stone-300 font-bold uppercase tracking-wider text-xs shadow-sm transition">Return to Campaign</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {draftPCs.map(pc => (
                  <div key={pc.id} className="bg-[#fdfbf7] p-5 rounded-sm border border-[#d4c5a9] shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-stone-400"></div>
                    <div className="flex justify-between items-center border-b border-stone-200 pb-3 pl-2">
                      <span className="font-serif font-bold text-xl text-stone-900">{pc.name}</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer group" title="Inspiration">
                          <input type="checkbox" checked={pc.inspiration} onChange={() => handlePCSwitch(pc.id, 'inspiration')} className="hidden" />
                          <div className={`p-1.5 rounded-sm border transition-colors ${pc.inspiration ? 'bg-amber-100 border-amber-400 text-amber-600 shadow-inner' : 'bg-stone-100 border-stone-200 text-stone-300 group-hover:bg-stone-200 group-hover:text-stone-400'}`}>
                            <Flame className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${pc.inspiration ? 'text-amber-700' : 'text-stone-400'}`}>Insp</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group" title="Auto-Success">
                          <input type="checkbox" checked={pc.automaticSuccess} onChange={() => handlePCSwitch(pc.id, 'automaticSuccess')} className="hidden" />
                          <div className={`p-1.5 rounded-sm border transition-colors ${pc.automaticSuccess ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-inner' : 'bg-stone-100 border-stone-200 text-stone-300 group-hover:bg-stone-200 group-hover:text-stone-400'}`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${pc.automaticSuccess ? 'text-blue-700' : 'text-stone-400'}`}>Auto</span>
                        </label>
                      </div>
                    </div>
                    <textarea 
                      className="w-full p-3 border border-[#d4c5a9] rounded-sm bg-[#f4ebd8] focus:bg-[#fdfbf7] focus:ring-2 focus:ring-red-900 outline-none text-sm font-sans shadow-inner placeholder:italic placeholder:text-stone-400 flex-grow"
                      rows={3}
                      placeholder={`Heroic deeds or tragic flaws for ${pc.name}...`}
                      value={pc.sessionNote}
                      onChange={(e) => handlePSTextChange(pc.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TAB: PREVIEW */}
          <div className={activeTab === 'preview' ? 'flex flex-col h-[60vh] min-h-[400px]' : 'hidden'}>
            <div className="bg-stone-900 p-3 rounded-t-sm border-b-2 border-red-900 flex justify-between items-center text-amber-500 shrink-0 shadow-md">
              <h3 className="text-sm font-serif font-bold flex items-center">
                <Scroll className="w-4 h-4 mr-2 text-red-700" />
                Live Scroll Preview
              </h3>
              <button 
                onClick={handlePreviewCopy}
                className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center transition shadow-md ${previewCopied ? 'bg-emerald-700 text-white border border-emerald-900' : 'bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500'}`}
              >
                {previewCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {previewCopied ? 'Scribed!' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              className="w-full flex-grow p-6 bg-[#fdfbf7] border border-[#d4c5a9] border-t-0 rounded-b-sm text-stone-900 font-mono text-sm leading-relaxed resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-red-900 shadow-inner"
              value={previewMarkdown}
            />
          </div>

        </div>
      </div>
    );
  };

  const JournalView = () => {
    const [copied, setCopied] = useState(false);
    
    // Determine the export scope and title
    const title = activeSession 
      ? `Scroll: ${activeSession.name}` 
      : activeAdventure 
        ? `Arc Scroll: ${activeAdventure.name}`
        : `The Grand Tome of ${activeCampaign?.name}`;
    
    const markdownContent = useMemo(() => {
      if (!activeCampaign) return '';
      if (activeSession) {
        return generateSessionMarkdown(activeSession, activeCampaign);
      } else if (activeAdventure) {
        return generateAdventureMarkdown(activeAdventure, activeCampaign);
      } else {
        return generateCampaignMarkdown(activeCampaign);
      }
    }, [activeCampaign, activeAdventure, activeSession]);

    const handleCopy = () => {
      copyToClipboard(markdownContent, setCopied);
    };

    const handleClose = () => {
      if (activeSession) setCurrentView('adventure');
      else if (activeAdventure) setCurrentView('adventure');
      else setCurrentView('campaign');
    }

    return (
      <div className="animate-in fade-in duration-300 max-w-4xl mx-auto bg-[#fdfbf7] rounded-sm border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[calc(100vh-150px)]">
        <div className="bg-stone-900 p-4 flex justify-between items-center text-amber-500 shrink-0 border-b-4 border-red-900">
          <h2 className="text-xl font-serif font-bold flex items-center">
            <Scroll className="w-6 h-6 mr-3 text-red-700" />
            {title}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center transition shadow-md ${copied ? 'bg-emerald-700 text-white border border-emerald-900' : 'bg-stone-700 text-amber-50 hover:bg-stone-600 border border-stone-500'}`}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Scribed!' : 'Copy to Clipboard'}
            </button>
            <button 
              onClick={handleClose}
              className="p-2 bg-stone-800 hover:bg-red-900 text-stone-300 hover:text-white border border-stone-600 rounded-sm transition shadow-md"
              title="Close Scroll"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-grow p-0 bg-[#fdfbf7] overflow-hidden relative">
          <textarea
            readOnly
            className="w-full h-full p-8 bg-transparent text-stone-900 font-mono text-sm leading-relaxed resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-red-900 border-none"
            value={markdownContent}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-900 font-sans p-4 sm:p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-800 to-stone-950 selection:bg-red-900 selection:text-amber-50">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <header className="mb-6 pb-6 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-900 p-3 rounded-sm text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-red-950 transform rotate-3">
              <Scroll className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-amber-500 leading-none drop-shadow-md">Campaign Master's Log</h1>
              <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mt-2">Standalone Tracking Environment</p>
            </div>
          </div>
        </header>

        {/* Navigation Breadcrumbs */}
        {renderBreadcrumbs()}

        {/* Dynamic View Rendering */}
        <main>
          {currentView === 'home' && <HomeView />}
          {currentView === 'campaign' && <CampaignView />}
          {currentView === 'adventure' && <AdventureView />}
          {currentView === 'pc-manager' && <PCManagerView />}
          {currentView === 'session-edit' && <SessionEditView />}
          {currentView === 'journal' && <JournalView />}
        </main>

      </div>
    </div>
  );
}
