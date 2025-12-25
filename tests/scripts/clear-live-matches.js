const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc } = require('firebase/firestore');

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

async function clearLiveMatches() {
  try {
    console.log('🗑️ Firebase live_matches/table_1 temizleniyor...');
    
    await deleteDoc(doc(db, 'live_matches', 'table_1'));
    
    console.log('✅ Temizleme başarılı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ HATA:', error);
    process.exit(1);
  }
}

clearLiveMatches();
