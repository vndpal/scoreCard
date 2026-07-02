
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
// Reuse the init logic
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
        } catch (e) { }
    }
    if (serviceAccount) initializeApp({ credential: cert(serviceAccount) });
    else initializeApp();
    db = getFirestore();
} else {
    db = getFirestore();
}

async function inspect(colName, subColName) {
    console.log(`\n--- Inspecting ${colName} ${subColName ? '-> ' + subColName : ''} ---`);
    let ref = db.collection(colName);
    if (subColName) {
        const parentSnap = await ref.limit(1).get();
        if (parentSnap.empty) {
            console.log("Parent empty");
            return;
        }
        ref = parentSnap.docs[0].ref.collection(subColName);
    }

    const snapshot = await ref.limit(1).get();
    if (snapshot.empty) {
        console.log("Empty");
    } else {
        console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));
    }
}

async function run() {
    await inspect("clubs");
    await inspect("matches");
    await inspect("teams");
    await inspect("tournaments");
    await inspect("tournamentStandings");
    await inspect("playerCareerStats");
    await inspect("teamPlayerMapping");
    await inspect("matchScores");
    await inspect("matchScores", "balls");
}

run().then(() => process.exit(0));
