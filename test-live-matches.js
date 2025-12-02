// Firebase live_matches collection içeriğini kontrol et
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

async function checkLiveMatches() {
  try {
    console.log("🔍 Firebase'de 'live_matches' collection kontrol ediliyor...\n");
    
    const liveMatchesCol = collection(db, "live_matches");
    const snapshot = await getDocs(liveMatchesCol);
    
    console.log(`📊 Toplam doküman sayısı: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log("⚠️ 'live_matches' collection boş!");
      return;
    }
    
    snapshot.docs.forEach((doc, idx) => {
      console.log(`\n📄 Doküman ${idx + 1} (ID: ${doc.id}):`);
      console.log("─".repeat(50));
      const data = doc.data();
      console.log(JSON.stringify(data, null, 2));
      console.log("─".repeat(50));
      
      console.log("\n🔑 Alan isimleri:", Object.keys(data));
    });
    
  } catch (error) {
    console.error("❌ HATA:", error.message);
  }
}

checkLiveMatches();
