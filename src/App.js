import React from 'react';
import PlayerPanel from './PlayerPanel';
import ScorePanel from './ScorePanel';
import StatusBar from './StatusBar';

function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#212529',
      display: 'flex',
      flexDirection: 'column'
    }}>
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
          name="İbrahim TOPYILDIZ"
          score={20}
          hr1={3}
          hr2={2}
          avg={1.000}
          bg="#3b3b3b"
          timeout1Used={false}
          timeout2Used={false}
          playerIndex={0}
        />
        <ScorePanel inning={20} run={1} />
        <PlayerPanel
          name="İlhami İLHAN"
          score={21}
          hr1={4}
          hr2={3}
          avg={0.960}
          bg="#22283e"
          timeout1Used={false}
          timeout2Used={false}
          playerIndex={1}
        />
      </div>
      <StatusBar value={40} />
    </div>
  );
}

export default App;