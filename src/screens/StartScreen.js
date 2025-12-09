import React, { useEffect, useState, useRef } from "react";
import { 
  getPlayerNames, 
  sendRemoteStartCommand, 
  listenToTableStatus, 
  updateTableStatus,
  listenForMatchCommands
} from "../services/firebase";
import ScoreboardReceiver from "./ScoreboardReceiver";
import MobileController from "./MobileController";
import GameModeSelector from "../components/GameModeSelector";
import VirtualKeyboard from "../components/VirtualKeyboard";
import deviceProfile from "../config/deviceProfile";
import "./StartScreen.css";

const SALON_INFO = {
  name: "SALON 3CSCORE",
  city: "SAMSUN",
  tables: [
    { id: "table_1", name: "Masa 1" }
  ],
  logo: "/logo.png"
};

const FALLBACK_AVATAR = "/logo.png";

const TABLE_BACKGROUND_URL = `${process.env.PUBLIC_URL || ''}/3cscoreTable.png`;

const START_SCREEN_BACKGROUND_STYLE = {
  backgroundImage: `linear-gradient(135deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.88) 100%), url('${TABLE_BACKGROUND_URL}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
  backgroundBlendMode: 'soft-light',
  isolation: 'isolate'
};

const FALLBACK_PLAYER_LIST = [
  { id: 'player_ibrahim_topyildiz', fullName: 'İbrahim TOPYILDIZ', city: 'Samsun', salon: 'Salon 3CScore' },
  { id: 'player_ilhami_ilhan', fullName: 'İlhami İLHAN', city: 'Samsun', salon: 'Salon 3CScore' },
  { id: 'player_erol_oran', fullName: 'Erol ORAN', city: 'Samsun', salon: 'Salon 3CScore' },
  { id: 'player_huseyin_yolcu', fullName: 'Hüseyin YOLCU', city: 'Samsun', salon: 'Salon 3CScore' },
  { id: 'player_ahmet_senol_terzi', fullName: 'Ahmet Şenol TERZİ', city: 'Samsun', salon: 'Salon 3CScore' },
  { id: 'player_hasan_haciomeroglu', fullName: 'Hasan HACIÖMEROĞLU', city: 'Samsun', salon: 'Salon 3CScore' }
];

const DEFAULT_USER_PROFILE = {
  id: FALLBACK_PLAYER_LIST[0].id,
  fullName: FALLBACK_PLAYER_LIST[0].fullName,
  city: FALLBACK_PLAYER_LIST[0].city,
  salon: FALLBACK_PLAYER_LIST[0].salon
};

const filterPlayersByCity = (players = [], city) => {
  if (!city) return players;
  const normalizedCity = city.toLocaleLowerCase('tr-TR');
  const filtered = players.filter((player) => (player.city || '').toLocaleLowerCase('tr-TR') === normalizedCity);
  return filtered.length > 0 ? filtered : players;
};

function StartScreen({ onStart, onSurvivalStart, loggedInUser }) {
  const [activeTab, setActiveTab] = useState("2vs2");
  const [names, setNames] = useState([]);
  const [deviceMode, setDeviceMode] = useState(null);
  const [isScoreboardMode, setIsScoreboardMode] = useState(false);
  const [showMobileController, setShowMobileController] = useState(false);
  const [controllerReadOnly, setControllerReadOnly] = useState(false);
  // Navigation State
  const [focusedIndex, setFocusedIndex] = useState(1);
  const focusedIndexRef = React.useRef(1);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // Audio Context Ref
  const audioCtxRef = React.useRef(null);
  const navHandlersRef = React.useRef({
    handleNavAction: () => {},
    handleLocalNavAction: () => {}
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

  // Table Status State
  const [tableStatus, setTableStatus] = useState(null); // { status: 'BUSY' | 'IDLE', currentMatch: ... }
  const [allTableStatuses, setAllTableStatuses] = useState({}); // Tüm masaların durumları: { table_1: {...}, table_2: {...} }
  const [isMatchInfoOpen, setIsMatchInfoOpen] = useState(false); // Accordion state for Live Matches
  const [isStartMatchOpen, setIsStartMatchOpen] = useState(true); // Accordion state for Start Match
  const [winnerOverlayData, setWinnerOverlayData] = useState(null); // Kazanan ekranı verisi

  const [selectedTableId, setSelectedTableId] = useState(SALON_INFO.tables[0].id);

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
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [incomingMatchData, setIncomingMatchData] = useState(null);
  
  const [activeEditableField, setActiveEditableField] = useState(null); // 'p1-manual' | 'p2-manual'
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
    'p2-manual': '2. oyuncu – manuel isim girişi'
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
      if (elementId) {
        // Use setTimeout to allow render to complete if switching modes
        setTimeout(() => {
            const el = document.getElementById(elementId);
            if (el) el.focus();
        }, 0);
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
  useEffect(() => {
    if (deviceMode !== 'local') return;

    const isPointInside = (el, x, y) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const handleDocumentClick = (e) => {
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
    return text
      .toString()
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i');
  }, []);


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
    }
  }, [activeEditableField]);


  const handleVirtualKeyPress = React.useCallback((value) => {
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name((prev) => `${prev}${value}`);
      setPlayer1Warning("");
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name((prev) => `${prev}${value}`);
      setPlayer2Warning("");
    }
  }, [activeEditableField]);

  const handleVirtualBackspace = React.useCallback(() => {
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name((prev) => prev.slice(0, -1));
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name((prev) => prev.slice(0, -1));
    }
  }, [activeEditableField]);

  const handleVirtualClear = React.useCallback(() => {
    if (activeEditableField === 'p1-manual') {
      setManualPlayer1Name("");
      setPlayer1Warning("");
    } else if (activeEditableField === 'p2-manual') {
      setManualPlayer2Name("");
      setPlayer2Warning("");
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
    }
  }, [activeEditableField]);

  const handleVirtualExit = React.useCallback(() => {
    cancelActiveEditing();
  }, [cancelActiveEditing]);

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

    if (loggedInUser) {
      console.log("✅ Giriş Yapan Kullanıcı:", loggedInUser);
      setCurrentUser(loggedInUser);
      setFilteredPlayers(filterPlayersByCity(names, loggedInUser.city));
      return;
    }

    const normalizedDefaultName = normalizeSearchText(DEFAULT_USER_PROFILE.fullName);
    const fallbackUser = names.find((user) => normalizeSearchText(user.fullName) === normalizedDefaultName);

    if (fallbackUser) {
      console.log("ℹ️ Varsayılan kullanıcı atanıyor:", fallbackUser.fullName);
      setCurrentUser(fallbackUser);
      setFilteredPlayers(filterPlayersByCity(names, fallbackUser.city));
    } else {
      console.log("⚠️ Varsayılan kullanıcı listede bulunamadı, tüm oyuncular gösterilecek.");
      setCurrentUser(DEFAULT_USER_PROFILE);
      setFilteredPlayers(names);
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

  // Cihaz tipini algıla - Mobil/Masaüstü otomatik algılama
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const screenWidth = window.innerWidth;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // URL parametresinden mobile zorlama kontrolü
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    // Mobil algılama: User Agent VEYA (ekran <1024px VE touch var) VEYA (touch var VE tablet değil) VEYA (forceMobile)
    const isMobile = forceMobile || /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) 
                   || (screenWidth <= 1024 && hasTouch);
    
    console.log('🔍 User Agent:', userAgent);
    console.log('🔍 Screen Width:', screenWidth);
    console.log('🔍 Has Touch:', hasTouch);
    console.log('🔍 isMobile:', isMobile);
    
    if (isMobile) {
      // Mobil cihaz -> Kumanda modu için StartScreen göster
      console.log('📱 StartScreen: Mobil cihaz algılandı, mod seçim ekranı');
      setDeviceMode('controller'); // DİKKAT: null yerine 'controller' yapıyoruz ki form açılsın
      setIsScoreboardMode(false); // Scoreboard modunu kapat
    } else {
      // Masaüstü -> Ana ekranı (Logo) göster ve dinlemeye başla
      console.log('🖥️ StartScreen: Masaüstü algılandı, Ana Ekran gösteriliyor');
      setDeviceMode(null); // Logo ekranı
      setIsScoreboardMode(false); // ScoreboardReceiver'ı kapat, StartScreen dinleyecek
      
      // Masaüstü uygulaması (Tabela) açıldığında ve boşta beklerken masayı IDLE yap
      // Bu sayede önceki oturumdan kalan 'BUSY' durumu temizlenir.
      updateTableStatus(SALON_INFO.tables[0].id, 'IDLE');
    }
  }, []);

  // Masa durumunu dinle (Mobil/Controller modu için)
  useEffect(() => {
    if (deviceMode === 'controller') {
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
    const tables = SALON_INFO.tables || [];
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
  }, []);

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
    setTimeout(() => setLocalFocusIndex(0), 100);
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

    if (e.key === 'ArrowRight') {
      if (canMoveForward(localFocusIndex)) {
        if (localFocusIndex === 2) setPlayer1Warning("");
        if (localFocusIndex === 5) setPlayer2Warning("");
        changeFocus(localFocusIndex < maxIndex ? localFocusIndex + 1 : 0);
      } else {
        showFieldWarning(localFocusIndex);
      }
    } else if (e.key === 'ArrowLeft') {
      changeFocus(localFocusIndex > 0 ? localFocusIndex - 1 : maxIndex);
    } else if (e.key === 'ArrowUp') {
      let handled = false;
      if (localFocusIndex === 2 && !isManualPlayer1) { setPlayer1(cyclePlayer(player1, 'prev', p1List)); handled = true; }
      if (localFocusIndex === 5 && !isManualPlayer2) { setPlayer2(cyclePlayer(player2, 'prev', p2List)); handled = true; }
      if (localFocusIndex === 6) { setTargetScore(Math.min(50, targetScore + 5)); handled = true; }
      if (localFocusIndex === 7) { setTargetRack(Math.min(50, targetRack + 5)); handled = true; }
      if (!handled) {
        // No-op: arrow navigation between panels disabled intentionally
      }
    } else if (e.key === 'ArrowDown') {
      let handled = false;
      if (localFocusIndex === 2 && !isManualPlayer1) { setPlayer1(cyclePlayer(player1, 'next', p1List)); handled = true; }
      if (localFocusIndex === 5 && !isManualPlayer2) { setPlayer2(cyclePlayer(player2, 'next', p2List)); handled = true; }
      if (localFocusIndex === 6) { setTargetScore(Math.max(5, targetScore - 5)); handled = true; }
      if (localFocusIndex === 7) { setTargetRack(Math.max(5, targetRack - 5)); handled = true; }
      if (!handled) {
        // No-op
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (localFocusIndex === 0) { setIsManualPlayer1(false); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 1) { setIsManualPlayer1(true); setActiveEditableField(null); changeFocus(2); }
      else if (localFocusIndex === 3) { setIsManualPlayer2(false); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 4) { setIsManualPlayer2(true); setActiveEditableField(null); changeFocus(5); }
      else if (localFocusIndex === 8) setHasPenalty(!hasPenalty);
      else if (localFocusIndex === 9) setHasAso(!hasAso);
    } else if (e.key === 'Enter') {
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
    } else if (e.key === 'Backspace') {
      if (localFocusIndex > 0) {
        setLocalFocusIndex(localFocusIndex - 1);
      }
    } else if (e.key === 'Escape') {
      setDeviceMode(null); // Back to Main Menu
    }
  };

  useEffect(() => {
    navHandlersRef.current = {
      handleNavAction,
      handleLocalNavAction
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
      const isFormElement = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag);

      // Prevent default scrolling for arrow keys and space ONLY if not in a form element
      // This allows standard interaction with inputs/buttons (e.g. Space to toggle checkbox)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        if (!isFormElement) {
          e.preventDefault();
        }
      }

      // Menu tuşunu engelle
      if (e.key === 'ContextMenu' || e.code === 'ContextMenu') {
        e.preventDefault();
        return;
      }

      if (deviceMode === null) {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') navHandlersRef.current.handleNavAction('RIGHT');
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') navHandlersRef.current.handleNavAction('LEFT');
        else if (e.key === 'Enter' || e.key === ' ') navHandlersRef.current.handleNavAction('ENTER');
      } else if (deviceMode === 'local') {
        const currentActiveField = activeEditableFieldRef.current;
        
        if (currentActiveField) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleVirtualEnter();
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
            }
            return;
          }
          if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            navHandlersRef.current.handleLocalNavAction(e);
            return;
          }
          return;
        }

        // Form elemanındaysak ve ok tuşlarına basıldıysa, custom navigasyonu engelle (çakışmayı önle)
        // Ancak Enter ve Escape her zaman çalışmalı
        if (isFormElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Backspace'].includes(e.key)) {
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
        navHandlersRef.current.handleLocalNavAction(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    handleVirtualEnter
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
      } else if (data.status === 'COMMAND' && data.command === 'NAV') {
          // NAV Logic
          const action = data.payload.action;
          console.log('🎮 NAV Command:', action);
          navHandlersRef.current.handleNavAction(action);
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
        data.settings.targetScore,
        data.settings.targetRack,
        data.settings.hasPenalty,
        data.settings.hasAso
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
            // Countdown bitti, maçı başlat
            setShowMatchStartOverlay(false);
            setDeviceMode('local');
            setTimeout(() => {
              if (incomingMatchData) {
                executeGameStart(incomingMatchData);
              }
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showMatchStartOverlay, incomingMatchData, executeGameStart]);

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
    
    onStart(finalPlayer1, finalPlayer2, targetScore, targetRack, hasPenalty, hasAso, false);
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

    if (activeTab === "2vs2") {
      let finalPlayer1 = isManualPlayer1 ? manualPlayer1Name.trim() : resolveName(player1);
      let finalPlayer2 = isManualPlayer2 ? manualPlayer2Name.trim() : resolveName(player2);
      
      // Fotoğraf URL'lerini al
      const photo1 = isManualPlayer1 ? null : resolvePhoto(player1);
      const photo2 = isManualPlayer2 ? null : resolvePhoto(player2);
      
      console.log("📷 handleRemoteSend - player1 ID:", player1, "-> name:", finalPlayer1, "-> photo:", photo1);
      console.log("📷 handleRemoteSend - player2 ID:", player2, "-> name:", finalPlayer2, "-> photo:", photo2);
      console.log("📷 names array sample:", names.slice(0, 3).map(n => ({ id: n.id, name: n.fullName, photo: n.photoURL ? 'VAR' : 'YOK' })));
      
      // İsim girilmemişse varsayılan isimleri ata
      if (!finalPlayer1) finalPlayer1 = "OYUNCU 1";
      if (!finalPlayer2) finalPlayer2 = "OYUNCU 2";

      if (finalPlayer1 && finalPlayer2 && finalPlayer1 !== finalPlayer2) {
        try {
          await sendRemoteStartCommand({
            mode: "2vs2",
            players: [finalPlayer1, finalPlayer2],
            playerPhotos: { [finalPlayer1]: photo1, [finalPlayer2]: photo2 },
            settings: { targetScore, targetRack, hasPenalty, hasAso }
          }, selectedTableId);
          setErrorMessage("📡 Komut Başarıyla Gönderildi!");
          setTimeout(() => {
            setErrorMessage(null);
            setControllerReadOnly(false);
            setShowMobileController(true); // Mobil kontrol paneline geç
          }, 2000);
        } catch (error) {
          setErrorMessage("❌ Komut Gönderilemedi: " + error.message);
        }
      } else {
        setErrorMessage("⚠️ Farklı iki oyuncu seçmelisiniz!");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } else if (activeTab === "survival") {
      // Survival oyuncularını çözümle
      const selectedPlayers = [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
        .filter(p => p !== "")
        .map(id => resolveName(id));

      if (selectedPlayers.length >= 3) {
        try {
          await sendRemoteStartCommand({
            mode: "survival",
            players: selectedPlayers,
            settings: {}
          }, SALON_INFO.tables[0].id);
          setErrorMessage("📡 Komut Başarıyla Gönderildi!");
          setTimeout(() => setErrorMessage(null), 3000);
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
    
    return (
      <div className="match-start-overlay">
        <div className="match-start-screen">
          <div className="match-start-title">CANLI MAÇ BAŞLIYOR...</div>

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
              <span className="match-detail-value">{incomingMatchData.settings.targetScore}</span>
            </div>
            <div className="match-detail-item">
              <span className="match-detail-label">Hedef İstaka</span>
              <span className="match-detail-value">{incomingMatchData.settings.targetRack}</span>
            </div>
            <div className="match-detail-item">
              <span className="match-detail-label">Penaltı</span>
              <span className="match-detail-value" style={{ color: incomingMatchData.settings.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                {incomingMatchData.settings.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div className="match-detail-item">
              <span className="match-detail-label">ASO</span>
              <span className="match-detail-value" style={{ color: incomingMatchData.settings.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                {incomingMatchData.settings.hasAso ? 'VAR' : 'YOK'}
              </span>
            </div>
          </div>

          {matchStartCountdown > 0 && (
            <div className="match-start-countdown">{matchStartCountdown}</div>
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

  // Mod seçim ekranı (sadece desktop/tablet için)
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
        justifyContent: 'center',
        position: 'relative',
        padding: '10px',
        overflow: 'hidden'
      }}>
        
        <div style={{
          maxWidth: '700px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%'
        }}>
          {/* Centered Logo and Subtitle */}
          <div style={{
            marginBottom: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0'
          }}>
            <a 
              href="https://3cscore.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src="/logo.png"
                alt="3CSCORE Logo" 
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'contain',
                  animation: 'logoPulse 3s ease-in-out infinite'
                }}
              />
            </a>
            <div style={{
              marginTop: '5px',
              fontSize: '16px',
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
          
          {/* Listening Status Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 29, 46, 0.95), rgba(42, 45, 58, 0.95))',
            border: '2px solid rgba(255, 215, 0, 0.6)',
            borderRadius: '20px',
            padding: '10px 20px',
            marginBottom: '30px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 215, 0, 0.2)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              right: '-50%',
              bottom: '-50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
              animation: 'pulse 3s ease-in-out infinite'
            }}></div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '5px',
              position: 'relative',
              zIndex: 1
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                background: '#FFD700',
                borderRadius: '50%',
                animation: 'blinkDot 1.5s ease-in-out infinite',
                boxShadow: '0 0 15px #FFD700',
                display: 'inline-block'
              }}></span>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#FFD700',
                letterSpacing: '1px',
                textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)'
              }}>3CSCORE LISTENING</span>
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '500',
              position: 'relative',
              zIndex: 1
            }}>
              Mobil cihazdan maç başlatma talebi bekleniyor...
            </div>
          </div>

          {/* Yerel Maç Başlat Panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '700px'
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
    return (
      <MobileController 
        onBack={() => {
          setShowMobileController(false);
          setControllerReadOnly(false);
        }} 
        tableId={SALON_INFO.tables[0].id}
        readOnly={controllerReadOnly}
      />
    );
  }

  // Controller Mode (Mobil) veya Local Mode (Desktop)

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
    <div className="start-screen-wrapper" style={{
      ...START_SCREEN_BACKGROUND_STYLE,
      position: 'relative'
    }}>

      {/* CANLI İZLE MODAL */}
      {showLiveWatch && liveMatch && (
        <div className="live-watch-overlay" role="dialog" aria-label="Canlı maç takibi">
          <div className="live-watch-modal">
            <div className="live-watch-header">
              <div>
                <div className="live-watch-title">CANLI MAÇ TAKİP</div>
                <div className="live-watch-sub">{SALON_INFO.tables[0].name} • İstaka {liveMatch.stats?.inning ?? 0}</div>
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
          padding: '30px 50px',
          borderRadius: '15px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {errorMessage}
        </div>
      )}

      <div className={`start-screen-panel ${deviceMode === 'local' ? 'focus-mode' : ''}`} style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
        
        {/* SALON INFO HEADER */}
        {deviceMode === 'controller' && (
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '15px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '5px'
              }}>
                <img 
                  src={SALON_INFO.logo} 
                  alt="Salon Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px' }}>
                  {currentUser.salon || currentUser.city}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', display: 'flex', gap: '10px' }}>
                  <span>📍 {currentUser.city}</span>
                  {currentUser.salon && <span>🎱 {currentUser.salon}</span>}
                </div>
              </div>
            </div>

            {/* Network Status Indicator */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: networkStatus === 'MATCHED' ? '#22c55e' : (networkStatus === 'MISMATCH' ? '#ef4444' : '#eab308'),
                boxShadow: networkStatus === 'MATCHED' ? '0 0 10px #22c55e' : 'none',
                transition: 'all 0.3s ease'
              }}></div>
              <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>
                {networkStatus === 'MATCHED' ? 'AYNI AĞ' : (networkStatus === 'MISMATCH' ? 'UZAKTAN' : 'KONTROL')}
              </span>
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
                    {SALON_INFO.tables.map(table => {
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
                               {/* Oyuncu bilgileri - yatay düzen */}
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
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '2px solid #00f2fe',
                    boxShadow: '0 0 30px rgba(0, 242, 254, 0.2), inset 0 0 20px rgba(0, 242, 254, 0.05)',
                    borderRadius: '20px',
                    padding: '40px 30px',
                    marginBottom: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '25px',
                    animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '300px',
                    justifyContent: 'center'
                }}>
                    {/* Players */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center' }}>
                        {/* Player 1 with Photo */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '10px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '3px solid #00f2fe',
                                boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
                                background: 'rgba(0, 242, 254, 0.1)'
                            }}>
                                <img 
                                    src={selectedPlayer1Photo || FALLBACK_AVATAR} 
                                    alt="Oyuncu 1" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                                />
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {isManualPlayer1 ? (manualPlayer1Name || "İsimsiz") : (names.find(u => u.id === player1)?.fullName || "Seçilmedi")}
                            </div>
                        </div>
                        
                        {/* VS Badge */}
                        <div style={{ 
                            fontSize: '24px', 
                            fontWeight: '900', 
                            color: '#00f2fe', 
                            fontStyle: 'italic',
                            background: 'rgba(0, 242, 254, 0.1)',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
                        }}>VS</div>
                        
                        {/* Player 2 with Photo */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '10px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '3px solid #00f2fe',
                                boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
                                background: 'rgba(0, 242, 254, 0.1)'
                            }}>
                                <img 
                                    src={selectedPlayer2Photo || FALLBACK_AVATAR} 
                                    alt="Oyuncu 2" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                                />
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {isManualPlayer2 ? (manualPlayer2Name || "İsimsiz") : (names.find(u => u.id === player2)?.fullName || "Seçilmedi")}
                            </div>
                        </div>
                    </div>

                    <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0, 242, 254, 0.3), transparent)' }}></div>

                    {/* Targets */}
                    <div style={{ display: 'flex', gap: '60px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px', fontWeight: '600' }}>HEDEF SAYI</div>
                            <div style={{ color: '#00f2fe', fontSize: '42px', fontWeight: '800', textShadow: '0 0 20px rgba(0, 242, 254, 0.4)', lineHeight: 1 }}>{targetScore}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px', fontWeight: '600' }}>HEDEF ISTAKA</div>
                            <div style={{ color: '#00f2fe', fontSize: '42px', fontWeight: '800', textShadow: '0 0 20px rgba(0, 242, 254, 0.4)', lineHeight: 1 }}>{targetRack}</div>
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        {hasPenalty ? (
                            <div style={{ padding: '8px 20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '30px', color: '#fca5a5', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>⚠️</span> PENALTI
                            </div>
                        ) : (
                            <div style={{ padding: '8px 20px', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '30px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', textDecoration: 'line-through' }}>
                                PENALTI YOK
                            </div>
                        )}
                        
                        {hasAso ? (
                            <div style={{ padding: '8px 20px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '30px', color: '#86efac', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>✅</span> ASO
                            </div>
                        ) : (
                            <div style={{ padding: '8px 20px', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '30px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', textDecoration: 'line-through' }}>
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
                onBlur={(e) => {
                  // Oyuncu panellerinden çıkıldığında
                  const relatedTarget = e.relatedTarget;
                  const currentTarget = e.currentTarget;
                  if (relatedTarget && !currentTarget.contains(relatedTarget)) {
                    // Oyuncu 1 panelinden çıkıldı ve oyuncu seçilmişse
                    if ((localFocusIndex >= 0 && localFocusIndex <= 2) && (player1 || manualPlayer1Name)) {
                      setTimeout(() => setLocalFocusIndex(3), 50);
                    }
                    // Oyuncu 2 panelinden çıkıldı ve oyuncu seçilmişse
                    else if ((localFocusIndex >= 3 && localFocusIndex <= 5) && (player2 || manualPlayer2Name)) {
                      setTimeout(() => setLocalFocusIndex(6), 50);
                    }
                  }
                }}
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
                      onFocus={() => setLocalFocusIndex(0)}
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
                      onFocus={() => setLocalFocusIndex(1)}
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
                      <div className="input-header">3CSCORE OYUNCUSU</div>
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
                          onFocus={() => setLocalFocusIndex(2)}
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
                    </>
                  ) : (
                    <>
                      <div className="input-header">DİĞER OYUNCU</div>
                      <input
                        id="p1-input"
                        type="text"
                        autoComplete="off"
                        readOnly={activeEditableField !== 'p1-manual'}
                        value={manualPlayer1Name}
                        onChange={e => {
                          setManualPlayer1Name(e.target.value);
                          setPlayer1Warning("");
                        }}
                        placeholder={activeEditableField === 'p1-manual' ? "İsim yazın..." : "Giriş için OK basın"}
                        className="player-input modern"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'box-shadow 0.2s ease, border 0.2s ease',
                          ...getFocusGlowStyle(2),
                          cursor: activeEditableField === 'p1-manual' ? 'text' : 'default'
                        }}
                        onFocus={() => setLocalFocusIndex(2)}
                        onClick={() => {
                            setLocalFocusIndex(2);
                          setActiveEditableField('p1-manual');
                          setTimeout(() => p1InputRef.current?.blur(), 0);
                        }}
                        ref={p1InputRef}
                      />
                      {renderInlineKeyboard('p1-manual')}
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
                      className={`mode-toggle-btn mode-3c ${!isManualPlayer2 ? 'active' : ''}`}
                      onClick={() => {
                        setIsManualPlayer2(false);
                        setManualPlayer2Name("");
                        setPlayer2Warning("");
                        setActiveEditableField(null);
                      }}
                      onFocus={() => setLocalFocusIndex(3)}
                      style={{
                        transition: 'box-shadow 0.2s ease, border 0.2s ease',
                        ...getFocusGlowStyle(3)
                      }}
                    >
                      3CSCORE
                    </button>
                    <button 
                      id="p2-mode-other"
                      className={`mode-toggle-btn mode-other ${isManualPlayer2 ? 'active' : ''}`}
                      onClick={() => {
                        setIsManualPlayer2(true);
                        setPlayer2("");
                        setPlayer2Warning("");
                        setActiveEditableField(null);
                      }}
                      onFocus={() => setLocalFocusIndex(4)}
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
                      <div className="input-header">3CSCORE OYUNCUSU</div>
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
                              setTimeout(() => setLocalFocusIndex(6), 100);
                            }
                          }}
                          onFocus={() => setLocalFocusIndex(5)}
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
                    </>
                  ) : (
                    <>
                      <div className="input-header">DİĞER OYUNCU</div>
                      <input
                        id="p2-input"
                        type="text"
                        autoComplete="off"
                        readOnly={activeEditableField !== 'p2-manual'}
                        value={manualPlayer2Name}
                        onChange={e => {
                          setManualPlayer2Name(e.target.value);
                          setPlayer2Warning("");
                        }}
                        placeholder={activeEditableField === 'p2-manual' ? "İsim yazın..." : "Giriş için OK basın"}
                        className="player-input modern"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'box-shadow 0.2s ease, border 0.2s ease',
                          ...getFocusGlowStyle(5),
                          cursor: activeEditableField === 'p2-manual' ? 'text' : 'default'
                        }}
                        onFocus={() => setLocalFocusIndex(5)}
                        onClick={() => {
                            setLocalFocusIndex(5);
                          setActiveEditableField('p2-manual');
                          setTimeout(() => p2InputRef.current?.blur(), 0);
                        }}
                        ref={p2InputRef}
                      />
                      {renderInlineKeyboard('p2-manual')}
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
                      onFocus={() => setLocalFocusIndex(6)}
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
                      onFocus={() => setLocalFocusIndex(6)}
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
                      onFocus={() => setLocalFocusIndex(7)}
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
                      onFocus={() => setLocalFocusIndex(7)}
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
                    onFocus={() => setLocalFocusIndex(8)}
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
                    onFocus={() => setLocalFocusIndex(9)}
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
                    onFocus={() => setLocalFocusIndex(10)}
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
                  const canStartMatch = isPlayer1Ready && isPlayer2Ready && !isTableBusy;
                  
                  return (
                  <button 
                    className={`start-button ${canStartMatch ? "active" : "disabled"}`}
                    onClick={canStartMatch ? handleRemoteSend : undefined}
                    disabled={!canStartMatch}
                    style={{ 
                      background: canStartMatch ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#64748b',
                      cursor: canStartMatch ? 'pointer' : 'not-allowed',
                      opacity: canStartMatch ? 1 : 0.7,
                      fontWeight: '700'
                    }}
                  >
                    {isTableBusy ? '⛔ MASA DOLU' : (!isPlayer1Ready || !isPlayer2Ready) ? '⚠️ OYUNCU SEÇİN' : '▶ MAÇI BAŞLAT'}
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
                    <div className="survival-player-box">
                      <label className="survival-player-label">1. Oyuncu</label>
                      <select 
                        value={survivalPlayer1} 
                        onChange={e => setSurvivalPlayer1(e.target.value)}
                        className="survival-player-select"
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
                    <div className="survival-player-box">
                      <label className="survival-player-label">2. Oyuncu</label>
                      <select 
                        value={survivalPlayer2} 
                        onChange={e => setSurvivalPlayer2(e.target.value)}
                        className="survival-player-select"
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
                    <div className="survival-player-box">
                      <label className="survival-player-label">3. Oyuncu</label>
                      <select 
                        value={survivalPlayer3} 
                        onChange={e => setSurvivalPlayer3(e.target.value)}
                        className="survival-player-select"
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
                    <div className="survival-player-box">
                      <label className="survival-player-label">4. Oyuncu</label>
                      <select 
                        value={survivalPlayer4} 
                        onChange={e => setSurvivalPlayer4(e.target.value)}
                        className="survival-player-select"
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
                        className={`start-button ${
                          [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                            .filter(p => p !== "").length >= 3 
                            ? "active" 
                            : "disabled"
                        }`}
                        onClick={handleSurvivalStart}
                        disabled={
                          [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                            .filter(p => p !== "").length < 3
                        }
                      >
                        Survival Maçını Başlat
                      </button>
                    )}
                    {showRemoteButton && (
                      <button 
                        className={`start-button ${
                          !isTableBusy && [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                            .filter(p => p !== "").length >= 3 
                            ? "active" 
                            : "disabled"
                        }`}
                        onClick={handleRemoteSend}
                        disabled={
                          isTableBusy || [survivalPlayer1, survivalPlayer2, survivalPlayer3, survivalPlayer4]
                            .filter(p => p !== "").length < 3
                        }
                        style={{ 
                          background: isTableBusy ? '#334155' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          cursor: isTableBusy ? 'not-allowed' : 'pointer',
                          opacity: isTableBusy ? 0.8 : 1
                        }}
                      >
                        {isTableBusy ? '⛔ DOLU MASA' : '📡 Uzaktan Başlat'}
                      </button>
                    )}
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
