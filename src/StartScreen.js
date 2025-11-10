import React, { useEffect, useState } from "react";
import { getPlayerNames } from "./firebase";
import "./StartScreen.css";

function StartScreen({ onStart }) {
  const [names, setNames] = useState([]);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchNames() {
      try {
        const result = await getPlayerNames();
        console.log("Oyuncu isimleri:", result);
        setNames(result);
        if (!result || result.length === 0) {
          setError("Veritabanında oyuncu ismi bulunamadı.");
        }
      } catch (err) {
        setError("Veri çekilemedi: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNames();
  }, []);

  const handleStart = () => {
    if (player1 && player2 && player1 !== player2) {
      onStart(player1, player2, targetScore, targetRack);
    } else {
      alert("Farklı iki oyuncu seçmelisiniz.");
    }
  };

  if (loading) return <div className="loading-container">Yükleniyor...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="start-screen-wrapper">
      <div className="start-screen-panel">
        <h1 className="panel-title">Oyuncu Seçimi</h1>
        
        <div className="player-selection">
          <div className="player-input-group">
            <label className="player-label">1. Oyuncu</label>
            <select 
              value={player1} 
              onChange={e => setPlayer1(e.target.value)}
              className="player-select"
            >
              <option value="">Seçiniz</option>
              {names.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="vs-divider">VS</div>

          <div className="player-input-group">
            <label className="player-label">2. Oyuncu</label>
            <select 
              value={player2} 
              onChange={e => setPlayer2(e.target.value)}
              className="player-select"
            >
              <option value="">Seçiniz</option>
              {names.filter(name => name !== player1).map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
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

        <button 
          className={`start-button ${(player1 && player2) ? "active" : "disabled"}`}
          onClick={handleStart}
          disabled={!player1 || !player2}
        >
          Maçı Başlat
        </button>
      </div>
    </div>
  );
}

export default StartScreen;
