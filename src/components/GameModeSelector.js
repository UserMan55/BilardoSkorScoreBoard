import React from 'react';

const GameModeSelector = React.memo(({ focusedIndex, onFreeStart, onStandardStart, onSurvivalStart }) => {
  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {/* Serbest Maç */}
      <button 
        tabIndex="1"
        className={`mode-card free-mode ${focusedIndex === 1 ? 'focused' : 'blurred'}`}
        onClick={onFreeStart}
      >
        <div style={{ fontSize: '24px', marginBottom: '5px' }}>♾️</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>SERBEST MAÇ</span>
          <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.9, textTransform: 'none', marginTop: '5px' }}>Hızlı maç, kayıt yok</span>
        </div>
      </button>

      {/* 3D Score Modu */}
      <button 
        tabIndex="2"
        className={`mode-card standard-mode ${focusedIndex === 2 ? 'focused' : 'blurred'}`}
        onClick={onStandardStart}
      >
        <img src="/3-balls.png" alt="3CScore" style={{ width: '50px', height: 'auto', marginBottom: '5px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>3D SCORE MODU</span>
          <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.9, textTransform: 'none', marginTop: '5px' }}>İsimli, kayıtlı maç</span>
        </div>
      </button>

      {/* Survival Modu */}
      <button 
        tabIndex="3"
        className={`mode-card survival-mode ${focusedIndex === 3 ? 'focused' : 'blurred'}`}
        onClick={onSurvivalStart}
      >
        <img src="/survival.png" alt="Survival" style={{ width: '50px', height: 'auto', marginBottom: '5px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>SURVIVAL MODU</span>
          <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.9, textTransform: 'none', marginTop: '5px' }}>3-4 kişilik hayatta kalma</span>
        </div>
      </button>
    </div>
  );
});

export default GameModeSelector;
