import React, { useEffect, useState } from 'react';
import { listenForMatchCommands, getUserProfiles } from '../services/firebase';

function ScoreboardReceiver({ onStartGame }) {
  const [status, setStatus] = useState('waiting'); // waiting, connected, starting
  const [matchPreview, setMatchPreview] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [playerPhotos, setPlayerPhotos] = useState({});

  useEffect(() => {
    let isInitialLoad = true;
    let lastTimestamp = null;

    // Firebase dinleyicisini başlat
    const unsubscribe = listenForMatchCommands((data) => {
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
          const photos = {};
          
          matchPreview.players.forEach(playerName => {
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
  }, [matchPreview]);

  if (status === 'starting' && matchPreview) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1d2e 0%, #2d1b3d 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '40px'
      }}>
        <div style={{
          fontSize: '56px',
          fontWeight: 'bold',
          marginBottom: '60px',
          color: '#FFD700',
          animation: 'slideDown 0.5s ease-out',
          textShadow: '0 4px 8px rgba(0,0,0,0.5)'
        }}>
          CANLI MAÇ BAŞLIYOR...
        </div>

        {/* Players Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '80px',
          marginBottom: '60px',
          animation: 'fadeIn 0.8s ease-out 0.3s both'
        }}>
          {/* Player 1 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 100%)',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)'
            }}>
              {playerPhotos[matchPreview.players[0]] ? (
                <img 
                  src={playerPhotos[matchPreview.players[0]]} 
                  alt={matchPreview.players[0]}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" style={{ width: '80px', height: '80px' }}>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
              maxWidth: '200px'
            }}>
              {matchPreview.players[0]}
            </div>
          </div>

          {/* VS Text */}
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#FF6B6B',
            textShadow: '0 4px 8px rgba(255, 107, 107, 0.5)'
          }}>
            VS
          </div>

          {/* Player 2 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 100%)',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)'
            }}>
              {playerPhotos[matchPreview.players[1]] ? (
                <img 
                  src={playerPhotos[matchPreview.players[1]]} 
                  alt={matchPreview.players[1]}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" style={{ width: '80px', height: '80px' }}>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
              maxWidth: '200px'
            }}>
              {matchPreview.players[1]}
            </div>
          </div>
        </div>

        {/* Match Details */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '30px 50px',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          animation: 'fadeIn 1s ease-out 0.6s both'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '30px 60px',
            fontSize: '20px'
          }}>
            <div>
              <span style={{ color: '#aaa' }}>Hedef Sayı:</span>
              <span style={{ marginLeft: '10px', color: '#FFD700', fontWeight: 'bold' }}>
                {matchPreview.settings.targetScore}
              </span>
            </div>
            <div>
              <span style={{ color: '#aaa' }}>Hedef İstaka:</span>
              <span style={{ marginLeft: '10px', color: '#FFD700', fontWeight: 'bold' }}>
                {matchPreview.settings.targetRack}
              </span>
            </div>
            <div>
              <span style={{ color: '#aaa' }}>Penaltı:</span>
              <span style={{ marginLeft: '10px', color: matchPreview.settings.hasPenalty ? '#4ECDC4' : '#FF6B6B', fontWeight: 'bold' }}>
                {matchPreview.settings.hasPenalty ? 'VAR' : 'YOK'}
              </span>
            </div>
            <div>
              <span style={{ color: '#aaa' }}>ASO:</span>
              <span style={{ marginLeft: '10px', color: matchPreview.settings.hasAso ? '#4ECDC4' : '#FF6B6B', fontWeight: 'bold' }}>
                {matchPreview.settings.hasAso ? 'VAR' : 'YOK'}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div style={{
          marginTop: '60px',
          fontSize: '120px',
          fontWeight: 'bold',
          color: '#FFD700',
          animation: 'pulse 1s ease-in-out infinite',
          textShadow: '0 8px 16px rgba(255, 215, 0, 0.5)'
        }}>
          {countdown}
        </div>

        <style>
          {`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-50px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1d2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        fontSize: '48px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#FFD700',
        animation: 'pulse 2s infinite'
      }}>
        SCOREBOARD MODU
      </div>
      
      <div style={{
        fontSize: '24px',
        color: '#aaa',
        marginBottom: '40px'
      }}>
        UZAKTAN MAÇ BAŞLATMA KOMUTU BEKLENİYOR...
      </div>

      <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '10px',
        marginBottom: '40px'
      }}>
        <div style={{ marginBottom: '10px', color: '#4ECDC4' }}>📡 Bağlantı Durumu: Aktif</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Masa ID: table_1</div>
      </div>
      
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
}

export default ScoreboardReceiver;
