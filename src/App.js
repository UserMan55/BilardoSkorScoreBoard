import React, { useState, useEffect } from 'react';
import StartScreen from './screens/StartScreen';
import MobileController from './screens/MobileController';
import { updateTableStatus, verifyIdToken } from './services/firebase';

// Build hedefine göre mod belirleme
// REACT_APP_BUILD_TARGET=mobile ise sadece mobil ekranlar yüklenir
const isPiMode = process.env.REACT_APP_BUILD_TARGET !== 'mobile';

// Pi-only componentler - Sadece Pi modunda yüklenir (code splitting)
let StandardGame = null;
let SurvivalGame = null;
let ScoreboardReceiver = null;

if (isPiMode) {
  StandardGame = require('./features/game/StandardGame').default;
  SurvivalGame = require('./features/game/SurvivalGame').default;
  ScoreboardReceiver = require('./screens/ScoreboardReceiver').default;
}

/**
 * Erişim Engellendi Ekranı
 * Token doğrulama başarısız olduğunda gösterilir
 */
function AccessDenied({ message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚫</div>
      <h1 style={{ color: '#e74c3c', marginBottom: '10px' }}>Erişim Engellendi</h1>
      <p style={{ fontSize: '18px', color: '#aaa', maxWidth: '400px', marginBottom: '20px' }}>
        {message || 'Bu uygulamaya erişim için 3cscore.com üzerinden giriş yapmanız gerekmektedir.'}
      </p>
      <a 
        href="https://3cscore.com"
        style={{
          backgroundColor: '#3498db',
          color: '#fff',
          padding: '15px 40px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        3cscore.com'a Git
      </a>
    </div>
  );
}

/**
 * Token Doğrulama Yükleniyor Ekranı
 */
function AuthLoading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
      <h2>Kimlik Doğrulanıyor...</h2>
      <p style={{ color: '#aaa' }}>Lütfen bekleyin</p>
    </div>
  );
}

// Client-side token doğrulama kullanılıyor (Cloud Function yerine)

function App() {
  // URL parametresine göre mod belirleme
  const urlParams = new URLSearchParams(window.location.search);
  const isReceiverMode = urlParams.get('mode') === 'receiver';
  const isMobileControllerMode = urlParams.get('mode') === 'controller';
  const urlTableId = urlParams.get('table') || 'table_1';
  const urlToken = urlParams.get('token'); // Firebase ID Token
  
  // Auth durumu - Sadece mobil build'de kontrol edilir
  const [authState, setAuthState] = useState({
    loading: !isPiMode, // Pi'de loading yok, Mobil'de var
    authenticated: isPiMode, // Pi default olarak authenticated
    error: null,
    user: null
  });
  
  // Başlangıç ekranını belirle
  const getInitialScreen = () => {
    if (isMobileControllerMode) return 'controller'; // URL'de mode=controller varsa
    if (!isPiMode) return 'start'; // Mobil build - StartScreen (maç başlatma)
    if (isReceiverMode) return 'receiver'; // Pi receiver mode
    return 'start'; // Pi default - StartScreen
  };
  
  const [screen, setScreen] = useState(getInitialScreen());
  const [gameSettings, setGameSettings] = useState(null);
  const [survivalPlayers, setSurvivalPlayers] = useState([]);
  const [gameKey, setGameKey] = useState(Date.now());
  const [controllerTableId, setControllerTableId] = useState(urlTableId);

  // Token doğrulama - Sadece mobil build'de çalışır
  useEffect(() => {
    if (isPiMode) return; // Pi'de token doğrulama yok
    
    const verifyToken = async () => {
      // Token yoksa erişim engelle
      if (!urlToken) {
        console.log('❌ Token bulunamadı');
        setAuthState({
          loading: false,
          authenticated: false,
          error: 'Token bulunamadı. Lütfen 3cscore.com üzerinden giriş yapın.',
          user: null
        });
        return;
      }
      
      try {
        console.log('🔐 Token doğrulanıyor...');
        
        // Client-side token doğrulama
        const result = await verifyIdToken(urlToken);
        
        if (result.valid) {
          console.log('✅ Token doğrulandı:', result.uid);
          setAuthState({
            loading: false,
            authenticated: true,
            error: null,
            user: {
              uid: result.uid,
              email: result.email,
              name: result.name
            }
          });
        } else {
          console.log('❌ Token geçersiz:', result.error);
          setAuthState({
            loading: false,
            authenticated: false,
            error: result.error || 'Token doğrulanamadı',
            user: null
          });
        }
      } catch (error) {
        console.error('❌ Token doğrulama hatası:', error);
        setAuthState({
          loading: false,
          authenticated: false,
          error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
          user: null
        });
      }
    };
    
    verifyToken();
  }, [urlToken]);

  // Global Context Menu Prevention (Disable Right Click / Menu Key)
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Global "Home" Key Handler (Folder Button on Remote) - Pi only
  useEffect(() => {
    if (!isPiMode) return; // Mobil build'de bu handler çalışmaz
    
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
  useEffect(() => {
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

  // Auth kontrolü - Mobil build için (hook'lardan sonra olmalı)
  if (!isPiMode) {
    if (authState.loading) {
      return <AuthLoading />;
    }
    if (!authState.authenticated) {
      return <AccessDenied message={authState.error} />;
    }
  }

  const handleStartStandard = (p1, p2, tScore, tRack, penalty, aso, isFreeMode = false, tableName = 'Masa 1', salonName = 'SALON 3CSCORE') => {
    if (!isPiMode) return; // Mobil'de oyun başlatma yok
    
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
    if (!isPiMode) return; // Mobil'de oyun başlatma yok
    
    setSurvivalPlayers(players);
    setGameSettings({ tableName, salonName });
    setGameKey(Date.now()); // Force new component instance
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
    if (!isPiMode) return; // Mobil'de receiver yok
    
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

  // MobileController'a geçiş (canlı maç takibi için)
  const handleShowController = (tableId = 'table_1') => {
    setControllerTableId(tableId);
    setScreen('controller');
  };

  // MobileController'dan çıkış
  const handleExitController = () => {
    setControllerTableId('table_1');
    setScreen('start');
    // URL'den mode parametresini temizle
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <>
      {/* Mobile Controller - Her iki platformda da var */}
      {screen === 'controller' && (
        <MobileController 
          tableId={controllerTableId}
          onBack={handleExitController}
        />
      )}
      
      {/* Pi-only: Receiver Ekranı */}
      {screen === 'receiver' && isPiMode && ScoreboardReceiver && (
        <ScoreboardReceiver 
          onStartGame={handleReceiveMatchData}
        />
      )}
      
      {/* Start Screen - Her iki platformda da var */}
      {screen === 'start' && (
        <StartScreen 
          onStart={isPiMode ? handleStartStandard : undefined}
          onSurvivalStart={isPiMode ? handleStartSurvival : undefined}
          onShowController={handleShowController}
          isMobileOnly={!isPiMode}
        />
      )}
      
      {/* Pi-only: Game Screens */}
      {screen === 'standard' && isPiMode && StandardGame && (
        <StandardGame {...gameSettings} onExit={handleExitGame} />
      )}
      {screen === 'survival' && isPiMode && SurvivalGame && (
        <SurvivalGame 
          key={gameKey} 
          players={survivalPlayers} 
          onExit={handleExitGame} 
          tableName={gameSettings?.tableName || 'Masa 1'} 
          salonName={gameSettings?.salonName || 'SALON 3CSCORE'} 
        />
      )}
    </>
  );
}

export default App;