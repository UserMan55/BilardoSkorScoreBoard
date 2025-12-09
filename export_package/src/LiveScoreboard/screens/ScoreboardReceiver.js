import React, { useEffect, useState } from 'react';
import { listenForMatchCommands, getUserProfiles } from '../services/firebase';
import './ScoreboardReceiver.css';

const FALLBACK_AVATAR = '/logo.png';

function ScoreboardReceiver({ onStartGame }) {
  const [status, setStatus] = useState('loading'); // loading, waiting, connected, starting
  const [matchPreview, setMatchPreview] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [playerPhotos, setPlayerPhotos] = useState({});

  useEffect(() => {
    let isInitialLoad = true;
    let lastTimestamp = null;

    // Firebase dinleyicisini başlat
    const unsubscribe = listenForMatchCommands((data) => {
      // İlk veri geldiğinde loading'den çık
      if (status === 'loading') {
        setStatus('waiting');
      }
      
      if (data && data.status === 'START') {
        const currentTimestamp = data.timestamp?.seconds || 0;
        
        // İlk yüklemede eski veriyi atla
        if (isInitialLoad) {
          isInitialLoad = false;
          lastTimestamp = currentTimestamp;
          console.log("İlk yükleme - eski veri atlandı");
          return;
        }
        
        // Sadece yeni gelen komutları işle (timestamp değiştiyse)
        if (currentTimestamp > lastTimestamp) {
          console.log("Yeni maç komutu alındı:", data);
          lastTimestamp = currentTimestamp;
          setStatus('starting');
          setMatchPreview(data);
          setCountdown(3);
          
          // Fotoğrafları doğrudan START komutundan al (varsa)
          if (data.playerPhotos) {
            console.log("📷 Fotoğraflar START komutundan alındı:", data.playerPhotos);
            setPlayerPhotos(data.playerPhotos);
          }

          // Countdown başlat
          let count = 3;
          const countdownInterval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(countdownInterval);
              // Gelen veriyi direkt parent'a ilet
              if (onStartGame) {
                onStartGame(data);
              }
            }
          }, 1000);
        } else {
          console.log("Eski veri - atlandı");
        }
      }
    });

    // Component unmount olduğunda dinlemeyi durdur
    return () => unsubscribe();
  }, [onStartGame]);

  // Fetch player photos
  useEffect(() => {
    if (matchPreview && matchPreview.players) {
      const fetchPlayerPhotos = async () => {
        try {
          const allUsers = await getUserProfiles();
          console.log("📷 Tüm kullanıcılar:", allUsers.map(u => ({ name: u.fullName, photo: u.photoURL ? 'VAR' : 'YOK' })));
          console.log("📷 Aranan oyuncular:", matchPreview.players);
          
          const photos = {};
          
          matchPreview.players.forEach(playerName => {
            // Trim ve normalize et
            const normalizedPlayerName = playerName.trim().toLowerCase();
            
            const user = allUsers.find(u => 
              u.fullName.trim().toLowerCase() === normalizedPlayerName
            );
            
            console.log(`📷 ${playerName} -> Eşleşme:`, user ? user.fullName : 'BULUNAMADI', '| Foto:', user?.photoURL ? 'VAR' : 'YOK');
            
            if (user && user.photoURL) {
              photos[playerName] = user.photoURL;
            }
          });
          
          console.log("📷 Yüklenen fotoğraflar:", photos);
          setPlayerPhotos(photos);
        } catch (error) {
          console.error('Error fetching player photos:', error);
        }
      };
      
      fetchPlayerPhotos();
    }
  }, [matchPreview]);

  if (status === 'starting' && matchPreview) {
    console.log("🖼️ ScoreboardReceiver Render - playerPhotos:", playerPhotos);
    console.log("🖼️ ScoreboardReceiver Render - players:", matchPreview.players);
    console.log("🖼️ Player1 photo check:", matchPreview.players[0], "->", playerPhotos[matchPreview.players[0]]);
    console.log("🖼️ Player2 photo check:", matchPreview.players[1], "->", playerPhotos[matchPreview.players[1]]);
    
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
        <div className="scoreboard-waiting-title">SCOREBOARD MODU</div>
        <div className="scoreboard-waiting-subtitle">UZAKTAN MAÇ BAŞLATMA KOMUTU BEKLENİYOR...</div>
        <div className="scoreboard-waiting-status">
          <div className="scoreboard-status-active">📡 Bağlantı Durumu: Aktif</div>
          <div className="scoreboard-status-table">Masa ID: table_1</div>
        </div>
      </div>
    </div>
  );
}

export default ScoreboardReceiver;
