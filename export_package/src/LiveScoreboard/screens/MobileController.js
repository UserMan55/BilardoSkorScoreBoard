import React, { useState, useEffect } from 'react';
import { listenToTableStatus, sendMatchCommand } from '../services/firebase';
import './MobileController.css';

function MobileController({ onBack, tableId = 'table_1' }) {
  const [matchData, setMatchData] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [mode, setMode] = useState('GAME'); // 'GAME' | 'NAV'
  const lastCommandTimeRef = React.useRef(0);

  const handleNavCommand = async (action) => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 100) return; // 100ms throttle
    lastCommandTimeRef.current = now;

    if (navigator.vibrate) navigator.vibrate(30);
    
    // Optimistic UI update isn't possible for remote state, but we can ensure the button feels responsive
    // The button CSS :active state handles the visual feedback locally.
    
    await sendMatchCommand('NAV', { action }, tableId);
  };

  // Masa durumunu dinle (Canlı Skor için)
  useEffect(() => {
    const unsubscribe = listenToTableStatus(tableId, (data) => {
      if (data && data.status === 'BUSY' && data.currentMatch) {
        setMatchData(data.currentMatch);
        setLiveStats(data.currentMatch.stats);
        setMatchEnded(false);
      } else if (data && data.status === 'IDLE') {
        // Masa boşa düştüyse maç bitmiştir veya iptal edilmiştir
        setMatchEnded(true);
      }
    });

    return () => unsubscribe();
  }, [tableId]);

  const handleBackToHome = () => {
    setMatchData(null);
    setLiveStats(null);
    setMatchEnded(false);
    if (onBack) onBack();
  };

  const handleCommand = async (command) => {
    // Titreşim geri bildirimi (mobil cihazlar için)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    await sendMatchCommand(command, {}, tableId);
  };

  if (!matchData) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="waiting-screen">
          <div className="waiting-icon">🎮</div>
          <h2>Uzaktan Kumanda</h2>
          <p>Menüde gezinmek için kullanın</p>
          
          <div className="nav-pad-container">
            <div className="d-pad-grid">
               <button className="d-btn up" onClick={() => handleNavCommand('UP')}>▲</button>
               <button className="d-btn left" onClick={() => handleNavCommand('LEFT')}>◀</button>
               <button className="d-btn enter" onClick={() => handleNavCommand('ENTER')}>OK</button>
               <button className="d-btn right" onClick={() => handleNavCommand('RIGHT')}>▶</button>
               <button className="d-btn down" onClick={() => handleNavCommand('DOWN')}>▼</button>
            </div>
            <div className="action-buttons">
               <button className="act-btn back" onClick={() => handleNavCommand('BACK')}>Geri</button>
               <button className="act-btn menu" onClick={() => handleNavCommand('MENU')}>Menü</button>
            </div>
          </div>

          <button 
            className="back-home-btn" 
            onClick={handleBackToHome}
            style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)' }}
          >
            Çıkış
          </button>
        </div>
      </div>
    );
  }

  if (matchEnded) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="match-end-screen">
          <div className="end-icon">🏆</div>
          <h2>MAÇ BİTTİ</h2>
          <div className="final-score">
            <div className="final-player">
              <div className="player-name">{matchData.players[0]}</div>
              <div className="player-score">{liveStats?.score1 || 0}</div>
            </div>
            <div className="vs-text">-</div>
            <div className="final-player">
              <div className="player-name">{matchData.players[1]}</div>
              <div className="player-score">{liveStats?.score2 || 0}</div>
            </div>
          </div>
          <button className="back-home-btn" onClick={handleBackToHome}>
            Ana Ekrana Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-controller-wrapper">
      {/* Mode Switcher */}
      <div className="mode-switcher" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <button 
          className={`mode-btn ${mode === 'GAME' ? 'active' : ''}`}
          onClick={() => setMode('GAME')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            background: mode === 'GAME' ? '#4CAF50' : 'rgba(255,255,255,0.1)', 
            border: 'none', 
            borderRadius: '10px', 
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          MAÇ KONTROL
        </button>
        <button 
          className={`mode-btn ${mode === 'NAV' ? 'active' : ''}`}
          onClick={() => setMode('NAV')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            background: mode === 'NAV' ? '#2196F3' : 'rgba(255,255,255,0.1)', 
            border: 'none', 
            borderRadius: '10px', 
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          MENÜ / NAV
        </button>
      </div>

      {mode === 'GAME' ? (
        <>
          {/* Header */}
          <div className="live-match-header">
            <button 
              onClick={handleBackToHome}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 10px'
              }}
            >
              ⬅️
            </button>
            <div className="live-indicator">
              <span className="live-dot"></span>
              CANLI MAÇ
            </div>
            <div style={{ width: '40px' }}></div> {/* Spacer for centering */}
          </div>

          {/* Match Stats */}
          <div className="match-stats-panel">
            <div className="stats-row player-row">
              <div className={`player-card ${liveStats?.currentTurn === 0 ? 'active' : ''}`}>
                <div className="player-name">{matchData.players[0]}</div>
                <div className="player-score">{liveStats?.score1 || 0}</div>
                <div className="player-stats">
                  <span>HR1: {liveStats?.hr1 || 0}</span>
                  <span>HR2: {liveStats?.hr2 || 0}</span>
                </div>
              </div>
              
              <div className="vs-separator">VS</div>
              
              <div className={`player-card ${liveStats?.currentTurn === 1 ? 'active' : ''}`}>
                <div className="player-name">{matchData.players[1]}</div>
                <div className="player-score">{liveStats?.score2 || 0}</div>
                <div className="player-stats">
                  <span>HR1: {liveStats?.hr1_2 || 0}</span>
                  <span>HR2: {liveStats?.hr2_2 || 0}</span>
                </div>
              </div>
            </div>

            <div className="stats-row info-row">
              <div className="info-item">
                <span className="info-label">İstaka</span>
                <span className="info-value">{liveStats?.inning || 0} / {matchData.settings.targetRack}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Run</span>
                <span className="info-value">{liveStats?.run || 0}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Hedef</span>
                <span className="info-value">{matchData.settings.targetScore}</span>
              </div>
            </div>

            <div className="turn-indicator">
              Sıra: <strong>{matchData.players[liveStats?.currentTurn || 0]}</strong>
            </div>
          </div>

          {/* Game Controller */}
          <div className="mobile-game-controller" style={{ position: 'static', transform: 'none', width: '100%', padding: 0 }}>
            <div className="controller-panel" style={{ width: '100%', maxWidth: 'none' }}>
              <div className="controller-header">
                <h3>Oyun Kumandası</h3>
                <div className="controller-status">
                  {matchData.players[liveStats?.currentTurn || 0]} oynuyor
                </div>
              </div>
              
              <div className="controller-grid">
                <button 
                  className="ctrl-btn minus" 
                  onClick={() => handleCommand('MINUS')}
                >
                  −1
                </button>
                
                <button 
                  className="ctrl-btn plus" 
                  onClick={() => handleCommand('PLUS')}
                >
                  +1
                </button>
                
                <button 
                  className="ctrl-btn ok" 
                  onClick={() => handleCommand('OK')}
                >
                  OK (Sıra Geç)
                </button>
                
                <button 
                  className="ctrl-btn undo" 
                  onClick={() => handleCommand('UNDO')}
                >
                  ↩️ Geri Al
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="nav-pad-container" style={{ marginTop: '20px' }}>
            <div className="d-pad-grid">
               <button className="d-btn up" onClick={() => handleNavCommand('UP')}>▲</button>
               <button className="d-btn left" onClick={() => handleNavCommand('LEFT')}>◀</button>
               <button className="d-btn enter" onClick={() => handleNavCommand('ENTER')}>OK</button>
               <button className="d-btn right" onClick={() => handleNavCommand('RIGHT')}>▶</button>
               <button className="d-btn down" onClick={() => handleNavCommand('DOWN')}>▼</button>
            </div>
            <div className="action-buttons">
               <button className="act-btn back" onClick={() => handleNavCommand('BACK')}>Geri</button>
               <button className="act-btn menu" onClick={() => handleNavCommand('MENU')}>Menü</button>
            </div>
        </div>
      )}
    </div>
  );
}

export default MobileController;
