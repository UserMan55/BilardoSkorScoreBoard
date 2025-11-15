import React, { useState, useEffect } from "react";
import "./TimerProgressBar.css";

function TimerProgressBar({ isTimerRunning, currentTurn, timerPhase, onTimerFinished, resetTrigger, isTimerPaused }) {
  const [time, setTime] = useState(40);
  const [pausedColor, setPausedColor] = useState(null); // Pause anındaki rengi tut
  const maxTime = 40;
  const TIMER_SPEED = 100; // Test için hız: 100ms = 1sn (normal 1000ms)

  // Reset trigger'ı dinle
  useEffect(() => {
    setTime(40);
    setPausedColor(null); // Reset sırasında pause rengini temizle
  }, [resetTrigger]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timerPhase === 'running') {
      interval = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            // Timer bittiğinde callback çağır
            onTimerFinished && onTimerFinished();
            return 0;
          }
          return newTime;
        });
      }, TIMER_SPEED); // Test için hızlı timer
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerPhase, onTimerFinished]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pause durumunda rengi güncelle
  useEffect(() => {
    if (!isTimerRunning && isTimerPaused && pausedColor === null) {
      if (time < 10) {
        setPausedColor('#FF0000');
      } else if (time < 20) {
        setPausedColor('#FFD700');
      } else {
        setPausedColor('#00FF00');
      }
    } else if (!isTimerRunning && !isTimerPaused) {
      setPausedColor(null);
    }
  }, [isTimerRunning, isTimerPaused, pausedColor, time]);

  const progressPercentage = (time / maxTime) * 100;
  
  // Renk mantığı: Timer çalışıyorsa yeşil, durmuşsa oyuncu sırasına göre, ama kalan süreye göre uyar
  let barColor = '#00FF00'; // Default: çalışırken yeşil
  
  if (!isTimerRunning && isTimerPaused) {
    // PAUSED durumunda: durdurma anındaki rengi koru
    barColor = pausedColor || '#00FF00';
  } else if (!isTimerRunning) {
    // Timer durmuşken (sıra değişti) oyuncu rengine göre
    barColor = currentTurn === 0 ? '#FFFFFF' : '#FFD700';
  } else {
    // Timer çalışırken kalan süreye göre
    if (time < 10) {
      barColor = '#FF0000'; // Kırmızı: 10sn altı
    } else if (time < 20) {
      barColor = '#FFD700'; // Sarı: 20sn altı
    } else {
      barColor = '#00FF00'; // Yeşil: 20sn üstü
    }
  }

  return (
    <div className="timer-progress-wrapper">
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${progressPercentage}%`,
              background: barColor
            }}
          ></div>
          <span className="timer-display-text">
            {formatTime(time)}
            {isTimerPaused && ' PAUSED'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TimerProgressBar;
