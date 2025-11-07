import React from 'react';

function PlayerPanel({
  name, score, hr1, hr2, avg, bg,
  timeout1Used = false, timeout2Used = false,
  playerIndex = 0
}) {
  const formattedAvg = Number(avg).toFixed(3);

  return (
    <div style={{
      flex: 1,
      minWidth: 420,      // Panel genişliği büyütüldü
      maxWidth: 640,      // Maksimum genişlik artırıldı
      background: playerIndex === 0 ? "#22283e" : bg,
      color: 'white',
      margin: '0 0',
      padding: '36px',    // İç boşluk arttı
      borderRadius: 28,   // Daha modern büyük köşe
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: '0 8px 36px #0006', // Shadow’u da %50 oranında büyüttüm
      fontFamily: "Arial, sans-serif",
      position: 'relative'
    }}>
      {/* Oyuncu Adı Kutusu */}
      <div style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 34,
        fontWeight: 800,
        marginBottom: '16px',
        background: playerIndex === 0 ? '#fff' : '#fec800',
        color: playerIndex === 0 ? '#222' : '#222',
        borderRadius: 12,
        padding: '8px 0',
        width: '96%',
        textAlign: 'center'
      }}>
        {name}
      </div>
      {/* Skor Kutusu ve Timeout */}
      <div style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 320,        // Skor alanı daha büyük
        fontWeight: 'bold',
        marginBottom: 24,
        background: '#222',
        borderRadius: 18,
        width: '96%',
        height: '62%',
        textAlign: 'center',
        border: '6px solid #111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {score}
        {!timeout1Used && (
          <div style={{
            position: 'absolute',
            left: 14,
            bottom: 22,
            width: 48,
            height: 20,
            background: '#48d84d',
            borderRadius: 8,
            boxShadow: '0 0 6px #0003',
            border: '3px solid #185d26'
          }} />
        )}
        {!timeout2Used && (
          <div style={{
            position: 'absolute',
            left: 72,
            bottom: 22,
            width: 48,
            height: 20,
            background: '#48d84d',
            borderRadius: 8,
            boxShadow: '0 0 6px #0003',
            border: '3px solid #185d26'
          }} />
        )}
      </div>
      {/* HR alanları */}
      <div style={{
        display: 'flex',
        gap: 20,
        width: '96%',
        marginBottom: 14,
        justifyContent: 'center'
      }}>
        {/* HR1 kutusu */}
        <div style={{
          background: '#333',
          borderRadius: 12,
          padding: '18px 0',
          flex: 1,
          textAlign: 'center',
          fontSize: 47, // %25 büyütülmüş hali de 50’nin üstünde
          fontWeight: 700,
          boxShadow: '0 0 10px #0002',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: 10,
            fontSize: 14, // Etiket biraz da büyüdü
            fontWeight: 600,
            color: '#ccc'
          }}>HR1</span>
          {hr1}
        </div>
        {/* HR2 kutusu */}
        <div style={{
          background: '#333',
          borderRadius: 12,
          padding: '18px 0',
          flex: 1,
          textAlign: 'center',
          fontSize: 47,
          fontWeight: 700,
          boxShadow: '0 0 10px #0002',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: 10,
            fontSize: 14,
            fontWeight: 600,
            color: '#ccc'
          }}>HR2</span>
          {hr2}
        </div>
      </div>
      {/* AVG kutusu */}
      <div style={{
        fontFamily: "Arial, sans-serif",
        width: '96%',
        background: '#fff',
        borderRadius: 12,
        padding: '20px 0 12px 0',
        fontWeight: 'bold',
        fontSize: 54,
        color: '#222',
        textAlign: 'center',
        marginTop: 8,
        position: 'relative'
      }}>
        <span style={{
          position: 'absolute',
          left: 14,
          top: 10,
          fontSize: 15,
          fontWeight: 600,
          color: '#444'
        }}>AVG</span>
        {formattedAvg}
      </div>
    </div>
  );
}

export default PlayerPanel;