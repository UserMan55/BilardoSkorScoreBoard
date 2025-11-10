import React, { useState } from 'react';
import PlayerPanel from './PlayerPanel';
import ScorePanel from './ScorePanel';
import StatusBar from './StatusBar';
import StartScreen from './StartScreen';


function App() {
  const [started, setStarted] = useState(false);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);

  const handleStart = (p1, p2, tScore, tRack) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setTargetScore(tScore);
    setTargetRack(tRack);
    setStarted(true);
  };

  if (!started) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#212529',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Sol üst köşede hedef bilgisi */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: 10,
        border: '2px solid #667eea'
      }}>
        <div style={{ marginBottom: '8px' }}>Hedef Sayı: <span style={{ color: '#FFD700', fontSize: '18px' }}>{targetScore}</span></div>
        <div>Hedef İstaka: <span style={{ color: '#FFD700', fontSize: '18px' }}>{targetRack}</span></div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        gap: '32px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <PlayerPanel
          name={player1}
          score={0}
          hr1={0}
          hr2={0}
          avg={0}
          bg="#3b3b3b"
          timeout1Used={false}
          timeout2Used={false}
          playerIndex={0}
        />
        <ScorePanel inning={0} run={0} />
        <PlayerPanel
          name={player2}
          score={0}
          hr1={0}
          hr2={0}
          avg={0}
          bg="#22283e"
          timeout1Used={false}
          timeout2Used={false}
          playerIndex={1}
        />
      </div>
      <StatusBar value={0} />
    </div>
  );
}

export default App;