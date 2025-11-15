import React, { useState, useEffect } from 'react';
import PlayerPanel from './PlayerPanel';
import ScorePanel from './ScorePanel';
import StatusBar from './StatusBar';
import StartScreen from './StartScreen';
import GameController from './GameController';
import TimerProgressBar from './TimerProgressBar';


function App() {
  const [started, setStarted] = useState(false);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [hasAso, setHasAso] = useState(true);

  // Oyun state'leri
  const [currentTurn, setCurrentTurn] = useState(0); // 0: player1, 1: player2
  const [inning, setInning] = useState(1);
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
  const [winner, setWinner] = useState(null); // Kazanan (null: devam, 'player1', 'player2', 'draw')
  const [lastTurnBeforeEnd, setLastTurnBeforeEnd] = useState(false); // Son tur flag (ASO için)
  const [notification, setNotification] = useState(null); // { message, type: 'info'|'warning'|'success' }
  const [warningMessage, setWarningMessage] = useState(null); // Son X Sayı/İstaka uyarısı

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

  const handleStart = (p1, p2, tScore, tRack, penalty, aso) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setTargetScore(tScore);
    setTargetRack(tRack);
    setHasPenalty(penalty);
    setHasAso(aso);
    setCurrentTurn(0); // İlk oyuncu başlasın
    setInning(0); // İnning 0'dan başlasın
    setRunCount(0);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setPlayer1Runs([]);
    setPlayer2Runs([]);
    setGameEnded(false);
    setWinner(null);
    setLastTurnBeforeEnd(false);
    setWarningMessage(null); // Uyarı mesajlarını temizle
    setNotification(null); // Bildirimleri temizle
    setStarted(true);
  };

  const handlePlusRun = () => {
    const currentScore = currentTurn === 0 ? player1Score : player2Score;
    const newTotalScore = currentScore + runCount + 1;
    
    // Hedef skordan fazlasına izin verme
    if (newTotalScore > targetScore) {
      return; // Plus butonu zaten pasif olacak, ama yine de kontrol
    }
    
    setRunCount(runCount + 1);
    
    // Plus'ta sadece skor uyarılarını kontrol et
    const remainingScore = targetScore - newTotalScore;
    if (remainingScore === 0) {
      setWarningMessage('🎯 HEDEF SKORA ULAŞILDI!');
    } else if (remainingScore === 1) {
      setWarningMessage('⚠️ SON SAYI!');
    } else if (remainingScore === 2) {
      setWarningMessage('⚠️ SON 2 SAYI!');
    } else if (remainingScore === 3) {
      setWarningMessage('⚠️ SON 3 SAYI!');
    } else {
      setWarningMessage(null);
    }
  };

  const handleMinusRun = () => {
    if (runCount > 0) {
      setRunCount(runCount - 1);
      
      // Minus yapıldığında uyarıyı güncelle
      const currentScore = currentTurn === 0 ? player1Score : player2Score;
      const newTotalScore = currentScore + runCount - 1;
      
      // Minus'ta sadece skor uyarılarını kontrol et
      const remainingScore = targetScore - newTotalScore;
      if (remainingScore === 0) {
        setWarningMessage('🎯 HEDEF SKORA ULAŞILDI!');
      } else if (remainingScore === 1) {
        setWarningMessage('⚠️ SON SAYI!');
      } else if (remainingScore === 2) {
        setWarningMessage('⚠️ SON 2 SAYI!');
      } else if (remainingScore === 3) {
        setWarningMessage('⚠️ SON 3 SAYI!');
      } else {
        setWarningMessage(null);
      }
    }
  };

  const handleToggleTimer = () => {
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
    // Mevcut oyuncunun timeout hakkını kontrol et
    const currentTimeoutLeft = currentTurn === 0 ? player1TimeoutLeft : player2TimeoutLeft;
    
    if (currentTimeoutLeft > 0) {
      // Timeout hakkı varsa, kullan
      if (currentTurn === 0) {
        setPlayer1TimeoutLeft(currentTimeoutLeft - 1);
      } else {
        setPlayer2TimeoutLeft(currentTimeoutLeft - 1);
      }
      
      // Timer'ı reset et ve otomatik olarak yeniden başlat
      setTimerResetTrigger(prev => prev + 1);
      setTimeout(() => {
        setIsTimerRunning(true);
        setTimerPhase('running');
      }, 100);
    } else {
      // Timeout hakkı yoksa, sırayı değiştir
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
    setNotification({ message, type });
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  const endGame = (winnerName) => {
    setGameEnded(true);
    setWinner(winnerName);
    setIsTimerRunning(false);
    setTimerPhase('idle');
  };

  const handleExit = () => {
    // Çıkış onayı
    const confirmExit = window.confirm(
      `Maçı sonlandırmak istediğinize emin misiniz?\n\nMevcut Durum:\n${player1}: ${player1Score} sayı\n${player2}: ${player2Score} sayı\nİstaka: ${inning}\n\nÇıkarsanız maç sonuçları kaydedilmeyecek.`
    );
    
    if (confirmExit) {
      // Oyunu başlangıç durumuna döndür
      setStarted(false);
      setPlayer1("");
      setPlayer2("");
      setTargetScore(30);
      setTargetRack(30);
      setHasPenalty(false);
      setHasAso(true);
      setCurrentTurn(0);
      setInning(0);
      setRunCount(0);
      setPlayer1Score(0);
      setPlayer2Score(0);
      setPlayer1Runs([]);
      setPlayer2Runs([]);
      setGameEnded(false);
      setWinner(null);
      setLastTurnBeforeEnd(false);
      setWarningMessage(null);
      setNotification(null);
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setIsTimerPaused(false);
      showNotification('Maç sonlandırıldı. Ana ekrana dönülüyor...', 'info', 2000);
    }
  };

  const handleOk = () => {
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

    // KURAL 1: Hedef istaka kontrolü (1. oyuncu OK'ladıktan sonra kontrol)
    const nextInning = currentTurn === 0 ? inning + 1 : inning;
    if (currentTurn === 0 && nextInning >= targetRack) {
      // 1. oyuncu hedef istakaya ulaştı, sıra 2. oyuncuya geçer
      // 2. oyuncu son serisini girdikten sonra oyun bitecek
      setInning(nextInning);
      setCurrentTurn(1);
      setLastTurnBeforeEnd(true);
      setRunCount(0);
      showNotification(`🎯 ${player1} hedef istakaya ulaştı!\n${player2} son serisini oynuyor...`, 'warning', 4000);
      return;
    }

    // KURAL 1 devamı: 2. oyuncu son serisini girdi, oyunu bitir
    if (lastTurnBeforeEnd && currentTurn === 1) {
      // Oyun bitti, kazananı belirle
      if (newPlayer1Score > newPlayer2Score) {
        endGame(player1);
      } else if (newPlayer2Score > newPlayer1Score) {
        endGame(player2);
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
      setCurrentTurn(1);
      setLastTurnBeforeEnd(true);
      setRunCount(0);
      showNotification(`🎯 ${player1} hedef skora ulaştı!\n${player2} son serisini oynuyor (ASO)...`, 'warning', 4000);
      return;
    }

    // KURAL 2a devamı: 1. oyuncu hedef skora ulaştı, ASO yok
    if (currentTurn === 0 && newPlayer1Score >= targetScore && !hasAso) {
      // Oyun biter, 1. oyuncu kazandı
      endGame(player1);
      return;
    }

    // KURAL 2b: 2. oyuncu hedef skora ulaştıysa
    if (currentTurn === 1 && newPlayer2Score >= targetScore) {
      // Oyun biter, 2. oyuncu kazandı
      endGame(player2);
      return;
    }

    // Normal sıra değişimi
    if (currentTurn === 0) {
      // 1. oyuncudan 2. oyuncuya geçiş - İstaka artır
      const nextInning = inning + 1;
      setInning(nextInning);
      setCurrentTurn(1);
      
      // 1. oyuncu OK'ladıktan sonra, 2. oyuncu için skor kontrolü yap
      const remainingScore2 = targetScore - newPlayer2Score;
      if (remainingScore2 <= 0) {
        setWarningMessage('🎯 HEDEF SKORA ULAŞILDI!');
      } else if (remainingScore2 === 1) {
        setWarningMessage('⚠️ SON SAYI!');
      } else if (remainingScore2 === 2) {
        setWarningMessage('⚠️ SON 2 SAYI!');
      } else if (remainingScore2 === 3) {
        setWarningMessage('⚠️ SON 3 SAYI!');
      } else {
        // Skor uyarısı yok, istaka kontrolü yapma
        setWarningMessage(null);
      }
    } else {
      // 2. oyuncudan 1. oyuncuya geçiş - İstaka ve skor kontrol et
      setCurrentTurn(0);
      
      // Önce istaka kontrolü (öncelikli)
      const remainingInning = targetRack - inning;
      let warning = null;
      
      if (remainingInning <= 0) {
        warning = '🎯 HEDEF İSTAKAYA ULAŞILDI!';
      } else if (remainingInning === 1) {
        warning = '⚠️ SON İSTAKA!';
      } else if (remainingInning === 2) {
        warning = '⚠️ SON 2 İSTAKA!';
      } else if (remainingInning === 3) {
        warning = '⚠️ SON 3 İSTAKA!';
      }
      
      // İstaka uyarısı yoksa, 1. oyuncu için skor kontrolü yap
      if (!warning) {
        const remainingScore1 = targetScore - newPlayer1Score;
        if (remainingScore1 <= 0) {
          warning = '🎯 HEDEF SKORA ULAŞILDI!';
        } else if (remainingScore1 === 1) {
          warning = '⚠️ SON SAYI!';
        } else if (remainingScore1 === 2) {
          warning = '⚠️ SON 2 SAYI!';
        } else if (remainingScore1 === 3) {
          warning = '⚠️ SON 3 SAYI!';
        }
      }
      
      setWarningMessage(warning);
    }

    setRunCount(0);
  };

  if (!started) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#212529',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Notification Overlay */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: notification.type === 'warning' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' :
                      notification.type === 'success' ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)' :
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px 50px',
          borderRadius: '15px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 999,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          whiteSpace: 'pre-line',
          minWidth: '300px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {/* Oyun Sonu Overlay */}
      {gameEnded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a2d3a',
            padding: '40px 60px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '3px solid #FFD700',
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.5)'
          }}>
            <h1 style={{ color: '#FFD700', fontSize: '48px', marginBottom: '20px' }}>
              {winner === 'draw' ? 'BERABERE!' : winner === 'penalty' ? 'PENALTILAR!' : 'OYUN BİTTİ!'}
            </h1>
            {winner !== 'draw' && winner !== 'penalty' && (
              <h2 style={{ color: '#4ECDC4', fontSize: '36px', marginBottom: '20px' }}>
                🏆 {winner} KAZANDI! 🏆
              </h2>
            )}
            <div style={{ color: 'white', fontSize: '28px', marginBottom: '30px' }}>
              <div>{player1}: {player1Score}</div>
              <div>{player2}: {player2Score}</div>
            </div>
            <button 
              onClick={() => {
                setStarted(false);
                setGameEnded(false);
                setWinner(null);
                setWarningMessage(null);
                setNotification(null);
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#764ba2';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.transform = 'scale(1)';
              }}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                fontSize: '20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              Yeni Oyun
            </button>
          </div>
        </div>
      )}

      {/* Son Tur Uyarısı */}
      {lastTurnBeforeEnd && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 69, 0, 0.9)',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '10px',
          fontSize: '20px',
          fontWeight: '700',
          zIndex: 100,
          border: '3px solid #FFD700',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.7)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          ⚠️ SON SERİ! ⚠️
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
          name={player1}
          score={player1Score}
          hr1={calculateHRStats(player1Runs).hr1}
          hr2={calculateHRStats(player1Runs).hr2}
          avg={calculateAVG(player1Score, inning)}
          bg="#3b3b3b"
          playerIndex={0}
          isActive={currentTurn === 0}
          borderColor={currentTurn === 0 ? '#FFFFFF' : 'transparent'}
          timeoutLeft={player1TimeoutLeft}
        />
        
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          {/* Son X Sayı/İstaka Uyarısı */}
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
          name={player2}
          score={player2Score}
          hr1={calculateHRStats(player2Runs).hr1}
          hr2={calculateHRStats(player2Runs).hr2}
          avg={calculateAVG(player2Score, inning)}
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
      />
      <GameController 
        onPlusRun={handlePlusRun}
        onMinusRun={handleMinusRun}
        onToggleTimer={handleToggleTimer}
        onOk={handleOk}
        onExit={handleExit}
        isTimerRunning={isTimerRunning}
        currentPlayerName={currentTurn === 0 ? player1 : player2}
        currentTurn={currentTurn}
        isVisible={isControllerVisible}
        onToggleVisibility={() => setIsControllerVisible(!isControllerVisible)}
        gameEnded={gameEnded}
        currentScore={currentTurn === 0 ? player1Score : player2Score}
        runCount={runCount}
        targetScore={targetScore}
      />
    </div>
  );
}

export default App;