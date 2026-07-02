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

// ---------- BigQuery helpers ----------

async function createDatasetIfNeeded() {
  const dataset = bigquery.dataset(DATASET_ID);
  try {
    await dataset.create();
    console.log(`Dataset ${DATASET_ID} created.`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`Dataset ${DATASET_ID} already exists.`);
    } else {
      throw error;
    }
  }
}

// FULL_REFRESH=true forces a full re-read of every Firestore collection
// (slower but catches docs that were deleted from Firestore since the last
// run). Default is incremental.
const FULL_REFRESH = process.env.FULL_REFRESH === "true";

// Writes `rows` to `tableId` via a single load job with WRITE_TRUNCATE.
async function writeTableTruncate(tableId, rows, schema) {
  const table = bigquery.dataset(DATASET_ID).table(tableId);

  if (rows.length === 0) {
    console.log(
      `No rows to load for ${tableId} (leaving existing table contents untouched).`
    );
    return;
  }

  const jsonData = rows.map((row) => JSON.stringify(row)).join("\n");
  const tempFile = join(tmpdir(), `bigquery-${tableId}-${Date.now()}.json`);
  writeFileSync(tempFile, jsonData, "utf8");

  try {
    await table.load(tempFile, {
      schema: { fields: schema },
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      writeDisposition: "WRITE_TRUNCATE",
      createDisposition: "CREATE_IF_NEEDED",
    });
    console.log(`✓ Loaded ${rows.length} row(s) into ${tableId}`);
  } catch (e) {
    console.error(`Failed to load ${tableId}: ${e.message}`);
    throw e;
  } finally {
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // ignore
    }
  }
}

// Returns the MAX(updatedAt) currently in `tableId`, or null if the table
// doesn't exist yet (first run). Used as the watermark for incremental
// Firestore queries.
async function getLastUpdatedAt(tableId) {
  try {
    const [job] = await bigquery.createQueryJob({
      query: `SELECT MAX(updatedAt) AS m FROM \`${DATASET_ID}.${tableId}\``,
    });
    const [rows] = await job.getQueryResults();
    if (rows.length && rows[0].m && rows[0].m.value) {
      return new Date(rows[0].m.value);
    }
    if (rows.length && rows[0].m) {
      return new Date(rows[0].m);
    }
  } catch (e) {
    if (e.code === 404 || (e.message || "").includes("Not found")) {
      return null;
    }
    console.warn(`Could not read MAX(updatedAt) for ${tableId}:`, e.message);
  }
  return null;
}

// BigQuery returns TIMESTAMP fields as { value: 'ISO string' } objects;
// flatten back to scalars so we can re-serialize via load job.
function flattenBQValue(val, type) {
  if (val == null) return null;
  if (type === "TIMESTAMP") {
    if (val && typeof val === "object" && "value" in val) return val.value;
    if (val instanceof Date) return val.toISOString();
    return val;
  }
  return val;
}

// Reads the current contents of `tableId` from BigQuery and returns plain
// JS objects shaped per `schema`. Used to merge incremental Firestore
// changes with existing BQ data.
async function readExistingRows(tableId, schema) {
  try {
    const [job] = await bigquery.createQueryJob({
      query: `SELECT * FROM \`${DATASET_ID}.${tableId}\``,
    });
    const [rows] = await job.getQueryResults();
    return rows.map((row) => {
      const flat = {};
      for (const field of schema) {
        flat[field.name] = flattenBQValue(row[field.name], field.type);
      }
      return flat;
    });
  } catch (e) {
    if (e.code === 404 || (e.message || "").includes("Not found")) {
      return [];
    }
    throw e;
  }
}

// Merge new Firestore rows into the existing BQ table contents (by id)
// and write the result back atomically. Idempotent, no DML, no duplicates.
async function mergeAndLoad(tableId, schema, newRows) {
  if (newRows.length === 0) {
    console.log(`No new rows for ${tableId} since last run.`);
    return;
  }

  const existing = await readExistingRows(tableId, schema);
  console.log(
    `  ${tableId}: ${existing.length} existing + ${newRows.length} new/updated`
  );

  const byId = new Map();
  for (const row of existing) byId.set(row.id, row);
  for (const row of newRows) byId.set(row.id, row); // new wins

  await writeTableTruncate(tableId, Array.from(byId.values()), schema);
}

// ---------- Row builders ----------

const emptyToNull = (v) => (v === "" || v === undefined ? null : v);

const formatDate = (val) => {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  if (val.seconds) return new Date(val.seconds * 1000).toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "number") return new Date(val).toISOString();
  return null;
};

// Fetches Firestore docs. In FULL_REFRESH mode (or first run), returns
// everything. Otherwise filters on `updatedAt > lastUpdated`.
async function fetchDocs(collectionName, lastUpdated) {
  if (FULL_REFRESH || !lastUpdated) {
    console.log(
      `Fetching ALL ${collectionName}${FULL_REFRESH ? " (full refresh)" : ""}...`
    );
    return db.collection(collectionName).get();
  }
  console.log(
    `Fetching ${collectionName} updated after ${lastUpdated.toISOString()}...`
  );
  return db
    .collection(collectionName)
    .where("updatedAt", ">", lastUpdated)
    .get();
}

// ---------- Migrations ----------

async function migratePlayers() {
  console.log("Migrating players collection...");
  const lastUpdated = await getLastUpdatedAt("Players");
  const snapshot = await fetchDocs("players", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: emptyToNull(data.name),
      clubId: emptyToNull(data.clubId),
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("Players", rows, schema)
    : mergeAndLoad("Players", schema, rows));
}

async function migrateTournaments() {
  console.log("Migrating tournaments collection...");
  const lastUpdated = await getLastUpdatedAt("Tournaments");
  const snapshot = await fetchDocs("tournaments", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "NULLABLE" },
    { name: "date", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "isBoxCricket", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "status", type: "STRING", mode: "NULLABLE" },
    { name: "numberOfTeams", type: "INTEGER", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: emptyToNull(data.name),
      date: formatDate(data.date),
      clubId: emptyToNull(data.clubId),
      isBoxCricket: data.isBoxCricket ?? null,
      status: emptyToNull(data.status),
      numberOfTeams: data.numberOfTeams ?? null,
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("Tournaments", rows, schema)
    : mergeAndLoad("Tournaments", schema, rows));
}

async function migrateTournamentStandings() {
  console.log("Migrating tournamentStandings collection...");
  const lastUpdated = await getLastUpdatedAt("TournamentStandings");
  const snapshot = await fetchDocs("tournamentStandings", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "teamInitials", type: "STRING", mode: "NULLABLE" },
    { name: "teamName", type: "STRING", mode: "NULLABLE" },
    { name: "played", type: "INTEGER", mode: "NULLABLE" },
    { name: "wins", type: "INTEGER", mode: "NULLABLE" },
    { name: "losses", type: "INTEGER", mode: "NULLABLE" },
    { name: "ties", type: "INTEGER", mode: "NULLABLE" },
    { name: "points", type: "INTEGER", mode: "NULLABLE" },
    { name: "totalRunsScored", type: "INTEGER", mode: "NULLABLE" },
    { name: "totalOversFaced", type: "FLOAT", mode: "NULLABLE" },
    { name: "totalRunsConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "totalOversBowled", type: "FLOAT", mode: "NULLABLE" },
    { name: "nrr", type: "FLOAT", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      tournamentId: emptyToNull(data.tournamentId),
      clubId: emptyToNull(data.clubId),
      teamInitials: emptyToNull(data.teamInitials),
      teamName: emptyToNull(data.teamName),
      played: data.played ?? null,
      wins: data.wins ?? null,
      losses: data.losses ?? null,
      ties: data.ties ?? null,
      points: data.points ?? null,
      totalRunsScored: data.totalRunsScored ?? null,
      totalOversFaced: data.totalOversFaced ?? null,
      totalRunsConceded: data.totalRunsConceded ?? null,
      totalOversBowled: data.totalOversBowled ?? null,
      nrr: data.nrr ?? null,
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("TournamentStandings", rows, schema)
    : mergeAndLoad("TournamentStandings", schema, rows));
}

async function migratePlayerTournamentStats() {
  console.log("Migrating PlayerTournamentStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerTournamentStats");
  const snapshot = await fetchDocs("playerTournamentStats", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "playerId", type: "STRING", mode: "NULLABLE" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
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
    { name: "catches", type: "INTEGER", mode: "NULLABLE" },
    { name: "stumpings", type: "INTEGER", mode: "NULLABLE" },
    { name: "runOuts", type: "INTEGER", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      playerId: emptyToNull(data.playerId),
      tournamentId: emptyToNull(data.tournamentId),
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
      catches: data.catches ?? null,
      stumpings: data.stumpings ?? null,
      runOuts: data.runOuts ?? null,
      clubId: emptyToNull(data.clubId),
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("PlayerTournamentStats", rows, schema)
    : mergeAndLoad("PlayerTournamentStats", schema, rows));
}

async function migratePlayerMatchStats() {
  console.log("Migrating playerMatchStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerMatchStats");
  const snapshot = await fetchDocs("playerMatchStats", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "matchId", type: "STRING", mode: "NULLABLE" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "date", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "playerId", type: "STRING", mode: "NULLABLE" },
    { name: "playerName", type: "STRING", mode: "NULLABLE" },
    { name: "team", type: "STRING", mode: "NULLABLE" },

    { name: "runs", type: "INTEGER", mode: "NULLABLE" },
    { name: "ballsFaced", type: "INTEGER", mode: "NULLABLE" },
    { name: "fours", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixes", type: "INTEGER", mode: "NULLABLE" },
    { name: "strikeRate", type: "FLOAT", mode: "NULLABLE" },
    { name: "isOut", type: "BOOLEAN", mode: "NULLABLE" },

    { name: "overs", type: "FLOAT", mode: "NULLABLE" },
    { name: "maidens", type: "INTEGER", mode: "NULLABLE" },
    { name: "runsConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "wickets", type: "INTEGER", mode: "NULLABLE" },
    { name: "dotBalls", type: "INTEGER", mode: "NULLABLE" },
    { name: "bowlingEconomy", type: "FLOAT", mode: "NULLABLE" },
    { name: "extras", type: "INTEGER", mode: "NULLABLE" },
    { name: "foursConceded", type: "INTEGER", mode: "NULLABLE" },
    { name: "sixesConceded", type: "INTEGER", mode: "NULLABLE" },

    { name: "catches", type: "INTEGER", mode: "NULLABLE" },
    { name: "stumpings", type: "INTEGER", mode: "NULLABLE" },
    { name: "runOuts", type: "INTEGER", mode: "NULLABLE" },

    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    // The Firestore doc id is auto-generated; the real matchId lives in
    // data.matchId. Prefer it so joins to Matches.id work.
    const matchId = data.matchId || doc.id;
    const updatedAt = formatDate(data.updatedAt);
    const dateValue = formatDate(data.date || data.timestamp);

    if (data.playerMatchStats && Array.isArray(data.playerMatchStats)) {
      data.playerMatchStats.forEach((player) => {
        rows.push({
          id: `${matchId}_${player.playerId}`,
          matchId,
          tournamentId: emptyToNull(data.tournamentId),
          clubId: emptyToNull(data.clubId),
          date: dateValue,
          playerId: emptyToNull(player.playerId),
          playerName: emptyToNull(player.name),
          team: emptyToNull(player.team),
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
          catches: player.catches ?? 0,
          stumpings: player.stumpings ?? 0,
          runOuts: player.runOuts ?? 0,
          updatedAt,
        });
      });
    }
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("PlayerMatchStats", rows, schema)
    : mergeAndLoad("PlayerMatchStats", schema, rows));
}

async function migrateClubs() {
  console.log("Migrating clubs collection...");
  const lastUpdated = await getLastUpdatedAt("Clubs");
  const snapshot = await fetchDocs("clubs", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "name", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: emptyToNull(data.name),
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("Clubs", rows, schema)
    : mergeAndLoad("Clubs", schema, rows));
}

async function migrateTeams() {
  console.log("Migrating teams collection...");
  const lastUpdated = await getLastUpdatedAt("Teams");
  const snapshot = await fetchDocs("teams", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "teamName", type: "STRING", mode: "NULLABLE" },
    { name: "teamInitials", type: "STRING", mode: "NULLABLE" },
    { name: "teamShortName", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      teamName: emptyToNull(data.teamName),
      teamInitials: emptyToNull(data.teamInitials),
      // Editable UI label introduced alongside the immutable teamInitials join
      // key. Legacy docs have none, so fall back to teamInitials to match the
      // app's Team model default.
      teamShortName: emptyToNull(data.teamShortName ?? data.teamInitials),
      clubId: emptyToNull(data.clubId),
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("Teams", rows, schema)
    : mergeAndLoad("Teams", schema, rows));
}

async function migrateMatches() {
  console.log("Migrating matches collection...");
  const lastUpdated = await getLastUpdatedAt("Matches");
  const snapshot = await fetchDocs("matches", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "team1", type: "STRING", mode: "NULLABLE" },
    { name: "team2", type: "STRING", mode: "NULLABLE" },
    { name: "team1Fullname", type: "STRING", mode: "NULLABLE" },
    { name: "team2Fullname", type: "STRING", mode: "NULLABLE" },
    { name: "team1ShortName", type: "STRING", mode: "NULLABLE" },
    { name: "team2ShortName", type: "STRING", mode: "NULLABLE" },
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
    { name: "currentScore", type: "STRING", mode: "NULLABLE" },
    { name: "manOfTheMatch", type: "STRING", mode: "NULLABLE" },
    { name: "isFirstInning", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "quickMatch", type: "BOOLEAN", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      team1: emptyToNull(data.team1),
      team2: emptyToNull(data.team2),
      team1Fullname: emptyToNull(data.team1Fullname),
      team2Fullname: emptyToNull(data.team2Fullname),
      // Short-label snapshots taken at match creation (optional; older matches
      // predate them, so they stay null and consumers fall back to team1/team2).
      team1ShortName: emptyToNull(data.team1ShortName),
      team2ShortName: emptyToNull(data.team2ShortName),
      tossWin: emptyToNull(data.tossWin),
      choose: emptyToNull(data.choose),
      winner: emptyToNull(data.winner),
      result: emptyToNull(data.result),
      status: emptyToNull(data.status),
      startDateTime: formatDate(data.startDateTime),
      endDateTime: formatDate(data.endDateTime),
      clubId: emptyToNull(data.clubId),
      tournamentId: emptyToNull(data.tournamentId),
      wickets: data.wickets ?? null,
      overs: data.overs ?? null,
      currentScore: data.currentScore
        ? JSON.stringify(data.currentScore)
        : null,
      manOfTheMatch: emptyToNull(data.manOfTheMatch),
      isFirstInning: data.isFirstInning ?? null,
      quickMatch: data.quickMatch ?? null,
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("Matches", rows, schema)
    : mergeAndLoad("Matches", schema, rows));
}

async function migratePlayerCareerStats() {
  console.log("Migrating playerCareerStats collection...");
  const lastUpdated = await getLastUpdatedAt("PlayerCareerStats");
  const snapshot = await fetchDocs("playerCareerStats", lastUpdated);

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "playerId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
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
    { name: "catches", type: "INTEGER", mode: "NULLABLE" },
    { name: "stumpings", type: "INTEGER", mode: "NULLABLE" },
    { name: "runOuts", type: "INTEGER", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      playerId: emptyToNull(data.playerId),
      clubId: emptyToNull(data.clubId),
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
      catches: data.catches ?? null,
      stumpings: data.stumpings ?? null,
      runOuts: data.runOuts ?? null,
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("PlayerCareerStats", rows, schema)
    : mergeAndLoad("PlayerCareerStats", schema, rows));
}

// teamPlayerMapping stores `team` as a string (name/initials), not the real
// teamId. Build a lookup from the teams collection so we can populate a
// proper FK in BigQuery.
async function buildTeamIdLookup() {
  const snapshot = await db.collection("teams").get();
  const lookup = new Map();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const clubId = data.clubId || "";
    if (data.teamName) lookup.set(`${clubId}|${data.teamName}`, doc.id);
    if (data.teamInitials)
      lookup.set(`${clubId}|${data.teamInitials}`, doc.id);
  });
  return lookup;
}

async function migrateTeamPlayerMapping() {
  console.log("Migrating teamPlayerMapping collection...");
  const lastUpdated = await getLastUpdatedAt("TeamPlayers");
  const snapshot = await fetchDocs("teamPlayerMapping", lastUpdated);

  const teamIdLookup = await buildTeamIdLookup();

  const schema = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "mappingId", type: "STRING", mode: "NULLABLE" },
    { name: "teamId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "teamName", type: "STRING", mode: "NULLABLE" },
    { name: "playerId", type: "STRING", mode: "NULLABLE" },
    { name: "playerName", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const rows = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const mappingId = doc.id;
    const clubId = data.clubId || "";
    const teamName = data.team || "";
    const resolvedTeamId =
      teamIdLookup.get(`${clubId}|${teamName}`) || null;
    const updatedAt = formatDate(data.updatedAt);

    if (data.players && Array.isArray(data.players)) {
      data.players.forEach((p) => {
        rows.push({
          id: `${mappingId}_${p.id}`,
          mappingId,
          teamId: resolvedTeamId,
          clubId: emptyToNull(clubId),
          teamName: emptyToNull(teamName),
          playerId: emptyToNull(p.id),
          playerName: emptyToNull(p.name),
          updatedAt,
        });
      });
    }
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("TeamPlayers", rows, schema)
    : mergeAndLoad("TeamPlayers", schema, rows));
}

async function migrateMatchScores() {
  console.log("Migrating matchScores collection...");
  const lastUpdated = await getLastUpdatedAt("MatchScores");
  const snapshot = await fetchDocs("matchScores", lastUpdated);

  const schemaScores = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "matchId", type: "STRING", mode: "NULLABLE" },
    { name: "tournamentId", type: "STRING", mode: "NULLABLE" },
    { name: "clubId", type: "STRING", mode: "NULLABLE" },
    { name: "teamId", type: "STRING", mode: "NULLABLE" },
    { name: "inningNumber", type: "INTEGER", mode: "NULLABLE" },
    { name: "overNumber", type: "INTEGER", mode: "NULLABLE" },
    { name: "overSummary", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  const matchScoresRows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      matchId: emptyToNull(data.matchId),
      tournamentId: emptyToNull(data.tournamentId),
      clubId: emptyToNull(data.clubId),
      teamId: emptyToNull(data.teamId),
      inningNumber: data.inningNumber ?? null,
      overNumber: data.overNumber ?? null,
      overSummary: data.overSummary ? JSON.stringify(data.overSummary) : null,
      updatedAt: formatDate(data.updatedAt),
    };
  });

  await (FULL_REFRESH || !lastUpdated
    ? writeTableTruncate("MatchScores", matchScoresRows, schemaScores)
    : mergeAndLoad("MatchScores", schemaScores, matchScoresRows));

  await migrateBalls();
}

// Balls are stored as a subcollection under each matchScores doc. The
// parent's updatedAt does not change when a ball is added/edited, so we
// can't use the parent's incremental window. Instead we query each
// parent's `balls` subcollection with `where('updatedAt', '>', ...)` —
// that uses Firestore's auto-created single-field index on a single
// subcollection (no manual index needed).
async function migrateBalls() {
  console.log("Migrating balls subcollection...");
  const lastBallUpdated = await getLastUpdatedAt("MatchScoreBalls");

  // Enumerate every parent we need to scan. On first run / full refresh
  // we go straight to Firestore; on incremental runs we read the parent
  // ids out of the BQ MatchScores table (free SELECT) to avoid a Firestore
  // full scan.
  let parentIds;
  if (FULL_REFRESH || !lastBallUpdated) {
    const allParents = await db.collection("matchScores").get();
    parentIds = allParents.docs.map((d) => d.id);
  } else {
    try {
      const [job] = await bigquery.createQueryJob({
        query: `SELECT id FROM \`${DATASET_ID}.MatchScores\``,
      });
      const [rows] = await job.getQueryResults();
      parentIds = rows.map((r) => r.id).filter(Boolean);
    } catch (e) {
      // MatchScores table not in BQ yet — fall back to a Firestore scan.
      const allParents = await db.collection("matchScores").get();
      parentIds = allParents.docs.map((d) => d.id);
    }
  }

  if (parentIds.length === 0) {
    console.log("No matchScores parents; nothing to scan for balls.");
    return;
  }

  console.log(
    `Scanning balls under ${parentIds.length} matchScores parent(s)` +
      (lastBallUpdated && !FULL_REFRESH
        ? ` updated after ${lastBallUpdated.toISOString()}`
        : " (full)")
  );

  const rows = [];
  const PARENT_BATCH = 25; // limit concurrent Firestore reads

  for (let i = 0; i < parentIds.length; i += PARENT_BATCH) {
    const batchIds = parentIds.slice(i, i + PARENT_BATCH);
    const ballSnaps = await Promise.all(
      batchIds.map((pid) => {
        const ref = db.collection("matchScores").doc(pid).collection("balls");
        const q =
          lastBallUpdated && !FULL_REFRESH
            ? ref.where("updatedAt", ">", lastBallUpdated)
            : ref;
        return q.get();
      })
    );

    batchIds.forEach((pid, idx) => {
      ballSnaps[idx].docs.forEach((ballDoc) => {
        const b = ballDoc.data();
        rows.push({
          id: `${pid}_${ballDoc.id}`,
          ballId: ballDoc.id,
          matchScoreId: pid,
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
          outType: b.outType || null,
          fielderId: b.fielder?.id || null,
          fielderName: b.fielder?.name || null,
          updatedAt: formatDate(b.updatedAt),
        });
      });
    });
  }

  const schemaBalls = [
    { name: "id", type: "STRING", mode: "REQUIRED" },
    { name: "ballId", type: "STRING", mode: "NULLABLE" },
    { name: "matchScoreId", type: "STRING", mode: "NULLABLE" },
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
    { name: "outType", type: "STRING", mode: "NULLABLE" },
    { name: "fielderId", type: "STRING", mode: "NULLABLE" },
    { name: "fielderName", type: "STRING", mode: "NULLABLE" },
    { name: "updatedAt", type: "TIMESTAMP", mode: "NULLABLE" },
  ];

  await (FULL_REFRESH || !lastBallUpdated
    ? writeTableTruncate("MatchScoreBalls", rows, schemaBalls)
    : mergeAndLoad("MatchScoreBalls", schemaBalls, rows));
}

// ---------- Entry point ----------

async function migrateToBigQuery() {
  try {
    console.log("Starting migration...");
    await createDatasetIfNeeded();
    await migratePlayers();
    await migrateTournaments();
    await migrateTournamentStandings();
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
