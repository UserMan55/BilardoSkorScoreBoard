import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

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
export async function sendRemoteStartCommand(matchData, tableId = 'table_1') {
  try {
    // 'live_matches' koleksiyonunda belirtilen masa dökümanını güncelliyoruz
    await setDoc(doc(db, "live_matches", tableId), {
      ...matchData,
      status: 'START',
      timestamp: serverTimestamp()
    });
    console.log(`Maç başlatma komutu gönderildi (${tableId}):`, matchData);
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
export async function updateTableStatus(tableId, status, matchData = null) {
  // Pending durumu kaydet
  pendingTableStatus = { tableId, status, matchData };
  
  // Eğer zaten bir timer varsa temizle
  if (tableStatusDebounceTimer) {
    clearTimeout(tableStatusDebounceTimer);
  }
  
  // 30ms sonra gönder (ultra hızlı güncelleme için optimize edildi)
  tableStatusDebounceTimer = setTimeout(async () => {
    if (!pendingTableStatus) return;
    
    const { tableId: id, status: st, matchData: md } = pendingTableStatus;
    pendingTableStatus = null;
    
    try {
      // Client timestamp kullanarak network round-trip azaltılıyor
      await setDoc(doc(db, "table_status", id), {
        status: st,
        currentMatch: md,
        lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      });
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

          users.push({
            id: doc.id, // Benzersiz Firebase ID (Entegrasyon için kritik)
            username: userData.username || "",
            fullName: fullName,
            email: userData.email || "",
            city: city,
            salon: salon,
            photoURL: userData.photoURL || null
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

export { db, app };