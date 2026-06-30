import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Box, 
  Calendar, 
  Hash, 
  TreeDeciduous,
  ChevronDown,
  Info,
  Download,
  LogOut,
  Settings,
  CloudUpload,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ChevronRight,
  FileText,
  Hand,
  ArrowLeftRight
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  FirebaseUser,
  where,
  getDocs
} from './firebase';

const DEFAULT_WOOD_SPECIES = [
  "Aliso Blanco", "Aliso Colorado", "Almendrillo Amarillo", "Bitumbo", "Cedro",
  "Copiuba", "Cumarú", "Cuta", "Enchoque", "Itauba", "Maní", "Mara Blanca",
  "Mara Macho", "Morado", "Mururé", "Paquio", "Picana", "Tajibo", "Toco",
  "Verdolago", "Yesquero"
];

const DEFAULT_WIDTHS = Array.from({ length: 18 }, (_, i) => i + 3); // 3 to 20
const DEFAULT_LENGTHS = Array.from({ length: 21 }, (_, i) => i + 4); 
const LOGO_URL = "/logo.png";

let audioContext: AudioContext | null = null;

const playFeedback = (type: 'plus' | 'minus') => {
  // Haptic feedback (Vibration)
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'plus' ? 40 : [40, 20, 40]);
  }

  // Audio feedback (Web Audio API)
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Differentiate sounds: Pitch 880Hz (A5) for plus, 440Hz (A4) for minus
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(type === 'plus' ? 880 : 440, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio feedback error:", e);
  }
};

function DialPicker({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const lastAngleRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    lastAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || lastAngleRef.current === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    let delta = currentAngle - lastAngleRef.current;
    
    // Handle angle wrap-around
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    // Threshold of degrees for 1 increment
    const threshold = 12;
    if (Math.abs(delta) >= threshold) {
      const step = Math.sign(delta);
      onChange(Math.max(1, value + step));
      lastAngleRef.current = currentAngle;
      playFeedback(step > 0 ? 'plus' : 'minus');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    lastAngleRef.current = null;
  };

  // Visually compute a rotating dial arm angle based on value.
  // One spin represents 30 pieces, so we map angle to value.
  const angle = (value * 12) % 360;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer Rotary Frame */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-44 h-44 rounded-full bg-slate-900 border-4 border-slate-800 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Dial ticks */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute w-1 h-1.5 rounded-full bg-slate-700"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-76px)`
            }}
          />
        ))}

        {/* Center rotating disk */}
        <div 
          className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center shadow-inner border border-slate-600/30"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Pointer needle */}
          <div className="absolute top-2 w-1.5 h-6 rounded-full bg-brand-primary shadow-sm" />
          {/* Radial indicator light */}
          <div className="absolute top-2 w-2 h-2 rounded-full bg-brand-primary opacity-60 blur-[1px]" />
        </div>

        {/* Inner non-rotating hub */}
        <div className="absolute w-24 h-24 rounded-full bg-slate-950 flex flex-col items-center justify-center border-2 border-slate-900 shadow-2xl pointer-events-none">
          <input
            type="number"
            value={value}
            min="1"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) onChange(Math.max(1, val));
            }}
            className="pointer-events-auto bg-transparent border-none text-2xl font-black text-white text-center w-16 focus:ring-0 p-0 font-mono focus:outline-none"
          />
          <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase mt-0.5">Camadas</span>
        </div>
      </div>

      {/* Steppers Controls */}
      <div className="grid grid-cols-6 gap-1.5 w-full max-w-md px-2 select-none">
        <button
          type="button"
          onClick={() => {
            onChange(Math.max(1, value - 10));
            playFeedback('minus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          -10
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(Math.max(1, value - 5));
            playFeedback('minus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          -5
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(Math.max(1, value - 1));
            playFeedback('minus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          -1
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(value + 1);
            playFeedback('plus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(value + 5);
            playFeedback('plus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          +5
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(value + 10);
            playFeedback('plus');
          }}
          className="bg-brand-secondary/5 border-2 border-brand-secondary/10 hover:bg-brand-secondary/10 hover:border-brand-secondary/20 rounded-2xl py-3 px-1 flex flex-col items-center justify-center transition-all active:scale-90 font-black text-brand-secondary text-xs md:text-sm shadow-sm"
        >
          +10
        </button>
      </div>
    </div>
  );
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function App() {
  const [isSplash, setIsSplash] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'supervisor' | null>(null);
  const [canUseAserradero, setCanUseAserradero] = useState<boolean>(true);
  const [canUsePlaya, setCanUsePlaya] = useState<boolean>(true);
  const [view, setView] = useState<'counting' | 'admin' | 'history'>('counting');
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDangerZoneConfirm, setShowDangerZoneConfirm] = useState(false);
  
  // Config from Firestore
  const [woodSpecies, setWoodSpecies] = useState<string[]>(DEFAULT_WOOD_SPECIES);
  const [widths, setWidths] = useState<number[]>(DEFAULT_WIDTHS);
  const [thicknesses, setThicknesses] = useState<number[]>([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]);
  const [lengths, setLengths] = useState<number[]>(DEFAULT_LENGTHS);
  
  // App State
  const [lines, setLines] = useState<any[]>([]);
  const counts = useMemo(() => {
    const res: Record<number, Record<number, number>> = {};
    lines.forEach(line => {
      const len = line.length;
      const wid = line.width;
      const qty = line.qty || 1;
      if (!res[len]) {
        res[len] = {};
      }
      res[len][wid] = (res[len][wid] || 0) + qty;
    });
    return res;
  }, [lines]);
  const [thickness, setThickness] = useState(1);
  const [length, setLength] = useState(8);
  const [species, setSpecies] = useState("");
  const [aserradero, setAserradero] = useState("1");
  const [tipoRomaneo, setTipoRomaneo] = useState<'aserradero' | 'playa'>('aserradero');
  const [calidad, setCalidad] = useState<'Primera' | 'Segunda' | 'Tercera' | 'Rechazo'>('Primera');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState("");
  const [packageUuid, setPackageUuid] = useState(() => generateUUID());
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [date] = useState(new Date().toLocaleDateString('es-ES'));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'aserradero' | 'playa'>('all');

  // Offline and PWA states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Beach submodules and Camadas states
  const [submoduloPlaya, setSubmoduloPlaya] = useState<'piezas' | 'camadas'>('piezas');
  const [camadaWidth, setCamadaWidth] = useState(75);
  const [camadaQty, setCamadaQty] = useState(1);

  const widthRange = useMemo(() => {
    return length <= 4 ? { min: 70, max: 80 } : { min: 30, max: 45 };
  }, [length]);

  useEffect(() => {
    if (camadaWidth < widthRange.min || camadaWidth > widthRange.max) {
      setCamadaWidth(Math.floor((widthRange.min + widthRange.max) / 2));
    }
  }, [length, widthRange]);

  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    try {
      const pending = localStorage.getItem('mabet_pending_sync');
      return pending ? JSON.parse(pending).length : 0;
    } catch {
      return 0;
    }
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const getBasePrefix = (type: 'aserradero' | 'playa', subtype?: 'piezas' | 'camadas') => {
    const activeSubtype = subtype || (type === 'playa' ? submoduloPlaya : 'piezas');
    const prefix = type === 'aserradero' ? 'ASE' : 'PLA';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const letter = (type === 'playa' && activeSubtype === 'camadas') ? 'W' : 'P';
    return `${prefix}-${yy}${mm}-${letter}`;
  };

  const generatePackageId = (type: 'aserradero' | 'playa', subtype?: 'piezas' | 'camadas') => {
    const basePrefix = getBasePrefix(type, subtype);
    let maxSeq = 0;

    // 1. Scan offline history
    try {
      const offlineHist = JSON.parse(localStorage.getItem('mabet_offline_history') || '[]');
      if (Array.isArray(offlineHist)) {
        offlineHist.forEach((item: any) => {
          if (item && item.packageId && item.packageId.startsWith(basePrefix)) {
            const suffix = item.packageId.substring(basePrefix.length);
            const val = parseInt(suffix, 10);
            if (!isNaN(val) && val > maxSeq) {
              maxSeq = val;
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Scan pending sync
    try {
      const pendingList = JSON.parse(localStorage.getItem('mabet_pending_sync') || '[]');
      if (Array.isArray(pendingList)) {
        pendingList.forEach((item: any) => {
          if (item && item.packageId && item.packageId.startsWith(basePrefix)) {
            const suffix = item.packageId.substring(basePrefix.length);
            const val = parseInt(suffix, 10);
            if (!isNaN(val) && val > maxSeq) {
              maxSeq = val;
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Scan remote history state currently loaded
    if (history && history.length > 0) {
      history.forEach((item: any) => {
        if (item && item.packageId && item.packageId.startsWith(basePrefix)) {
          const suffix = item.packageId.substring(basePrefix.length);
          const val = parseInt(suffix, 10);
          if (!isNaN(val) && val > maxSeq) {
            maxSeq = val;
          }
        }
      });
    }

    // 4. Scan persistent local tracking counter
    try {
      const trackingJson = localStorage.getItem('mabet_package_sequences') || '{}';
      const tracking = JSON.parse(trackingJson);
      if (tracking[basePrefix]) {
        const storedVal = parseInt(tracking[basePrefix], 10);
        if (!isNaN(storedVal) && storedVal > maxSeq) {
          maxSeq = storedVal;
        }
      }
    } catch (e) {
      console.error(e);
    }

    const nextSeq = maxSeq + 1;
    const xxx = String(nextSeq).padStart(3, '0');
    return `${basePrefix}${xxx}`;
  };

  // Keep package sequences synchronized with cloud to prevent duplicates on multi-user/multi-device setups
  useEffect(() => {
    let active = true;
    const basePref = getBasePrefix(tipoRomaneo);

    const syncLatestSequence = async () => {
      if (!isOnline) return;
      try {
        const q = query(
          collection(db, 'romaneos'),
          where('packageId', '>=', basePref),
          where('packageId', '<=', basePref + '\uf8ff'),
          orderBy('packageId', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        if (!active) return;

        let maxSeq = 0;
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          if (docData && docData.packageId && docData.packageId.startsWith(basePref)) {
            const suffix = docData.packageId.substring(basePref.length);
            const val = parseInt(suffix, 10);
            if (!isNaN(val) && val > maxSeq) {
              maxSeq = val;
            }
          }
        });

        if (maxSeq > 0) {
          const trackingJson = localStorage.getItem('mabet_package_sequences') || '{}';
          const tracking = JSON.parse(trackingJson);
          const currentMax = tracking[basePref] || 0;
          if (maxSeq > currentMax) {
            tracking[basePref] = maxSeq;
            localStorage.setItem('mabet_package_sequences', JSON.stringify(tracking));

            setPackageId((prev) => {
              // Only update if the user hasn't started entering data on the current form to avoid overwriting their active edits
              const isBrandNew = lines.length === 0 && Object.keys(counts).length === 0;
              if (isBrandNew && prev.startsWith(basePref)) {
                const nextSeq = maxSeq + 1;
                const xxx = String(nextSeq).padStart(3, '0');
                return `${basePref}${xxx}`;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Error matching cloud sequence:", err);
      }
    };

    syncLatestSequence();
    return () => {
      active = false;
    };
  }, [tipoRomaneo, submoduloPlaya, isOnline, lines.length, counts]);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedRomaneo, setSelectedRomaneo] = useState<any | null>(null);
  const [detailSpeciesFilter, setDetailSpeciesFilter] = useState<string>("all");

  useEffect(() => {
    setDetailSpeciesFilter("all");
  }, [selectedRomaneo]);

  const distinctSpeciesInDetail = useMemo(() => {
    if (!selectedRomaneo) return [];
    const set = new Set<string>();
    (selectedRomaneo.lines || []).forEach((line: any) => {
      const sp = line.species || selectedRomaneo.species;
      if (sp) set.add(sp);
    });
    if (set.size === 0 && selectedRomaneo.species) {
      set.add(selectedRomaneo.species);
    }
    return Array.from(set);
  }, [selectedRomaneo]);
  const [quotaError, setQuotaError] = useState(false);
  const [oneHandedMode, setOneHandedMode] = useState(false);
  const [oneHandedSide, setOneHandedSide] = useState<'left' | 'right'>('right');
  const [oneHandedWidth, setOneHandedWidth] = useState(85);

  const triggerAutoSync = async () => {
    if (!navigator.onLine || !auth.currentUser) return;
    try {
      const pendingJson = localStorage.getItem('mabet_pending_sync');
      if (!pendingJson) return;
      const pendingItems = JSON.parse(pendingJson);
      if (pendingItems.length === 0) return;

      setSyncStatusMsg(`Sincronizando ${pendingItems.length} registro(s) offline...`);

      for (const item of pendingItems) {
        const itemToSync = { ...item };
        const isOfflineId = itemToSync.id && itemToSync.id.startsWith('offline_');
        delete itemToSync.id;
        delete itemToSync.isOffline;
        delete itemToSync.localId;

        if (isOfflineId) {
          const docId = itemToSync.packageUuid || `romaneo_${Date.now()}`;
          await setDoc(doc(db, 'romaneos', docId), {
            ...itemToSync,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(doc(db, 'romaneos', item.id), {
            ...itemToSync,
            updatedAt: serverTimestamp()
          });
        }
      }

      localStorage.setItem('mabet_pending_sync', JSON.stringify([]));
      setPendingSyncCount(0);
      setSyncStatusMsg("¡Sincronización completada!");
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (err) {
      console.error("Auto-sync error:", err);
      setSyncStatusMsg("Conexión inestable (registro en cola local)");
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 2000);

    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
      setTimeout(() => triggerAutoSync(), 1500);
    }

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Setup snapshot listener for the active user's role and permissions
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserRole(data.role || 'user');
            setCanUseAserradero(data.canUseAserradero !== false);
            setCanUsePlaya(data.canUsePlaya !== false);
          } else {
            const role = firebaseUser.email === "arenaslou@gmail.com" ? 'admin' : 'user';
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: role,
              canUseAserradero: true,
              canUsePlaya: true,
              createdAt: serverTimestamp()
            });
            setUserRole(role);
            setCanUseAserradero(true);
            setCanUsePlaya(true);
          }
        }, (error) => {
          console.error("User doc listener error:", error);
        });

        setTimeout(() => triggerAutoSync(), 1000);
      } else {
        setUser(null);
        setUserRole(null);
        setCanUseAserradero(true);
        setCanUsePlaya(true);
      }
    });

    // Listen to Config
    const unsubscribeSpecies = onSnapshot(doc(db, 'config', 'species'), (doc) => {
      if (doc.exists()) setWoodSpecies(doc.data().list);
    }, (error) => {
      console.error("Species listener error:", error);
      if (error.message.includes("Quota exceeded") || error.message.includes("Rate exceeded")) {
        setQuotaError(true);
      }
    });
    const unsubscribeMeasurements = onSnapshot(doc(db, 'config', 'measurements'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.widths) setWidths(data.widths);
        if (data.thicknesses) setThicknesses(data.thicknesses);
        if (data.lengths) setLengths(data.lengths);
      }
    }, (error) => {
      console.error("Measurements listener error:", error);
      if (error.message.includes("Quota exceeded") || error.message.includes("Rate exceeded")) {
        setQuotaError(true);
      }
    });

    // Get location with watchPosition for better accuracy in field
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationAccuracy(position.coords.accuracy);
      }, (err) => {
        console.warn("Location error:", err);
        setLocationAccuracy(null);
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    }

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribeSpecies();
      unsubscribeMeasurements();
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (userRole === 'admin' && view === 'admin') {
      const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Users listener error:", error);
        if (error.message.includes("Quota exceeded") || error.message.includes("Rate exceeded")) {
          setQuotaError(true);
        }
      });
      return () => unsubscribeUsers();
    }
  }, [userRole, view]);

  useEffect(() => {
    if (!canUseAserradero && canUsePlaya && tipoRomaneo !== 'playa') {
      setTipoRomaneo('playa');
      setPackageId(generatePackageId('playa', submoduloPlaya));
    } else if (!canUsePlaya && canUseAserradero && tipoRomaneo !== 'aserradero') {
      setTipoRomaneo('aserradero');
      setPackageId(generatePackageId('aserradero'));
    }
  }, [canUseAserradero, canUsePlaya, tipoRomaneo, submoduloPlaya]);

  useEffect(() => {
    if (woodSpecies.length > 0 && !species) setSpecies(woodSpecies[0]);
  }, [woodSpecies]);

  useEffect(() => {
    if (thicknesses.length > 0 && !thicknesses.includes(thickness)) setThickness(thicknesses[0]);
  }, [thicknesses]);

  useEffect(() => {
    if (lengths.length > 0 && !lengths.includes(length)) setLength(lengths[0]);
  }, [lengths]);

  useEffect(() => {
    if (user && view === 'history') {
      let q;
      if (userRole === 'admin' || userRole === 'supervisor') {
        q = query(collection(db, 'romaneos'), orderBy('createdAt', 'desc'), limit(50));
      } else {
        q = query(collection(db, 'romaneos'), where('createdBy', '==', user.uid), limit(100));
      }
      const unsubscribeHistory = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        if (userRole !== 'admin' && userRole !== 'supervisor') {
          docs.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
        }
        setHistory(docs);
      }, (error) => {
        console.error("History listener error:", error);
        if (error.message.includes("Quota exceeded") || error.message.includes("Rate exceeded")) {
          setQuotaError(true);
        }
      });
      return () => unsubscribeHistory();
    }
  }, [user, userRole, view]);

  useEffect(() => {
    setPackageId(generatePackageId('aserradero'));
  }, []);

  const volumes = useMemo(() => {
    let total = 0;
    let larga = 0;
    let corta = 0;
    let finger = 0;
    let pieces = 0;

    lines.forEach(line => {
      const vol = line.volume || 0;
      const qty = line.qty || 1;
      const l = line.length || 0;

      total += vol;
      pieces += qty;

      if (l >= 7) {
        larga += vol;
      } else if (l >= 3) {
        corta += vol;
      } else {
        finger += vol;
      }
    });

    return { total, larga, corta, finger, pieces };
  }, [lines]);

  const combinedHistory = useMemo(() => {
    let offlineHistory: any[] = [];
    try {
      const offlineHistoryJson = localStorage.getItem('mabet_offline_history') || '[]';
      offlineHistory = JSON.parse(offlineHistoryJson);
    } catch (e) {
      console.error("No se pudo cargar el historial offline", e);
    }
    
    // Filter out offline items that are already synced, checking by packageId
    const syncedPackageIds = new Set(history.map(item => item.packageId));
    const activeOffline = offlineHistory.filter(item => !syncedPackageIds.has(item.packageId));
    
    return [...activeOffline, ...history];
  }, [history]);

  const filteredHistory = useMemo(() => {
    return combinedHistory.filter(item => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'aserradero') {
        return !item.tipoRomaneo || item.tipoRomaneo === 'aserradero';
      }
      if (historyFilter === 'playa') {
        return item.tipoRomaneo === 'playa';
      }
      return true;
    });
  }, [combinedHistory, historyFilter]);

  const handleIncrement = (width: number) => {
    playFeedback('plus');
    const vol = (1 * thickness * width * length) / 12;
    let category: 'Larga' | 'Corta' | 'Finger' = 'Finger';
    if (length >= 7) category = 'Larga';
    else if (length >= 3) category = 'Corta';

    const newLine = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      species,
      thickness,
      length,
      width,
      volume: vol,
      category,
      location,
      user: user?.displayName || user?.email || "Anónimo"
    };

    setLines(prev => [...prev, newLine]);
  };

  const handleDecrement = (width: number) => {
    playFeedback('minus');
    setLines(prev => {
      // Find the last line matching current length, width, thickness, and species
      const lastIndex = [...prev].reverse().findIndex(l => 
        l.length === length && 
        l.width === width && 
        l.thickness === thickness &&
        l.species === species
      );
      if (lastIndex === -1) return prev;
      const actualIndex = prev.length - 1 - lastIndex;
      return prev.filter((_, i) => i !== actualIndex);
    });
  };

  const handleAddCamada = () => {
    playFeedback('plus');
    const vol = (camadaQty * thickness * camadaWidth * length) / 12;
    let category: 'Larga' | 'Corta' | 'Finger' = 'Finger';
    if (length >= 7) category = 'Larga';
    else if (length >= 3) category = 'Corta';

    const newLine = {
       id: "C-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
       timestamp: Date.now(),
       species,
       thickness,
       length,
       width: camadaWidth,
       volume: vol,
       category,
       qty: camadaQty,
       location,
       user: user?.displayName || user?.email || "Anónimo"
     };
 
     setLines(prev => [...prev, newLine]);

    setSyncStatusMsg(`Camada registrada: L:${length}' A:${camadaWidth}" x ${camadaQty} pzas.`);
    setTimeout(() => {
      setSyncStatusMsg(null);
    }, 3000);
  };

  const handleRemoveLine = (lineId: string) => {
    playFeedback('minus');
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleReset = () => {
    setPackageUuid(generateUUID());
    setPackageId(generatePackageId(tipoRomaneo));
    setLines([]);
    setCurrentDocId(null);
    setShowResetConfirm(false);
  };

  const handleDeleteAllRomaneos = async () => {
    if (deleteConfirmText.trim() !== "ELIMINAR TODO") {
      alert("Por favor, escribe exactamente 'ELIMINAR TODO' para proceder.");
      return;
    }
    setIsDeletingAll(true);
    try {
      const q = query(collection(db, 'romaneos'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'romaneos', docSnap.id)));
      await Promise.all(deletePromises);

      localStorage.removeItem('mabet_offline_history');
      localStorage.removeItem('mabet_pending_sync');
      localStorage.removeItem('mabet_package_sequences');

      setHistory([]);
      setPendingSyncCount(0);
      
      setPackageUuid(generateUUID());
      setPackageId(generatePackageId(tipoRomaneo));
      setLines([]);
      setCurrentDocId(null);

      setSyncStatusMsg("Todos los romaneos del sistema han sido eliminados.");
      setTimeout(() => setSyncStatusMsg(null), 4000);
      
      setShowDangerZoneConfirm(false);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Error al eliminar los romaneos:", err);
      alert("Error al eliminar los romaneos: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleRestoreTestData = async () => {
    setIsRestoringData(true);
    setSyncStatusMsg("Generando registros de prueba realistas...");

    try {
      const email = user ? (user.email || "Anónimo") : "test@example.com";
      const name = user ? (user.displayName || email) : "Supervisor de Pruebas";
      const uid = user ? user.uid : "offline_user_id";

      const baseNow = Date.now();

      const testPackages = [
        {
          id: "test_pkg_001_" + baseNow,
          packageId: "ASE-2026-P001",
          packageUuid: "test_pkg_uuid_001_" + Math.random().toString(36).substring(2),
          species: "Almendrillo Amarillo",
          aserradero: "1",
          tipoRomaneo: "aserradero",
          calidad: "Primera",
          op: "",
          date: "28/05/26",
          thickness: 1,
          totalVolume: 2.3166,
          largaVolume: 2.0666,
          cortaVolume: 0.2000,
          fingerVolume: 0.0500,
          totalPieces: 6,
          userName: name,
          createdBy: uid,
          counts: {
            "2": { "3": 1 },
            "6": { "4": 1 },
            "8": { "5": 1, "6": 1 },
            "10": { "8": 2 }
          },
          lines: [
            {
              id: "L-1-1",
              length: 8,
              width: 5,
              qty: 1,
              volume: 0.3333,
              species: "Almendrillo Amarillo",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4955, lng: -68.1332 },
              timestamp: new Date(baseNow - 3600000 * 4).toISOString()
            },
            {
              id: "L-1-2",
              length: 8,
              width: 6,
              qty: 1,
              volume: 0.4000,
              species: "Almendrillo Amarillo",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4956, lng: -68.1333 },
              timestamp: new Date(baseNow - 3600000 * 3.9).toISOString()
            },
            {
              id: "L-1-3",
              length: 10,
              width: 8,
              qty: 2,
              volume: 1.3333,
              species: "Almendrillo Amarillo",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4957, lng: -68.1334 },
              timestamp: new Date(baseNow - 3600000 * 3.8).toISOString()
            },
            {
              id: "L-1-4",
              length: 6,
              width: 4,
              qty: 1,
              volume: 0.2000,
              species: "Almendrillo Amarillo",
              thickness: 1,
              category: "Corta",
              user: email,
              location: { lat: -16.4958, lng: -68.1335 },
              timestamp: new Date(baseNow - 3600000 * 3.7).toISOString()
            },
            {
              id: "L-1-5",
              length: 2,
              width: 3,
              qty: 1,
              volume: 0.0500,
              species: "Almendrillo Amarillo",
              thickness: 1,
              category: "Finger",
              user: email,
              location: { lat: -16.4959, lng: -68.1336 },
              timestamp: new Date(baseNow - 3600000 * 3.6).toISOString()
            }
          ]
        },
        {
          id: "test_pkg_002_" + baseNow,
          packageId: "PLA-2026-P002",
          packageUuid: "test_pkg_uuid_002_" + Math.random().toString(36).substring(2),
          species: "Cedro",
          aserradero: "N/A",
          tipoRomaneo: "playa",
          calidad: "Segunda",
          op: "",
          date: "28/05/26",
          thickness: 1.5,
          totalVolume: 6.1,
          largaVolume: 5.1,
          cortaVolume: 1.0,
          fingerVolume: 0.0,
          totalPieces: 9,
          userName: name,
          createdBy: uid,
          counts: {
            "4": { "5": 4 },
            "12": { "6": 3, "8": 2 }
          },
          lines: [
            {
              id: "L-2-1",
              length: 12,
              width: 6,
              qty: 3,
              volume: 2.7000,
              species: "Cedro",
              thickness: 1.5,
              category: "Larga",
              user: email,
              location: { lat: -16.4960, lng: -68.1340 },
              timestamp: new Date(baseNow - 3600000 * 3).toISOString()
            },
            {
              id: "L-2-2",
              length: 12,
              width: 8,
              qty: 2,
              volume: 2.4000,
              species: "Cedro",
              thickness: 1.5,
              category: "Larga",
              user: email,
              location: { lat: -16.4961, lng: -68.1341 },
              timestamp: new Date(baseNow - 3600000 * 2.9).toISOString()
            },
            {
              id: "L-2-3",
              length: 4,
              width: 5,
              qty: 4,
              volume: 1.0000,
              species: "Cedro",
              thickness: 1.5,
              category: "Corta",
              user: email,
              location: { lat: -16.4962, lng: -68.1342 },
              timestamp: new Date(baseNow - 3600000 * 2.8).toISOString()
            }
          ]
        },
        {
          id: "test_pkg_003_" + baseNow,
          packageId: "PLA-2026-C003",
          packageUuid: "test_pkg_uuid_003_" + Math.random().toString(36).substring(2),
          species: "Morado",
          aserradero: "N/A",
          tipoRomaneo: "playa",
          calidad: "Primera",
          op: "",
          date: "28/05/26",
          thickness: 1,
          totalVolume: 14.4000,
          largaVolume: 14.4000,
          cortaVolume: 0.0,
          fingerVolume: 0.0,
          totalPieces: 36,
          userName: name,
          createdBy: uid,
          counts: {
            "8": { "6": 36 }
          },
          lines: [
            {
              id: "L-3-1",
              length: 8,
              width: 6,
              qty: 12,
              volume: 4.8000,
              species: "Morado",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4965, lng: -68.1350 },
              timestamp: new Date(baseNow - 3600000 * 2).toISOString()
            },
            {
              id: "L-3-2",
              length: 8,
              width: 6,
              qty: 12,
              volume: 4.8000,
              species: "Morado",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4966, lng: -68.1351 },
              timestamp: new Date(baseNow - 3600000 * 1.9).toISOString()
            },
            {
              id: "L-3-3",
              length: 8,
              width: 6,
              qty: 12,
              volume: 4.8000,
              species: "Morado",
              thickness: 1,
              category: "Larga",
              user: email,
              location: { lat: -16.4967, lng: -68.1352 },
              timestamp: new Date(baseNow - 3600000 * 1.8).toISOString()
            }
          ]
        },
        {
          id: "test_pkg_004_" + baseNow,
          packageId: "ASE-2026-P004",
          packageUuid: "test_pkg_uuid_004_" + Math.random().toString(36).substring(2),
          species: "Tajibo",
          aserradero: "1",
          tipoRomaneo: "aserradero",
          calidad: "Primera",
          op: "",
          date: "28/05/26",
          thickness: 2,
          totalVolume: 3.2500,
          largaVolume: 3.0000,
          cortaVolume: 0.2500,
          fingerVolume: 0.0000,
          totalPieces: 3,
          userName: name,
          createdBy: uid,
          counts: {
            "5": { "3": 1 },
            "10": { "8": 1, "10": 1 }
          },
          lines: [
            {
              id: "L-4-1",
              length: 10,
              width: 8,
              qty: 1,
              volume: 1.3333,
              species: "Tajibo",
              thickness: 2,
              category: "Larga",
              user: email,
              location: { lat: -16.4970, lng: -68.1360 },
              timestamp: new Date(baseNow - 3600000 * 1).toISOString()
            },
            {
              id: "L-4-2",
              length: 10,
              width: 10,
              qty: 1,
              volume: 1.6667,
              species: "Tajibo",
              thickness: 2,
              category: "Larga",
              user: email,
              location: { lat: -16.4971, lng: -68.1361 },
              timestamp: new Date(baseNow - 3600000 * 0.9).toISOString()
            },
            {
              id: "L-4-3",
              length: 5,
              width: 3,
              qty: 1,
              volume: 0.2500,
              species: "Tajibo",
              thickness: 2,
              category: "Corta",
              user: email,
              location: { lat: -16.4972, lng: -68.1362 },
              timestamp: new Date(baseNow - 3600000 * 0.8).toISOString()
            }
          ]
        }
      ];

      // Save to Firebase (only if user is authenticated and online)
      if (user) {
        const promises = testPackages.map(pkg => {
          const docRef = doc(db, 'romaneos', pkg.packageUuid);
          return setDoc(docRef, {
            ...pkg,
            id: pkg.packageUuid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        await Promise.all(promises);
      }

      // Save to localStorage of the modern browser context immediately
      const historyJson = localStorage.getItem('mabet_offline_history') || '[]';
      const historyItems = JSON.parse(historyJson);
      const testIds = new Set(testPackages.map(p => p.packageUuid));
      const filteredHistoryCache = historyItems.filter((item: any) => !testIds.has(item.packageUuid || item.id));
      const updatedHistoryCache = [...testPackages, ...filteredHistoryCache];
      localStorage.setItem('mabet_offline_history', JSON.stringify(updatedHistoryCache));

      // Update state if history is already loaded
      setHistory(prev => {
        const filteredPrev = prev.filter(item => !testIds.has(item.packageUuid || item.id));
        return [...testPackages, ...filteredPrev];
      });

      // Set sequence tracking
      const trackingJson = localStorage.getItem('mabet_package_sequences') || '{}';
      const tracking = JSON.parse(trackingJson);
      tracking['ASE-2026-P'] = Math.max(tracking['ASE-2026-P'] || 0, 4);
      tracking['PLA-2026-P'] = Math.max(tracking['PLA-2026-P'] || 0, 2);
      tracking['PLA-2026-C'] = Math.max(tracking['PLA-2026-C'] || 0, 3);
      localStorage.setItem('mabet_package_sequences', JSON.stringify(tracking));

      setSyncStatusMsg("Se han restaurado 4 paquetes de prueba realistas exitosamente.");
      setTimeout(() => setSyncStatusMsg(null), 4000);
      setShowRestoreConfirm(false);
    } catch (err) {
      console.error("Error al restaurar los registros de prueba:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncStatusMsg(`Error al restaurar registros: Se produjo un inconveniente (${errMsg})`);
      setTimeout(() => setSyncStatusMsg(null), 8000);
    } finally {
      setIsRestoringData(false);
    }
  };

  const saveToCloud = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const match = packageId.match(/^([A-Z]{3}-\d{4}-[PW])(\d{3})$/);
      if (match) {
        const basePref = match[1];
        const seq = parseInt(match[2], 10);
        const trackingJson = localStorage.getItem('mabet_package_sequences') || '{}';
        const tracking = JSON.parse(trackingJson);
        const currentMax = tracking[basePref] || 0;
        if (seq > currentMax) {
          tracking[basePref] = seq;
          localStorage.setItem('mabet_package_sequences', JSON.stringify(tracking));
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    const data = {
      packageId,
      packageUuid,
      species,
      aserradero: tipoRomaneo === 'aserradero' ? aserradero : "N/A",
      tipoRomaneo,
      calidad,
      op: "",
      date,
      thickness,
      counts,
      lines,
      totalVolume: volumes.total,
      largaVolume: volumes.larga,
      cortaVolume: volumes.corta,
      fingerVolume: volumes.finger,
      totalPieces: volumes.pieces,
      userName: user.displayName || user.email || "Anónimo",
      createdBy: user.uid,
      updatedAt: new Date().toISOString()
    };

    const isAppOffline = !navigator.onLine;

    if (isAppOffline) {
      try {
        const pendingJson = localStorage.getItem('mabet_pending_sync') || '[]';
        const pendingItems = JSON.parse(pendingJson);
        const offlineId = currentDocId || `offline_${Date.now()}`;
        
        const offlineDoc = {
          ...data,
          id: offlineId,
          createdAt: new Date().toISOString(),
          isOffline: true
        };
        
        const filteredPending = pendingItems.filter((item: any) => item.id !== offlineId);
        filteredPending.push(offlineDoc);
        localStorage.setItem('mabet_pending_sync', JSON.stringify(filteredPending));
        setPendingSyncCount(filteredPending.length);
        
        const historyJson = localStorage.getItem('mabet_offline_history') || '[]';
        const historyItems = JSON.parse(historyJson);
        const filteredHistoryCache = historyItems.filter((item: any) => item.id !== offlineId);
        filteredHistoryCache.unshift(offlineDoc);
        localStorage.setItem('mabet_offline_history', JSON.stringify(filteredHistoryCache));
        
        setCurrentDocId(offlineId);
        setSyncStatusMsg("Avance guardado localmente (Offline).");
        setTimeout(() => setSyncStatusMsg(null), 5000);
      } catch (err) {
        console.error("Error saving local history:", err);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      const dataWithTimestamp = {
        ...data,
        updatedAt: serverTimestamp()
      };

      if (currentDocId && !currentDocId.startsWith('offline_')) {
        await updateDoc(doc(db, 'romaneos', currentDocId), dataWithTimestamp);
      } else {
        await setDoc(doc(db, 'romaneos', packageUuid), {
          ...dataWithTimestamp,
          createdAt: serverTimestamp()
        });
        setCurrentDocId(packageUuid);
      }
      setSyncStatusMsg("Avance guardado exitosamente en la nube.");
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } catch (error) {
      console.error("Error saving online, fallback to local:", error);
      try {
        const pendingJson = localStorage.getItem('mabet_pending_sync') || '[]';
        const pendingItems = JSON.parse(pendingJson);
        const offlineId = currentDocId || `offline_${Date.now()}`;
        
        const offlineDoc = {
          ...data,
          id: offlineId,
          createdAt: new Date().toISOString(),
          isOffline: true
        };
        
        const filteredPending = pendingItems.filter((item: any) => item.id !== offlineId);
        filteredPending.push(offlineDoc);
        localStorage.setItem('mabet_pending_sync', JSON.stringify(filteredPending));
        setPendingSyncCount(filteredPending.length);
        
        const historyJson = localStorage.getItem('mabet_offline_history') || '[]';
        const historyItems = JSON.parse(historyJson);
        const filteredHistoryCache = historyItems.filter((item: any) => item.id !== offlineId);
        filteredHistoryCache.unshift(offlineDoc);
        localStorage.setItem('mabet_offline_history', JSON.stringify(filteredHistoryCache));
        
        setCurrentDocId(offlineId);
        setSyncStatusMsg("Guardado localmente por inestabilidad de red.");
        setTimeout(() => setSyncStatusMsg(null), 5000);
      } catch (err) {
        console.error("Fallback error:", err);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = (romaneo: any) => {
    const delimiter = ";";
    const headers = [
      "ID Línea", "Fecha", "ID PKG", "Aserradero", "OP", "Espesor", "Largo", "Ancho", "Cantidad", "Volumen [pt]", "CategoríaLargo",
      "Especie", "Calidad", "Módulo", "Timestamp", "Latitud", "Longitud", "Usuario"
    ];
    
    const escapeCSV = (val: any) => {
      const s = val === null || val === undefined ? "" : String(val);
      // Double quotes around everything to prevent Excel from "fixing" dots/commas
      // and handle internal quotes/commas
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = (romaneo.lines || []).map((line: any, index: number) => {
      const dateObj = new Date(line.timestamp || Date.now());
      // DD/MM/YY format for cleaner Latin American representation
      const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear().toString().slice(-2)}`;
      const formattedTime = dateObj.toLocaleTimeString('es-ES', { hour12: false });
      const timestampFull = `${formattedDate} ${formattedTime}`;
      
      // Ensure coordinates are strings with dots as decimal separators
      const lat = line.location?.lat != null ? 
        Number(line.location.lat).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 8, maximumFractionDigits: 8 }) : "";
      const lng = line.location?.lng != null ? 
        Number(line.location.lng).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 8, maximumFractionDigits: 8 }) : "";
      
      const lineCategory = line.category === 'Larga' ? 'Larga' : line.category === 'Corta' ? 'Corta' : 'Finger';
      const rowData = [
        line.id || `L-${index}`,
        formattedDate,
        romaneo.packageId,
        romaneo.aserradero || "N/A",
        romaneo.op || "",
        line.thickness,
        line.length,
        line.width,
        line.qty ?? 1,
        line.volume.toFixed(4),
        lineCategory,
        // Remaining recommended fields
        romaneo.species || "N/A",
        romaneo.calidad || "Primera",
        romaneo.tipoRomaneo === 'playa' ? 'Playa' : 'Aserradero',
        timestampFull,
        lat,
        lng,
        line.user || romaneo.createdBy || "N/A"
      ];

      return rowData.map(escapeCSV).join(delimiter);
    });

    const csvContent = `sep=${delimiter}\n` + headers.map(escapeCSV).join(delimiter) + "\n" + rows.join("\n");
    // UTF-8 Byte Order Mark (BOM) to force Excel to open in UTF-8
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    // Filename format: Romaneo_DDMMYY_HHMM_Especie_ID-PKG
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const filename = `Romaneo_${dd}${mm}${yy}_${hh}${min}_${romaneo.species}_${romaneo.packageId}.csv`.replace(/\s+/g, '_');

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSummaryToCSV = (romaneo: any) => {
    const delimiter = ";";
    const headers = ["Espesor", "Largo", "Ancho", "Módulo", "Calidad", "Piezas", "Volumen Total (PT)"];
    
    const escapeCSV = (val: any) => {
      const s = val === null || val === undefined ? "" : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const summary: Record<string, { thickness: number, length: number, width: number, qty: number, vol: number }> = {};
    
    (romaneo.lines || []).forEach((line: any) => {
      const key = `${line.thickness}-${line.length}-${line.width}`;
      if (!summary[key]) {
        summary[key] = { 
          thickness: line.thickness, 
          length: line.length, 
          width: line.width, 
          qty: 0, 
          vol: 0 
        };
      }
      summary[key].qty += (line.qty ?? 1);
      summary[key].vol += line.volume;
    });

    const rows = Object.values(summary).sort((a: any, b: any) => {
      if (a.thickness !== b.thickness) return a.thickness - b.thickness;
      if (a.length !== b.length) return b.length - a.length;
      return a.width - b.width;
    }).map(item => {
      const rowData = [
        item.thickness,
        item.length,
        item.width,
        romaneo.tipoRomaneo === 'playa' ? 'Playa' : 'Aserradero',
        romaneo.calidad || "Primera",
        item.qty,
        item.vol.toFixed(4)
      ];
      return rowData.map(escapeCSV).join(delimiter);
    });

    const csvContent = `sep=${delimiter}\n` + headers.map(escapeCSV).join(delimiter) + "\n" + rows.join("\n");
    // UTF-8 Byte Order Mark (BOM) to force Excel to open in UTF-8
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const filename = `Resumen_${dd}${mm}${yy}_${hh}${min}_${romaneo.species}_${romaneo.packageId}.csv`.replace(/\s+/g, '_');

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGlobalRegistry = async (submodule: 'aserradero' | 'playa') => {
    try {
      setSyncStatusMsg(`Generando registro global de ${submodule}...`);
      
      const q = query(collection(db, 'romaneos'));
      const snapshot = await getDocs(q);
      
      let romaneos = snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data() as any 
      }));

      let offlineHistory: any[] = [];
      try {
        const offlineHistoryJson = localStorage.getItem('mabet_offline_history') || '[]';
        offlineHistory = JSON.parse(offlineHistoryJson);
      } catch (e) {
        console.error("Local history read error:", e);
      }
      
      const syncedIds = new Set(romaneos.map(item => item.packageUuid || item.id));
      const activeOffline = offlineHistory.filter(item => !syncedIds.has(item.packageUuid || item.id));
      romaneos = [...activeOffline, ...romaneos];

      const filteredRomaneos = romaneos.filter(item => {
        if (submodule === 'aserradero') {
          return !item.tipoRomaneo || item.tipoRomaneo === 'aserradero';
        } else {
          return item.tipoRomaneo === 'playa';
        }
      });

      if (filteredRomaneos.length === 0) {
        alert(`No hay registros de romaneos para el submódulo ${submodule}.`);
        setSyncStatusMsg(null);
        return;
      }

      const allLines: any[] = [];
      filteredRomaneos.forEach(romaneo => {
        const linesArr = romaneo.lines || [];
        linesArr.forEach((line: any, idx: number) => {
          allLines.push({
            ...line,
            parentRomaneo: romaneo,
            originalIndex: idx
          });
        });
      });

      if (allLines.length === 0) {
        alert("Los paquetes encontrados no contienen líneas de registro.");
        setSyncStatusMsg(null);
        return;
      }

      allLines.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.parentRomaneo.createdAt || a.parentRomaneo.updatedAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.parentRomaneo.createdAt || b.parentRomaneo.updatedAt || 0).getTime();
        return timeA - timeB;
      });

      const delimiter = ";";
      const headers = [
        "ID Línea", "Fecha", "ID PKG", "Aserradero", "OP", "Espesor", "Largo", "Ancho", "Cantidad", "Volumen [pt]", "CategoríaLargo",
        "Especie", "Calidad", "Módulo", "Timestamp", "Latitud", "Longitud", "Usuario"
      ];

      const escapeCSV = (val: any) => {
        const s = val === null || val === undefined ? "" : String(val);
        return `"${s.replace(/"/g, '""')}"`;
      };

      const rows = allLines.map((line: any) => {
        const dateObj = new Date(line.timestamp || line.parentRomaneo.createdAt || line.parentRomaneo.updatedAt || Date.now());
        // DD/MM/YY format for cleaner Latin American representation
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear().toString().slice(-2)}`;
        const formattedTime = dateObj.toLocaleTimeString('es-ES', { hour12: false });
        const timestampFull = `${formattedDate} ${formattedTime}`;

        const lat = line.location?.lat != null ? 
          Number(line.location.lat).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 8, maximumFractionDigits: 8 }) : "";
        const lng = line.location?.lng != null ? 
          Number(line.location.lng).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 8, maximumFractionDigits: 8 }) : "";

        const lineCategory = line.category === 'Larga' ? 'Larga' : line.category === 'Corta' ? 'Corta' : 'Finger';
        
        const rowData = [
          line.id || `L-${line.originalIndex}`,
          formattedDate,
          line.parentRomaneo.packageId,
          line.parentRomaneo.aserradero || "N/A",
          line.parentRomaneo.op || "",
          line.thickness,
          line.length,
          line.width,
          line.qty ?? 1,
          (line.volume || 0).toFixed(4),
          lineCategory,
          // Remaining recommended fields
          line.parentRomaneo.species || "N/A",
          line.parentRomaneo.calidad || "Primera",
          line.parentRomaneo.tipoRomaneo === 'playa' ? 'Playa' : 'Aserradero',
          timestampFull,
          lat,
          lng,
          line.user || line.parentRomaneo.createdBy || "N/A"
        ];

        return rowData.map(escapeCSV).join(delimiter);
      });

      const csvContent = `sep=${delimiter}\n` + headers.map(escapeCSV).join(delimiter) + "\n" + rows.join("\n");
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      const filename = `Registro_Global_${submodule === 'aserradero' ? 'Aserradero' : 'Playa'}_${dd}${mm}${yy}_${hh}${min}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSyncStatusMsg(`Registro global de ${submodule} descargado.`);
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (error) {
      console.error("Error generating global registry:", error);
      alert("Error al generar el registro global: " + (error instanceof Error ? error.message : String(error)));
      setSyncStatusMsg(null);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('counting');
  };

  const currentLengthCounts = useMemo(() => {
    const res = Object.fromEntries(widths.map(w => [w, 0]));
    lines.forEach(line => {
      if (
        line.length === length &&
        line.species === species &&
        line.thickness === thickness
      ) {
        const wid = line.width;
        const qty = line.qty || 1;
        res[wid] = (res[wid] || 0) + qty;
      }
    });
    return res;
  }, [lines, length, species, thickness, widths]);
  const currentLengthVolume = Object.entries(currentLengthCounts).reduce((acc: number, [w, qty]: [string, number]) => {
    return acc + (qty * thickness * Number(w) * (length || 0)) / 12;
  }, 0);

  if (quotaError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-sm space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-brand-secondary">Límite de Uso Alcanzado</h2>
          <p className="text-slate-500 text-sm">
            La aplicación ha alcanzado el límite de consultas gratuitas de hoy. 
            El acceso se restaurará automáticamente mañana.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-brand-primary text-white p-4 rounded-2xl font-bold shadow-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isSplash) {
    return (
      <motion.div 
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8"
      >
        <motion.img 
          src={LOGO_URL}
          alt="Logo"
          referrerPolicy="no-referrer"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-48 h-48 object-contain mb-8"
        />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black text-brand-primary tracking-tighter mb-2">MABET</h1>
          <p className="text-brand-secondary/60 font-bold uppercase tracking-[0.2em] text-sm">Romaneo</p>
        </motion.div>
      </motion.div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-brand-secondary">
        <img src={LOGO_URL} alt="Logo" className="w-32 h-32 object-contain mb-8" referrerPolicy="no-referrer" />
        <h1 className="text-2xl font-black mb-2">Bienvenido a MABET</h1>
        <p className="text-slate-500 mb-8 text-center">Inicia sesión con tu cuenta de Google para comenzar.</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-xs bg-white border-2 border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continuar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-xl overflow-hidden text-brand-secondary relative">
      {/* Header */}
      <header className="bg-brand-primary text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="w-8 h-8 object-contain bg-white/20 rounded-lg p-1"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xl font-bold leading-none">MABET Romaneo</h1>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-[10px] text-white/80">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 border border-emerald-500 animate-pulse' : 'bg-amber-400 border border-amber-500'}`}></span>
                {isOnline ? "Conectado" : "Guardado local (Offline)"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button 
                onClick={() => setView(view === 'admin' || view === 'history' ? 'counting' : (userRole === 'admin' ? 'admin' : 'history'))}
                className={`p-2 rounded-full transition-colors ${(view === 'admin' || view === 'history') ? 'bg-white text-brand-primary' : 'bg-white/20 hover:bg-white/30'}`}
              >
                {userRole === 'admin' ? <Settings className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl text-xs">
            <UserIcon className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{user.displayName}</span>
            {userRole === 'admin' && <ShieldCheck className="w-3 h-3 text-yellow-400" />}
            {userRole === 'supervisor' && <Info className="w-3 h-3 text-blue-400" />}
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl text-xs font-mono">
            <Hash className="w-3 h-3" />
            <span>{packageId}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        <AnimatePresence>
          {syncStatusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-extrabold p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 animate-pulse text-brand-primary" />
                <span>{syncStatusMsg}</span>
              </div>
              {pendingSyncCount > 0 && (
                <span className="bg-brand-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  {pendingSyncCount} cola
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'counting' ? (
          !canUseAserradero && !canUsePlaya ? (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-center space-y-4 shadow-sm shadow-amber-500/5 my-4">
              <div className="w-12 h-12 bg-amber-100/80 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-brand-secondary uppercase tracking-wider">Módulos Desactivados</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Tu usuario no tiene asignado acceso al módulo de <strong className="text-brand-secondary">Aserradero</strong> ni de <strong className="text-brand-secondary">Playa</strong>.
                </p>
              </div>
              <div className="bg-white/80 border border-amber-100 rounded-2xl p-4 text-[11px] text-slate-400 font-bold leading-relaxed">
                Por favor, de ser necesario, solicita a un administrador que asigne tus permisos de acceso correspondientes.
              </div>
            </div>
          ) : (
            <>
              {/* Información de Paquete & GPS Status */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Información de Paquete</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-brand-secondary/40 uppercase">
                    <Box className="w-3 h-3" /> ID Paquete
                  </label>
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-xs sm:text-sm font-black text-brand-secondary truncate select-all flex items-center min-h-[44px]">
                    {packageId}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-brand-secondary/40 uppercase">
                    <Calendar className="w-3 h-3" /> Fecha
                  </label>
                  <div className="w-full bg-slate-50 rounded-xl p-3 text-sm font-black text-brand-secondary">{date}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${locationAccuracy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                     GPS: {locationAccuracy ? `Activo (±${Math.round(locationAccuracy)}m)` : 'Buscando señal...'}
                   </span>
                </div>
                {location && (
                  <span className="text-[9px] font-mono text-slate-300">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                )}
              </div>
            </div>

            {/* Selector de Módulo */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                disabled={!canUseAserradero}
                onClick={() => {
                  setTipoRomaneo('aserradero');
                  setPackageId(generatePackageId('aserradero', 'piezas'));
                }}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${tipoRomaneo === 'aserradero' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Romaneo Aserradero {!canUseAserradero && "🔒"}
              </button>
              <button
                type="button"
                disabled={!canUsePlaya}
                onClick={() => {
                  setTipoRomaneo('playa');
                  setPackageId(generatePackageId('playa', submoduloPlaya));
                }}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${tipoRomaneo === 'playa' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Romaneo Playa {!canUsePlaya && "🔒"}
              </button>
            </div>

            {/* Submódulos de Playa */}
            {tipoRomaneo === 'playa' && (
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setSubmoduloPlaya('piezas');
                    setPackageId(generatePackageId('playa', 'piezas'));
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${submoduloPlaya === 'piezas' ? 'bg-white text-brand-primary shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Romaneo por Piezas (Contado)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmoduloPlaya('camadas');
                    setPackageId(generatePackageId('playa', 'camadas'));
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${submoduloPlaya === 'camadas' ? 'bg-white text-brand-primary shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Romaneo por Camadas (Wincheado)
                </button>
              </div>
            )}

            {/* Configuración de Especie, Aserradero y Calidad */}
            <div className="space-y-4">
              <section className="space-y-2">
                <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">
                  Especie
                </label>
                <div className="relative">
                  <select 
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    className="w-full bg-brand-secondary/5 border-none rounded-xl p-3 pl-4 appearance-none focus:ring-2 focus:ring-brand-primary transition-all font-medium text-sm"
                  >
                    {woodSpecies.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-secondary/40 pointer-events-none" />
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                {tipoRomaneo === 'aserradero' && (
                  <section className="space-y-2">
                    <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">
                      Aserradero
                    </label>
                    <div className="relative">
                      <select 
                        value={aserradero}
                        onChange={(e) => setAserradero(e.target.value)}
                        className="w-full bg-brand-secondary/5 border-none rounded-xl p-3 pl-4 appearance-none focus:ring-2 focus:ring-brand-primary transition-all font-medium text-sm"
                      >
                        <option value="1">1</option>
                        <option value="3">3</option>
                        <option value="Turbina">Turbina</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-secondary/40 pointer-events-none" />
                    </div>
                  </section>
                )}

                <section className={tipoRomaneo === 'aserradero' ? "space-y-2" : "col-span-2 space-y-2"}>
                  <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">
                    Calidad
                  </label>
                  <div className="relative">
                    <select 
                      value={calidad}
                      onChange={(e) => setCalidad(e.target.value as any)}
                      className="w-full bg-brand-secondary/5 border-none rounded-xl p-3 pl-4 appearance-none focus:ring-2 focus:ring-brand-primary transition-all font-medium text-sm"
                    >
                      <option value="Primera">Primera</option>
                      <option value="Segunda">Segunda</option>
                      <option value="Tercera">Tercera</option>
                      <option value="Rechazo">Rechazo</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-secondary/40 pointer-events-none" />
                  </div>
                </section>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">Espesor (pulg)</label>
                  <span className="text-brand-primary font-bold text-lg">{thickness}"</span>
                </div>
                {thicknesses.length > 0 ? (
                  <input 
                    type="range" 
                    min="0" 
                    max={thicknesses.length - 1} 
                    step="1" 
                    value={thicknesses.indexOf(thickness) === -1 ? 0 : thicknesses.indexOf(thickness)} 
                    onChange={(e) => setThickness(thicknesses[Number(e.target.value)])} 
                    className="w-full" 
                  />
                ) : (
                  <p className="text-[10px] text-red-500 font-bold italic">No hay espesores configurados</p>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">Largo (pies)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-16 bg-brand-secondary/5 border-none rounded-lg p-1 text-center font-bold text-brand-primary" min="1" />
                    <span className="text-brand-primary font-bold text-lg">{length}'</span>
                  </div>
                </div>
                {lengths.length > 0 ? (
                  <input 
                    type="range" 
                    min="0" 
                    max={lengths.length - 1} 
                    step="1" 
                    value={lengths.indexOf(length) === -1 ? 0 : lengths.indexOf(length)} 
                    onChange={(e) => setLength(lengths[Number(e.target.value)])} 
                    className="w-full" 
                  />
                ) : (
                  <p className="text-[10px] text-red-500 font-bold italic">No hay largos configurados</p>
                )}
              </section>
            </div>

            {/* Clicker Grid */}
            {tipoRomaneo === 'playa' && submoduloPlaya === 'camadas' ? (
              <div className="space-y-6">
                {/* Custom Conditional Width Slider */}
                <section className="space-y-3 bg-white p-5 rounded-3xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-brand-secondary/60 uppercase tracking-wider">
                      Ancho de camada
                    </label>
                    <span className="text-xl font-black text-brand-primary font-mono bg-brand-primary/5 px-3 py-1 rounded-xl">
                      {camadaWidth}" <span className="text-[10px] text-slate-400 font-bold uppercase">pulg</span>
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={widthRange.min} 
                    max={widthRange.max} 
                    step="1" 
                    value={camadaWidth} 
                    onChange={(e) => setCamadaWidth(Number(e.target.value))} 
                    className="w-full accent-brand-primary h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" 
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Min: {widthRange.min}"</span>
                    <span className="text-brand-primary">Largo {length}': Rango {length <= 4 ? "70-80\"" : "30-45\""}</span>
                    <span>Max: {widthRange.max}"</span>
                  </div>
                </section>

                {/* Dial Picker for Cantidad */}
                <section className="space-y-3 bg-white p-5 rounded-3xl border border-slate-200 flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-brand-secondary/60 uppercase tracking-wider">
                      Cantidad de camadas
                    </label>
                  </div>
                  
                  <DialPicker value={camadaQty} onChange={setCamadaQty} />
                </section>

                {/* Add layer button and Vol summary */}
                <div className="bg-brand-primary/5 p-4 rounded-3xl border border-brand-primary/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tight block">VOLUMEN REGISTRADO</span>
                    <span className="text-lg font-black text-brand-primary">
                      {((camadaQty * thickness * camadaWidth * length) / 12).toFixed(2)} PT
                    </span>
                  </div>
                  <button
                    onClick={handleAddCamada}
                    className="bg-brand-primary hover:bg-brand-primary/95 text-white py-3 px-6 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all text-xs uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> Registrar Camada
                  </button>
                </div>

                {/* Recently Registered Camadas List */}
                <section className="space-y-3">
                  <h4 className="text-xs font-black text-brand-secondary/60 uppercase tracking-wider px-1">Camadas en Paquete Actual ({lines.length})</h4>
                  {lines.length === 0 ? (
                    <div className="bg-slate-50/50 p-6 rounded-3xl text-center border-2 border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">No hay camadas registradas todavía.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {[...lines].reverse().map((line) => (
                        <div key={line.id} className="bg-white p-3 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-secondary/5 rounded-xl flex items-center justify-center border border-brand-secondary/10">
                              <span className="text-sm font-black text-brand-secondary">{line.length}'</span>
                            </div>
                            <div>
                              <p className="text-sm font-black text-brand-secondary">
                                {line.qty} pzas <span className="text-slate-400 font-bold text-xs">x {line.thickness}" x {line.width}"</span>
                              </p>
                              <p className="text-[10px] font-bold text-brand-primary">{line.volume.toFixed(2)} PT • ID: {line.id}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-500 p-2.5 rounded-xl transition-colors active:scale-90"
                            title="Eliminar esta camada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <section className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-brand-secondary/60 uppercase tracking-wider">Contador de Anchos</label>
                    <button 
                      onClick={() => setOneHandedMode(!oneHandedMode)}
                      className={`p-1.5 rounded-lg transition-all ${oneHandedMode ? 'bg-brand-primary text-white shadow-md' : 'bg-brand-secondary/5 text-brand-secondary/40'}`}
                      title="Modo una mano"
                    >
                      <Hand className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-brand-secondary/40 uppercase block">Vol para {length}'</span>
                    <span className="text-sm font-bold text-brand-primary">{currentLengthVolume.toFixed(2)} PT</span>
                  </div>
                </div>

                {oneHandedMode && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-primary/5 p-3 rounded-2xl space-y-3 border border-brand-primary/10"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-brand-primary uppercase tracking-tighter">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setOneHandedSide('left')}
                          className={`flex items-center gap-1 p-1 rounded ${oneHandedSide === 'left' ? 'text-brand-primary shadow-sm bg-white' : 'text-slate-400'}`}
                        >
                          <ArrowLeftRight className="w-3 h-3" /> Zurdo
                        </button>
                        <button 
                          onClick={() => setOneHandedSide('right')}
                          className={`flex items-center gap-1 p-1 rounded ${oneHandedSide === 'right' ? 'text-brand-primary shadow-sm bg-white' : 'text-slate-400'}`}
                        >
                          Diestro <ArrowLeftRight className="w-3 h-3 rotate-180" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <span>Ancho: {oneHandedWidth}%</span>
                        <input 
                          type="range" 
                          min="50" 
                          max="100" 
                          step="5"
                          value={oneHandedWidth}
                          onChange={(e) => setOneHandedWidth(Number(e.target.value))}
                          className="flex-1 accent-brand-primary h-1"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div 
                  className={`flex w-full ${oneHandedMode ? (oneHandedSide === 'left' ? 'justify-start' : 'justify-end') : 'justify-start'}`}
                >
                  <div 
                    className={`grid gap-2 ${oneHandedMode ? 'grid-cols-3' : 'grid-cols-4'} transition-all duration-300`}
                    style={{ width: oneHandedMode ? `${oneHandedWidth}%` : '100%' }}
                  >
                    {widths.map(width => {
                      const qty = currentLengthCounts[width] || 0;
                      const widthVol = (qty * thickness * Number(width) * (length || 0)) / 12;
                      return (
                        <div key={width} className="relative group">
                          <button
                            onClick={() => handleIncrement(width)}
                            className={`w-full bg-brand-secondary/5 border-2 border-brand-secondary/10 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${oneHandedMode ? 'p-4' : 'p-3'}`}
                          >
                            <span className={`${oneHandedMode ? 'text-xl' : 'text-lg'} font-bold text-brand-secondary`}>{width}"</span>
                            <span className="text-brand-primary font-bold text-xs">{qty} pzas</span>
                            <span className="text-[9px] text-brand-secondary/40">{widthVol.toFixed(2)} PT</span>
                          </button>
                          {qty > 0 && (
                            <button onClick={() => handleDecrement(width)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg z-10"><Minus className="w-2.5 h-2.5" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={saveToCloud}
                disabled={isSaving || volumes.pieces === 0}
                className="w-full bg-brand-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <CloudUpload className="w-5 h-5" />
                {isSaving ? "Guardando..." : "Guardar Avance"}
              </button>
              
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-slate-100 text-brand-secondary p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Nuevo Romaneo
              </button>
            </div>
          </>
          )
        ) : view === 'admin' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Panel de Admin</h2>
              <button onClick={() => setView('history')} className="text-xs font-bold text-brand-primary flex items-center gap-1">
                Ver Historial <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <section className="bg-slate-50 p-4 rounded-2xl space-y-4">
              <h3 className="font-bold flex items-center gap-2"><TreeDeciduous className="w-4 h-4" /> Gestionar Especies</h3>
              <div className="flex gap-2">
                <input id="new-species" type="text" placeholder="Nueva especie..." className="flex-1 p-2 rounded-lg border-none bg-white text-sm" />
                <button 
                  onClick={async () => {
                    const input = document.getElementById('new-species') as HTMLInputElement;
                    if (input.value) {
                      const newList = [...woodSpecies, input.value];
                      await setDoc(doc(db, 'config', 'species'), { list: newList }, { merge: true });
                      input.value = "";
                    }
                  }}
                  className="bg-brand-primary text-white px-4 rounded-lg text-sm font-bold"
                >Agregar</button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {woodSpecies.map(s => (
                  <div key={s} className="flex items-center justify-between bg-white p-2 rounded-lg text-sm">
                    <span>{s}</span>
                    <button onClick={async () => {
                      const newList = woodSpecies.filter(item => item !== s);
                      await setDoc(doc(db, 'config', 'species'), { list: newList }, { merge: true });
                    }}><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-2xl space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Settings className="w-4 h-4" /> Gestionar Dimensiones</h3>
              
              <div className="space-y-4">
                {/* Widths */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Anchos (pulg)</label>
                  <div className="flex gap-2">
                    <input id="new-width" type="number" placeholder="Nuevo..." className="flex-1 p-2 rounded-lg border-none bg-white text-sm" />
                    <button onClick={async () => {
                      const input = document.getElementById('new-width') as HTMLInputElement;
                      if (input.value) {
                        const newList = [...widths, Number(input.value)].sort((a, b) => a - b);
                        await setDoc(doc(db, 'config', 'measurements'), { widths: newList }, { merge: true });
                        input.value = "";
                      }
                    }} className="bg-brand-primary text-white px-3 rounded-lg text-xs font-bold">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {widths.map(w => (
                      <div key={w} className="bg-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-slate-200">
                        <span>{w}"</span>
                        <button onClick={async () => {
                          const newList = widths.filter(item => item !== w);
                          await setDoc(doc(db, 'config', 'measurements'), { widths: newList }, { merge: true });
                        }}><Plus className="w-3 h-3 rotate-45 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thicknesses */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Espesores (pulg)</label>
                  <div className="flex gap-2">
                    <input id="new-thickness" type="number" step="0.25" placeholder="Nuevo..." className="flex-1 p-2 rounded-lg border-none bg-white text-sm" />
                    <button onClick={async () => {
                      const input = document.getElementById('new-thickness') as HTMLInputElement;
                      if (input.value) {
                        const newList = [...thicknesses, Number(input.value)].sort((a, b) => a - b);
                        await setDoc(doc(db, 'config', 'measurements'), { thicknesses: newList }, { merge: true });
                        input.value = "";
                      }
                    }} className="bg-brand-primary text-white px-3 rounded-lg text-xs font-bold">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {thicknesses.map(t => (
                      <div key={t} className="bg-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-slate-200">
                        <span>{t}"</span>
                        <button onClick={async () => {
                          const newList = thicknesses.filter(item => item !== t);
                          await setDoc(doc(db, 'config', 'measurements'), { thicknesses: newList }, { merge: true });
                        }}><Plus className="w-3 h-3 rotate-45 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lengths */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Largos (pies)</label>
                  <div className="flex gap-2">
                    <input id="new-length" type="number" placeholder="Nuevo..." className="flex-1 p-2 rounded-lg border-none bg-white text-sm" />
                    <button onClick={async () => {
                      const input = document.getElementById('new-length') as HTMLInputElement;
                      if (input.value) {
                        const newList = [...lengths, Number(input.value)].sort((a, b) => a - b);
                        await setDoc(doc(db, 'config', 'measurements'), { lengths: newList }, { merge: true });
                        input.value = "";
                      }
                    }} className="bg-brand-primary text-white px-3 rounded-lg text-xs font-bold">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lengths.map(l => (
                      <div key={l} className="bg-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-slate-200">
                        <span>{l}'</span>
                        <button onClick={async () => {
                          const newList = lengths.filter(item => item !== l);
                          await setDoc(doc(db, 'config', 'measurements'), { lengths: newList }, { merge: true });
                        }}><Plus className="w-3 h-3 rotate-45 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-2xl space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold flex items-center gap-2"><UserIcon className="w-4 h-4 text-brand-primary" /> Matriz de Permisos y Roles</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Control de acceso y perfiles de usuario</p>
              </div>

              <div className="space-y-3">
                {allUsers.map(u => {
                  const isUserAserradero = u.canUseAserradero !== false;
                  const isUserPlaya = u.canUsePlaya !== false;

                  return (
                    <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-black truncate max-w-[150px] text-brand-secondary">{u.displayName || "Sin nombre"}</span>
                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[150px] select-all">{u.email}</span>
                        </div>
                        <select 
                          value={u.role || 'user'}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              await updateDoc(doc(db, 'users', u.id), { role: newRole });
                            } catch (err) {
                              console.error("Error updating role:", err);
                              alert("Error al actualizar el rol. Verifica tus permisos.");
                            }
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-[10px] font-black text-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
                        >
                          <option value="user">Usuario</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {/* Matriz de Modulos */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Aserradero checkbox toggle */}
                        <label className={`flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${isUserAserradero ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                          <input 
                            type="checkbox"
                            checked={isUserAserradero}
                            onChange={async () => {
                              try {
                                await updateDoc(doc(db, 'users', u.id), { canUseAserradero: !isUserAserradero });
                              } catch (err) {
                                console.error("Error updating Aserradero perm:", err);
                              }
                            }}
                            className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">Aserradero</span>
                        </label>

                        {/* Playa checkbox toggle */}
                        <label className={`flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${isUserPlaya ? 'bg-blue-50/50 border-blue-100 text-blue-900' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                          <input 
                            type="checkbox"
                            checked={isUserPlaya}
                            onChange={async () => {
                              try {
                                await updateDoc(doc(db, 'users', u.id), { canUsePlaya: !isUserPlaya });
                              } catch (err) {
                                console.error("Error updating Playa perm:", err);
                              }
                            }}
                            className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">Playa</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Mantenimiento de Datos / Data Maintenance */}
            <section className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10 space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold flex items-center gap-2 text-brand-secondary">
                  <RotateCcw className="w-4 h-4 text-brand-primary" />
                  Mantenimiento y Pruebas de Campo
                </h3>
                <p className="text-[10px] text-brand-primary/80 uppercase font-bold tracking-wider">
                  Acciones de diagnóstico y simulación
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-brand-primary/10 shadow-sm space-y-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  ¿Necesitas restaurar romaneos de prueba? Genera automáticamente un juego de 4 paquetes realistas (2 de Aserradero, 2 de Playa) con datos completos, categorías de largos, coordenadas GPS y marcas de tiempo cronológicas de campo.
                </p>

                {showRestoreConfirm ? (
                  <div className="space-y-3 bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                    <p className="text-[10px] text-brand-secondary font-extrabold uppercase tracking-wider">
                      ¿Restaurar registros de prueba?
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Se generarán 4 paquetes realistas en la nube y en tu caché local para pruebas de campo.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreTestData}
                        disabled={isRestoringData}
                        className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-secondary active:scale-95 text-white rounded-xl text-xs font-black transition-all"
                      >
                        {isRestoringData ? "Restaurando..." : "Sí, generar ahora"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRestoreConfirm(false)}
                        disabled={isRestoringData}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirm(true)}
                    disabled={isRestoringData}
                    className="w-full bg-brand-primary hover:bg-brand-secondary text-white p-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-brand-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className={`w-4 h-4 ${isRestoringData ? 'animate-spin' : ''}`} />
                    Restaurar 4 paquetes de prueba
                  </button>
                )}
              </div>
            </section>

            {/* Zona de Peligro / Danger Zone */}
            <section className="bg-red-50/55 p-4 rounded-2xl border border-red-100 space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold flex items-center gap-2 text-red-700">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Zona de Peligro
                </h3>
                <p className="text-[10px] text-red-500/80 uppercase font-bold tracking-wider">
                  Acciones destructivas irreversibles
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm space-y-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Elimina todos los romaneos registrados en la nube (Firestore), así como el historial local pendiente de sincronización y caché. El correlativo de paquetes volverá a comenzar desde 001.
                </p>

                {showDangerZoneConfirm ? (
                  <div className="space-y-3 bg-red-50/40 p-3 rounded-xl border border-red-100">
                    <p className="text-[10px] text-red-700 font-extrabold uppercase tracking-wider">
                      ¿Estás absolutamente seguro?
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Para confirmar, escribe <span className="font-black text-red-600">ELIMINAR TODO</span> a continuación:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="ELIMINAR TODO"
                      className="w-full p-2.5 rounded-lg border border-red-200 bg-white text-xs text-center font-black uppercase text-red-600 focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 placeholder:text-gray-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAllRomaneos}
                        disabled={deleteConfirmText !== "ELIMINAR TODO" || isDeletingAll}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white ${deleteConfirmText === "ELIMINAR TODO" && !isDeletingAll ? 'bg-red-600 active:scale-95' : 'bg-slate-300 cursor-not-allowed'} transition-all`}
                      >
                        {isDeletingAll ? "Eliminando..." : "Sí, borrar todo"}
                      </button>
                      <button
                        onClick={() => {
                          setShowDangerZoneConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        disabled={isDeletingAll}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDangerZoneConfirm(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar todos los romaneos
                  </button>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setView(userRole === 'admin' ? 'admin' : 'counting')} className="p-2 bg-slate-100 rounded-full"><ChevronDown className="w-5 h-5 rotate-90" /></button>
              <h2 className="text-xl font-black">Historial de Romaneos</h2>
            </div>

            {/* Selector de Módulo en Historial */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${historyFilter === 'all' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                Todos ({combinedHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('aserradero')}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${historyFilter === 'aserradero' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                Aserradero ({combinedHistory.filter(item => !item.tipoRomaneo || item.tipoRomaneo === 'aserradero').length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('playa')}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider ${historyFilter === 'playa' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                Playa ({combinedHistory.filter(item => item.tipoRomaneo === 'playa').length})
              </button>
            </div>

            {/* Registro Global - Solo para Supervisor y Admin */}
            {(userRole === 'admin' || userRole === 'supervisor') && (
              <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 border border-brand-primary/15 rounded-2xl p-4 mb-2 space-y-3 shadow-sm shadow-brand-primary/5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-brand-primary text-white rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-brand-secondary uppercase tracking-wider">Exportación Global Consolidada</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Registros completos y cronológicos de todos los paquetes</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportGlobalRegistry('aserradero')}
                    className="flex bg-white hover:bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-[10px] font-black uppercase text-slate-700 items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                    <span>Reg. Global Aserradero</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportGlobalRegistry('playa')}
                    className="flex bg-white hover:bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-[10px] font-black uppercase text-slate-700 items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-secondary flex-shrink-0" />
                    <span>Reg. Global Playa</span>
                  </button>
                </div>
              </div>
            )}

            {filteredHistory.length === 0 ? (
              <div className="bg-slate-50 p-8 rounded-2xl text-center border border-slate-100">
                <p className="text-sm text-slate-400 font-bold">No hay romaneos registrados para este módulo.</p>
              </div>
            ) : (
              filteredHistory.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedRomaneo(item)}
                  className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100 cursor-pointer hover:border-brand-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-brand-secondary flex items-center gap-1.5 flex-wrap">
                        {item.species}
                        {item.isOffline && (
                          <span className="text-[8px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Local (Offline)
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.packageId} • {item.date}</p>
                      <p className="text-[10px] text-brand-primary font-bold uppercase">
                        {item.tipoRomaneo === 'playa' ? 'Playa' : `Aserradero: ${item.aserradero || "1"}`} • Calidad: {item.calidad || "Primera"} • {item.userName || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-primary">{item.totalVolume.toFixed(2)} PT</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.totalPieces} PZAS</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[10px] font-bold uppercase">
                    <div className="text-emerald-600">L: {item.largaVolume.toFixed(2)}</div>
                    <div className="text-amber-600">C: {item.cortaVolume.toFixed(2)}</div>
                    <div className="text-blue-600">F: {item.fingerVolume.toFixed(2)}</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToCSV(item);
                    }}
                    className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Descargar CSV
                  </button>
                </div>
              ))
            )}

            {/* Romaneo Detail Modal */}
            <AnimatePresence>
              {selectedRomaneo && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[250] bg-black/60 flex items-end justify-center backdrop-blur-sm"
                  onClick={() => setSelectedRomaneo(null)}
                >
                  <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white w-full max-w-md rounded-t-[32px] p-6 max-h-[80vh] overflow-y-auto"
                  >
                     <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-brand-secondary">{selectedRomaneo.species}</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase">{selectedRomaneo.packageId} • {selectedRomaneo.date}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[9px] font-extrabold bg-brand-primary/10 text-brand-primary uppercase px-2 py-0.5 rounded-full border border-brand-primary/10">
                            {selectedRomaneo.tipoRomaneo === 'playa' ? 'Romaneo Playa' : 'Romaneo Aserradero'}
                          </span>
                          {selectedRomaneo.tipoRomaneo !== 'playa' && (
                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 uppercase px-2 py-0.5 rounded-full border border-slate-200">
                              Aserradero: {selectedRomaneo.aserradero || "1"}
                            </span>
                          )}
                          <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 uppercase px-2 py-0.5 rounded-full border border-amber-200">
                            Calidad: {selectedRomaneo.calidad || "Primera"}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedRomaneo(null)} className="bg-slate-100 p-2 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block mb-1">Volumen Total</span>
                          <span className="text-2xl font-black text-brand-primary tabular-nums">{selectedRomaneo.totalVolume.toFixed(2)} <span className="text-xs font-bold">PT</span></span>
                        </div>
                        <div className="bg-brand-secondary/5 p-4 rounded-2xl border border-brand-secondary/10">
                          <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider block mb-1">Total Piezas</span>
                          <span className="text-2xl font-black text-brand-secondary tabular-nums">{selectedRomaneo.totalPieces} <span className="text-xs font-bold">PZAS</span></span>
                        </div>
                      </div>

                      {/* Subtotales por Variación (Especie / Espesor) con desglose de Largos */}
                      {(() => {
                        const groups: Record<string, { 
                          species: string; 
                          thickness: number; 
                          vol: number; 
                          qty: number;
                          largaVol: number;
                          largaQty: number;
                          cortaVol: number;
                          cortaQty: number;
                          fingerVol: number;
                          fingerQty: number;
                        }> = {};
                        
                        (selectedRomaneo.lines || []).forEach((line: any) => {
                          const sp = line.species || selectedRomaneo.species || "N/A";
                          const th = line.thickness || selectedRomaneo.thickness || 1;
                          const key = `${sp}_${th}`;
                          
                          if (!groups[key]) {
                            groups[key] = { 
                              species: sp, 
                              thickness: th, 
                              vol: 0, 
                              qty: 0,
                              largaVol: 0,
                              largaQty: 0,
                              cortaVol: 0,
                              cortaQty: 0,
                              fingerVol: 0,
                              fingerQty: 0
                            };
                          }
                          
                          const vol = line.volume || 0;
                          const qty = line.qty || 1;
                          const len = line.length || 0;
                          
                          groups[key].vol += vol;
                          groups[key].qty += qty;
                          
                          if (len >= 7) {
                            groups[key].largaVol += vol;
                            groups[key].largaQty += qty;
                          } else if (len >= 3) {
                            groups[key].cortaVol += vol;
                            groups[key].cortaQty += qty;
                          } else {
                            groups[key].fingerVol += vol;
                            groups[key].fingerQty += qty;
                          }
                        });
                        
                        return (
                          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subtotales por Variación</h4>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.values(groups).map((v, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-sm shadow-slate-100/50">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <div>
                                      <p className="font-extrabold text-brand-secondary text-sm">{v.species}</p>
                                      <p className="text-[9px] font-medium text-slate-400 uppercase">Espesor: <span className="font-black text-brand-primary">{v.thickness}"</span></p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-black text-brand-primary text-sm">{v.vol.toFixed(2)} PT</p>
                                      <p className="text-[9px] font-bold text-slate-400">{v.qty} Pzas</p>
                                    </div>
                                  </div>
                                  
                                  {/* Subtotales Categorizados */}
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-emerald-50/40 border border-emerald-100/50 p-2 rounded-xl">
                                      <span className="block text-emerald-800 font-black uppercase text-[8px] tracking-tight">Larga (7'+)</span>
                                      <span className="block font-black text-emerald-900 text-[11px] mt-0.5">{v.largaVol.toFixed(2)} PT</span>
                                      <span className="block text-[8px] font-bold text-emerald-600/70">{v.largaQty} pzas</span>
                                    </div>
                                    <div className="bg-amber-50/40 border border-amber-100/50 p-2 rounded-xl">
                                      <span className="block text-amber-800 font-black uppercase text-[8px] tracking-tight">Corta (3'-7')</span>
                                      <span className="block font-black text-amber-900 text-[11px] mt-0.5">{v.cortaVol.toFixed(2)} PT</span>
                                      <span className="block text-[8px] font-bold text-amber-600/70">{v.cortaQty} pzas</span>
                                    </div>
                                    <div className="bg-blue-50/40 border border-blue-100/50 p-2 rounded-xl">
                                      <span className="block text-blue-800 font-black uppercase text-[8px] tracking-tight">Finger (&lt;3')</span>
                                      <span className="block font-black text-blue-900 text-[11px] mt-0.5">{v.fingerVol.toFixed(2)} PT</span>
                                      <span className="block text-[8px] font-bold text-blue-600/70">{v.fingerQty} pzas</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Resumen por Largo con Histograma */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumen por Largo</h4>
                          <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">Frecuencia de Producción</span>
                        </div>

                        {distinctSpeciesInDetail.length > 1 && (
                          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1.5">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Filtrar Histograma por Especie:</span>
                            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                              <button
                                onClick={() => setDetailSpeciesFilter("all")}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${detailSpeciesFilter === "all" ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/20' : 'bg-white border-slate-150 text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                              >
                                Todas ({(selectedRomaneo.lines || []).length})
                              </button>
                              {distinctSpeciesInDetail.map(sp => {
                                const countForSp = (selectedRomaneo.lines || []).filter((l: any) => (l.species || selectedRomaneo.species || "N/A") === sp).length;
                                return (
                                  <button
                                    key={sp}
                                    onClick={() => setDetailSpeciesFilter(sp)}
                                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${detailSpeciesFilter === sp ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/20' : 'bg-white border-slate-150 text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                  >
                                    {sp} ({countForSp})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(() => {
                            const summary: Record<number, { vol: number, qty: number }> = {};
                            let totalQty = 0;
                            let totalVol = 0;
                            
                            const targetLines = (selectedRomaneo.lines || []).filter((line: any) => {
                              if (detailSpeciesFilter === 'all') return true;
                              const sp = line.species || selectedRomaneo.species || "N/A";
                              return sp === detailSpeciesFilter;
                            });

                            targetLines.forEach((line: any) => {
                              if (!summary[line.length]) summary[line.length] = { vol: 0, qty: 0 };
                              summary[line.length].vol += line.volume || 0;
                              summary[line.length].qty += (line.qty ?? 1);
                              totalQty += (line.qty ?? 1);
                              totalVol += line.volume || 0;
                            });
                            
                            if (totalQty === 0) return (
                              <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No hay líneas registradas para esta especie.</p>
                            );

                            const sortedSummary = Object.entries(summary).sort((a, b) => Number(a[0]) - Number(b[0]));
                            const maxQty = Math.max(...Object.values(summary).map(d => d.qty), 1);

                            return (
                              <div className="space-y-4">
                                {/* vertical histogram only on medium screens and up */}
                                <div className="hidden md:flex flex-col bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Gráfico de Frecuencia (Vertical por Cantidad)</p>
                                  <div className="flex items-end justify-between h-44 px-3 pt-4 border-b border-slate-200">
                                    {sortedSummary.map(([len, data]) => {
                                      const percentQty = (data.qty / totalQty) * 100;
                                      const heightPerc = (data.qty / maxQty) * 80 + 10;
                                      return (
                                        <div key={len} className="flex-1 flex flex-col items-center group relative gap-1.5 h-full justify-end">
                                          {/* Hover Tooltip */}
                                          <div className="absolute bottom-full mb-2 bg-brand-secondary text-white text-[9px] font-black py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                                            {data.qty} Pzas • {data.vol.toFixed(2)} PT ({percentQty.toFixed(1)}%)
                                          </div>
                                          {/* Bar */}
                                          <div 
                                            style={{ height: `${heightPerc}%` }}
                                            className="w-8 bg-gradient-to-t from-brand-primary to-brand-primary/80 rounded-t-lg shadow-sm hover:from-brand-secondary hover:to-brand-secondary/80 transition-all cursor-pointer flex items-end justify-center py-1"
                                          >
                                            <span className="text-[8px] font-black text-white">{percentQty.toFixed(0)}%</span>
                                          </div>
                                          <span className="text-xs font-black text-brand-secondary mt-1">{len}'</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* horizontal histogram for mobile / all screens */}
                                <div className="flex flex-col gap-2.5 md:hidden">
                                  {sortedSummary.map(([len, data]) => {
                                    const percentQty = (data.qty / totalQty) * 100;
                                    const percentVol = (data.vol / totalVol) * 100;
                                    const barWidth = (data.qty / maxQty) * 100;

                                    return (
                                      <div key={len} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-6 h-6 bg-brand-secondary/5 border border-brand-secondary/10 rounded-lg flex items-center justify-center font-black text-brand-secondary text-xs">{len}'</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                              {Number(len) >= 7 ? 'Larga' : Number(len) >= 3 ? 'Corta' : 'Finger'}
                                            </span>
                                          </div>
                                          <div className="text-right font-bold text-[10px] text-slate-500">
                                            <span className="font-black text-brand-secondary">{data.qty} pzas</span> ({percentQty.toFixed(1)}%) • <span className="font-black text-brand-primary">{data.vol.toFixed(2)} PT</span> ({percentVol.toFixed(1)}%)
                                          </div>
                                        </div>
                                        
                                        {/* Bar Track & Fill */}
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                                          <div 
                                            style={{ width: `${barWidth}%` }}
                                            className="bg-brand-primary h-full rounded-full transition-all duration-500"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 mt-6">
                        <button 
                          onClick={() => exportToCSV(selectedRomaneo)}
                          className="w-full bg-brand-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95"
                        >
                          <Download className="w-5 h-5" /> CSV Detallado (Línea x Línea)
                        </button>
                        <button 
                          onClick={() => exportSummaryToCSV(selectedRomaneo)}
                          className="w-full bg-white border-2 border-brand-primary text-brand-primary p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm"
                        >
                          <FileText className="w-5 h-5" /> CSV Resumen (Agrupado por Anchos)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer Summary */}
      {view === 'counting' && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-secondary/10 p-3 pb-6 shadow-2xl">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <span className="text-[8px] font-bold text-emerald-700 uppercase block">Larga (7'+)</span>
              <span className="text-xs font-black text-emerald-900">{volumes.larga.toFixed(2)} PT</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
              <span className="text-[8px] font-bold text-amber-700 uppercase block">Corta (3'-7')</span>
              <span className="text-xs font-black text-amber-900">{volumes.corta.toFixed(2)} PT</span>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
              <span className="text-[8px] font-bold text-blue-700 uppercase block">Finger (&lt;3')</span>
              <span className="text-xs font-black text-blue-900">{volumes.finger.toFixed(2)} PT</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-brand-primary p-2 rounded-xl text-white flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase">Total</span>
              <span className="text-lg font-black">{volumes.total.toFixed(2)} PT</span>
            </div>
            <div className="bg-brand-secondary p-2 rounded-xl text-white flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase">Piezas</span>
              <span className="text-lg font-black">{volumes.pieces}</span>
            </div>
          </div>
        </footer>
      )}

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-3xl w-full max-w-xs text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto"><RotateCcw className="w-8 h-8" /></div>
              <h3 className="text-xl font-black">¿Nuevo Romaneo?</h3>
              <p className="text-slate-500 text-sm">Se borrarán todos los conteos actuales y se generará un nuevo ID de Paquete. Asegúrate de haber guardado tu avance.</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleReset} className="w-full bg-brand-primary text-white p-3 rounded-xl font-bold">Sí, nuevo romaneo</button>
                <button onClick={() => setShowResetConfirm(false)} className="w-full bg-slate-100 text-slate-500 p-3 rounded-xl font-bold">Cancelar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
