import React, { useState } from 'react';
import StartScreen from './screens/StartScreen';
import StandardGame from './features/game/StandardGame';
import SurvivalGame from './features/game/SurvivalGame';
import ScoreboardReceiver from './screens/ScoreboardReceiver';
import { updateTableStatus } from './services/firebase';

function App() {
  // URL parametresine göre mod belirleme (Raspberry Pi için)
  const urlParams = new URLSearchParams(window.location.search);
  const isReceiverMode = urlParams.get('mode') === 'receiver';
  
  const [screen, setScreen] = useState(isReceiverMode ? 'receiver' : 'start'); // 'start', 'standard', 'survival', 'receiver'
  const [gameSettings, setGameSettings] = useState(null);
  const [survivalPlayers, setSurvivalPlayers] = useState([]);

  // Global Context Menu Prevention (Disable Right Click / Menu Key)
  React.useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Global "Home" Key Handler (Folder Button on Remote)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // "BrowserHome" is the standard key for the Home button on multimedia keyboards/remotes
      // Also checking "HomePage" just in case
      if (e.key === 'BrowserHome' || e.key === 'HomePage' || e.code === 'BrowserHome') {
        e.preventDefault(); // Prevent default browser behavior
        
        if (screen === 'start') {
          // If on start screen, reload/reset the app to origin
          console.log("🏠 Home Key: Reloading App...");
          window.location.href = window.location.origin;
        } else {
          // If in game, ignore it completely
          console.log("🚫 Home Key: Ignored during game.");
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [screen]);

  // App seviyesinde mobil kontrolü ve yönlendirme
  React.useEffect(() => {
    const userAgent = navigator.userAgent;
    const screenWidth = window.innerWidth;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) 
                   || (screenWidth <= 1024 && hasTouch);

    if (isMobile && screen === 'receiver') {
      console.log("📱 App.js: Mobil cihaz algılandı, StartScreen'e zorlanıyor.");
      setScreen('start');
    }
  }, [screen]);

  const handleStartStandard = (p1, p2, tScore, tRack, penalty, aso, isFreeMode = false, tableName = 'Masa 1', salonName = 'SALON 3CSCORE') => {
    const settings = {
      player1Name: p1,
      player2Name: p2,
      targetScore: tScore,
      targetRack: tRack,
      hasPenalty: penalty,
      hasAso: aso,
      isFreeMode: isFreeMode,
      tableName: tableName,
      salonName: salonName
    };
    setGameSettings(settings);
    setScreen('standard');
    
    // Masa durumunu BUSY yap (Serbest mod dahil tüm modlar için)
    updateTableStatus('table_1', 'BUSY', {
      mode: isFreeMode ? 'free' : '2vs2',
      players: [p1, p2],
      settings: { targetScore: tScore, isFreeMode }
    });
  };

  const handleStartSurvival = (players, tableName = 'Masa 1', salonName = 'SALON 3CSCORE') => {
    setSurvivalPlayers(players);
    setGameSettings({ tableName, salonName });
    setScreen('survival');
    
    // Masa durumunu BUSY yap
    updateTableStatus('table_1', 'BUSY', {
      mode: 'survival',
      players: players,
      settings: {}
    });
  };

  const handleExitGame = () => {
    setScreen(isReceiverMode ? 'receiver' : 'start');
    setGameSettings(null);
    setSurvivalPlayers([]);
    
    // Masa durumunu IDLE yap
    updateTableStatus('table_1', 'IDLE');
  };

  const handleReceiveMatchData = (data) => {
    // Firebase'den gelen maç verilerini al ve oyunu başlat
    if (data && data.players && data.settings) {
      const [p1, p2] = data.players;
      const { targetScore, targetRack, hasAso, hasPenalty } = data.settings;
      
      const settings = {
        player1Name: p1,
        player2Name: p2,
        targetScore: targetScore,
        targetRack: targetRack,
        hasPenalty: hasPenalty,
        hasAso: hasAso,
        tableName: data.tableName || 'Masa 1',
        salonName: data.salonName || 'SALON 3CSCORE'
      };
      
      setGameSettings(settings);
      setScreen('standard');
      
      // Masa durumunu BUSY yap (Receiver üzerinden başlatılsa bile)
      updateTableStatus('table_1', 'BUSY', {
        mode: '2vs2',
        players: [p1, p2],
        settings: { targetScore: targetScore }
      });
    }
  };

  return (
    <>
      {screen === 'receiver' && (
        <ScoreboardReceiver 
          onStartGame={handleReceiveMatchData}
        />
      )}
      {screen === 'start' && (
        <StartScreen 
          onStart={handleStartStandard} 
          onSurvivalStart={handleStartSurvival} 
        />
      )}
      {screen === 'standard' && <StandardGame {...gameSettings} onExit={handleExitGame} />}
      {screen === 'survival' && <SurvivalGame players={survivalPlayers} onExit={handleExitGame} tableName={gameSettings?.tableName || 'Masa 1'} salonName={gameSettings?.salonName || 'SALON 3CSCORE'} />}
    </>
  );
}

export default App;