import React from 'react';
import PlayerPanel from './PlayerPanel';
import ScorePanel from './ScorePanel';
import StatusBar from './StatusBar';

function App() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#212529', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: '24px 32px 0 32px' }}>
        <PlayerPanel
          name="OSMAN DEMIREL"
          score={20}
          hr1={3} hr2={2} avg={1.000}
          bg="#3b3b3b"
        />
        <ScorePanel inning={20} run={1} />
        <PlayerPanel
          name="ERKAN ARIK"
          score={21}
          hr1={4} hr2={3} avg={1.105}
          bg="#22283e"
        />
      </div>
      <StatusBar value={36} greenCount={10} yellowCount={4} redCount={5} />
    </div>
  );
}

export default App;