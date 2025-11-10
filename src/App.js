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

  // Sıra değiştiğinde timer'ı reset et
  useEffect(() => {
    setTimerResetTrigger(prev => prev + 1);
    setIsTimerRunning(false);
    setTimerPhase('idle');
    setIsTimerPaused(false); // Pause durumunu sıfırla
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
    setInning(1);
    setRunCount(0);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setStarted(true);
  };

  const handlePlusRun = () => {
    setRunCount(runCount + 1);
  };

  const handleMinusRun = () => {
    if (runCount > 0) {
      setRunCount(runCount - 1);
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

  const handleOk = () => {
    // Eğer runCount > 0 ise, bunu run geçmişine ekle
    if (runCount > 0) {
      if (currentTurn === 0) {
        setPlayer1Runs([...player1Runs, runCount]);
        setPlayer1Score(player1Score + runCount);
      } else {
        setPlayer2Runs([...player2Runs, runCount]);
        setPlayer2Score(player2Score + runCount);
      }
    }

    // Eğer timer çalışıyorsa, durdur ve sıfırla
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerPhase('idle');
      setTimerResetTrigger(prev => prev + 1); // Timer'ı reset et
      setIsTimerPaused(false); // Pause durumunu sıfırla
    }

    // Sırayı değiştir
    if (currentTurn === 0) {
      // Oyuncu 1'den oyuncu 2'ye geç
      setCurrentTurn(1);
    } else {
      // Oyuncu 2'den oyuncu 1'e geç ve inning'i artır
      setCurrentTurn(0);
      setInning(inning + 1);
    }

    // Run sayısını sıfırla
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
        <ScorePanel 
          inning={inning} 
          run={runCount} 
          runColor={currentTurn === 0 ? '#FFFFFF' : '#FFD700'} 
          onShowController={() => setIsControllerVisible(true)}
          isControllerHidden={!isControllerVisible}
        />
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
        isTimerRunning={isTimerRunning}
        currentPlayerName={currentTurn === 0 ? player1 : player2}
        currentTurn={currentTurn}
        isVisible={isControllerVisible}
        onToggleVisibility={() => setIsControllerVisible(!isControllerVisible)}
      />
    </div>
  );
}

export default App;