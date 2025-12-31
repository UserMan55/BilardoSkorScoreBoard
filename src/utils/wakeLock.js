/**
 * Wake Lock Yönetimi (Ekranı Açık Tutma)
 * Hem Modern API hem de Legacy Video Fallback yöntemini kullanır.
 * Özellikle Smart TV'lerin ekran koruyucuya girmesini engellemek için kritiktir.
 */

// Sessiz, 1x1 piksellik WebM videosu (Base64) - NoSleep tekniği için
const NO_SLEEP_VIDEO_WEBM = "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu44FCPA==";
const NO_SLEEP_VIDEO_MP4 = "data:video/mp4;base64,AAAAHGZ0eXBNNEV-AAAAAAEzYXZjMQAAAAA="; // Kısaltılmış dummy, normalde video dosyası gerekir

let wakeLockSentinel = null;
let noSleepVideo = null;
let intervalId = null;

/**
 * Wake Lock'u aktifleştir
 */
export const requestWakeLock = async () => {
    console.log("💡 WakeLock: İstek başlatılıyor...");

    // 1. Yöntem: Native Wake Lock API (Chrome, Edge, Android, Samsung Internet)
    try {
        if ('wakeLock' in navigator) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            console.log("💡 WakeLock: Native API başarılı (Active)");

            wakeLockSentinel.addEventListener('release', () => {
                console.log("💡 WakeLock: Native API serbest bırakıldı (Released)");
            });
        } else {
            console.log("💡 WakeLock: Native API desteklenmiyor.");
        }
    } catch (err) {
        console.warn(`💡 WakeLock: Native API hatası: ${err.name}, ${err.message}`);
    }

    // 2. Yöntem: Video Fallback (WebOS, Tizen, iOS ve Native API'nin çalışmadığı durumlar için)
    // Bir video oynatarak TV'nin uyku moduna girmesini engelleriz.
    try {
        if (!noSleepVideo) {
            noSleepVideo = document.createElement('video');
            noSleepVideo.setAttribute('playsinline', '');
            noSleepVideo.setAttribute('muted', '');
            noSleepVideo.setAttribute('loop', '');
            noSleepVideo.style.position = 'absolute';
            noSleepVideo.style.width = '1px';
            noSleepVideo.style.height = '1px';
            noSleepVideo.style.opacity = '0.01'; // Tamamen görünmez değil ama farkedilmez
            noSleepVideo.style.pointerEvents = 'none';
            noSleepVideo.style.zIndex = '-9999';

            // Kaynak ekle
            const sourceWebm = document.createElement('source');
            sourceWebm.src = NO_SLEEP_VIDEO_WEBM;
            sourceWebm.type = 'video/webm';
            noSleepVideo.appendChild(sourceWebm);

            document.body.appendChild(noSleepVideo);

            // Kullanıcı etkileşimi gerektiği için ilk play catch'e düşebilir
            // Ancak App.js içinde user interaction sonrası tekrar denenebilir
            const playPromise = noSleepVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("💡 WakeLock: Video hack çalışıyor 🎥");
                }).catch(err => {
                    console.warn("💡 WakeLock: Video otomatik başlatılamadı (Kullanıcı etkileşimi gerekebilir)", err);
                    // Video play başarısız olursa, sayfada bir yere tıklanınca tekrar dene
                    const unlockHandler = () => {
                        noSleepVideo.play().then(() => {
                            console.log("💡 WakeLock: Video hack kullanıcı etkileşimi ile başladı 🎥");
                            document.removeEventListener('click', unlockHandler);
                            document.removeEventListener('touchstart', unlockHandler);
                        });
                    };
                    document.addEventListener('click', unlockHandler);
                    document.addEventListener('touchstart', unlockHandler);
                });
            }
        }
    } catch (err) {
        console.error("💡 WakeLock: Video hack hatası:", err);
    }

    // 3. Yöntem: Periyodik "Hayalet" İşlem (TV'ler için ekstra önlem)
    // Bazı TV'ler video olsa bile DOM değişmeyince uykuya geçebilir.
    if (!intervalId) {
        intervalId = setInterval(() => {
            // Çok küçük bir DOM manipülasyonu yaparak browser engine'i canlı tut
            const ghost = document.getElementById('wake-lock-ghost');
            if (ghost) {
                ghost.style.opacity = ghost.style.opacity === '0.01' ? '0.02' : '0.01';
            } else {
                const el = document.createElement('div');
                el.id = 'wake-lock-ghost';
                el.style.position = 'fixed';
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '1px';
                el.style.height = '1px';
                el.style.opacity = '0.01';
                el.style.pointerEvents = 'none';
                document.body.appendChild(el);
            }
        }, 30000); // 30 saniyede bir
    }
};

/**
 * Wake Lock'u serbest bırak
 */
export const releaseWakeLock = () => {
    console.log("💡 WakeLock: Durduruluyor...");

    // Native
    if (wakeLockSentinel) {
        wakeLockSentinel.release().then(() => {
            wakeLockSentinel = null;
        });
    }

    // Video
    if (noSleepVideo) {
        noSleepVideo.pause();
        if (noSleepVideo.parentNode) {
            noSleepVideo.parentNode.removeChild(noSleepVideo);
        }
        noSleepVideo = null;
    }

    // Interval
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
};

/**
 * Sayfa görünürlüğü değiştiğinde (Tab değişimi, minimize vb.) Wake Lock'u yönet
 * Native API genellikle sayfa gizlenince kilidi bırakır, geri gelince tekrar istemek gerekir.
 */
export const setupWakeLockVisibilityHandler = () => {
    document.addEventListener('visibilitychange', async () => {
        if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });
};
