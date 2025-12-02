import React, { useEffect, useState } from 'react';
import { listenForMatchCommands } from '../services/firebase';

function ScoreboardReceiver({ onStartGame }) {
  const [status, setStatus] = useState('waiting'); // waiting, connected, starting

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

          // Gelen veriyi direkt parent'a ilet
          if (onStartGame) {
            onStartGame(data);
          }
        } else {
          console.log("Eski veri - atlandı");
        }
      }
    });

    // Component unmount olduğunda dinlemeyi durdur
    return () => unsubscribe();
  }, [onStartGame]);

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
        {status === 'waiting' ? 'UZAKTAN MAÇ BAŞLATMA KOMUTU BEKLENİYOR...' : 'Maç başlatılıyor...'}
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
