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

// Güncellenecek isimler listesi (normalize edilmiş haliyle eşleştirme yapılacak)
const TARGET_PLAYERS = [
    "Ahmet Şenol Terzi",
    "Erol Oran",
    "İlhami İlhan",
    "Hasan Hacıömeroğlu",
    "Hüseyin Yolcu"
];

// İsim normalleştirme fonksiyonu (Türkçe karakter ve case-insensitive karşılaştırma için)
function normalizeName(name) {
    return name
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
        .replace(/\s+/g, ' ')
        .trim();
}

async function updateSalonInfo() {
    try {
        console.log('Veriler ve oyuncular taranıyor...');

        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);

        // Batch oluştur (toplu güncelleme için)
        const batch = writeBatch(db);
        let updateCount = 0;
        let notFoundNames = new Set(TARGET_PLAYERS);

        userSnapshot.docs.forEach(userDoc => {
            const data = userDoc.data();
            const fullName = data.fullName || "";
            const normalizedFullName = normalizeName(fullName);

            // Hedef listedeki isimlerden biriyle eşleşiyor mu?
            const matchedName = TARGET_PLAYERS.find(target =>
                normalizeName(target) === normalizedFullName
            );

            if (matchedName) {
                // Eğer salon zaten doğruysa güncelleme yapma
                if (data.salon === 'SALON 3CSCORE' && data.venue === 'SALON 3CSCORE') {
                    console.log(`ℹ️ [ATLANDI] ${fullName} zaten güncel.`);
                } else {
                    const docRef = doc(db, 'users', userDoc.id);
                    batch.update(docRef, {
                        salon: 'SALON 3CSCORE',
                        venue: 'SALON 3CSCORE', // Hem 'salon' hem 'venue' alanını güncelle (uyumluluk için)
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`✅ [EKLENDİ] ${fullName} güncellenecek.`);
                    updateCount++;
                }
                // Bulunan ismi listeden çıkar (bulunamayanları raporlamak için)
                notFoundNames.delete(matchedName);
            }
        });

        if (updateCount > 0) {
            console.log(`💾 Toplam ${updateCount} kayıt güncelleniyor...`);
            await batch.commit();
            console.log('🎉 Güncelleme başarılı!');
        } else {
            console.log('⚠️ Güncellenecek yeni kayıt bulunamadı.');
        }

        if (notFoundNames.size > 0) {
            console.log('\n❌ Aşağıdaki isimler veritabanında BULUNAMADI:');
            notFoundNames.forEach(name => console.log(`   - ${name}`));
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

updateSalonInfo();
