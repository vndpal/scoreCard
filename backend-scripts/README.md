# Firestore to BigQuery Migration Script

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

- The script will create tables if they don't exist
- If tables already exist, data will be appended (you may want to truncate tables first for fresh imports)
- Firestore Timestamps are converted to BigQuery TIMESTAMP format
- The script handles missing/null values appropriately

## Troubleshooting

1. **Authentication errors:**

   - Ensure your service account key has proper permissions
   - Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly

2. **BigQuery permission errors:**

   - Ensure the service account has BigQuery Data Editor and Job User roles
   - Grant permissions in Google Cloud Console > IAM & Admin

3. **Table already exists:**
   - The script will append data to existing tables
   - To replace data, manually delete tables in BigQuery first

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

**Note**: Make sure the dataset name in the query files matches your BigQuery dataset. The queries currently use `scorecard` as the dataset name. If your dataset is named differently (e.g., `scorecard_data`), update the queries accordingly.

### Customization

- **Port**: Set the `PORT` environment variable to change the server port (default: 3000)
- **Queries**: Edit the `.txt` files to modify the BigQuery queries
- **Styling**: Customize `style.css` to change the appearance
- **Dataset Name**: Update the dataset name in the query files if it differs from `scorecard`
