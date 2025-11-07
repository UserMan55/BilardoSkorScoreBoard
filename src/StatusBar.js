import React from 'react';

function StatusBar({ value }) {
  return (
    <div style={{
      width: '100%',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      marginBottom: 10,
      background: '#fff',
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        position: 'absolute',
        left: '50%',
        fontSize: 38,
        fontWeight: 'bold',
        transform: 'translateX(-50%)',
        color: '#222',
        fontFamily: "Arial, sans-serif"
      }}>
        {value}
      </div>
    </div>
  );
}

export default StatusBar;