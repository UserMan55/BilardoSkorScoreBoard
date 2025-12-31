
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, updateDoc } = require("firebase/firestore");

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

async function migrateTableId() {
    const salonId = "nMzJ1JhU4VenW3oXJ3JE"; // SALON 3CSCORE
    console.log(`Migrating table ID for Salon ${salonId}...`);

    // We'll change 'table_1' to 'table_1_v2'
    await updateDoc(doc(db, "salons", salonId), {
        tableIds: ["table_1_v2"]
    });

    console.log("✅ Salon updated to use 'table_1_v2'.");
}

migrateTableId().then(() => process.exit(0));
