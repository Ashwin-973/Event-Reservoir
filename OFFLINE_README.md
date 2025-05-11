# Event Reservoir - Offline Mode

This document explains how to set up and test the offline functionality for Event Reservoir.

## Overview

The offline mode allows the Event Reservoir app to function without an internet connection, enabling:

1. QR code scanning for lunch/kit distribution
2. Prevention of multiple collections per attendee
3. Local storage of actions taken while offline
4. Automatic syncing with the server when internet is restored
5. Regular local backups

## Requirements

- Node.js v14 or higher
- SQLite3
- Electron (if running as a desktop app)

## Setup

### Backend Setup

1. Install the required dependencies:

```bash
cd backend
npm install
```

2. Start the Express server:

```bash
npm run dev
```

3. Start the offline sync service in a separate terminal:

```bash
cd backend
npm run sync
```

### Testing Offline Mode in Browser

While the app is designed to work as an Electron app for full offline functionality, you can test some aspects in the browser:

1. Start the frontend development server:

```bash
cd frontend
npm run dev
```

2. Open the app in your browser (typically http://localhost:5173)

3. To simulate offline mode:
   - Turn off your internet connection
   - Or use Chrome DevTools: Network tab > check "Offline"

### Using as an Electron App (Full Offline Support)

1. Build the Electron app (requires Electron setup):

```bash
cd frontend
npm run electron:build
```

2. Run the built application from the `dist_electron` folder

## Offline Features

### 1. Attendee Data Syncing

- When online, attendee data is automatically downloaded every 5 minutes
- This data is stored in a local SQLite database (`eventreservoir_offline.db`)
- You can manually sync by clicking the "Sync Data" button on the Dashboard

### 2. Offline QR Scanning

- When offline, scanned QR codes are validated against the local database
- The UI shows an "Offline Mode Active" indicator
- Actions are logged in a local sync queue for later synchronization

### 3. Preventing Multiple Collections

- The local database prevents multiple distributions to the same attendee
- SQLite's PRIMARY KEY constraint ensures each QR code is unique

### 4. Sync Queue

- All offline actions are stored in the `sync_queue` table
- When internet is restored, these actions are automatically synced
- The Dashboard shows pending sync actions

### 5. Local Backups

- The database is automatically backed up every 10 minutes
- Backups are stored in JSON format in the `backups` directory
- You can manually trigger a backup from the Dashboard

## Testing Workflow

1. **Initial Setup:**
   - Ensure the backend server is running
   - Start the frontend application
   - Verify you can see attendee data on the Dashboard

2. **Offline Mode Testing:**
   - Disconnect from the internet
   - Observe the "Offline Mode" indicator
   - Try scanning a QR code
   - Verify the action is recorded locally
   - Try scanning the same QR code again (should show "already collected")

3. **Sync Testing:**
   - Reconnect to the internet
   - Observe automatic syncing or click "Sync Data"
   - Verify the Dashboard shows updated counts
   - Check the server database to ensure actions were synced

## Troubleshooting

- **SQLite Errors:** Ensure SQLite3 is properly installed on your system
- **Sync Errors:** Check network connectivity and server logs
- **Database Corruption:** Use the backup files to restore data

For more assistance, check the main application logs located in the backend/logs directory.

## Architecture

The offline mode is built with the following components:

1. **SQLite Database:**
   - `attendees` table: Stores attendee data for offline validation
   - `sync_queue` table: Logs actions performed while offline

2. **Sync Service:**
   - Runs background tasks for data synchronization
   - Manages connectivity checking and automatic syncing

3. **Frontend Components:**
   - Offline indicators in the UI
   - Fallback validation logic in QR scanner
   - Sync status display

---

Created for Event Reservoir - Offline MVP 