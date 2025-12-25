/**
 * Firebase Kullanıcı Profili Güncelleme Script'i
 * İbrahim TOPYILDIZ için salon ve il bilgisi ekler
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase Config
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
const auth = getAuth(app);

async function updateUserProfile() {
    try {
        // Önce giriş yap (admin olarak)
        const email = process.argv[2];
        const password = process.argv[3];

        if (!email || !password) {
            console.log('Kullanım: node update-user-profile.js <email> <password>');
            console.log('Örnek: node update-user-profile.js ibrahim@example.com sifre123');
            process.exit(1);
        }

        console.log('🔐 Giriş yapılıyor...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Giriş başarılı:', user.email);

        // Kullanıcı profilini güncelle
        const userRef = doc(db, 'users', user.uid);

        // Mevcut veriyi kontrol et
        const docSnap = await getDoc(userRef);

        const profileData = {
            fullName: 'İbrahim TOPYILDIZ',
            city: 'Samsun',
            venue: 'SALON 3CSCORE',
            email: user.email,
            updatedAt: new Date().toISOString()
        };

        if (docSnap.exists()) {
            console.log('📝 Mevcut profil güncelleniyor...');
            await updateDoc(userRef, profileData);
        } else {
            console.log('📝 Yeni profil oluşturuluyor...');
            await setDoc(userRef, {
                ...profileData,
                createdAt: new Date().toISOString()
            });
        }

        console.log('✅ Profil güncellendi:');
        console.log('   - Ad Soyad: İbrahim TOPYILDIZ');
        console.log('   - İl: Samsun');
        console.log('   - Salon: SALON 3CSCORE');
        console.log('   - User ID:', user.uid);

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

updateUserProfile();
