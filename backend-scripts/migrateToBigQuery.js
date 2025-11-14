import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize Firebase Admin
let db;
let serviceAccountPath;

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  serviceAccountPath = join(
    __dirname,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  );
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
    const serviceAccountData = readFileSync(serviceAccountPath, "utf8");
    serviceAccount = JSON.parse(serviceAccountData);
  }
  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
} else {
  db = getFirestore();
}

// Initialize BigQuery
let projectId =
  process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;

if (!projectId) {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    const serviceAccountData = readFileSync(serviceAccountPath, "utf8");
    serviceAccount = JSON.parse(serviceAccountData);
  }
  projectId = serviceAccount.project_id;
}

const bigqueryConfig = { projectId };

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  bigqueryConfig.credentials = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  );
} else {
  bigqueryConfig.keyFilename = serviceAccountPath;
}

const bigquery = new BigQuery(bigqueryConfig);
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || "scorecard_data";

// Ensure dataset exists
async function createDatasetIfNeeded() {
  const dataset = bigquery.dataset(DATASET_ID);
  try {
    await dataset.create();
    console.log(`Dataset ${DATASET_ID} created.`);
  } catch (error) {
    if (error.code === 409) {
      // Dataset already exists, that's fine
      console.log(`Dataset ${DATASET_ID} already exists.`);
    } else {
      throw error;
    }
  }
}

// Simple table creation
async function createTableIfNeeded(tableId, schema) {
  const table = bigquery.dataset(DATASET_ID).table(tableId);
  try {
    await table.create({ schema });
    console.log(`Table ${tableId} created.`);
  } catch (error) {
    if (error.code === 409) {
      // Table already exists, that's fine
      console.log(`Table ${tableId} already exists.`);
    } else {
      throw error;
    }
  }
}

// Helper function to load data into BigQuery table
async function loadDataToTable(tableId, rows) {
  if (rows.length === 0) {
    console.log(`No data to migrate for ${tableId}.`);
    return;
  }

  const table = bigquery.dataset(DATASET_ID).table(tableId);

  // Convert rows to newline-delimited JSON format
  const jsonData = rows.map((row) => JSON.stringify(row)).join("\n");

  // Write to temporary file (required for table.load())
  const tempFile = join(tmpdir(), `bigquery-${tableId}-${Date.now()}.json`);
  writeFileSync(tempFile, jsonData, "utf8");

  try {
    // table.load() already waits for the job to complete by default
    // The promise resolves when the load is done
    await table.load(tempFile, {
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      writeDisposition: "WRITE_APPEND", // Use WRITE_TRUNCATE to replace existing data
      createDisposition: "CREATE_NEVER", // Table should already exist
    });

    console.log(`✓ Migrated ${rows.length} rows to ${tableId}`);
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tempFile);
    } catch (error) {
      console.warn(
        `Warning: Could not delete temporary file ${tempFile}:`,
        error.message
      );
    }
  }
}

// Migrate players collection
async function migratePlayers() {
  console.log("Migrating players collection...");

  const snapshot = await db.collection("players").get();

  if (snapshot.empty) {
    console.log("No players found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "REQUIRED" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
  ];

  await createTableIfNeeded("Players", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "",
      clubId: data.clubId || "",
    };
  });

  await loadDataToTable("Players", rows);
}

// Migrate tournaments collection
async function migrateTournaments() {
  console.log("Migrating tournaments collection...");

  const snapshot = await db.collection("tournaments").get();

  if (snapshot.empty) {
    console.log("No tournaments found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "REQUIRED" },
    { name: "date", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
    { name: "isBoxCricket", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "status", type: "STRING", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("Tournaments", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string for BigQuery TIMESTAMP
    let dateValue = null;
    if (data.date) {
      if (data.date.toDate) {
        // Firebase Admin SDK Timestamp
        dateValue = data.date.toDate().toISOString();
      } else if (data.date.seconds) {
        // Firestore Timestamp object
        dateValue = new Date(data.date.seconds * 1000).toISOString();
      } else if (data.date instanceof Date) {
        dateValue = data.date.toISOString();
      }
    }

    return {
      id: doc.id,
      name: data.name || "",
      date: dateValue,
      clubId: data.clubId || "",
      isBoxCricket: data.isBoxCricket ?? null,
      status: data.status || null,
    };
  });

  await loadDataToTable("Tournaments", rows);
}

// Migrate PlayerTournamentStats collection
async function migratePlayerTournamentStats() {
  console.log("Migrating PlayerTournamentStats collection...");

  const snapshot = await db.collection("playerTournamentStats").get();

  if (snapshot.empty) {
    console.log("No PlayerTournamentStats found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "playerId", type: "STRING", mode: "REQUIRED" },
    { name: "tournamentId", type: "STRING", mode: "REQUIRED" },
    { name: "matches", type: "INTEGER", mode: "NULLABLE" },
    { name: "matchesWon", type: "INTEGER", mode: "NULLABLE" },
    { name: "innings", type: "INTEGER", mode: "NULLABLE" },
    { name: "runs", type: "INTEGER", mode: "NULLABLE" },
    { name: "ballsFaced", type: "INTEGER", mode: "NULLABLE" },
    { name: "fours", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixes", type: "INTEGER", mode: "NULLABLE" },
    { name: "strikeRate", type: "FLOAT", mode: "NULLABLE" },
    { name: "average", type: "FLOAT", mode: "NULLABLE" },
    { name: "notOuts", type: "INTEGER", mode: "NULLABLE" },
    { name: "wickets", type: "INTEGER", mode: "NULLABLE" },
    { name: "overs", type: "FLOAT", mode: "NULLABLE" },
    { name: "ballsBowled", type: "INTEGER", mode: "NULLABLE" },
    { name: "extras", type: "INTEGER", mode: "NULLABLE" },
    { name: "runsConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "foursConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixesConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "maidens", type: "INTEGER", mode: "NULLABLE" },
    { name: "bowlingEconomy", type: "FLOAT", mode: "NULLABLE" },
    { name: "dotBalls", type: "INTEGER", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
  ];

  await createTableIfNeeded("PlayerTournamentStats", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      playerId: data.playerId || "",
      tournamentId: data.tournamentId || "",
      matches: data.matches ?? null,
      matchesWon: data.matchesWon ?? null,
      innings: data.innings ?? null,
      runs: data.runs ?? null,
      ballsFaced: data.ballsFaced ?? null,
      fours: data.fours ?? null,
      sixes: data.sixes ?? null,
      strikeRate: data.strikeRate ?? null,
      average: data.average ?? null,
      notOuts: data.notOuts ?? null,
      wickets: data.wickets ?? null,
      overs: data.overs ?? null,
      ballsBowled: data.ballsBowled ?? null,
      extras: data.extras ?? null,
      runsConceded: data.runsConceded ?? null,
      foursConceded: data.foursConceded ?? null,
      sixesConceded: data.sixesConceded ?? null,
      maidens: data.maidens ?? null,
      bowlingEconomy: data.bowlingEconomy ?? null,
      dotBalls: data.dotBalls ?? null,
      clubId: data.clubId || "",
    };
  });

  await loadDataToTable("PlayerTournamentStats", rows);
}

// Main migration
async function migrateToBigQuery() {
  try {
    console.log("Starting migration...");
    await createDatasetIfNeeded();
    await migratePlayers();
    await migrateTournaments();
    await migratePlayerTournamentStats();
    console.log("Migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateToBigQuery();
