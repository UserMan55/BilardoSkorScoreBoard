
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

async function debugSalons() {
    const querySnapshot = await getDocs(collection(db, "salons"));
    querySnapshot.forEach((doc) => {
        console.log(`Salon [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });
}

debugSalons().then(() => process.exit(0));
