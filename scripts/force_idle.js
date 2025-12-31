
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

async function forceIdleLoop() {
    console.log("Starting Force-Idle Loop for table_1...");
    for (let i = 0; i < 20; i++) {
        await setDoc(doc(db, "table_status", "table_1"), {
            status: 'IDLE',
            currentMatch: null,
            lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        });
        process.stdout.write(".");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("\nLoop finished.");
}

forceIdleLoop().then(() => process.exit(0));
