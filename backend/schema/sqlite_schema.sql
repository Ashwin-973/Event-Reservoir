-- SQLite database schema for Event Reservoir Offline Mode

-- Attendees table - stores offline copy of attendee data
CREATE TABLE IF NOT EXISTS attendees (
  qr_code TEXT PRIMARY KEY,
  checked_in INTEGER DEFAULT 0,
  lunch_distributed INTEGER DEFAULT 0,
  kit_distributed INTEGER DEFAULT 0,
  last_updated TEXT
);

-- Sync queue table - tracks actions performed offline for later synchronization
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code TEXT,
  action_type TEXT,  -- 'lunch_distributed', 'kit_distributed'
  timestamp TEXT,
  synced INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
CREATE INDEX IF NOT EXISTS idx_sync_queue_qr_code ON sync_queue(qr_code);

-- Sample backup JSON format
/* 
{
  "timestamp": "2023-06-01T12:34:56.789Z",
  "attendees": [
    {
      "qr_code": "550e8400-e29b-41d4-a716-446655440000",
      "checked_in": 1,
      "lunch_distributed": 1,
      "kit_distributed": 0,
      "last_updated": "2023-06-01T12:30:45.123Z"
    },
    ...
  ],
  "sync_queue": [
    {
      "id": 1,
      "qr_code": "550e8400-e29b-41d4-a716-446655440000",
      "action_type": "lunch_distributed",
      "timestamp": "2023-06-01T12:29:33.456Z",
      "synced": 1
    },
    {
      "id": 2,
      "qr_code": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "action_type": "kit_distributed",
      "timestamp": "2023-06-01T12:33:22.111Z",
      "synced": 0
    },
    ...
  ]
}
*/ 