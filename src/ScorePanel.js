import React from 'react';

function ScorePanel({ inning, run }) {
  return (
    <div style={{
      width: 220, background: '#161d29', color: '#e6fdfe',
      margin: '0 16px', borderRadius: 18, padding: '24px 0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      boxShadow: '0 4px 24px #0006'
    }}>
      <div style={{ fontSize: 32, letterSpacing: 2 }}>INNING</div>
      <div style={{ fontSize: 52, fontWeight: 700, margin: '12px 0' }}>{inning}</div>
      {/* İstersen senin logonu ve top iconunu burada img ile ekleyebiliriz */}
      <div style={{ margin: '22px 0 10px 0', fontSize: 28, color: '#d92323' }}>RUN</div>
      <div style={{ fontSize: 50, color: '#fec800', fontWeight: 700 }}>{run}</div>
    </div>
  );
}
export default ScorePanel;