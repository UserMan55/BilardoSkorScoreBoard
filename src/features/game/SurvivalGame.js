import React, { useState, useEffect } from 'react';
import TimerProgressBar from '../../components/TimerProgressBar';
import GameController from './GameController'; // We might need a specialized controller or adapt this one
import { getUserProfiles } from '../../services/firebase';

function SurvivalGame({
  players: initialPlayers, // Array of player names
  onExit,
  tableName = 'Masa 1',
  salonName = 'SALON 3CSCORE'
}) {
  // Game Constants
  const STARTING_SCORE = 10;
  const HALF_DURATION = 20; // TEST: 20 seconds (Original: 45 * 60)
  
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

  // Controller visibility
  const [isControllerVisible, setIsControllerVisible] = useState(true);

  // History for Undo
  const [history, setHistory] = useState([]);
  
  // Score Feedback State
  const [scoreFeedback, setScoreFeedback] = useState({});
  
  // Turn Color State (Strict Alternation)
  const [currentColor, setCurrentColor] = useState('#FFFFFF');

  // Negative Score Modal State
  const [showNegativeScoreModal, setShowNegativeScoreModal] = useState(false);
  const [negativeScorePlayerIndex, setNegativeScorePlayerIndex] = useState(null);

  // Player Photos State
  const [playerPhotos, setPlayerPhotos] = useState({});

  // Derived state
  const currentPlayer = players[currentTurn];
  const playerCount = players.length;
  const activePlayerCount = players.filter(p => !p.isDisqualified).length;
  const currentPlayerColor = currentColor;

  const handlersRef = React.useRef({});
  const timerFinishRef = React.useRef(() => {});

  useEffect(() => {
    handlersRef.current = {
      handlePlusRun,
      handleMinusRun,
      handleOk,
      handleUndo
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
          const profile = profiles.find(p => p.name === name);
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

      if (gameEnded || showHalfTimeModal || showNegativeScoreModal) return;

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
  }, [gameEnded, showHalfTimeModal, showNegativeScoreModal]);

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
    setIsGameClockRunning(true);
    
    // Add starting score to all players for the new set
    setPlayers(prevPlayers => prevPlayers.map(p => ({
      ...p,
      score: p.score + STARTING_SCORE
    })));

    showNotification("2. Set Başladı!", "success");
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
    
    // If current player was somehow disqualified (unlikely in this flow but possible), pass turn
    if (negativeScorePlayerIndex === currentTurn) {
       handleOk();
    }
  };

  const handleContinue = () => {
    setShowNegativeScoreModal(false);
    setNegativeScorePlayerIndex(null);
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
            2. SETE GEÇİLECEKTİR
          </div>
          <button
            onClick={startSecondHalf}
            style={{
              padding: '20px 50px',
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(78, 205, 196, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >
            2. SETİ BAŞLAT
          </button>
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
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(255, 107, 107, 0.4)'
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
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(78, 205, 196, 0.4)'
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
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(255, 107, 107, 0.4)'
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

      {/* Controller */}
      <GameController 
        onPlusRun={handlePlusRun}
        onMinusRun={handleMinusRun}
        onToggleTimer={handleToggleTimer}
        onOk={handleOk}
        onExit={onExit}
        onUndo={handleUndo}
        isTimerRunning={isTimerRunning}
        currentPlayerName={currentPlayer.name}
        currentTurn={currentTurn}
        isVisible={isControllerVisible}
        onToggleVisibility={() => setIsControllerVisible(!isControllerVisible)}
        gameEnded={gameEnded}
        currentScore={currentPlayer.score}
        runCount={currentPlayer.currentRun}
        targetScore={999} // No target score in survival usually, or it's time based
        canUndo={history.length > 0}
      />
    </div>
  );
}

export default SurvivalGame;
