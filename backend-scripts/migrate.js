/**
 * Script: Firestore → BigQuery
 * Description: Reads all documents from a Firestore collection and writes them to BigQuery in SQL table format.
 */

const { Firestore } = require("@google-cloud/firestore");
const { BigQuery } = require("@google-cloud/bigquery");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ---- CONFIGURATION ----
const projectId = "scorecard-425315"; // Replace with your GCP Project ID
const serviceAccountKey = require("./scorecard-425315-2d9f91034520.json");
const collectionName = "playerCareerStats"; // Firestore collection name
const datasetId = "scorecard"; // BigQuery dataset
const tableId = "PlayerCareerStats"; // BigQuery table

// Initialize clients
const firestore = new Firestore({
  projectId: projectId,
  credentials: serviceAccountKey,
});
const bigquery = new BigQuery({
  projectId: projectId,
  credentials: serviceAccountKey,
});

async function exportFirestoreToBigQuery() {
  try {
    console.log(`Reading data from Firestore collection: ${collectionName}...`);
    const snapshot = await firestore.collection(collectionName).get();
    console.log("don here");

    if (snapshot.empty) {
      console.log("No documents found in Firestore.");
      return;
    }

    // Transform Firestore documents into plain objects
    const rows = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({
        id: doc.id,
        name: data.name,
        clubId: data.clubId,
        matches: data.matches,
        matchesWon: data.matchesWon,
        runs: data.runs,
        ballsFaced: data.ballsFaced,
        innings: data.innings,
        fours: data.fours,
        sixes: data.sixes,
        notOuts: data.notOuts,
        strikeRate: data.strikeRate,
        average: data.average,
        wickets: data.wickets,
        overs: data.overs,
        ballsBowled: data.ballsBowled,
        extras: data.extras,
        runsConceded: data.runsConceded,
        foursConceded: data.foursConceded,
        sixesConceded: data.sixesConceded,
        maidens: data.maidens,
        bowlingEconomy: data.bowlingEconomy,
        dotBalls: data.dotBalls,
        playerId: data.playerId,
      });
    });

    console.log(`Fetched ${rows.length} documents. Inserting into BigQuery...`);

    // Ensure dataset exists
    await bigquery.dataset(datasetId).get({ autoCreate: true });

    // Ensure table exists (create if missing)
    const schema = [
      { name: "id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "clubId", type: "STRING" },
      { name: "matches", type: "INTEGER" },
      { name: "matchesWon", type: "INTEGER" },
      { name: "runs", type: "INTEGER" },
      { name: "ballsFaced", type: "INTEGER" },
      { name: "innings", type: "INTEGER" },
      { name: "fours", type: "INTEGER" },
      { name: "sixes", type: "INTEGER" },
      { name: "notOuts", type: "INTEGER" },
      { name: "strikeRate", type: "FLOAT" },
      { name: "average", type: "FLOAT" },
      { name: "wickets", type: "INTEGER" },
      { name: "overs", type: "INTEGER" },
      { name: "ballsBowled", type: "INTEGER" },
      { name: "extras", type: "INTEGER" },
      { name: "runsConceded", type: "INTEGER" },
      { name: "foursConceded", type: "INTEGER" },
      { name: "sixesConceded", type: "INTEGER" },
      { name: "maidens", type: "INTEGER" },
      { name: "bowlingEconomy", type: "FLOAT" },
      { name: "dotBalls", type: "INTEGER" },
      { name: "playerId", type: "STRING" },
    ];
    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .get({ autoCreate: true, schema });

    // Use a LOAD job with a temporary JSONL file (allowed on free tier)
    const table = bigquery.dataset(datasetId).table(tableId);
    let tempFilePath = "";
    try {
      tempFilePath = path.join(
        os.tmpdir(),
        `bq_load_${tableId}_${Date.now()}.jsonl`
      );

      // Write newline-delimited JSON to temp file
      const jsonl = rows.map((r) => JSON.stringify(r)).join("\n");
      fs.writeFileSync(tempFilePath, jsonl, { encoding: "utf8" });

      const loadMetadata = {
        schema: { fields: schema },
        sourceFormat: "NEWLINE_DELIMITED_JSON",
        writeDisposition: "WRITE_APPEND", // change to WRITE_TRUNCATE to replace table
        ignoreUnknownValues: true,
      };

      const [job] = await table.load(tempFilePath, loadMetadata);
      console.log(
        `✅ Load job ${job.id} completed. Loaded ${rows.length} rows into ${datasetId}.${tableId}`
      );
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (_) {
          // best-effort cleanup
        }
      }
    }
  } catch (err) {
    console.error(
      "❌ Error exporting Firestore to BigQuery:",
      err,
      JSON.stringify(err),
      err.message
    );
  }
}

exportFirestoreToBigQuery();
