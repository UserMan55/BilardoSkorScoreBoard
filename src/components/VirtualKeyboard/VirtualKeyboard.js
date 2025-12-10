import React from 'react';
import './VirtualKeyboard.css';

const KEY_ROWS = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'C', 'V', 'B', 'N', 'M'],
  ['CLEAR', 'SPACE', 'BACKSPACE'],
  ['EXIT', 'ENTER']
];

const isNavigationKey = (key) => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
const getKeyId = (rowIndex, colIndex) => `key-${rowIndex}-${colIndex}`;

const VirtualKeyboard = React.forwardRef(function VirtualKeyboard({
  onKeyPress,
  onBackspace,
  onEnter,
  onClear,
  onExit,
  onSpace,
  suppressVerticalNavigation = false,
  disabledKeys = []
}, ref) {
  const containerRef = React.useRef(null);
  const keyRefs = React.useRef({});

  const handleKeyClick = (key) => {
    if (disabledKeys.includes(key)) return;

    if (key === 'BACKSPACE') {
      onBackspace?.();
      return;
    }
    if (key === 'ENTER') {
      onEnter?.();
      return;
    }
    if (key === 'CLEAR') {
      onClear?.();
      return;
    }
    if (key === 'EXIT') {
      onExit?.();
      return;
    }
    if (key === 'SPACE') {
      // Eğer onSpace callback varsa onu çağır, yoksa boşluk karakteri yaz
      if (onSpace) {
        onSpace();
      } else {
        onKeyPress?.(' ');
      }
      return;
    }

    onKeyPress?.(key);
  };

  const focusKey = (rowIndex, colIndex) => {
    const targetId = getKeyId(rowIndex, colIndex);
    const target = keyRefs.current[targetId];
    if (target) {
      target.focus();
    }
  };

  const handleKeyDown = (event, rowIndex, colIndex, keyValue) => {
    // Klavyeden SPACE tuşuna basıldığında
    if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      // Eğer onSpace callback varsa onu çağır (klavye/öneriler geçişi için)
      if (onSpace) {
        onSpace();
      } else {
        // onSpace yoksa normal davranış: üzerinde olunan tuşu bas
        handleKeyClick(keyValue);
      }
      return;
    }
    
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      // Üzerinde olunan tuşu bas (harf, ENTER, BACKSPACE, vs.)
      handleKeyClick(keyValue);
      return;
    }

    if (!isNavigationKey(event.key)) return;

    const isHorizontalNav = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const isVerticalNav = event.key === 'ArrowUp' || event.key === 'ArrowDown';

    event.preventDefault();
    if (isHorizontalNav) {
      event.stopPropagation();
    }

    if (isVerticalNav && suppressVerticalNavigation) {
      return;
    }

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (event.key === 'ArrowLeft') {
      if (colIndex > 0) {
        targetCol = colIndex - 1;
      } else if (rowIndex > 0) {
        targetRow = rowIndex - 1;
        targetCol = KEY_ROWS[targetRow].length - 1;
      } else {
        return;
      }
    } else if (event.key === 'ArrowRight') {
      if (colIndex < KEY_ROWS[rowIndex].length - 1) {
        targetCol = colIndex + 1;
      } else if (rowIndex < KEY_ROWS.length - 1) {
        targetRow = rowIndex + 1;
        targetCol = 0;
      } else {
        return;
      }
    } else if (event.key === 'ArrowUp') {
      if (rowIndex === 0) return;
      targetRow = rowIndex - 1;
      targetCol = Math.min(colIndex, KEY_ROWS[targetRow].length - 1);
    } else if (event.key === 'ArrowDown') {
      if (rowIndex >= KEY_ROWS.length - 1) return;
      targetRow = rowIndex + 1;
      targetCol = Math.min(colIndex, KEY_ROWS[targetRow].length - 1);
    }

    focusKey(targetRow, targetCol);
  };

  React.useImperativeHandle(ref, () => ({
    focusFirstKey: () => focusKey(0, 0),
    blurActiveKey: () => {
      const activeBtn = containerRef.current?.querySelector('.virtual-keyboard__key:focus');
      activeBtn?.blur();
    }
  }));

  return (
    <div className="virtual-keyboard" ref={containerRef}>
      {KEY_ROWS.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="virtual-keyboard__row">
          {row.map((key, colIndex) => {
            const keyId = getKeyId(rowIndex, colIndex);
            const isSpace = key === 'SPACE';
            const isEnter = key === 'ENTER';
            const isExit = key === 'EXIT';
            const buttonClassNames = [
              'virtual-keyboard__key',
              isEnter ? 'virtual-keyboard__key--accent' : '',
              isSpace ? 'virtual-keyboard__key--space' : '',
              isExit ? 'virtual-keyboard__key--danger' : '',
              key === 'CLEAR' || key === 'BACKSPACE' ? 'virtual-keyboard__key--wide' : ''
            ].join(' ').trim();

            return (
              <button
                key={keyId}
                type="button"
                className={buttonClassNames}
                onClick={() => handleKeyClick(key)}
                onKeyDown={(event) => handleKeyDown(event, rowIndex, colIndex, key)}
                disabled={disabledKeys.includes(key)}
                ref={(el) => {
                  if (el) {
                    keyRefs.current[keyId] = el;
                  } else {
                    delete keyRefs.current[keyId];
                  }
                }}
              >
                {key === 'SPACE' ? 'SPACE' : key === 'BACKSPACE' ? '⌫' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

export default VirtualKeyboard;
