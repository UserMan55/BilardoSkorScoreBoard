import React from 'react';

function PlayerPanel({
  name, score, hr1, hr2, avg, bg,
  timeout1Used = false, timeout2Used = false,
  playerIndex = 0,
  isActive = false,
  borderColor = 'transparent',
  timeoutLeft = 2
}) {
  const formattedAvg = Number(avg).toFixed(3);

  return (
    <div style={{
      flex: 1,
      minWidth: 320,
      maxWidth: 500,
      background: "#22283e", // Her iki panel için sabit koyu arka plan
      color: 'white',
      margin: '0 0',
      padding: '15px',
      borderRadius: 28,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: isActive ? `0 0 50px ${borderColor}, 0 0 25px ${borderColor}, 0 8px 36px #0006` : '0 8px 36px #0006',
      border: isActive ? `4px solid ${borderColor}` : '4px solid transparent',
      fontFamily: "Arial, sans-serif",
      position: 'relative',
      transition: 'all 0.3s ease'
    }}>
      {/* Oyuncu Adı Kutusu */}
      <div style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 24,
        fontWeight: 800,
        marginBottom: '10px',
        background: '#fff', // Her iki panel için sabit beyaz arka plan
        color: '#222', // Her iki panel için sabit koyu yazı
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
        fontSize: 180,
        fontWeight: 'bold',
        marginBottom: 12,
        background: '#222',
        borderRadius: 18,
        width: '96%',
        height: '62%',
        textAlign: 'center',
        border: '6px solid #111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: '#fff' // Her iki panel için sabit beyaz skor
      }}>
        {score}
        {/* Timeout göstergeleri - sol alt */}
        <div style={{
          position: 'absolute',
          left: 14,
          bottom: 22,
          display: 'flex',
          gap: 8
        }}>
          {timeoutLeft >= 1 && (
            <div style={{
              width: 48,
              height: 20,
              background: '#48d84d',
              borderRadius: 8,
              boxShadow: '0 0 6px #0003',
              border: '3px solid #185d26'
            }} />
          )}
          {timeoutLeft >= 2 && (
            <div style={{
              width: 48,
              height: 20,
              background: '#48d84d',
              borderRadius: 8,
              boxShadow: '0 0 6px #0003',
              border: '3px solid #185d26'
            }} />
          )}
        </div>
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
          padding: '12px 0',
          flex: 1,
          textAlign: 'center',
          fontSize: 38, 
          fontWeight: 700,
          boxShadow: '0 0 10px #0002',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: 8,
            fontSize: 12, 
            fontWeight: 600,
            color: '#ccc'
          }}>HR1</span>
          {hr1}
        </div>
        {/* HR2 kutusu */}
        <div style={{
          background: '#333',
          borderRadius: 12,
          padding: '12px 0',
          flex: 1,
          textAlign: 'center',
          fontSize: 38,
          fontWeight: 700,
          boxShadow: '0 0 10px #0002',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: 8,
            fontSize: 12,
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
        background: '#fff', // Her iki panel için sabit beyaz arka plan
        borderRadius: 12,
        padding: '14px 0 8px 0',
        fontWeight: 'bold',
        fontSize: 42,
        color: '#222',
        textAlign: 'center',
        marginTop: 8,
        position: 'relative'
      }}>
        <span style={{
          position: 'absolute',
          left: 14,
          top: 8,
          fontSize: 13,
          fontWeight: 600,
          color: '#444'
        }}>AVG</span>
        {formattedAvg}
      </div>
    </div>
  );
}

export default PlayerPanel;