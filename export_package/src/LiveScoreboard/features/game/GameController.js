import React, { useState, useEffect } from "react";
import "./GameController.css";

function GameController({ 
  onPlusRun, 
  onMinusRun, 
  onToggleTimer, 
  onOk, 
  onExit, 
  onUndo, 
  isTimerRunning, 
  currentPlayerName, 
  currentTurn, 
  isVisible, 
  onToggleVisibility, 
  gameEnded = false, 
  currentScore = 0, 
  runCount = 0, 
  targetScore = 30, 
  canUndo = false,
  mode = 'floating', // 'floating' | 'fullscreen' | 'embedded'
  onLeftMenu = null, // Sol menü butonu callback
  onRightMenu = null // Sağ menü butonu callback
}) {
  const [position, setPosition] = useState({ x: window.innerWidth - 220, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Mobil algılama
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Hedef skora ulaşıldı mı kontrolü
  const totalScore = currentScore + runCount;
  const isTargetReached = totalScore >= targetScore;
  const isPlusDisabled = gameEnded || (currentScore + runCount + 1) > targetScore;
  
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
    return null;
  }

  // Mobil veya fullscreen modda otomatik tam ekran
  const isFullscreen = mode === 'fullscreen' || (mode === 'floating' && isMobile);
  const isEmbedded = mode === 'embedded';

  // Fullscreen için wrapper
  if (isFullscreen) {
    return (
      <div className="remote-fullscreen-overlay">
        <div className="remote-fullscreen-container">
          <RemoteBody 
            {...{
              onPlusRun, onMinusRun, onToggleTimer, onOk, onExit, onUndo,
              isTimerRunning, gameEnded, isPlusDisabled: gameEnded || (currentScore + runCount + 1) > targetScore,
              canUndo, isTargetReached: (currentScore + runCount) >= targetScore,
              numpadOpen, setNumpadOpen, onLeftMenu, onRightMenu,
              mode: 'fullscreen'
            }}
          />
        </div>
      </div>
    );
  }

  // Embedded mod (başka komponentlere gömülebilir)
  if (isEmbedded) {
    return (
      <div className="remote-embedded">
        <RemoteBody 
          {...{
            onPlusRun, onMinusRun, onToggleTimer, onOk, onExit, onUndo,
            isTimerRunning, gameEnded, isPlusDisabled: gameEnded || (currentScore + runCount + 1) > targetScore,
            canUndo, isTargetReached: (currentScore + runCount) >= targetScore,
            numpadOpen, setNumpadOpen, onLeftMenu, onRightMenu,
            mode: 'embedded'
          }}
        />
      </div>
    );
  }

  // Floating mod (sürüklenebilir)
  return (
    <div 
      className="remote-controller"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleDragStart}
    >
      <RemoteBody 
        {...{
          onPlusRun, onMinusRun, onToggleTimer, onOk, onExit, onUndo,
          isTimerRunning, gameEnded, isPlusDisabled: gameEnded || (currentScore + runCount + 1) > targetScore,
          canUndo, isTargetReached: (currentScore + runCount) >= targetScore,
          numpadOpen, setNumpadOpen, onLeftMenu, onRightMenu,
          mode: 'floating'
        }}
      />
    </div>
  );
}

// Remote Body Component - Yeniden kullanılabilir
function RemoteBody({ 
  onPlusRun, onMinusRun, onToggleTimer, onOk, onExit, onUndo,
  isTimerRunning, gameEnded, isPlusDisabled, canUndo, isTargetReached,
  numpadOpen, setNumpadOpen, onLeftMenu, onRightMenu, mode
}) {
  return (
    <div className={`remote-body remote-body-${mode}`}>
        {/* Logo/Brand Area */}
        <div className="remote-header">
          <div className="remote-brand">3C SCORE</div>
        </div>

        {/* Power and Mute Buttons */}
        <div className="remote-top-buttons">
          <button 
            className="remote-btn power-btn"
            onClick={onExit}
            title="Maçı Sonlandır"
            disabled={false}
          >
            <span className="power-icon">⏻</span>
          </button>
          <button 
            className="remote-btn mute-btn"
            onClick={onUndo}
            title="Geri Al (Ctrl+Z)"
            disabled={gameEnded || !canUndo}
            style={{ opacity: (gameEnded || !canUndo) ? 0.4 : 1 }}
          >
            <span className="undo-icon">↶</span>
          </button>
        </div>

        {/* Directional Pad Area */}
        <div className="remote-dpad-section">
          <div className="dpad-container">
            {/* Up Button (Plus) */}
            <button 
              className="dpad-btn dpad-up"
              onClick={onPlusRun}
              disabled={isPlusDisabled}
              title="Artır (+)"
              style={{ opacity: isPlusDisabled ? 0.4 : 1 }}
            >
              <span className="dpad-arrow">▲</span>
            </button>
            
            {/* Left Button (Menu) */}
            <button 
              className="dpad-btn dpad-left dpad-menu"
              onClick={onLeftMenu}
              disabled={!gameEnded && !onLeftMenu}
              title="Menü (Sol)"
              style={{ opacity: (gameEnded || onLeftMenu) ? 0.6 : 0.3 }}
            >
              <span className="dpad-arrow">◀</span>
            </button>
            
            {/* Center OK Button */}
            <button 
              className="dpad-btn dpad-center"
              onClick={onOk}
              disabled={gameEnded}
              title="OK - Onayla"
              style={{ opacity: gameEnded ? 0.4 : 1 }}
            >
              <span className="ok-text">OK</span>
            </button>
            
            {/* Right Button (Menu) */}
            <button 
              className="dpad-btn dpad-right dpad-menu"
              onClick={onRightMenu}
              disabled={!gameEnded && !onRightMenu}
              title="Menü (Sağ)"
              style={{ opacity: (gameEnded || onRightMenu) ? 0.6 : 0.3 }}
            >
              <span className="dpad-arrow">▶</span>
            </button>
            
            {/* Down Button (Minus) */}
            <button 
              className="dpad-btn dpad-down"
              onClick={onMinusRun}
              disabled={gameEnded}
              title="Azalt (−)"
              style={{ opacity: gameEnded ? 0.4 : 1 }}
            >
              <span className="dpad-arrow">▼</span>
            </button>
          </div>
        </div>

        {/* Timer Button (Big, Horizontal) */}
        <div className="remote-timer-section">
          <button 
            className={`timer-big-btn ${isTimerRunning ? 'timer-active' : ''}`}
            onClick={onToggleTimer}
            disabled={gameEnded}
            title="Süreyi Başlat/Durdur"
            style={{ opacity: gameEnded ? 0.4 : 1 }}
          >
            <span className="timer-icon">⏱</span>
            <span className="timer-label">{isTimerRunning ? 'DURDUR' : 'BAŞLAT'}</span>
          </button>
        </div>

        {/* Number Pad Accordion Toggle */}
        <div className="remote-numpad-toggle">
          <button 
            className="numpad-toggle-btn"
            onDoubleClick={() => setNumpadOpen(!numpadOpen)}
            title="Çift tıkla - Numpad Aç/Kapat"
          >
            <span className="toggle-icon">{numpadOpen ? '▲' : '▼'}</span>
            <span className="toggle-text">NUMPAD</span>
          </button>
        </div>

        {/* Number Pad Grid (Accordion) */}
        {numpadOpen && (
          <div className="remote-numpad">
            <div className="numpad-row">
              <button className="num-btn" disabled>1</button>
              <button className="num-btn" disabled>2</button>
              <button className="num-btn" disabled>3</button>
            </div>
            <div className="numpad-row">
              <button className="num-btn" disabled>4</button>
              <button className="num-btn" disabled>5</button>
              <button className="num-btn" disabled>6</button>
            </div>
            <div className="numpad-row">
              <button className="num-btn" disabled>7</button>
              <button className="num-btn" disabled>8</button>
              <button className="num-btn" disabled>9</button>
            </div>
            <div className="numpad-row">
              <button className="num-btn num-btn-wide" disabled>0</button>
            </div>
          </div>
        )}

        {/* Bottom Control Buttons */}
        <div className="remote-bottom">
          <button 
            className="remote-btn exit-remote-btn"
            onClick={onExit}
            title="EXIT"
          >
            EXIT
          </button>
        </div>

        {/* Warning Overlay */}
        {isTargetReached && !gameEnded && (
          <div className="remote-warning">
            <div className="warning-pulse">⚠️</div>
            <div className="warning-text">HEDEF PUAN</div>
            <div className="warning-subtext">OK'a basın</div>
          </div>
        )}
      </div>
    );
  }

export default GameController;
