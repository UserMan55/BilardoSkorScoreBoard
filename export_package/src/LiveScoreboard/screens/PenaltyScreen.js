import React, { useState, useEffect } from 'react';
import GameController from '../features/game/GameController';
import TimerProgressBar from '../components/TimerProgressBar';

function PenaltyScreen({ 
  player1Name, 
  player2Name,
  mainGamePlayer1Score,
  mainGamePlayer2Score,
  mainGamePlayer1HR1,
  mainGamePlayer1HR2,
  mainGamePlayer2HR1,
  mainGamePlayer2HR2,
  mainGamePlayer1AVG,
  mainGamePlayer2AVG,
  mainGameInning,
  onPenaltyEnd 
}) {
  // Penaltı round state
  const [penaltyRound, setPenaltyRound] = useState(1);
  const [currentTurn, setCurrentTurn] = useState(0); // 0: player1, 1: player2
  const [runCount, setRunCount] = useState(0);
  
  // Penaltı skorları
  const [player1PenaltyScores, setPlayer1PenaltyScores] = useState([]);
  const [player2PenaltyScores, setPlayer2PenaltyScores] = useState([]);
  
  // Timeout hakları (her round'da her oyuncunun 1 hakkı var)
  const [player1TimeoutLeft, setPlayer1TimeoutLeft] = useState(1);
  const [player2TimeoutLeft, setPlayer2TimeoutLeft] = useState(1);
  
  // Timer
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState('idle');
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  
  const handlersRef = React.useRef({});

  useEffect(() => {
    handlersRef.current = {
      handlePlusRun,
      handleMinusRun,
      handleToggleTimer,
      handleOk,
      handleExit
    };
  });

  const callHandler = (name) => {
    const handler = handlersRef.current?.[name];
    if (typeof handler === 'function') {
      handler();
    }
  };

  // Penaltı bitiş state'i
  const [penaltyEnded, setPenaltyEnded] = useState(false);
  const [penaltyWinner, setPenaltyWinner] = useState(null);
  
  // Exit Confirm Modal State
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [modalFocusIndex, setModalFocusIndex] = useState(1); // 0: Hayır, 1: Evet
  
  // Current round scores
  const currentPlayer1Score = player1PenaltyScores[penaltyRound - 1] || 0;
  const currentPlayer2Score = player2PenaltyScores[penaltyRound - 1] || 0;

  // Sıra değiştiğinde timer'ı reset et
  useEffect(() => {
    setTimerResetTrigger(prev => prev + 1);
    setIsTimerRunning(false);
    setTimerPhase('idle');
    setIsTimerPaused(false);
  }, [currentTurn]);

  // Klavye kontrolleri
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('🔘 Tuş Basıldı (Penalty):', e.key, '| Code:', e.code); // Debug için log

      // Menu tuşunu engelle
      if (e.key === 'ContextMenu' || e.code === 'ContextMenu') {
        e.preventDefault();
        return;
      }

      // Eğer çıkış onayı gösteriliyorsa
      if (showExitConfirm) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          setModalFocusIndex(prev => prev === 0 ? 1 : 0);
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (modalFocusIndex === 1) {
            // Evet, Çık
            onPenaltyEnd('draw');
          } else {
            // Hayır, İptal
            setShowExitConfirm(false);
          }
        } else if (e.key === 'Escape') {
          setShowExitConfirm(false);
        }
        return;
      }

      // Eğer penaltı bittiyse sadece Enter ile çıkışa izin ver
      if (penaltyEnded) {
        if (e.key === 'Enter' || e.key === ' ') {
          onPenaltyEnd(penaltyWinner);
        }
        return;
      }

      switch(e.key) {
        case 'ArrowRight': // Sayı Artır (Yeni Mapping)
          callHandler('handlePlusRun');
          break;
        case 'ArrowLeft': // Sayı Azalt (Yeni Mapping)
          callHandler('handleMinusRun');
          break;
        case 'ArrowUp': // Timer Başlat/Durdur (Yeni Mapping)
        case 'ArrowDown':
          callHandler('handleToggleTimer');
          break;
        case 'Enter': // OK (Sıra Geç)
        case ' ':
          callHandler('handleOk');
          break;
        case 't': // Timer Başlat/Durdur
        case 'T':
          callHandler('handleToggleTimer');
          break;
        case 'Escape': // Exit
        case 'Backspace':
          callHandler('handleExit');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    penaltyEnded,
    penaltyWinner,
    runCount,
    isTimerRunning,
    currentTurn,
    penaltyRound,
    player1PenaltyScores,
    player2PenaltyScores,
    player1TimeoutLeft,
    player2TimeoutLeft,
    showExitConfirm,
    modalFocusIndex,
    onPenaltyEnd
  ]);

  const handlePlusRun = () => {
    setRunCount(runCount + 1);
  };

  const handleMinusRun = () => {
    if (runCount > 0) {
      setRunCount(runCount - 1);
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
    const currentTimeoutLeft = currentTurn === 0 ? player1TimeoutLeft : player2TimeoutLeft;
    
    if (currentTimeoutLeft > 0) {
      if (currentTurn === 0) {
        setPlayer1TimeoutLeft(player1TimeoutLeft - 1);
      } else {
        setPlayer2TimeoutLeft(player2TimeoutLeft - 1);
      }
      setTimerResetTrigger(prev => prev + 1);
      setTimeout(() => {
        setIsTimerRunning(true);
        setTimerPhase('running');
      }, 100);
    } else {
      // Timeout hakkı yok, sırayı değiştir
      setIsTimerRunning(false);
      setTimerPhase('idle');
      if (currentTurn === 0) {
        setCurrentTurn(1);
      } else {
        checkRoundEnd();
      }
    }
  };

  const handleOk = () => {
    // Timer'ı durdur
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setTimerResetTrigger(prev => prev + 1);
      setIsTimerPaused(false);
    }

    // Skorları güncelle
    if (currentTurn === 0) {
      // Player 1 OK bastı
      const newScores = [...player1PenaltyScores];
      newScores[penaltyRound - 1] = (newScores[penaltyRound - 1] || 0) + runCount;
      setPlayer1PenaltyScores(newScores);
      
      setRunCount(0);
      setCurrentTurn(1);
    } else {
      // Player 2 OK bastı
      const newScores = [...player2PenaltyScores];
      newScores[penaltyRound - 1] = (newScores[penaltyRound - 1] || 0) + runCount;
      setPlayer2PenaltyScores(newScores);
      
      setRunCount(0);
      
      // Round tamamlandı, sonuçları kontrol et
      checkRoundEnd(newScores);
    }
  };

  const checkRoundEnd = (updatedPlayer2Scores = player2PenaltyScores) => {
    const p1Score = player1PenaltyScores[penaltyRound - 1] || 0;
    const p2Score = updatedPlayer2Scores[penaltyRound - 1] || 0;
    
    if (p1Score > p2Score) {
      // Player 1 kazandı
      setPenaltyEnded(true);
      setPenaltyWinner(player1Name);
    } else if (p2Score > p1Score) {
      // Player 2 kazandı
      setPenaltyEnded(true);
      setPenaltyWinner(player2Name);
    } else {
      // Berabere, sonraki round'a geç
      setPenaltyRound(penaltyRound + 1);
      setCurrentTurn(0);
      
      // Timeout haklarını sıfırla (her round'da 1 hak)
      setPlayer1TimeoutLeft(1);
      setPlayer2TimeoutLeft(1);
    }
  };

  const handleExit = () => {
    setShowExitConfirm(true);
    setModalFocusIndex(1); // Varsayılan olarak "Evet" seçili olsun
  };

  // Penaltı bitişinde sonuç ekranı
  if (penaltyEnded) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(15px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '25px',
          padding: '50px',
          maxWidth: '900px',
          width: '100%',
          boxShadow: '0 0 60px rgba(255, 215, 0, 0.6)',
          border: '4px solid #FFD700',
          textAlign: 'center'
        }}>
          {/* Kazanan İlanı */}
          <div style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            color: '#000',
            padding: '30px',
            borderRadius: '15px',
            marginBottom: '40px',
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>
              🏆 PENALTI KAZANANI 🏆
            </div>
            <div style={{ fontSize: '64px', fontWeight: 'bold' }}>
              {penaltyWinner}
            </div>
          </div>

          {/* Ana Maç Verileri */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <div style={{ color: '#FFD700', fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
              📊 Ana Maç Verileri
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '30px', flexWrap: 'wrap' }}>
              {/* Player 1 Stats */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {player1Name}
                </div>
                <div style={{ color: '#FFD700', fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>
                  {mainGamePlayer1Score}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px', lineHeight: '1.8' }}>
                  HR1: {mainGamePlayer1HR1} | HR2: {mainGamePlayer1HR2}<br/>
                  AVG: {mainGamePlayer1AVG}
                </div>
              </div>

              {/* İstaka */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '18px', textAlign: 'center' }}>
                  İstaka<br/>
                  <span style={{ color: '#FFD700', fontSize: '36px', fontWeight: 'bold' }}>{mainGameInning}</span>
                </div>
              </div>

              {/* Player 2 Stats */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {player2Name}
                </div>
                <div style={{ color: '#FFD700', fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>
                  {mainGamePlayer2Score}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px', lineHeight: '1.8' }}>
                  HR1: {mainGamePlayer2HR1} | HR2: {mainGamePlayer2HR2}<br/>
                  AVG: {mainGamePlayer2AVG}
                </div>
              </div>
            </div>
          </div>

          {/* Kapat Butonu */}
          <button
            onClick={() => onPenaltyEnd(penaltyWinner)}
            style={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              border: 'none',
              padding: '20px 50px',
              fontSize: '24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 8px 30px rgba(76, 175, 80, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
            }}
          >
            Devam Et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Penaltı Modal */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 50px rgba(255, 215, 0, 0.5)',
        border: '3px solid #FFD700',
        position: 'relative'
      }}>
        {/* Penaltı Başlığı */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '12px',
          fontSize: '32px',
          fontWeight: 'bold',
          border: '3px solid #FFD700',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.7)',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          🎯 PENALTI ATIŞLARI - Round {penaltyRound} 🎯
        </div>

        {/* Skor Panelleri */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          {/* Player 1 Panel */}
          <div style={{
            background: currentTurn === 0 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(200, 200, 200, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(59, 59, 59, 0.5) 0%, rgba(40, 40, 40, 0.4) 100%)',
            border: currentTurn === 0 ? '4px solid #FFFFFF' : '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            padding: '30px',
            minWidth: '220px',
            flex: '1',
            maxWidth: '280px',
            textAlign: 'center',
            boxShadow: currentTurn === 0 
              ? '0 0 40px rgba(255, 255, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)' 
              : '0 4px 15px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {currentTurn === 0 && (
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                animation: 'shimmer 3s infinite',
                pointerEvents: 'none'
              }} />
            )}
            <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', marginBottom: '15px', position: 'relative', zIndex: 1 }}>
              {player1Name}
            </div>
            <div style={{ 
              color: '#FFFFFF', 
              fontSize: '64px', 
              fontWeight: 'bold', 
              marginBottom: '15px', 
              lineHeight: '1',
              textShadow: currentTurn === 0 ? '0 0 30px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.5)' : 'none',
              position: 'relative',
              zIndex: 1
            }}>
              {currentPlayer1Score}
            </div>
            <div style={{ 
              color: player1TimeoutLeft > 0 ? '#4CAF50' : '#F44336', 
              fontSize: '14px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 1
            }}>
              Timeout: {player1TimeoutLeft}
            </div>
          </div>

          {/* Orta Panel - Run Count */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
            border: '3px solid #667eea',
            borderRadius: '15px',
            padding: '30px 35px',
            textAlign: 'center',
            minWidth: '200px',
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '8px', letterSpacing: '2px' }}>
              RUN
            </div>
            <div style={{ 
              color: currentTurn === 0 ? '#FFFFFF' : '#FFD700', 
              fontSize: '80px', 
              fontWeight: 'bold',
              lineHeight: '1',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
            }}>
              {runCount}
            </div>
          </div>

          {/* Player 2 Panel */}
          <div style={{
            background: currentTurn === 1 
              ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 180, 0, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(34, 40, 62, 0.5) 0%, rgba(25, 30, 45, 0.4) 100%)',
            border: currentTurn === 1 ? '4px solid #FFD700' : '2px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '20px',
            padding: '30px',
            minWidth: '220px',
            flex: '1',
            maxWidth: '280px',
            textAlign: 'center',
            boxShadow: currentTurn === 1 
              ? '0 0 40px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.1)' 
              : '0 4px 15px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {currentTurn === 1 && (
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.15) 50%, transparent 70%)',
                animation: 'shimmer 3s infinite',
                pointerEvents: 'none'
              }} />
            )}
            <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', marginBottom: '15px', position: 'relative', zIndex: 1 }}>
              {player2Name}
            </div>
            <div style={{ 
              color: '#FFD700', 
              fontSize: '64px', 
              fontWeight: 'bold', 
              marginBottom: '15px', 
              lineHeight: '1',
              textShadow: currentTurn === 1 ? '0 0 30px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.5)' : 'none',
              position: 'relative',
              zIndex: 1
            }}>
              {currentPlayer2Score}
            </div>
            <div style={{ 
              color: player2TimeoutLeft > 0 ? '#4CAF50' : '#F44336', 
              fontSize: '14px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 1
            }}>
              Timeout: {player2TimeoutLeft}
            </div>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <div style={{ marginTop: '20px' }}>
          <TimerProgressBar 
            isTimerRunning={isTimerRunning}
            currentTurn={currentTurn}
            timerPhase={timerPhase}
            onTimerFinished={handleTimerFinished}
            resetTrigger={timerResetTrigger}
            isTimerPaused={isTimerPaused}
          />
        </div>

        {/* Game Controller - Digital Controller Devre Dışı */}
        <div style={{ display: 'none' }}>
        <GameController 
          onPlusRun={handlePlusRun}
          onMinusRun={handleMinusRun}
          onToggleTimer={handleToggleTimer}
          onOk={handleOk}
          onExit={handleExit}
          isTimerRunning={isTimerRunning}
          currentPlayerName={currentTurn === 0 ? player1Name : player2Name}
          currentTurn={currentTurn}
          isVisible={false}
          onToggleVisibility={() => {}}
          gameEnded={false}
          currentScore={currentTurn === 0 ? currentPlayer1Score : currentPlayer2Score}
          runCount={runCount}
          targetScore={999}
        />
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: '#1e293b',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '2px solid #475569',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
              ⚠️ Çıkış Onayı
            </div>
            <div style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '30px' }}>
              Penaltı atışlarını iptal edip çıkmak istiyor musunuz?
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '15px 30px',
                  borderRadius: '12px',
                  border: modalFocusIndex === 0 ? '3px solid white' : 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transform: modalFocusIndex === 0 ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: modalFocusIndex === 0 ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Hayır
              </button>
              <button
                onClick={() => onPenaltyEnd('draw')}
                style={{
                  padding: '15px 30px',
                  borderRadius: '12px',
                  border: modalFocusIndex === 1 ? '3px solid white' : 'none',
                  background: '#22c55e',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transform: modalFocusIndex === 1 ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: modalFocusIndex === 1 ? '0 0 20px rgba(34, 197, 94, 0.6)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Evet, Çık
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PenaltyScreen;
