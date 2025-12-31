
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, deleteDoc } = require("firebase/firestore");

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

async function purgeTable() {
    console.log("Deleting table_1 from table_status and live_matches...");
    await deleteDoc(doc(db, "table_status", "table_1"));
    await deleteDoc(doc(db, "live_matches", "table_1"));
    console.log("Deleted. Waiting 5 seconds to see if it reappears...");

    await new Promise(resolve => setTimeout(resolve, 5000));

    const snap = await getDoc(doc(db, "table_status", "table_1"));
    if (snap.exists()) {
        console.log("⚠️ IT REAPPEARED! Data:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("✅ It stayed deleted.");
    }
}

purgeTable().then(() => process.exit(0));
