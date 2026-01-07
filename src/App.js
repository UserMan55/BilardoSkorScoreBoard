import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { updateTableStatus, verifyIdToken } from './services/firebase';
import { getPlatformInfo, shouldApplySafeArea, shouldReduceMotion } from './utils/platformUtils';
import { requestWakeLock, setupWakeLockVisibilityHandler } from './utils/wakeLock';
import useAirMouseDirection from './hooks/useAirMouseDirection'; // Air Mouse D-pad fix
import useMediaKeyToDirection from './hooks/useMediaKeyToDirection'; // Volume Keys fix



// Build Hedefi Kontrolü (Compile-time)
// Lazy load components
const StartScreen = lazy(() => import('./screens/StartScreen'));
const MobileController = lazy(() => import('./screens/MobileController'));
const ScoreboardReceiver = lazy(() => import('./screens/ScoreboardReceiver'));
const StandardGame = lazy(() => import('./features/game/StandardGame'));
const SurvivalGame = lazy(() => import('./features/game/SurvivalGame'));
const TestTV = lazy(() => import('./screens/TestTV'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uygulama Hatası:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: 'red' }}>
          <h1>Bir hata oluştu!</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AccessDenied({ message, onPasswordSuccess }) {
  const [showPasswordInput, setShowPasswordInput] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const handlePasswordSubmit = () => {
    if (password === '3cscore2025') {
      sessionStorage.setItem('3cscore_auth', 'true');
      if (onPasswordSuccess) onPasswordSuccess();
    } else { setPasswordError('Hatalı şifre!'); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1a1a2e', color: '#fff', textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚫</div>
      <h1 style={{ color: '#e74c3c' }}>Erişim Engellendi</h1>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>{message || 'Lütfen giriş yapın.'}</p>
      {!showPasswordInput ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <a href="https://3cscore.com" style={{ backgroundColor: '#3498db', color: '#fff', padding: '15px 40px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>3cscore.com'a Git</a>
          <button onClick={() => setShowPasswordInput(true)} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer' }}>🔐 Admin Girişi</button>
        </div>
      ) : (
        <div style={{ background: '#16213e', padding: '25px', borderRadius: '12px', border: '1px solid #334155', width: '280px' }}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()} placeholder="Şifre" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#1a1a2e', color: 'white', marginBottom: '10px' }} />
          {passwordError && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '10px' }}>{passwordError}</div>}
          <button onClick={handlePasswordSubmit} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#22c55e', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Giriş Yap</button>
          <button onClick={() => setShowPasswordInput(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', marginTop: '10px' }}>← Geri</button>
        </div>
      )}
    </div>
  );
}

function AuthLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1a1a2e', color: '#fff' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
      <h2>Yükleniyor...</h2>
    </div>
  );
}

function App() {
  // =================================================================
  // RUNTIME BUILD/MODE DETERMINATION (URL BASED)
  // =================================================================
  const urlPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
  const urlSearch = typeof window !== 'undefined' ? window.location.search : '';

  // Memoize urlParams to prevent re-creation on every render
  const urlParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);

  // Extract values once to use in dependency arrays
  const urlMode = urlParams.get('mode');
  const urlToken = urlParams.get('token');
  const urlTable = urlParams.get('table');
  const urlDebug = urlParams.get('debug');

  // /tv veya /scoreboard ise TERMINAL modudur. Değilse MOBİL modudur.
  const isTVUrl = urlPath.includes('/tv') || urlPath.includes('/scoreboard') || urlMode === 'tv';

  const IS_TERMINAL = isTVUrl;
  const IS_MOBILE = !isTVUrl;

  // Air Mouse D-pad fix (Sadece terminal modunda)
  useAirMouseDirection(IS_TERMINAL);
  // Volume/Channel Keys fix (Yön tuşları çalışmazsa alternatif)
  useMediaKeyToDirection(IS_TERMINAL);

  // --- GLOBAL INPUT DEBUG MODE ---


  const [inputDebugMode, setInputDebugMode] = useState(urlDebug === 'input');
  const [debugEvents, setDebugEvents] = useState([]);
  const debugEventsRef = React.useRef([]);

  useEffect(() => {
    if (!inputDebugMode) return;

    const addDebugEvent = (type, details) => {
      const event = {
        type,
        details,
        time: new Date().toLocaleTimeString()
      };
      debugEventsRef.current = [event, ...debugEventsRef.current].slice(0, 15);
      setDebugEvents([...debugEventsRef.current]);
    };

    const handleKeyDown = (e) => {
      addDebugEvent('⌨️ keydown', `key: ${e.key}, code: ${e.code}, keyCode: ${e.keyCode}`);
    };
    const handleKeyUp = (e) => {
      addDebugEvent('⌨️ keyup', `key: ${e.key}, code: ${e.code}`);
    };

    let lastMoveTime = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime > 150) {
        addDebugEvent('🖱️ mousemove', `x:${e.clientX} y:${e.clientY} mvX:${e.movementX} mvY:${e.movementY}`);
        lastMoveTime = now;
      }
    };
    const handlePointerMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime > 150) {
        addDebugEvent('👆 pointermove', `x:${e.clientX} y:${e.clientY} type:${e.pointerType}`);
        lastMoveTime = now;
      }
    };
    const handleWheel = (e) => {
      addDebugEvent('🔄 wheel', `deltaX:${e.deltaX} deltaY:${e.deltaY}`);
    };
    const handleMouseDown = (e) => {
      addDebugEvent('🖱️ mousedown', `button:${e.button} x:${e.clientX} y:${e.clientY}`);
    };
    const handleMouseUp = (e) => {
      addDebugEvent('🖱️ mouseup', `button:${e.button}`);
    };
    const handleGamepad = (e) => {
      addDebugEvent('🎮 gamepad', `id:${e.gamepad?.id}`);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('wheel', handleWheel, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('gamepadconnected', handleGamepad, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('gamepadconnected', handleGamepad, true);
    };
  }, [inputDebugMode]);
  // -------------------------------

  // Hooks
  const [authState, setAuthState] = useState({
    loading: IS_MOBILE, // Sadece mobilde auth yükleniyor
    authenticated: IS_TERMINAL, // Terminalde auth gerekmez
    error: null, user: null
  });

  const getInitialScreen = () => {
    if (urlMode === 'controller') return 'controller';
    if (IS_TERMINAL) {
      return urlMode === 'receiver' ? 'receiver' : 'start';
    }
    // Mobil için varsayılan start
    return 'start';
  };

  const [screen, setScreen] = useState(getInitialScreen());
  const [gameSettings, setGameSettings] = useState(null);
  const [survivalPlayers, setSurvivalPlayers] = useState([]);
  const [gameKey, setGameKey] = useState(Date.now());
  const [controllerTableId, setControllerTableId] = useState(urlTable || 'table_1');

  useEffect(() => {
    if (screen === 'receiver' || screen === 'standard' || screen === 'survival' || screen === 'controller') {
      requestWakeLock();
      setupWakeLockVisibilityHandler();
    }
  }, [screen]);

  // Terminalde başlangıçta masayı IDLE yap
  useEffect(() => {
    if (screen === 'start' && IS_TERMINAL) {
      setTimeout(() => updateTableStatus('table_1', 'IDLE'), 1000);
    }
  }, [screen, IS_TERMINAL]);

  // Auth Effect (Sadece Mobil için)
  useEffect(() => {
    if (IS_TERMINAL) return;

    // Admin yetkisi
    if (sessionStorage.getItem('3cscore_auth') === 'true') {
      setAuthState({ loading: false, authenticated: true, error: null, user: { uid: 'admin', name: 'Admin' } });
      return;
    }

    // Token kontrolü
    if (!urlToken) {
      setAuthState({ loading: false, authenticated: false, error: 'Lütfen giriş yapın.', user: null });
      return;
    }

    verifyIdToken(urlToken).then(res => {
      setAuthState({ loading: false, authenticated: res.valid, error: res.error, user: res.valid ? { uid: res.uid, email: res.email, name: res.name } : null });
    });
  }, [IS_TERMINAL, urlToken]);

  // Early returns
  if (IS_MOBILE && authState.loading) return <AuthLoading />;
  if (IS_MOBILE && !authState.authenticated) return <AccessDenied message={authState.error} onPasswordSuccess={() => setAuthState({ loading: false, authenticated: true, user: { uid: 'admin' } })} />;

  // Handlers
  const handleStartStandard = (p1, p2, tScore, tRack, penalty, aso, isFreeMode = false) => {
    setGameSettings({ player1Name: p1, player2Name: p2, targetScore: tScore, targetRack: tRack, hasPenalty: penalty, hasAso: aso, isFreeMode });
    setScreen('standard');
    updateTableStatus('table_1', 'BUSY', { mode: isFreeMode ? 'free' : '2vs2', players: [p1, p2] });
  };

  const handleStartSurvival = (players) => {
    setSurvivalPlayers(players);
    setGameKey(Date.now());
    setScreen('survival');
    updateTableStatus('table_1', 'BUSY', { mode: 'survival', players });
  };

  const handleExitGame = () => {
    setScreen(IS_TERMINAL && urlMode === 'receiver' ? 'receiver' : 'start');
    updateTableStatus('table_1', 'IDLE');
  };

  const content = (
    <Suspense fallback={<AuthLoading />}>
      {/* Mobil Controller */}
      {screen === 'controller' && IS_MOBILE && <MobileController tableId={controllerTableId} onBack={() => setScreen('start')} loggedInUser={authState.user} />}

      {/* Terminal Receiver */}
      {screen === 'receiver' && IS_TERMINAL && <ScoreboardReceiver onStartGame={(data) => {
        const settings = data.settings || {};
        handleStartStandard(
          data.players?.[0] || 'Oyuncu 1',
          data.players?.[1] || 'Oyuncu 2',
          settings.targetScore ?? 30,
          settings.targetRack ?? 30,
          settings.hasPenalty ?? false,
          settings.hasAso ?? true
        );
      }} tableId="table_1" />}

      {/* Start Screen (Hem Mobil Hem Terminal kullanır ama farklı modlarda) */}
      {screen === 'start' && (
        <StartScreen
          onStart={IS_TERMINAL ? handleStartStandard : undefined}
          onSurvivalStart={IS_TERMINAL ? handleStartSurvival : undefined}
          isMobileOnly={IS_MOBILE}
          onShowController={(tid) => { setControllerTableId(tid); setScreen('controller'); }}
        />
      )}

      {/* Oyun Ekranları (Sadece Terminal) */}
      {screen === 'standard' && IS_TERMINAL && gameSettings && <StandardGame {...gameSettings} onExit={handleExitGame} tableId="table_1" />}
      {screen === 'survival' && IS_TERMINAL && <SurvivalGame key={gameKey} players={survivalPlayers} onExit={handleExitGame} tableId="table_1" />}
    </Suspense>
  );

  // Debug Panel Component
  const debugPanel = inputDebugMode && (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      width: '450px',
      maxHeight: '350px',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '3px solid #00ff00',
      borderRadius: '12px',
      padding: '15px',
      zIndex: 999999,
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff00',
      overflow: 'auto',
      boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '2px solid #00ff00', paddingBottom: '8px', fontSize: '14px' }}>
        🔬 INPUT DEBUG - MiBox Air Mouse Test
      </div>
      <div style={{ marginBottom: '10px', color: '#ffff00', fontSize: '12px' }}>
        Kumandanın yön tuşlarına basın. Hangi event tipi geliyor?<br />
        <span style={{ color: '#00ffff' }}>⌨️ = Klavye</span> | <span style={{ color: '#ff00ff' }}>🖱️👆 = Mouse/Pointer</span>
      </div>
      <div style={{ marginBottom: '8px', color: '#888', fontSize: '10px' }}>
        Screen: {screen} | Terminal: {IS_TERMINAL ? 'Evet' : 'Hayır'}
      </div>
      {debugEvents.length === 0 ? (
        <div style={{ color: '#888', padding: '20px', textAlign: 'center' }}>
          Henüz event yok...<br />Kumandaya basın!
        </div>
      ) : (
        debugEvents.map((evt, idx) => (
          <div key={idx} style={{
            marginBottom: '4px',
            padding: '6px 8px',
            background: idx === 0 ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            borderLeft: idx === 0 ? '3px solid #00ff00' : '3px solid transparent'
          }}>
            <span style={{ color: '#ff9900' }}>[{evt.time}]</span>{' '}
            <span style={{
              color: evt.type.includes('key') ? '#00ffff' : '#ff00ff'
            }}>
              {evt.type}
            </span>: <span style={{ color: '#ccc' }}>{evt.details}</span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      {debugPanel}
      {IS_TERMINAL && (screen === 'standard' || screen === 'survival' || screen === 'receiver') ? (
        <div style={shouldApplySafeArea() ? { padding: '2vw', boxSizing: 'border-box', width: '100vw', height: '100vh', overflow: 'hidden' } : {}} className={shouldReduceMotion() ? 'reduce-motion' : ''}>
          {content}
        </div>
      ) : content}
    </ErrorBoundary>
  );
}

export default App;