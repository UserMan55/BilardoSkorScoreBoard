import React from 'react';

function PlayerPanel({ name, score, hr1, hr2, avg, bg }) {
  return (
    <div style={{
      flex: 1,
      background: bg,
      color: 'white',
      margin: '0 16px',
      padding: '24px',
      borderRadius: 18,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: 300,
      boxShadow: '0 4px 24px #0006'
    }}>
      {/* Oyuncu Adı */}
      <div style={{
        fontSize: 28, fontWeight: 800, marginBottom: '12px', 
        background: name === "OSMAN DEMIREL" ? '#505050' : '#fec800',
        borderRadius: 8, padding: '4px 32px', color: name === "OSMAN DEMIREL" ? '#fff' : '#222',
        width: '100%',
        textAlign: 'center'
      }}>{name}</div>
      {/* Skor Kutusu */}
      <div style={{
        fontSize: 150,
        fontWeight: 'bold',
        marginBottom: 12,
        background: '#222',
        borderRadius: 12,
        padding: '50px 0',
        width: '95%',
        textAlign: 'center',
        border: '4px solid #111'
      }}>
        {score}
      </div>
      {/* HR alanları */}
      <div style={{ display: 'flex', gap: 12, width: '95%', marginBottom: 10, justifyContent: 'center' }}>
        <div style={{
          background: '#333', borderRadius: 8, padding: '12px 0', flex: 1,
          textAlign: 'center', fontSize: 30, fontWeight: 700,
          boxShadow: '0 0 6px #0002'
        }}>
          {hr1}
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: '#ccc' }}>HR1</div>
        </div>
        <div style={{
          background: '#333', borderRadius: 8, padding: '12px 0', flex: 1,
          textAlign: 'center', fontSize: 30, fontWeight: 700,
          boxShadow: '0 0 6px #0002'
        }}>
          {hr2}
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: '#ccc' }}>HR2</div>
        </div>
      </div>
      {/* AVG kutusu */}
      <div style={{
        width: '95%',
        background: '#fec800', borderRadius: 8, padding: '14px 0 8px 0',
        fontWeight: 'bold', fontSize: 34, color: '#222',
        textAlign: 'center', marginTop: 4
      }}>
        {avg}
        <div style={{ fontSize: 18, fontWeight: 600, color: '#444', marginTop: -2 }}>
          AVG
        </div>
      </div>
    </div>
  );
}

export default PlayerPanel;