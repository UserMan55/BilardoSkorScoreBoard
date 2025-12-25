// Firebase records collection yapısını kontrol etmek için test script
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, limit, query } = require("firebase/firestore");

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

async function checkRecordsStructure() {
  try {
    console.log("🔍 Firebase'de 'records' collection kontrol ediliyor...\n");
    
    const recordsCol = collection(db, "records");
    const q = query(recordsCol, limit(10)); // İlk 10 dokümanı al
    const recordsSnapshot = await getDocs(q);
    
    console.log(`📊 Toplam doküman sayısı: ${recordsSnapshot.size}\n`);
    
    if (recordsSnapshot.empty) {
      console.log("⚠️ 'records' collection boş veya mevcut değil!");
      return;
    }
    
    // Alan analizi için
    const allFields = new Set();
    const fieldTypes = {};
    let maxFieldsDoc = null;
    let maxFieldsCount = 0;
    
    recordsSnapshot.docs.forEach((doc, idx) => {
      const data = doc.data();
      const fieldCount = Object.keys(data).length;
      
      // En geniş yapıyı bul
      if (fieldCount > maxFieldsCount) {
        maxFieldsCount = fieldCount;
        maxFieldsDoc = { id: doc.id, data: data };
      }
      
      console.log(`\n📄 Doküman ${idx + 1} (ID: ${doc.id}) - ${fieldCount} alan:`);
      console.log("─".repeat(60));
      console.log(JSON.stringify(data, null, 2));
      console.log("─".repeat(60));
      
      // Alan isimlerini topla
      Object.keys(data).forEach(key => {
        allFields.add(key);
        if (!fieldTypes[key]) {
          fieldTypes[key] = typeof data[key];
        }
      });
    });
    
    // En geniş yapıyı göster
    console.log("\n\n🏆 EN GENİŞ YAPIYLI KAYIT:");
    console.log("═".repeat(60));
    console.log(`📄 Doküman ID: ${maxFieldsDoc.id}`);
    console.log(`📊 Alan Sayısı: ${maxFieldsCount}`);
    console.log("─".repeat(60));
    console.log(JSON.stringify(maxFieldsDoc.data, null, 2));
    console.log("─".repeat(60));
    console.log("🔑 Alanlar:", Object.keys(maxFieldsDoc.data).sort());
    
    console.log("\n\n📋 GENEL ANALİZ:");
    console.log("═".repeat(60));
    console.log("🔑 Tüm Alan İsimleri:", Array.from(allFields).sort());
    console.log("\n📊 Alan Tipleri:");
    Object.entries(fieldTypes).forEach(([key, type]) => {
      console.log(`  - ${key}: ${type}`);
    });
    
  } catch (error) {
    console.error("❌ HATA:", error.message);
  }
}

checkRecordsStructure();
