import React from 'react';

function ScorePanel({ 
  inning, 
  run, 
  runColor = '#fff', 
  onShowController, 
  isControllerHidden = false,
  // Maç bilgileri (logo yerine)
  targetScore,
  targetRack,
  hasPenalty,
  hasAso,
  isFreeMode = false
}) {
  return (
    <div style={{
      width: 240,
      minWidth: 200,
      background: '#181c22',
      color: '#e6fdfe',
      borderRadius: 18,
      padding: '12px 0',
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
        marginBottom: 4
      }}>
        <div style={{
          fontSize: 22,
          color: runColor,
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 4,
          transition: 'color 0.3s ease'
        }}>RUN</div>
        <div style={{
          fontSize: 110,
          background: '#222',
          borderRadius: 36,
          padding: '10px 30px',
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

      {/* Maç Bilgileri Paneli (Logo yerine) */}
      {!isFreeMode && targetScore !== undefined && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 12px',
          borderRadius: '8px',
          margin: '8px 0',
          fontSize: '11px',
          fontWeight: '600',
          border: '1px solid rgba(102, 126, 234, 0.5)',
          width: '90%',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Hedef Sayı:</span>
            <span style={{ color: '#FFD700' }}>{targetScore}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Hedef İstaka:</span>
            <span style={{ color: '#FFD700' }}>{targetRack}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(102, 126, 234, 0.3)' }}>
            <span style={{ color: '#888' }}>Penaltı:</span>
            <span style={{ color: hasPenalty ? '#4ECDC4' : '#FF6B6B' }}>{hasPenalty ? '✓' : '✗'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>ASO:</span>
            <span style={{ color: hasAso ? '#00FF00' : '#FF6B6B' }}>{hasAso ? '✓' : '✗'}</span>
          </div>
        </div>
      )}

      {/* INNING başlığı ve kutusu */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 4
      }}>
        <div style={{
          fontSize: 22,
          color: 'white',
          marginBottom: 4,
          fontWeight: 700,
          letterSpacing: 1
        }}>INNING</div>
        <div style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 20,
          padding: '8px 25px',
          color: '#FFD700',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: 2,
          marginBottom: 4,
          boxShadow: '0 0 16px #0005'
        }}>
          {inning}
        </div>
      </div>
    </div>
  );
}

export default ScorePanel;