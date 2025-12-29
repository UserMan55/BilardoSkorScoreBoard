const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

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

// İlk eklenecek salon verisi
const newSalon = {
    name: "SALON 3CSCORE",
    city: "Samsun",
    district: "Atakum", // Varsayılan ilçe (gerekirse güncellenir)
    address: "Atakum, Samsun",
    phone: "+90 555 000 0000", // Placeholder

    // Yetkililer - İlk yönetici olarak sizi ekliyorum
    admins: ["2w59nZzV0fQ3XjS6p5v5l2K50a1A"], // İbrahim TOPYILDIZ UID

    // Salonun masaları
    tableIds: ["table_1"],

    tableCount: 1,
    isActive: true,

    // Sosyal & Web
    website: "https://3cscore.com",
    instagram: "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
};

async function createSalonsCollection() {
    try {
        console.log('🏗️ "salons" koleksiyonu oluşturuluyor...');

        // 'salons' koleksiyonuna first dokümanı ekle
        const docRef = await addDoc(collection(db, "salons"), newSalon);

        console.log('✅ Salon başarıyla oluşturuldu!');
        console.log(`📄 Salon ID: ${docRef.id}`);
        console.log('🏢 Salon Adı: SALON 3CSCORE');
        console.log('🔧 Yönetici ID: 2w59nZzV0fQ3XjS6p5v5l2K50a1A');

        console.log('\nArtık "salons" adında yeni bir koleksiyonunuz var.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata oluştu:', error.message);
        process.exit(1);
    }
}

createSalonsCollection();
