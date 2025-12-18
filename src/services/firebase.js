import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp, deleteDoc, updateDoc, increment } from "firebase/firestore";

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

// --- REMOTE CONTROL FUNCTIONS ---

// Maç başlatma komutunu gönderir (Mobil/Kumanda tarafı)
// matchMeta: { playerIds, startedBy, salonId, salonCity } - Multi-user erişim için
export async function sendRemoteStartCommand(matchData, tableId = 'table_1', matchMeta = {}) {
  try {
    const { playerIds = [], startedBy = null, salonId = null, salonCity = null } = matchMeta;
    
    // 'live_matches' koleksiyonunda belirtilen masa dökümanını güncelliyoruz
    await setDoc(doc(db, "live_matches", tableId), {
      ...matchData,
      status: 'START',
      timestamp: serverTimestamp(),
      // Multi-user erişim bilgileri
      playerIds,           // Oyuncu ID'leri (kontrol yetkisi)
      startedBy,           // Maçı başlatan kullanıcı ID
      allowedControllers: startedBy ? [startedBy, ...playerIds] : playerIds,
      salonId,             // Salon ID (bildirim için)
      salonCity            // Salon şehri (bildirim için)
    });
    console.log(`Maç başlatma komutu gönderildi (${tableId}):`, matchData, 'Meta:', matchMeta);
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

export { db, app };