import React, { useState, useEffect, useMemo } from 'react';
import PlayerPanel from '../../components/PlayerPanel';
import ScorePanel from '../../components/ScorePanel';
import GameController from './GameController';
import TimerProgressBar from '../../components/TimerProgressBar';
import PenaltyScreen from '../../screens/PenaltyScreen';
import { saveMatchToTestRecords, updateTableStatus } from '../../services/firebase';

function StandardGame({
  player1Name,
  player2Name,
  targetScore,
  targetRack,
  hasPenalty,
  hasAso,
  onExit
}) {
  // Oyun state'leri
  const [currentTurn, setCurrentTurn] = useState(0); // 0: player1, 1: player2
  const [inning, setInning] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [player1Runs, setPlayer1Runs] = useState([]); // Tüm run'ları tut
  const [player2Runs, setPlayer2Runs] = useState([]); // Tüm run'ları tut
  const [isControllerVisible, setIsControllerVisible] = useState(true); // Kumanda görünürlüğü
  const [player1TimeoutLeft, setPlayer1TimeoutLeft] = useState(2); // Oyuncu 1'in timeout hakkı
  const [player2TimeoutLeft, setPlayer2TimeoutLeft] = useState(2); // Oyuncu 2'nin timeout hakkı
  const [timerPhase, setTimerPhase] = useState('idle'); // idle: başlatılmamış, running: çalışıyor, finished: bitti
  const [timerResetTrigger, setTimerResetTrigger] = useState(0); // Timer'ı reset etmek için
  const [isTimerPaused, setIsTimerPaused] = useState(false); // Timer pause durumu
  const [gameEnded, setGameEnded] = useState(false); // Oyun bitişi
  const [winner, setWinner] = useState(null); // Kazanan (null: devam, 'player1', 'player2', 'draw', 'penalty')
  const [lastTurnBeforeEnd, setLastTurnBeforeEnd] = useState(false); // Son tur flag (ASO için)
  const [asoReason, setAsoReason] = useState(null); // ASO sebebi: 'score' (skor) veya 'rack' (istaka) veya null
  const [showPenalty, setShowPenalty] = useState(false); // Penaltı ekranı göster
  const [notification, setNotification] = useState(null); // { message, type: 'info'|'warning'|'success' }
  const [warningMessage, setWarningMessage] = useState(null); // Son X Sayı/İstaka uyarısı
  
  // UNDO için history stack
  const [history, setHistory] = useState([]);
  const MAX_HISTORY_SIZE = 20; // History stack limiti
  
  // Notification cleanup için timeout referansı
  const [notificationTimeout, setNotificationTimeout] = useState(null);

  // Masa durumunu canlı olarak güncelle (Live Sync)
  useEffect(() => {
    const liveStats = {
      mode: '2vs2',
      players: [player1Name, player2Name],
      settings: { targetScore, targetRack, hasPenalty, hasAso },
      stats: {
        score1: player1Score,
        score2: player2Score,
        inning: inning,
        run: runCount,
        currentTurn: currentTurn,
        hr1: player1Stats.hr1,
        hr2: player2Stats.hr1 // Player 2 HR1
      }
    };

    // Sadece oyun devam ederken güncelle
    if (!gameEnded) {
      updateTableStatus('table_1', 'BUSY', liveStats);
    }
  }, [player1Score, player2Score, inning, runCount, currentTurn, gameEnded]);

  // Sıra değiştiğinde timer'ı reset et
  useEffect(() => {
    setTimerResetTrigger(prev => prev + 1);
    setIsTimerRunning(false);
    setTimerPhase('idle');
    setIsTimerPaused(false); // Pause durumunu sıfırla
    // NOT: İstaka uyarısını burada temizleme, OK'da kontrol ediliyor
  }, [currentTurn]);

  // HR1, HR2 ve AVG hesaplama fonksiyonu
  const calculateHRStats = (runs) => {
    if (runs.length === 0) {
      return { hr1: 0, hr2: 0, avg: 0 };
    }
    const sorted = [...runs].sort((a, b) => b - a);
    const hr1 = sorted[0] || 0;
    const hr2 = sorted[1] || 0;
    return { hr1, hr2 };
  };

  const calculateAVG = (score, currentInning) => {
    if (currentInning === 0) return 0;
    return (score / currentInning).toFixed(3);
  };

  // Memoized hesaplamalar - Gereksiz re-calculation'ları önler
  const player1Stats = useMemo(() => calculateHRStats(player1Runs), [player1Runs]);
  const player2Stats = useMemo(() => calculateHRStats(player2Runs), [player2Runs]);
  const player1AVG = useMemo(() => calculateAVG(player1Score, inning), [player1Score, inning]);
  const player2AVG = useMemo(() => calculateAVG(player2Score, inning), [player2Score, inning]);

  // Birleşik uyarı mesajı oluştur (istaka + skor)
  const checkWarnings = (currentInning, currentScore) => {
    const remainingInning = targetRack - currentInning;
    const remainingScore = targetScore - currentScore;
    
    let istakaWarning = null;
    let skorWarning = null;
    
    // İstaka kontrolü
    if (remainingInning === 1) {
      istakaWarning = '⚠️ SON İSTAKA';
    } else if (remainingInning === 2) {
      istakaWarning = '⚠️ SON 2 İSTAKA';
    } else if (remainingInning === 3) {
      istakaWarning = '⚠️ SON 3 İSTAKA';
    }
    
    // Skor kontrolü
    if (remainingScore <= 0) {
      skorWarning = '🎯 HEDEF SKORA ULAŞILDI';
    } else if (remainingScore === 1) {
      skorWarning = '⚠️ SON SAYI';
    } else if (remainingScore === 2) {
      skorWarning = '⚠️ SON 2 SAYI';
    } else if (remainingScore === 3) {
      skorWarning = '⚠️ SON 3 SAYI';
    }
    
    // Mesajları birleştir
    if (istakaWarning && skorWarning) {
      return `${istakaWarning} ve ${skorWarning}!`;
    } else if (istakaWarning) {
      return `${istakaWarning}!`;
    } else if (skorWarning) {
      return `${skorWarning}!`;
    }
    
    return null;
  };

  // Maç sonucunu Firebase'e kaydetme fonksiyonu
  const saveMatchResult = async (matchWinner, penaltyWinner) => {
    // matchWinner: player1Name, player2Name, veya 'draw'
    // penaltyWinner: sadece berabere maçlarda - 'player1' veya 'player2'
    
    const totalShots = player1Runs.length + player2Runs.length;
    
    const matchData = {
      player1: player1Name,
      player2: player2Name,
      score1: player1Score,
      score2: player2Score,
      shots: totalShots,
      eys1: player1Stats.hr1,
      eys2: player2Stats.hr1
    };
    
    // Berabere ve penaltı varsa, penaltyWinner ekle
    if (matchWinner === 'draw' && penaltyWinner) {
      matchData.penaltyWinner = penaltyWinner;
    }
    
    console.log("📤 Maç sonucu kaydediliyor:", matchData);
    
    const result = await saveMatchToTestRecords(matchData);
    
    if (result.success) {
      console.log("✅ Maç başarıyla kaydedildi! ID:", result.id);
      showNotification("✅ Maç sonucu kaydedildi!", 'success', 3000);
    } else {
      console.error("❌ Maç kaydedilemedi:", result.error);
      showNotification("❌ Maç kaydedilemedi!", 'warning', 3000);
    }
  };

  const handleRematch = () => {
    // Reset state for rematch
    setCurrentTurn(0);
    setInning(0);
    setRunCount(0);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setPlayer1Runs([]);
    setPlayer2Runs([]);
    setPlayer1TimeoutLeft(2);
    setPlayer2TimeoutLeft(2);
    setGameEnded(false);
    setWinner(null);
    setLastTurnBeforeEnd(false);
    setAsoReason(null);
    setWarningMessage(null);
    setNotification(null);
    setHistory([]);
    setShowPenalty(false);
    setIsTimerRunning(false);
    setTimerPhase('idle');
  };

  const handleNewMatch = () => {
    onExit();
  };

  const handlePlusRun = () => {
    const currentScore = currentTurn === 0 ? player1Score : player2Score;
    const newTotalScore = currentScore + runCount + 1;
    
    // Hedef skordan fazlasına izin verme
    if (newTotalScore > targetScore) {
      return; // Plus butonu zaten pasif olacak, ama yine de kontrol
    }
    
    // History'ye kaydet
    saveToHistory();
    
    setRunCount(runCount + 1);
    
    // Plus'ta istaka ve skor uyarılarını birlikte kontrol et
    const warning = checkWarnings(inning, newTotalScore);
    setWarningMessage(warning);
  };

  const handleMinusRun = () => {
    if (runCount > 0) {
      // History'ye kaydet
      saveToHistory();
      
      setRunCount(runCount - 1);
      
      // Minus yapıldığında uyarıyı güncelle
      const currentScore = currentTurn === 0 ? player1Score : player2Score;
      const newTotalScore = currentScore + runCount - 1;
      
      // Minus'ta istaka ve skor uyarılarını birlikte kontrol et
      const warning = checkWarnings(inning, newTotalScore);
      setWarningMessage(warning);
    }
  };

  const handleToggleTimer = () => {
    // History'ye kaydet
    saveToHistory();
    
    // Timer durdurulduğu zaman (isTimerRunning true ise, başlatılı demek)
    if (isTimerRunning) {
      // Timer durdurma işlemi (PAUSE)
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setIsTimerPaused(true); // Pause durumunu aç
    } else {
      // Timer başlatma işlemi
      setIsTimerRunning(true);
      setTimerPhase('running'); // Timer çalışma durumuna geç
      setIsTimerPaused(false); // Pause durumunu kapat
    }
  };

  const handleTimerFinished = () => {
    // Timer 40 sn bittiğinde çalışacak fonksiyon
    
    // Timeout hakkını kontrol et
    const currentTimeoutLeft = currentTurn === 0 ? player1TimeoutLeft : player2TimeoutLeft;
    
    if (currentTimeoutLeft > 0) {
      // ASO durumu kontrolü: 2. oyuncu ASO vuruşunda timeout kullanırsa maç biter
      if (lastTurnBeforeEnd && currentTurn === 1) {
        // 2. oyuncunun skorunu güncelle (mevcut run count'u ekle)
        const newPlayer2Score = player2Score + runCount;
        if (runCount > 0) {
          setPlayer2Runs([...player2Runs, runCount]);
          setPlayer2Score(newPlayer2Score);
        }
        
        const currentPlayerName = player2Name;
        showNotification(`⏱️ ${currentPlayerName} ASO'da TIMEOUT kullandı!\nMaç skorları ile bitiyor...`, 'warning', 4000);
        
        // Timer'ı durdur
        setIsTimerRunning(false);
        setTimerPhase('idle');
        
        // Oyunu bitir - Kazananı belirle
        setTimeout(() => {
          if (player1Score > newPlayer2Score) {
            endGame(player1Name);
          } else if (newPlayer2Score > player1Score) {
            endGame(player2Name);
          } else {
            // Berabere
            if (hasPenalty) {
              endGame('penalty');
            } else {
              endGame('draw');
            }
          }
        }, 1000);
        return;
      }
      
      // Normal timeout kullanımı
      if (currentTurn === 0) {
        setPlayer1TimeoutLeft(currentTimeoutLeft - 1);
      } else {
        setPlayer2TimeoutLeft(currentTimeoutLeft - 1);
      }
      
      const currentPlayerName = currentTurn === 0 ? player1Name : player2Name;
      showNotification(`⏱️ ${currentPlayerName} TIMEOUT kullanıyor! (Kalan: ${currentTimeoutLeft - 1})`, 'info', 2000);
      
      // Timer'ı reset et ve otomatik olarak yeniden başlat
      setTimerResetTrigger(prev => prev + 1);
      setTimeout(() => {
        setIsTimerRunning(true);
        setTimerPhase('running');
      }, 100);
    } else {
      // Timeout hakkı yoksa, FAUL ve sırayı değiştir
      const currentPlayerName = currentTurn === 0 ? player1Name : player2Name;
      showNotification(`⚠️ ${currentPlayerName} FAUL! Timeout hakkı yok, sıra değişiyor...`, 'warning', 3000);
      
      if (currentTurn === 0) {
        setCurrentTurn(1);
      } else {
        setCurrentTurn(0);
        setInning(inning + 1);
      }
      setIsTimerRunning(false);
      setTimerPhase('idle');
    }
  };

  const showNotification = (message, type = 'info', duration = 3000) => {
    // Önceki timeout varsa temizle (memory leak önleme)
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    setNotification({ message, type });
    if (duration > 0) {
      const timeout = setTimeout(() => {
        setNotification(null);
      }, duration);
      setNotificationTimeout(timeout);
    }
  };

  // Notification cleanup - Component unmount olduğunda timeout'ları temizle
  useEffect(() => {
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  }, [notificationTimeout]);

  // History'ye mevcut durumu kaydet (Max 20 item - Bellek optimizasyonu)
  const saveToHistory = () => {
    const snapshot = {
      currentTurn,
      inning,
      runCount,
      player1Score,
      player2Score,
      player1Runs: [...player1Runs],
      player2Runs: [...player2Runs],
      player1TimeoutLeft,
      player2TimeoutLeft,
      isTimerRunning,
      timerPhase,
      lastTurnBeforeEnd,
      asoReason,
      warningMessage
    };
    setHistory(prev => {
      const newHistory = [...prev, snapshot];
      // History boyutu limitini aşarsa, en eski kayıtları sil
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });
  };

  // UNDO fonksiyonu
  const handleUndo = () => {
    if (history.length === 0) {
      showNotification('⚠️ Geri alınacak işlem yok!', 'warning', 2000);
      return;
    }

    // Son state'i al ve history'den çıkar
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    // State'i geri yükle
    setCurrentTurn(previousState.currentTurn);
    setInning(previousState.inning);
    setRunCount(previousState.runCount);
    setPlayer1Score(previousState.player1Score);
    setPlayer2Score(previousState.player2Score);
    setPlayer1Runs(previousState.player1Runs);
    setPlayer2Runs(previousState.player2Runs);
    setPlayer1TimeoutLeft(previousState.player1TimeoutLeft);
    setPlayer2TimeoutLeft(previousState.player2TimeoutLeft);
    setIsTimerRunning(previousState.isTimerRunning);
    setTimerPhase(previousState.timerPhase);
    setLastTurnBeforeEnd(previousState.lastTurnBeforeEnd);
    setAsoReason(previousState.asoReason);
    setWarningMessage(previousState.warningMessage);

    // Timer'ı reset et
    setTimerResetTrigger(prev => prev + 1);

    showNotification('↩️ İşlem geri alındı!', 'success', 2000);
  };

  // Keyboard shortcut için (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && !gameEnded) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, gameEnded]);

  const endGame = (winnerName) => {
    // Eğer berabere ve penaltı varsa, penaltı ekranına git
    if (winnerName === 'penalty' && hasPenalty) {
      setShowPenalty(true);
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setWarningMessage(null); // Uyarı mesajlarını temizle
      setNotification(null); // Bildirimleri temizle
      return;
    }
    
    setGameEnded(true);
    setWinner(winnerName);
    setIsTimerRunning(false);
    setTimerPhase('idle');
    
    // Maç sonucunu Firebase'e kaydet (penaltı olmadan biten maçlar)
    saveMatchResult(winnerName, null);

    // Masa durumunu FINISHED olarak güncelle (Mobil tarafında kazananı göstermek için)
    const finalStats = {
      mode: '2vs2',
      players: [player1Name, player2Name],
      settings: { targetScore, targetRack, hasPenalty, hasAso },
      stats: {
        score1: player1Score,
        score2: player2Score,
        inning: inning,
        run: runCount,
        currentTurn: currentTurn,
        hr1: player1Stats.hr1,
        hr2: player2Stats.hr1
      },
      winner: winnerName,
      gameEnded: true
    };
    updateTableStatus('table_1', 'FINISHED', finalStats);
  };

  const handlePenaltyEnd = (penaltyWinner) => {
    // Penaltı kazananı belirle ve oyunu bitir
    setShowPenalty(false);
    setGameEnded(true);
    setWinner(penaltyWinner);
    
    // Maç sonucunu Firebase'e kaydet (penaltı ile biten maçlar)
    saveMatchResult('draw', penaltyWinner);

    // Masa durumunu FINISHED olarak güncelle
    const finalStats = {
      mode: '2vs2',
      players: [player1Name, player2Name],
      settings: { targetScore, targetRack, hasPenalty, hasAso },
      stats: {
        score1: player1Score,
        score2: player2Score,
        inning: inning,
        run: runCount,
        currentTurn: currentTurn,
        hr1: player1Stats.hr1,
        hr2: player2Stats.hr1
      },
      winner: penaltyWinner, // Penaltı kazananı
      isPenalty: true,
      gameEnded: true
    };
    updateTableStatus('table_1', 'FINISHED', finalStats);
  };

  const handleExit = () => {
    // Çıkış onayı
    const confirmExit = window.confirm(
      `Maçı sonlandırmak istediğinize emin misiniz?\n\nMevcut Durum:\n${player1Name}: ${player1Score} sayı\n${player2Name}: ${player2Score} sayı\nİstaka: ${inning}\n\nÇıkarsanız maç sonuçları kaydedilmeyecek.`
    );
    
    if (confirmExit) {
      onExit();
    }
  };

  const handleOk = () => {
    // History'ye kaydet
    saveToHistory();
    
    // Skorları güncelle
    let newPlayer1Score = player1Score;
    let newPlayer2Score = player2Score;
    
    if (runCount > 0) {
      if (currentTurn === 0) {
        setPlayer1Runs([...player1Runs, runCount]);
        newPlayer1Score = player1Score + runCount;
        setPlayer1Score(newPlayer1Score);
      } else {
        setPlayer2Runs([...player2Runs, runCount]);
        newPlayer2Score = player2Score + runCount;
        setPlayer2Score(newPlayer2Score);
      }
    }

    // Timer'ı durdur
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setTimerResetTrigger(prev => prev + 1);
      setIsTimerPaused(false);
    }

    // KURAL 1: 2. oyuncu son serisini girdi, oyunu bitir (ASO nedeniyle)
    if (lastTurnBeforeEnd && currentTurn === 1) {
      // Oyun bitti, kazananı belirle
      if (newPlayer1Score > newPlayer2Score) {
        endGame(player1Name);
      } else if (newPlayer2Score > newPlayer1Score) {
        endGame(player2Name);
      } else {
        // Berabere
        if (hasPenalty) {
          endGame('penalty');
        } else {
          endGame('draw');
        }
      }
      return;
    }

    // KURAL 2a: 1. oyuncu hedef skora ulaştıysa ve ASO varsa
    if (currentTurn === 0 && newPlayer1Score >= targetScore && hasAso) {
      // 2. oyuncuya son seri hakkı ver
      const nextInning = inning + 1;
      setInning(nextInning);
      setCurrentTurn(1);
      setLastTurnBeforeEnd(true);
      setAsoReason('score'); // Skor nedeniyle ASO
      setRunCount(0);
      showNotification(`🎯 ${player1Name} hedef skora ulaştı!\n${player2Name} ASO vuruşu yapıyor...`, 'warning', 4000);
      return;
    }

    // KURAL 2a devamı: 1. oyuncu hedef skora ulaştı, ASO yok
    if (currentTurn === 0 && newPlayer1Score >= targetScore && !hasAso) {
      // Oyun biter, 1. oyuncu kazandı
      endGame(player1Name);
      return;
    }

    // KURAL 2b: 2. oyuncu hedef skora ulaştıysa
    if (currentTurn === 1 && newPlayer2Score >= targetScore) {
      // Oyun biter, 2. oyuncu kazandı
      endGame(player2Name);
      return;
    }

    // Normal sıra değişimi
    if (currentTurn === 0) {
      // 1. oyuncudan 2. oyuncuya geçiş - İstaka artır
      const nextInning = inning + 1;
      
      // Hedef istaka kontrolü: 1. oyuncu hedef istakaya ulaştı mı?
      // NOT: İstaka kontrolünde ASO olsun ya da olmasın, 2. oyuncuya son seri hakkı verilir
      if (nextInning >= targetRack) {
        setInning(nextInning);
        setCurrentTurn(1);
        setLastTurnBeforeEnd(true);
        
        if (hasAso) {
          // ASO varsa ASO vuruşu olarak göster
          setAsoReason('rack'); // İstaka nedeniyle ASO
          showNotification(`🎯 ${player1Name} hedef istakaya ulaştı!\n${player2Name} ASO vuruşu yapıyor...`, 'warning', 4000);
        } else {
          // ASO yoksa normal son seri
          setAsoReason(null);
          showNotification(`🎯 ${player1Name} hedef istakaya ulaştı!\n${player2Name} son serisini oynuyor...`, 'warning', 4000);
        }
        setRunCount(0);
        return;
      }
      
      setInning(nextInning);
      setCurrentTurn(1);
      
      // Eğer mevcut uyarı mesajı varsa, 2. oyuncu için de devam ettir
      // (2. oyuncu aynı istakayı oynayacak)
    } else {
      // 2. oyuncudan 1. oyuncuya geçiş
      setCurrentTurn(0);
      
      // 2. oyuncu OK'ladıktan sonra, 1. oyuncu için istaka ve skor kontrolü yap
      // (1. oyuncu yeni istakaya giriyor)
      const warning = checkWarnings(inning, newPlayer1Score);
      setWarningMessage(warning);
    }

    setRunCount(0);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#212529',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Overlay Messages Container */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {/* Notification Overlay */}
        {notification && (
          <div style={{
            pointerEvents: 'auto',
            background: notification.type === 'warning' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' :
                        notification.type === 'success' ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)' :
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '30px 50px',
            borderRadius: '15px',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            whiteSpace: 'pre-line',
            minWidth: '300px',
            maxWidth: '90%',
            wordWrap: 'break-word',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {notification.message}
          </div>
        )}
      </div>

      {/* Penaltı Ekranı */}
      {showPenalty && (
        <PenaltyScreen
          player1Name={player1Name}
          player2Name={player2Name}
          mainGamePlayer1Score={player1Score}
          mainGamePlayer2Score={player2Score}
          mainGamePlayer1HR1={player1Stats.hr1}
          mainGamePlayer1HR2={player1Stats.hr2}
          mainGamePlayer2HR1={player2Stats.hr1}
          mainGamePlayer2HR2={player2Stats.hr2}
          mainGamePlayer1AVG={player1AVG}
          mainGamePlayer2AVG={player2AVG}
          mainGameInning={inning}
          onPenaltyEnd={handlePenaltyEnd}
        />
      )}

      {/* Oyun Sonu Overlay */}
      {gameEnded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1d2e 0%, #2a2d3a 100%)',
            padding: '50px',
            borderRadius: '25px',
            textAlign: 'center',
            border: '3px solid rgba(255, 215, 0, 0.6)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.3)',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }}>
            {/* Kazanan Duyurusu */}
            {winner !== 'draw' && (
              <div style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                padding: '20px 40px',
                borderRadius: '15px',
                marginBottom: '30px',
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1a1d2e',
                boxShadow: '0 10px 30px rgba(255, 215, 0, 0.5)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                🏆 KAZANAN 🏆
                <div style={{ 
                  fontSize: '42px', 
                  marginTop: '10px',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  {winner}
                </div>
              </div>
            )}

            {/* Berabere Duyurusu */}
            {winner === 'draw' && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px 40px',
                borderRadius: '15px',
                marginBottom: '30px',
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.5)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                🤝 BERABERE 🤝
              </div>
            )}

            {/* MAÇ İSTATİSTİKLERİ */}
            <div style={{
              marginTop: '30px',
              marginBottom: '30px'
            }}>
              <h2 style={{
                color: '#FFD700',
                fontSize: '24px',
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                MAÇ İSTATİSTİKLERİ
              </h2>

              {/* İstatistik Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '20px',
                alignItems: 'start',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                {/* Player 1 Stats */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: winner === player1Name ? '2px solid rgba(255, 215, 0, 0.6)' : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: winner === player1Name ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none'
                }}>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    {winner === player1Name && <span>🏆</span>}
                    {player1Name}
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', marginBottom: '10px' }}>
                    <span style={{ color: '#888' }}>Skor:</span> <span style={{ fontWeight: 'bold', fontSize: '28px', color: '#FFD700' }}>{player1Score}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>HR1:</span> <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>{player1Stats.hr1}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>HR2:</span> <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>{player1Stats.hr2}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px' }}>
                    <span style={{ color: '#888' }}>AVG:</span> <span style={{ fontWeight: 'bold', color: '#F39C12' }}>{player1AVG}</span>
                  </div>
                </div>

                {/* İnning (Ortada) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.5)',
                    border: '3px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>İSTAKA</div>
                    <div style={{ color: '#FFD700', fontSize: '32px', fontWeight: 'bold' }}>{inning}</div>
                  </div>
                </div>

                {/* Player 2 Stats */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.05)',
                  border: winner === player2Name ? '2px solid rgba(255, 215, 0, 0.6)' : '2px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: winner === player2Name ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none'
                }}>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    {winner === player2Name && <span>🏆</span>}
                    {player2Name}
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', marginBottom: '10px' }}>
                    <span style={{ color: '#888' }}>Skor:</span> <span style={{ fontWeight: 'bold', fontSize: '28px', color: '#FFD700' }}>{player2Score}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>HR1:</span> <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>{player2Stats.hr1}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>HR2:</span> <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>{player2Stats.hr2}</span>
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px' }}>
                    <span style={{ color: '#888' }}>AVG:</span> <span style={{ fontWeight: 'bold', color: '#F39C12' }}>{player2AVG}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Butonlar */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginTop: '40px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {/* Aynı Maçı Tekrar Ayarla Butonu */}
              <button 
                onClick={handleRematch}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)';
                  e.target.style.transform = 'scale(1)';
                }}
                style={{
                  background: 'linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '18px 40px',
                  fontSize: '18px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(86, 204, 242, 0.4)',
                  minWidth: '220px'
                }}
              >
                🔄 Aynı Maçı Tekrar Oyna
              </button>

              {/* Yeni Maç Butonu */}
              <button 
                onClick={handleNewMatch}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.target.style.transform = 'scale(1)';
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '18px 40px',
                  fontSize: '18px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
                  minWidth: '220px'
                }}
              >
                🆕 Yeni Maç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Son Tur / ASO Uyarısı */}
      {lastTurnBeforeEnd && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '60%',
          transform: 'translateX(-50%)',
          background: asoReason ? 'rgba(255, 140, 0, 0.9)' : 'rgba(255, 69, 0, 0.9)',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '10px',
          fontSize: '20px',
          fontWeight: '700',
          zIndex: 100,
          border: '3px solid #FFD700',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.7)',
          animation: 'pulse 1.5s ease-in-out infinite',
          maxWidth: '90%',
          textAlign: 'center',
          wordWrap: 'break-word'
        }}>
          {asoReason ? '⚠️ ASO VURUŞU! ⚠️' : '⚠️ SON SERİ! ⚠️'}
        </div>
      )}

      {/* Sol alt köşede hedef bilgisi */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 10,
        border: '2px solid #667eea'
      }}>
        <div style={{ marginBottom: '5px' }}>Hedef Sayı: <span style={{ color: '#FFD700', fontSize: '14px' }}>{targetScore}</span></div>
        <div style={{ marginBottom: '5px' }}>Hedef İstaka: <span style={{ color: '#FFD700', fontSize: '14px' }}>{targetRack}</span></div>
        <div style={{ marginTop: '8px', borderTop: '1px solid #667eea', paddingTop: '5px' }}>
          <div style={{ marginBottom: '3px', fontSize: '11px' }}>Penaltı: <span style={{ color: hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>{hasPenalty ? '✓' : '✗'}</span></div>
          <div style={{ fontSize: '11px' }}>ASO: <span style={{ color: hasAso ? '#00FF00' : '#FF6B6B' }}>{hasAso ? '✓' : '✗'}</span></div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        gap: '32px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <PlayerPanel
          name={player1Name}
          score={player1Score}
          hr1={player1Stats.hr1}
          hr2={player1Stats.hr2}
          avg={player1AVG}
          bg="#3b3b3b"
          playerIndex={0}
          isActive={currentTurn === 0}
          borderColor={currentTurn === 0 ? '#FFFFFF' : 'transparent'}
          timeoutLeft={player1TimeoutLeft}
        />
        
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          {/* Son X Sayı/İstaka Uyarısı (her zaman göster) */}
          {warningMessage && (
            <div style={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold',
              textAlign: 'center',
              boxShadow: '0 8px 25px rgba(255, 107, 107, 0.5)',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              animation: 'pulse 1.5s ease-in-out infinite',
              minWidth: '250px'
            }}>
              {warningMessage}
            </div>
          )}
          
          <ScorePanel 
            inning={inning} 
            run={runCount} 
            runColor={currentTurn === 0 ? '#FFFFFF' : '#FFD700'} 
            onShowController={() => setIsControllerVisible(true)}
            isControllerHidden={!isControllerVisible}
          />
        </div>
        <PlayerPanel
          name={player2Name}
          score={player2Score}
          hr1={player2Stats.hr1}
          hr2={player2Stats.hr2}
          avg={player2AVG}
          bg="#22283e"
          playerIndex={1}
          isActive={currentTurn === 1}
          borderColor={currentTurn === 1 ? '#FFD700' : 'transparent'}
          timeoutLeft={player2TimeoutLeft}
        />
      </div>
      <TimerProgressBar 
        isTimerRunning={isTimerRunning}
        currentTurn={currentTurn}
        timerPhase={timerPhase}
        onTimerFinished={handleTimerFinished}
        resetTrigger={timerResetTrigger}
        isTimerPaused={isTimerPaused}
        activeColor={currentTurn === 0 ? '#FFFFFF' : '#FFD700'}
        duration={40}
      />
      <GameController 
        onPlusRun={handlePlusRun}
        onMinusRun={handleMinusRun}
        onToggleTimer={handleToggleTimer}
        onOk={handleOk}
        onExit={handleExit}
        onUndo={handleUndo}
        isTimerRunning={isTimerRunning}
        currentPlayerName={currentTurn === 0 ? player1Name : player2Name}
        currentTurn={currentTurn}
        isVisible={isControllerVisible}
        onToggleVisibility={() => setIsControllerVisible(!isControllerVisible)}
        gameEnded={gameEnded}
        currentScore={currentTurn === 0 ? player1Score : player2Score}
        runCount={runCount}
        targetScore={targetScore}
        canUndo={history.length > 0}
      />
    </div>
  );
}

export default StandardGame;
