import React, { useState, useEffect, useMemo } from 'react';
import { listenToTableStatus, sendMatchCommand, getUserProfiles, listenForMatchCommands, registerViewer, unregisterViewer, updateViewerHeartbeat, listenToViewerCount } from '../services/firebase';
import TimerProgressBar from '../components/TimerProgressBar';
import './MobileController.css';

const FALLBACK_AVATAR = '/logo.png';

// loggedInUser: { id, fullName, city, ... } - 3CSCORE'dan gelen kullanıcı bilgisi
function MobileController({ onBack, tableId = 'table_1', readOnly = false, loggedInUser = null }) {
  const [matchData, setMatchData] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [playerPhotos, setPlayerPhotos] = useState({});
  const [countdown, setCountdown] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [matchStarting, setMatchStarting] = useState(false); // START komutu geldiğinde true
  const [startingMatchData, setStartingMatchData] = useState(null); // START komutuyla gelen maç verisi
  const [allowedControllers, setAllowedControllers] = useState([]); // Kontrol yetkisi olan kullanıcılar
  const [showExitConfirm, setShowExitConfirm] = useState(false); // Maçtan çıkış onay dialogu
  const [showSwapConfirm, setShowSwapConfirm] = useState(false); // Oyuncu yer değiştirme dialogu
  const [pendingSwapData, setPendingSwapData] = useState(null); // Yer değiştirme bekleyen maç verisi

  // Erişim kontrolü: Kullanıcı kontrol yetkisine sahip mi?
  const canControl = useMemo(() => {
    // Eğer readOnly prop'u true ise, kesinlikle kontrol yok (Canlı İzleme modu)
    if (readOnly) return false;

    // Eğer readOnly=false ise (maçı başlatan kişi), direkt kontrol ver
    // Bu, StartScreen'den MobileController'a geçişte her zaman kontrol sağlar
    if (loggedInUser) {
      console.log('🔐 canControl: loggedInUser var, kontrol izni veriliyor', loggedInUser.id || loggedInUser.uid);
      return true;
    }

    // Kullanıcı giriş yapmamışsa (anonim), allowedControllers listesine bak
    // Bu durumda kontrol yok (anonim kullanıcılar sadece izleyebilir)
    if (!loggedInUser?.uid && !loggedInUser?.id) {
      console.log('🔐 canControl: loggedInUser yok, izleme modu');
      return false;
    }

    return true;
  }, [readOnly, loggedInUser]);

  const isReadOnly = !canControl;

  // Navigasyon komutları için (ok tuşları gibi) - throttle yok, anında tepki
  const handleNavCommand = (action) => {
    if (isReadOnly) return;
    if (navigator.vibrate) navigator.vibrate(15);
    sendMatchCommand('NAV', { action }, tableId);
  };

  // Masa durumunu dinle (Canlı Skor için)
  useEffect(() => {
    console.log('📱 MobileController: Masa dinleniyor - tableId:', tableId);
    const unsubscribe = listenToTableStatus(tableId, (data) => {
      console.log('📱 MobileController: table_status verisi geldi -', tableId, '- status:', data?.status, '- currentMatch:', !!data?.currentMatch);
      setIsLoading(false); // İlk veri geldi
      if (data && data.status === 'BUSY' && data.currentMatch) {
        console.log('📱 MobileController: BUSY durumu alındı, matchData set ediliyor');
        setMatchData(data.currentMatch);

        // Multi-user erişim kontrolü bilgilerini al
        if (data.allowedControllers) {
          setAllowedControllers(data.allowedControllers);
        }

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
        setAllowedControllers([]); // Erişim listesini sıfırla
      }
    });

    return () => unsubscribe();
  }, [tableId]);

  // Survival maçı bittiğinde veya masa IDLE olduğunda otomatik ana ekrana dön
  useEffect(() => {
    const isSurvivalMode = liveStats?.mode === 'survival' || matchData?.mode === 'survival';

    // Survival modunda maç bittiyse veya masa IDLE olduysa
    if (isSurvivalMode && (liveStats?.gameEnded || matchEnded)) {
      // Kısa bir gecikme ile ana ekrana dön (kullanıcının sonucu görmesi için)
      const timer = setTimeout(() => {
        handleBackToHome();
      }, 3000); // 3 saniye bekle, sonra otomatik dön

      return () => clearTimeout(timer);
    }
  }, [liveStats?.gameEnded, liveStats?.mode, matchData?.mode, matchEnded]);

  // Viewer tracking - İzleyici olarak kaydol ve heartbeat gönder
  useEffect(() => {
    // Sadece maç varsa veya maç başlıyorsa izleyici olarak kaydol
    if (!matchData && !matchStarting) return;

    // İzleyici olarak kaydol
    registerViewer(tableId);

    // Heartbeat interval - her 30 saniyede bir
    const heartbeatInterval = setInterval(() => {
      updateViewerHeartbeat(tableId);
    }, 30000);

    // İzleyici sayısını dinle
    const unsubscribeViewerCount = listenToViewerCount(tableId, (count) => {
      setViewerCount(count);
    });

    // Cleanup - component unmount olduğunda izleyici kaydını sil
    return () => {
      clearInterval(heartbeatInterval);
      unsubscribeViewerCount();
      unregisterViewer(tableId);
    };
  }, [tableId, matchData, matchStarting]);

  // START komutunu dinle (live_matches collection) - Maç başlıyor ekranı için
  useEffect(() => {
    let lastTimestamp = 0;
    const mountTime = Date.now() / 1000; // Component mount zamanı
    let countdownIntervalRef = null;
    let fallbackTimeoutRef = null;

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

          // Önceki timeout'ları temizle
          if (countdownIntervalRef) {
            clearInterval(countdownIntervalRef);
          }
          if (fallbackTimeoutRef) {
            clearTimeout(fallbackTimeoutRef);
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

              // Geri sayım bitti - 10 saniye içinde matchData gelmezse bekleme ekranına dön
              // Bu, skorboard açık değilse veya bağlantı sorunlarında takılmayı önler
              fallbackTimeoutRef = setTimeout(() => {
                console.log("⚠️ matchData 10 sn içinde gelmedi, bekleme ekranına dönülüyor");
                setMatchStarting(false);
                setStartingMatchData(null);
              }, 10000);
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
      if (fallbackTimeoutRef) {
        clearTimeout(fallbackTimeoutRef);
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
    setShowExitConfirm(false);
    if (onBack) onBack();
  };

  // X butonuna tıklandığında onay dialogu göster
  const handleExitRequest = () => {
    setShowExitConfirm(true);
  };

  // Maçtan çıkış onaylandığında
  const handleConfirmExit = () => {
    // Maçı sonlandır komutu GÖNDERME - Sadece ekrandan çık
    // sendMatchCommand('END_MATCH', { reason: 'user_exit' }, tableId);
    handleBackToHome();
  };

  // Çıkış iptal edildiğinde
  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  // Optimistic Run State
  const [optimisticRun, setOptimisticRun] = useState(null);

  // Sync optimistic run with live data
  useEffect(() => {
    if (liveStats?.run !== undefined && optimisticRun !== null) {
      if (liveStats.run === optimisticRun) {
        setOptimisticRun(null); // Veri doğrulandı, optimistic state'i temizle
      }
    }
  }, [liveStats]);

  const handleCommand = (command) => {
    if (isReadOnly) return;

    // Titreşim
    if (navigator.vibrate) navigator.vibrate(20);

    // Optimistic Updates
    if (command === 'TOGGLE_TIMER') {
      setTimerRunning(prev => !prev);
    }
    else if (command === 'PLUS') {
      const currentRun = optimisticRun !== null ? optimisticRun : (liveStats?.run || 0);
      setOptimisticRun(currentRun + 1);
    }
    else if (command === 'MINUS') {
      const currentRun = optimisticRun !== null ? optimisticRun : (liveStats?.run || 0);
      setOptimisticRun(Math.max(0, currentRun - 1));
    }
    else if (command === 'OK') {
      setOptimisticRun(0); // Sıra geçti, optimistic olarak 0 göster (null yaparsak eski değeri gösterir)
    }

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

  // START komutu geldi VEYA Swap Phase (Lagging seçimi) aktif
  const isSwapPhase = liveStats?.showSwapConfirm;

  if ((matchStarting && startingMatchData && !matchData) || isSwapPhase) {
    // Verileri isSwapPhase durumuna göre seç
    const displayData = isSwapPhase ? matchData : startingMatchData;
    const p1Name = displayData?.players?.[0] || 'Oyuncu 1';
    const p2Name = displayData?.players?.[1] || 'Oyuncu 2';
    const settings = displayData?.settings || {};

    return (
      <div className="mobile-controller-wrapper">
        <div className="match-starting-screen">
          <div className="starting-title">{isSwapPhase ? 'OYUNCU SEÇİMİ (LAGGING)' : 'CANLI MAÇ BAŞLIYOR...'}</div>

          <div className="starting-players">
            <div className="starting-player">
              <div className="starting-player-photo">
                <img src={playerPhotos[p1Name] || FALLBACK_AVATAR} alt={p1Name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="starting-player-name">{p1Name}</div>
            </div>

            <div className="starting-vs">VS</div>

            <div className="starting-player">
              <div className="starting-player-photo">
                <img src={playerPhotos[p2Name] || FALLBACK_AVATAR} alt={p2Name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="starting-player-name">{p2Name}</div>
            </div>
          </div>

          <div className="starting-details">
            <div className="starting-detail-item">
              <span className="detail-label">Hedef Sayı:</span>
              <span className="detail-value">{settings?.targetScore ?? '-'}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Hedef İstaka:</span>
              <span className="detail-value">{settings?.targetRack ?? '-'}</span>
            </div>
          </div>

          {/* Countdown veya Yer Değiştirme Sorusu */}
          {(countdown !== null && countdown > 0 && !isSwapPhase) ? (
            <div className="starting-countdown">
              {countdown}
            </div>
          ) : (
            /* Geri sayım bitti - Yer değiştirme sorusu göster */
            <div className="swap-confirm-section">
              <div className="swap-question">🔄 Oyuncuların yerini değiştirmek ister misiniz?</div>
              <div className="swap-hint">Tabela veya mobil cihazdan yanıt verebilirsiniz</div>
              <div className="swap-buttons">
                <button
                  className="swap-btn swap-btn-no"
                  onClick={() => {
                    console.log('📱 NO_SWAP komutu gönderiliyor...');
                    sendMatchCommand('NO_SWAP', {}, tableId);
                  }}
                >
                  Hayır, Bu Şekilde Kalsın
                </button>
                <button
                  className="swap-btn swap-btn-yes"
                  onClick={() => {
                    console.log('📱 SWAP_CONFIRM komutu gönderiliyor...');
                    sendMatchCommand('SWAP_CONFIRM', {}, tableId);
                  }}
                >
                  Evet, Değiştir
                </button>
              </div>
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
          <div className="loading-spinner"></div>
          <h2>{isReadOnly ? 'Canlı İzleme' : 'Bağlanıyor...'}</h2>
          <p>{isReadOnly ? 'Maç henüz başlamadı veya veri bekleniyor' : 'Maç verileri yükleniyor, lütfen bekleyin...'}</p>

          {/* Debug Bilgileri */}
          <div style={{ fontSize: '11px', color: '#888', marginTop: '15px', fontFamily: 'monospace', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', color: '#00c3ff', marginBottom: '5px' }}>DEBUG INFO (v1.0.2)</div>
            <div>Masa: {tableId}</div>
            <div>Ben: {loggedInUser?.id || loggedInUser?.uid || 'Anonim'}</div>
            <div>Auth: {loggedInUser ? 'Giriş Yapıldı' : 'Yok'}</div>
            <div>ReadOnly: {isReadOnly ? 'EVET' : 'HAYIR'}</div>
            <div>MatchData: {matchData ? 'VAR' : 'BEKLENİYOR...'}</div>
          </div>

          <button
            className="back-home-btn"
            onClick={handleBackToHome}
            style={{ marginTop: '20px', background: 'rgba(255,255,255,0.1)' }}
          >
            İptal / Çıkış
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
                <img src={playerPhotos[matchData.players[0]] || FALLBACK_AVATAR} alt={matchData.players[0]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="starting-player-name">{matchData.players[0]}</div>
            </div>

            <div className="starting-vs">VS</div>

            <div className="starting-player">
              <div className="starting-player-photo">
                <img src={playerPhotos[matchData.players[1]] || FALLBACK_AVATAR} alt={matchData.players[1]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="starting-player-name">{matchData.players[1]}</div>
            </div>
          </div>

          <div className="starting-details">
            <div className="starting-detail-item">
              <span className="detail-label">Hedef Sayı:</span>
              <span className="detail-value">{matchData.settings?.targetScore ?? '-'}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Hedef İstaka:</span>
              <span className="detail-value">{matchData.settings?.targetRack ?? '-'}</span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">Penaltı:</span>
              <span className="detail-value" style={{ color: matchData.settings?.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                {matchData.settings?.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div className="starting-detail-item">
              <span className="detail-label">ASO:</span>
              <span className="detail-value" style={{ color: matchData.settings?.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                {matchData.settings?.hasAso ? 'VAR' : 'YOK'}
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

  // Maç bitti ekranı: matchEnded (IDLE durumu) VEYA gameEnded true ve showSaveConfirm false
  const showMatchEndScreen = matchEnded || (liveStats?.gameEnded && !liveStats?.showSaveConfirm);

  if (showMatchEndScreen) {
    return (
      <div className="mobile-controller-wrapper">
        <div className="match-end-screen">
          <div className="end-icon">🏆</div>
          <h2>MAÇ BİTTİ</h2>
          <div className="final-score">
            <div className="final-player">
              <div className="player-name">{matchData?.players?.[0] || 'Oyuncu 1'}</div>
              <div className="player-score">{liveStats?.score1 || 0}</div>
            </div>
            <div className="vs-text">-</div>
            <div className="final-player">
              <div className="player-name">{matchData?.players?.[1] || 'Oyuncu 2'}</div>
              <div className="player-score">{liveStats?.score2 || 0}</div>
            </div>
          </div>
          <div className="match-end-buttons">
            <button
              className="match-end-btn rematch"
              onClick={() => handleCommand('REMATCH')}
            >
              🔄 Aynı Maç
            </button>
            <button
              className="match-end-btn new-match"
              onClick={() => handleCommand('NEW_MATCH')}
            >
              ➕ Yeni Maç
            </button>
          </div>
          <button className="back-home-btn" onClick={handleBackToHome}>
            Ana Ekrana Dön
          </button>
        </div>
      </div>
    );
  }

  // Survival Mode UI
  const isSurvivalMode = liveStats?.mode === 'survival' || matchData?.mode === 'survival';

  if (isSurvivalMode && liveStats?.survivalPlayers) {
    return (
      <div className="mobile-controller-wrapper">
        {/* Header */}
        <div className="live-match-header">
          <div className="live-indicator-small survival-mode">
            <span className="live-dot"></span>
            SURVIVAL
          </div>
          {/* Game Clock */}
          <div className="survival-game-clock">
            <span className="clock-icon">⏱️</span>
            <span className="clock-time">{liveStats?.gameTimeFormatted || '00:00'}</span>
            <span className="clock-half">SET {liveStats?.gameHalf || 1}</span>
          </div>
          {/* Viewer Count */}
          <div className="viewer-count">
            <span className="viewer-icon">👁️</span>
            <span className="viewer-number">{viewerCount}</span>
          </div>
          {/* Çıkış Butonu */}
          <button
            className="header-exit-btn"
            onClick={handleExitRequest}
            title="Çıkış"
          >
            ✕
          </button>
        </div>

        {/* Exit Confirm Modal */}
        {showExitConfirm && (
          <div className="exit-confirm-overlay">
            <div className="exit-confirm-modal">
              <div className="exit-confirm-icon">⚠️</div>
              <div className="exit-confirm-title">Maçtan Çıkış</div>
              <div className="exit-confirm-message">Kumanda ekranından çıkmak istediğinize emin misiniz?</div>
              <div className="exit-confirm-warning">Maç arka planda devam edecektir.</div>
              <div className="exit-confirm-buttons">
                <button className="exit-confirm-btn cancel" onClick={handleCancelExit}>Hayır</button>
                <button className="exit-confirm-btn confirm" onClick={handleConfirmExit}>Evet, Çık</button>
              </div>
            </div>
          </div>
        )}

        {/* Survival Stats Panel */}
        <div className="survival-stats-panel">
          {/* Inning Badge */}
          <div className="survival-inning-badge">
            <span className="inning-label">INNING</span>
            <span className="inning-value">{liveStats?.inning ?? 0}</span>
          </div>

          {/* Players Grid */}
          <div className="survival-players-grid">
            {liveStats.survivalPlayers.map((player, idx) => (
              <div
                key={idx}
                className={`survival-player-card ${player.isActive ? 'active' : ''} ${player.isDisqualified ? 'disqualified' : ''}`}
              >
                <div className="survival-player-photo">
                  <img
                    src={playerPhotos[player.name] || FALLBACK_AVATAR}
                    alt={player.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                  />
                  {player.isDisqualified && <div className="disqualified-overlay">✕</div>}
                </div>
                <div className="survival-player-info">
                  <div className="survival-player-name">{player.name}</div>
                  <div className="survival-player-score">{player.score}</div>
                </div>
                <div className="survival-player-stats">
                  <div className="stat-item">
                    <span className="stat-label">HR</span>
                    <span className="stat-value">{player.hr || 0}</span>
                  </div>
                  {player.isActive && (
                    <div className="stat-item run-stat">
                      <span className="stat-label">RUN</span>
                      <span className="stat-value">{player.currentRun || 0}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Timer Progress Bar */}
          <div className="mobile-timer-container survival-timer">
            <TimerProgressBar
              isTimerRunning={liveStats?.isTimerRunning || false}
              currentTurn={liveStats?.currentTurn || 0}
              timerPhase={liveStats?.timerPhase || 'idle'}
              resetTrigger={liveStats?.timerResetTrigger || 0}
              isTimerPaused={liveStats?.isTimerPaused || false}
              activeColor="#4ECDC4"
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

        {/* Game Ended Overlay - Sadece kısa bilgi, otomatik dönüş yapılacak */}
        {liveStats?.gameEnded && (
          <div className="survival-game-ended-overlay">
            <div className="game-ended-content">
              <div className="winner-trophy">🏆</div>
              <div className="winner-title">KAZANAN</div>
              <div className="winner-name">{liveStats?.winner}</div>
              <div className="final-scores">
                {liveStats.survivalPlayers
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div key={idx} className={`final-score-row ${idx === 0 ? 'winner' : ''}`}>
                      <span className="rank">{idx + 1}.</span>
                      <span className="name">{p.name}</span>
                      <span className="score">{p.score}</span>
                    </div>
                  ))}
              </div>
              <div style={{
                marginTop: '20px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
                animation: 'pulse 1.5s infinite'
              }}>
                Ana ekrana yönlendiriliyorsunuz...
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons (if not readOnly) */}
        {!isReadOnly && !liveStats?.gameEnded && (
          <div className="remote-control survival-remote">
            {/* RUN Display */}
            <div className="run-display">
              <div className="run-label">RUN</div>
              <div className="run-value survival-run">
                {optimisticRun !== null ? optimisticRun : (liveStats?.run || 0)}
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
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                className="media-btn media-btn-timer"
                onClick={() => handleCommand('TOGGLE_TIMER')}
                title="Timer Başlat/Durdur"
              >
                {timerRunning ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
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
        {/* Sadece İzleme Modu Göstergesi */}
        {isReadOnly && (
          <div className="readonly-badge">
            <span className="readonly-icon">👁️</span>
            <span className="readonly-text">İZLEME MODU</span>
          </div>
        )}
        {/* Viewer Count */}
        <div className="viewer-count">
          <span className="viewer-icon">👁️</span>
          <span className="viewer-number">{viewerCount}</span>
        </div>
        {/* Çıkış Butonu - readOnly modunda da görünür */}
        <button
          className="header-exit-btn"
          onClick={handleExitRequest}
          title="Çıkış"
        >
          ✕
        </button>
      </div>

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay">
          <div className="exit-confirm-modal">
            <div className="exit-confirm-icon">⚠️</div>
            <div className="exit-confirm-title">Maçtan Çıkış</div>
            <div className="exit-confirm-message">Maçtan çıkmak istediğinize emin misiniz?</div>
            <div className="exit-confirm-warning">Bu işlem maçı sonlandıracaktır.</div>
            <div className="exit-confirm-buttons">
              <button className="exit-confirm-btn cancel" onClick={handleCancelExit}>Hayır</button>
              <button className="exit-confirm-btn confirm" onClick={handleConfirmExit}>Evet, Çık</button>
            </div>
          </div>
        </div>
      )}

      {/* Match Stats */}
      <div className="match-stats-panel">
        <div className="inning-badge" style={{ margin: '0 auto' }}>
          <span className="inning-label">INNING</span>
          <span className="inning-value">{liveStats?.inning ?? 0}</span>
        </div>

        <div className="stats-row player-row" style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          <div className={`player-card player1 ${liveStats?.currentTurn === 0 ? 'active' : ''}`} style={{ flex: 1, minWidth: 0, width: '0', padding: '8px 5px' }}>
            <div className="player-name" style={{ fontSize: '14px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matchData.players[0]}</div>
            {/* Profile Picture */}
            <div className="player-profile-pic" style={{ width: '40px', height: '40px', margin: '0 auto 5px' }}>
              <img src={playerPhotos[matchData.players[0]] || FALLBACK_AVATAR} alt={matchData.players[0]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div className="player-score" style={{ fontSize: '28px', marginBottom: '5px' }}>{liveStats?.score1 || 0}</div>
            <div className="player-stats" style={{ fontSize: '11px' }}>
              <span>HR: {liveStats?.eys1 || liveStats?.hr1 || 0}</span>
            </div>
            {/* Timeout hakları */}
            <div className="timeout-rights">
              {[...Array(liveStats?.player1TimeoutLeft || 0)].map((_, i) => (
                <div key={i} className="timeout-box" style={{ height: '6px', width: '15px' }}></div>
              ))}
            </div>
          </div>
          <div className={`player-card player2 ${liveStats?.currentTurn === 1 ? 'active' : ''}`} style={{ flex: 1, minWidth: 0, width: '0', padding: '8px 5px' }}>
            <div className="player-name" style={{ fontSize: '14px', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matchData.players[1]}</div>
            {/* Profile Picture */}
            <div className="player-profile-pic" style={{ width: '40px', height: '40px', margin: '0 auto 5px' }}>
              <img src={playerPhotos[matchData.players[1]] || FALLBACK_AVATAR} alt={matchData.players[1]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            <div className="player-score" style={{ fontSize: '28px', marginBottom: '5px' }}>{liveStats?.score2 || 0}</div>
            <div className="player-stats" style={{ fontSize: '11px' }}>
              <span>HR: {liveStats?.eys2 || liveStats?.hr2 || liveStats?.hr1_2 || 0}</span>
            </div>
            {/* Timeout hakları */}
            <div className="timeout-rights">
              {[...Array(liveStats?.player2TimeoutLeft || 0)].map((_, i) => (
                <div key={i} className="timeout-box" style={{ height: '6px', width: '15px' }}></div>
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

      {/* Notification Overlay Removed */}

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
      <div className="remote-control" style={{ padding: '10px 10px 30px', gap: '10px' }}>
        {/* Power Button - Top Left (sadece kontrol modunda) */}
        {!isReadOnly && (
          <button
            className="power-btn-exit"
            onClick={() => handleCommand('EXIT')}
            title="Maçtan Çık"
            style={{ top: '5px', left: '5px', width: '30px', height: '30px', fontSize: '16px' }}
          >
            ✕
          </button>
        )}

        {/* RUN Display */}
        <div className="run-display" style={{ marginBottom: '5px' }}>
          <div className="run-label" style={{ fontSize: '12px', marginBottom: '2px' }}>RUN</div>
          <div className={`run-value ${liveStats?.currentTurn === 0 ? 'player1' : 'player2'}`} style={{ fontSize: '40px', lineHeight: '1' }}>
            {optimisticRun !== null ? optimisticRun : (liveStats?.run || 0)}
          </div>
        </div>

        {/* Control Buttons */}
        {!isReadOnly && (
          <div className="control-buttons" style={{ gap: '15px', marginBottom: '8px', justifyContent: 'center' }}>
            <button
              className="control-btn control-left"
              onClick={() => handleCommand('MINUS')}
              title="Run -1"
              style={{ width: '60px', height: '60px', borderRadius: '50%', padding: '0', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ◀
            </button>
            <button
              className="control-btn control-center"
              onClick={() => handleCommand('OK')}
              title="Sayıyı Ekle / Sıra Geç"
              style={{ width: '75px', height: '75px', borderRadius: '50%', padding: '0', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }}
            >
              OK
            </button>
            <button
              className="control-btn control-right"
              onClick={() => handleCommand('PLUS')}
              title="Run +1"
              style={{ width: '60px', height: '60px', borderRadius: '50%', padding: '0', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ▶
            </button>
          </div>
        )}

        {/* Media Control Buttons */}
        {!isReadOnly && (
          <div className="media-controls" style={{ gap: '15px', marginTop: '0' }}>
            <button
              className="media-btn"
              onClick={() => handleCommand('UNDO')}
              title="Geri Al (Undo)"
              style={{ width: '50px', height: '50px', padding: '12px' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              className="media-btn media-btn-timer"
              onClick={() => handleCommand('TOGGLE_TIMER')}
              title="Timer Başlat/Durdur"
              style={{ width: '50px', height: '50px', padding: '12px' }}
            >
              {timerRunning ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileController;
