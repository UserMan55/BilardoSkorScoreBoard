const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function listSalonsReport() {
    try {
        console.log('Veriler analiz ediliyor...');
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);

        const salons = {};
        const noSalonUsers = [];

        userSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const salonName = data.salon || data.venue;
            const userName = data.fullName || 'İsimsiz';

            if (salonName) {
                if (!salons[salonName]) {
                    salons[salonName] = [];
                }
                salons[salonName].push(userName);
            } else {
                noSalonUsers.push(userName);
            }
        });

        console.log('\n--- 🏢 KAYITLI SALONLAR VE OYUNCULAR ---\n');

        const salonNames = Object.keys(salons);

        if (salonNames.length === 0) {
            console.log('Hiçbir salon kaydı bulunamadı.');
        } else {
            salonNames.forEach(salon => {
                console.log(`📌 ${salon.toUpperCase()} (${salons[salon].length} Oyuncu)`);
                salons[salon].forEach(player => {
                    console.log(`   - ${player}`);
                });
                console.log(''); // Boşluk
            });
        }

        if (noSalonUsers.length > 0) {
            console.log(`⚠️ SALON BİLGİSİ OLMAYANLAR (${noSalonUsers.length} Kişi)`);
            // Çok fazla ise sadece sayıyı göster, az ise isimleri de yazabiliriz
            if (noSalonUsers.length < 50) {
                noSalonUsers.forEach(player => console.log(`   - ${player}`));
            }
        }

        process.exit(0);

    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

listSalonsReport();
