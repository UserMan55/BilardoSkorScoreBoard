const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, orderBy, query } = require('firebase/firestore');

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

async function listTestRecords() {
    try {
        console.log('Maç sonuçları çekiliyor...');
        const recordsCol = collection(db, 'test_records');
        // Tarihe göre sırala
        const q = query(recordsCol, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('Hiç kayıtlı maç sonucu bulunamadı.');
            process.exit(0);
        }

        console.log(`\n--- 🎱 KAYITLI MAÇ SONUÇLARI (${snapshot.size} Adet) ---\n`);

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const date = data.date || 'Tarih Yok';

            console.log(`MAÇ #${snapshot.size - index} | 📅 ${date}`);
            console.log(`----------------------------------------`);
            console.log(`🏆 ${data.player1} vs ${data.player2}`);
            console.log(`📊 SKOR: ${data.score1} - ${data.score2}`);
            console.log(`🎯 ISTAKA: ${data.shots || '-'}`);
            console.log(`⚡ EYS (En Yüksek Seri): ${data.eys1 || 0} - ${data.eys2 || 0}`);

            if (data.penaltyWinner) {
                console.log(`🔥 Penaltı Kazananı: ${data.penaltyWinner}`);
            }

            console.log('\n');
        });

        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

listTestRecords();
