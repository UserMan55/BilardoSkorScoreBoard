import React, { useState, useEffect } from "react";
import "./TimerProgressBar.css";

function TimerProgressBar({ isTimerRunning, currentTurn, timerPhase, onTimerFinished, resetTrigger, isTimerPaused, activeColor, duration = 30, height }) {
  const [time, setTime] = useState(duration);
  const [pausedColor, setPausedColor] = useState(null); // Pause anındaki rengi tut
  const maxTime = duration;
  const TIMER_SPEED = 1000; // 1000ms = 1sn

  // Reset trigger'ı dinle
  useEffect(() => {
    setTime(duration);
    setPausedColor(null); // Reset sırasında pause rengini temizle
  }, [resetTrigger, duration]);

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
    return seconds.toString();
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
    if (activeColor) {
      barColor = activeColor;
    } else {
      barColor = currentTurn === 0 ? '#FFFFFF' : '#FFD700';
    }
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
    <div className="timer-progress-wrapper" style={height ? { height: `${height}px` } : {}}>
      <div className="progress-bar-container" style={height ? { height: `${height}px` } : {}}>
        <div className="progress-bar" style={height ? { height: `${height}px` } : {}}>
          <div
            className="progress-fill"
            style={{
              width: `${progressPercentage}%`,
              background: barColor
            }}
          ></div>
          <span className="timer-display-text" style={{ fontSize: height && height < 40 ? '24px' : '48px' }}>
            {formatTime(time)}
            {isTimerPaused && ' PAUSED'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TimerProgressBar;
