# ScoreCard Stats — Backend & Analytics Portal

This folder is self-contained — it ships its own `package.json`, dependencies,
service account key, and static front-end. It can be cut into its own repo
without depending on anything outside this directory.

It contains two things:

1. **Stats portal** (`server.js` + `index.html` + `data.js` + `app.jsx` + `ui.jsx` + `pages/*.jsx`) —
   a Statsguru-style React web app that reads from BigQuery.
2. **Firestore → BigQuery migration** (`migrateToBigQuery.js`) — the data
   pipeline that populates the tables the portal queries.

The legacy single-page dashboard was archived under `legacy/`.

## Running the stats portal

```bash
npm install
node server.js
# open http://localhost:3000
```

Server endpoints (all read from `BQ_DATASET`, default `scorecard_data`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bootstrap` | Returns clubs, tournaments, teams, players, teamPlayers, matches, playerMatchStats, playerCareerStats, playerTournamentStats, and matchScoreBalls (joined with MatchScores for matchId / inning). 60s in-memory cache. |
| POST | `/api/bootstrap/refresh` | Force-clears the bootstrap cache (run after a migration). |
| GET | `/api/match/:id/balls` | All balls for a single match. |
| GET | `/api/h2h/balls?striker=&bowler=` | Every ball between a specific striker / bowler pair. |
| GET | `/api/h2h/team-pair?team1=&team2=` | Matches played between two teams. |
| GET | `/api/stats/:type?year=&month=` | Legacy monthly stats endpoints (kept for back-compat with `legacy/`). |

`index.html` loads `data.js` first; `data.js` fetches `/api/bootstrap`, enriches
the rows into the shape the design pages expect (lookup maps, per-match
`inn1`/`inn2`, derived player role, `isFour`/`isSix` flags on balls), then
dynamically injects all the Babel-compiled JSX modules. The whole front-end
runs from the CDN-loaded React + Tailwind + Recharts + Lucide bundle wired in
`index.html` — there is no build step.

Defensive caps in `server.js`: `PlayerMatchStats LIMIT 50000`,
`MatchScoreBalls LIMIT 200000`. Bump via the `BOOTSTRAP_LIMITS` object if the
dataset grows.

## Firestore → BigQuery migration

The rest of this README covers the migration script that populates the BQ
tables the portal reads.

---

This script migrates data from Firestore collections to BigQuery tables.

## Collections Migrated

- `players`
- `tournaments`
- `PlayerTournamentStats`

**Note:** If your Firestore collection names differ (e.g., `playerTournamentStats` instead of `PlayerTournamentStats`), update the collection names in the script accordingly.

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Firebase Admin SDK** service account key
3. **Google Cloud Project** with BigQuery API enabled
4. **BigQuery** permissions for the service account

## Setup

1. **Install dependencies:**

   ```bash
   cd backend-scripts
   npm install
   ```

2. **Set up Firebase Admin SDK:**

   To get your Firebase service account key file (`serviceAccountKey.json`):

   a. **Go to Firebase Console:**

   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project

   b. **Navigate to Project Settings:**

   - Click the gear icon (⚙️) next to "Project Overview" in the left sidebar
   - Select "Project settings"

   c. **Go to Service Accounts tab:**

   - Click on the "Service accounts" tab at the top

   d. **Generate New Private Key:**

   - Click the "Generate new private key" button
   - A dialog will appear warning you about keeping the key secure
   - Click "Generate key" to confirm
   - A JSON file will automatically download to your computer

   e. **Save the file:**

   - Rename the downloaded file to `serviceAccountKey.json`
   - Move it to the `backend-scripts` folder
   - **Important:** Keep this file secure and never commit it to version control (it's already in `.gitignore`)

   **Alternative:** If you prefer to use environment variables instead of a file, you can:

   - Copy the entire JSON content from the downloaded file
   - Set it as `FIREBASE_SERVICE_ACCOUNT_KEY` in your `.env` file (as a JSON string)

3. **Configure environment variables:**

   - Copy `env.example` to `.env`:
     - **On Linux/Mac:** `cp env.example .env`
     - **On Windows:** `copy env.example .env` (or manually create `.env` and copy the contents)
   - Update the values in `.env`:
     ```env
     FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
     GOOGLE_CLOUD_PROJECT_ID=your-project-id
     BIGQUERY_DATASET_ID=scorecard_data
     ```

4. **Set up Google Cloud credentials:**
   - The script will use the same service account key for BigQuery
   - Alternatively, set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

## Usage

Run the migration script:

```bash
npm run migrate-to-bigquery
```

Or directly:

```bash
node migrateToBigQuery.js
```

## What the Script Does

1. **Connects to Firestore** using Firebase Admin SDK
2. **Reads data** from the three collections
3. **Creates BigQuery dataset** if it doesn't exist
4. **Creates BigQuery tables** with appropriate schemas if they don't exist
5. **Transforms data** (converts Firestore Timestamps to BigQuery TIMESTAMP format)
6. **Inserts data** into BigQuery tables

## BigQuery Tables Created

- `players` - Player information
- `tournaments` - Tournament information
- `playerTournamentStats` - Player statistics per tournament

## Notes

- The script creates tables if they don't exist
- **Incremental by default.** Each run reads `MAX(updatedAt)` from the target BigQuery table and only pulls Firestore docs where `updatedAt > <that watermark>`. First run (or any time the table is missing) does a full backfill.
- **No DML, works on the BigQuery sandbox.** For incremental runs, the script reads the existing table contents into memory, merges new/updated rows by `id` (new wins), and rewrites the table with a single `WRITE_TRUNCATE` load job. SELECT queries and load jobs are both free on the sandbox.
- **Balls subcollection**: the parent's `updatedAt` doesn't change when a ball is added/edited, so the script enumerates parent ids (from the BigQuery `MatchScores` table on incremental runs, so we don't re-scan all parents in Firestore) and queries each parent's `balls` subcollection with `where('updatedAt', '>', watermark)`. The composite id `${matchScoreId}_${ballId}` keeps balls from different overs distinct.
- **Deletes are not propagated.** Incremental queries can't see deleted Firestore docs, so a doc that's deleted in Firestore will linger in BigQuery. This is intentional and acceptable for this project — records rarely get deleted, and stale rows in BigQuery don't affect the analytics use case.
- A `FULL_REFRESH=true` env flag is kept as an escape hatch for cases where you do want a clean rewrite (e.g., after a schema change, or to recover from a bad run):
  ```bash
  # Windows PowerShell
  $env:FULL_REFRESH="true"; npm run migrate-to-bigquery
  # Linux/Mac
  FULL_REFRESH=true npm run migrate-to-bigquery
  ```
  You don't need to run this on any schedule.
- Firestore Timestamps are converted to BigQuery TIMESTAMP format
- Missing/null values are stored as `NULL` rather than empty strings

## Troubleshooting

1. **Authentication errors:**

   - Ensure your service account key has proper permissions
   - Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

2. **BigQuery permission errors:**

   - Ensure the service account has BigQuery Data Editor and Job User roles
   - Grant permissions in Google Cloud Console > IAM & Admin

3. **Table already exists:**
   - That's expected. The script `MERGE`s on `id`, so re-running is safe.
   - To reset, delete the table in BigQuery and re-run for a full backfill.

## Web Dashboard

A beautiful web interface is available to view statistics from BigQuery.

### Starting the Web Server

1. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

2. **Start the server**:

   ```bash
   npm start
   ```

   Or:

   ```bash
   node server.js
   ```

3. **Open in browser**:
   - The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable)
   - Open your browser and navigate to the URL shown in the console

### Features

The dashboard provides three types of statistics:

- **Batting Stats**: Player batting performance including runs, strike rate, average, etc.
- **Bowling Stats**: Player bowling performance including wickets, economy, dot balls, etc.
- **Winning Stats**: Player win percentage and match statistics

### Query Files

The queries are stored in:

- `BattingQuery.txt` - Batting statistics query
- `BowlingQuery.txt` - Bowling statistics query
- `WinningQuery.txt` - Winning statistics query

**Note**: The query files reference `scorecard_data` (the default `BIGQUERY_DATASET_ID`). If you set a different dataset name in `.env`, update the queries accordingly.

### Customization

- **Port**: Set the `PORT` environment variable to change the server port (default: 3000)
- **Queries**: Edit the `.txt` files to modify the BigQuery queries
- **Styling**: Customize `style.css` to change the appearance
- **Dataset Name**: Update the dataset name in the query files if it differs from `scorecard`
