import React from 'react';

function StatusBar({ value, greenCount, yellowCount, redCount }) {
  return (
    <div style={{
      width: '100%', height: 56, display: 'flex',
      alignItems: 'center', position: 'relative', marginBottom: 10
    }}>
      {/* Renkli barlar */}
      <div style={{ flex: greenCount, background: '#48d84d', height: '64%' }} />
      <div style={{ flex: yellowCount, background: '#fec800', height: '64%' }} />
      <div style={{ flex: redCount, background: '#d92323', height: '64%' }} />
      {/* Ortadaki skor */}
      <div style={{
        position: 'absolute', left: '50%',
        fontSize: 38, fontWeight: 'bold', transform: 'translateX(-50%)', color: '#222'
      }}>
        {value}
      </div>
    </div>
  );
}

export default StatusBar;