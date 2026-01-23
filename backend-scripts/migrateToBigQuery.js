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

// Helper to get max updatedAt from BigQuery table
// Helper to get max updatedAt from BigQuery table
async function getLastUpdatedAt(tableName) {
  const query = `SELECT MAX(updatedAt) as last_updated FROM \`${DATASET_ID}.${tableName}\``;
  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    if (rows.length > 0 && rows[0].last_updated && rows[0].last_updated.value) {
      return new Date(rows[0].last_updated.value);
    }
    if (rows.length > 0 && rows[0].last_updated) {
      return new Date(rows[0].last_updated);
    }
  } catch (error) {
    // Check if error is because table doesn't exist (404)
    if (error.code === 404 || error.message.includes("Not found")) {
      console.log(`Table ${tableName} not found in BigQuery. Performing full initial backfill...`);
      return null;
    }
    // Real error
    console.warn(`Could not get last update for ${tableName} (returning 1970):`, error.message);
  }

  return new Date(0); // 1970-01-01
}

// Helper function to load data into BigQuery table
async function loadDataToTable(tableId, rows) {
  if (rows.length === 0) {
    console.log(`No new data to migrate for ${tableId}.`);
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
      createDisposition: "CREATE_IF_NEEDED", // Table should already exist usually, but strictly we created it before
      // Note: We are relying on BQ to handle schema evolution (add updatedAt) if we pass it in schema create?
      // Actually we create table if needed with schema. If table exists, we just load.
      // If we add 'updatedAt' column to data but not schema, BQ load might fail or ignore if 'autodetect' is not on.
      // We should probably rely on 'schemaUpdateOptions' if we want to add columns.
      schemaUpdateOptions: ['ALLOW_FIELD_ADDITION']
    });

    console.log(`✓ Migrated ${rows.length} new/updated rows to ${tableId}`);
  } catch (e) {
    console.error(`Failed to load ${tableId}: ${e.message}`);
    // console.error(e); 
    // If schema mismatch error, we might need to manually add column? 
    // With ALLOW_FIELD_ADDITION it should work.
    throw e;
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
  const lastUpdated = await getLastUpdatedAt("Players");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching Players updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("players").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL Players (Initial Backfill)...");
    snapshot = await db.collection("players").get();
  }

  if (snapshot.empty) {
    console.log("No new players found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "REQUIRED" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("Players", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "",
      clubId: data.clubId || "",
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });

  await loadDataToTable("Players", rows);
}

// Migrate tournaments collection
async function migrateTournaments() {
  console.log("Migrating tournaments collection...");
  const lastUpdated = await getLastUpdatedAt("Tournaments");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching Tournaments updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("tournaments").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL Tournaments (Initial Backfill)...");
    snapshot = await db.collection("tournaments").get();
  }

  if (snapshot.empty) {
    console.log("No new tournaments found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "REQUIRED" },
    { name: "date", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
    { name: "isBoxCricket", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "status", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
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
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });

  await loadDataToTable("Tournaments", rows);
}

// Migrate PlayerTournamentStats collection
async function migratePlayerTournamentStats() {
  console.log("Migrating PlayerTournamentStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerTournamentStats");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching PlayerTournamentStats updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("playerTournamentStats").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL PlayerTournamentStats (Initial Backfill)...");
    snapshot = await db.collection("playerTournamentStats").get();
  }

  if (snapshot.empty) {
    console.log("No new PlayerTournamentStats found.");
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
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
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
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });

  await loadDataToTable("PlayerTournamentStats", rows);
}

// Migrate PlayerMatchStats collection (Flattened)
async function migratePlayerMatchStats() {
  console.log("Migrating playerMatchStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerMatchStats");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching playerMatchStats updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("playerMatchStats").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL playerMatchStats (Initial Backfill)...");
    snapshot = await db.collection("playerMatchStats").get();
  }

  if (snapshot.empty) {
    console.log("No new playerMatchStats found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" }, // matchId_playerId
    { name: "matchId", type: "STRING", mode: "REQUIRED" },
    { name: "tournamentId", type: "STRING", mode: "REQUIRED" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
    { name: "date", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "playerId", type: "STRING", mode: "REQUIRED" },
    { name: "playerName", type: "STRING", mode: "NULLABLE" },
    { name: "team", type: "STRING", mode: "NULLABLE" },

    // Batting Stats
    { name: "runs", type: "INTEGER", mode: "NULLABLE" },
    { name: "ballsFaced", type: "INTEGER", mode: "NULLABLE" },
    { name: "fours", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixes", type: "INTEGER", mode: "NULLABLE" },
    { name: "strikeRate", type: "FLOAT", mode: "NULLABLE" },
    { name: "isOut", type: "BOOLEAN", mode: "NULLABLE" },

    // Bowling Stats
    { name: "overs", type: "FLOAT", mode: "NULLABLE" }, // overs can be 1.1 etc
    { name: "maidens", type: "INTEGER", mode: "NULLABLE" },
    { name: "runsConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "wickets", type: "INTEGER", mode: "NULLABLE" },
    { name: "dotBalls", type: "INTEGER", mode: "NULLABLE" },
    { name: "bowlingEconomy", type: "FLOAT", mode: "NULLABLE" },
    { name: "extras", type: "INTEGER", mode: "NULLABLE" },
    { name: "foursConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixesConceded", type: "INTEGER", mode: "NULLABLE" },
    // Add updatedAt
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("PlayerMatchStats", schema);

  let rows = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const matchId = doc.id;
    const updatedAt = data.updatedAt ? data.updatedAt.toDate().toISOString() : null;

    // Handle date
    let dateValue = null;
    const dateField = data.date || data.timestamp;

    if (dateField) {
      if (dateField.toDate) {
        dateValue = dateField.toDate().toISOString();
      } else if (dateField.seconds) {
        dateValue = new Date(dateField.seconds * 1000).toISOString();
      } else if (dateField instanceof Date) {
        dateValue = dateField.toISOString();
      } else if (typeof dateField === 'number') {
        dateValue = new Date(dateField).toISOString();
      }
    }

    if (data.playerMatchStats && Array.isArray(data.playerMatchStats)) {
      data.playerMatchStats.forEach(player => {
        rows.push({
          id: `${matchId}_${player.playerId}`,
          matchId: matchId, // Using doc.id as matchId is safest if data.matchId is missing
          tournamentId: data.tournamentId || "",
          clubId: data.clubId || "",
          date: dateValue,
          playerId: player.playerId || "",
          playerName: player.name || "",
          team: player.team || "",

          runs: player.runs ?? 0,
          ballsFaced: player.ballsFaced ?? 0,
          fours: player.fours ?? 0,
          sixes: player.sixes ?? 0,
          strikeRate: player.strikeRate ?? 0.0,
          isOut: player.isOut ?? false,

          overs: player.overs ?? 0.0,
          maidens: player.maidens ?? 0,
          runsConceded: player.runsConceded ?? 0,
          wickets: player.wickets ?? 0,
          dotBalls: player.dotBalls ?? 0,
          bowlingEconomy: player.bowlingEconomy ?? 0.0,
          extras: player.extras ?? 0,
          foursConceded: player.foursConceded ?? 0,
          sixesConceded: player.sixesConceded ?? 0,
          updatedAt: updatedAt,
        });
      });
    }
  });

  await loadDataToTable("PlayerMatchStats", rows);
}

// Migrate Clubs
async function migrateClubs() {
  console.log("Migrating clubs collection...");
  const lastUpdated = await getLastUpdatedAt("Clubs");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching clubs updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("clubs").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL clubs (Initial Backfill)...");
    snapshot = await db.collection("clubs").get();
  }

  if (snapshot.empty) {
    console.log("No new clubs found.");
    return;
  }
  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];
  await createTableIfNeeded("Clubs", schema);
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });
  await loadDataToTable("Clubs", rows);
}

// Migrate Teams
async function migrateTeams() {
  console.log("Migrating teams collection...");
  const lastUpdated = await getLastUpdatedAt("Teams");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching teams updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("teams").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL teams (Initial Backfill)...");
    snapshot = await db.collection("teams").get();
  }

  if (snapshot.empty) {
    console.log("No new teams found.");
    return;
  }
  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "teamName", type: "STRING", mode: "NULLABLE" },
    { name: "teamInitials", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];
  await createTableIfNeeded("Teams", schema);
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      teamName: data.teamName || null,
      teamInitials: data.teamInitials || null,
      clubId: data.clubId || null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });
  await loadDataToTable("Teams", rows);
}

// Migrate Matches
async function migrateMatches() {
  console.log("Migrating matches collection...");
  const lastUpdated = await getLastUpdatedAt("Matches");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching matches updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("matches").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL matches (Initial Backfill)...");
    snapshot = await db.collection("matches").get();
  }

  if (snapshot.empty) {
    console.log("No new matches found.");
    return;
  }
  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "team1", type: "STRING", mode: "NULLABLE" },
    { name: "team2", type: "STRING", mode: "NULLABLE" },
    { name: "team1Fullname", type: "STRING", mode: "NULLABLE" },
    { name: "team2Fullname", type: "STRING", mode: "NULLABLE" },
    { name: "tossWin", type: "STRING", mode: "NULLABLE" },
    { name: "choose", type: "STRING", mode: "NULLABLE" },
    { name: "winner", type: "STRING", mode: "NULLABLE" },
    { name: "result", type: "STRING", mode: "NULLABLE" },
    { name: "status", type: "STRING", mode: "NULLABLE" },
    { name: "startDateTime", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "endDateTime", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
    { name: "wickets", type: "INTEGER", mode: "NULLABLE" },
    { name: "overs", type: "INTEGER", mode: "NULLABLE" },
    { name: "currentScore", type: "STRING", mode: "NULLABLE" }, // JSON String
    { name: "manOfTheMatch", type: "STRING", mode: "NULLABLE" },
    { name: "isFirstInning", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "quickMatch", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];
  await createTableIfNeeded("Matches", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();

    const formatDate = (val) => {
      if (!val) return null;
      if (val.toDate) return val.toDate().toISOString();
      if (val.seconds) return new Date(val.seconds * 1000).toISOString();
      if (val instanceof Date) return val.toISOString();
      return null;
    };

    return {
      id: doc.id,
      team1: data.team1 || null,
      team2: data.team2 || null,
      team1Fullname: data.team1Fullname || null,
      team2Fullname: data.team2Fullname || null,
      tossWin: data.tossWin || null,
      choose: data.choose || null,
      winner: data.winner || null,
      result: data.result || null,
      status: data.status || null,
      startDateTime: formatDate(data.startDateTime),
      endDateTime: formatDate(data.endDateTime),
      clubId: data.clubId || null,
      tournamentId: data.tournamentId || null,
      wickets: data.wickets ?? null,
      overs: data.overs ?? null,
      currentScore: data.currentScore ? JSON.stringify(data.currentScore) : null,
      manOfTheMatch: data.manOfTheMatch || null,
      isFirstInning: data.isFirstInning ?? null,
      quickMatch: data.quickMatch ?? null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });
  await loadDataToTable("Matches", rows);
}

// Migrate PlayerCareerStats
async function migratePlayerCareerStats() {
  console.log("Migrating playerCareerStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerCareerStats");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching playerCareerStats updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("playerCareerStats").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL playerCareerStats (Initial Backfill)...");
    snapshot = await db.collection("playerCareerStats").get();
  }

  if (snapshot.empty) {
    console.log("No new playerCareerStats found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "playerId", type: "STRING", mode: "REQUIRED" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
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
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("PlayerCareerStats", schema);

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      playerId: data.playerId || "",
      clubId: data.clubId || "",
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
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };
  });

  await loadDataToTable("PlayerCareerStats", rows);
}

// Migrate TeamPlayerMapping (Flattened)
async function migrateTeamPlayerMapping() {
  console.log("Migrating teamPlayerMapping collection...");
  const lastUpdated = await getLastUpdatedAt("TeamPlayers");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching teamPlayerMapping updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("teamPlayerMapping").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL teamPlayerMapping (Initial Backfill)...");
    snapshot = await db.collection("teamPlayerMapping").get();
  }

  if (snapshot.empty) {
    console.log("No new teamPlayerMapping found.");
    return;
  }

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" }, // Generated: docId_playerId
    { name: "teamId", type: "STRING", mode: "REQUIRED" },
    { name: "clubId", type: "STRING", mode: "REQUIRED" },
    { name: "teamName", type: "STRING", mode: "NULLABLE" },
    { name: "playerId", type: "STRING", mode: "REQUIRED" },
    { name: "playerName", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("TeamPlayers", schema);

  const rows = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const teamId = doc.id; // Usually matches teamId, but sometimes just docId
    const updatedAt = data.updatedAt ? data.updatedAt.toDate().toISOString() : null;

    if (data.players && Array.isArray(data.players)) {
      data.players.forEach(p => {
        rows.push({
          id: `${doc.id}_${p.id}`,
          teamId: teamId,
          clubId: data.clubId || "",
          teamName: data.team || "",
          playerId: p.id || "",
          playerName: p.name || "",
          updatedAt: updatedAt,
        });
      });
    }
  });

  await loadDataToTable("TeamPlayers", rows);
}

// Migrate MatchScores and Balls
async function migrateMatchScores() {
  console.log("Migrating matchScores collection and balls subcollection...");
  const lastUpdated = await getLastUpdatedAt("MatchScores");

  let snapshot;
  if (lastUpdated) {
    console.log(`Fetching matchScores updated after ${lastUpdated.toISOString()}`);
    snapshot = await db.collection("matchScores").where('updatedAt', '>', lastUpdated).get();
  } else {
    console.log("Fetching ALL matchScores (Initial Backfill)...");
    snapshot = await db.collection("matchScores").get();
  }

  if (snapshot.empty) {
    console.log("No new matchScores found.");
    return;
  }

  // 1. Migrate Main MatchScores (Over Summaries)
  const schemaScores = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "matchId", type: "STRING", mode: "REQUIRED" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "teamId", type: "STRING", mode: "NULLABLE" },
    { name: "inningNumber", type: "INTEGER", mode: "NULLABLE" },
    { name: "overNumber", type: "INTEGER", mode: "NULLABLE" },
    { name: "overSummary", type: "STRING", mode: "NULLABLE" }, // JSON String of array
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await createTableIfNeeded("MatchScores", schemaScores);

  const matchScoresRows = [];
  const ballsRows = [];

  // Helper to process balls for a single doc
  const processBalls = async (docRef, parentId, parentUpdatedAt) => {
    const ballsSnapshot = await docRef.collection("balls").get();
    ballsSnapshot.docs.forEach(ballDoc => {
      const b = ballDoc.data();
      // Incremental Logic for Balls:
      // If parent is updated, we are processing this block.
      // If ball has updatedAt, use it? Or use parent's?
      // User says: "check for balls if not then rely on parent"
      // Since we are iterating an updated Parent, we assume these balls are relevant context.
      // If ball explicitly has updatedAt, filtering against lastUpdated (globally) would be correct for pure incremental,
      // but since we are processing the parent bucket, I will take the ball if:
      // 1. It has no updatedAt (rely on parent, which is new/updated)
      // 2. OR it has updatedAt > lastUpdated (globally for matchScores, assuming synced?)
      // Actually, simplest and safest "Rely on Parent" is: If Parent is updated, take all its current balls.
      // Why? Because if an Over (Parent) changed, likely balls changed or were added.
      // If we only take "new" balls, we might miss updates to existing balls if they lack timestamps.
      // I'll take all balls of the updated parent, assigning them the ball's updatedAt or parent's updatedAt.

      const ballUpdatedAt = b.updatedAt ? b.updatedAt.toDate().toISOString() : parentUpdatedAt;

      ballsRows.push({
        id: ballDoc.id,
        matchScoreId: parentId,
        run: b.run ?? 0,
        totalRun: b.totalRun ?? 0,
        isWicket: b.isWicket ?? false,
        isNoBall: b.isNoBall ?? false,
        isWideBall: b.isWideBall ?? false,
        isOverEnd: b.isOverEnd ?? false,
        extra: b.extra ?? 0,
        bowlerId: b.bowler?.id || null,
        bowlerName: b.bowler?.name || null,
        strikerId: b.strikerBatter?.id || null,
        strikerName: b.strikerBatter?.name || null,
        nonStrikerId: b.nonStrikerBatter?.id || null,
        nonStrikerName: b.nonStrikerBatter?.name || null,
        updatedAt: ballUpdatedAt
      });
    });
  }

  const promises = snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const updatedAt = data.updatedAt ? data.updatedAt.toDate().toISOString() : null;
    matchScoresRows.push({
      id: doc.id,
      matchId: data.matchId || "",
      tournamentId: data.tournamentId || null,
      clubId: data.clubId || null,
      teamId: data.teamId || null,
      inningNumber: data.inningNumber ?? null,
      overNumber: data.overNumber ?? null,
      overSummary: data.overSummary ? JSON.stringify(data.overSummary) : null,
      updatedAt: updatedAt,
    });

    // Fetch balls subcollection
    await processBalls(doc.ref, doc.id, updatedAt);
  });

  await Promise.all(promises);

  await loadDataToTable("MatchScores", matchScoresRows);

  // 2. Migrate Balls (Subcollection)
  if (ballsRows.length > 0) {
    console.log(`Migrating ${ballsRows.length} balls...`);
    const schemaBalls = [
      { name: "id", type: "STRING", mode: "REQUIRED" },
      { name: "matchScoreId", type: "STRING", mode: "REQUIRED" },
      { name: "run", type: "INTEGER", mode: "NULLABLE" },
      { name: "totalRun", type: "INTEGER", mode: "NULLABLE" },
      { name: "isWicket", type: "BOOLEAN", mode: "NULLABLE" },
      { name: "isNoBall", type: "BOOLEAN", mode: "NULLABLE" },
      { name: "isWideBall", type: "BOOLEAN", mode: "NULLABLE" },
      { name: "isOverEnd", type: "BOOLEAN", mode: "NULLABLE" },
      { name: "extra", type: "INTEGER", mode: "NULLABLE" },
      { name: "bowlerId", type: "STRING", mode: "NULLABLE" },
      { name: "bowlerName", type: "STRING", mode: "NULLABLE" },
      { name: "strikerId", type: "STRING", mode: "NULLABLE" },
      { name: "strikerName", type: "STRING", mode: "NULLABLE" },
      { name: "nonStrikerId", type: "STRING", mode: "NULLABLE" },
      { name: "nonStrikerName", type: "STRING", mode: "NULLABLE" },
      { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
    ];

    await createTableIfNeeded("MatchScoreBalls", schemaBalls);
    await loadDataToTable("MatchScoreBalls", ballsRows);
  } else {
    console.log("No balls subcollection data found.");
  }
}

// Main migration
async function migrateToBigQuery() {
  try {
    console.log("Starting migration...");
    await createDatasetIfNeeded();
    await migratePlayers();
    await migrateTournaments();
    await migrateClubs();
    await migrateTeams();
    await migrateMatches();
    await migratePlayerCareerStats();
    await migratePlayerTournamentStats();
    await migratePlayerMatchStats();
    await migrateTeamPlayerMapping();
    await migrateMatchScores();
    console.log("Migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateToBigQuery();
