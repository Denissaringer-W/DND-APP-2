import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  Train,
  Users,
  ChevronRight,
  Loader2,
  Beer,
  MessageCircle,
  Megaphone,
  AlertCircle,
  RefreshCw,
  WifiOff,
  ShieldAlert,
  Search,
  Backpack,
  Plus,
  Trash2,
  Zap,
  Sparkles,
  Map,
  Skull,
  Croissant,
  Volume2,
  StopCircle,
  Brain,
  ShoppingBag,
  Coins,
  PenTool,
  Lock
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'berlin-u8-adventure-v1';
const apiKey = "";

// --- DATA STRUCTURE ---
const COLLECTION_NAME = 'game_sessions';
const LOGIC_DOC_ID = 'session_logic_v4';
const VISUAL_DOC_ID = 'session_visuals_v4';

// --- SHOP ITEMS DEFINITION ---
const SHOP_ITEMS = [
  {
    id: 'perk_megafon',
    title: 'Das Megafon',
    icon: <Megaphone className="w-6 h-6 text-red-400" />,
    description: 'Deine Stimme zählt DREIFACH bei Abstimmungen.',
    price: 50,
    type: 'passive'
  },
  {
    id: 'perk_ghostwriter',
    title: 'Ghostwriter',
    icon: <PenTool className="w-6 h-6 text-blue-400" />,
    description: 'Erlaubt dir, eigene Antwortmöglichkeiten zu schreiben.',
    price: 120,
    type: 'active'
  },
  {
    id: 'perk_doener',
    title: 'Döner-Abo',
    icon: <span className="text-xl">🥙</span>,
    description: 'Du startest jedes Abenteuer mit 120% Nervenkostüm.',
    price: 200,
    type: 'passive'
  },
  {
    id: 'perk_schnauze',
    title: 'Berliner Schnauze',
    icon: <MessageCircle className="w-6 h-6 text-yellow-400" />,
    description: 'Pöbeln heilt jetzt deine Nerven (+5 Sanity).',
    price: 350,
    type: 'passive'
  }
];

// --- SCENARIOS ---
const SCENARIOS = [
  {
    id: 'u8_chaos',
    title: 'Chaos in der U8',
    icon: <Train className="w-8 h-8 text-yellow-400" />,
    description: 'Überlebe die Fahrt von Neukölln zum Alexanderplatz.',
    startStory: "Du stehst am Hermannplatz. Es riecht nach billigem Parfüm und altem Fett. Ein Akkordeon-Spieler spielt Techno.",
    startOptions: ["Die Tür eintreten", "Zum Beat tanzen", "Bier öffnen", "Durchs Fenster klettern"],
    imagePromptStyle: "Berlin Underground subway aesthetic, gritty, absurd, neon, cinematic"
  },
  {
    id: 'spaeti_doom',
    title: 'Der letzte Späti',
    icon: <Beer className="w-8 h-8 text-blue-400" />,
    description: 'Eine Zombie-Horde aus Touristen belagert den Laden.',
    startStory: "Du bist der Verkäufer im 'Späti 2000'. Draußen hämmern Hunderte von Party-Touristen gegen die Scheibe.",
    startOptions: ["Rollläden runterlassen", "Dosenbier werfen", "Kühlschrank verbarrikadieren", "Leitungswasser verkaufen"],
    imagePromptStyle: "Cyberpunk Berlin Späti convenience store at night, neon lights, gritty, zombie apocalypse vibe"
  },
  {
    id: 'oktoberfest_horror',
    title: 'Wiesn des Wahnsinns',
    icon: <Croissant className="w-8 h-8 text-orange-400" />,
    description: 'Das Bier ist verflucht und die Hendl leben.',
    startStory: "Du wachst im Bierzelt auf. Die Kapelle spielt 'Atemlos', aber die Musiker sind Skelette.",
    startOptions: ["Bier exen", "Auf den Tisch steigen", "Hendl als Waffe", "Verstecken"],
    imagePromptStyle: "Dark fantasy Oktoberfest beer hall, horror style, grim reaper, cinematic lighting"
  },
  {
    id: 'bundestag_battle',
    title: 'Battle Royale Bundestag',
    icon: <Skull className="w-8 h-8 text-red-400" />,
    description: 'Die Kuppel ist die Arena. Stempel sind Waffen.',
    startStory: "Plenarsitzung unterbrochen. Ein Portal zur Bürokratie-Dimension hat sich geöffnet.",
    startOptions: ["Antrag stellen", "Pult surfen", "Ältestenrat beschwören", "Kantine flüchten"],
    imagePromptStyle: "Sci-fi futuristic parliament battle arena, chaotic action scene, epic scale"
  }
];

// --- UTILS ---
const compressImage = (base64Str, maxWidth = 512, quality = 0.6) => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) { resolve(base64Str); return; }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const pcmToWav = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + len, true); writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(view, 36, 'data');
  view.setUint32(40, len, true);
  const bytes = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return new Blob([view], { type: 'audio/wav' });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ gold: 0, perks: [] });
  const [gameState, setGameState] = useState(null);
  const [isNewGame, setIsNewGame] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isFallbackImage, setIsFallbackImage] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [players, setPlayers] = useState([]);
  const playerNameRef = useRef(null);

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  // Extras State
  const [heckle, setHeckle] = useState(null);
  const [heckleLoading, setHeckleLoading] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [excuse, setExcuse] = useState(null);
  const [excuseLoading, setExcuseLoading] = useState(false);
  const [loot, setLoot] = useState(null);
  const [lootLoading, setLootLoading] = useState(false);
  const [itemEffectLoading, setItemEffectLoading] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  useEffect(() => {
    if (user && !playerNameRef.current) {
      playerNameRef.current = `Spieler-${user.uid.slice(0, 5)}`;
    }
  }, [user]);

  const fetchWithRetry = async (url, options, retries = 3) => {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response.json();
        if (response.status !== 429 && response.status < 500) throw new Error(`HTTP Error ${response.status}`);
      } catch (e) {
        if (i === retries - 1) throw e;
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
    throw new Error("API Connection Failed");
  };

  // --- AUTH & USER PROFILE ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error(err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Fetch User Profile (Gold & Perks)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      } else {
        setDoc(userRef, { gold: 0, perks: [] }); // Init profile
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- GAME SYNC ---
  useEffect(() => {
    if (!user) return;
    const logicRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID);
    const unsubscribe = onSnapshot(logicRef, (snap) => {
      if (snap.exists() && snap.data().day > 0) {
        const data = snap.data();
        setGameState(data);
        setPlayers(data.players || []);
        setIsNewGame(false);
      } else {
        setIsNewGame(true);
        setGameState(null);
        setPlayers([]);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [user]);

  // --- MULTIPLAYER PRESENCE ---
  useEffect(() => {
    if (!user || !gameState) return;
    if (!playerNameRef.current) {
      playerNameRef.current = `Spieler-${user.uid.slice(0, 5)}`;
    }
    const alreadyJoined = players.some(player => player.id === user.uid);
    if (alreadyJoined) return;
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), {
      players: arrayUnion({ id: user.uid, name: playerNameRef.current })
    }).catch(() => {});
  }, [user, gameState, players]);

  // Visuals Sync
  useEffect(() => {
    if (!user) return;
    const visualRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, VISUAL_DOC_ID);
    const unsubscribe = onSnapshot(visualRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.image) {
          setCurrentImage(data.image);
          setIsFallbackImage(data.isFallback || false);
          setImageLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Reset locals on day change
  useEffect(() => {
    if (gameState?.day) {
      setHeckle(null); setAnnouncement(null); setExcuse(null); setLoot(null);
      if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    }
  }, [gameState?.day]);

  // --- CORE GAME ACTIONS ---

  const generateAIImage = async (prompt, styleOverride) => {
    const style = styleOverride || gameState?.style || "Dark fantasy";
    const safePrompt = prompt.substring(0, 800);
    try {
      const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        body: JSON.stringify({ instances: { prompt: `${style}: ${safePrompt}` }, parameters: { sampleCount: 1 } })
      }, 1);
      return { url: `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`, isFallback: false };
    } catch (e) {
      console.warn("Image gen failed", e);
      return { url: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&q=80", isFallback: true };
    }
  };

  const startScenario = async (scenario) => {
    if (!user) return;

    // 1. Prepare New Game State locally first
    const startSanity = userProfile.perks?.includes('perk_doener') ? 120 : 100;
    const newGame = {
      day: 1,
      scenarioId: scenario.id,
      story: scenario.startStory,
      options: scenario.startOptions.map((text, i) => ({ id: i, text, votes: [] })),
      votedUsers: [],
      history: [],
      inventory: [],
      style: scenario.imagePromptStyle,
      sanity: startSanity,
      players: []
    };

    // 2. Optimistic Update (Critical Fix: Prevents null access)
    setGameState(newGame);
    setIsNewGame(false);
    setIsGenerating(true);

    try {
      // 3. Persist Logic
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), newGame);

      // 4. Generate & Persist Image
      setImageLoading(true);
      const { url: rawImgUrl, isFallback } = await generateAIImage(scenario.description, scenario.imagePromptStyle);
      const compressedImg = await compressImage(rawImgUrl);

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, VISUAL_DOC_ID), { image: compressedImg, day: 1, isFallback });
      setCurrentImage(compressedImg);
      setIsFallbackImage(isFallback);
    } catch (e) {
      console.error(e);
      setError("Start fehlgeschlagen.");
    } finally {
      setIsGenerating(false);
      setImageLoading(false);
    }
  };

  const generateNextStep = async () => {
    if (!gameState || isGenerating) return;
    setIsGenerating(true);

    try {
      const sorted = [...gameState.options].sort((a, b) => b.votes.length - a.votes.length);
      const winner = sorted[0];
      const currentDay = (gameState.day || 1) + 1;
      const inv = gameState.inventory?.length > 0 ? gameState.inventory.join(", ") : "nichts";

      const systemPrompt = `
        GM Mode. Tag ${currentDay}. Szenario: ${gameState.scenarioId}.
        Inv: [${inv}]. Sanity: ${gameState.sanity}.
        Eskaliere.
        JSON: {
          "story": "...",
          "options": ["...", "...", "...", "..."],
          "imagePrompt": "English visual description",
          "sanityChange": -5
        }
      `;
      const userPrompt = `Vorher: "${gameState.story}". Wahl: "${winner.text}".`;

      const aiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } })
      });

      const data = JSON.parse(aiResponse.candidates[0].content.parts[0].text);
      const newSanity = Math.max(0, Math.min(120, (gameState.sanity || 100) + (data.sanityChange || 0)));

      const newLogic = {
        day: currentDay,
        scenarioId: gameState.scenarioId,
        style: gameState.style,
        story: String(data.story),
        options: (data.options || ["Weiter"]).map((text, i) => ({ id: i, text, votes: [] })),
        votedUsers: [],
        history: [...(gameState.history || []), { day: gameState.day, action: String(winner.text) }],
        inventory: gameState.inventory || [],
        sanity: newSanity
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), newLogic, { merge: true });
      setIsGenerating(false);

      if (newSanity > 0) {
        setImageLoading(true);
        const { url: rawImgUrl, isFallback } = await generateAIImage(data.imagePrompt || data.story);
        const compressedImg = await compressImage(rawImgUrl);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, VISUAL_DOC_ID), { image: compressedImg, day: currentDay, isFallback });
      }
    } catch (e) { setError("Fehler bei Generierung"); setIsGenerating(false); setImageLoading(false); }
  };

  // --- VOTING WITH PERKS ---
  const castVote = async (optionId) => {
    if (!user || !gameState || gameState.votedUsers.includes(user.uid)) return;

    // PERK CHECK: Megafon
    const hasMegaphone = userProfile.perks?.includes('perk_megafon');
    const voteEntries = [user.uid];
    if (hasMegaphone) {
      voteEntries.push(`${user.uid}_boost1`, `${user.uid}_boost2`);
    }

    const updatedOptions = gameState.options.map(opt => {
      if (opt.id === optionId) return { ...opt, votes: [...opt.votes, ...voteEntries] };
      return opt;
    });

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), {
      options: updatedOptions,
      votedUsers: [...gameState.votedUsers, user.uid]
    }, { merge: true });
  };

  const addCustomOption = async () => {
    if (!customOptionInput.trim() || !user) return;
    const newOption = {
      id: 999 + Math.floor(Math.random() * 1000), // Random ID
      text: customOptionInput + " (Ghostwriter)",
      votes: [user.uid] // Auto-vote for own option
    };
    const updatedOptions = [...gameState.options, newOption];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), {
      options: updatedOptions,
      votedUsers: [...gameState.votedUsers, user.uid]
    }, { merge: true });
    setCustomOptionInput("");
  };

  // --- ITEM ACTIONS ---
  const performItemAction = async (item, indexToRemove) => {
    setIsGenerating(true);
    setItemEffectLoading(true);
    setActiveItemIndex(indexToRemove);
    try {
      const systemPrompt = `GM: Item "${item}" used. Sanity: ${gameState.sanity}. Update story. JSON: { "story": "...", "options": ["..."], "imagePrompt": "...", "sanityChange": 10 }`;
      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: "Action!" }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } })
      });
      const data = JSON.parse(res.candidates[0].content.parts[0].text);
      const newInv = gameState.inventory.filter((_, i) => i !== indexToRemove);
      const newSanity = Math.min(120, Math.max(0, (gameState.sanity || 100) + (data.sanityChange || 0)));

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), {
        story: data.story,
        options: data.options.map((t, i) => ({ id: i, text: t, votes: [] })),
        votedUsers: [],
        history: [...gameState.history, { day: gameState.day, action: `Item: ${item}` }],
        inventory: newInv,
        sanity: newSanity
      }, { merge: true });

      const { url } = await generateAIImage(data.imagePrompt || data.story);
      const cImg = await compressImage(url);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, VISUAL_DOC_ID), { image: cImg, isFallback: false }, { merge: true });
    } catch (e) { console.error(e); }
    setIsGenerating(false); setItemEffectLoading(false); setActiveItemIndex(null);
  };

  // --- SHOPPING ---
  const buyItem = async (item) => {
    if (userProfile.gold >= item.price) {
      if (userProfile.perks?.includes(item.id)) return; // Already owned
      const newProfile = {
        gold: userProfile.gold - item.price,
        perks: [...(userProfile.perks || []), item.id]
      };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), newProfile);
    }
  };

  const resetGame = async (isDeath = false) => {
    if (!isDeath && !confirm("Aufgeben?")) return;

    // REWARD LOGIC
    if (gameState?.day > 1) {
      const goldEarned = (gameState.day - 1) * 10; // 10 Gold per day
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
      await updateDoc(userRef, { gold: increment(goldEarned) });
      alert(`Runde beendet! Du hast ${goldEarned} Gold verdient.`);
    }

    setIsGenerating(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID));
    } catch (e) { } finally { setIsGenerating(false); }
  };

  // --- EXTRAS (Heckle etc) ---
  const generateExtra = async (type) => {
    const setters = { 'heckle': setHeckle, 'announcement': setAnnouncement, 'excuse': setExcuse, 'loot': setLoot };
    const loadingSetters = { 'heckle': setHeckleLoading, 'announcement': setAnnouncementLoading, 'excuse': setExcuseLoading, 'loot': setLootLoading };
    loadingSetters[type](true);
    try {
      // PERK CHECK: Berliner Schnauze
      const hasSchnauze = userProfile.perks?.includes('perk_schnauze');

      let prompt = `Ein kurzer, witziger Text für ein Berlin-RPG. Typ: ${type}. Situation: ${gameState.story}`;
      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const txt = res.candidates[0].content.parts[0].text;
      setters[type](txt);

      // Apply Perk Effect
      if (type === 'heckle' && hasSchnauze && gameState) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), {
          sanity: Math.min(120, (gameState.sanity || 100) + 5)
        });
      }
    } catch (e) { } finally { loadingSetters[type](false); }
  };

  const handleLootTake = async () => {
    if (!loot) return;
    const name = loot.split(/[-:]/)[0].substring(0, 20);
    const newInv = [...(gameState.inventory || []), name];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, LOGIC_DOC_ID), { inventory: newInv });
    setLoot(null);
  };

  // --- AUDIO ---
  const toggleAudio = async () => { /* same as before */ };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-yellow-500"><Loader2 className="animate-spin" /></div>;

  // --- SHOP VIEW ---
  if (showShop) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
        <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-black text-yellow-400 uppercase tracking-widest">Späti Store</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-yellow-500/50">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-mono font-bold">{userProfile.gold} Gold</span>
            </div>
            <button onClick={() => setShowShop(false)} className="text-slate-400 hover:text-white">Zurück zum Spiel</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SHOP_ITEMS.map(item => {
            const owned = userProfile.perks?.includes(item.id);
            const canAfford = userProfile.gold >= item.price;
            return (
              <div key={item.id} className={`p-6 rounded-xl border-2 flex flex-col gap-4 relative overflow-hidden ${owned ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-900 rounded-lg">{item.icon}</div>
                  {owned && <div className="bg-green-500 text-black text-xs font-bold px-2 py-1 rounded uppercase">Besitz</div>}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </div>
                <button
                  onClick={() => buyItem(item)}
                  disabled={owned || !canAfford}
                  className={`mt-auto w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                    ${owned ? 'bg-slate-700 cursor-default text-slate-500' : canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                  `}
                >
                  {owned ? "Gekauft" : <span className="flex items-center gap-2"><Coins className="w-4 h-4" /> {item.price}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- GAME OVER ---
  if (gameState && (gameState.sanity !== undefined && gameState.sanity <= 0)) {
    return (
      <div className="flex flex-col h-screen bg-red-950 text-white items-center justify-center p-8 text-center">
        <Skull className="w-32 h-32 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-5xl font-black mb-2 uppercase">Nervenzusammenbruch</h1>
        <p className="text-xl text-red-200 mb-8">Du hast {gameState.day - 1} Tage überlebt.</p>
        <button onClick={() => resetGame(true)} className="px-8 py-4 bg-white text-red-900 font-black rounded-full text-xl hover:scale-105 transition-transform">
          Belohnung abholen & Neustart
        </button>
      </div>
    );
  }

  // --- SCENARIO SELECTOR ---
  // Safety check: isNewGame OR gameState is null means we need to select scenario.
  if ((isNewGame || !gameState) && !loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-black tracking-tighter">NEUES SPIEL</h1>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-yellow-400 font-mono font-bold bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
                <Coins className="w-4 h-4" /> {userProfile.gold}
              </div>
              <button onClick={() => setShowShop(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full font-bold transition-colors">
                <ShoppingBag className="w-4 h-4" /> Shop
              </button>
            </div>
          </header>
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-full border border-gray-800">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Mitspieler: {players.length || 1}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(players.length ? players : [{ id: user?.uid || 'solo', name: playerNameRef.current || 'Solo' }]).map((player) => (
                <span key={player.id} className="bg-gray-900/60 border border-gray-800 px-3 py-1 rounded-full text-gray-300">
                  {player.name}
                </span>
              ))}
            </div>
          </div>
          {/* While generating, show loading overlay */}
          {isGenerating && (
            <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
              <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-4" />
              <p className="text-xl font-bold text-white uppercase tracking-widest animate-pulse">Initialisiere Welt...</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {SCENARIOS.map(s => (
              <button key={s.id} onClick={() => startScenario(s)} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-yellow-500 text-left transition-all hover:scale-[1.01] group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gray-800 rounded group-hover:text-yellow-400 transition-colors">{s.icon}</div>
                  <h2 className="text-2xl font-bold">{s.title}</h2>
                </div>
                <p className="text-gray-400">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- SAFETY GUARD: MAIN GAME ---
  if (!gameState) {
    return <div className="flex h-screen items-center justify-center bg-black text-yellow-500"><Loader2 className="animate-spin" /></div>;
  }

  // --- MAIN GAME ---
  const hasVoted = user && gameState?.votedUsers?.includes(user.uid);
  const totalVotes = gameState?.votedUsers?.length || 0;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 border-b border-gray-800 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 text-black rounded font-bold"><Map /></div>
              <div>
                <h1 className="text-xl font-bold text-white">{SCENARIOS.find(s => s.id === gameState.scenarioId)?.title || "Unbekanntes Gebiet"}</h1>
                <p className="text-xs text-green-400 uppercase tracking-widest">Tag {gameState.day}</p>
              </div>
            </div>
            <button onClick={() => resetGame(false)} className="text-xs text-red-500 hover:text-red-400 uppercase font-bold tracking-widest border border-red-900 px-3 py-1 rounded hover:bg-red-900/20 transition-colors">Aufgeben</button>
          </div>

          <div className="bg-gray-900 h-6 rounded-full relative overflow-hidden border border-gray-800">
            <div className={`absolute h-full transition-all duration-500 ${gameState.sanity > 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${gameState.sanity}%` }} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white drop-shadow">
              <Brain className="w-3 h-3 mr-2" /> Nerven: {gameState.sanity}%
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Mitspieler:</span>
            {(players.length ? players : [{ id: user?.uid || 'solo', name: playerNameRef.current || 'Solo' }]).map((player) => (
              <span key={player.id} className="bg-gray-900/60 border border-gray-800 px-2 py-1 rounded-full text-gray-300">
                {player.name}
              </span>
            ))}
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden border border-gray-800">
              {imageLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>}
              <img src={currentImage || "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&q=80"} className="w-full h-full object-cover" />
              {isFallbackImage && <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Signalstörung</div>}
            </div>

            {/* EXTRAS */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => generateExtra('heckle')} disabled={heckleLoading} className="bg-gray-900 hover:bg-gray-800 p-3 rounded border border-gray-800 text-xs font-bold uppercase flex flex-col items-center gap-1">
                {heckleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Pöbeln
              </button>
              <button onClick={() => generateExtra('loot')} disabled={lootLoading} className="bg-gray-900 hover:bg-gray-800 p-3 rounded border border-gray-800 text-xs font-bold uppercase flex flex-col items-center gap-1">
                {lootLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Suchen
              </button>
            </div>

            {/* RESULTS */}
            {heckle && <div className="bg-gray-800 p-3 text-sm italic border-l-2 border-yellow-500">"{heckle}"</div>}
            {loot && <div className="bg-green-900/20 p-3 text-sm border-l-2 border-green-500 flex justify-between items-center"><span>{loot}</span> <button onClick={handleLootTake} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">Nehmen</button></div>}

            {/* INVENTORY */}
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><Backpack className="w-3 h-3" /> Rucksack</h4>
              <div className="flex flex-wrap gap-2">
                {gameState.inventory.length === 0 && <span className="text-xs text-gray-600 italic">Leer</span>}
                {gameState.inventory.map((item, i) => (
                  <button key={i} onClick={() => performItemAction(item, i)} disabled={itemEffectLoading} className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-xs flex items-center gap-2 border border-gray-700">
                    <Zap className="w-3 h-3 text-purple-400" /> {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 min-h-[150px]">
              <p className="text-lg md:text-xl font-medium text-gray-200">{gameState.story}</p>
            </div>

            <div className="space-y-3">
              {gameState.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => castVote(opt.id)}
                  disabled={hasVoted || isGenerating}
                  className={`w-full p-4 rounded text-left border transition-all ${user && opt.votes.includes(user.uid) ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                >
                  <div className="flex justify-between">
                    <span className="font-bold text-sm">{opt.text}</span>
                    {hasVoted && <span className="text-xs font-mono">{Math.round((opt.votes.length / (gameState.votedUsers.length || 1)) * 100)}%</span>}
                  </div>
                  {hasVoted && <div className="h-1 bg-yellow-500 mt-2 rounded" style={{ width: `${(opt.votes.length / (gameState.votedUsers.length || 1)) * 100}%` }} />}
                </button>
              ))}
            </div>

            {/* GHOSTWRITER INPUT */}
            {userProfile.perks?.includes('perk_ghostwriter') && !hasVoted && (
              <div className="flex gap-2 animate-in fade-in">
                <input
                  type="text"
                  value={customOptionInput}
                  onChange={(e) => setCustomOptionInput(e.target.value)}
                  placeholder="Eigene Aktion (Ghostwriter Perk)..."
                  className="flex-1 bg-black border border-blue-500/50 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={addCustomOption} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold"><Plus className="w-4 h-4" /></button>
              </div>
            )}

            <button onClick={generateNextStep} disabled={isGenerating || gameState.votedUsers.length === 0} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg rounded shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
              {isGenerating ? <Loader2 className="animate-spin" /> : <>Weiter <ChevronRight /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
