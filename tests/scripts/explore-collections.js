const { initializeApp } = require('firebase/app');
const { getFirestore, listCollections, collection, getDocs, limit, query } = require('firebase/firestore');

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

// Bildiğimiz/Tahmin ettiğimiz koleksiyonlar (Client SDK ile listCollections yapılamadığı için)
const KNOWN_COLLECTIONS = [
    'users',
    'live_matches',
    'table_status',
    'test_records',
    'records', // Bunu da kontrol edeceğiz
    'table_connection',
    'table_viewers',
    'notification_queue',
    'user_fcm_tokens',
    'matches', // Olası
    'tournaments' // Olası
];

async function exploreCollections() {
    console.log('🔍 Firebase Koleksiyon Yapısı Analiz Ediliyor...\n');

    for (const colName of KNOWN_COLLECTIONS) {
        try {
            const colRef = collection(db, colName);
            // Sadece 1 tane doküman çekerek koleksiyonun varlığını ve içeriğini anla
            const q = query(colRef, limit(1));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const countSnap = await getDocs(colRef); // Yaklaşık sayı için
                console.log(`📂 [MEVCUT] ${colName} (${countSnap.size} kayıt)`);

                const sampleDoc = snapshot.docs[0].data();
                console.log('   📄 Örnek Veri Şeması (Keys):', Object.keys(sampleDoc).join(', '));

                // Records veya test_records için örnek bir tarih bakalım
                if (sampleDoc.createdAt || sampleDoc.date || sampleDoc.timestamp) {
                    // console.log('   🕒 Örnek Zmn:', sampleDoc.createdAt || sampleDoc.date || sampleDoc.timestamp);
                }
            } else {
                console.log(`❌ [BOŞ/YOK] ${colName}`);
            }
        } catch (error) {
            console.log(`⚠️  [ERİŞİM HATASI] ${colName}: ${error.code}`);
        }
        console.log('-------------------------------------------');
    }

    process.exit(0);
}

exploreCollections();
