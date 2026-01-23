
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

let db;
let serviceAccountPath;

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccountPath = join(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
} else {
    serviceAccountPath = join(__dirname, "serviceAccountKey.json");
}

if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
        try {
            const serviceAccountData = readFileSync(serviceAccountPath, "utf8");
            serviceAccount = JSON.parse(serviceAccountData);
        } catch (e) {
            console.log("No service account found, assuming default credentials or emulator if set.");
        }
    }
    if (serviceAccount) {
        initializeApp({ credential: cert(serviceAccount) });
    } else {
        initializeApp();
    }
    db = getFirestore();
} else {
    db = getFirestore();
}

async function listAllCollections() {
    const collections = await db.listCollections();
    console.log("Root Collections:");
    for (const col of collections) {
        console.log(`- ${col.id}`);
        // Check for subcollections in the first doc as a sample
        const snapshot = await col.limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const subCols = await doc.ref.listCollections();
            if (subCols.length > 0) {
                console.log(`  Subcollections (sample from ${doc.id}):`);
                subCols.forEach(sc => console.log(`    - ${sc.id}`));
            }
        }
    }
}

listAllCollections().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
