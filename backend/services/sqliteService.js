const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// SQLite database path
const DB_PATH = path.join(__dirname, '../storage/eventreservoir_offline.db');

// Ensure the directory exists
fs.ensureDirSync(path.dirname(DB_PATH));
fs.ensureDirSync(path.join(__dirname, '../storage/backups'));

// Create and initialize the SQLite database
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        return reject(err);
      }
      
      // Create tables if they don't exist
      db.serialize(() => {
        // Attendees table
        db.run(`
          CREATE TABLE IF NOT EXISTS attendees (
            qr_code TEXT PRIMARY KEY,
            checked_in BOOLEAN DEFAULT 0,
            lunch_distributed BOOLEAN DEFAULT 0,
            kit_distributed BOOLEAN DEFAULT 0,
            last_updated TEXT
          )
        `, (err) => {
          if (err) {
            console.error('Error creating attendees table:', err);
            return reject(err);
          }
        });
        
        // Sync queue table
        db.run(`
          CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_code TEXT,
            action_type TEXT,
            timestamp TEXT,
            synced BOOLEAN DEFAULT 0
          )
        `, (err) => {
          if (err) {
            console.error('Error creating sync_queue table:', err);
            return reject(err);
          }
          
          resolve(db);
        });
      });
    });
  });
};

// Get database connection
const getDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        if (err.code === 'SQLITE_CANTOPEN') {
          // Database doesn't exist, initialize it
          return initializeDatabase()
            .then(resolve)
            .catch(reject);
        }
        return reject(err);
      }
      resolve(db);
    });
  });
};

// Upsert attendees data (used for syncing from server)
const upsertAttendees = async (attendeesData) => {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO attendees (
          qr_code, checked_in, lunch_distributed, kit_distributed, last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `);
      
      let count = 0;
      
      db.run('BEGIN TRANSACTION');
      
      attendeesData.forEach(attendee => {
        stmt.run(
          attendee.qr_code,
          attendee.checked_in ? 1 : 0,
          attendee.lunch_distributed ? 1 : 0,
          attendee.kit_distributed ? 1 : 0,
          new Date().toISOString(),
          function(err) {
            if (err) {
              console.error('Error upserting attendee:', err);
            } else {
              count++;
            }
          }
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', (err) => {
        db.close();
        
        if (err) {
          console.error('Error committing transaction:', err);
          return reject(err);
        }
        
        resolve({ count });
      });
    });
  });
};

// Get an attendee by QR code
const getAttendeeByQrCode = async (qrCode) => {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM attendees WHERE qr_code = ?', [qrCode], (err, row) => {
      db.close();
      
      if (err) {
        console.error('Error getting attendee by QR code:', err);
        return reject(err);
      }
      
      resolve(row || null);
    });
  });
};

// Update lunch distribution status offline
const updateLunchStatus = async (qrCode, status) => {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE attendees SET lunch_distributed = ?, last_updated = ? WHERE qr_code = ?',
      [status ? 1 : 0, new Date().toISOString(), qrCode],
      function(err) {
        if (err) {
          db.close();
          console.error('Error updating lunch status:', err);
          return reject(err);
        }
        
        if (this.changes === 0) {
          db.close();
          return reject(new Error('Attendee not found'));
        }
        
        // Add to sync queue
        db.run(
          'INSERT INTO sync_queue (qr_code, action_type, timestamp) VALUES (?, ?, ?)',
          [qrCode, 'lunch_distributed', new Date().toISOString()],
          (queueErr) => {
            db.close();
            
            if (queueErr) {
              console.error('Error adding to sync queue:', queueErr);
              return reject(queueErr);
            }
            
            resolve({ qr_code: qrCode, lunch_distributed: status });
          }
        );
      }
    );
  });
};

// Update kit distribution status offline
const updateKitStatus = async (qrCode, status) => {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE attendees SET kit_distributed = ?, last_updated = ? WHERE qr_code = ?',
      [status ? 1 : 0, new Date().toISOString(), qrCode],
      function(err) {
        if (err) {
          db.close();
          console.error('Error updating kit status:', err);
          return reject(err);
        }
        
        if (this.changes === 0) {
          db.close();
          return reject(new Error('Attendee not found'));
        }
        
        // Add to sync queue
        db.run(
          'INSERT INTO sync_queue (qr_code, action_type, timestamp) VALUES (?, ?, ?)',
          [qrCode, 'kit_distributed', new Date().toISOString()],
          (queueErr) => {
            db.close();
            
            if (queueErr) {
              console.error('Error adding to sync queue:', queueErr);
              return reject(queueErr);
            }
            
            resolve({ qr_code: qrCode, kit_distributed: status });
          }
        );
      }
    );
  });
};

// Get pending sync queue items
const getPendingSyncQueue = async () => {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp', (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting pending sync queue:', err);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
};

// Mark sync queue items as synced
const markSyncQueueItemsAsSynced = async (ids) => {
  if (!ids || ids.length === 0) return { count: 0 };
  
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    const placeholders = ids.map(() => '?').join(',');
    
    db.run(
      `UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`,
      ids,
      function(err) {
        db.close();
        
        if (err) {
          console.error('Error marking sync queue items as synced:', err);
          return reject(err);
        }
        
        resolve({ count: this.changes });
      }
    );
  });
};

// Create a backup of the database
const createBackup = async () => {
  try {
    const backupDir = path.join(__dirname, '../storage/backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
    
    // Get all data from the database
    const db = await getDatabase();
    
    const attendees = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM attendees', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    
    const syncQueue = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sync_queue', (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    
    db.close();
    
    // Create backup file
    const backupData = {
      timestamp,
      attendees,
      syncQueue
    };
    
    await fs.writeJson(backupPath, backupData, { spaces: 2 });
    
    // Clean up old backups (keep last 10)
    const backupFiles = await fs.readdir(backupDir);
    const backupSorted = backupFiles
      .filter(file => file.startsWith('backup_'))
      .sort()
      .reverse();
    
    if (backupSorted.length > 10) {
      for (let i = 10; i < backupSorted.length; i++) {
        await fs.remove(path.join(backupDir, backupSorted[i]));
      }
    }
    
    return { path: backupPath, timestamp };
  } catch (error) {
    console.error('Error creating database backup:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  getDatabase,
  upsertAttendees,
  getAttendeeByQrCode,
  updateLunchStatus,
  updateKitStatus,
  getPendingSyncQueue,
  markSyncQueueItemsAsSynced,
  createBackup
}; 