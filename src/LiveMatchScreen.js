import React, { useState } from "react";
import "./LiveMatchScreen.css";

function LiveMatchScreen({ player1, player2, onStart }) {
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [hasAso, setHasAso] = useState(true);

  const handleStart = () => {
    onStart(player1, player2, targetScore, targetRack, hasPenalty, hasAso);
  };

  return (
    <div className="live-match-wrapper">
      <div className="live-match-panel">
        <h1 className="panel-title">Canlı Maç Başlat</h1>
        
        <div className="player-selection">
          <div className="player-input-group">
            <label className="player-label">1. Oyuncu</label>
            <div className="player-display">
              {player1}
            </div>
          </div>

          <div className="vs-divider">VS</div>

          <div className="player-input-group">
            <label className="player-label">2. Oyuncu</label>
            <div className="player-display">
              {player2}
            </div>
          </div>
        </div>

        <div className="match-settings">
          <div className="setting-group">
            <label className="setting-label">Hedef Sayı</label>
            <div className="setting-control-bar">
              <button 
                className="setting-control-btn left"
                onClick={() => setTargetScore(Math.max(15, targetScore - 5))}
              >
                −5
              </button>
              <span className="setting-value-text">Hedef: {targetScore}</span>
              <button 
                className="setting-control-btn right"
                onClick={() => setTargetScore(Math.min(50, targetScore + 5))}
              >
                +5
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Hedef İstaka</label>
            <div className="setting-control-bar">
              <button 
                className="setting-control-btn left"
                onClick={() => setTargetRack(Math.max(15, targetRack - 5))}
              >
                −5
              </button>
              <span className="setting-value-text">Hedef: {targetRack}</span>
              <button 
                className="setting-control-btn right"
                onClick={() => setTargetRack(Math.min(50, targetRack + 5))}
              >
                +5
              </button>
            </div>
          </div>
        </div>

        <div className="match-options">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={hasPenalty} 
              onChange={(e) => setHasPenalty(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-label">Penaltı Var</span>
          </label>
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={hasAso} 
              onChange={(e) => setHasAso(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-label">ASO Var</span>
          </label>
        </div>

        <button 
          className="start-button active"
          onClick={handleStart}
        >
          Maçı Başlat
        </button>
      </div>
    </div>
  );
}

export default LiveMatchScreen;
