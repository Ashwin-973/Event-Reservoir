import axios from 'axios';

// Check if we're running in Electron
const isElectron = () => {
  return window && window.process && window.process.type;
};

// Initialize Node.js modules only if running in Electron
let sqlite3, fs, path, betterSqlite3;
if (isElectron()) {
  sqlite3 = window.require('sqlite3');
  fs = window.require('fs-extra');
  path = window.require('path');
  betterSqlite3 = window.require('better-sqlite3');
}

const DB_PATH = isElectron() ? path.join(process.cwd(), 'eventreservoir_offline.db') : null;
const BACKUP_DIR = isElectron() ? path.join(process.cwd(), 'backups') : null;

// Create and initialize the database (Electron only)
const initDatabase = () => {
  if (!isElectron()) {
    console.warn('SQLite operations are only available in Electron environment');
    return Promise.resolve(null);
  }

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const db = betterSqlite3(DB_PATH);

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendees (
      qr_code TEXT PRIMARY KEY,
      checked_in INTEGER DEFAULT 0,
      lunch_distributed INTEGER DEFAULT 0,
      kit_distributed INTEGER DEFAULT 0,
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT,
      action_type TEXT,
      timestamp TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  return db;
};

// Singleton database instance
let dbInstance = null;

// Get database connection
const getDb = () => {
  if (!isElectron()) {
    console.warn('SQLite operations are only available in Electron environment');
    return null;
  }

  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
};

// Check network connection
const isOnline = async () => {
  try {
    await axios.get('/api/health', { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
};

// Sync attendee data from server
export const syncAttendeesFromServer = async () => {
  if (!isElectron()) {
    return { error: 'Offline mode only available in desktop app' };
  }

  try {
    // Fetch data from server
    const response = await axios.get('/api/offline/sync');
    
    if (response.data && response.data.status === 'success') {
      const attendeesData = response.data.data;
      const db = getDb();
      
      // Begin transaction
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO attendees (qr_code, checked_in, lunch_distributed, kit_distributed, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((attendees) => {
        for (const attendee of attendees) {
          insertStmt.run(
            attendee.qr_code,
            attendee.checked_in ? 1 : 0,
            attendee.lunch_distributed ? 1 : 0,
            attendee.kit_distributed ? 1 : 0,
            new Date().toISOString()
          );
        }
        return attendees.length;
      });
      
      const count = transaction(attendeesData);
      
      return { 
        success: true, 
        message: `Synced ${count} attendees for offline use`,
        count 
      };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error syncing attendees:', error);
    return { 
      error: true, 
      message: `Failed to sync: ${error.message}` 
    };
  }
};

// Get an attendee by QR code (online or offline)
export const getAttendeeByQrCode = async (qrCode) => {
  try {
    // Try online mode first
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await axios.get(`/api/attendee/${qrCode}`);
        return response.data;
      } catch (error) {
        // Fall back to offline if online request fails
        console.log('Online request failed, falling back to offline mode');
      }
    }

    // Offline mode (Electron only)
    if (isElectron()) {
      const db = getDb();
      const attendee = db.prepare('SELECT * FROM attendees WHERE qr_code = ?').get(qrCode);
      
      if (!attendee) {
        return { error: 'Attendee not found' };
      }
      
      // Convert SQLite integer to boolean
      return {
        qr_code: attendee.qr_code,
        checked_in: Boolean(attendee.checked_in),
        lunch_distributed: Boolean(attendee.lunch_distributed),
        kit_distributed: Boolean(attendee.kit_distributed),
        offline: true
      };
    } else {
      return { error: 'Offline mode only available in desktop app' };
    }
  } catch (error) {
    console.error('Error getting attendee:', error);
    return { error: error.message };
  }
};

// Distribute lunch (online or offline)
export const distributeLunch = async (qrCode) => {
  try {
    // Try online mode first
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await axios.post('/api/distribute/lunch', { qrCode });
        return response.data;
      } catch (error) {
        // If we got a specific error from the server, return it
        if (error.response && error.response.data) {
          return error.response.data;
        }
        // Otherwise fall back to offline if online request fails
        console.log('Online request failed, falling back to offline mode');
      }
    }

    // Offline mode (Electron only)
    if (isElectron()) {
      const db = getDb();
      
      // Check if attendee exists and lunch not distributed yet
      const attendee = db.prepare('SELECT * FROM attendees WHERE qr_code = ?').get(qrCode);
      
      if (!attendee) {
        return { 
          status: 'error',
          error: 'Attendee not found',
          offline: true
        };
      }
      
      if (attendee.lunch_distributed) {
        return { 
          status: 'already_distributed',
          error: 'Attendee already collected lunch',
          offline: true
        };
      }
      
      // Update lunch status
      db.prepare('UPDATE attendees SET lunch_distributed = 1, last_updated = ? WHERE qr_code = ?')
        .run(new Date().toISOString(), qrCode);
      
      // Add to sync queue
      db.prepare('INSERT INTO sync_queue (qr_code, action_type, timestamp) VALUES (?, ?, ?)')
        .run(qrCode, 'lunch_distributed', new Date().toISOString());
      
      return {
        status: 'success',
        message: 'Lunch distributed successfully (offline)',
        offline: true
      };
    } else {
      return { error: 'Offline mode only available in desktop app' };
    }
  } catch (error) {
    console.error('Error distributing lunch:', error);
    return { 
      status: 'error',
      error: error.message,
      offline: !await isOnline()
    };
  }
};

// Distribute kit (online or offline)
export const distributeKit = async (qrCode) => {
  try {
    // Try online mode first
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await axios.post('/api/distribute/kit', { qrCode });
        return response.data;
      } catch (error) {
        // If we got a specific error from the server, return it
        if (error.response && error.response.data) {
          return error.response.data;
        }
        // Otherwise fall back to offline if online request fails
        console.log('Online request failed, falling back to offline mode');
      }
    }

    // Offline mode (Electron only)
    if (isElectron()) {
      const db = getDb();
      
      // Check if attendee exists and kit not distributed yet
      const attendee = db.prepare('SELECT * FROM attendees WHERE qr_code = ?').get(qrCode);
      
      if (!attendee) {
        return { 
          status: 'error',
          error: 'Attendee not found',
          offline: true
        };
      }
      
      if (attendee.kit_distributed) {
        return { 
          status: 'already_distributed',
          error: 'Attendee already collected kit',
          offline: true
        };
      }
      
      // Update kit status
      db.prepare('UPDATE attendees SET kit_distributed = 1, last_updated = ? WHERE qr_code = ?')
        .run(new Date().toISOString(), qrCode);
      
      // Add to sync queue
      db.prepare('INSERT INTO sync_queue (qr_code, action_type, timestamp) VALUES (?, ?, ?)')
        .run(qrCode, 'kit_distributed', new Date().toISOString());
      
      return {
        status: 'success',
        message: 'Kit distributed successfully (offline)',
        offline: true
      };
    } else {
      return { error: 'Offline mode only available in desktop app' };
    }
  } catch (error) {
    console.error('Error distributing kit:', error);
    return { 
      status: 'error',
      error: error.message,
      offline: !await isOnline()
    };
  }
};

// Sync offline actions with server
export const syncOfflineActions = async () => {
  if (!isElectron()) {
    return { error: 'Offline mode only available in desktop app' };
  }

  try {
    // Check if online
    const online = await isOnline();
    if (!online) {
      return { 
        error: true, 
        message: 'Cannot sync while offline' 
      };
    }

    const db = getDb();
    
    // Get pending actions
    const pendingActions = db.prepare('SELECT * FROM sync_queue WHERE synced = 0').all();
    
    if (pendingActions.length === 0) {
      return { 
        success: true, 
        message: 'No actions to sync',
        count: 0
      };
    }
    
    // Format actions for the server
    const actions = pendingActions.map(item => ({
      qr_code: item.qr_code,
      action_type: item.action_type,
      timestamp: item.timestamp
    }));
    
    // Send to server
    const response = await axios.post('/api/offline/process-queue', { actions });
    
    if (response.data && response.data.status === 'completed') {
      // Mark successfully synced items
      const syncedIds = response.data.results
        .filter(result => result.synced)
        .map(result => {
          // Find the corresponding id from our pending actions
          const action = pendingActions.find(item => item.qr_code === result.qr_code);
          return action ? action.id : null;
        })
        .filter(id => id !== null);
      
      if (syncedIds.length > 0) {
        const placeholders = syncedIds.map(() => '?').join(',');
        db.prepare(`UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`)
          .run(...syncedIds);
      }
      
      return { 
        success: true, 
        message: `Synced ${syncedIds.length} actions to server`,
        count: syncedIds.length,
        details: response.data.results
      };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error syncing offline actions:', error);
    return { 
      error: true, 
      message: `Failed to sync: ${error.message}` 
    };
  }
};

// Create a backup of the SQLite database
export const createBackup = async () => {
  if (!isElectron()) {
    return { error: 'Offline mode only available in desktop app' };
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
    
    const db = getDb();
    
    // Get attendees and sync queue data
    const attendees = db.prepare('SELECT * FROM attendees').all();
    const syncQueue = db.prepare('SELECT * FROM sync_queue').all();
    
    // Create backup file
    const backupData = {
      timestamp,
      attendees,
      syncQueue
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    // Clean up old backups (keep at most 10)
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 10) {
      for (let i = 10; i < backupFiles.length; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, backupFiles[i]));
      }
    }
    
    return { 
      success: true, 
      message: 'Backup created successfully',
      path: backupPath
    };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { 
      error: true, 
      message: `Failed to create backup: ${error.message}` 
    };
  }
};

// Get offline stats
export const getOfflineStats = () => {
  if (!isElectron()) {
    return { error: 'Offline mode only available in desktop app' };
  }

  try {
    const db = getDb();
    
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM attendees').get().count;
    const checkedInCount = db.prepare('SELECT COUNT(*) as count FROM attendees WHERE checked_in = 1').get().count;
    const lunchCount = db.prepare('SELECT COUNT(*) as count FROM attendees WHERE lunch_distributed = 1').get().count;
    const kitCount = db.prepare('SELECT COUNT(*) as count FROM attendees WHERE kit_distributed = 1').get().count;
    const pendingActions = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0').get().count;
    
    return {
      total: totalCount,
      checked_in: checkedInCount,
      lunch_distributed: lunchCount,
      kit_distributed: kitCount,
      pending_sync: pendingActions,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting offline stats:', error);
    return { error: error.message };
  }
};

export default {
  isElectron,
  isOnline,
  syncAttendeesFromServer,
  getAttendeeByQrCode,
  distributeLunch,
  distributeKit,
  syncOfflineActions,
  createBackup,
  getOfflineStats
};