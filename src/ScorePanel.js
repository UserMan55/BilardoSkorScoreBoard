import React from 'react';
import LogoPanel from './LogoPanel';

function ScorePanel({ inning, run }) {
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
          color: '#fff',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8
        }}>RUN</div>
        <div style={{
          fontSize: 176,
          background: '#222',
          borderRadius: 36,
          padding: '36px 80px',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: 2,
          boxShadow: '0 0 20px #0004',
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
      </div>
    </div>
  );
}

export default ScorePanel;