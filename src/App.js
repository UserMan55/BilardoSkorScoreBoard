import React, { useState, useEffect, Suspense, lazy } from 'react';
import { updateTableStatus, verifyIdToken } from './services/firebase';
import { getPlatformInfo, shouldApplySafeArea, shouldReduceMotion } from './utils/platformUtils';
import { requestWakeLock, setupWakeLockVisibilityHandler } from './utils/wakeLock';

// Build Hedefi Kontrolü (Compile-time)
const BUILD_TARGET = process.env.REACT_APP_BUILD_TARGET;
const IS_MOBILE_BUILD = BUILD_TARGET === 'mobile';
const IS_TERMINAL_BUILD = BUILD_TARGET === 'pi' || BUILD_TARGET === 'terminal';

// DEBUG: Build bilgilerini logla
console.log('🔧 BUILD_TARGET:', BUILD_TARGET);
console.log('🔧 IS_MOBILE_BUILD:', IS_MOBILE_BUILD);
console.log('🔧 IS_TERMINAL_BUILD:', IS_TERMINAL_BUILD);

// Lazy load components
const StartScreen = lazy(() => import('./screens/StartScreen'));
const MobileController = lazy(() => import('./screens/MobileController'));
const ScoreboardReceiver = lazy(() => import('./screens/ScoreboardReceiver'));
const SimpleGame = lazy(() => import('./features/game/SimpleGame'));
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

function BuildMismatchError({ target }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff', textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚠️</div>
      <h1 style={{ color: '#f87171' }}>Yanlış Uygulama Sürümü</h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px' }}>
        Bu adres ({window.location.pathname}) <b>{target === 'mobile' ? 'Mobil Uygulama' : 'Terminal/Tabela'}</b> sürümüne aittir.
        Lütfen doğru adresi kullandığınızdan emin olun.
      </p>
      <div style={{ marginTop: '30px', color: '#64748b' }}>
        Build Target: <span style={{ color: '#3b82f6' }}>{BUILD_TARGET || 'default'}</span>
      </div>
    </div>
  );
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
  const urlPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isTVUrl = urlPath.includes('/tv') || urlPath.includes('/scoreboard') || urlParams.get('mode') === 'tv';

  // Hooks
  const [authState, setAuthState] = useState({
    loading: !IS_TERMINAL_BUILD,
    authenticated: IS_TERMINAL_BUILD,
    error: null, user: null
  });

  const getInitialScreen = () => {
    if (urlParams.get('mode') === 'controller') return 'controller';
    if (IS_TERMINAL_BUILD) {
      return urlParams.get('mode') === 'receiver' ? 'receiver' : 'start';
    }
    return 'start';
  };

  const [screen, setScreen] = useState(getInitialScreen());
  const [gameSettings, setGameSettings] = useState(null);
  const [survivalPlayers, setSurvivalPlayers] = useState([]);
  const [gameKey, setGameKey] = useState(Date.now());
  const [controllerTableId, setControllerTableId] = useState(urlParams.get('table') || 'table_1');

  useEffect(() => {
    if (screen === 'receiver' || screen === 'standard' || screen === 'survival' || screen === 'controller') {
      requestWakeLock();
      setupWakeLockVisibilityHandler();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'start' && IS_TERMINAL_BUILD) {
      setTimeout(() => updateTableStatus('table_1', 'IDLE'), 1000);
    }
  }, [screen, IS_TERMINAL_BUILD]);

  useEffect(() => {
    if (IS_TERMINAL_BUILD) return;
    if (sessionStorage.getItem('3cscore_auth') === 'true') {
      setAuthState({ loading: false, authenticated: true, error: null, user: { uid: 'admin', name: 'Admin' } });
      return;
    }
    const token = urlParams.get('token');
    if (!token) {
      setAuthState({ loading: false, authenticated: false, error: 'Lütfen giriş yapın.', user: null });
      return;
    }
    verifyIdToken(token).then(res => {
      setAuthState({ loading: false, authenticated: res.valid, error: res.error, user: res.valid ? { uid: res.uid, email: res.email, name: res.name } : null });
    });
  }, [IS_TERMINAL_BUILD, urlParams]);

  // Early returns AFTER hooks
  if (IS_MOBILE_BUILD && isTVUrl) return <BuildMismatchError target="mobile" />;
  if (!IS_TERMINAL_BUILD && authState.loading) return <AuthLoading />;
  if (!IS_TERMINAL_BUILD && !authState.authenticated) return <AccessDenied message={authState.error} onPasswordSuccess={() => setAuthState({ loading: false, authenticated: true, user: { uid: 'admin' } })} />;

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
    setScreen(IS_TERMINAL_BUILD && urlParams.get('mode') === 'receiver' ? 'receiver' : 'start');
    updateTableStatus('table_1', 'IDLE');
  };

  const content = (
    <Suspense fallback={<AuthLoading />}>
      {screen === 'controller' && IS_MOBILE_BUILD && <MobileController tableId={controllerTableId} onBack={() => setScreen('start')} loggedInUser={authState.user} />}
      {screen === 'receiver' && IS_TERMINAL_BUILD && <ScoreboardReceiver onStartGame={(data) => handleStartStandard(data.players[0], data.players[1], data.settings.targetScore, data.settings.targetRack, data.settings.hasPenalty, data.settings.hasAso)} tableId="table_1" />}
      {screen === 'start' && <StartScreen onStart={IS_TERMINAL_BUILD ? handleStartStandard : undefined} onSurvivalStart={IS_TERMINAL_BUILD ? handleStartSurvival : undefined} isMobileOnly={IS_MOBILE_BUILD} onShowController={(tid) => { setControllerTableId(tid); setScreen('controller'); }} />}
      {screen === 'standard' && IS_TERMINAL_BUILD && <SimpleGame {...gameSettings} onExit={handleExitGame} tableId="table_1" />}
      {screen === 'survival' && IS_TERMINAL_BUILD && <SurvivalGame key={gameKey} players={survivalPlayers} onExit={handleExitGame} tableId="table_1" />}
    </Suspense>
  );

  return (
    <ErrorBoundary>
      {IS_TERMINAL_BUILD && (screen === 'standard' || screen === 'survival' || screen === 'receiver') ? (
        <div style={shouldApplySafeArea() ? { padding: '2vw', boxSizing: 'border-box', width: '100vw', height: '100vh', overflow: 'hidden' } : {}} className={shouldReduceMotion() ? 'reduce-motion' : ''}>
          {content}
        </div>
      ) : content}
    </ErrorBoundary>
  );
}

export default App;