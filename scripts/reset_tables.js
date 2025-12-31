
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

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

async function resetTable(tableId) {
    try {
        await setDoc(doc(db, "table_status", tableId), {
            status: 'IDLE',
            currentMatch: null,
            lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        });
        console.log(`✅ Table ${tableId} reset to IDLE`);

        // Also reset live_matches
        await setDoc(doc(db, "live_matches", tableId), {
            status: 'IDLE',
            timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        });
        console.log(`✅ live_matches ${tableId} reset to IDLE`);
    } catch (error) {
        console.error(`❌ Error resetting table ${tableId}:`, error);
    }
}

async function run() {
    await resetTable('table_1');
    await resetTable('table_2');
    await resetTable('table_3');
    process.exit(0);
}

run();
