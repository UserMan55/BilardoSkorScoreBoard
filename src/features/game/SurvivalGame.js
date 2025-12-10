import React, { useState, useEffect } from 'react';
import TimerProgressBar from '../../components/TimerProgressBar';
import { getUserProfiles, updateTableStatus, listenForMatchCommands } from '../../services/firebase';

function SurvivalGame({
  players: initialPlayers, // Array of player names
  onExit,
  tableName = 'Masa 1',
  salonName = 'SALON 3CSCORE'
}) {
  // Game Constants
  const STARTING_SCORE = 10;
  const HALF_DURATION = 25; // TEST: 25 seconds (Original: 45 * 60)
  
  // State
  const [players, setPlayers] = useState(
    initialPlayers.map(name => ({
      name,
      score: STARTING_SCORE,
      runs: [], // Array of run counts per inning
      currentRun: 0,
      timeoutLeft: 2, // Default 2 timeouts
      isDisqualified: false
    }))
  );
  
  const [currentTurn, setCurrentTurn] = useState(0); // Index of current player
  const [inning, setInning] = useState(0);
  
  // Shot Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState('idle');
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  
  // Game Clock State
  const [gameTimeLeft, setGameTimeLeft] = useState(HALF_DURATION);
  const [gameHalf, setGameHalf] = useState(1); // 1 or 2
  const [isGameClockRunning, setIsGameClockRunning] = useState(false); // Starts false, user must start? Or auto start? Let's auto start on first action or have a start button.
  // Let's make it run if the match is active and not paused.
  
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [notification, setNotification] = useState(null); // { message, type: 'info'|'warning'|'success' }
  const [showHalfTimeModal, setShowHalfTimeModal] = useState(false);

  // History for Undo
  const [history, setHistory] = useState([]);
  
  // Score Feedback State
  const [scoreFeedback, setScoreFeedback] = useState({});
  
  // Turn Color State (Strict Alternation)
  const [currentColor, setCurrentColor] = useState('#FFFFFF');

  // Negative Score Modal State
  const [showNegativeScoreModal, setShowNegativeScoreModal] = useState(false);
  const [negativeScorePlayerIndex, setNegativeScorePlayerIndex] = useState(null);
  const [negativeModalSelectedBtn, setNegativeModalSelectedBtn] = useState(0); // 0: Devam Etsin, 1: Diskalifiye

  // Exit Modal State (ESC tuşu ile çıkış)
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitModalSelectedBtn, setExitModalSelectedBtn] = useState(0); // 0: Vazgeç, 1: Maçtan Çık

  // HalfTime Modal State
  const [halfTimeModalSelectedBtn, setHalfTimeModalSelectedBtn] = useState(0); // 0: 2. Seti Başlat, 1: Maçı Bitir

  // Player Photos State
  const [playerPhotos, setPlayerPhotos] = useState({});

  // Derived state
  const currentPlayer = players[currentTurn];
  const playerCount = players.length;
  const activePlayerCount = players.filter(p => !p.isDisqualified).length;
  const currentPlayerColor = currentColor;

  const handlersRef = React.useRef({});
  const timerFinishRef = React.useRef(() => {});
  const onExitRef = React.useRef(onExit);

  // onExit ref'ini güncel tut
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    handlersRef.current = {
      handlePlusRun,
      handleMinusRun,
      handleOk,
      handleUndo,
      handleContinue,
      handleDisqualify,
      startSecondHalf,
      endMatchEarly
    };
  });

  const callHandler = (name) => {
    const handler = handlersRef.current?.[name];
    if (typeof handler === 'function') {
      handler();
    }
  };

  // Player Photos Yükleme
  useEffect(() => {
    const fetchPlayerPhotos = async () => {
      try {
        const playerNames = initialPlayers || [];
        if (playerNames.length === 0) return;
        
        const profiles = await getUserProfiles();
        const photosMap = {};
        
        playerNames.forEach(name => {
          // fullName ile case-insensitive karşılaştırma
          const profile = profiles.find(p => 
            p.fullName && p.fullName.trim().toLowerCase() === name.trim().toLowerCase()
          );
          if (profile && profile.photoURL) {
            photosMap[name] = profile.photoURL;
          }
        });
        
        setPlayerPhotos(photosMap);
        console.log('[SurvivalGame] Oyuncu fotoğrafları yüklendi:', photosMap);
      } catch (error) {
        console.error('[SurvivalGame] Fotoğraf yükleme hatası:', error);
      }
    };
    
    fetchPlayerPhotos();
  }, [initialPlayers]);

  // Notification helper
  const showNotification = (message, type = 'info', duration = 3000) => {
    setNotification({ message, type });
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  // USB Klavye/Kumanda Dinleyicisi
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // ESC tuşu - çıkış modalı aç/kapat
      if (e.key === 'Escape') {
        if (showExitModal) {
          setShowExitModal(false);
          setExitModalSelectedBtn(0);
        } else if (!gameEnded) {
          setShowExitModal(true);
          setExitModalSelectedBtn(0);
        }
        return;
      }

      // Exit Modal açıkken navigasyon
      if (showExitModal) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setExitModalSelectedBtn(0); // Vazgeç
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setExitModalSelectedBtn(1); // Maçtan Çık
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (exitModalSelectedBtn === 0) {
            // VAZGEÇ
            setShowExitModal(false);
            setExitModalSelectedBtn(0);
          } else {
            // MAÇTAN ÇIK - Event'i durdur ki StartScreen'e geçmesin
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            setShowExitModal(false);
            setExitModalSelectedBtn(0);
            // Kısa gecikme ile çık (event döngüsü tamamlansın)
            setTimeout(() => {
              if (onExitRef.current) onExitRef.current();
            }, 50);
          }
        }
        return;
      }

      // Negative Score Modal açıkken navigasyon
      if (showNegativeScoreModal && negativeScorePlayerIndex !== null) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setNegativeModalSelectedBtn(0); // Devam Etsin
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setNegativeModalSelectedBtn(1); // Diskalifiye Edilsin
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (negativeModalSelectedBtn === 0) {
            // DEVAM ETSİN
            handlersRef.current.handleContinue?.();
          } else {
            // DİSKALİFİYE EDİLSİN
            handlersRef.current.handleDisqualify?.();
          }
        }
        return;
      }

      // HalfTime Modal açıkken klavye navigasyonu
      if (showHalfTimeModal) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setHalfTimeModalSelectedBtn(0);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setHalfTimeModalSelectedBtn(1);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (halfTimeModalSelectedBtn === 0) {
            handlersRef.current.startSecondHalf?.();
          } else {
            handlersRef.current.endMatchEarly?.();
          }
        }
        return;
      }

      // Game Over ekranında Enter/Space ile çıkış
      if (gameEnded) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setTimeout(() => {
            onExitRef.current?.();
          }, 50);
        }
        return;
      }

      // Undo (Ctrl+Z)
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        callHandler('handleUndo');
        return;
      }

      // Plus Run
      if (e.key === 'ArrowUp' || e.key === '+' || e.code === 'NumpadAdd') {
        callHandler('handlePlusRun');
      }
      // Minus Run
      else if (e.key === 'ArrowDown' || e.key === '-' || e.code === 'NumpadSubtract') {
        callHandler('handleMinusRun');
      }
      // OK / Next Turn
      else if (e.key === 'Enter' || e.key === ' ') {
        callHandler('handleOk');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameEnded, showHalfTimeModal, showNegativeScoreModal, showExitModal, exitModalSelectedBtn, negativeModalSelectedBtn, negativeScorePlayerIndex, halfTimeModalSelectedBtn]);

  // Game Clock Logic
  useEffect(() => {
    let interval;
    // Game clock runs if match is not ended, not in half-time, and explicitly not paused (we link it to shot timer pause for simplicity or add a separate toggle)
    // For now: It runs if !gameEnded and !showHalfTimeModal and !isTimerPaused (assuming pause stops everything)
    // But shot timer stops between turns. Game clock should NOT stop between turns.
    // So we only pause Game Clock if isTimerPaused is TRUE (explicit pause).
    
    const shouldRun = !gameEnded && !showHalfTimeModal && !isTimerPaused && isGameClockRunning;

    if (shouldRun && gameTimeLeft > 0) {
      interval = setInterval(() => {
        setGameTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (gameTimeLeft === 0 && !gameEnded && !showHalfTimeModal) {
      timerFinishRef.current();
    }
    return () => clearInterval(interval);
  }, [gameTimeLeft, gameEnded, showHalfTimeModal, isTimerPaused, isGameClockRunning]);

  const handleGameTimerFinished = () => {
    setIsGameClockRunning(false);
    setIsTimerRunning(false); // Stop shot timer too
    
    if (gameHalf === 1) {
      setShowHalfTimeModal(true);
      // Sound effect could go here
    } else {
      endGame();
    }
  };

  useEffect(() => {
    timerFinishRef.current = handleGameTimerFinished;
  });

  const startSecondHalf = () => {
    setGameHalf(2);
    setGameTimeLeft(HALF_DURATION);
    setShowHalfTimeModal(false);
    setHalfTimeModalSelectedBtn(0); // Reset selection
    setIsGameClockRunning(true);
    
    // Add starting score to all players for the new set
    setPlayers(prevPlayers => prevPlayers.map(p => ({
      ...p,
      score: p.score + STARTING_SCORE
    })));

    showNotification("2. Set Başladı!", "success");
  };

  // Maçı erken bitir (1. set sonunda)
  const endMatchEarly = () => {
    setShowHalfTimeModal(false);
    setHalfTimeModalSelectedBtn(0); // Reset selection
    endGame();
    showNotification("Maç Sona Erdi!", "info");
  };

  const endGame = () => {
    setGameEnded(true);
    setIsGameClockRunning(false);
    setIsTimerRunning(false);
    
    // Determine winner (highest score)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winnerPlayer = sortedPlayers[0];
    setWinner(winnerPlayer.name);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Masa durumunu canlı olarak güncelle (Firebase Live Sync)
  useEffect(() => {
    // Aktif oyuncuların en yüksek run değerlerini hesapla
    const calculatePlayerHR = (runs) => {
      if (!runs || runs.length === 0) return 0;
      return Math.max(...runs);
    };

    const liveStats = {
      mode: 'survival',
      players: players.map(p => p.name),
      settings: {
        playerCount: players.length,
        halfDuration: HALF_DURATION,
        startingScore: STARTING_SCORE
      },
      stats: {
        // Tüm oyuncuların verileri
        survivalPlayers: players.map((p, idx) => ({
          name: p.name,
          score: p.score,
          hr: calculatePlayerHR(p.runs),
          currentRun: p.currentRun,
          isDisqualified: p.isDisqualified,
          isActive: idx === currentTurn
        })),
        gameTimeLeft: gameTimeLeft,
        gameTimeFormatted: formatTime(gameTimeLeft),
        gameHalf: gameHalf,
        inning: inning,
        currentTurn: currentTurn,
        currentPlayerName: players[currentTurn]?.name || '',
        run: players[currentTurn]?.currentRun || 0,
        isTimerRunning: isTimerRunning,
        timerPhase: timerPhase,
        timerResetTrigger: timerResetTrigger,
        isTimerPaused: isTimerPaused,
        isGameClockRunning: isGameClockRunning,
        notification: notification,
        gameEnded: gameEnded,
        winner: winner,
        showHalfTimeModal: showHalfTimeModal
      }
    };

    updateTableStatus('table_1', 'BUSY', liveStats);
  }, [
    players,
    currentTurn,
    inning,
    gameTimeLeft,
    gameHalf,
    isTimerRunning,
    timerPhase,
    timerResetTrigger,
    isTimerPaused,
    isGameClockRunning,
    notification,
    gameEnded,
    winner,
    showHalfTimeModal,
    HALF_DURATION,
    STARTING_SCORE
  ]);

  // Timer reset on turn change
  useEffect(() => {
    setTimerResetTrigger(prev => prev + 1);
    setIsTimerRunning(false); // Shot timer resets and waits for start? Or auto start? StandardGame waits.
    setTimerPhase('idle');
    setIsTimerPaused(false);
    
    // Auto-start game clock on first turn change if not started?
    if (!isGameClockRunning && !gameEnded && !showHalfTimeModal) {
       setIsGameClockRunning(true);
    }
  }, [currentTurn, isGameClockRunning, gameEnded, showHalfTimeModal]);

  const saveToHistory = () => {
    const snapshot = {
      players: JSON.parse(JSON.stringify(players)),
      currentTurn,
      inning,
      isTimerRunning,
      timerPhase,
      currentColor
    };
    setHistory(prev => [...prev, snapshot]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setPlayers(previousState.players);
    setCurrentTurn(previousState.currentTurn);
    setInning(previousState.inning);
    setIsTimerRunning(previousState.isTimerRunning);
    setTimerPhase(previousState.timerPhase);
    setCurrentColor(previousState.currentColor);
    setTimerResetTrigger(prev => prev + 1);
  };

  const handlePlusRun = () => {
    saveToHistory();
    
    const pointsGain = activePlayerCount - 1;
    const pointsLoss = 1;

    // Trigger Feedback
    const newFeedback = {};
    newFeedback[currentTurn] = pointsGain;
    players.forEach((p, index) => {
      if (index !== currentTurn && !p.isDisqualified) {
        newFeedback[index] = -pointsLoss;
      }
    });
    setScoreFeedback(newFeedback);
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      setScoreFeedback({});
    }, 3000);
    
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      
      // Update current player
      newPlayers[currentTurn] = {
        ...newPlayers[currentTurn],
        score: newPlayers[currentTurn].score + pointsGain,
        currentRun: newPlayers[currentTurn].currentRun + 1
      };
      
      // Update other players
      newPlayers.forEach((player, index) => {
        if (index !== currentTurn && !player.isDisqualified) {
          const newScore = player.score - pointsLoss;
          
          // Check if player dropped to negative (and wasn't already negative)
          if (newScore < 0 && player.score >= 0) {
            setNegativeScorePlayerIndex(index);
            setShowNegativeScoreModal(true);
            setIsTimerRunning(false); // Pause timer
            setTimerPhase('idle');
          }
          
          newPlayers[index] = {
            ...player,
            score: newScore
          };
        }
      });
      
      return newPlayers;
    });
  };

  const handleDisqualify = () => {
    if (negativeScorePlayerIndex === null) return;
    
    setPlayers(prev => {
      const newPlayers = [...prev];
      newPlayers[negativeScorePlayerIndex].isDisqualified = true;
      return newPlayers;
    });
    
    setShowNegativeScoreModal(false);
    setNegativeScorePlayerIndex(null);
    setNegativeModalSelectedBtn(0);
    
    // If current player was somehow disqualified (unlikely in this flow but possible), pass turn
    if (negativeScorePlayerIndex === currentTurn) {
       handleOk();
    }
  };

  const handleContinue = () => {
    setShowNegativeScoreModal(false);
    setNegativeScorePlayerIndex(null);
    setNegativeModalSelectedBtn(0);
    // Resume timer if needed, or let user resume
  };

  const handleMinusRun = () => {
    if (players[currentTurn].currentRun <= 0) return;
    
    saveToHistory();
    
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      
      const pointsGain = playerCount - 1;
      const pointsLoss = 1;
      
      // Revert current player
      newPlayers[currentTurn] = {
        ...newPlayers[currentTurn],
        score: newPlayers[currentTurn].score - pointsGain,
        currentRun: newPlayers[currentTurn].currentRun - 1
      };
      
      // Revert other players
      newPlayers.forEach((player, index) => {
        if (index !== currentTurn) {
          newPlayers[index] = {
            ...player,
            score: player.score + pointsLoss
          };
        }
      });
      
      return newPlayers;
    });
  };

  const handleOk = () => {
    saveToHistory();
    
    // Commit the run to history for the player
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const player = newPlayers[currentTurn];
      
      if (player.currentRun > 0) {
        player.runs.push(player.currentRun);
      } else {
        player.runs.push(0);
      }
      
      // Reset current run for next turn (though logic might differ if we want to keep it visible)
      player.currentRun = 0;
      
      return newPlayers;
    });

    // Move to next player (skip disqualified)
    let nextTurn = (currentTurn + 1) % playerCount;
    while (players[nextTurn].isDisqualified) {
      nextTurn = (nextTurn + 1) % playerCount;
      // Safety break if all disqualified (shouldn't happen)
      if (nextTurn === currentTurn) break;
    }
    
    setCurrentTurn(nextTurn);
    
    // Toggle Color strictly on turn change
    setCurrentColor(prev => prev === '#FFFFFF' ? '#FFD700' : '#FFFFFF');
    
    // Increment inning if we completed a full round (back to 0 or passed 0)
    // Simplified: if nextTurn < currentTurn, we wrapped around
    if (nextTurn < currentTurn) {
      setInning(prev => prev + 1);
    }
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setIsTimerPaused(true);
    } else {
      setIsTimerRunning(true);
      setTimerPhase('running');
      setIsTimerPaused(false);
    }
  };

  const handleTimerFinished = () => {
    // Handle timeout logic
    const player = players[currentTurn];
    
    if (player.timeoutLeft > 0) {
      // Decrement timeout
      setPlayers(prev => {
        const newPlayers = [...prev];
        newPlayers[currentTurn].timeoutLeft -= 1;
        return newPlayers;
      });
      
      showNotification(`${player.name} Mola Kullandı!`, 'info', 2000);
      
      // Reset and restart timer automatically
      setTimerResetTrigger(prev => prev + 1);
      setIsTimerRunning(true);
      setTimerPhase('running');
    } else {
      setIsTimerRunning(false);
      setTimerPhase('idle');
      showNotification(`⏱️ ${player.name} SÜRE BİTTİ!`, 'warning', 3000);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1d2e',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Notification Overlay */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: notification.type === 'warning' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' :
                      notification.type === 'success' ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)' :
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '15px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {/* Exit Modal Overlay (ESC tuşu ile) */}
      {showExitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1d2e 0%, #22283e 100%)',
            padding: '40px 50px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '3px solid rgba(255, 107, 107, 0.5)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            maxWidth: '450px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '15px', color: '#FF6B6B' }}>
              Maçtan Çıkmak İstiyor musunuz?
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '30px' }}>
              Maç kaydedilmeyecek ve sonuçlar kaybolacaktır.
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setExitModalSelectedBtn(0);
                }}
                style={{
                  padding: '15px 35px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                  color: 'white',
                  border: exitModalSelectedBtn === 0 ? '4px solid #FFD700' : '4px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: exitModalSelectedBtn === 0 ? '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 15px rgba(78, 205, 196, 0.4)' : '0 4px 15px rgba(78, 205, 196, 0.4)',
                  transition: 'all 0.2s',
                  transform: exitModalSelectedBtn === 0 ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setExitModalSelectedBtn(0);
                  onExit && onExit();
                }}
                style={{
                  padding: '15px 35px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                  color: 'white',
                  border: exitModalSelectedBtn === 1 ? '4px solid #FFD700' : '4px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: exitModalSelectedBtn === 1 ? '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 15px rgba(255, 107, 107, 0.4)' : '0 4px 15px rgba(255, 107, 107, 0.4)',
                  transition: 'all 0.2s',
                  transform: exitModalSelectedBtn === 1 ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                Maçtan Çık
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Info Bar */}
      <div style={{
        padding: '15px 30px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#FFD700', letterSpacing: '2px' }}>
            SURVIVAL
          </div>
          {salonName && (
            <div style={{
              background: 'rgba(255, 215, 0, 0.15)',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#FFD700'
            }}>
              🏠 {salonName}
            </div>
          )}
          {tableName && (
            <div style={{
              background: 'rgba(78, 205, 196, 0.2)',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(78, 205, 196, 0.5)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#4ECDC4'
            }}>
              📍 {tableName}
            </div>
          )}
        </div>

        {/* Game Timer Display */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          background: 'rgba(0,0,0,0.5)',
          padding: '5px 20px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {gameHalf}. SET
          </div>
          <div style={{ 
            fontSize: '42px', 
            fontWeight: 'bold', 
            fontFamily: 'monospace',
            color: gameTimeLeft < 60 ? '#FF6B6B' : '#fff'
          }}>
            {formatTime(gameTimeLeft)}
          </div>
        </div>

        {/* Inning Display */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          background: 'rgba(0,0,0,0.5)',
          padding: '5px 20px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ISTAKA
          </div>
          <div style={{ 
            fontSize: '42px', 
            fontWeight: 'bold', 
            fontFamily: 'monospace',
            color: '#FFFFFF'
          }}>
            {inning}
          </div>
        </div>
      </div>

      {/* Half Time Modal */}
      {showHalfTimeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: '20px',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
          }}>
            SET BİTTİ
          </div>
          <div style={{ fontSize: '24px', color: '#fff', marginBottom: '40px' }}>
            Devam etmek veya maçı bitirmek için seçim yapın
          </div>
          <div style={{ display: 'flex', gap: '30px' }}>
            <button
              onClick={startSecondHalf}
              style={{
                padding: '20px 50px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                color: 'white',
                border: halfTimeModalSelectedBtn === 0 ? '4px solid #FFD700' : '4px solid transparent',
                borderRadius: '15px',
                cursor: 'pointer',
                boxShadow: halfTimeModalSelectedBtn === 0 
                  ? '0 0 20px rgba(255, 215, 0, 0.6), 0 10px 30px rgba(78, 205, 196, 0.4)'
                  : '0 10px 30px rgba(78, 205, 196, 0.4)',
                transform: halfTimeModalSelectedBtn === 0 ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              2. SETİ BAŞLAT
            </button>
            <button
              onClick={endMatchEarly}
              style={{
                padding: '20px 50px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                color: 'white',
                border: halfTimeModalSelectedBtn === 1 ? '4px solid #FFD700' : '4px solid transparent',
                borderRadius: '15px',
                cursor: 'pointer',
                boxShadow: halfTimeModalSelectedBtn === 1 
                  ? '0 0 20px rgba(255, 215, 0, 0.6), 0 10px 30px rgba(255, 107, 107, 0.4)'
                  : '0 10px 30px rgba(255, 107, 107, 0.4)',
                transform: halfTimeModalSelectedBtn === 1 ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              MAÇI BİTİR
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameEnded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: '10px',
            textShadow: '0 0 30px rgba(255, 215, 0, 0.6)'
          }}>
            MAÇ SONUCU
          </div>
          
          <div style={{
            fontSize: '32px',
            color: '#fff',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            🏆 Kazanan: <span style={{ color: '#4ECDC4', fontWeight: 'bold' }}>{winner}</span>
          </div>

          {/* Final Scores List */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '30px',
            borderRadius: '20px',
            marginBottom: '40px',
            minWidth: '400px'
          }}>
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '15px 0',
                borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                fontSize: '24px'
              }}>
                <span style={{ color: i === 0 ? '#FFD700' : '#fff' }}>
                  {i + 1}. {p.name}
                </span>
                <span style={{ fontWeight: 'bold', color: i === 0 ? '#FFD700' : '#fff' }}>
                  {p.score}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onExit}
            autoFocus
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              color: 'white',
              border: '4px solid #FFD700',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 215, 0, 0.5)',
              transform: 'scale(1.05)'
            }}
          >
            ÇIKIŞ
          </button>
        </div>
      )}

      {/* Negative Score Modal */}
      {showNegativeScoreModal && negativeScorePlayerIndex !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(5px)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#FF6B6B',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⚠️ DİKKAT
          </div>
          <div style={{ fontSize: '24px', color: '#fff', marginBottom: '40px', textAlign: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#FFD700' }}>{players[negativeScorePlayerIndex].name}</span>
            <br/>
            negatif puana düşmüştür ({players[negativeScorePlayerIndex].score}).
            <br/>
            Ne yapmak istersiniz?
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={handleContinue}
              style={{
                padding: '15px 30px',
                fontSize: '20px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                color: 'white',
                border: negativeModalSelectedBtn === 0 ? '4px solid #FFD700' : '4px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: negativeModalSelectedBtn === 0 ? '0 0 20px rgba(255, 215, 0, 0.6), 0 10px 30px rgba(78, 205, 196, 0.4)' : '0 10px 30px rgba(78, 205, 196, 0.4)',
                transform: negativeModalSelectedBtn === 0 ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              DEVAM ETSİN
            </button>
            <button
              onClick={handleDisqualify}
              style={{
                padding: '15px 30px',
                fontSize: '20px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                color: 'white',
                border: negativeModalSelectedBtn === 1 ? '4px solid #FFD700' : '4px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: negativeModalSelectedBtn === 1 ? '0 0 20px rgba(255, 215, 0, 0.6), 0 10px 30px rgba(255, 107, 107, 0.4)' : '0 10px 30px rgba(255, 107, 107, 0.4)',
                transform: negativeModalSelectedBtn === 1 ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              DİSKALİFİYE EDİLSİN
            </button>
          </div>
        </div>
      )}

      {/* Players Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${playerCount}, 1fr)`,
        gridTemplateRows: '1fr',
        gap: '10px',
        padding: '20px'
      }}>
        {players.map((player, index) => {
          const isActive = index === currentTurn;
          const playerColor = isActive ? currentColor : '#444444'; // Only active player needs the specific color
          
          // Determine styles based on active state
          // If active, background matches player color (White/Yellow)
          // If inactive, background is dark transparent
          const panelBackground = isActive ? playerColor : 'rgba(255, 255, 255, 0.05)';
          
          // Text colors: Black if active (on light bg), White if inactive (on dark bg)
          const scoreColor = isActive ? '#000000' : '#FFFFFF';
          const nameColor = isActive ? '#000000' : '#FFFFFF';
          
          // Stats Panel Styles
          const statsBg = isActive ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.6)';
          const statsBorder = isActive ? '1px solid rgba(0, 0, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.3)';
          const statsBigBorder = isActive ? '2px solid rgba(0, 0, 0, 0.5)' : '2px solid rgba(255, 255, 255, 0.5)';
          const statsTextColor = isActive ? '#000000' : '#FFFFFF';
          const statsLabelColor = isActive ? '#444444' : '#aaaaaa';
          
          return (
          <div key={index} style={{
            background: panelBackground,
            border: isActive ? `3px solid ${playerColor}` : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '15px',
            padding: '20px',
            paddingTop: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            position: 'relative',
            boxShadow: isActive ? `0 0 20px ${playerColor}40` : 'none',
            transition: 'background 0.3s, color 0.3s',
            filter: player.isDisqualified ? 'blur(5px) grayscale(100%)' : 'none',
            opacity: player.isDisqualified ? 0.5 : 1,
            pointerEvents: player.isDisqualified ? 'none' : 'auto'
          }}>
            {/* Disqualified Overlay */}
            {player.isDisqualified && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#FF0000',
                textShadow: '0 0 20px black',
                zIndex: 10,
                transform: 'translate(-50%, -50%) rotate(-15deg)',
                border: '5px solid red',
                padding: '10px 20px',
                borderRadius: '10px'
              }}>
                ELENDİ
              </div>
            )}

            {/* Player Name with Photo */}
            <div style={{ 
              display: 'flex',
              flexDirection: index === 0 ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '10px'
            }}>
              {/* Player Photo */}
              {playerPhotos[player.name] ? (
                <div style={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `3px solid ${isActive ? playerColor : 'rgba(255,255,255,0.3)'}`,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  <img 
                    src={playerPhotos[player.name]} 
                    alt={player.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/logo.png';
                      e.target.style.objectFit = 'contain';
                      e.target.style.padding = '10%';
                      e.target.style.background = '#1e293b';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `3px solid ${isActive ? playerColor : 'rgba(255,255,255,0.3)'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="/logo.png" 
                    alt="3CScore"
                    style={{
                      width: '80%',
                      height: '80%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
              {/* Player Name */}
              <span style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: nameColor
              }}>
                {player.name}
              </span>
            </div>
            
            {/* Score */}
            <div style={{ 
              position: 'relative',
              marginTop: '80px',
              marginBottom: 'auto',
            }}>
              <div style={{ 
                fontSize: '160px', 
                fontWeight: 'bold', 
                color: scoreColor,
                textShadow: isActive ? 'none' : '0 0 20px rgba(0,0,0,0.5)'
              }}>
                {player.score}
              </div>
              
              {/* Score Feedback Overlay */}
              {scoreFeedback[index] !== undefined && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-80px',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: scoreFeedback[index] > 0 ? '#48d84d' : '#ff4d4d',
                  textShadow: '0 0 10px rgba(0,0,0,0.8)',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: `2px solid ${scoreFeedback[index] > 0 ? '#48d84d' : '#ff4d4d'}`,
                  zIndex: 10,
                  animation: 'fadeInOut 3s ease-in-out'
                }}>
                  {scoreFeedback[index] > 0 ? '+' : ''}{scoreFeedback[index]}
                </div>
              )}
            </div>

            {/* Timeout Indicators */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              gap: '8px'
            }}>
              {[...Array(player.timeoutLeft)].map((_, i) => (
                <div key={i} style={{
                  width: 48,
                  height: 20,
                  background: '#48d84d',
                  borderRadius: 8,
                  boxShadow: '0 0 6px #0003',
                  border: '3px solid #185d26'
                }} />
              ))}
            </div>

            {/* Big RUN Panel */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '200px',
              background: statsBg,
              padding: '10px 30px',
              borderRadius: '15px',
              border: statsBigBorder,
              textAlign: 'center',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '18px', color: statsLabelColor, marginBottom: '4px' }}>RUN</div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: statsTextColor }}>
                {player.currentRun}
              </div>
            </div>

            {/* Small Stats Row (HR, AVG, TOTAL) */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '80px',
              display: 'flex',
              gap: '10px'
            }}>
              {/* HR */}
              <div style={{
                background: statsBg,
                padding: '5px 15px',
                borderRadius: '10px',
                border: statsBorder,
                textAlign: 'center',
                minWidth: '70px'
              }}>
                <div style={{ fontSize: '12px', color: statsLabelColor, marginBottom: '2px' }}>HR</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: statsTextColor }}>
                  {Math.max(...player.runs, player.currentRun, 0)}
                </div>
              </div>

              {/* AVG */}
              <div style={{
                background: statsBg,
                padding: '5px 15px',
                borderRadius: '10px',
                border: statsBorder,
                textAlign: 'center',
                minWidth: '90px'
              }}>
                <div style={{ fontSize: '12px', color: statsLabelColor, marginBottom: '2px' }}>AVG</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: statsTextColor }}>
                  {( (player.runs.reduce((a, b) => a + b, 0) + player.currentRun) / (player.runs.length + (player.currentRun > 0 ? 1 : 0) || 1) ).toFixed(3)}
                </div>
              </div>

              {/* TOTAL SCORE */}
              <div style={{
                background: statsBg,
                padding: '5px 15px',
                borderRadius: '10px',
                border: statsBorder,
                textAlign: 'center',
                minWidth: '70px'
              }}>
                <div style={{ fontSize: '12px', color: statsLabelColor, marginBottom: '2px' }}>TOTAL RUN</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: statsTextColor }}>
                  {player.runs.reduce((a, b) => a + b, 0) + player.currentRun}
                </div>
              </div>
            </div>
            
            {/* Stats (HR, Avg) could go here */}
          </div>
          );
        })}
      </div>

      {/* Timer */}
      <TimerProgressBar 
        isTimerRunning={isTimerRunning}
        currentTurn={currentTurn} 
        timerPhase={timerPhase}
        onTimerFinished={handleTimerFinished}
        resetTrigger={timerResetTrigger}
        isTimerPaused={isTimerPaused}
        activeColor={currentPlayerColor}
        duration={30}
      />
    </div>
  );
}

export default SurvivalGame;
