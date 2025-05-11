import { openDB } from 'idb';
import { saveAs } from 'file-saver';

// Database configuration
const DB_NAME = 'eventreservoir';
const DB_VERSION = 1;
const ATTENDEES_STORE = 'attendees';
const SYNC_QUEUE_STORE = 'sync_queue';

// Initialize IndexedDB
const initDatabase = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create attendees store if it doesn't exist
      if (!db.objectStoreNames.contains(ATTENDEES_STORE)) {
        const attendeesStore = db.createObjectStore(ATTENDEES_STORE, { keyPath: 'qr_code' });
        attendeesStore.createIndex('checkedIn', 'checked_in');
        attendeesStore.createIndex('lunchDistributed', 'lunch_distributed');
        attendeesStore.createIndex('kitDistributed', 'kit_distributed');
      }

      // Create sync queue store if it doesn't exist
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncQueueStore = db.createObjectStore(SYNC_QUEUE_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncQueueStore.createIndex('qrCode', 'qr_code');
        syncQueueStore.createIndex('synced', 'synced');
      }
    }
  });
};

// Get database connection (singleton pattern)
let dbPromise = null;
const getDb = () => {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
};

// Check network connection - enhanced for better reliability
const isOnline = async () => {
  try {
    // First check the browser's navigator.onLine property
    if (!navigator.onLine) {
      console.log('Browser reports offline status');
      return false;
    }
    
    // Then try to ping our server
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/health`, { 
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      timeout: 2000 
    });
    
    if (!response.ok) {
      console.log('Server health check failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Network error during online check:', error);
    return false;
  }
};

// Sync attendee data from server
export const syncAttendeesFromServer = async () => {
  try {
    // Check online status first
    if (!await isOnline()) {
      return { 
        error: true, 
        message: 'Cannot sync while offline' 
      };
    }
    
    // Fetch data from server
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/offline/sync`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.status === 'success') {
      const attendeesData = data.data;
      
      if (!Array.isArray(attendeesData)) {
        throw new Error('Invalid data format: expected array of attendees');
      }
      
      const db = await getDb();
      
      // Use a single transaction for all attendees
      const tx = db.transaction(ATTENDEES_STORE, 'readwrite');
      const store = tx.objectStore(ATTENDEES_STORE);
      
      // Store all the promises
      const promises = [];
      let count = 0;
      
      for (const attendee of attendeesData) {
        // Don't await here - add to promises array
        promises.push(store.put({
          qr_code: attendee.qr_code,
          checked_in: Boolean(attendee.checked_in),
          lunch_distributed: Boolean(attendee.lunch_distributed),
          kit_distributed: Boolean(attendee.kit_distributed),
          last_updated: new Date().toISOString()
        }));
        count++;
      }
      
      // Wait for all puts to complete
      await Promise.all(promises);
      
      // Wait for transaction to complete
      await tx.done;
      
      return { 
        success: true, 
        message: `Synced ${count} attendees for offline use`,
        count 
      };
    } else {
      throw new Error(`Invalid response from server: ${JSON.stringify(data)}`);
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
    // Try online mode first if we're online
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/attendee/${qrCode}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // Fall back to offline if online request has error
        console.log('Online request failed, falling back to offline mode');
      } catch (error) {
        console.log('Error fetching attendee online:', error);
        // Fall back to offline
      }
    }

    // Offline mode (IndexedDB)
    console.log('Using offline mode to get attendee data');
    const db = await getDb();
    const attendee = await db.get(ATTENDEES_STORE, qrCode);
    
    if (!attendee) {
      console.log('Attendee not found in offline database');
      return { error: 'Attendee not found' };
    }
    
    console.log('Found attendee in offline database:', attendee);
    return {
      qr_code: attendee.qr_code,
      checked_in: Boolean(attendee.checked_in),
      lunch_distributed: Boolean(attendee.lunch_distributed),
      kit_distributed: Boolean(attendee.kit_distributed),
      offline: true
    };
  } catch (error) {
    console.error('Error getting attendee:', error);
    return { error: error.message };
  }
};

// Distribute lunch (online or offline)
export const distributeLunch = async (qrCode) => {
  try {
    // Check online status
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/distribute/lunch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ qrCode })
        });
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('Error distributing lunch online:', error);
        // Fall back to offline mode
      }
    }

    console.log('Using offline mode for lunch distribution');
    // Offline mode (IndexedDB)
    const db = await getDb();
    
    // Check if attendee exists and lunch not distributed yet
    const attendee = await db.get(ATTENDEES_STORE, qrCode);
    
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
    
    // Update attendee (both operations in a single transaction)
    const tx = db.transaction([ATTENDEES_STORE, SYNC_QUEUE_STORE], 'readwrite');
    
    // Clone the attendee to avoid modifying the original (which might be cached)
    const updatedAttendee = { ...attendee };
    updatedAttendee.lunch_distributed = true;
    updatedAttendee.last_updated = new Date().toISOString();
    
    // Update attendee
    await tx.objectStore(ATTENDEES_STORE).put(updatedAttendee);
    
    // Add to sync queue
    await tx.objectStore(SYNC_QUEUE_STORE).add({
      qr_code: qrCode,
      action_type: 'lunch_distributed',
      timestamp: new Date().toISOString(),
      synced: 0
    });
    
    // Complete the transaction
    await tx.done;
    
    return {
      status: 'success',
      message: 'Lunch distributed successfully (offline)',
      offline: true
    };
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
    // Check online status
    const online = await isOnline();

    if (online) {
      try {
        // Use the online API
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/distribute/kit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ qrCode })
        });
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('Error distributing kit online:', error);
        // Fall back to offline mode
      }
    }

    console.log('Using offline mode for kit distribution');
    // Offline mode (IndexedDB)
    const db = await getDb();
    
    // Check if attendee exists and kit not distributed yet
    const attendee = await db.get(ATTENDEES_STORE, qrCode);
    
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
    
    // Update attendee (both operations in a single transaction)
    const tx = db.transaction([ATTENDEES_STORE, SYNC_QUEUE_STORE], 'readwrite');
    
    // Clone the attendee to avoid modifying the original (which might be cached)
    const updatedAttendee = { ...attendee };
    updatedAttendee.kit_distributed = true;
    updatedAttendee.last_updated = new Date().toISOString();
    
    // Update attendee
    await tx.objectStore(ATTENDEES_STORE).put(updatedAttendee);
    
    // Add to sync queue
    await tx.objectStore(SYNC_QUEUE_STORE).add({
      qr_code: qrCode,
      action_type: 'kit_distributed',
      timestamp: new Date().toISOString(),
      synced: 0
    });
    
    // Complete the transaction
    await tx.done;
    
    return {
      status: 'success',
      message: 'Kit distributed successfully (offline)',
      offline: true
    };
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
  try {
    // Check if online
    const online = await isOnline();
    if (!online) {
      return { 
        error: true, 
        message: 'Cannot sync while offline' 
      };
    }

    const db = await getDb();
    
    // Get pending actions
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const pendingActions = await tx.objectStore(SYNC_QUEUE_STORE)
      .index('synced')
      .getAll(0);
    
    await tx.done;
    
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/offline/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ actions })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.status === 'completed') {
      // Mark successfully synced items
      const syncedIds = data.results
        .filter(result => result.synced)
        .map(result => {
          // Find the corresponding id from our pending actions
          const action = pendingActions.find(item => item.qr_code === result.qr_code && 
                                               item.action_type === result.action_type);
          return action ? action.id : null;
        })
        .filter(id => id !== null);
      
      if (syncedIds.length > 0) {
        // Process in batches to avoid transaction timeout
        const batchSize = 10;
        for (let i = 0; i < syncedIds.length; i += batchSize) {
          const batch = syncedIds.slice(i, i + batchSize);
          const syncTx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
          
          await Promise.all(batch.map(async (id) => {
            const item = await syncTx.objectStore(SYNC_QUEUE_STORE).get(id);
            if (item) {
              item.synced = 1;
              return syncTx.objectStore(SYNC_QUEUE_STORE).put(item);
            }
          }));
          
          await syncTx.done;
        }
      }
      
      return { 
        success: true, 
        message: `Synced ${syncedIds.length} actions to server`,
        count: syncedIds.length,
        details: data.results
      };
    } else {
      throw new Error(`Invalid response from server: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('Error syncing offline actions:', error);
    return { 
      error: true, 
      message: `Failed to sync: ${error.message}` 
    };
  }
};

// Create a backup of the IndexedDB database
export const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const db = await getDb();
    
    // Use Promise.all for parallel execution
    const [attendees, syncQueue] = await Promise.all([
      db.getAll(ATTENDEES_STORE),
      db.getAll(SYNC_QUEUE_STORE)
    ]);
    
    // Create backup file
    const backupData = {
      timestamp,
      attendees,
      syncQueue
    };
    
    // Download backup file using FileSaver.js
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    
    saveAs(blob, `backup_${timestamp}.json`);
    
    return { 
      success: true, 
      message: 'Backup created and downloaded successfully',
      timestamp
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
export const getOfflineStats = async () => {
  try {
    const db = await getDb();
    
    // Use Promise.all for parallel execution
    const [allAttendees, pendingActions] = await Promise.all([
      db.getAll(ATTENDEES_STORE),
      db.getAllFromIndex(SYNC_QUEUE_STORE, 'synced', 0)
    ]);
    
    const totalCount = allAttendees.length;
    const checkedInCount = allAttendees.filter(a => a.checked_in).length;
    const lunchCount = allAttendees.filter(a => a.lunch_distributed).length;
    const kitCount = allAttendees.filter(a => a.kit_distributed).length;
    
    return {
      total: totalCount,
      checked_in: checkedInCount,
      lunch_distributed: lunchCount,
      kit_distributed: kitCount,
      pending_sync: pendingActions.length,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting offline stats:', error);
    return { error: error.message };
  }
};

// Listen for online/offline events
let isListeningForNetworkEvents = false;
const setupNetworkListeners = () => {
  if (isListeningForNetworkEvents) return;
  
  isListeningForNetworkEvents = true;
  
  // Add event listeners for online/offline events
  window.addEventListener('online', () => {
    console.log('Browser reports online status');
    // Trigger sync when coming back online
    setTimeout(async () => {
      // Verify we're really online with a server check
      if (await isOnline()) {
        console.log('Confirmed online status, syncing data...');
        await syncOfflineActions();
        await syncAttendeesFromServer();
      }
    }, 2000); // Wait 2s for connection to stabilize
  });
  
  window.addEventListener('offline', () => {
    console.log('Browser reports offline status');
    // Could dispatch an event or update UI here
  });
};

// Set up automatic sync and backup
export const setupAutomaticSync = () => {
  // Set up network event listeners
  setupNetworkListeners();
  
  // Sync attendees every 5 minutes
  setInterval(async () => {
    const online = await isOnline();
    if (online) {
      console.log('Auto-syncing attendees from server...');
      await syncAttendeesFromServer();
    }
  }, 5 * 60 * 1000);

  // Sync offline actions every 30 seconds
  setInterval(async () => {
    const online = await isOnline();
    if (online) {
      console.log('Auto-syncing offline actions to server...');
      await syncOfflineActions();
    }
  }, 30 * 1000);

  // Create backup every 10 minutes
  setInterval(async () => {
    console.log('Creating automatic backup...');
    try {
      await createBackup();
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }, 10 * 60 * 1000);
};

export default {
  isOnline,
  syncAttendeesFromServer,
  getAttendeeByQrCode,
  distributeLunch,
  distributeKit,
  syncOfflineActions,
  createBackup,
  getOfflineStats,
  setupAutomaticSync
};