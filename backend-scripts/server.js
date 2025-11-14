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

// Serve static files
app.use(express.static(__dirname));

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

