import React, { useEffect, useState } from "react";
import { getPlayerNames } from "./firebase";
import "./StartScreen.css";

function StartScreen({ onStart }) {
  const [names, setNames] = useState([]);
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [targetScore, setTargetScore] = useState(30);
  const [targetRack, setTargetRack] = useState(30);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [hasAso, setHasAso] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
      onStart(player1, player2, targetScore, targetRack, hasPenalty, hasAso);
    } else {
      setErrorMessage("⚠️ Farklı iki oyuncu seçmelisiniz!");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  if (loading) return <div className="loading-container">Yükleniyor...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="start-screen-wrapper">
      {/* Error Notification */}
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          padding: '30px 50px',
          borderRadius: '15px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {errorMessage}
        </div>
      )}

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
