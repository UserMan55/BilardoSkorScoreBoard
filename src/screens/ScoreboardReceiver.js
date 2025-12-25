import React, { useEffect, useState, useRef } from 'react';
import { listenForMatchCommands, getUserProfiles } from '../services/firebase';
import './ScoreboardReceiver.css';

const FALLBACK_AVATAR = '/logo.png';

// Salon bilgileri (StartScreen ile aynı)
const SALON_INFO = {
  name: "SALON 3CSCORE",
  city: "SAMSUN",
  logo: "/logo.jfif"
};

// QR URL oluştur
const getQRUrl = (tableId = 'table_1') => {
  // Production'da live.3cscore.com, development'ta localhost
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://live.3cscore.com'
    : `http://${window.location.hostname}:3000`;
  return `${baseUrl}?table=${tableId}&voice=true`;
};

function ScoreboardReceiver({ onStartGame, tableId = 'table_1' }) {
  const [status, setStatus] = useState('loading'); // loading, waiting, connected, starting
  const [matchPreview, setMatchPreview] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [playerPhotos, setPlayerPhotos] = useState({});
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    let isInitialLoad = true;
    let lastTimestamp = null;

    // Firebase dinleyicisini başlat
    const unsubscribe = listenForMatchCommands((data) => {
      // İlk veri geldiğinde loading'den çık
      // Stale closure warning: status accessed here might be stale, but harmless for transition to 'waiting'
      setStatus(prev => {
        if (prev === 'loading') return 'waiting';
        return prev;
      });

      if (data && data.status === 'START') {
        const currentTimestamp = data.timestamp?.seconds || 0;

        // İlk yüklemede eski veriyi atla
        if (isInitialLoad) {
          isInitialLoad = false;
          lastTimestamp = currentTimestamp;
          // console.log("İlk yükleme - eski veri atlandı");
          return;
        }

        // Sadece yeni gelen komutları işle (timestamp değiştiyse)
        if (currentTimestamp > lastTimestamp) {
          // console.log("Yeni maç komutu alındı:", data);
          lastTimestamp = currentTimestamp;
          setStatus('starting');
          setMatchPreview(data);
          setCountdown(3);

          // Fotoğrafları doğrudan START komutundan al (varsa)
          if (data.playerPhotos) {
            // console.log("📷 Fotoğraflar START komutundan alındı:", data.playerPhotos);
            setPlayerPhotos(data.playerPhotos);
          }

          // Mevcut interval varsa temizle
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }

          // Countdown başlat
          let count = 3;
          const intervalId = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(intervalId);
              countdownIntervalRef.current = null;
              // Gelen veriyi direkt parent'a ilet
              if (onStartGame) {
                onStartGame(data);
              }
            }
          }, 1000);
          countdownIntervalRef.current = intervalId;

        } else {
          // console.log("Eski veri - atlandı");
        }
      }
    });

    // Component unmount olduğunda dinlemeyi durdur ve intervali temizle
    return () => {
      unsubscribe();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [onStartGame]);

  // Fetch player photos
  useEffect(() => {
    if (matchPreview && matchPreview.players) {
      const fetchPlayerPhotos = async () => {
        try {
          const allUsers = await getUserProfiles();
          // console.log("📷 Tüm kullanıcılar:", allUsers.map(u => ({ name: u.fullName, photo: u.photoURL ? 'VAR' : 'YOK' })));
          // console.log("📷 Aranan oyuncular:", matchPreview.players);

          const photos = {};

          matchPreview.players.forEach(playerName => {
            // Trim ve normalize et
            const normalizedPlayerName = playerName.trim().toLowerCase();

            const user = allUsers.find(u =>
              u.fullName.trim().toLowerCase() === normalizedPlayerName
            );

            // console.log(`📷 ${playerName} -> Eşleşme:`, user ? user.fullName : 'BULUNAMADI', '| Foto:', user?.photoURL ? 'VAR' : 'YOK');

            if (user && user.photoURL) {
              photos[playerName] = user.photoURL;
            }
          });

          // console.log("📷 Yüklenen fotoğraflar:", photos);
          setPlayerPhotos(photos);
        } catch (error) {
          console.error('Error fetching player photos:', error);
        }
      };

      fetchPlayerPhotos();
    }
  }, [matchPreview]);

  if (status === 'starting' && matchPreview) {
    // console.log("🖼️ ScoreboardReceiver Render - playerPhotos:", playerPhotos);
    // console.log("🖼️ ScoreboardReceiver Render - players:", matchPreview.players);
    // console.log("🖼️ Player1 photo check:", matchPreview.players[0], "->", playerPhotos[matchPreview.players[0]]);
    // console.log("🖼️ Player2 photo check:", matchPreview.players[1], "->", playerPhotos[matchPreview.players[1]]);

    return (
      <div className="scoreboard-wrapper">
        <div className="scoreboard-starting-screen">
          <div className="scoreboard-starting-title">CANLI MAÇ BAŞLIYOR...</div>

          <div className="scoreboard-starting-players">
            <div className="scoreboard-starting-player">
              <div className="scoreboard-player-photo">
                <img src={playerPhotos[matchPreview.players[0]] || FALLBACK_AVATAR} alt={matchPreview.players[0]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="scoreboard-player-name">{matchPreview.players[0]}</div>
            </div>

            <div className="scoreboard-starting-vs">VS</div>

            <div className="scoreboard-starting-player">
              <div className="scoreboard-player-photo">
                <img src={playerPhotos[matchPreview.players[1]] || FALLBACK_AVATAR} alt={matchPreview.players[1]} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }} />
              </div>
              <div className="scoreboard-player-name">{matchPreview.players[1]}</div>
            </div>
          </div>

          <div className="scoreboard-starting-details">
            <div className="scoreboard-detail-item">
              <span className="scoreboard-detail-label">Hedef Sayı</span>
              <span className="scoreboard-detail-value">{matchPreview.settings.targetScore}</span>
            </div>
            <div className="scoreboard-detail-item">
              <span className="scoreboard-detail-label">Hedef İstaka</span>
              <span className="scoreboard-detail-value">{matchPreview.settings.targetRack}</span>
            </div>
            <div className="scoreboard-detail-item">
              <span className="scoreboard-detail-label">Penaltı</span>
              <span className="scoreboard-detail-value" style={{ color: matchPreview.settings.hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>
                {matchPreview.settings.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div className="scoreboard-detail-item">
              <span className="scoreboard-detail-label">ASO</span>
              <span className="scoreboard-detail-value" style={{ color: matchPreview.settings.hasAso ? '#4ECDC4' : '#FF6B6B' }}>
                {matchPreview.settings.hasAso ? 'VAR' : 'YOK'}
              </span>
            </div>
          </div>

          {countdown > 0 && (
            <div className="scoreboard-starting-countdown">{countdown}</div>
          )}
        </div>
      </div>
    );
  }

  // Loading durumu - Firebase bağlantısı kuruluyor
  if (status === 'loading') {
    return (
      <div className="scoreboard-wrapper">
        <div className="scoreboard-loading-screen">
          <div className="scoreboard-loading-spinner"></div>
          <div className="scoreboard-loading-title">Bağlanıyor...</div>
          <div className="scoreboard-loading-subtitle">Firebase bağlantısı kuruluyor</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scoreboard-wrapper">
      <div className="scoreboard-waiting-screen">
        {/* Salon Logo ve Bilgisi */}
        <div className="scoreboard-waiting-header">
          <img src={SALON_INFO.logo} alt={SALON_INFO.name} className="scoreboard-salon-logo" />
          <div className="scoreboard-salon-name">{SALON_INFO.name}</div>
          <div className="scoreboard-salon-city">{SALON_INFO.city}</div>
        </div>

        <div className="scoreboard-waiting-title">MAÇ BEKLENİYOR</div>
        <div className="scoreboard-waiting-subtitle">Telefonunuzla QR kodu tarayın ve sesli komutla maç başlatın</div>

        {/* QR Kod Alanı */}
        <div className="scoreboard-qr-section">
          <div className="scoreboard-qr-container">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRUrl(tableId))}`}
              alt="QR Kod"
              className="scoreboard-qr-image"
            />
          </div>
          <div className="scoreboard-qr-instruction">
            <span className="qr-icon">📱</span>
            Telefonla tara → Sesli komutla maç başlat
          </div>
          <div className="scoreboard-qr-url">{getQRUrl(tableId)}</div>
        </div>

        <div className="scoreboard-waiting-status">
          <div className="scoreboard-status-active">📡 Bağlantı Durumu: Aktif</div>
          <div className="scoreboard-status-table">Masa ID: {tableId}</div>
        </div>
      </div>
    </div>
  );
}

export default ScoreboardReceiver;
