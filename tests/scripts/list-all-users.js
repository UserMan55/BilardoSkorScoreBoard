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

async function listUsers() {
    try {
        console.log('Veriler çekiliyor...');
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);

        const users = userSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ID: doc.id,
                'Ad Soyad': data.fullName || '---',
                'Şehir': data.city || '---',
                'Salon': data.salon || data.venue || '---',
                'Email': data.email || '---'
            };
        });

        if (users.length === 0) {
            console.log('Hiç kullanıcı bulunamadı.');
        } else {
            console.table(users);
            console.log(`Toplam ${users.length} kullanıcı listelendi.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

listUsers();
