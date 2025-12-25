const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

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

async function checkTestRecords() {
  try {
    console.log('🔍 Firebase test_records collection kontrol ediliyor...\n');
    
    const testRecordsRef = collection(db, 'test_records');
    const q = query(testRecordsRef, orderBy('timestamp', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ test_records collection boş veya bulunamadı!\n');
      return;
    }
    
    console.log(`📊 Son ${snapshot.size} kayıt:\n`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${'='.repeat(60)}`);
      console.log(`📄 Kayıt ${index + 1} (ID: ${doc.id})`);
      console.log(`${'─'.repeat(60)}`);
      console.log(`🎮 Oyuncular: ${data.player1} vs ${data.player2}`);
      console.log(`📊 Skor: ${data.score1} - ${data.score2}`);
      console.log(`🎯 Sayı: ${data.shots}`);
      console.log(`🔥 EYS: ${data.eys1} - ${data.eys2}`);
      console.log(`📅 Tarih: ${data.date}`);
      console.log(`👍 Likes: ${data.likes ? data.likes.length : 0}`);
      
      if (data.penaltyWinner) {
        console.log(`⚡ PENALTI KAZANAN: ${data.penaltyWinner}`);
      } else {
        console.log(`⚡ Penaltı: Yok`);
      }
      
      console.log(`\n📝 Tam Veri:`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`${'='.repeat(60)}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ HATA:', error);
    process.exit(1);
  }
}

checkTestRecords();
