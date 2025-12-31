
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

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

async function inspectTable() {
    const docSnap = await getDoc(doc(db, "table_status", "table_1"));
    if (docSnap.exists()) {
        console.log("Full Data:", JSON.stringify(docSnap.data(), null, 2));
    } else {
        console.log("Not found");
    }
}

inspectTable().then(() => process.exit(0));
