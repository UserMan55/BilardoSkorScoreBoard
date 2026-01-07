import { useEffect } from 'react';

/**
 * Android TV Medya Tuşlarını (Ses, Kanal) Yön Tuşlarına Çevirir
 * 
 * VolumeUp   -> ArrowRight (Sayı Ver)
 * VolumeDown -> ArrowLeft  (Sayı Sil)
 * ChannelUp  -> ArrowUp    (Sıra Değiştir / Menü)
 * ChannelDown-> ArrowDown  (Sıra Değiştir / Menü)
 */
const useMediaKeyToDirection = (isEnabled = true) => {
    useEffect(() => {
        if (!isEnabled) return;

        const handleKeyDown = (e) => {
            let targetKey = null;

            // Tuş eşleştirmeleri
            switch (e.key) {
                case 'AudioVolumeUp':
                case 'VolumeUp':
                    targetKey = 'ArrowRight';
                    break;
                case 'AudioVolumeDown':
                case 'VolumeDown':
                    targetKey = 'ArrowLeft';
                    break;
                case 'ChannelUp':
                case 'PageUp': // Bazı kumandalar PageUp gönderir
                    targetKey = 'ArrowUp';
                    break;
                case 'ChannelDown':
                case 'PageDown':
                    targetKey = 'ArrowDown';
                    break;
                case 'MediaTrackNext':
                    targetKey = 'ArrowRight';
                    break;
                case 'MediaTrackPrevious':
                    targetKey = 'ArrowLeft';
                    break;
                default:
                    return; // Eşleşme yoksa çık
            }

            if (targetKey) {
                console.log(`📺 Medya Tuşu (${e.key}) -> Yön Tuşuna (${targetKey}) çevrildi.`);

                // Varsayılan davranışı (ses açma vb.) engelle
                e.preventDefault();
                e.stopPropagation();

                // Yeni event fırlat
                const event = new KeyboardEvent('keydown', {
                    key: targetKey,
                    code: targetKey,
                    keyCode: targetKey === 'ArrowLeft' ? 37 :
                        targetKey === 'ArrowUp' ? 38 :
                            targetKey === 'ArrowRight' ? 39 :
                                targetKey === 'ArrowDown' ? 40 : 0,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                window.dispatchEvent(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled]);
};

export default useMediaKeyToDirection;
