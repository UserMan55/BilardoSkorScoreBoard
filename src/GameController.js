import React, { useState, useEffect } from "react";
import "./GameController.css";

function GameController({ onPlusRun, onMinusRun, onToggleTimer, onOk, isTimerRunning, currentPlayerName, currentTurn, isVisible, onToggleVisibility }) {
  const [time, setTime] = useState(40);
  const maxTime = 40;
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 0) {
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleMouseDown = (e) => {
    // Tutma bölgesinin içinde olup olmadığını kontrol et
    if (!e.currentTarget.classList.contains('drag-handle')) {
      return;
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleDragHandleDoubleClick = (e) => {
    e.preventDefault();
    onToggleVisibility();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  if (!isVisible) {
    return null; // Gizlendiğinde hiçbir şey gösterme, toggle için ayrı icon App.js'de olacak
  }

  return (
    <div 
      className="game-controller-modal"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="game-controller-wrapper">
        {/* Tutma Bölgesi */}
        <div 
          className="drag-handle"
          onMouseDown={handleDragStart}
          onDoubleClick={handleDragHandleDoubleClick}
        >
          <div className="drag-handle-bar"></div>
        </div>

        <div className="game-controller">
          {/* Üst satır: Minus, Plus, OK */}
          <div className="controller-buttons top-buttons">
            <button 
              className="controller-btn minus-btn"
              onClick={onMinusRun}
              title="Run Sayısını Azalt"
            >
              <span className="btn-symbol">−</span>
              <span className="btn-label">Minus</span>
            </button>

            <button 
              className="controller-btn plus-btn"
              onClick={onPlusRun}
              title="Run Sayısını Artır"
            >
              <span className="btn-symbol">+</span>
              <span className="btn-label">Plus</span>
            </button>

            <button 
              className="controller-btn ok-btn"
              onClick={onOk}
              title="Onayla ve Sıra Değiştir"
            >
              <span className="btn-symbol">OK</span>
              <span className="btn-label">Onayla</span>
            </button>
          </div>

          {/* Alt satır: Timer Başlat */}
          <div className="controller-buttons bottom-buttons">
            <button 
              className={`controller-btn timer-btn ${isTimerRunning ? 'active' : ''}`}
              onClick={onToggleTimer}
              title="Süreyi Başlat/Durdur"
            >
              <span className="btn-symbol">⏱</span>
              <span className="btn-label">{isTimerRunning ? 'Durdur' : 'Başlat'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameController;
