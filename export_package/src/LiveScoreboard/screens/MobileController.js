import React, { useState, useEffect } from 'react';
import { listenToTableStatus, sendMatchCommand, getUserProfiles, listenForMatchCommands } from '../services/firebase';
import TimerProgressBar from '../components/TimerProgressBar';
import './MobileController.css';

function MobileController({ onBack, tableId = 'table_1' }) {
  const [matchData, setMatchData] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [playerPhotos, setPlayerPhotos] = useState({});
  const [countdown, setCountdown] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [matchStarting, setMatchStarting] = useState(false); // START komutu geldiğinde true
  const [startingMatchData, setStartingMatchData] = useState(null); // START komutuyla gelen maç verisi

  // Navigasyon komutları için (ok tuşları gibi) - throttle yok, anında tepki
  const handleNavCommand = (action) => {
    if (navigator.vibrate) navigator.vibrate(15);
    sendMatchCommand('NAV', { action }, tableId);
  };

  // Masa durumunu dinle (Canlı Skor için)
  useEffect(() => {
    const unsubscribe = listenToTableStatus(tableId, (data) => {
      setIsLoading(false); // İlk veri geldi
      if (data && data.status === 'BUSY' && data.currentMatch) {
        setMatchData(data.currentMatch);
        
        // matchData geldiğinde matchStarting durumunu sıfırla (geri sayım ekranını kapat)
        setMatchStarting(false);
        setStartingMatchData(null);
        
        // Stats varsa güncelle
        if (data.currentMatch.stats) {
          setLiveStats(data.currentMatch.stats);
          setCountdown(null);
          // Update timer status
          if (data.currentMatch.stats.timerRunning !== undefined) {
            setTimerRunning(data.currentMatch.stats.timerRunning);
          }
        }
        
        setMatchEnded(false);
      } else if (data && data.status === 'IDLE') {
        // Masa boşa düştüyse maç bitmiştir veya iptal edilmiştir
        setMatchEnded(true);
        setMatchStarting(false); // Maç başlatma durumunu sıfırla
        setStartingMatchData(null);
      }
    });

    return () => unsubscribe();
  }, [tableId]);

  // START komutunu dinle (live_matches collection) - Maç başlıyor ekranı için
  useEffect(() => {
    let lastTimestamp = 0;
    const mountTime = Date.now() / 1000; // Component mount zamanı
    let countdownIntervalRef = null;
    
    const unsubscribe = listenForMatchCommands((data) => {
      if (data && data.status === 'START') {
        const currentTimestamp = data.timestamp?.seconds || 0;
        
        // Eğer bu komut component mount'undan önce (5 saniyeden fazla) geldiyse atla
        const isStaleData = (mountTime - currentTimestamp) > 5;
        
        if (isStaleData) {
          console.log("📱 MobileController: Eski START komutu atlandı", currentTimestamp);
          lastTimestamp = currentTimestamp;
          return;
        }
        
        // Sadece yeni gelen komutları işle
        if (currentTimestamp > lastTimestamp) {
          lastTimestamp = currentTimestamp;
          console.log("📱 MobileController: START komutu alındı", data);
          
          setMatchStarting(true);
          setStartingMatchData(data);
          setIsLoading(false);
          
          // Fotoğrafları doğrudan START komutundan al (varsa)
          if (data.playerPhotos) {
            console.log("📷 Fotoğraflar START komutundan alındı:", data.playerPhotos);
            setPlayerPhotos(data.playerPhotos);
          }
          
          // Önceki geri sayımı temizle
          if (countdownIntervalRef) {
            clearInterval(countdownIntervalRef);
          }
          
          // Geri sayım başlat
          setCountdown(3);
          let count = 3;
          countdownIntervalRef = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(countdownIntervalRef);
              countdownIntervalRef = null;
              setCountdown(null);
              // Geri sayım bitti, matchData gelene kadar bekle
              // matchData geldiğinde listenToTableStatus otomatik olarak matchStarting'i false yapacak
            }
          }, 1000);
        }
      }
    }, tableId);

    return () => {
      unsubscribe();
      if (countdownIntervalRef) {
        clearInterval(countdownIntervalRef);
      }
    };
  }, [tableId]);

  // Fetch player photos from Firebase
  useEffect(() => {
    // startingMatchData veya matchData'dan oyuncu isimlerini al
    const players = startingMatchData?.players || matchData?.players;
    if (players) {
      const fetchPlayerPhotos = async () => {
        try {
          const allUsers = await getUserProfiles();
          const photos = {};
          
          players.forEach(playerName => {
            const user = allUsers.find(u => 
              u.fullName.toLowerCase() === playerName.toLowerCase()
            );
            if (user && user.photoURL) {
              photos[playerName] = user.photoURL;
            }
          });
          
          setPlayerPhotos(photos);
        } catch (error) {
          console.error('Error fetching player photos:', error);
        }
      };
      
      fetchPlayerPhotos();
    }
  }, [matchData, startingMatchData]);

  const handleBackToHome = () => {
    setMatchData(null);
    setLiveStats(null);
    setMatchEnded(false);
    setMatchStarting(false);
    setStartingMatchData(null);
    if (onBack) onBack();
  };

  const handleCommand = (command) => {
    // Titreşim geri bildirimi (mobil cihazlar için)
    if (navigator.vibrate) {
      navigator.vibrate(20); // Kısa titreşim
    }
    
    // Optimistic UI update for timer
    if (command === 'TOGGLE_TIMER') {
      setTimerRunning(prev => !prev);
    }
    
    // Fire-and-forget: await kaldırıldı, buton anında tepki veriyor
    sendMatchCommand(command, {}, tableId);
  };

  // Loading durumu - Firebase'den ilk veri bekleniyor
  if (isLoading) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <h2>Bağlanıyor...</h2>
          <p>Masa durumu kontrol ediliyor</p>
        </div>
      </div>
    );
  }

  // START komutu geldi - Maç başlıyor ekranı (matchData henüz yok ama startingMatchData var)
  if (matchStarting && startingMatchData && !matchData) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="match-starting-screen">
          <div className="starting-title">CANLI MAÇ BAŞLIYOR...</div>
          
          <div className="starting-players">
            <div className="starting-player">
              <div className="starting-player-photo">
                {playerPhotos[startingMatchData.players[0]] ? (
                  <img src={playerPhotos[startingMatchData.players[0]]} alt={startingMatchData.players[0]} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
              <div className="starting-player-name">{startingMatchData.players[0]}</div>
            </div>
            
            <div className="starting-vs">VS</div>
            
            <div className="starting-player">
              <div className="starting-player-photo">
                {playerPhotos[startingMatchData.players[1]] ? (
                  <img src={playerPhotos[startingMatchData.players[1]]} alt={startingMatchData.players[1]} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
              <div className="starting-player-name">{startingMatchData.players[1]}</div>
            </div>
          </div>
          
          <div className="starting-details">
            <div className="starting-detail-item">
              <span className="detail-label">Hedef Sayı:</span>
              <span className="detail-value">{startingMatchData.settings?.targetScore || 30}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Hedef İstaka:</span>
              <span className="detail-value">{startingMatchData.settings?.targetRack || 30}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Penaltı:</span>
              <span className="detail-value" style={{ color: startingMatchData.settings?.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                {startingMatchData.settings?.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">ASO:</span>
              <span className="detail-value" style={{ color: startingMatchData.settings?.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                {startingMatchData.settings?.hasAso ? 'VAR' : 'YOK'}
              </span>
            </div>
          </div>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="starting-countdown">
              {countdown}
            </div>
          )}
        </div>
      </div>
    );
  }

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

  // Match starting preview (when matchData exists but liveStats not yet available or countdown active)
  if (matchData && (!liveStats || countdown !== null)) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="match-starting-screen">
          <div className="starting-title">CANLI MAÇ BAŞLIYOR...</div>
          
          <div className="starting-players">
            <div className="starting-player">
              <div className="starting-player-photo">
                {playerPhotos[matchData.players[0]] ? (
                  <img src={playerPhotos[matchData.players[0]]} alt={matchData.players[0]} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
              <div className="starting-player-name">{matchData.players[0]}</div>
            </div>
            
            <div className="starting-vs">VS</div>
            
            <div className="starting-player">
              <div className="starting-player-photo">
                {playerPhotos[matchData.players[1]] ? (
                  <img src={playerPhotos[matchData.players[1]]} alt={matchData.players[1]} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </div>
              <div className="starting-player-name">{matchData.players[1]}</div>
            </div>
          </div>
          
          <div className="starting-details">
            <div className="starting-detail-item">
              <span className="detail-label">Hedef Sayı:</span>
              <span className="detail-value">{matchData.settings.targetScore}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Hedef İstaka:</span>
              <span className="detail-value">{matchData.settings.targetRack}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Penaltı:</span>
              <span className="detail-value" style={{ color: matchData.settings.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                {matchData.settings.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">ASO:</span>
              <span className="detail-value" style={{ color: matchData.settings.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                {matchData.settings.hasAso ? 'VAR' : 'YOK'}
              </span>
            </div>
          </div>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="starting-countdown">
              {countdown}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Maç Sonucu Kaydetme Onayı (showSaveConfirm aktifken)
  if (liveStats?.showSaveConfirm) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="save-confirm-screen">
          <div className="save-icon">💾</div>
          <h2>Maç Sonucu Kaydedilsin mi?</h2>
          <p className="save-description">Maç verilerini veritabanına kaydetmek istiyor musunuz?</p>
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
          <div className="save-buttons">
            <button 
              className="save-btn cancel" 
              onClick={() => handleCommand('SAVE_CANCEL')}
            >
              Hayır, Kaydetme
            </button>
            <button 
              className="save-btn confirm" 
              onClick={() => handleCommand('SAVE_CONFIRM')}
            >
              Evet, Kaydet
            </button>
          </div>
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
      {/* Header */}
      <div className="live-match-header">
        <div className="live-indicator-small">
          <span className="live-dot"></span>
          CANLI MAÇ
        </div>
      </div>

      {/* Match Stats */}
      <div className="match-stats-panel">
            <div className="stats-row player-row">
              <div className={`player-card ${liveStats?.currentTurn === 0 ? 'active' : ''}`}>
                <div className="player-name">{matchData.players[0]}</div>
                {/* Profile Picture */}
                <div className="player-profile-pic">
                  {playerPhotos[matchData.players[0]] ? (
                    <img src={playerPhotos[matchData.players[0]]} alt={matchData.players[0]} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div className="player-score">{liveStats?.score1 || 0}</div>
                <div className="player-stats">
                  <span>HR1: {liveStats?.hr1 || 0}</span>
                  <span>HR2: {liveStats?.hr2 || 0}</span>
                </div>
                {/* Timeout hakları */}
                <div className="timeout-rights">
                  {[...Array(liveStats?.player1TimeoutLeft || 0)].map((_, i) => (
                    <div key={i} className="timeout-box"></div>
                  ))}
                </div>
              </div>
              
              <div className="center-info">
                <div className="inning-label">INNING</div>
                <div className="inning-value">{liveStats?.inning || 1}</div>
                <div className="vs-separator">VS</div>
              </div>
              
              <div className={`player-card ${liveStats?.currentTurn === 1 ? 'active' : ''}`}>
                <div className="player-name">{matchData.players[1]}</div>
                {/* Profile Picture */}
                <div className="player-profile-pic">
                  {playerPhotos[matchData.players[1]] ? (
                    <img src={playerPhotos[matchData.players[1]]} alt={matchData.players[1]} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div className="player-score">{liveStats?.score2 || 0}</div>
                <div className="player-stats">
                  <span>HR1: {liveStats?.hr1_2 || 0}</span>
                  <span>HR2: {liveStats?.hr2_2 || 0}</span>
                </div>
                {/* Timeout hakları */}
                <div className="timeout-rights">
                  {[...Array(liveStats?.player2TimeoutLeft || 0)].map((_, i) => (
                    <div key={i} className="timeout-box"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Timer Progress Bar */}
            <div className="mobile-timer-container">
              <TimerProgressBar 
                isTimerRunning={liveStats?.isTimerRunning || false}
                currentTurn={liveStats?.currentTurn || 0}
                timerPhase={liveStats?.timerPhase || 'idle'}
                resetTrigger={liveStats?.timerResetTrigger || 0}
                isTimerPaused={liveStats?.isTimerPaused || false}
                activeColor={liveStats?.currentTurn === 0 ? '#FFFFFF' : '#FFD700'}
                duration={40}
                height={22}
              />
            </div>
          </div>

          {/* Notification Overlay */}
          {liveStats?.notification && (
            <div className={`mobile-notification mobile-notification-${liveStats.notification.type}`}>
              <div className="notification-content">
                {liveStats.notification.message}
              </div>
            </div>
          )}

          {/* Warning Message */}
          {liveStats?.warningMessage && (
            <div className="mobile-warning">
              {liveStats.warningMessage}
            </div>
          )}

          {/* Menu Overlay */}
          {liveStats?.showMenuOverlay && (
            <div className="mobile-menu-overlay">
              <div className="mobile-menu-content">
                <h2>⚠️ MAÇTAN ÇIKMAK İSTER MİSİNİZ?</h2>
                <p>Maç sonuçları kaydedilmeyecektir.</p>
                <div className="mobile-menu-buttons">
                  <button 
                    className="mobile-menu-btn cancel"
                    onClick={() => handleCommand('MENU_CANCEL')}
                  >
                    VAZGEÇ
                  </button>
                  <button 
                    className="mobile-menu-btn confirm"
                    onClick={() => handleCommand('MENU_CONFIRM')}
                  >
                    MAÇTAN ÇIK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modern Remote Control */}
          <div className="remote-control">
            {/* Power Button - Top Left */}
            <button 
              className="power-btn-exit"
              onClick={() => handleCommand('EXIT')}
              title="Maçtan Çık"
            >
              ✕
            </button>

            {/* RUN Display */}
            <div className="run-display">
              <div className="run-label">RUN</div>
              <div className={`run-value ${liveStats?.currentTurn === 0 ? 'player1' : 'player2'}`}>
                {liveStats?.run || 0}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="control-buttons">
              <button 
                className="control-btn control-left"
                onClick={() => handleCommand('MINUS')}
                title="Run -1"
              >
                ◀
              </button>
              <button 
                className="control-btn control-center"
                onClick={() => handleCommand('OK')}
                title="Sayıyı Ekle / Sıra Geç"
              >
                OK
              </button>
              <button 
                className="control-btn control-right"
                onClick={() => handleCommand('PLUS')}
                title="Run +1"
              >
                ▶
              </button>
            </div>

            {/* Media Control Buttons */}
            <div className="media-controls">
              <button 
                className="media-btn" 
                onClick={() => handleCommand('UNDO')}
                title="Geri Al (Undo)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button 
                className="media-btn media-btn-timer" 
                onClick={() => handleCommand('TOGGLE_TIMER')}
                title="Timer Başlat/Durdur"
              >
                {timerRunning ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
    </div>
  );
}

export default MobileController;
