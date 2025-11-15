import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

// players koleksiyonundan names alanlarını okur
export async function getPlayerNames() {
  try {
    console.log("Firebase bağlantısı başlanıyor...");
    const playersCol = collection(db, "players");
    console.log("Koleksiyon referansı oluşturuldu");
    
    const playerSnapshot = await getDocs(playersCol);
    console.log("Doküman sayısı:", playerSnapshot.size);
    console.log("Dokümanlar:", playerSnapshot.docs);
    
    let names = [];
    
    playerSnapshot.docs.forEach((doc, idx) => {
      console.log(`Doküman ${idx}:`, doc.data());
      const nameField = doc.data().names;
      
      // nameField bir dizi ise
      if (Array.isArray(nameField)) {
        console.log("names bir dizidir:", nameField);
        names = names.concat(nameField);
      } 
      // nameField bir string ise
      else if (typeof nameField === "string" && nameField.trim() !== "") {
        const splitted = nameField.split(/[,;\s]+/).map(n => n.trim()).filter(n => n);
        names = names.concat(splitted);
      }
    });
    
    names = Array.from(new Set(names));
    console.log("Çekilen isimler:", names);
    return names;
  } catch (error) {
    console.error("Oyuncu isimleri çekilirken HATA:", error);
    console.error("Hata kodu:", error.code);
    console.error("Hata mesajı:", error.message);
    return [];
  }
}

export { db, app };