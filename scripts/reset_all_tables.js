
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc } = require("firebase/firestore");

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

async function resetAllTables() {
    try {
        // 1. Get all table IDs from table_status collection
        const statusSnapshot = await getDocs(collection(db, "table_status"));
        console.log(`Found ${statusSnapshot.size} documents in table_status`);

        for (const docSnap of statusSnapshot.docs) {
            const tableId = docSnap.id;
            await setDoc(doc(db, "table_status", tableId), {
                status: 'IDLE',
                currentMatch: null,
                lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            });
            console.log(`✅ table_status ${tableId} -> IDLE`);
        }

        // 2. Get all table IDs from live_matches collection
        const liveSnapshot = await getDocs(collection(db, "live_matches"));
        console.log(`Found ${liveSnapshot.size} documents in live_matches`);

        for (const docSnap of liveSnapshot.docs) {
            const tableId = docSnap.id;
            await setDoc(doc(db, "live_matches", tableId), {
                status: 'IDLE',
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
            });
            console.log(`✅ live_matches ${tableId} -> IDLE`);
        }

        // 3. Specifically check for 'SALON 3CSCORE' tables if they follow a pattern like 'salon_3cscore_t1'
        // Actually, the above sweeps should cover most.

        console.log("🚀 All active tables have been reset to IDLE state.");
    } catch (error) {
        console.error("❌ Fatal Error during reset:", error);
    }
}

resetAllTables().then(() => process.exit(0));
