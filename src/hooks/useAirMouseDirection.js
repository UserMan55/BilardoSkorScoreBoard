import { useEffect, useRef } from 'react';

/**
 * Air Mouse D-pad hareketlerini (mouse pointer hareketi olarak gelen)
 * standart Klavye Yön Tuşlarına (ArrowKeys) çeviren hook.
 * 
 * @param {boolean} isEnabled - Hook'un aktif olup olmadığı
 */
const useAirMouseDirection = (isEnabled = true) => {
    const movementBuffer = useRef({ x: 0, y: 0 });
    const resetTimer = useRef(null);

    // Son tetikleme zamanı (debounce için)
    const lastTriggerTime = useRef(0);

    useEffect(() => {
        if (!isEnabled) return;

        // --- CSS İLE MOUSE İMLECİNİ GİZLE ---
        const style = document.createElement('style');
        style.innerHTML = `* { cursor: none !important; }`;
        style.id = 'air-mouse-hide-cursor';
        document.head.appendChild(style);

        // --- HASSASİYET AYARLARI (GECİKMESİZ MOD) ---
        const MOVEMENT_THRESHOLD = 25; // 8px -> 25px (Daha kararlı, titremeyi önler)
        const BUFFER_RESET_TIME = 50;  // 100ms -> 50ms (Hızlı sıfırlama)

        const triggerKey = (key) => {
            console.log('🖱️ Air Mouse -> Klavye:', key);

            // Keyboard Event oluştur ve fırlat
            const event = new KeyboardEvent('keydown', {
                key: key,
                code: key,
                keyCode: key === 'ArrowLeft' ? 37 :
                    key === 'ArrowUp' ? 38 :
                        key === 'ArrowRight' ? 39 :
                            key === 'ArrowDown' ? 40 : 0,
                bubbles: true,
                cancelable: true,
                view: window
            });

            window.dispatchEvent(event);
        };


        const handleMovement = (dx, dy) => {
            movementBuffer.current.x += dx;
            movementBuffer.current.y += dy;

            // X ekseninde hareket
            if (Math.abs(movementBuffer.current.x) > MOVEMENT_THRESHOLD) {
                if (movementBuffer.current.x > 0) triggerKey('ArrowRight');
                else triggerKey('ArrowLeft');

                movementBuffer.current = { x: 0, y: 0 };
                return;
            }

            // Y ekseninde hareket
            if (Math.abs(movementBuffer.current.y) > MOVEMENT_THRESHOLD) {
                if (movementBuffer.current.y > 0) triggerKey('ArrowDown');
                else triggerKey('ArrowUp');

                movementBuffer.current = { x: 0, y: 0 };
                return;
            }
        };

        const onPointerMove = (e) => {
            // movementX/Y değerleri varsa kullan
            const dx = e.movementX || 0;
            const dy = e.movementY || 0;

            // Hareket yoksa çık
            if (dx === 0 && dy === 0) return;

            handleMovement(dx, dy);

            // Buffer reset zamanlayıcısı
            clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => {
                movementBuffer.current = { x: 0, y: 0 };
            }, BUFFER_RESET_TIME);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('mousemove', onPointerMove);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('mousemove', onPointerMove);
            clearTimeout(resetTimer.current);
            // Style'ı temizle
            const el = document.getElementById('air-mouse-hide-cursor');
            if (el) el.remove();
        };
    }, [isEnabled]);
};

export default useAirMouseDirection;
