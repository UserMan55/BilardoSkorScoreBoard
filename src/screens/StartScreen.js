import React, { useEffect, useState, useRef } from "react";
import {
  getPlayerNames,
  sendRemoteStartCommand,
  listenToTableStatus,
  updateTableStatus,
  listenForMatchCommands,
  getUserById,
  getSalons,
  updateSalon
} from "../services/firebase";
import ScoreboardReceiver from "./ScoreboardReceiver";
import MobileController from "./MobileController";
import GameModeSelector from "../components/GameModeSelector";
import VirtualKeyboard from "../components/VirtualKeyboard";
import deviceProfile from "../config/deviceProfile";
import "./StartScreen.css";

/* MOCK SALON VERİLERİ KALDIRILDI - FIREBASE'DEN ÇEKİLİYOR */

const groupSalonsByCity = (salonsList) => {
  const grouped = {};
  salonsList.forEach(salon => {
    if (!salon.city) return;
    let cityKey = salon.city.toLocaleUpperCase('tr-TR');
    if (cityKey === 'İSTANBUL') cityKey = 'ISTANBUL';
    else if (cityKey === 'İZMİR') cityKey = 'IZMIR';

    if (!grouped[cityKey]) grouped[cityKey] = [];

    // Tables format
    let formattedTables = [];
    if (salon.tableIds && Array.isArray(salon.tableIds)) {
      formattedTables = salon.tableIds.map((tid, idx) => ({ id: tid, name: `Masa ${idx + 1}` }));
    } else if (salon.tableCount) {
      for (let i = 0; i < salon.tableCount; i++) {
        formattedTables.push({ id: `${salon.id}_t${i + 1}`, name: `Masa ${i + 1}` });
      }
    }
    // Eğer hiç masa yoksa varsayılan bir masa ekle
    if (formattedTables.length === 0) {
      formattedTables.push({ id: `${salon.id}_default`, name: 'Masa 1' });
    }

    grouped[cityKey].push({
      ...salon,
      tables: formattedTables,
      logo: salon.logo || "/logo.png"
    });
  });
  return grouped;
};

// Dummy constants to prevent crashes before state migration is complete
const DEFAULT_SALON = { id: 'loading', name: 'Yükleniyor...', city: '', tables: [] };
const SALON_INFO = DEFAULT_SALON;


// QR URL oluştur (mobil kontrol için)
const getControllerQRUrl = (tableId = 'table_1') => {
  // Production'da live.3cscore.com, development'ta localhost
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://live.3cscore.com'
    : `http://${window.location.hostname}:3000`;
  return `${baseUrl}?table=${tableId}&mode=controller`;
};

const FALLBACK_AVATAR = "/logo.png";

// Soft gradient background - resim kaldırıldı
const START_SCREEN_BACKGROUND_STYLE = {
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
};

const FALLBACK_PLAYER_LIST = [
  {
    id: 'player_ibrahim_topyildiz', fullName: 'İbrahim TOPYILDIZ', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['ibrahim', 'ibo', 'topyıldız', 'topyildiz', 'ibrahim topyıldız', 'ibrahım']
  },
  {
    id: 'player_ilhami_ilhan', fullName: 'İlhami İLHAN', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['ilhami', 'ilhan', 'ilhamı', 'ilhami ilhan']
  },
  {
    id: 'player_erol_oran', fullName: 'Erol ORAN', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['erol', 'oran', 'erol oran']
  },
  {
    id: 'player_huseyin_yolcu', fullName: 'Hüseyin YOLCU', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['hüseyin', 'huseyin', 'yolcu', 'hüso', 'huso', 'hüseyin yolcu']
  },
  {
    id: 'player_ahmet_senol_terzi', fullName: 'Ahmet Şenol TERZİ', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['ahmet', 'şenol', 'senol', 'terzi', 'ahmet şenol', 'ahmet senol', 'ahmet terzi']
  },
  {
    id: 'player_hasan_haciomeroglu', fullName: 'Hasan HACIÖMEROĞLU', city: 'Samsun', salon: 'Salon 3CScore',
    aliases: ['hasan', 'hacıömeroğlu', 'haciomeroglu', 'hacıömer', 'hasan hacı']
  }
];

const DEFAULT_USER_PROFILE = {
  id: FALLBACK_PLAYER_LIST[0].id,
  fullName: FALLBACK_PLAYER_LIST[0].fullName,
  city: FALLBACK_PLAYER_LIST[0].city,
  salon: FALLBACK_PLAYER_LIST[0].salon
};

const filterPlayersByCity = (players = [], cityKey) => {
  if (!cityKey || cityKey === "TÜMÜ") return players;

  // Key'e göre olası şehir isimleri (Ascii Key -> Turkish Name mapping)
  let targetCities = [cityKey];
  if (cityKey === 'ISTANBUL') targetCities = ['İSTANBUL', 'ISTANBUL', 'İstanbul', 'Istanbul'];
  else if (cityKey === 'IZMIR') targetCities = ['İZMİR', 'IZMIR', 'İzmir', 'Izmir'];
  else targetCities = [cityKey];

  // Case-insensitive kontrol
  const targets = targetCities.map(c => c.toLocaleLowerCase('tr-TR'));

  return players.filter(p => {
    if (!p.city) return false;
    const pCity = p.city.toLocaleLowerCase('tr-TR');
    // Basit içerik kontrolü (SAMSUN, Samsun vs)
    return targets.some(t => pCity.includes(t) || t.includes(pCity));
  });
};

// URL'den kullanıcı bilgilerini oku (live.3cscore.com → bilardo-skor.web.app yönlendirmesi için)
const getUserFromURLParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const name = params.get('name');

    // En az userId veya name varsa URL'den kullanıcı var demektir
    if (userId || name) {
      console.log('🌐 URL parametrelerinden kullanıcı bilgisi okundu');
      return {
        id: userId || `url_user_${Date.now()}`,
        fullName: name ? decodeURIComponent(name) : 'Misafir Kullanıcı',
        city: params.get('city') ? decodeURIComponent(params.get('city')) : null,
        salon: params.get('salon') ? decodeURIComponent(params.get('salon')) : null,
        fromURL: true // URL'den geldiğini işaretle
      };
    }
  } catch (error) {
    console.warn('URL parametreleri okunamadı:', error);
  }
  return null;
};

// URL'den masa parametresini oku
const getTableFromURLParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      tableId: params.get('table') || null
    };
  } catch (error) {
    console.warn('URL table parametresi okunamadı:', error);
    return { tableId: null };
  }
};

function StartScreen({ onStart, onSurvivalStart, loggedInUser, isMobileOnly = false, onShowController }) {
  const [activeTab, setActiveTab] = useState("2vs2");
  const [names, setNames] = useState([]);
  // isMobileOnly prop'u varsa direkt controller modunda başla
  // Değilse (TV/Pi modu) menü modunda (null) başla ki kartları görsün
  const [deviceMode, setDeviceMode] = useState(isMobileOnly ? 'controller' : null);
  console.log('🔧 StartScreen INIT - deviceMode:', isMobileOnly ? 'controller' : 'null');
  const [isScoreboardMode, setIsScoreboardMode] = useState(false);

  // --- ANDROID TV FOCUS FIX ---
  const mainContainerRef = React.useRef(null);

  useEffect(() => {
    // Android TV'lerde yön tuşlarının çalışması için focus'un sayfada olması gerekir
    const enforceFocus = () => {
      if (mainContainerRef.current) {
        console.log("📺 Android TV Focus Enforced");
        mainContainerRef.current.focus({ preventScroll: true });
      }
    };

    // İlk açılışta focusla
    setTimeout(enforceFocus, 100);

    // Boşluğa tıklandığında focus'u geri al
    const handleClick = (e) => {
      const tag = e.target.tagName;
      if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        enforceFocus();
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  // -----------------------------

  // --- INPUT DEBUG MODE (MiBox Air Mouse Teşhis) ---
  const [inputDebugMode, setInputDebugMode] = useState(false);
  const [debugEvents, setDebugEvents] = useState([]);
  const debugEventsRef = React.useRef([]);

  // Debug modu açmak için: URL'e ?debug=input ekle veya 'd' tuşuna 3 kez bas
  const debugKeyPressCount = React.useRef(0);
  const debugKeyTimer = React.useRef(null);

  useEffect(() => {
    // URL'den debug kontrolü
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'input') {
      setInputDebugMode(true);
    }

    // 'd' tuşuna 3 kez basarak debug modu aç/kapa
    const handleDebugToggle = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        debugKeyPressCount.current++;
        clearTimeout(debugKeyTimer.current);
        debugKeyTimer.current = setTimeout(() => {
          debugKeyPressCount.current = 0;
        }, 1000);
        if (debugKeyPressCount.current >= 3) {
          setInputDebugMode(prev => !prev);
          debugKeyPressCount.current = 0;
        }
      }
    };
    window.addEventListener('keydown', handleDebugToggle);
    return () => window.removeEventListener('keydown', handleDebugToggle);
  }, []);

  // Input eventlarını dinle (debug modu açıkken)
  useEffect(() => {
    if (!inputDebugMode) return;

    const addDebugEvent = (type, details) => {
      const event = {
        type,
        details,
        time: new Date().toLocaleTimeString()
      };
      debugEventsRef.current = [event, ...debugEventsRef.current].slice(0, 10); // Son 10 event
      setDebugEvents([...debugEventsRef.current]);
    };

    const handleKeyDown = (e) => {
      addDebugEvent('keydown', `key: ${e.key}, code: ${e.code}, keyCode: ${e.keyCode}`);
    };
    const handleKeyUp = (e) => {
      addDebugEvent('keyup', `key: ${e.key}, code: ${e.code}`);
    };
    const handleMouseMove = (e) => {
      addDebugEvent('mousemove', `x: ${e.clientX}, y: ${e.clientY}, mvX: ${e.movementX}, mvY: ${e.movementY}`);
    };
    const handlePointerMove = (e) => {
      addDebugEvent('pointermove', `x: ${e.clientX}, y: ${e.clientY}, mvX: ${e.movementX}, mvY: ${e.movementY}, type: ${e.pointerType}`);
    };
    const handleWheel = (e) => {
      addDebugEvent('wheel', `deltaX: ${e.deltaX}, deltaY: ${e.deltaY}`);
    };
    const handleGamepad = (e) => {
      addDebugEvent('gamepad', `id: ${e.gamepad?.id}, index: ${e.gamepad?.index}`);
    };
    const handleMouseDown = (e) => {
      addDebugEvent('mousedown', `button: ${e.button}, x: ${e.clientX}, y: ${e.clientY}`);
    };
    const handleMouseUp = (e) => {
      addDebugEvent('mouseup', `button: ${e.button}`);
    };

    // Throttle for mousemove/pointermove (çok fazla event gelmesin)
    let lastMoveTime = 0;
    const throttledMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime > 200) { // 200ms throttle
        handleMouseMove(e);
        lastMoveTime = now;
      }
    };
    const throttledPointerMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime > 200) {
        handlePointerMove(e);
        lastMoveTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('mousemove', throttledMouseMove, true);
    window.addEventListener('pointermove', throttledPointerMove, true);
    window.addEventListener('wheel', handleWheel, true);
    window.addEventListener('gamepadconnected', handleGamepad, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('mousemove', throttledMouseMove, true);
      window.removeEventListener('pointermove', throttledPointerMove, true);
      window.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('gamepadconnected', handleGamepad, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [inputDebugMode]);
  // -------------------------------------------

  /* FIREBASE SALON DATASINI YÖNETEN STATE */
  const [SALONS_DATA, setSALONS_DATA] = useState({});
  const [debugSalons, setDebugSalons] = useState(null);

  useEffect(() => {
    const initData = async () => {
      // --- TEK SEFERLİK VERİ DÜZELTME ---
      // 3CSCORE -> Bafra, Samsun
      await updateSalon("nMzJ1JhU4VenW3oXJ3JE", { address: "Bafra, Samsun" });

      // Test Salon 3 -> İSTANBUL, 4 Masa
      await updateSalon("1ajFTqRsGWQlWiSOqK98", {
        city: "İSTANBUL",
        tableCount: 4,
        tableIds: ["test_t1", "test_t2", "test_t3", "test_t4"]
      });

      // Verileri Çek
      const data = await getSalons();

      setDebugSalons(data);
      const grouped = groupSalonsByCity(data);
      console.log("🔥 Gruplanmış Salonlar (Güncel):", grouped);
      setSALONS_DATA(grouped);

      if (grouped["SAMSUN"] && grouped["SAMSUN"].length > 0) {
        // Auto select handled by other effect
      }
    };

    initData();
  }, []); // Sadece mount anında çalışır

  const [showMobileController, setShowMobileController] = useState(false);
  const [controllerReadOnly, setControllerReadOnly] = useState(false);


  // Kullanıcı Profili State (mobil mod için)
  const [userProfile, setUserProfile] = useState(null);
  const [userProfileLoading, setUserProfileLoading] = useState(isMobileOnly);

  // Navigation State
  const [focusedIndex, setFocusedIndex] = useState(1);
  const focusedIndexRef = React.useRef(1);

  // Kullanıcı profilini Firebase'den çek (mobil mod)
  useEffect(() => {
    if (!isMobileOnly) return;

    const fetchUserProfile = async () => {
      setUserProfileLoading(true);

      // URL'den userId al
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');

      if (userId) {
        console.log('🔍 Kullanıcı profili çekiliyor:', userId);
        const profile = await getUserById(userId);
        if (profile) {
          setUserProfile(profile);
          console.log('✅ Kullanıcı profili yüklendi:', profile.fullName);
        } else {
          // Profil bulunamazsa loggedInUser'dan al
          if (loggedInUser) {
            setUserProfile({
              id: loggedInUser.uid,
              fullName: loggedInUser.name || loggedInUser.email || 'Kullanıcı',
              email: loggedInUser.email,
              photoURL: null
            });
          }
        }
      } else if (loggedInUser) {
        // userId yoksa loggedInUser'ı kullan
        setUserProfile({
          id: loggedInUser.uid,
          fullName: loggedInUser.name || loggedInUser.email || 'Kullanıcı',
          email: loggedInUser.email,
          photoURL: null
        });
      }

      setUserProfileLoading(false);
    };

    fetchUserProfile();
  }, [isMobileOnly, loggedInUser]);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // Force first focus to Player 1 when entering local mode
  useEffect(() => {
    if (deviceMode === 'local') {
      console.log('🎯 LOCAL MODE ENTERED - Setting localFocusIndex to 0');
      // Immediately set focus index to 0 (Player 1)
      setLocalFocusIndex(0);
      // Blur any active element first
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      // Focus P1 after a short delay to let React render
      const timer = setTimeout(() => {
        console.log('🎯 TIMER FIRED - Trying to focus p1-mode-3c, current localFocusIndex:', localFocusIndex);
        const p1Btn = document.getElementById('p1-mode-3c');
        if (p1Btn) {
          p1Btn.focus();
          console.log('🎯 FOCUSED p1-mode-3c successfully');
        } else {
          console.log('🎯 ERROR: p1-mode-3c not found!');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [deviceMode]);

  // Audio Context Ref
  const audioCtxRef = React.useRef(null);
  const navHandlersRef = React.useRef({
    handleNavAction: () => { },
    handleLocalNavAction: () => { }
  });

  useEffect(() => {
    // Initialize AudioContext once
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    } catch (e) {
      console.error("AudioContext init failed", e);
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const playFeedbackSound = React.useCallback(() => {
    if (!audioCtxRef.current) return;

    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Sound play failed", e);
    }
  }, []);

  // --- ŞEHİR VE SALON SEÇİMİ STATE'LERİ ---
  const [selectedCity, setSelectedCity] = useState("SAMSUN");
  // Başlangıçta null, veri gelince useEffect ile dolacak
  const [currentSalon, setCurrentSalon] = useState(null);

  // Şehir değişince VEYA SALON VERİSİ YÜKLENİNCE salonu ve masaları güncelle
  useEffect(() => {
    // Eğer veri henüz yüklenmediyse işlem yapma
    if (Object.keys(SALONS_DATA).length === 0) return;

    const salons = SALONS_DATA[selectedCity];
    if (salons && salons.length > 0) {
      // Eğer mevcut salon seçili ve bu şehirdeyse dokunma (Kullanıcı değiştirmiş olabilir)
      // Ancak henüz seçili değilse ilkini seç
      if (!currentSalon || currentSalon.city !== selectedCity) {
        const newSalon = salons[0];
        setCurrentSalon(newSalon);
        if (newSalon.tables && newSalon.tables.length > 0) {
          setSelectedTableId(newSalon.tables[0].id);
        }
      }
    } else {
      setCurrentSalon(null);
    }
  }, [selectedCity, SALONS_DATA]); // SALONS_DATA değişince de tetiklenmeli


  // Şehir değişince veya oyuncular yüklenince listeyi güncelle
  useEffect(() => {
    if (names.length > 0) {
      console.log("🏙️ Oyuncu Listesi Filtreleniyor. Şehir:", selectedCity);
      const filtered = filterPlayersByCity(names, selectedCity);
      setFilteredPlayers(filtered);
    }
  }, [names, selectedCity]);

  // Table Status State
  const [tableStatus, setTableStatus] = useState(null); // { status: 'BUSY' | 'IDLE', currentMatch: ... }
  const [allTableStatuses, setAllTableStatuses] = useState({}); // Tüm masaların durumları: { table_1: {...}, table_2: {...} }
  const [isMatchInfoOpen, setIsMatchInfoOpen] = useState(false); // Accordion state for Live Matches
  const [isStartMatchOpen, setIsStartMatchOpen] = useState(true); // Accordion state for Start Match
  const [winnerOverlayData, setWinnerOverlayData] = useState(null); // Kazanan ekranı verisi

  // URL parametrelerinden masa ID ve voice flag'i oku
  const urlTableParams = getTableFromURLParams();
  const [selectedTableId, setSelectedTableId] = useState(urlTableParams.tableId || "");


  // 2vs2 states
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [isManualPlayer1, setIsManualPlayer1] = useState(false);
  const [isManualPlayer2, setIsManualPlayer2] = useState(false);
  const [manualPlayer1Name, setManualPlayer1Name] = useState("");
  const [manualPlayer2Name, setManualPlayer2Name] = useState("");
  const [player1Warning, setPlayer1Warning] = useState("");
  const [player2Warning, setPlayer2Warning] = useState("");
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [hasAso, setHasAso] = useState(true);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER_PROFILE);
  const [filteredPlayers, setFilteredPlayers] = useState([]);

  // Survival states
  const [survivalPlayer1, setSurvivalPlayer1] = useState("");
  const [survivalPlayer2, setSurvivalPlayer2] = useState("");
  const [survivalPlayer3, setSurvivalPlayer3] = useState("");
  const [survivalPlayer4, setSurvivalPlayer4] = useState("");
  const [survivalFocusIndex, setSurvivalFocusIndex] = useState(0); // 0-3: Players, 4: Start Button

  // Survival select refs
  const survivalSelect1Ref = useRef(null);
  const survivalSelect2Ref = useRef(null);
  const survivalSelect3Ref = useRef(null);
  const survivalSelect4Ref = useRef(null);
  const survivalStartBtnRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [incomingMatchData, setIncomingMatchData] = useState(null);

  const [activeEditableField, setActiveEditableField] = useState(null); // 'p1-manual' | 'p2-manual' | 'p1-search' | 'p2-search'

  // 3CSCORE Arama State'leri
  const [p1SearchText, setP1SearchText] = useState("");
  const [p2SearchText, setP2SearchText] = useState("");
  const [p1SearchIndex, setP1SearchIndex] = useState(0); // Filtrelenmiş listede seçili index
  const [p2SearchIndex, setP2SearchIndex] = useState(0);
  const [searchFocusMode, setSearchFocusMode] = useState('keyboard'); // 'keyboard' | 'results' - SPACE ile geçiş yapılır

  const activeEditableFieldRef = useRef(null);
  // activeEditableField değiştiğinde ref'i güncelle
  useEffect(() => {
    activeEditableFieldRef.current = activeEditableField;
    console.log('📝 activeEditableField değişti:', activeEditableField);
  }, [activeEditableField]);
  const p1InputRef = useRef(null);
  const p2InputRef = useRef(null);
  const keyboardRefs = useRef({});
  const playerSelectionRef = useRef(null);
  const player1PanelRef = useRef(null);
  const player2PanelRef = useRef(null);
  const matchSettingsRef = useRef(null);
  const penaltyAsoRef = useRef(null);
  const reviewPanelRef = useRef(null);
  const isVirtualKeyboardEnabled = deviceProfile?.enableVirtualKeyboard ?? false;
  const keyboardStatusText = {
    'p1-manual': '1. oyuncu – manuel isim girişi',
    'p2-manual': '2. oyuncu – manuel isim girişi',
    'p1-search': '1. oyuncu – 3CSCORE arama',
    'p2-search': '2. oyuncu – 3CSCORE arama'
  };

  useEffect(() => {
    if (!isVirtualKeyboardEnabled) return;
    const keyboardRef = keyboardRefs.current[activeEditableField];
    if (keyboardRef?.focusFirstKey) {
      setTimeout(() => keyboardRef.focusFirstKey(), 0);
    }
  }, [activeEditableField, isVirtualKeyboardEnabled]);

  const [showMatchStartOverlay, setShowMatchStartOverlay] = useState(false);
  const [matchStartCountdown, setMatchStartCountdown] = useState(5);
  const [showLiveWatch, setShowLiveWatch] = useState(false);



  // Masa boşaldığında canlı izleme modunu kapat
  useEffect(() => {
    if (!tableStatus || tableStatus.status !== 'BUSY') {
      setShowLiveWatch(false);
    }
  }, [tableStatus]);

  // Local Game Navigation State
  const [localFocusIndex, setLocalFocusIndex] = useState(0); // 0: Tabs, 1: P1, 2: P2, 3: Target/P3, 4: Rack/P4, 5: Start

  // Sync DOM focus with localFocusIndex for inputs
  useEffect(() => {
    if (deviceMode === 'local') {
      console.log('🔄 SYNC EFFECT - localFocusIndex:', localFocusIndex, 'isManualPlayer1:', isManualPlayer1, 'isManualPlayer2:', isManualPlayer2);
      const focusMap = {
        0: 'p1-mode-3c',
        1: 'p1-mode-other',
        2: 'p1-input',
        3: 'p2-mode-3c',
        4: 'p2-mode-other',
        5: 'p2-input',
        6: 'score-plus-btn',
        7: 'rack-plus-btn',
        8: 'penalty-check',
        9: 'aso-check',
        10: 'start-game-btn'
      };

      const elementId = focusMap[localFocusIndex];
      console.log('🔄 Will focus element:', elementId);
      if (elementId) {
        // Use setTimeout to allow render to complete if switching modes
        setTimeout(() => {
          const el = document.getElementById(elementId);
          // Sadece element varsa ve şu anki aktif element değilse focus yap
          // Bu, gereksiz focus tetiklemelerini ve döngüleri önler
          if (el && document.activeElement !== el) {
            console.log('🔄 FOCUSING:', elementId);
            el.focus();
          } else {
            console.log('🔄 SKIPPED focus (already focused or not found):', elementId, 'activeElement:', document.activeElement?.id);
          }
        }, 50);
      }
    }
  }, [localFocusIndex, deviceMode, isManualPlayer1, isManualPlayer2]);

  useEffect(() => {
    if (localFocusIndex !== 2 && player1Warning) {
      setPlayer1Warning("");
    }
    if (localFocusIndex !== 5 && player2Warning) {
      setPlayer2Warning("");
    }
  }, [localFocusIndex, player1Warning, player2Warning]);

  useEffect(() => {
    if (!activeEditableField) return;
    const isPlayer1Field = activeEditableField.startsWith('p1');
    const isPlayer2Field = activeEditableField.startsWith('p2');

    if ((isPlayer1Field && localFocusIndex !== 2) || (isPlayer2Field && localFocusIndex !== 5)) {
      setActiveEditableField(null);
    }
  }, [localFocusIndex, activeEditableField]);

  // Document click listener for auto-tab navigation (mouse only)
  // Uses a ref to track if we've just entered local mode (to ignore the initial click)
  const localModeEntryTimeRef = React.useRef(0);

  useEffect(() => {
    if (deviceMode === 'local') {
      // Record the time when we entered local mode
      localModeEntryTimeRef.current = Date.now();
    }
  }, [deviceMode]);

  useEffect(() => {
    if (deviceMode !== 'local') return;

    const isPointInside = (el, x, y) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const handleDocumentClick = (e) => {
      // Ignore clicks for 500ms after entering local mode
      // This prevents the mode selection click from being processed
      if (Date.now() - localModeEntryTimeRef.current < 500) {
        console.log('🚫 CLICK IGNORED - too soon after entering local mode');
        return;
      }

      const playerSelectionEl = playerSelectionRef.current;
      const player1PanelEl = player1PanelRef.current;
      const player2PanelEl = player2PanelRef.current;
      const matchSettingsEl = matchSettingsRef.current;
      const penaltyAsoEl = penaltyAsoRef.current;
      const reviewPanelEl = reviewPanelRef.current;
      const startBtn = document.getElementById('start-game-btn');

      // Click coordinates (supports touch as well)
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;

      // Review mode'dayken panel dışına tıklandığında geri dön
      const clickedInReviewPanel = reviewPanelEl && reviewPanelEl.contains(e.target);
      const clickedStartBtn = startBtn && startBtn.contains(e.target);
      if (localFocusIndex === 10) {
        if (!clickedInReviewPanel && !clickedStartBtn) {
          setTimeout(() => setLocalFocusIndex(0), 50);
        }
        return;
      }

      // Önce contains ile kontrol et, olmazsa koordinatla kontrol et
      const clickedInPlayer1Panel = (player1PanelEl && player1PanelEl.contains(e.target)) || isPointInside(player1PanelEl, clientX, clientY);
      const clickedInPlayer2Panel = (player2PanelEl && player2PanelEl.contains(e.target)) || isPointInside(player2PanelEl, clientX, clientY);
      const clickedInMatchSettings = (matchSettingsEl && matchSettingsEl.contains(e.target)) || isPointInside(matchSettingsEl, clientX, clientY);
      const clickedInPenaltyAso = (penaltyAsoEl && penaltyAsoEl.contains(e.target)) || isPointInside(penaltyAsoEl, clientX, clientY);
      const clickedInPlayerSelection = (playerSelectionEl && playerSelectionEl.contains(e.target)) || isPointInside(playerSelectionEl, clientX, clientY);

      // Hangi panele tıklandıysa o panele geç
      let targetIndex = null;

      if (clickedInPlayer1Panel) {
        targetIndex = 0;
      } else if (clickedInPlayer2Panel) {
        targetIndex = 3;
      } else if (clickedInMatchSettings) {
        targetIndex = 6;
      } else if (clickedInPenaltyAso) {
        targetIndex = 8;
      } else if (clickedInPlayerSelection) {
        // Player selection container'ı (boş alan) -> oyuncu 1'e odaklan
        targetIndex = 0;
      } else if (clickedStartBtn) {
        targetIndex = 10;
      }

      if (targetIndex !== null) {
        const currentPanel =
          (localFocusIndex >= 0 && localFocusIndex <= 2) ? 'p1' :
            (localFocusIndex >= 3 && localFocusIndex <= 5) ? 'p2' :
              (localFocusIndex >= 6 && localFocusIndex <= 7) ? 'match' :
                (localFocusIndex >= 8 && localFocusIndex <= 9) ? 'penalty' :
                  (localFocusIndex === 10) ? 'start' : null;

        const targetPanel =
          (targetIndex >= 0 && targetIndex <= 2) ? 'p1' :
            (targetIndex >= 3 && targetIndex <= 5) ? 'p2' :
              (targetIndex >= 6 && targetIndex <= 7) ? 'match' :
                (targetIndex >= 8 && targetIndex <= 9) ? 'penalty' :
                  (targetIndex === 10) ? 'start' : null;

        if (currentPanel !== targetPanel) {
          setTimeout(() => setLocalFocusIndex(targetIndex), 50);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [deviceMode, localFocusIndex]);

  const normalizeSearchText = React.useCallback((text = "") => {
    // Türkçe karakter normalizasyonu
    // Tüm büyük/küçük ve Türkçe varyasyonları aynı karaktere dönüştürür
    // İ, i, I, ı → hepsi "i" olur
    return text
      .toString()
      .toLocaleLowerCase('tr-TR')
      // Türkçe karakterleri ASCII karşılıklarına çevir
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')  // ı → i (böylece İ/i/I/ı hepsi aynı olur)
      .trim();
  }, []);

  // 3CSCORE Arama: Filtrelenmiş oyuncu listesi (normalizeSearchText'ten sonra tanımlanmalı)
  // Kelime bazlı arama: Her kelimenin başından eşleştirme yapar
  // En az 2 karakter yazılmadan öneri gösterme
  const p1FilteredSearchPlayers = React.useMemo(() => {
    const trimmed = p1SearchText.trim();
    // En az 2 karakter yazılmalı
    if (trimmed.length < 2) return [];
    const normalized = normalizeSearchText(trimmed);
    return filteredPlayers.filter(p => {
      const playerNorm = normalizeSearchText(p.fullName);
      // Kelimelere ayır ve herhangi bir kelimenin başlangıcıyla eşleşip eşleşmediğini kontrol et
      const words = playerNorm.split(/\s+/);
      return words.some(word => word.startsWith(normalized));
    });
  }, [filteredPlayers, p1SearchText, normalizeSearchText]);

  const p2FilteredSearchPlayers = React.useMemo(() => {
    const trimmed = p2SearchText.trim();
    // En az 2 karakter yazılmalı
    if (trimmed.length < 2) return [];
    const normalized = normalizeSearchText(trimmed);
    return filteredPlayers.filter(p => {
      const playerNorm = normalizeSearchText(p.fullName);
      // Kelimelere ayır ve herhangi bir kelimenin başlangıcıyla eşleşip eşleşmediğini kontrol et
      const words = playerNorm.split(/\s+/);
      return words.some(word => word.startsWith(normalized));
    });
  }, [filteredPlayers, p2SearchText, normalizeSearchText]);


  const showFieldWarning = React.useCallback((index) => {
    if (index === 2) {
      setPlayer1Warning(isManualPlayer1 ? "İsim bilgisini boş geçemezsiniz !" : "Oyuncu seçmeden devam edemezsiniz!");
    } else if (index === 5) {
      setPlayer2Warning(isManualPlayer2 ? "İsim bilgisini boş geçemezsiniz !" : "Oyuncu seçmeden devam edemezsiniz!");
    }
  }, [isManualPlayer1, isManualPlayer2]);

  const canMoveForward = React.useCallback((currentIndex) => {
    if (currentIndex === 2) {
      if (isManualPlayer1) return manualPlayer1Name.trim().length > 0;
      return player1 !== "";
    }
    if (currentIndex === 5) {
      if (isManualPlayer2) return manualPlayer2Name.trim().length > 0;
      return player2 !== "";
    }
    return true;
  }, [isManualPlayer1, manualPlayer1Name, player1, isManualPlayer2, manualPlayer2Name, player2]);

  const cancelActiveEditing = React.useCallback(() => {
    if (!activeEditableField) return;
    if (activeEditableField === 'p1-manual') {
      setActiveEditableField(null);
      setTimeout(() => p1InputRef.current?.blur(), 0);
    } else if (activeEditableField === 'p2-manual') {
      setActiveEditableField(null);
      setTimeout(() => p2InputRef.current?.blur(), 0);
    } else if (activeEditableField === 'p1-search') {
      setActiveEditableField(null);
      setP1SearchText("");
      setP1SearchIndex(0);
      setSearchFocusMode('keyboard');
    } else if (activeEditableField === 'p2-search') {
      setActiveEditableField(null);
      setP2SearchText("");
      setP2SearchIndex(0);
      setSearchFocusMode('keyboard');
    }
  }, [activeEditableField]);


  const handleVirtualKeyPress = React.useCallback((value) => {
    // Harf girildiğinde keyboard moduna dön
    setSearchFocusMode('keyboard');
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name((prev) => `${prev}${value}`);
      setPlayer1Warning("");
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name((prev) => `${prev}${value}`);
      setPlayer2Warning("");
    } else if (activeEditableField === 'p1-search') {
      setP1SearchText((prev) => `${prev}${value}`);
      setP1SearchIndex(0); // Arama değişince ilk sonuca dön
    } else if (activeEditableField === 'p2-search') {
      setP2SearchText((prev) => `${prev}${value}`);
      setP2SearchIndex(0);
    }
  }, [activeEditableField]);

  const handleVirtualBackspace = React.useCallback(() => {
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name((prev) => prev.slice(0, -1));
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name((prev) => prev.slice(0, -1));
    } else if (activeEditableField === 'p1-search') {
      setP1SearchText((prev) => prev.slice(0, -1));
    } else if (activeEditableField === 'p2-search') {
      setP2SearchText((prev) => prev.slice(0, -1));
    }
  }, [activeEditableField]);

  const handleVirtualClear = React.useCallback(() => {
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name("");
      setPlayer1Warning("");
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name("");
      setPlayer2Warning("");
    } else if (activeEditableField === 'p1-search') {
      setP1SearchText("");
      setP1SearchIndex(0);
    } else if (activeEditableField === 'p2-search') {
      setP2SearchText("");
      setP2SearchIndex(0);
    }
  }, [activeEditableField]);

  const handleVirtualEnter = React.useCallback(() => {
    // Sanal klavye tuşu üzerindeyken ENTER'a basıldığında
    if (activeEditableField === 'p1-manual') {
      // Sadece klavyeyi kapat ve sonraki alana geç
      setActiveEditableField(null);
      setLocalFocusIndex(3);
      setTimeout(() => p1InputRef.current?.blur(), 0);
    } else if (activeEditableField === 'p2-manual') {
      setActiveEditableField(null);
      setLocalFocusIndex(6);
      setTimeout(() => p2InputRef.current?.blur(), 0);
    } else if (activeEditableField === 'p1-search') {
      // Öneriler modundaysa veya öneri varsa seçim yap
      if (searchFocusMode === 'results' || p1FilteredSearchPlayers.length > 0) {
        if (p1FilteredSearchPlayers.length > 0) {
          const selectedPlayer = p1FilteredSearchPlayers[p1SearchIndex];
          if (selectedPlayer) {
            setPlayer1(selectedPlayer.id);
            setPlayer1Warning("");
            console.log('✅ P1 Oyuncu seçildi:', selectedPlayer.fullName);
          }
        }
        setActiveEditableField(null);
        setP1SearchText("");
        setP1SearchIndex(0);
        setSearchFocusMode('keyboard');
        setLocalFocusIndex(3); // Oyuncu 2 paneline geç
      }
    } else if (activeEditableField === 'p2-search') {
      // Öneriler modundaysa veya öneri varsa seçim yap
      if (searchFocusMode === 'results' || p2FilteredSearchPlayers.length > 0) {
        if (p2FilteredSearchPlayers.length > 0) {
          const selectedPlayer = p2FilteredSearchPlayers[p2SearchIndex];
          if (selectedPlayer) {
            setPlayer2(selectedPlayer.id);
            setPlayer2Warning("");
            console.log('✅ P2 Oyuncu seçildi:', selectedPlayer.fullName);
          }
        }
        setActiveEditableField(null);
        setP2SearchText("");
        setP2SearchIndex(0);
        setSearchFocusMode('keyboard');
        setLocalFocusIndex(6); // Hedef sayı paneline geç
      }
    }
  }, [activeEditableField, searchFocusMode, p1FilteredSearchPlayers, p1SearchIndex, p2FilteredSearchPlayers, p2SearchIndex]);

  const handleVirtualExit = React.useCallback(() => {
    cancelActiveEditing();
  }, [cancelActiveEditing]);

  // 3CSCORE Arama: SPACE tuşu ile klavye/öneriler arasında geçiş
  const handleVirtualSpace = React.useCallback(() => {
    // Sadece arama modunda (p1-search veya p2-search) özel davranış
    if (activeEditableField === 'p1-search' || activeEditableField === 'p2-search') {
      const hasResults = activeEditableField === 'p1-search'
        ? p1FilteredSearchPlayers.length > 0
        : p2FilteredSearchPlayers.length > 0;

      if (searchFocusMode === 'keyboard' && hasResults) {
        setSearchFocusMode('results');
      } else {
        setSearchFocusMode('keyboard');
      }
    } else {
      // Manuel mod (p1-manual, p2-manual) için boşluk karakteri ekle
      if (activeEditableField === 'p1-manual') {
        setManualPlayer1Name((prev) => `${prev} `);
      } else if (activeEditableField === 'p2-manual') {
        setManualPlayer2Name((prev) => `${prev} `);
      }
    }
  }, [activeEditableField, searchFocusMode, p1FilteredSearchPlayers.length, p2FilteredSearchPlayers.length]);

  // 3CSCORE Arama: Yukarı/Aşağı tuşları ile sonuçlar arasında gezinme
  const handleSearchNavigate = React.useCallback((direction) => {
    if (activeEditableField === 'p1-search') {
      setP1SearchIndex((prev) => {
        const maxIndex = p1FilteredSearchPlayers.length - 1;
        if (direction === 'up') return prev > 0 ? prev - 1 : maxIndex;
        if (direction === 'down') return prev < maxIndex ? prev + 1 : 0;
        return prev;
      });
    } else if (activeEditableField === 'p2-search') {
      setP2SearchIndex((prev) => {
        const maxIndex = p2FilteredSearchPlayers.length - 1;
        if (direction === 'up') return prev > 0 ? prev - 1 : maxIndex;
        if (direction === 'down') return prev < maxIndex ? prev + 1 : 0;
        return prev;
      });
    }
  }, [activeEditableField, p1FilteredSearchPlayers.length, p2FilteredSearchPlayers.length]);

  const renderInlineKeyboard = (fieldKey) => {
    if (!isVirtualKeyboardEnabled || activeEditableField !== fieldKey) return null;
    const status = keyboardStatusText[fieldKey] || 'Sanal klavye';

    return (
      <div className="virtual-keyboard-inline">
        <div className="virtual-keyboard-inline__status">{status}</div>
        <VirtualKeyboard
          ref={(instance) => {
            if (instance) {
              keyboardRefs.current[fieldKey] = instance;
            } else {
              delete keyboardRefs.current[fieldKey];
            }
          }}
          onKeyPress={handleVirtualKeyPress}
          onBackspace={handleVirtualBackspace}
          onClear={handleVirtualClear}
          onEnter={handleVirtualEnter}
          onExit={handleVirtualExit}
          onSpace={handleVirtualSpace}
        />
      </div>
    );
  };

  const handleFreeStart = () => {
    // Free Mode: Player 1, Player 2, Default Targets, No Penalty/Aso, isFreeMode=true
    onStart("OYUNCU 1", "OYUNCU 2", 30, 30, false, false, true);
  };

  // --- KULLANICI BAĞLAMI VE FİLTRELEME MANTIĞI ---
  // Bu mantık, uygulamanın hem bağımsız (standalone) hem de entegre (export package) çalışmasını sağlar.

  // 1. Aktif Kullanıcıyı Belirle
  // Eğer parent component'ten (Main React App) 'loggedInUser' prop'u gelirse onu kullan.
  // Yoksa, test amacıyla "İbrahim TOPYILDIZ" kullanıcısını simüle et.
  // DİKKAT: names dizisi boşken (ilk yüklemede) find çalışmaz, bu yüzden useEffect içinde veya names dolduktan sonra hesaplanmalı.
  useEffect(() => {
    if (names.length === 0) return;

    console.log("🔍 Kullanıcı Arama Başladı. Toplam Oyuncu:", names.length);

    // Helper: Kullanıcıya göre konum ayarla
    const setupLocationFromUser = (user) => {
      if (!user || !user.city) return;

      let cityKey = user.city.toLocaleUpperCase('tr-TR');
      if (cityKey === 'İSTANBUL') cityKey = 'ISTANBUL';
      else if (cityKey === 'İZMİR') cityKey = 'IZMIR';

      if (SALONS_DATA[cityKey]) {
        setSelectedCity(cityKey);
        let targetSalon = null;

        // Salon Arama
        if (user.salon) {
          const normUserSalon = user.salon.toLocaleLowerCase('tr-TR');
          targetSalon = SALONS_DATA[cityKey].find(s => {
            const sName = s.name.toLocaleLowerCase('tr-TR');
            return sName === normUserSalon || sName.includes(normUserSalon) || normUserSalon.includes(sName);
          });
        }

        // Salon Bulunamadıysa veya Yoksa -> İlk Salon (Fallback)
        if (!targetSalon && SALONS_DATA[cityKey].length > 0) {
          targetSalon = SALONS_DATA[cityKey][0];
        }

        if (targetSalon) {
          setCurrentSalon(targetSalon);
          if (targetSalon.tables && targetSalon.tables.length > 0) {
            setSelectedTableId(targetSalon.tables[0].id);
          }
        }
      }
    };

    // 1. Öncelik: Parent component'ten gelen loggedInUser (prop)
    if (loggedInUser) {
      console.log("✅ Giriş Yapan Kullanıcı (prop):", loggedInUser);
      // Fix: Ensure ID is present (map uid to id if needed)
      const userWithId = {
        ...loggedInUser,
        id: loggedInUser.id || loggedInUser.uid
      };
      setCurrentUser(userWithId);
      setupLocationFromUser(userWithId);
      // Otomatik olarak Oyuncu 1 olarak seç
      if (userWithId.id) {
        setPlayer1(userWithId.id);
        setIsManualPlayer1(false);
        console.log("🎯 Oyuncu 1 otomatik seçildi:", loggedInUser.fullName);
      }
      return;
    }

    // 2. Öncelik: URL parametrelerinden gelen kullanıcı
    const urlUser = getUserFromURLParams();
    if (urlUser) {
      console.log("✅ URL'den Gelen Kullanıcı:", urlUser);
      setCurrentUser(urlUser);
      setupLocationFromUser(urlUser);
      // Otomatik olarak Oyuncu 1 olarak seç
      if (urlUser.id) {
        setPlayer1(urlUser.id);
        setIsManualPlayer1(false);
        console.log("🎯 Oyuncu 1 otomatik seçildi:", urlUser.fullName);
      }
      return;
    }

    // 3. Fallback: Varsayılan kullanıcı
    const normalizedDefaultName = normalizeSearchText(DEFAULT_USER_PROFILE.fullName);
    const fallbackUser = names.find((user) => normalizeSearchText(user.fullName) === normalizedDefaultName);

    if (fallbackUser) {
      console.log("ℹ️ Varsayılan kullanıcı atanıyor:", fallbackUser.fullName);
      setCurrentUser(fallbackUser);
      setupLocationFromUser(fallbackUser);
      // Otomatik olarak Oyuncu 1 olarak seç
      if (fallbackUser.id) {
        setPlayer1(fallbackUser.id);
        setIsManualPlayer1(false);
        console.log("🎯 Oyuncu 1 otomatik seçildi:", fallbackUser.fullName);
      }
    } else {
      console.log("⚠️ Varsayılan kullanıcı listede bulunamadı.");
      setCurrentUser(DEFAULT_USER_PROFILE);
    }
  }, [names, loggedInUser, normalizeSearchText]);

  // --------------------------------------------

  // Network State
  const networkStatus = React.useMemo(() => {
    if (deviceMode === 'local') return 'MATCHED';
    if (deviceMode === 'controller') return 'MISMATCH';
    return 'CHECKING';
  }, [deviceMode]);

  // Firebase'den oyuncu isimlerini yükle
  useEffect(() => {
    let isMounted = true;
    const fetchNames = async () => {
      // Timeout promise - 5 saniyeye düşürdük
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Zaman aşımı")), 5000)
      );

      try {
        // Race between fetch and timeout
        const playerNames = await Promise.race([
          getPlayerNames(),
          timeoutPromise
        ]);

        if (isMounted) {
          const finalList = Array.isArray(playerNames) && playerNames.length > 0
            ? playerNames
            : FALLBACK_PLAYER_LIST;
          setNames(finalList);
          setLoading(false);
        }
      } catch (err) {
        console.error('Oyuncu isimleri yüklenemedi:', err);
        // Hata durumunda boş liste ile devam et, kullanıcıyı engelleme
        if (isMounted) {
          setNames(FALLBACK_PLAYER_LIST);
          setLoading(false);
        }
      }
    };
    fetchNames();

    return () => { isMounted = false; };
  }, []);

  // =====================================================
  // CİHAZ ALGILAMA KALDIRILDI!
  // Artık davranış tamamen BUILD TARGET'a göre belirleniyor:
  // - Mobil Build (live.3cscore.com): deviceMode = 'controller' (isMobileOnly=true)
  // - Terminal Build (bilardo-skor.web.app/tv): deviceMode = 'local' (isMobileOnly=false)
  // Cihaz tipi (telefon/tablet/TV/PC) önemli DEĞİL!
  // =====================================================

  // Masa durumunu dinle (Mobil/Controller modu için)
  useEffect(() => {
    if (deviceMode === 'controller' && selectedTableId) {
      const targetTableId = selectedTableId;
      const unsubscribe = listenToTableStatus(targetTableId, (data) => {
        console.log('📊 Masa durumu güncellendi:', data);
        setTableStatus(data);

        // Eğer maç bittiyse (FINISHED) kazanan ekranını göster
        if (data && data.status === 'FINISHED' && data.currentMatch) {
          console.log('🏆 Maç bitti, kazanan verisi alındı:', data.currentMatch);
          setWinnerOverlayData(data.currentMatch);
        }
      });
      return () => unsubscribe();
    }
  }, [deviceMode, selectedTableId]);

  // TÜM MASALARIN DURUMUNU DİNLE (Masa seçim ekranı için)
  useEffect(() => {
    // SALON_INFO yerine güncel veriyi kullan
    const tables = currentSalon?.tables || [];
    const unsubscribes = [];

    tables.forEach((table) => {
      const unsubscribe = listenToTableStatus(table.id, (data) => {
        console.log(`📊 Masa ${table.id} durumu:`, data);
        setAllTableStatuses(prev => ({
          ...prev,
          [table.id]: data
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentSalon]);

  // 3CScore oyun moduna girildiğinde formu sıfırla
  const resetStandardGameForm = () => {
    setPlayer1("");
    setPlayer2("");
    setIsManualPlayer1(false);
    setIsManualPlayer2(false);
    setManualPlayer1Name("");
    setManualPlayer2Name("");
    setPlayer1Warning("");
    setPlayer2Warning("");
    setTargetScore(30);
    setTargetRack(30);
    setHasPenalty(false);
    setHasAso(true);
    // setTimeout ile odak ayarla - render tamamlandıktan sonra
    setLocalFocusIndex(0);
    // isReviewMode otomatik olarak false olur çünkü localFocusIndex !== 10
  };

  // Merkezi Navigasyon Mantığı (Klavye ve Firebase Ortak)
  const handleNavAction = (action) => {
    playFeedbackSound();

    if (action === 'RIGHT') {
      setFocusedIndex(prev => (prev < 3 ? prev + 1 : 1));
    } else if (action === 'LEFT') {
      setFocusedIndex(prev => (prev > 1 ? prev - 1 : 3));
    } else if (action === 'ENTER') {
      const current = focusedIndexRef.current;
      if (current === 1) handleFreeStart();
      else if (current === 2) { resetStandardGameForm(); setDeviceMode('local'); setActiveTab('2vs2'); }
      else if (current === 3) { setDeviceMode('local'); setActiveTab('survival'); }
    }
  };

  const handleLocalNavAction = (e) => {
    playFeedbackSound();
    // 0: P1 3CSCORE, 1: P1 OTHER, 2: P1 Input
    // 3: P2 3CSCORE, 4: P2 OTHER, 5: P2 Input
    // 6: Score, 7: Rack, 8: Penalty, 9: Aso, 10: Start
    const maxIndex = 10;

    const changeFocus = (newIndex) => {
      setLocalFocusIndex(newIndex);
    };

    const cyclePlayer = (currentPlayerId, direction, list) => {
      const available = list && list.length > 0 ? list : [{ id: 'guest', fullName: 'Misafir' }];
      const currentIndex = available.findIndex(p => p.id === currentPlayerId);
      let nextIndex;
      if (direction === 'next') {
        nextIndex = currentIndex + 1 >= available.length ? 0 : currentIndex + 1;
      } else {
        nextIndex = currentIndex - 1 < 0 ? available.length - 1 : currentIndex - 1;
      }
      return available[nextIndex].id;
    };

    const p1List = filteredPlayers;
    const p2List = filteredPlayers.filter(u => u.id !== player1);



    if (e.key === 'ArrowRight' || e.keyCode === 39) {
      if (canMoveForward(localFocusIndex)) {
        if (localFocusIndex === 2) setPlayer1Warning("");
        if (localFocusIndex === 5) setPlayer2Warning("");
        changeFocus(localFocusIndex < maxIndex ? localFocusIndex + 1 : 0);
      } else {
        showFieldWarning(localFocusIndex);
      }
    } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
      changeFocus(localFocusIndex > 0 ? localFocusIndex - 1 : maxIndex);
    } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
      let handled = false;
      if (localFocusIndex === 2 && !isManualPlayer1) { setPlayer1(cyclePlayer(player1, 'prev', p1List)); handled = true; }
      if (localFocusIndex === 5 && !isManualPlayer2) { setPlayer2(cyclePlayer(player2, 'prev', p2List)); handled = true; }
      if (localFocusIndex === 6) { setTargetScore(Math.min(50, targetScore + 5)); handled = true; }
      if (localFocusIndex === 7) { setTargetRack(Math.min(50, targetRack + 5)); handled = true; }
      if (!handled) {
        // No-op: arrow navigation between panels disabled intentionally
      }
    } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
      let handled = false;
      if (localFocusIndex === 2 && !isManualPlayer1) { setPlayer1(cyclePlayer(player1, 'next', p1List)); handled = true; }
      if (localFocusIndex === 5 && !isManualPlayer2) { setPlayer2(cyclePlayer(player2, 'next', p2List)); handled = true; }
      if (localFocusIndex === 6) { setTargetScore(Math.max(5, targetScore - 5)); handled = true; }
      if (localFocusIndex === 7) { setTargetRack(Math.max(5, targetRack - 5)); handled = true; }
      if (!handled) {
        // No-op
      }
    } else if (e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      if (localFocusIndex === 0) { setIsManualPlayer1(false); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 1) { setIsManualPlayer1(true); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 3) { setIsManualPlayer2(false); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 4) { setIsManualPlayer2(true); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 8) setHasPenalty(!hasPenalty);
      else if (localFocusIndex === 9) setHasAso(!hasAso);
    } else if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      if (localFocusIndex === 0) { setIsManualPlayer1(false); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 1) { setIsManualPlayer1(true); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 2) {
        if (isManualPlayer1) {
          if (activeEditableField === 'p1-manual') {
            if (canMoveForward(2)) {
              setActiveEditableField(null);
              p1InputRef.current?.blur();
              setPlayer1Warning("");
              changeFocus(3);
            } else {
              showFieldWarning(2);
            }
          } else {
            setActiveEditableField('p1-manual');
            setTimeout(() => p1InputRef.current?.blur(), 0);
          }
        } else {
          if (player1) {
            changeFocus(3);
          } else {
            showFieldWarning(2);
          }
        }
      }
      else if (localFocusIndex === 3) { setIsManualPlayer2(false); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 4) { setIsManualPlayer2(true); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 5) {
        if (isManualPlayer2) {
          if (activeEditableField === 'p2-manual') {
            if (canMoveForward(5)) {
              setActiveEditableField(null);
              p2InputRef.current?.blur();
              setPlayer2Warning("");
              changeFocus(6);
            } else {
              showFieldWarning(5);
            }
          } else {
            setActiveEditableField('p2-manual');
            setTimeout(() => p2InputRef.current?.blur(), 0);
          }
        } else {
          if (player2) {
            changeFocus(6);
          } else {
            showFieldWarning(5);
          }
        }
      }
      else if (localFocusIndex === 6) {
        changeFocus(7);
      }
      else if (localFocusIndex === 7) {
        changeFocus(8);
      }
      else if (localFocusIndex === 8) setHasPenalty(!hasPenalty);
      else if (localFocusIndex === 9) setHasAso(!hasAso);
      else if (localFocusIndex === 10) handleStart();
    } else if (e.key === 'Backspace' || e.keyCode === 8) {
      if (localFocusIndex > 0) {
        setLocalFocusIndex(localFocusIndex - 1);
      }
    } else if (e.key === 'Escape' || e.keyCode === 27) {
      // 3CSCORE modunda çıkış confirmation (opsiyonel, şu an direkt çıkıyor)
      setDeviceMode(null);
    }
  };

  // Survival Tab Navigasyon Handler'ı
  const handleSurvivalNavAction = (e) => {
    playFeedbackSound();
    // 0: Player1 Select, 1: Player2 Select, 2: Player3 Select, 3: Player4 Select, 4: Start Button
    const maxIndex = 4;

    const survivalPlayerSetters = [setSurvivalPlayer1, setSurvivalPlayer2, setSurvivalPlayer3, setSurvivalPlayer4];
    const survivalPlayerValues = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4];

    const cyclePlayer = (currentIndex, direction) => {
      const currentPlayerId = survivalPlayerValues[currentIndex];
      const available = getAvailableSurvivalPlayers(currentPlayerId);

      if (available.length === 0) return currentPlayerId;

      const currentPlayerIndex = available.findIndex(p => p.id === currentPlayerId);
      let nextIndex;

      if (direction === 'next') {
        if (currentPlayerIndex === -1) {
          nextIndex = 0;
        } else {
          nextIndex = currentPlayerIndex + 1 >= available.length ? -1 : currentPlayerIndex + 1;
        }
      } else {
        if (currentPlayerIndex === -1) {
          nextIndex = available.length - 1;
        } else {
          nextIndex = currentPlayerIndex - 1 < -1 ? available.length - 1 : currentPlayerIndex - 1;
        }
      }
      return nextIndex === -1 ? "" : available[nextIndex].id;
    };

    if (e.key === 'ArrowRight' || e.keyCode === 39) {
      setSurvivalFocusIndex(survivalFocusIndex < maxIndex ? survivalFocusIndex + 1 : 0);
    } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
      setSurvivalFocusIndex(survivalFocusIndex > 0 ? survivalFocusIndex - 1 : maxIndex);
    } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
      if (survivalFocusIndex >= 0 && survivalFocusIndex <= 3) {
        // Oyuncu seçiminde yukarı = önceki oyuncu
        const newValue = cyclePlayer(survivalFocusIndex, 'prev');
        survivalPlayerSetters[survivalFocusIndex](newValue);
      }
    } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
      if (survivalFocusIndex >= 0 && survivalFocusIndex <= 3) {
        // Oyuncu seçiminde aşağı = sonraki oyuncu
        const newValue = cyclePlayer(survivalFocusIndex, 'next');
        survivalPlayerSetters[survivalFocusIndex](newValue);
      }
    } else if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      if (survivalFocusIndex === 4) {
        // Start Button
        const selectedCount = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
          .filter(p => p !== "").length;
        if (selectedCount >= 3 && !isTableBusy) {
          handleSurvivalStart();
        }
      } else {
        // Sıradaki alana geç
        setSurvivalFocusIndex(survivalFocusIndex < maxIndex ? survivalFocusIndex + 1 : 0);
      }
    } else if (e.key === 'Backspace' || e.keyCode === 8) {
      if (survivalFocusIndex > 0) {
        setSurvivalFocusIndex(survivalFocusIndex - 1);
      }
    } else if (e.key === 'Escape' || e.keyCode === 27) {
      setDeviceMode(null); // Back to Main Menu
    }
  };

  useEffect(() => {
    navHandlersRef.current = {
      handleNavAction,
      handleLocalNavAction,
      handleSurvivalNavAction
    };
  });

  const getGroupClass = (groupIndices) => {
    if (deviceMode !== 'local') return '';

    // Review Mode: When Start Button (10) is focused, keep everything visible (no blur)
    if (localFocusIndex === 10) {
      return groupIndices.includes(10) ? 'active-group' : '';
    }

    const isFocused = groupIndices.includes(localFocusIndex);
    return isFocused ? 'active-group' : 'blurred';
  };

  const getFocusGlowStyle = (index, borderWidth = 2) => {
    if (deviceMode === 'local' && localFocusIndex === index) {
      return {
        border: `${borderWidth}px solid #FFD700`,
        boxShadow: '0 0 25px rgba(255, 215, 0, 0.9), 0 0 45px rgba(255, 215, 0, 0.6)'
      };
    }
    return {};
  };

  // USB Klavye/Kumanda Dinleyicisi (SIFIR GECİKME)
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('🔘 Tuş Basıldı (Menu):', e.key, '| Code:', e.code); // Debug için log

      const activeTag = document.activeElement.tagName;
      const inputType = document.activeElement.type;
      const isFormElement = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag);
      const isTextInput = activeTag === 'INPUT' && (inputType === 'text' || inputType === 'email' || inputType === 'password' || inputType === 'number' || inputType === 'search');

      // Air Mouse / D-Pad Çakışmasını Önleme (Agresif Mod)
      // Eğer bir metin kutusunda yazı yazmıyorsak, Yön tuşlarını tamamen ele geçiriyoruz.
      const isNavKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || [37, 38, 39, 40].includes(e.keyCode);

      if (isNavKey) {
        if (!isTextInput) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else if ([' ', 'Enter'].includes(e.key) || [32, 13].includes(e.keyCode)) {
        // Space/Enter tuşları butonlarda tıklama yapar, ama biz manuel yönetiyoruz
        if (activeTag !== 'BUTTON' && !isTextInput) {
          e.preventDefault();
        }
      }

      // Menu tuşunu engelle
      if (e.key === 'ContextMenu' || e.code === 'ContextMenu') {
        e.preventDefault();
        return;
      }

      if (deviceMode === null) {
        if (e.key === 'ArrowRight' || e.keyCode === 39 || e.key === 'd' || e.key === 'D') navHandlersRef.current.handleNavAction('RIGHT');
        else if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.key === 'a' || e.key === 'A') navHandlersRef.current.handleNavAction('LEFT');
        else if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) navHandlersRef.current.handleNavAction('ENTER');
      } else if (deviceMode === 'local') {
        const currentActiveField = activeEditableFieldRef.current;

        if (currentActiveField) {
          if (e.key === 'Enter') {
            // Öneriler modundayken ENTER: seçim yap ve tab geçişi
            // Klavye modundayken ENTER: VirtualKeyboard'a bırak (harf bassın)
            const isSearchMode = currentActiveField === 'p1-search' || currentActiveField === 'p2-search';
            const isResultsMode = searchFocusMode === 'results';

            if (isSearchMode && isResultsMode) {
              // Öneriler modunda: seçim yap
              e.preventDefault();
              e.stopPropagation();
              handleVirtualEnter();
              return;
            }
            // Hem arama hem manuel modda klavye modundayken: event'i VirtualKeyboard'a bırak (harf bassın)
            // Klavyeyi kapatmak için EXIT tuşu veya Escape kullanılmalı
            return;
          }
          if (['Escape', 'BrowserBack', 'GoBack'].includes(e.key)) {
            e.preventDefault();
            handleVirtualExit();
            return;
          }
          if (e.key === 'Backspace') {
            e.preventDefault();
            if (currentActiveField === 'p1-manual') {
              setManualPlayer1Name((prev) => prev.slice(0, -1));
            } else if (currentActiveField === 'p2-manual') {
              setManualPlayer2Name((prev) => prev.slice(0, -1));
            } else if (currentActiveField === 'p1-search') {
              setP1SearchText((prev) => prev.slice(0, -1));
            } else if (currentActiveField === 'p2-search') {
              setP2SearchText((prev) => prev.slice(0, -1));
            }
            return;
          }
          // Fiziksel klavyeden harf yazma desteği (tek karakter ve harf/rakam ise)
          if (e.key.length === 1 && /^[a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]$/.test(e.key)) {
            // Space tuşu arama modunda özel işlem görüyor, diğer durumlarda harf olarak yaz
            if (e.key === ' ' && (currentActiveField === 'p1-search' || currentActiveField === 'p2-search')) {
              // Arama modunda space tuşu klavye/öneriler geçişi için kullanılıyor, aşağıda işlenecek
            } else {
              e.preventDefault();
              const char = e.key.toUpperCase();
              if (currentActiveField === 'p1-manual') {
                setManualPlayer1Name((prev) => prev + char);
              } else if (currentActiveField === 'p2-manual') {
                setManualPlayer2Name((prev) => prev + char);
              } else if (currentActiveField === 'p1-search') {
                setP1SearchText((prev) => prev + char);
              } else if (currentActiveField === 'p2-search') {
                setP2SearchText((prev) => prev + char);
              }
              return;
            }
          }
          // 3CSCORE Arama modunda SPACE ile klavye/öneriler arasında geçiş
          if (e.key === ' ' && (currentActiveField === 'p1-search' || currentActiveField === 'p2-search')) {
            e.preventDefault();
            e.stopPropagation();
            const hasResults = currentActiveField === 'p1-search'
              ? p1FilteredSearchPlayers.length > 0
              : p2FilteredSearchPlayers.length > 0;
            // Sadece öneri varsa geçiş yap
            if (searchFocusMode === 'keyboard' && hasResults) {
              setSearchFocusMode('results');
            } else {
              setSearchFocusMode('keyboard');
            }
            return;
          }
          // 3CSCORE Arama modunda yukarı/aşağı ile sonuçlar arasında gezin (sadece results modunda)
          if (['ArrowDown', 'ArrowUp'].includes(e.key) && (currentActiveField === 'p1-search' || currentActiveField === 'p2-search')) {
            // Results modundaysa sonuçlar arasında gezin
            if (searchFocusMode === 'results') {
              e.preventDefault();
              e.stopPropagation();
              handleSearchNavigate(e.key === 'ArrowUp' ? 'up' : 'down');
              return;
            }
            // Keyboard modunda: VirtualKeyboard'a bırak (harfler arasında gezsin)
            return;
          }
          // Arama modunda yatay ok tuşları: VirtualKeyboard'a bırak
          if (['ArrowLeft', 'ArrowRight'].includes(e.key) && (currentActiveField === 'p1-search' || currentActiveField === 'p2-search')) {
            // Keyboard modunda: VirtualKeyboard'a bırak
            return;
          }
          // Manuel mod için ok tuşları
          if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            // Manuel modda da VirtualKeyboard'a bırak
            return;
          }
          return;
        }

        // Form elemanındaysak ve ok tuşlarına basıldıysa, custom navigasyonu engelle (çakışmayı önle)
        // Ancak Enter ve Escape her zaman çalışmalı
        if (isFormElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Backspace'].includes(e.key)) {
          // SELECT elementinde SPACE tuşu: 3CSCORE arama modunu aç (sanal klavye aktifse)
          if (activeTag === 'SELECT' && e.key === ' ' && isVirtualKeyboardEnabled) {
            e.preventDefault();
            const selectId = document.activeElement.id;
            if (selectId === 'p1-input' && !isManualPlayer1) {
              setActiveEditableField('p1-search');
            } else if (selectId === 'p2-input' && !isManualPlayer2) {
              setActiveEditableField('p2-search');
            }
            return;
          }

          // SELECT ve CHECKBOX elementleri için özel durum: Custom navigasyon kullanılsın
          if (activeTag === 'SELECT' || (activeTag === 'INPUT' && document.activeElement.type === 'checkbox')) {
            e.preventDefault();
            navHandlersRef.current.handleLocalNavAction(e);
            return;
          }

          // Text Input için özel durum: Eğer editing modunda değilsek, navigasyon tuşları çalışsın
          if (activeTag === 'INPUT' && (document.activeElement.type === 'text' || document.activeElement.type === 'number')) {
            e.preventDefault();
            navHandlersRef.current.handleLocalNavAction(e);
            return;
          }

          // Diğer form elemanları (Text Input vb.) kendi eventini yönetsin
          return;
        }

        // Survival tab için ayrı handler kullan
        if (activeTab === 'survival') {
          navHandlersRef.current.handleSurvivalNavAction(e);
        } else {
          navHandlersRef.current.handleLocalNavAction(e);
        }
      }
    };

    // Capture phase kullanarak event'i VirtualKeyboard'dan ÖNCE yakala
    // Bu sayede öneriler modundayken ENTER tuşunu işleyebiliriz
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    deviceMode,
    localFocusIndex,
    activeTab,
    targetScore,
    targetRack,
    player1,
    player2,
    isManualPlayer1,
    isManualPlayer2,
    manualPlayer1Name,
    manualPlayer2Name,
    filteredPlayers,
    hasPenalty,
    hasAso,
    handleVirtualExit,
    handleVirtualEnter,
    handleSearchNavigate,
    isVirtualKeyboardEnabled,
    searchFocusMode,
    p1FilteredSearchPlayers,
    p2FilteredSearchPlayers,
    survivalFocusIndex,
    survivalPlayer1,
    survivalPlayer2,
    survivalPlayer3,
    survivalPlayer4
  ]);

  // Mod seçim ekranında beklerken gelen maç komutlarını dinle
  useEffect(() => {
    if (deviceMode !== null) return; // Sadece mod seçim ekranındayken dinle
    if (isScoreboardMode) return; // Scoreboard modundaysak dinleme (Receiver halleder)

    let isInitialLoad = true;
    let lastProcessedTimestamp = 0;

    const unsubscribe = listenForMatchCommands((data) => {
      if (!data) return;

      const currentTimestamp = data.timestamp?.seconds || 0;

      // Sayfa ilk açıldığında var olan komutu yoksay (Stale Data Prevention)
      if (isInitialLoad) {
        isInitialLoad = false;
        lastProcessedTimestamp = currentTimestamp;
        console.log("⚠️ Başlangıçta var olan maç komutu yoksayıldı (Stale Data).");
        return;
      }

      // Sadece yeni gelen (zaman damgası değişmiş) komutları işle
      if (currentTimestamp <= lastProcessedTimestamp) return;

      lastProcessedTimestamp = currentTimestamp;

      if (data.status === 'START') {
        console.log('📡 YENİ Maç komutu alındı, overlay gösteriliyor...', data);
        setIncomingMatchData(data);
        setShowMatchStartOverlay(true);
        setMatchStartCountdown(5);
      } else {
        // Maç komutu START değilse overlay'i kapat
        setIncomingMatchData(null);
        setShowMatchStartOverlay(false);

        if (data.status === 'COMMAND' && data.command === 'NAV') {
          // NAV Logic
          const action = data.payload.action;
          console.log('🎮 NAV Command:', action);
          navHandlersRef.current.handleNavAction(action);
        }
      }
    }, selectedTableId); // Explicit table ID

    return () => {
      unsubscribe();
    };
  }, [deviceMode, isScoreboardMode, selectedTableId]);

  const executeGameStart = React.useCallback((data) => {
    if (data.mode === 'survival') {
      if (onSurvivalStart) onSurvivalStart(data.players);
    } else {
      if (onStart) onStart(
        data.players[0],
        data.players[1],
        data.settings?.targetScore ?? 30,
        data.settings?.targetRack ?? 30,
        data.settings?.hasPenalty ?? false,
        data.settings?.hasAso ?? false
      );
    }
  }, [onSurvivalStart, onStart]);

  // Countdown Timer Logic - Ayrıştırıldı
  useEffect(() => {
    let timer;
    if (showMatchStartOverlay) {
      timer = setInterval(() => {
        setMatchStartCountdown(prev => {
          if (prev <= 1) {
            // Countdown bitti
            setShowMatchStartOverlay(false);

            // Mobil build ise MobileController'a geç
            if (isMobileOnly) {
              console.log('📱 Mobil: Canlı maç kontrol ekranına geçiliyor...');
              setShowMobileController(true);
            } else {
              // Pi/Desktop build ise, deviceMode'u değiştirmeden maçı başlat
              console.log('🖥️ StartScreen: Terminal/TV Build - algılama atlanıyor, deviceMode (null/menu) korunuyor');
              setTimeout(() => {
                if (incomingMatchData) {
                  executeGameStart(incomingMatchData);
                }
              }, 100);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showMatchStartOverlay, incomingMatchData, executeGameStart, isMobileOnly]);





  const selectedPlayer1Photo = (!isManualPlayer1 && player1)
    ? (names.find(u => u.id === player1)?.photoURL || null)
    : null;
  const selectedPlayer2Photo = (!isManualPlayer2 && player2)
    ? (names.find(u => u.id === player2)?.photoURL || null)
    : null;

  const shouldShowPlayer1Badge = (!isManualPlayer1 && !!player1) || (isManualPlayer1 && manualPlayer1Name.trim() !== "");
  const shouldShowPlayer2Badge = (!isManualPlayer2 && !!player2) || (isManualPlayer2 && manualPlayer2Name.trim() !== "");

  const handleStart = () => {
    // ID'den İsim Çözümleme
    const resolveName = (idOrName) => {
      const user = names.find(u => u.id === idOrName);
      return user ? user.fullName : idOrName;
    };

    let finalPlayer1 = isManualPlayer1 ? manualPlayer1Name.trim() : resolveName(player1);
    let finalPlayer2 = isManualPlayer2 ? manualPlayer2Name.trim() : resolveName(player2);

    // İsim girilmemişse varsayılan isimleri ata
    if (!finalPlayer1) finalPlayer1 = "OYUNCU 1";
    if (!finalPlayer2) finalPlayer2 = "OYUNCU 2";

    onStart(finalPlayer1, finalPlayer2, targetScore, targetRack, hasPenalty, hasAso, false, 'Masa 1', (currentSalon?.name || SALON_INFO?.name || "SALON 3CSCORE"));
  };

  const handleRemoteSend = async () => {
    // ID'den İsim Çözümleme
    const resolveName = (idOrName) => {
      const user = names.find(u => u.id === idOrName);
      return user ? user.fullName : idOrName;
    };

    // ID'den Fotoğraf URL'si Çözümleme
    const resolvePhoto = (idOrName) => {
      const user = names.find(u => u.id === idOrName || u.fullName === idOrName);
      return user?.photoURL || null;
    };

    // Oyuncu ID'sini çözümle (3CSCORE kullanıcısı ise id, manual ise null)
    const resolvePlayerId = (idOrName, isManual) => {
      if (isManual) return null;
      const user = names.find(u => u.id === idOrName);
      return user?.id || null;
    };

    if (activeTab === "2vs2") {
      let finalPlayer1 = isManualPlayer1 ? manualPlayer1Name.trim() : resolveName(player1);
      let finalPlayer2 = isManualPlayer2 ? manualPlayer2Name.trim() : resolveName(player2);

      // Fotoğraf URL'lerini al
      const photo1 = isManualPlayer1 ? null : resolvePhoto(player1);
      const photo2 = isManualPlayer2 ? null : resolvePhoto(player2);

      // Oyuncu ID'lerini al (sadece 3CSCORE oyuncuları için)
      const player1Id = resolvePlayerId(player1, isManualPlayer1);
      const player2Id = resolvePlayerId(player2, isManualPlayer2);
      const playerIds = [player1Id, player2Id].filter(Boolean);

      // Kontrol yetkisi olan kullanıcılar: oyuncular + maçı başlatan
      const startedBy = currentUser?.id || null;
      const allowedControllers = [...new Set([...playerIds, startedBy].filter(Boolean))];

      console.log("📷 handleRemoteSend - player1 ID:", player1, "-> name:", finalPlayer1, "-> photo:", photo1);
      console.log("📷 handleRemoteSend - player2 ID:", player2, "-> name:", finalPlayer2, "-> photo:", photo2);
      console.log("📷 names array sample:", names.slice(0, 3).map(n => ({ id: n.id, name: n.fullName, photo: n.photoURL ? 'VAR' : 'YOK' })));
      console.log("🔐 matchMeta - playerIds:", playerIds, "startedBy:", startedBy, "allowedControllers:", allowedControllers);

      // İsim girilmemişse varsayılan isimleri ata
      if (!finalPlayer1) finalPlayer1 = "OYUNCU 1";
      if (!finalPlayer2) finalPlayer2 = "OYUNCU 2";

      if (finalPlayer1 && finalPlayer2 && finalPlayer1 !== finalPlayer2) {
        try {
          // matchMeta bilgilerini hazırla
          const matchMeta = {
            playerIds,
            startedBy,
            allowedControllers,
            salonId: currentSalon?.name || SALON_INFO?.name || "SALON 3CSCORE",
            salonCity: currentSalon?.city || SALON_INFO?.city || "SAMSUN",
            salonName: currentSalon?.name || SALON_INFO?.name || "SALON 3CSCORE"
          };

          await sendRemoteStartCommand({
            mode: "2vs2",
            players: [finalPlayer1, finalPlayer2],
            playerPhotos: { [finalPlayer1]: photo1, [finalPlayer2]: photo2 },
            settings: { targetScore, targetRack, hasPenalty, hasAso }
          }, selectedTableId, matchMeta);
          setControllerReadOnly(false);
          setShowMobileController(true); // Mobil kontrol paneline geç
        } catch (error) {
          setErrorMessage("❌ Komut Gönderilemedi: " + error.message);
        }
      } else {
        setErrorMessage("⚠️ Farklı iki oyuncu seçmelisiniz!");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } else if (activeTab === "survival") {
      // Survival oyuncularını çözümle
      const selectedPlayerIds = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
        .filter(p => p !== "");

      const selectedPlayers = selectedPlayerIds.map(id => resolveName(id));

      // Survival modunda tüm oyuncu ID'lerini al
      const playerIds = selectedPlayerIds.map(id => {
        const user = names.find(u => u.id === id);
        return user?.id || null;
      }).filter(Boolean);

      const startedBy = currentUser?.id || null;
      const allowedControllers = [...new Set([...playerIds, startedBy].filter(Boolean))];

      if (selectedPlayers.length >= 3) {
        try {
          // matchMeta bilgilerini hazırla
          const matchMeta = {
            playerIds,
            startedBy,
            allowedControllers,
            salonId: SALON_INFO?.name || null,
            salonCity: SALON_INFO?.city || null
          };

          console.log("🔐 Survival matchMeta - playerIds:", playerIds, "startedBy:", startedBy, "allowedControllers:", allowedControllers);

          await sendRemoteStartCommand({
            mode: "survival",
            players: selectedPlayers,
            settings: {}
          }, selectedTableId || (currentSalon?.tables?.[0]?.id || 'table_1'), matchMeta);
          setControllerReadOnly(false);
          setShowMobileController(true); // Mobil kontrol paneline geç
        } catch (error) {
          setErrorMessage("❌ Komut Gönderilemedi: " + error.message);
        }
      } else {
        setErrorMessage("⚠️ En az 3 oyuncu seçmelisiniz!");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  };

  const handleReceiverStart = (data) => {
    // ScoreboardReceiver'dan tetiklendiğinde de overlay sürecini başlat
    console.log('📡 ScoreboardReceiver tetikledi, overlay başlatılıyor...', data);

    // Veri kontrolü
    if (!data) {
      console.error('❌ HATA: handleReceiverStart boş veri aldı!');
      return;
    }

    setIncomingMatchData(data);
    setShowMatchStartOverlay(true);
    setMatchStartCountdown(5);
  };

  const handleSurvivalStart = () => {
    const selectedIds = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4].filter(p => p !== "");

    if (selectedIds.length < 3) {
      setErrorMessage("⚠️ En az 3 oyuncu seçmelisiniz!");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Map IDs to Names
    // FIX: Use 'names' directly to ensure we find the user even if not in current filter
    const selectedNames = selectedIds.map(id => {
      const user = names.find(u => u.id === id);
      return user ? user.fullName : id; // Fallback to ID if not found
    });

    if (onSurvivalStart) {
      onSurvivalStart(selectedNames);
    }
  };

  // Survival için seçilebilir oyuncuları filtrele
  const getAvailableSurvivalPlayers = (currentPlayerId) => {
    const selectedPlayers = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
      .filter(p => p !== "" && p !== currentPlayerId);
    // filteredPlayers kullanılmalı (eğer tanımlıysa ve doluysa, değilse names)
    const sourceList = (typeof filteredPlayers !== 'undefined' && filteredPlayers.length > 0) ? filteredPlayers : names;
    return sourceList.filter(user => !selectedPlayers.includes(user.id));
  };

  console.log('🔍 StartScreen render:', {
    loading,
    deviceMode,
    isScoreboardMode,
    showMatchStartOverlay,
    hasIncomingData: !!incomingMatchData
  });

  if (loading) return (
    <div className="loading-container" style={{ flexDirection: 'column', gap: '20px' }}>
      <div>Yükleniyor...</div>
      <button
        onClick={() => setLoading(false)}
        style={{
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        İptal Et ve Devam Et
      </button>
    </div>
  );
  // Match Start Overlay
  if (showMatchStartOverlay && incomingMatchData) {
    const photo1 = incomingMatchData.playerPhotos?.[incomingMatchData.players[0]];
    const photo2 = incomingMatchData.playerPhotos?.[incomingMatchData.players[1]];
    const isLocalStart = incomingMatchData.isLocalStart; // Terminal'den başlatıldı mı?

    return (
      <div className="match-start-overlay">
        <div className="match-start-screen" style={isLocalStart ? { maxWidth: '900px' } : {}}>
          <div className="match-start-title">CANLI MAÇ BAŞLIYOR...</div>

          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Sol Taraf: Oyuncular ve Ayarlar */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div className="match-start-players">
                <div className="match-start-player">
                  <div className="match-player-photo">
                    <img src={photo1 || FALLBACK_AVATAR} alt={incomingMatchData.players[0]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                  </div>
                  <div className="match-player-name">{incomingMatchData.players[0]}</div>
                </div>

                <div className="match-start-vs">VS</div>

                <div className="match-start-player">
                  <div className="match-player-photo">
                    <img src={photo2 || FALLBACK_AVATAR} alt={incomingMatchData.players[1]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                  </div>
                  <div className="match-player-name">{incomingMatchData.players[1]}</div>
                </div>
              </div>

              <div className="match-start-details">
                <div className="match-detail-item">
                  <span className="match-detail-label">Hedef Sayı</span>
                  <span className="match-detail-value">{incomingMatchData.settings?.targetScore ?? '-'}</span>
                </div>
                <div className="match-detail-item">
                  <span className="match-detail-label">Hedef İstaka</span>
                  <span className="match-detail-value">{incomingMatchData.settings?.targetRack ?? '-'}</span>
                </div>
                <div className="match-detail-item">
                  <span className="match-detail-label">Penaltı</span>
                  <span className="match-detail-value" style={{ color: incomingMatchData.settings?.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                    {incomingMatchData.settings?.hasPenalty ? 'VAR' : 'YOK'}
                  </span>
                </div>
                <div className="match-detail-item">
                  <span className="match-detail-label">ASO</span>
                  <span className="match-detail-value" style={{ color: incomingMatchData.settings?.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                    {incomingMatchData.settings?.hasAso ? 'VAR' : 'YOK'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sağ Taraf: QR Kodu (Sadece Terminal/Pi modunda) */}
            {isLocalStart && (
              <div style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  📱 Telefonla Kontrol Et
                </div>
                <div style={{
                  background: 'white',
                  padding: '10px',
                  borderRadius: '12px',
                  marginBottom: '15px'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getControllerQRUrl('table_1'))}`}
                    alt="QR Kod"
                    style={{ display: 'block', width: '150px', height: '150px' }}
                  />
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                  maxWidth: '170px'
                }}>
                  {getControllerQRUrl('table_1')}
                </div>
              </div>
            )}
          </div>

          {matchStartCountdown > 0 && (
            <div className="match-start-countdown">{matchStartCountdown}</div>
          )}

          {/* Terminal modunda hızlı başlat butonu */}
          {isLocalStart && matchStartCountdown > 0 && (
            <button
              onClick={() => setMatchStartCountdown(0)}
              style={{
                marginTop: '20px',
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              ▶️ HEMEN BAŞLAT
            </button>
          )}
        </div>
      </div>
    );
  }

  // Winner Overlay (Mobil tarafında maç bitince gösterilir)
  if (winnerOverlayData) {
    const { winner, stats, players } = winnerOverlayData;
    const isDraw = winner === 'draw';
    const player1Name = players[0];
    const player2Name = players[1];
    const player1Score = stats.score1;
    const player2Score = stats.score2;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1d2e 0%, #2a2d3a 100%)',
          padding: '30px',
          borderRadius: '25px',
          textAlign: 'center',
          border: '2px solid rgba(255, 215, 0, 0.6)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          maxWidth: '500px',
          width: '100%',
          position: 'relative'
        }}>
          <button
            onClick={() => {
              setWinnerOverlayData(null);
              setShowMobileController(false);
            }}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >✕</button>

          {/* Kazanan Başlığı */}
          {!isDraw && (
            <div style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              padding: '15px',
              borderRadius: '15px',
              marginBottom: '25px',
              boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1d2e' }}>🏆 KAZANAN 🏆</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1d2e', marginTop: '5px' }}>{winner}</div>
            </div>
          )}

          {isDraw && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '15px',
              borderRadius: '15px',
              marginBottom: '25px',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              🤝 BERABERE 🤝
            </div>
          )}

          {/* Skorlar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '5px' }}>{player1Name}</div>
              <div style={{ color: winner === player1Name ? '#FFD700' : 'white', fontSize: '36px', fontWeight: 'bold' }}>{player1Score}</div>
            </div>
            <div style={{ color: '#666', fontSize: '20px', fontWeight: 'bold' }}>-</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '5px' }}>{player2Name}</div>
              <div style={{ color: winner === player2Name ? '#FFD700' : 'white', fontSize: '36px', fontWeight: 'bold' }}>{player2Score}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setWinnerOverlayData(null);
              setShowMobileController(false);
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
              marginTop: '10px'
            }}
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  // --- GLOBAL LOADING CHECK ---
  // Uygulamanın/Verilerin çökmemesi için veri gelmeden render yapma
  if (!currentSalon && !isScoreboardMode) {
    return (
      <div style={{
        height: '100vh', width: '100vw', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94a3b8', fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ marginBottom: '20px' }}></div>
          <div>Salon Verileri Yükleniyor...</div>
          <div style={{ fontSize: '10px', marginTop: '20px', opacity: 0.5 }}>
            {Object.keys(SALONS_DATA).length} şehir bulundu
          </div>
        </div>
        {/* Debug Div - Update logic çalışsın diye render ediyoruz */}
        <div id="debug-salon-data" style={{ display: 'none' }}>
          {debugSalons ? JSON.stringify(debugSalons) : 'LOADING'}
        </div>
      </div>
    );
  }

  // Masaüstü cihaz -> Scoreboard Receiver'a yönlendir
  if (isScoreboardMode) {
    return (
      <div>
        <ScoreboardReceiver
          onStartGame={handleReceiverStart}
          onBack={() => {
            setDeviceMode(null);
            setIsScoreboardMode(false);
          }}
        />
      </div>
    );
  }

  // Mod seçim ekranı (sadece desktop/tablet/TV için)
  if (deviceMode === null) {
    console.log('✅ Rendering mode selection screen');

    return (
      <div className="start-screen-wrapper" style={{
        ...START_SCREEN_BACKGROUND_STYLE,
        height: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        padding: '40px 10px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>

        <div style={{
          maxWidth: '1200px', // Genişlik artırıldı
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start', // Dikeyde yukarı yasla
          alignItems: 'center', // Yatayda ortala
          height: '100vh', // Tam ekran
          paddingTop: '20px', // Yukarıdan biraz boşluk bırak
          gap: '20px'
        }}>

          {/* Subtitle (Logo'suz) */}
          <div style={{
            marginBottom: '30px',
            marginTop: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0'
          }}>
            <div style={{
              fontSize: '24px', // Biraz büyüttüm
              fontWeight: '800',
              color: '#f1f5f9',
              letterSpacing: '1px',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              fontFamily: '"Orbitron", "Impact", sans-serif',
              textTransform: 'uppercase'
            }}>
              3 Bant Bilardo Skor Tabela Uygulaması
            </div>
          </div>

          {/* Listening Status Card - RESTORED */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '20px 40px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            marginBottom: '30px',
            animation: 'fadeIn 1s ease-out'
          }}>
            <div style={{
              color: '#FFD700',
              fontSize: '14px',
              fontWeight: '700',
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#FFD700',
                borderRadius: '50%',
                animation: 'blinkDot 1.5s infinite'
              }}></div>
              3CSCORE LISTENING
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              Mobil cihazdan maç başlatma talebi bekleniyor...
            </div>
          </div>

          <style>{`
            @keyframes shimmer {
              0% { background-position: 0% center; }
              100% { background-position: 200% center; }
            }
            @keyframes logoPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes bgFloat {
              0%, 100% { 
                transform: translate(0, 0) scale(1);
              }
              33% { 
                transform: translate(30px, -30px) scale(1.1);
              }
              66% { 
                transform: translate(-20px, 20px) scale(0.9);
              }
            }
            @keyframes blinkDot {
              0%, 100% { 
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 0 20px #FFD700;
              }
              50% { 
                opacity: 0.3;
                transform: scale(0.8);
                box-shadow: 0 0 5px #FFD700;
              }
            }
          `}</style>






          {/* Yerel Maç Başlat Panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '1200px'
          }}>
            <div style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '12px',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '15px',
              fontWeight: '700'
            }}>YEREL MAÇ MODLARI</div>

            <GameModeSelector
              focusedIndex={focusedIndex}
              onFreeStart={handleFreeStart}
              onStandardStart={() => { resetStandardGameForm(); setDeviceMode('local'); setActiveTab('2vs2'); }}
              onSurvivalStart={() => { setDeviceMode('local'); setActiveTab('survival'); }}
            />
          </div>
        </div>

        {/* Embedded Mobile Controller for Testing - Devre Dışı */}
        {/* 
        <div className="embedded-controller-container">
          <div className="embedded-phone-frame">
            <MobileController 
              onBack={() => {}} 
              tableId={SALON_INFO.tables[0].id}
            />
          </div>
        </div>
        */}
      </div>
    );
  }

  // Mobil Controller görünümü
  if (showMobileController) {
    if (!currentSalon || !currentSalon.tables || currentSalon.tables.length === 0) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>Yükleniyor...</div>;
    }
    const effectiveTableId = selectedTableId || (currentSalon?.tables?.[0]?.id || 'table_1');
    const effectiveUser = currentUser || loggedInUser || { id: 'anonymous', fullName: 'Anonim' };
    console.log('🔧 MobileController açılıyor - selectedTableId:', selectedTableId, 'effectiveTableId:', effectiveTableId, 'effectiveUser:', effectiveUser?.id, 'readOnly:', controllerReadOnly);
    return (
      <MobileController
        onBack={() => {
          setShowMobileController(false);
          setControllerReadOnly(false);
        }}
        tableId={effectiveTableId}
        readOnly={controllerReadOnly}
        loggedInUser={effectiveUser}
      />
    );
  }

  // Controller Mode (Mobil) veya Local Mode (Desktop)

  // Main Render (StartScreen Wrapper)
  // Veri yükleniyor kontrolü - ARTIK GEREK YOK (Yukarı taşındı)
  // if (!currentSalon) ...

  const showRemoteButton = deviceMode === 'controller';
  const showLocalButton = deviceMode === 'local';
  // Seçili masanın durumunu allTableStatuses'tan al
  const selectedTableStatus = allTableStatuses[selectedTableId];
  const isTableBusy = selectedTableStatus?.status === 'BUSY';
  const liveMatch = isTableBusy && selectedTableStatus?.currentMatch ? selectedTableStatus.currentMatch : null;
  const livePlayerPhotos = liveMatch?.playerPhotos || {};
  const isReviewMode = deviceMode === 'local' && localFocusIndex === 10;

  const handleOpenLiveWatch = (tableId) => {
    if (!liveMatch) return;
    setSelectedTableId(tableId);
    setControllerReadOnly(true);
    setShowMobileController(true);
  };

  return (
    <div
      ref={mainContainerRef}
      tabIndex="0" // Klavye olayları için gerekli
      className="start-screen-wrapper"
      style={{
        ...START_SCREEN_BACKGROUND_STYLE,
        position: 'relative',
        outline: 'none', // Varsayılan outline'ı kaldır
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start', // Dikeyde ortalamayı iptal edip yukarı yasla
        alignItems: 'center',
        paddingTop: '50px' // Yukarıdan boşluk bırak
      }}>
      <div id="debug-salon-data" style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', zIndex: -1 }}>
        {debugSalons ? JSON.stringify(debugSalons) : 'LOADING'}
      </div>

      {/* INPUT DEBUG OVERLAY - MiBox Air Mouse Teşhisi */}
      {inputDebugMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          width: '400px',
          maxHeight: '300px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00ff00',
          borderRadius: '10px',
          padding: '15px',
          zIndex: 99999,
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#00ff00',
          overflow: 'auto'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #00ff00', paddingBottom: '5px' }}>
            🔬 INPUT DEBUG MODE
            <span style={{ float: 'right', fontSize: '10px' }}>
              (URL: ?debug=input veya 'd' x3)
            </span>
          </div>
          <div style={{ marginBottom: '10px', color: '#ffff00' }}>
            Air Mouse yön tuşlarına basın ve hangi event'in geldiğini görün
          </div>
          {debugEvents.length === 0 ? (
            <div style={{ color: '#888' }}>Henüz event yok... Kumandaya basın.</div>
          ) : (
            debugEvents.map((evt, idx) => (
              <div key={idx} style={{
                marginBottom: '5px',
                padding: '5px',
                background: idx === 0 ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
                borderRadius: '4px'
              }}>
                <span style={{ color: '#ff9900' }}>[{evt.time}]</span>{' '}
                <span style={{
                  color: evt.type.includes('key') ? '#00ffff' :
                    evt.type.includes('mouse') || evt.type.includes('pointer') ? '#ff00ff' :
                      '#ffffff'
                }}>
                  {evt.type}
                </span>: {evt.details}
              </div>
            ))
          )}
        </div>
      )}
      {/* CANLI İZLE MODAL */}
      {showLiveWatch && liveMatch && (
        <div className="live-watch-overlay" role="dialog" aria-label="Canlı maç takibi">
          <div className="live-watch-modal">
            <div className="live-watch-header">
              <div>
                <div className="live-watch-title">CANLI MAÇ TAKİP</div>
                <div className="live-watch-sub">{currentSalon?.tables?.[0]?.name || 'Masa 1'} • İstaka {liveMatch.stats?.inning ?? 0}</div>
              </div>
              <button className="live-watch-close" onClick={() => setShowLiveWatch(false)}>Kapat</button>
            </div>

            <div className="live-watch-body">
              <div className="live-watch-player">
                <div className="live-avatar large">
                  <img src={livePlayerPhotos[liveMatch.players?.[0]] || FALLBACK_AVATAR} alt={liveMatch.players?.[0] || 'Oyuncu 1'} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                </div>
                <div className="live-watch-name">{liveMatch.players?.[0] || 'Oyuncu 1'}</div>
                <div className="live-watch-score">{liveMatch.stats?.score1 ?? 0}</div>
                <div className="live-watch-hr">HR1: {liveMatch.stats?.hr1 ?? 0} | HR2: {liveMatch.stats?.hr2 ?? 0}</div>
              </div>

              <div className="live-watch-center">
                <div className="live-watch-vs">VS</div>
                <div className="live-watch-inning">İstaka {liveMatch.stats?.inning ?? 0}</div>
                <div className="live-watch-targets">
                  <span>Hedef Skor: {liveMatch.settings?.targetScore ?? '-'}</span>
                  <span>Hedef İstaka: {liveMatch.settings?.targetRack ?? '-'}</span>
                </div>
              </div>

              <div className="live-watch-player">
                <div className="live-avatar large">
                  <img src={livePlayerPhotos[liveMatch.players?.[1]] || FALLBACK_AVATAR} alt={liveMatch.players?.[1] || 'Oyuncu 2'} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                </div>
                <div className="live-watch-name">{liveMatch.players?.[1] || 'Oyuncu 2'}</div>
                <div className="live-watch-score">{liveMatch.stats?.score2 ?? 0}</div>
                <div className="live-watch-hr">HR1: {liveMatch.stats?.hr1_2 ?? 0} | HR2: {liveMatch.stats?.hr2_2 ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deviceMode === 'local' && (
        <button
          className="mode-toggle-btn"
          onClick={() => setDeviceMode(null)}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1000,
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ⬅️ Geri
        </button>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          padding: '25px 35px',
          borderRadius: '16px',
          fontSize: '18px',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 11000,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          animation: 'errorMessageSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: 'max-content',
          maxWidth: '85vw',
          pointerEvents: 'none'
        }}>
          {errorMessage}
        </div>
      )}

      <div className={`start-screen-panel ${deviceMode === 'local' ? 'focus-mode' : ''}`} style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>

        {/* KULLANICI PROFİL HEADER - Mobil mod için */}
        {deviceMode === 'controller' && userProfile && (
          <div className="user-profile-header" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '12px',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {/* Kullanıcı Fotoğrafı */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.5)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span style="font-size: 24px; color: white;">👤</span>';
                  }}
                />
              ) : (
                <span style={{ fontSize: '24px', color: 'white' }}>👤</span>
              )}
            </div>

            {/* Kullanıcı Bilgileri */}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                color: '#fff',
                fontWeight: '700',
                fontSize: '18px',
                letterSpacing: '0.3px',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                {userProfile.fullName}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '12px',
                fontWeight: '500',
                marginTop: '4px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {userProfile.city && <span>📍 {userProfile.city}</span>}
                {(userProfile.venue || userProfile.salon) && <span>🎱 {userProfile.venue || userProfile.salon}</span>}
              </div>
            </div>

            {/* 3CScore'a Dön Butonu */}
            <button
              onClick={() => {
                window.location.href = 'https://3cscore.com';
              }}
              className="back-to-3cscore-btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                color: 'white',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
              }}
            >
              <span style={{ fontSize: '18px' }}>🏠</span>
              <span style={{ letterSpacing: '0.5px' }}>3CSCORE</span>
            </button>
          </div>
        )}

        {/* SALON INFO HEADER */}


        {/* MOBİL MOD: İL VE SALON SEÇİMİ (Combobox Style) */}
        {deviceMode !== 'local' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '15px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            marginBottom: '15px',
            border: '2px solid #FFD700'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>

              {/* Sol: İl Seçimi (Select Box) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>İL SEÇİNİZ</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    const key = e.target.value;
                    setSelectedCity(key);

                    // Şehir değişince ilk salonu otomatik seç
                    if (SALONS_DATA[key] && SALONS_DATA[key].length > 0) {
                      setCurrentSalon(SALONS_DATA[key][0]);
                      if (SALONS_DATA[key][0].tables[0]) {
                        setSelectedTableId(SALONS_DATA[key][0].tables[0].id);
                      }
                    } else {
                      setCurrentSalon(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px top 50%',
                    backgroundSize: '10px auto'
                  }}
                >
                  {Object.keys(SALONS_DATA).map(cityKey => {
                    const displayName = cityKey === 'ISTANBUL' ? 'İSTANBUL' : cityKey === 'IZMIR' ? 'İZMİR' : cityKey;
                    return <option key={cityKey} value={cityKey}>{displayName}</option>;
                  })}
                </select>
              </div>

              {/* Sağ: Salon Seçimi (Select) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>SALON SEÇİNİZ</label>
                <select
                  value={currentSalon?.id || ""}
                  onChange={(e) => {
                    const salonId = parseInt(e.target.value);
                    const salon = SALONS_DATA[selectedCity]?.find(s => s.id === salonId);
                    if (salon) {
                      setCurrentSalon(salon);
                      if (salon.tables[0]) {
                        setSelectedTableId(salon.tables[0].id);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    appearance: 'none', // Dropdown okunu özelleştirmek için,
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px top 50%',
                    backgroundSize: '10px auto'
                  }}
                >
                  {!SALONS_DATA[selectedCity] && <option value="">Önce İl Seçin</option>}
                  {SALONS_DATA[selectedCity]?.map(salon => (
                    <option key={salon.id} value={salon.id}>{salon.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        )}

        {/* PANEL 2: CANLI MAÇ BAŞLAT */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setIsStartMatchOpen(!isStartMatchOpen)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <h2 style={{
              color: '#1e293b',
              fontSize: '18px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>🎮</span> CANLI MAÇ BAŞLAT
            </h2>
            <span style={{
              transform: isStartMatchOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              color: '#64748b',
              fontSize: '14px'
            }}>▼</span>
          </button>

          {isStartMatchOpen && (
            <div style={{ marginTop: '20px', animation: 'slideDown 0.3s ease-out' }}>
              {/* Table Status Indicator (Only for Mobile/Controller) */}
              {deviceMode === 'controller' && (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '15px',
                  marginBottom: '25px',
                  width: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600',
                    textAlign: 'left'
                  }}>
                    Masa Seçimi
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentSalon?.tables?.map(table => {
                      // Masa durumunu allTableStatuses'dan al
                      const tableStatusData = allTableStatuses[table.id];
                      const isBusy = tableStatusData?.status === 'BUSY';

                      const isSelected = selectedTableId === table.id;

                      // Bu masa için canlı maç bilgisini al
                      const liveMatchForTable = isBusy ? tableStatusData?.currentMatch : null;
                      const firebasePlayerPhotos = liveMatchForTable?.playerPhotos || {};

                      // Oyuncu fotoğraflarını al - önce Firebase'den, yoksa names dizisinden
                      const getPlayerPhoto = (playerName) => {
                        if (firebasePlayerPhotos[playerName]) {
                          return firebasePlayerPhotos[playerName];
                        }
                        // names dizisinden ara (fullName ile eşleşen)
                        const foundPlayer = names.find(n => n.fullName === playerName);
                        return foundPlayer?.photoURL || null;
                      };

                      const player1Photo = liveMatchForTable?.players?.[0] ? getPlayerPhoto(liveMatchForTable.players[0]) : null;
                      const player2Photo = liveMatchForTable?.players?.[1] ? getPlayerPhoto(liveMatchForTable.players[1]) : null;

                      return (
                        <div
                          key={table.id}
                          className="table-selection-item"
                          onClick={() => setSelectedTableId(table.id)}
                          style={{
                            border: isSelected ? '3px solid #3b82f6' : '1px solid #e2e8f0',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#fff',
                            cursor: 'pointer',
                            opacity: 1,
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            padding: '12px',
                            boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
                            transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Üst Kısım: Masa resmi, adı ve durum */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: isBusy && liveMatchForTable ? '10px' : '0'
                          }}>
                            <div style={{
                              width: '50px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <img
                                src="/table.png"
                                alt="Masa"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            </div>

                            <div style={{ flex: 1, textAlign: 'left', fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                              {table.name}
                            </div>

                            <div style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: isBusy ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: isBusy ? '#ef4444' : '#22c55e',
                              fontSize: '10px',
                              fontWeight: '700',
                              border: `1px solid ${isBusy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                            }}>
                              {isBusy ? 'DOLU' : 'BOŞ'}
                            </div>
                          </div>

                          {/* Alt Kısım: Canlı maç bilgisi (sadece masa doluysa) */}
                          {isBusy && liveMatchForTable && (
                            <>
                              {/* SURVIVAL MODE - 3 veya 4 oyuncu */}
                              {liveMatchForTable.mode === 'survival' && liveMatchForTable.stats?.survivalPlayers ? (
                                <div style={{
                                  background: 'rgba(78, 205, 196, 0.05)',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  marginBottom: '8px'
                                }}>
                                  {/* Survival Badge */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    marginBottom: '8px'
                                  }}>
                                    <span style={{
                                      background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                                      color: '#fff',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '9px',
                                      fontWeight: '700'
                                    }}>SURVIVAL</span>
                                    <span style={{
                                      fontSize: '10px',
                                      color: '#64748b'
                                    }}>SET {liveMatchForTable.stats?.gameHalf || 1}</span>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      color: '#f59e0b',
                                      fontFamily: 'monospace'
                                    }}>{liveMatchForTable.stats?.gameTimeFormatted || '00:00'}</span>
                                  </div>

                                  {/* Players Grid 2x2 */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '6px'
                                  }}>
                                    {liveMatchForTable.stats.survivalPlayers.map((player, idx) => (
                                      <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 8px',
                                        background: player.isActive ? 'rgba(78, 205, 196, 0.15)' : 'rgba(0, 0, 0, 0.03)',
                                        borderRadius: '6px',
                                        border: player.isActive ? '1px solid rgba(78, 205, 196, 0.4)' : '1px solid transparent',
                                        opacity: player.isDisqualified ? 0.5 : 1
                                      }}>
                                        {/* Photo */}
                                        <div style={{
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          overflow: 'hidden',
                                          border: player.isActive ? '2px solid #4ECDC4' : '1px solid #e2e8f0',
                                          flexShrink: 0
                                        }}>
                                          <img
                                            src={getPlayerPhoto(player.name) || FALLBACK_AVATAR}
                                            alt=""
                                            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                        </div>
                                        {/* Name (shortened) */}
                                        <span style={{
                                          fontSize: '9px',
                                          fontWeight: '600',
                                          color: player.isDisqualified ? '#ef4444' : '#334155',
                                          flex: 1,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          maxWidth: '45px',
                                          textDecoration: player.isDisqualified ? 'line-through' : 'none'
                                        }}>
                                          {player.name.split(' ')[0]}
                                        </span>
                                        {/* Score */}
                                        <span style={{
                                          fontSize: '13px',
                                          fontWeight: '800',
                                          color: player.isDisqualified ? '#ef4444' : '#0f172a',
                                          textDecoration: player.isDisqualified ? 'line-through' : 'none'
                                        }}>
                                          {player.score}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                /* NORMAL MODE - 2 oyuncu */
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(15, 23, 42, 0.03)',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  marginBottom: '8px',
                                  gap: '8px'
                                }}>
                                  {/* Oyuncu 1 */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                                      {liveMatchForTable.players?.[0] || 'Oyuncu 1'}
                                    </span>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      border: '2px solid #3b82f6',
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#1e293b'
                                    }}>
                                      <img
                                        src={player1Photo || FALLBACK_AVATAR}
                                        alt=""
                                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: player1Photo ? 'cover' : 'contain',
                                          padding: player1Photo ? '0' : '4px',
                                          display: 'block'
                                        }}
                                      />
                                    </div>
                                    <span style={{
                                      fontSize: '18px',
                                      fontWeight: '800',
                                      color: '#0f172a',
                                      minWidth: '24px',
                                      textAlign: 'center'
                                    }}>
                                      {liveMatchForTable.stats?.score1 ?? 0}
                                    </span>
                                  </div>

                                  {/* Tire işareti */}
                                  <div style={{
                                    fontSize: '18px',
                                    fontWeight: '800',
                                    color: '#64748b',
                                    padding: '0 4px'
                                  }}>
                                    -
                                  </div>

                                  {/* Oyuncu 2 */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      fontSize: '18px',
                                      fontWeight: '800',
                                      color: '#0f172a',
                                      minWidth: '24px',
                                      textAlign: 'center'
                                    }}>
                                      {liveMatchForTable.stats?.score2 ?? 0}
                                    </span>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      border: '2px solid #f59e0b',
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#1e293b'
                                    }}>
                                      <img
                                        src={player2Photo || FALLBACK_AVATAR}
                                        alt=""
                                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: player2Photo ? 'cover' : 'contain',
                                          padding: player2Photo ? '0' : '4px',
                                          display: 'block'
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                      {liveMatchForTable.players?.[1] || 'Oyuncu 2'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Canlı Takip Et Butonu */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLiveWatch(table.id);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                📺 CANLI TAKİP ET
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Navigation Removed */}

              {activeTab === 'survival' && <h1 className="panel-title">SURVIVAL MAÇI BAŞLAT</h1>}

              {/* 2'li Karşılaşma Content */}
              {activeTab === '2vs2' && (
                <>


                  {isReviewMode ? (
                    <div ref={reviewPanelRef} className="match-review-card" style={{
                      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
                      border: '2px solid transparent',
                      borderImage: 'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981) 1',
                      boxShadow: '0 0 40px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(139, 92, 246, 0.05)',
                      borderRadius: '24px',
                      padding: '35px 40px',
                      marginBottom: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '25px',
                      animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      minHeight: '320px',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Gradient overlay */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981)',
                        borderRadius: '24px 24px 0 0'
                      }}></div>

                      {/* Title */}
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '-10px'
                      }}>MAÇ ÖNİZLEME</div>

                      {/* Players - Yatay hizalı */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '30px',
                        width: '100%',
                        justifyContent: 'center'
                      }}>
                        {/* Player 1 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          flex: 1,
                          justifyContent: 'flex-end'
                        }}>
                          <div style={{
                            textAlign: 'right',
                            flex: 1
                          }}>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: '#cbd5e1',
                              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                              lineHeight: 1.2
                            }}>
                              {isManualPlayer1 ? (manualPlayer1Name || "İsimsiz") : (names.find(u => u.id === player1)?.fullName || "Seçilmedi")}
                            </div>
                          </div>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '3px solid #f59e0b',
                            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                            background: 'rgba(245, 158, 11, 0.1)',
                            flexShrink: 0
                          }}>
                            <img
                              src={selectedPlayer1Photo || FALLBACK_AVATAR}
                              alt="Oyuncu 1"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                            />
                          </div>
                        </div>

                        {/* VS */}
                        <div style={{
                          fontSize: '24px',
                          fontWeight: '900',
                          color: '#8b5cf6',
                          textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                          flexShrink: 0
                        }}>VS</div>

                        {/* Player 2 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          flex: 1,
                          justifyContent: 'flex-start'
                        }}>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '3px solid #3b82f6',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            flexShrink: 0
                          }}>
                            <img
                              src={selectedPlayer2Photo || FALLBACK_AVATAR}
                              alt="Oyuncu 2"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                            />
                          </div>
                          <div style={{
                            textAlign: 'left',
                            flex: 1
                          }}>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: '#cbd5e1',
                              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                              lineHeight: 1.2
                            }}>
                              {isManualPlayer2 ? (manualPlayer2Name || "İsimsiz") : (names.find(u => u.id === player2)?.fullName || "Seçilmedi")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{
                        width: '60%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)'
                      }}></div>

                      {/* Targets */}
                      <div style={{ display: 'flex', gap: '30px' }}>
                        <div style={{
                          textAlign: 'center',
                          padding: '8px 16px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: '12px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <div style={{ color: '#10b981', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>HEDEF SAYI</div>
                          <div style={{ color: '#10b981', fontSize: '22px', fontWeight: '800', textShadow: '0 0 15px rgba(16, 185, 129, 0.4)', lineHeight: 1 }}>{targetScore}</div>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          padding: '8px 16px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          borderRadius: '12px',
                          border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}>
                          <div style={{ color: '#8b5cf6', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>HEDEF ISTAKA</div>
                          <div style={{ color: '#8b5cf6', fontSize: '22px', fontWeight: '800', textShadow: '0 0 15px rgba(139, 92, 246, 0.4)', lineHeight: 1 }}>{targetRack}</div>
                        </div>
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                        {hasPenalty ? (
                          <div style={{ padding: '10px 22px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '30px', color: '#f87171', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)' }}>
                            <span>⚠️</span> PENALTI
                          </div>
                        ) : (
                          <div style={{ padding: '10px 22px', background: 'rgba(71, 85, 105, 0.2)', border: '1px solid rgba(71, 85, 105, 0.3)', borderRadius: '30px', color: '#64748b', fontSize: '13px', fontWeight: '600', opacity: 0.6 }}>
                            PENALTI YOK
                          </div>
                        )}

                        {hasAso ? (
                          <div style={{ padding: '10px 22px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: '30px', color: '#4ade80', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)' }}>
                            <span>✅</span> ASO
                          </div>
                        ) : (
                          <div style={{ padding: '10px 22px', background: 'rgba(71, 85, 105, 0.2)', border: '1px solid rgba(71, 85, 105, 0.3)', borderRadius: '30px', color: '#64748b', fontSize: '13px', fontWeight: '600', opacity: 0.6 }}>
                            ASO YOK
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        ref={playerSelectionRef}
                        className="player-selection"
                        tabIndex={-1}
                      /* onBlur logic removed to prevent race conditions with reset buttons */
                      >
                        <div ref={player1PanelRef} className={`player-input-group player-1-panel ${getGroupClass([0, 1, 2])} ${!isManualPlayer1 ? 'mode-3cscore' : 'mode-other'}`} style={{
                          borderRadius: '12px',
                          padding: '10px',
                          transition: 'all 0.2s'
                        }}>
                          {shouldShowPlayer1Badge && (
                            <div className="player-photo-badge">
                              <img src={selectedPlayer1Photo || FALLBACK_AVATAR} alt={manualPlayer1Name || 'Oyuncu 1'} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                            </div>
                          )}
                          <label className="player-label">1. Oyuncu</label>

                          {/* Minimal Toggle */}
                          <div className="player-mode-toggle" style={{
                            opacity: isReviewMode ? 0.3 : 1,
                            filter: isReviewMode ? 'blur(2px)' : 'none'
                          }}>
                            <button
                              id="p1-mode-3c"
                              className={`mode-toggle-btn mode-3c ${!isManualPlayer1 ? 'active' : ''}`}
                              onClick={() => {
                                setIsManualPlayer1(false);
                                setManualPlayer1Name("");
                                setPlayer1Warning("");
                                setActiveEditableField(null);
                              }}
                              style={{
                                transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                ...getFocusGlowStyle(0)
                              }}
                            >
                              3CSCORE
                            </button>
                            <button
                              id="p1-mode-other"
                              className={`mode-toggle-btn mode-other ${isManualPlayer1 ? 'active' : ''}`}
                              onClick={() => {
                                setIsManualPlayer1(true);
                                setPlayer1("");
                                setPlayer1Warning("");
                                setActiveEditableField(null);
                              }}
                              style={{
                                transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                ...getFocusGlowStyle(1)
                              }}
                            >
                              DİĞER
                            </button>
                          </div>

                          {!isManualPlayer1 ? (
                            <>
                              <div className="input-header">{activeEditableField === 'p1-search' ? 'OYUNCU ARA' : '3CSCORE OYUNCUSU'} {isVirtualKeyboardEnabled && activeEditableField !== 'p1-search' && <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '8px' }}>(SPACE ile ara)</span>}</div>

                              {/* Arama modu aktifken: Input + Dropdown (DİĞER modu ile aynı) */}
                              {activeEditableField === 'p1-search' ? (
                                <>
                                  <input
                                    id="p1-search-input"
                                    type="text"
                                    autoComplete="off"
                                    readOnly={true}
                                    value={p1SearchText}
                                    placeholder="İsim yazın..."
                                    className="player-input modern"
                                    style={{
                                      border: searchFocusMode === 'keyboard' ? '2px solid #3b82f6' : '2px solid #64748b',
                                      transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                      boxShadow: searchFocusMode === 'keyboard' ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none',
                                      cursor: 'text'
                                    }}
                                  />
                                  {/* Arama Sonuçları Dropdown */}
                                  <div style={{
                                    background: 'rgba(15, 23, 42, 0.98)',
                                    border: searchFocusMode === 'results' ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: '8px',
                                    marginTop: '8px',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    boxShadow: searchFocusMode === 'results' ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
                                  }}>
                                    {p1FilteredSearchPlayers.length > 0 ? (
                                      <>
                                        {p1FilteredSearchPlayers.slice(0, 6).map((player, idx) => (
                                          <div
                                            key={player.id}
                                            style={{
                                              padding: '10px 14px',
                                              // İlk öneri her zaman vurgulanır (klavye modunda da)
                                              background: idx === p1SearchIndex ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                              borderLeft: idx === p1SearchIndex ? '3px solid #3b82f6' : '3px solid transparent',
                                              color: idx === p1SearchIndex ? '#fff' : '#cbd5e1',
                                              fontSize: '14px',
                                              fontWeight: idx === p1SearchIndex ? '600' : '400',
                                              cursor: 'pointer',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            {idx === p1SearchIndex && '▶ '}{player.fullName}
                                          </div>
                                        ))}
                                        {p1FilteredSearchPlayers.length > 6 && (
                                          <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '6px' }}>
                                            +{p1FilteredSearchPlayers.length - 6} daha...
                                          </div>
                                        )}
                                        {/* Seçim uyarısı - öneri varken göster */}
                                        <div style={{
                                          background: 'rgba(34, 197, 94, 0.15)',
                                          borderTop: '1px solid rgba(34, 197, 94, 0.3)',
                                          color: '#4ade80',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          padding: '8px',
                                          marginTop: '4px'
                                        }}>
                                          {searchFocusMode === 'keyboard'
                                            ? '⎵ Seçmek için SPACE tuşuna basın'
                                            : '↵ Seçmek için ENTER tuşuna basın'}
                                        </div>
                                      </>
                                    ) : p1SearchText.length >= 2 ? (
                                      <div style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                                        "{p1SearchText}" bulunamadı
                                      </div>
                                    ) : (
                                      <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                                        En az 2 karakter yazın...
                                      </div>
                                    )}
                                  </div>
                                  {/* Mod göstergesi */}
                                  <div style={{
                                    color: '#64748b',
                                    fontSize: '11px',
                                    marginTop: '8px',
                                    textAlign: 'center'
                                  }}>
                                    {searchFocusMode === 'keyboard'
                                      ? (p1FilteredSearchPlayers.length > 0 ? '📝 Klavye • SPACE → Önerilere git' : '📝 Klavye')
                                      : '📋 Öneriler • ↑↓ Gezin • ENTER Seç • SPACE → Klavyeye dön'}
                                  </div>
                                </>
                              ) : (
                                /* Normal mod: Combobox */
                                <div className="combo-wrapper">
                                  <select
                                    id="p1-input"
                                    className="player-input modern"
                                    value={player1}
                                    onChange={(e) => {
                                      setPlayer1(e.target.value);
                                      setPlayer1Warning("");
                                      // Oyuncu seçildiğinde Oyuncu 2 paneline geç
                                      if (e.target.value) {
                                        setTimeout(() => setLocalFocusIndex(3), 100);
                                      }
                                    }}
                                    style={{
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                      ...getFocusGlowStyle(2),
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">Oyuncu seçin...</option>
                                    {filteredPlayers.map((player) => (
                                      <option key={player.id} value={player.id}>{player.fullName}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {renderInlineKeyboard('p1-search')}
                            </>
                          ) : (
                            <>
                              <div className="input-header">DİĞER OYUNCU</div>
                              <input
                                id="p1-input"
                                type="text"
                                autoComplete="off"
                                readOnly={!isMobileOnly && activeEditableField !== 'p1-manual'}
                                value={manualPlayer1Name}
                                onChange={e => {
                                  setManualPlayer1Name(e.target.value);
                                  setPlayer1Warning("");
                                }}
                                placeholder={isMobileOnly ? "İsim Giriniz" : (activeEditableField === 'p1-manual' ? "İsim yazın..." : "Giriş için OK basın")}
                                className="player-input modern"
                                style={{
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                  ...getFocusGlowStyle(2),
                                  cursor: (isMobileOnly || activeEditableField === 'p1-manual') ? 'text' : 'default'
                                }}
                                onClick={() => {
                                  setLocalFocusIndex(2);
                                  setActiveEditableField('p1-manual');
                                  if (!isMobileOnly) setTimeout(() => p1InputRef.current?.blur(), 0);
                                }}
                                ref={p1InputRef}
                              />
                              {!isMobileOnly && renderInlineKeyboard('p1-manual')}
                            </>
                          )}
                          {player1Warning && (
                            <div style={{
                              color: '#FFD28A',
                              fontSize: '12px',
                              fontWeight: 600,
                              marginTop: '6px'
                            }}>
                              {player1Warning}
                            </div>
                          )}
                        </div>

                        <div ref={player2PanelRef} className={`player-input-group player-2-panel ${getGroupClass([3, 4, 5])} ${!isManualPlayer2 ? 'mode-3cscore' : 'mode-other'}`} style={{
                          borderRadius: '12px',
                          padding: '10px',
                          transition: 'all 0.2s'
                        }}>
                          {shouldShowPlayer2Badge && (
                            <div className="player-photo-badge">
                              <img src={selectedPlayer2Photo || FALLBACK_AVATAR} alt={manualPlayer2Name || 'Oyuncu 2'} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
                            </div>
                          )}
                          <label className="player-label">2. Oyuncu</label>

                          {/* Minimal Toggle */}
                          <div className="player-mode-toggle" style={{
                            opacity: isReviewMode ? 0.3 : 1,
                            filter: isReviewMode ? 'blur(2px)' : 'none'
                          }}>
                            <button
                              id="p2-mode-3c"
                              tabIndex={-1}
                              className={`mode-toggle-btn mode-3c ${!isManualPlayer2 ? 'active' : ''}`}
                              onClick={() => {
                                setIsManualPlayer2(false);
                                setManualPlayer2Name("");
                                setPlayer2Warning("");
                                setActiveEditableField(null);
                              }}
                              style={{
                                transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                ...getFocusGlowStyle(3)
                              }}
                            >
                              3CSCORE
                            </button>
                            <button
                              id="p2-mode-other"
                              tabIndex={-1}
                              className={`mode-toggle-btn mode-other ${isManualPlayer2 ? 'active' : ''}`}
                              onClick={() => {
                                setIsManualPlayer2(true);
                                setPlayer2("");
                                setPlayer2Warning("");
                                setActiveEditableField(null);
                              }}
                              style={{
                                transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                ...getFocusGlowStyle(4)
                              }}
                            >
                              DİĞER
                            </button>
                          </div>

                          {!isManualPlayer2 ? (
                            <>
                              <div className="input-header">{activeEditableField === 'p2-search' ? 'OYUNCU ARA' : '3CSCORE OYUNCUSU'} {isVirtualKeyboardEnabled && activeEditableField !== 'p2-search' && <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '8px' }}>(SPACE ile ara)</span>}</div>

                              {/* Arama modu aktifken: Input + Dropdown (DİĞER modu ile aynı) */}
                              {activeEditableField === 'p2-search' ? (
                                <>
                                  <input
                                    id="p2-search-input"
                                    type="text"
                                    autoComplete="off"
                                    readOnly={true}
                                    value={p2SearchText}
                                    placeholder="İsim yazın..."
                                    className="player-input modern"
                                    style={{
                                      border: searchFocusMode === 'keyboard' ? '2px solid #3b82f6' : '2px solid #64748b',
                                      transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                      boxShadow: searchFocusMode === 'keyboard' ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none',
                                      cursor: 'text'
                                    }}
                                  />
                                  {/* Arama Sonuçları Dropdown */}
                                  <div style={{
                                    background: 'rgba(15, 23, 42, 0.98)',
                                    border: searchFocusMode === 'results' ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: '8px',
                                    marginTop: '8px',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    boxShadow: searchFocusMode === 'results' ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
                                  }}>
                                    {p2FilteredSearchPlayers.length > 0 ? (
                                      <>
                                        {p2FilteredSearchPlayers.slice(0, 6).map((player, idx) => (
                                          <div
                                            key={player.id}
                                            style={{
                                              padding: '10px 14px',
                                              // İlk öneri her zaman vurgulanır (klavye modunda da)
                                              background: idx === p2SearchIndex ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                              borderLeft: idx === p2SearchIndex ? '3px solid #3b82f6' : '3px solid transparent',
                                              color: idx === p2SearchIndex ? '#fff' : '#cbd5e1',
                                              fontSize: '14px',
                                              fontWeight: idx === p2SearchIndex ? '600' : '400',
                                              cursor: 'pointer',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            {idx === p2SearchIndex && '▶ '}{player.fullName}
                                          </div>
                                        ))}
                                        {p2FilteredSearchPlayers.length > 6 && (
                                          <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '6px' }}>
                                            +{p2FilteredSearchPlayers.length - 6} daha...
                                          </div>
                                        )}
                                        {/* Seçim uyarısı - öneri varken göster */}
                                        <div style={{
                                          background: 'rgba(34, 197, 94, 0.15)',
                                          borderTop: '1px solid rgba(34, 197, 94, 0.3)',
                                          color: '#4ade80',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          textAlign: 'center',
                                          padding: '8px',
                                          marginTop: '4px'
                                        }}>
                                          {searchFocusMode === 'keyboard'
                                            ? '⎵ Seçmek için SPACE tuşuna basın'
                                            : '↵ Seçmek için ENTER tuşuna basın'}
                                        </div>
                                      </>
                                    ) : p2SearchText.length >= 2 ? (
                                      <div style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                                        "{p2SearchText}" bulunamadı
                                      </div>
                                    ) : (
                                      <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                                        En az 2 karakter yazın...
                                      </div>
                                    )}
                                  </div>
                                  {/* Mod göstergesi */}
                                  <div style={{
                                    color: '#64748b',
                                    fontSize: '11px',
                                    marginTop: '8px',
                                    textAlign: 'center'
                                  }}>
                                    {searchFocusMode === 'keyboard'
                                      ? (p2FilteredSearchPlayers.length > 0 ? '📝 Klavye • SPACE → Önerilere git' : '📝 Klavye')
                                      : '📋 Öneriler • ↑↓ Gezin • ENTER Seç • SPACE → Klavyeye dön'}
                                  </div>
                                </>
                              ) : (
                                /* Normal mod: Combobox */
                                <div className="combo-wrapper">
                                  <select
                                    id="p2-input"
                                    className="player-input modern"
                                    value={player2}
                                    onChange={(e) => {
                                      setPlayer2(e.target.value);
                                      setPlayer2Warning("");
                                      // Oyuncu seçildiğinde Hedef Sayı paneline geç
                                      if (e.target.value) {
                                        // Focus'u manuel olarak kaldır ve sonraki alana geç
                                        if (document.activeElement) document.activeElement.blur();
                                        setTimeout(() => setLocalFocusIndex(6), 100);
                                      }
                                    }}
                                    style={{
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                      ...getFocusGlowStyle(5),
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">Oyuncu seçin...</option>
                                    {filteredPlayers
                                      .filter((player) => player.id !== player1)
                                      .map((player) => (
                                        <option key={player.id} value={player.id}>{player.fullName}</option>
                                      ))}
                                  </select>
                                </div>
                              )}
                              {renderInlineKeyboard('p2-search')}
                            </>
                          ) : (
                            <>
                              <div className="input-header">DİĞER OYUNCU</div>
                              <input
                                id="p2-input"
                                tabIndex={-1}
                                type="text"
                                autoComplete="off"
                                readOnly={!isMobileOnly && activeEditableField !== 'p2-manual'}
                                value={manualPlayer2Name}
                                onChange={e => {
                                  setManualPlayer2Name(e.target.value);
                                  setPlayer2Warning("");
                                }}
                                placeholder={isMobileOnly ? "İsim Giriniz" : (activeEditableField === 'p2-manual' ? "İsim yazın..." : "Giriş için OK basın")}
                                className="player-input modern"
                                style={{
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                  ...getFocusGlowStyle(5),
                                  cursor: (isMobileOnly || activeEditableField === 'p2-manual') ? 'text' : 'default'
                                }}
                                onClick={() => {
                                  setLocalFocusIndex(5);
                                  setActiveEditableField('p2-manual');
                                  if (!isMobileOnly) setTimeout(() => p2InputRef.current?.blur(), 0);
                                }}
                                ref={p2InputRef}
                              />
                              {!isMobileOnly && renderInlineKeyboard('p2-manual')}
                            </>
                          )}
                          {player2Warning && (
                            <div style={{
                              color: '#FFD28A',
                              fontSize: '12px',
                              fontWeight: 600,
                              marginTop: '6px'
                            }}>
                              {player2Warning}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        ref={matchSettingsRef}
                        className={`match-settings ${getGroupClass([6, 7])}`}
                        tabIndex={-1}
                        onBlur={(e) => {
                          // Panel dışına tıklandığında (focus kaybedildiğinde)
                          const relatedTarget = e.relatedTarget;
                          const currentTarget = e.currentTarget;
                          // Eğer yeni focus edilen element bu panel içinde değilse VEYA null ise (dışarı tıklandı)
                          const isOutside = !relatedTarget || !currentTarget.contains(relatedTarget);
                          if (isOutside && (localFocusIndex === 6 || localFocusIndex === 7)) {
                            // Penaltı/ASO paneline geç
                            setTimeout(() => setLocalFocusIndex(8), 100);
                          }
                        }}
                      >
                        <div className="setting-group" style={{
                          border: '1px solid transparent',
                          borderRadius: '12px',
                          padding: '10px',
                          transition: 'all 0.2s',
                          ...getFocusGlowStyle(6, 3)
                        }}>
                          <label className="setting-label">Hedef Sayı</label>
                          <div className="setting-control-bar">
                            <button
                              className="setting-control-btn left"
                              onClick={() => setTargetScore(Math.max(15, targetScore - 5))}
                              style={{
                                opacity: isReviewMode ? 0.3 : 1,
                                filter: isReviewMode ? 'blur(2px)' : 'none'
                              }}
                            >
                              −5
                            </button>
                            <span className="setting-value-text">{targetScore}</span>
                            <button
                              id="score-plus-btn"
                              className="setting-control-btn right"
                              onClick={() => setTargetScore(Math.min(50, targetScore + 5))}
                              style={{
                                opacity: isReviewMode ? 0.3 : 1,
                                filter: isReviewMode ? 'blur(2px)' : 'none'
                              }}
                            >
                              +5
                            </button>
                          </div>
                        </div>

                        <div className="setting-group" style={{
                          border: '1px solid transparent',
                          borderRadius: '12px',
                          padding: '10px',
                          transition: 'all 0.2s',
                          ...getFocusGlowStyle(7, 3)
                        }}>
                          <label className="setting-label">Hedef İstaka</label>
                          <div className="setting-control-bar">
                            <button
                              className="setting-control-btn left"
                              onClick={() => setTargetRack(Math.max(15, targetRack - 5))}
                              style={{
                                opacity: isReviewMode ? 0.3 : 1,
                                filter: isReviewMode ? 'blur(2px)' : 'none'
                              }}
                            >
                              −5
                            </button>
                            <span className="setting-value-text">{targetRack}</span>
                            <button
                              id="rack-plus-btn"
                              className="setting-control-btn right"
                              onClick={() => setTargetRack(Math.min(50, targetRack + 5))}
                              style={{
                                opacity: isReviewMode ? 0.3 : 1,
                                filter: isReviewMode ? 'blur(2px)' : 'none'
                              }}
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </div>

                      <div ref={penaltyAsoRef} className={`match-options ${getGroupClass([8, 9])}`}>
                        <label className="checkbox-container" style={{
                          border: '1px solid transparent',
                          borderRadius: '8px',
                          padding: '5px',
                          opacity: (isReviewMode && !hasPenalty) ? 0.3 : 1,
                          filter: (isReviewMode && !hasPenalty) ? 'blur(2px)' : 'none',
                          transition: 'box-shadow 0.2s ease, border 0.2s ease',
                          ...getFocusGlowStyle(8)
                        }}>
                          <input
                            id="penalty-check"
                            type="checkbox"
                            checked={hasPenalty}
                            onChange={(e) => setHasPenalty(e.target.checked)}
                            className="checkbox-input"
                          />
                          <span className="checkbox-label">Penaltı</span>
                        </label>
                        <label className="checkbox-container" style={{
                          border: '1px solid transparent',
                          borderRadius: '8px',
                          padding: '5px',
                          opacity: (isReviewMode && !hasAso) ? 0.3 : 1,
                          filter: (isReviewMode && !hasAso) ? 'blur(2px)' : 'none',
                          transition: 'box-shadow 0.2s ease, border 0.2s ease',
                          ...getFocusGlowStyle(9)
                        }}>
                          <input
                            id="aso-check"
                            type="checkbox"
                            checked={hasAso}
                            onChange={(e) => setHasAso(e.target.checked)}
                            className="checkbox-input"
                          />
                          <span className="checkbox-label">ASO</span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="action-buttons-container">
                    {showLocalButton && (() => {
                      // Her iki oyuncu seçilmiş mi kontrolü
                      const isPlayer1Ready = isManualPlayer1 ? manualPlayer1Name.trim() : player1;
                      const isPlayer2Ready = isManualPlayer2 ? manualPlayer2Name.trim() : player2;
                      const canStartMatch = isPlayer1Ready && isPlayer2Ready;

                      return (
                        <button
                          id="start-game-btn"
                          className={`start-button ${canStartMatch ? 'active' : 'disabled'} ${getGroupClass([10])}`}
                          onClick={canStartMatch ? () => {
                            if (localFocusIndex !== 10) {
                              setLocalFocusIndex(10);
                            } else {
                              handleStart();
                            }
                          } : undefined}
                          disabled={!canStartMatch}
                          style={{
                            transition: 'box-shadow 0.2s ease, border 0.2s ease',
                            background: canStartMatch ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#64748b',
                            cursor: canStartMatch ? 'pointer' : 'not-allowed',
                            opacity: canStartMatch ? 1 : 0.7,
                            ...getFocusGlowStyle(10, 3)
                          }}
                        >
                          {canStartMatch ? 'Maçı Başlat' : '⚠️ Oyuncu Seçin'}
                        </button>
                      );
                    })()}
                    {showRemoteButton && (() => {
                      // Her iki oyuncu seçilmiş mi kontrolü
                      const isPlayer1Ready = isManualPlayer1 ? manualPlayer1Name.trim() : player1;
                      const isPlayer2Ready = isManualPlayer2 ? manualPlayer2Name.trim() : player2;

                      // MEB (Maç Başlatma Engeli): Oyuncu kendisinin olmadığı maçı başlatamaz
                      // SADECE GİRİŞ YAPMIŞ OYUNCULAR İÇİN GEÇERLİ - Misafir (Default) ise engel yok (veya tam tersi?)
                      // Kullanıcının talebi: "Prevent players from starting games they are not a part of"
                      const isUserInMatch = !currentUser || (currentUser.id === DEFAULT_USER_PROFILE.id) ||
                        (isManualPlayer1 ? (manualPlayer1Name.trim() === currentUser.fullName) : (player1 === currentUser.id || player1 === currentUser.uid)) ||
                        (isManualPlayer2 ? (manualPlayer2Name.trim() === currentUser.fullName) : (player2 === currentUser.id || player2 === currentUser.uid));

                      const canStartMatch = isPlayer1Ready && isPlayer2Ready && !isTableBusy && isUserInMatch;

                      return (
                        <button
                          className={`start-button ${canStartMatch ? "active" : "disabled"}`}
                          onClick={canStartMatch ? handleRemoteSend : undefined}
                          disabled={!canStartMatch}
                          style={{
                            background: isTableBusy ? '#334155' : (canStartMatch ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#64748b'),
                            cursor: canStartMatch ? 'pointer' : 'not-allowed',
                            opacity: canStartMatch ? 1 : 0.7,
                            fontWeight: '700'
                          }}
                        >
                          {isTableBusy ? '⛔ MASA DOLU' : (!isPlayer1Ready || !isPlayer2Ready) ? '⚠️ OYUNCU SEÇİN' : (!isUserInMatch ? '🚫 MAÇTA DEĞİLSİNİZ' : '▶ MAÇI BAŞLAT')}
                        </button>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Survival Content */}
              {activeTab === 'survival' && (
                <div className="survival-content">
                  <div className="survival-players-grid">
                    {/* Player 1 */}
                    <div className={`survival-player-box ${deviceMode === 'local' && survivalFocusIndex === 0 ? 'focused' : ''}`}>
                      <label className="survival-player-label">1. Oyuncu</label>
                      <select
                        ref={survivalSelect1Ref}
                        value={survivalPlayer1}
                        onChange={e => setSurvivalPlayer1(e.target.value)}
                        className="survival-player-select"
                        style={deviceMode === 'local' && survivalFocusIndex === 0 ? {
                          border: '3px solid #3b82f6',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                        } : {}}
                      >
                        <option value="">Seçiniz</option>
                        {getAvailableSurvivalPlayers(survivalPlayer1).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Player 2 */}
                    <div className={`survival-player-box ${deviceMode === 'local' && survivalFocusIndex === 1 ? 'focused' : ''}`}>
                      <label className="survival-player-label">2. Oyuncu</label>
                      <select
                        ref={survivalSelect2Ref}
                        value={survivalPlayer2}
                        onChange={e => setSurvivalPlayer2(e.target.value)}
                        className="survival-player-select"
                        style={deviceMode === 'local' && survivalFocusIndex === 1 ? {
                          border: '3px solid #3b82f6',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                        } : {}}
                      >
                        <option value="">Seçiniz</option>
                        {getAvailableSurvivalPlayers(survivalPlayer2).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Player 3 */}
                    <div className={`survival-player-box ${deviceMode === 'local' && survivalFocusIndex === 2 ? 'focused' : ''}`}>
                      <label className="survival-player-label">3. Oyuncu</label>
                      <select
                        ref={survivalSelect3Ref}
                        value={survivalPlayer3}
                        onChange={e => setSurvivalPlayer3(e.target.value)}
                        className="survival-player-select"
                        style={deviceMode === 'local' && survivalFocusIndex === 2 ? {
                          border: '3px solid #3b82f6',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                        } : {}}
                      >
                        <option value="">Seçiniz</option>
                        {getAvailableSurvivalPlayers(survivalPlayer3).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Player 4 */}
                    <div className={`survival-player-box ${deviceMode === 'local' && survivalFocusIndex === 3 ? 'focused' : ''}`}>
                      <label className="survival-player-label">4. Oyuncu (Opsiyonel)</label>
                      <select
                        ref={survivalSelect4Ref}
                        value={survivalPlayer4}
                        onChange={e => setSurvivalPlayer4(e.target.value)}
                        className="survival-player-select"
                        style={deviceMode === 'local' && survivalFocusIndex === 3 ? {
                          border: '3px solid #3b82f6',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                        } : {}}
                      >
                        <option value="">Seçiniz (Opsiyonel)</option>
                        {getAvailableSurvivalPlayers(survivalPlayer4).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="survival-info-box">
                    <h3 className="survival-info-title">Oyun Kuralları</h3>
                    <ul className="survival-info-list">
                      <li className="survival-info-item">👥 3 veya 4 oyuncu ile oynanır.</li>
                      <li className="survival-info-item">⏱️ 2 Set, her set 45 dakikadır.</li>
                      <li className="survival-info-item">🎯 Başlangıç puanı 30'dur.</li>
                      <li className="survival-info-item">⏸️ Her oyuncunun 2 mola hakkı vardır.</li>
                    </ul>
                  </div>

                  <div className="action-buttons-container">
                    {showLocalButton && (
                      <button
                        ref={survivalStartBtnRef}
                        className={`start-button ${[survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                          .filter(p => p !== "").length >= 3
                          ? "active"
                          : "disabled"
                          }`}
                        style={deviceMode === 'local' && survivalFocusIndex === 4 ? {
                          border: '3px solid #FFD700',
                          boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
                          transform: 'scale(1.02)'
                        } : {}}
                        onClick={handleSurvivalStart}
                        disabled={
                          [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                            .filter(p => p !== "").length < 3
                        }
                      >
                        Survival Maçını Başlat
                      </button>
                    )}
                    {showRemoteButton && (() => {
                      const selectedCount = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4].filter(p => p !== "").length;
                      const isUserInMatch = !currentUser || (currentUser.id === DEFAULT_USER_PROFILE.id) ||
                        [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4].includes(currentUser.id);

                      const canStartMatch = !isTableBusy && selectedCount >= 3 && isUserInMatch;

                      return (
                        <button
                          className={`start-button ${canStartMatch ? "active" : "disabled"}`}
                          onClick={canStartMatch ? handleRemoteSend : undefined}
                          disabled={!canStartMatch}
                          style={{
                            background: isTableBusy ? '#334155' : (canStartMatch ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : '#64748b'),
                            cursor: canStartMatch ? 'pointer' : 'not-allowed',
                            opacity: canStartMatch ? 1 : 0.8
                          }}
                        >
                          {isTableBusy ? '⛔ DOLU MASA' : selectedCount < 3 ? '⚠️ OYUNCU SEÇİN' : (!isUserInMatch ? '🚫 MAÇTA DEĞİLSİNİZ' : '📡 Uzaktan Başlat')}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Mobile Controller for Testing - Devre Dışı Bırakıldı (Kiosk Modu) */}
      {/* 
      <div className="embedded-controller-container">
        <div className="embedded-phone-frame">
          <MemoizedMobileController 
            onBack={() => {}} 
            tableId={SALON_INFO.tables[0].id}
          />
        </div>
      </div>
      */}


    </div>
  );
}

export default StartScreen;
