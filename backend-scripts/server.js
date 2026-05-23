import express from "express";
import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Make .jsx files load with a Content-Type that triggers Babel processing.
// Must run before express.static so the header is set before the file is sent.
app.use((req, res, next) => {
  if (req.path.endsWith(".jsx")) res.type("text/babel");
  next();
});

// Serve static files
app.use(express.static(__dirname, {
  setHeaders(res, path) {
    if (path.endsWith(".jsx")) res.setHeader("Content-Type", "text/babel");
  },
}));

// Initialize BigQuery
let projectId =
  process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;

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

// Dataset that holds the ScoreCard Stats tables (Tournaments, Players, ...).
// Matches the legacy BattingQuery.txt / BowlingQuery.txt / WinningQuery.txt
// which read from `scorecard.*` — that's where the data actually lives.
// Override with BQ_DATASET=... in .env if your project uses a different name.
const DATASET = process.env.BQ_DATASET || "scorecard";

// Defensive caps so a runaway dataset can't OOM the client.
const BOOTSTRAP_LIMITS = {
  PlayerMatchStats: 50000,
  MatchScoreBalls: 200000,
};

// ---- Bootstrap cache (60s in-memory) -------------------------------------
let bootstrapCache = null;
let bootstrapCacheAt = 0;
let bootstrapInFlight = null;
const BOOTSTRAP_TTL_MS = 60_000;

async function runQuery(sql, params) {
  const opts = { query: sql };
  if (params) opts.params = params;
  const [job] = await bigquery.createQueryJob(opts);
  const [rows] = await job.getQueryResults();
  return rows;
}

function unwrapBQValues(rows) {
  // BigQuery returns TIMESTAMP cells as { value: "2024-..." } objects. Flatten
  // them so the client sees plain ISO strings (everything else passes through).
  return rows.map((row) => {
    const out = {};
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (v && typeof v === "object" && "value" in v && Object.keys(v).length === 1) {
        out[k] = v.value;
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

async function loadBootstrap() {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCacheAt < BOOTSTRAP_TTL_MS) {
    return bootstrapCache;
  }
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = (async () => {
    const ds = DATASET;
    const pmsLimit = BOOTSTRAP_LIMITS.PlayerMatchStats;
    const ballLimit = BOOTSTRAP_LIMITS.MatchScoreBalls;

    const queries = {
      clubs: `SELECT * FROM \`${ds}.Clubs\``,
      tournaments: `SELECT * FROM \`${ds}.Tournaments\``,
      teams: `SELECT * FROM \`${ds}.Teams\``,
      players: `SELECT * FROM \`${ds}.Players\``,
      teamPlayers: `SELECT * FROM \`${ds}.TeamPlayers\``,
      matches: `SELECT * FROM \`${ds}.Matches\``,
      playerMatchStats: `SELECT * FROM \`${ds}.PlayerMatchStats\` LIMIT ${pmsLimit}`,
      playerCareerStats: `SELECT * FROM \`${ds}.PlayerCareerStats\``,
      playerTournamentStats: `SELECT * FROM \`${ds}.PlayerTournamentStats\``,
      // Flatten balls with matchId + inningNumber via the parent MatchScores row.
      matchScoreBalls: `
        SELECT b.*, ms.matchId AS matchId, ms.inningNumber AS inning
        FROM \`${ds}.MatchScoreBalls\` b
        JOIN \`${ds}.MatchScores\` ms ON b.matchScoreId = ms.id
        LIMIT ${ballLimit}
      `,
    };

    const entries = Object.entries(queries);
    console.log(`[bootstrap] querying dataset=${ds} project=${projectId}`);
    const results = await Promise.all(
      entries.map(async ([key, sql]) => {
        const t0 = Date.now();
        try {
          const rows = await runQuery(sql);
          const unwrapped = unwrapBQValues(rows);
          console.log(`[bootstrap] ${key}: ${unwrapped.length} rows (${Date.now() - t0}ms)`);
          return [key, unwrapped];
        } catch (err) {
          console.error(`[bootstrap] ${key} FAILED:`, err.message);
          return [key, []];
        }
      }),
    );

    const data = Object.fromEntries(results);
    data.asOf = new Date().toISOString();

    bootstrapCache = data;
    bootstrapCacheAt = Date.now();
    return data;
  })();

  try {
    return await bootstrapInFlight;
  } finally {
    bootstrapInFlight = null;
  }
}

app.get("/api/bootstrap", async (_req, res) => {
  try {
    const data = await loadBootstrap();
    const counts = {};
    for (const k of Object.keys(data)) {
      if (Array.isArray(data[k])) counts[k] = data[k].length;
    }
    res.set("X-SCS-Row-Counts", JSON.stringify(counts));
    res.json(data);
  } catch (err) {
    console.error("/api/bootstrap error:", err);
    res.status(500).json({ error: err.message || "bootstrap failed" });
  }
});

// Lists every dataset in the project and every table in each, with row counts.
// Use this to confirm the data is actually where DATASET expects it.
app.get("/api/diag", async (_req, res) => {
  const out = {
    projectId,
    configuredDataset: DATASET,
    datasets: [],
  };
  try {
    const [datasets] = await bigquery.getDatasets();
    for (const ds of datasets) {
      const dsInfo = { id: ds.id, tables: [] };
      try {
        const [tables] = await ds.getTables();
        for (const t of tables) {
          let rowCount = null;
          try {
            const [meta] = await t.getMetadata();
            rowCount = meta.numRows != null ? Number(meta.numRows) : null;
          } catch (_) {}
          dsInfo.tables.push({ id: t.id, rows: rowCount });
        }
      } catch (err) {
        dsInfo.error = err.message;
      }
      out.datasets.push(dsInfo);
    }
    res.json(out);
  } catch (err) {
    console.error("/api/diag error:", err);
    res.status(500).json({ error: err.message, partial: out });
  }
});

// Force-refresh the bootstrap cache (handy after a migration run).
app.post("/api/bootstrap/refresh", async (_req, res) => {
  bootstrapCache = null;
  bootstrapCacheAt = 0;
  try {
    await loadBootstrap();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All balls for a single match (joined with MatchScores for matchId/inning).
app.get("/api/match/:id/balls", async (req, res) => {
  try {
    const sql = `
      SELECT b.*, ms.matchId AS matchId, ms.inningNumber AS inning
      FROM \`${DATASET}.MatchScoreBalls\` b
      JOIN \`${DATASET}.MatchScores\` ms ON b.matchScoreId = ms.id
      WHERE ms.matchId = @matchId
      ORDER BY ms.inningNumber, ms.overNumber, b.id
    `;
    const rows = await runQuery(sql, { matchId: req.params.id });
    res.json(unwrapBQValues(rows));
  } catch (err) {
    console.error("/api/match/:id/balls error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Every ball between a specific striker and bowler (head-to-head, personal matchups).
app.get("/api/h2h/balls", async (req, res) => {
  const { striker, bowler } = req.query;
  if (!striker || !bowler) {
    return res.status(400).json({ error: "striker and bowler query params required" });
  }
  try {
    const sql = `
      SELECT b.*, ms.matchId AS matchId, ms.inningNumber AS inning
      FROM \`${DATASET}.MatchScoreBalls\` b
      JOIN \`${DATASET}.MatchScores\` ms ON b.matchScoreId = ms.id
      WHERE b.strikerId = @striker AND b.bowlerId = @bowler
      ORDER BY ms.matchId, ms.inningNumber, ms.overNumber, b.id
    `;
    const rows = await runQuery(sql, { striker, bowler });
    res.json(unwrapBQValues(rows));
  } catch (err) {
    console.error("/api/h2h/balls error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Matches played between two teams (team-vs-team mode of the H2H page).
app.get("/api/h2h/team-pair", async (req, res) => {
  const { team1, team2 } = req.query;
  if (!team1 || !team2) {
    return res.status(400).json({ error: "team1 and team2 query params required" });
  }
  try {
    const sql = `
      SELECT *
      FROM \`${DATASET}.Matches\`
      WHERE (team1 = @t1 AND team2 = @t2) OR (team1 = @t2 AND team2 = @t1)
      ORDER BY startDateTime DESC
    `;
    const rows = await runQuery(sql, { t1: team1, t2: team2 });
    res.json(unwrapBQValues(rows));
  } catch (err) {
    console.error("/api/h2h/team-pair error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Legacy /api/stats/:type endpoints (kept while legacy/ dashboard exists) ----

// Helper function to read query from file
async function getQuery(queryType) {
  const queryFiles = {
    batting: "BattingQuery.txt",
    bowling: "BowlingQuery.txt",
    winning: "WinningQuery.txt",
  };

  const fileName = queryFiles[queryType];
  if (!fileName) {
    throw new Error(`Invalid query type: ${queryType}`);
  }

  const filePath = join(__dirname, fileName);
  const query = await readFile(filePath, "utf8");
  return query.trim();
}

// Helper function to modify query with date range
function modifyQueryWithDateRange(query, year, month) {
  // Calculate start date (first day of selected month)
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  
  // Calculate end date (first day of next month)
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = year + 1;
  }
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  // Replace the date condition
  // Pattern: AND t.date > 'YYYY-MM-DD' or AND t.date >= 'YYYY-MM-DD' or AND t.date < 'YYYY-MM-DD'
  // This pattern matches: AND (optional spaces) t.date (optional spaces) > or >= or < (optional spaces) 'date'
  const datePattern = /AND\s+t\.date\s*[><=]+\s*'[\d-]+'/gi;
  
  // Replace with new date range
  const newDateCondition = `AND t.date >= '${startDate}' AND t.date < '${endDate}'`;
  
  // Replace the old date condition - replace all occurrences
  const modifiedQuery = query.replace(datePattern, newDateCondition);
  
  return modifiedQuery;
}

// API endpoint to execute BigQuery
app.get("/api/stats/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { year, month } = req.query;

    // Validate year and month
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: "Year and month parameters are required",
      });
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid year or month",
      });
    }

    let query = await getQuery(type);
    query = modifyQueryWithDateRange(query, yearNum, monthNum);

    console.log(`Executing ${type} query for ${year}-${month}...`);
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute query",
    });
  }
});

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

