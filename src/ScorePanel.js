import React from 'react';
import LogoPanel from './LogoPanel';

function ScorePanel({ inning, run, runColor = '#fff', onShowController, isControllerHidden = false }) {
  return (
    <div style={{
      width: 340,
      minWidth: 280,
      background: '#181c22',
      color: '#e6fdfe',
      borderRadius: 18,
      padding: '32px 0',
      boxShadow: '0 4px 24px #0006',
      fontFamily: "Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* RUN başlığı ve kutusu */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 8
      }}>
        <div style={{
          fontSize: 22,
          color: runColor,
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8,
          transition: 'color 0.3s ease'
        }}>RUN</div>
        <div style={{
          fontSize: 176,
          background: '#222',
          borderRadius: 36,
          padding: '36px 80px',
          color: runColor,
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: 2,
          boxShadow: `0 0 20px ${runColor}40`,
          transition: 'all 0.3s ease'
        }}>
          {run}
        </div>
      </div>
      {/* LOGO tam ortada */}
      <LogoPanel />
      {/* INNING başlığı ve kutusu */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 8
      }}>
        <div style={{
          fontSize: 22,
          color: 'white',
          marginBottom: 8,
          fontWeight: 700,
          letterSpacing: 1
        }}>INNING</div>
        <div style={{
          fontSize: 96,
          background: '#222',
          borderRadius: 20,
          padding: '24px 48px',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: 2,
          marginBottom: 8,
          boxShadow: '0 0 16px #0005'
        }}>
          {inning}
        </div>

        {/* Kumanda toggle ikonu - sadece gizlendiğinde görünsün */}
        {isControllerHidden && (
          <button
            onClick={onShowController}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '12px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              fontWeight: 'bold'
            }}
            title="Kumandayı göster"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            ⚙️
          </button>
        )}
      </div>
    </div>
  );
}

export default ScorePanel;