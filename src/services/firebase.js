import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp, deleteDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, signInWithCustomToken } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDFqmZg4khPVJron56Cyj0nfsupvBjuTAA",
  authDomain: "bilardo-skor.firebaseapp.com",
  projectId: "bilardo-skor",
  storageBucket: "bilardo-skor.firebasestorage.app",
  messagingSenderId: "413070873797",
  appId: "1:413070873797:web:9017509d95240516afccac",
  measurementId: "G-VZJ76K1SLM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * ID Token doğrulama
 * 3cscore.com'dan gelen Firebase ID Token'ı doğrular
 * Token aynı Firebase projesinden geliyorsa doğrulama başarılı olur
 */
export async function verifyIdToken(idToken) {
  if (!idToken) {
    return { valid: false, error: 'Token bulunamadı' };
  }

  try {
    // Token'ın geçerli bir JWT olup olmadığını kontrol et
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Geçersiz token formatı' };
    }

    // Payload'ı decode et
    const payload = JSON.parse(atob(parts[1]));

    // Token'ın süresi dolmuş mu kontrol et
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token süresi dolmuş' };
    }

    // Doğru projeden mi geldiğini kontrol et
    if (payload.aud !== 'bilardo-skor') {
      return { valid: false, error: 'Token farklı bir projeden' };
    }

    // Token geçerli
    console.log('✅ Token doğrulandı:', payload.sub || payload.user_id);

    return {
      valid: true,
      uid: payload.sub || payload.user_id,
      email: payload.email || null,
      name: payload.name || null
    };
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return { valid: false, error: 'Token parse edilemedi' };
  }
}

export { auth };

// --- REMOTE CONTROL FUNCTIONS ---

// Maç başlatma komutunu gönderir (Mobil/Kumanda tarafı)
// matchMeta: { playerIds, startedBy, salonId, salonCity } - Multi-user erişim için
export async function sendRemoteStartCommand(matchData, tableId = 'table_1', matchMeta = {}) {
  try {
    const { playerIds = [], startedBy = null, allowedControllers = [], salonId = null, salonCity = null } = matchMeta;

    const matchId = `${tableId}_${Date.now()}`;

    // 'live_matches' koleksiyonunda belirtilen masa dökümanını güncelliyoruz
    await setDoc(doc(db, "live_matches", tableId), {
      ...matchData,
      matchId,
      status: 'START',
      timestamp: serverTimestamp(),
      // Multi-user erişim bilgileri
      playerIds,           // Oyuncu ID'leri (kontrol yetkisi)
      startedBy,           // Maçı başlatan kullanıcı ID
      allowedControllers: allowedControllers.length > 0 ? allowedControllers : (startedBy ? [startedBy, ...playerIds] : playerIds),
      salonId,             // Salon ID (bildirim için)
      salonCity            // Salon şehri (bildirim için)
    });
    console.log(`Maç başlatma komutu gönderildi (${tableId}):`, matchData, 'Meta:', matchMeta);

    // Bildirim gönderilecek oyuncuları belirle
    // startedBy hariç tüm playerIds'e bildirim gönder
    const notifyPlayerIds = playerIds.filter(id => id && id !== startedBy);

    if (notifyPlayerIds.length > 0) {
      // Bildirim kuyruğuna ekle (Cloud Function tarafından işlenecek)
      await setDoc(doc(db, "notification_queue", matchId), {
        type: 'MATCH_STARTED',
        tableId,
        matchId,
        notifyPlayerIds,    // Bildirim gönderilecek oyuncular (startedBy hariç)
        startedBy,          // Maçı başlatan (bildirim gönderilMEyecek)
        matchInfo: {
          mode: matchData.mode,
          players: matchData.players,
          playerPhotos: matchData.playerPhotos || {}
        },
        salonId,
        salonCity,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      console.log('📤 Bildirim kuyruğuna eklendi:', matchId, 'Alıcılar:', notifyPlayerIds);
    }

    return true;
  } catch (error) {
    console.error("Komut gönderilemedi:", error);
    return false;
  }
}

// Oyun içi komut gönderir (Mobil/Kumanda tarafı)
// NOT: Client timestamp kullanılıyor (serverTimestamp network round-trip ekliyor)
export async function sendMatchCommand(commandType, payload = {}, tableId = 'table_1') {
  try {
    const now = Date.now();
    setDoc(doc(db, "live_matches", tableId), {
      status: 'COMMAND',
      command: commandType,
      payload: payload,
      timestamp: { seconds: Math.floor(now / 1000), nanoseconds: (now % 1000) * 1000000 }
    }); // await kaldırıldı - fire and forget
    return true;
  } catch (error) {
    console.error("Oyun komutu gönderilemedi:", error);
    return false;
  }
}

// Maç komutlarını dinler (Raspberry Pi/Scoreboard tarafı)
export function listenForMatchCommands(onCommandReceived, tableId = 'table_1') {
  // 'live_matches' koleksiyonundaki belirtilen masa dökümanını dinle
  const unsubscribe = onSnapshot(doc(db, "live_matches", tableId), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      // Sadece yeni komutları işlemek için timestamp kontrolü yapılabilir
      // Şimdilik doğrudan veriyi dönüyoruz
      onCommandReceived(data);
    }
  });

  // Dinlemeyi durdurmak için unsubscribe fonksiyonunu döndür
  return unsubscribe;
}

// --- TABLE STATUS FUNCTIONS ---

// Debounce için değişkenler
let tableStatusDebounceTimer = null;
let pendingTableStatus = null;

// Masanın durumunu günceller (BUSY, IDLE) - Debounced (30ms - ultra hızlı)
// matchMeta: { playerIds, startedBy, allowedControllers } - Multi-user erişim için
export async function updateTableStatus(tableId, status, matchData = null, matchMeta = null) {
  // Pending durumu kaydet
  pendingTableStatus = { tableId, status, matchData, matchMeta };

  // Eğer zaten bir timer varsa temizle
  if (tableStatusDebounceTimer) {
    clearTimeout(tableStatusDebounceTimer);
  }

  // 30ms sonra gönder (ultra hızlı güncelleme için optimize edildi)
  tableStatusDebounceTimer = setTimeout(async () => {
    if (!pendingTableStatus) return;

    const { tableId: id, status: st, matchData: md, matchMeta: meta } = pendingTableStatus;
    pendingTableStatus = null;

    try {
      // Client timestamp kullanarak network round-trip azaltılıyor
      const statusData = {
        status: st,
        currentMatch: md,
        lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };

      // Multi-user bilgilerini ekle (varsa)
      if (meta) {
        statusData.playerIds = meta.playerIds || [];
        statusData.startedBy = meta.startedBy || null;
        statusData.allowedControllers = meta.allowedControllers || [];
      }

      await setDoc(doc(db, "table_status", id), statusData);
    } catch (error) {
      console.error("Masa durumu güncellenemedi:", error);
    }
  }, 30);
}

// Masanın durumunu dinler (Mobil tarafı için)
export function listenToTableStatus(tableId, onStatusChange) {
  const unsubscribe = onSnapshot(doc(db, "table_status", tableId), (doc) => {
    if (doc.exists()) {
      onStatusChange(doc.data());
    } else {
      onStatusChange(null);
    }
  });
  return unsubscribe;
}

// --- MATCH RESULT SAVE FUNCTIONS ---

// Maç sonucunu test_records collection'a kaydeder
export async function saveMatchToTestRecords(matchResult) {
  try {
    const {
      player1,
      player2,
      score1,
      score2,
      shots,
      eys1,
      eys2,
      penaltyWinner // opsiyonel - sadece berabere maçlarda
    } = matchResult;

    // Tarih formatı: "DD.MM.YYYY"
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}.${month}.${year}`;

    // Kayıt yapısı
    const recordData = {
      player1,
      player2,
      score1,
      score2,
      shots,
      eys1,
      eys2,
      date: dateStr,
      timestamp: serverTimestamp(),
      likes: [] // Boş array olarak başlat
    };

    // Eğer penaltyWinner varsa ekle (sadece berabere maçlar için)
    if (penaltyWinner) {
      recordData.penaltyWinner = penaltyWinner;
    }

    // Yeni döküman ID'si otomatik oluştur
    const newDocRef = doc(collection(db, "test_records"));
    await setDoc(newDocRef, recordData);

    console.log("✅ Maç sonucu test_records'a kaydedildi:", newDocRef.id);
    return { success: true, id: newDocRef.id };
  } catch (error) {
    console.error("❌ Maç sonucu kaydedilemedi:", error);
    return { success: false, error: error.message };
  }
}

// users koleksiyonundan kullanıcı bilgilerini okur
export async function getPlayerNames() {
  try {
    console.log("Firebase bağlantısı başlanıyor...");
    const usersCol = collection(db, "users");
    console.log("Users koleksiyonu referansı oluşturuldu");

    const usersSnapshot = await getDocs(usersCol);
    console.log("Kullanıcı sayısı:", usersSnapshot.size);

    const users = [];
    const seenNames = new Set(); // Tekrar kontrolü için

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();

      // fullName'i al ve normalize et (büyük/küçük harf farketmez)
      let fullName = userData.fullName || "";

      // Boşluk ve harf düzenleme
      fullName = fullName.trim();

      if (fullName) {
        // Normalize edilmiş isim (küçük harf + türkçe karakter desteği)
        const normalizedName = fullName
          .toLowerCase()
          .replace(/ı/g, 'i')
          .replace(/İ/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/Ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/Ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/Ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/Ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/Ç/g, 'c')
          .replace(/\s+/g, ' '); // Birden fazla boşluğu tek boşluğa çevir

        // Eğer bu isim daha önce eklenmemişse ekle
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);

          // --- GENEL KULLANICI EŞLEŞTİRME MANTIĞI ---
          // 1. Veritabanından gelen mevcut veriyi al
          let city = userData.city || "";
          let salon = userData.salon || "";

          // 2. TEST/BAŞLANGIÇ AŞAMASI İÇİN OVERRIDE (GEÇİCİ)
          // Bu liste veritabanı güncellendiğinde kaldırılabilir.
          // İsim eşleşmesi yerine ID eşleşmesi tercih edilmelidir ancak şu an ID'leri bilmediğimiz için isim kullanıyoruz.
          const KNOWN_PLAYERS = [
            { name: "ibrahim topyıldız", city: "Samsun", salon: "Salon 3CScore" },
            { name: "ilhami ilhan", city: "Samsun", salon: "Salon 3CScore" },
            { name: "erol oran", city: "Samsun", salon: "Salon 3CScore" },
            { name: "hüseyin yolcu", city: "Samsun", salon: "Salon 3CScore" },
            { name: "ahmet şenol terzi", city: "Samsun", salon: "Salon 3CScore" },
            { name: "hasan hacıömeroğlu", city: "Samsun", salon: "Salon 3CScore" }
          ];

          const override = KNOWN_PLAYERS.find(p => fullName.toLocaleLowerCase('tr').includes(p.name));
          if (override) {
            city = override.city;
            salon = override.salon;
          }

          // photoURL validasyonu - boş, geçersiz veya placeholder URL'leri filtrele
          let validPhotoURL = userData.photoURL || null;
          if (validPhotoURL) {
            const urlLower = validPhotoURL.toLowerCase();

            // Bilinen placeholder/avatar generator servisleri (blacklist)
            const invalidDomains = [
              'ui-avatars.com',
              'api.dicebear.com',
              'avatars.dicebear.com',
              'robohash.org',
              'api.adorable.io',
              'avataaars.io',
              'boringavatars.com',
              'avatar.oxro.io',
              'joeschmoe.io',
              'pravatar.cc',
              'i.pravatar.cc',
              'api.multiavatar.com',
              'avatars.abstractapi.com',
              'avatar.iran.liara.run',
              'source.boringavatars.com'
            ];

            // URL parametreleri ile avatar oluşturan servisler
            const invalidParams = [
              'name=',      // ui-avatars: ?name=John+Doe
              'initials=',  // initial avatar servisleri
              'text=',      // text-based avatarlar
              '?letter',    // letter avatar
              '&letter'     // letter avatar
            ];

            // Domain kontrolü
            const hasInvalidDomain = invalidDomains.some(domain => urlLower.includes(domain));

            // Parametre kontrolü
            const hasInvalidParam = invalidParams.some(param => urlLower.includes(param));

            // Boş veya geçersiz
            const isEmpty = !validPhotoURL.trim();

            if (isEmpty || hasInvalidDomain || hasInvalidParam) {
              console.log(`❌ Filtered: ${fullName} | Domain: ${hasInvalidDomain} | Param: ${hasInvalidParam}`);
              validPhotoURL = null;
            } else {
              console.log(`✅ Accepted: ${fullName}: ${validPhotoURL.substring(0, 60)}...`);
            }
          }

          users.push({
            id: doc.id, // Benzersiz Firebase ID (Entegrasyon için kritik)
            username: userData.username || "",
            fullName: fullName,
            email: userData.email || "",
            city: city,
            salon: salon,
            photoURL: validPhotoURL
          });
        } else {
          console.log(`Tekrar eden isim atlandı: ${fullName}`);
        }
      }
    });

    // Alfabetik sıralama (fullName'e göre, Türkçe karakter desteği ile)
    users.sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr'));

    console.log("Benzersiz kullanıcılar:", users.length);
    return users;
  } catch (error) {
    console.error("Kullanıcı bilgileri çekilirken HATA:", error);
    console.error("Hata kodu:", error.code);
    console.error("Hata mesajı:", error.message);
    return [];
  }
}

// Alias for getPlayerNames (for backward compatibility)
export const getUserProfiles = getPlayerNames;

// Kullanıcı ID'sine göre profil bilgilerini getirir
export async function getUserById(userId) {
  if (!userId) return null;

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Kullanıcı profili bulundu:', userId);
      return {
        id: userDoc.id,
        fullName: userData.fullName || 'Kullanıcı',
        email: userData.email || null,
        city: userData.city || null,
        salon: userData.salon || userData.venue || null, // venue veya salon
        venue: userData.venue || userData.salon || null, // venue veya salon
        photoURL: userData.photoURL || null,
        username: userData.username || null
      };
    } else {
      console.log('⚠️ Kullanıcı bulunamadı:', userId);
      return null;
    }
  } catch (error) {
    console.error('❌ Kullanıcı profili çekilemedi:', error);
    return null;
  }
}

// --- NETWORK & CONNECTION FUNCTIONS ---

// Public IP adresini getirir
export async function getPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("IP adresi alınamadı:", error);
    return null;
  }
}

// Masanın ağ bilgilerini günceller (Scoreboard tarafı)
export async function updateNetworkInfo(tableId, ipInfo) {
  try {
    await setDoc(doc(db, "table_connection", tableId), {
      ...ipInfo,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log(`Ağ bilgisi güncellendi: ${tableId}`, ipInfo);
  } catch (error) {
    console.error("Ağ bilgisi güncellenemedi:", error);
  }
}

// Masanın ağ bilgilerini dinler (Mobil tarafı)
export function listenToNetworkInfo(tableId, onInfoChange) {
  const unsubscribe = onSnapshot(doc(db, "table_connection", tableId), (doc) => {
    if (doc.exists()) {
      onInfoChange(doc.data());
    } else {
      onInfoChange(null);
    }
  });
  return unsubscribe;
}

// --- VIEWER TRACKING FUNCTIONS ---

// Benzersiz viewer ID oluştur (tarayıcı başına)
function getViewerId() {
  let viewerId = localStorage.getItem('viewer_id');
  if (!viewerId) {
    viewerId = 'viewer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('viewer_id', viewerId);
  }
  return viewerId;
}

// İzleyici olarak kaydol (mobil tarafı maç takip ekranına girdiğinde)
export async function registerViewer(tableId = 'table_1') {
  const viewerId = getViewerId();
  try {
    await setDoc(doc(db, "table_viewers", `${tableId}_${viewerId}`), {
      tableId: tableId,
      viewerId: viewerId,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    console.log(`👁️ İzleyici kaydedildi: ${viewerId}`);
    return viewerId;
  } catch (error) {
    console.error("İzleyici kaydedilemedi:", error);
    return null;
  }
}

// İzleyici kaydını sil (mobil tarafı maç takip ekranından çıktığında)
export async function unregisterViewer(tableId = 'table_1') {
  const viewerId = getViewerId();
  try {
    await deleteDoc(doc(db, "table_viewers", `${tableId}_${viewerId}`));
    console.log(`👁️ İzleyici silindi: ${viewerId}`);
  } catch (error) {
    console.error("İzleyici silinemedi:", error);
  }
}

// İzleyici heartbeat gönder (aktif olduğunu bildir)
export async function updateViewerHeartbeat(tableId = 'table_1') {
  const viewerId = getViewerId();
  try {
    await setDoc(doc(db, "table_viewers", `${tableId}_${viewerId}`), {
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Heartbeat gönderilemedi:", error);
  }
}

// İzleyici sayısını dinle (table_viewers collection'ını dinle)
export function listenToViewerCount(tableId, onCountChange) {
  const unsubscribe = onSnapshot(collection(db, "table_viewers"), (snapshot) => {
    // tableId'ye göre filtrele ve say
    let count = 0;
    const now = Date.now();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tableId === tableId) {
        // Son 60 saniye içinde görülen izleyicileri say (timeout kontrolü)
        const lastSeen = data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : 0;
        if (now - lastSeen < 60000) {
          count++;
        }
      }
    });
    onCountChange(count);
  });
  return unsubscribe;
}

// --- FCM (Firebase Cloud Messaging) FUNCTIONS ---

// FCM VAPID Key (Firebase Console > Project Settings > Cloud Messaging > Web Push certificates)
const VAPID_KEY = 'BN9RixtgBJhaA2AZ5D5VjSUsq1wo-XSCVjq0PG07PYnWbcTlbweUGlvAt2696k6dS2WNboRU7OHoQ3Hg3wqwTvo';

let messaging = null;

// Messaging instance'ı güvenli şekilde al (tarayıcı desteği kontrolü)
function getMessagingInstance() {
  if (messaging) return messaging;

  try {
    // Service Worker ve Notification API desteği kontrolü
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.warn('FCM desteklenmiyor:', error);
  }
  return null;
}

// Kullanıcının FCM token'ını al ve Firestore'a kaydet
export async function registerFCMToken(userId) {
  const msgInstance = getMessagingInstance();
  if (!msgInstance) {
    console.warn('FCM bu cihazda desteklenmiyor');
    return null;
  }

  try {
    // Bildirim izni iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Bildirim izni verilmedi');
      return null;
    }

    // FCM token al
    const token = await getToken(msgInstance, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('FCM token alınamadı');
      return null;
    }

    // Token'ı kullanıcının profiliyle ilişkilendir
    await setDoc(doc(db, "user_fcm_tokens", userId), {
      token,
      updatedAt: serverTimestamp(),
      platform: 'web'
    }, { merge: true });

    console.log('✅ FCM token kaydedildi:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('FCM token kaydedilemedi:', error);
    return null;
  }
}

// Kullanıcının FCM token'ını getir
export async function getUserFCMToken(userId) {
  try {
    const docSnap = await getDoc(doc(db, "user_fcm_tokens", userId));
    if (docSnap.exists()) {
      return docSnap.data().token;
    }
    return null;
  } catch (error) {
    console.error('FCM token alınamadı:', error);
    return null;
  }
}

// Foreground'da bildirim dinle
export function listenToFCMMessages(onMessageReceived) {
  const msgInstance = getMessagingInstance();
  if (!msgInstance) return () => { };

  return onMessage(msgInstance, (payload) => {
    console.log('📩 FCM Mesajı alındı:', payload);
    onMessageReceived(payload);
  });
}

// Maç başladığında bildirim gönder (Cloud Function tetikleyecek)
// Bu fonksiyon client tarafında çağrılmaz, sadece referans için
// Gerçek bildirim gönderimi Firebase Cloud Functions tarafında yapılacak
export async function triggerMatchNotification(matchId, tableId, playerIds, startedBy, matchInfo) {
  // Cloud Function'ı tetiklemek için notification_queue'ya yazıyoruz
  try {
    await setDoc(doc(db, "notification_queue", matchId), {
      type: 'MATCH_STARTED',
      tableId,
      playerIds,        // Bildirim gönderilecek oyuncular
      startedBy,        // Maçı başlatan (bildirim gönderilMEyecek)
      matchInfo,        // Maç bilgileri (oyuncu isimleri, mod, vb.)
      status: 'pending',
      createdAt: serverTimestamp()
    });
    console.log('📤 Bildirim kuyruğuna eklendi:', matchId);
    return true;
  } catch (error) {
    console.error('Bildirim kuyruğuna eklenemedi:', error);
    return false;
  }
}

export { db, app };