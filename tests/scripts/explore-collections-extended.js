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

// Daha geniş kapsamlı koleksiyon listesi
const KNOWN_COLLECTIONS = [
    // Mevcutlar
    'users',
    'live_matches',
    'table_status',
    'test_records',
    'records',
    'table_connection',
    'table_viewers',
    'notification_queue',
    'user_fcm_tokens',

    // Salon ile ilgili olası isimler
    'salons',
    'venues',
    'clubs',
    'organizations',
    'locations',
    'companies',
    'centers',
    'bilardo_salons',
    'halls'
];

async function exploreCollections() {
    console.log('🔍 Detaylı Koleksiyon Taraması Başlıyor...\n');

    let foundCount = 0;

    for (const colName of KNOWN_COLLECTIONS) {
        try {
            const colRef = collection(db, colName);
            const q = query(colRef, limit(1));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const countSnap = await getDocs(colRef);
                console.log(`✅ [MEVCUT] ${colName} (${countSnap.size} kayıt)`);
                foundCount++;
            } else {
                // Sadece debug için, normalde hepsini yazdırmaya gerek yok ama emin olmak istiyoruz
                // console.log(`❌ [YOK] ${colName}`);
            }
        } catch (error) {
            // İzin hatası vs.
        }
    }

    if (foundCount === 0) {
        console.log("Hiçbir koleksiyon bulunamadı.");
    }

    console.log('\nTarama tamamlandı.');
    process.exit(0);
}

exploreCollections();
