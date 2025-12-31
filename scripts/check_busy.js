
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

async function checkBusyTables() {
    const snapshot = await getDocs(collection(db, "table_status"));
    console.log(`Checking ${snapshot.size} tables...`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Table [${doc.id}]: Status=${data.status}, Match=${data.currentMatch ? data.currentMatch.player1 + ' vs ' + data.currentMatch.player2 : 'None'}`);
    });
}

checkBusyTables().then(() => process.exit(0));
