const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDFqmZg4khPVJron56Cyj0nfsupvBjuTAA",
    authDomain: "bilardo-skor.firebaseapp.com",
    projectId: "bilardo-skor",
    storageBucket: "bilardo-skor.firebasestorage.app",
    messagingSenderId: "413070873797",
    appId: "1:413070873797:web:9017509d95240516afccac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// String normalleştirme
function normalize(str) {
    if (!str) return "";
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function linkUsersToSalonId() {
    try {
        console.log('🔄 Bağlantı işlemi başlatılıyor...');

        // 1. ADIM: Tüm Salonları Çek ve Haritala
        const salonsCol = collection(db, 'salons');
        const salonSnapshot = await getDocs(salonsCol);

        const salonMap = {}; // "normalize_isim" -> "salon_id"
        const salonNameMap = {}; // "salon_id" -> "Gerçek İsim"

        salonSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const name = data.name;
            if (name) {
                salonMap[normalize(name)] = doc.id;
                salonNameMap[doc.id] = name;
                console.log(`🏢 Salon Bulundu: ${name} (ID: ${doc.id})`);
            }
        });

        if (Object.keys(salonMap).length === 0) {
            console.error('❌ Hiçbir salon bulunamadı. Önce salon oluşturun.');
            process.exit(1);
        }

        // 2. ADIM: Kullanıcıları Tara ve Eşleştir
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);

        const batch = writeBatch(db);
        let updateCount = 0;

        userSnapshot.docs.forEach(userDoc => {
            const userData = userDoc.data();
            const userSalonName = userData.salon || userData.venue;

            if (!userSalonName) return; // Salonu olmayan kullanıcıyı geç

            // Eşleşme ara
            const matchedSalonId = salonMap[normalize(userSalonName)];

            if (matchedSalonId) {
                // Eğer zaten doğru salonId varsa güncelleme yapma
                if (userData.salonId === matchedSalonId) {
                    // console.log(`ℹ️ [ATLANDI] ${userData.fullName} zaten bağlı.`);
                } else {
                    const userRef = doc(db, 'users', userDoc.id);

                    batch.update(userRef, {
                        salonId: matchedSalonId, // Kritik bağlantı
                        salon: salonNameMap[matchedSalonId], // İsmi de salonun resmi ismiyle standartlaştır
                        venue: salonNameMap[matchedSalonId], // Legacy destek
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`🔗 [BAĞLANDI] ${userData.fullName} -> ${salonNameMap[matchedSalonId]} (ID: ${matchedSalonId})`);
                    updateCount++;
                }
            } else {
                console.log(`⚠️ [EŞLEŞMEDİ] ${userData.fullName} -> Salon: "${userSalonName}" sistemde bulunamadı.`);
            }
        });

        // 3. ADIM: Değişiklikleri Kaydet
        if (updateCount > 0) {
            console.log(`\n💾 Toplam ${updateCount} kullanıcı güncelleniyor...`);
            await batch.commit();
            console.log('✅ İşlem başarıyla tamamlandı!');
        } else {
            console.log('\n✅ Tüm kullanıcılar zaten güncel.');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

linkUsersToSalonId();
