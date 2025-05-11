const axios = require('axios');
const cron = require('node-cron');
const sqliteService = require('../services/sqliteService');

// Server API URL
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Sync attendee data from server to SQLite
const syncAttendeesToSQLite = async () => {
  try {
    console.log('Starting sync of attendees data to SQLite...');
    
    // Fetch attendee data from the server
    const response = await axios.get(`${API_URL}/offline/sync`);
    
    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      const attendeesData = response.data.data;
      
      // Update local SQLite database
      const result = await sqliteService.upsertAttendees(attendeesData);
      
      console.log(`Synced ${result.count} attendees to SQLite database`);
      return result;
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error syncing attendees to SQLite:', error.message);
    throw error;
  }
};

// Sync pending actions from SQLite to server
const syncPendingActionsToServer = async () => {
  try {
    console.log('Starting sync of pending actions to server...');
    
    // Get pending actions from sync queue
    const pendingActions = await sqliteService.getPendingSyncQueue();
    
    if (pendingActions.length === 0) {
      console.log('No pending actions to sync');
      return { count: 0 };
    }
    
    // Format actions for the server
    const actions = pendingActions.map(item => ({
      qr_code: item.qr_code,
      action_type: item.action_type,
      timestamp: item.timestamp,
      id: item.id
    }));
    
    // Send actions to server
    const response = await axios.post(`${API_URL}/offline/process-queue`, { actions });
    
    if (response.data && response.data.status === 'completed' && Array.isArray(response.data.results)) {
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
        await sqliteService.markSyncQueueItemsAsSynced(syncedIds);
      }
      
      console.log(`Synced ${syncedIds.length} actions to server`);
      return { count: syncedIds.length };
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error syncing actions to server:', error.message);
    throw error;
  }
};

// Create a backup of the SQLite database
const createBackup = async () => {
  try {
    console.log('Creating SQLite database backup...');
    const result = await sqliteService.createBackup();
    console.log(`Backup created at ${result.path}`);
    return result;
  } catch (error) {
    console.error('Error creating backup:', error.message);
    throw error;
  }
};

// Check if server is reachable
const isServerReachable = async () => {
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    console.error('Server is not reachable:', error.message);
    return false;
  }
};

// Initialize database and start sync schedules
const initialize = async () => {
  try {
    // Initialize SQLite database
    await sqliteService.initializeDatabase();
    console.log('SQLite database initialized');
    
    // Schedule attendee data sync (every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      try {
        const serverReachable = await isServerReachable();
        if (serverReachable) {
          await syncAttendeesToSQLite();
        } else {
          console.log('Server not reachable for attendee sync, skipping...');
        }
      } catch (error) {
        console.error('Error in scheduled attendee sync:', error.message);
      }
    });
    
    // Schedule pending actions sync (every 30 seconds)
    cron.schedule('*/30 * * * * *', async () => {
      try {
        const serverReachable = await isServerReachable();
        if (serverReachable) {
          await syncPendingActionsToServer();
        } else {
          console.log('Server not reachable for action sync, skipping...');
        }
      } catch (error) {
        console.error('Error in scheduled action sync:', error.message);
      }
    });
    
    // Schedule database backup (every 10 minutes)
    cron.schedule('*/10 * * * *', async () => {
      try {
        await createBackup();
      } catch (error) {
        console.error('Error in scheduled backup:', error.message);
      }
    });
    
    console.log('Sync schedules initialized');
  } catch (error) {
    console.error('Error initializing sync service:', error.message);
    throw error;
  }
};

// If run directly, initialize
if (require.main === module) {
  initialize().catch(console.error);
}

module.exports = {
  syncAttendeesToSQLite,
  syncPendingActionsToServer,
  createBackup,
  isServerReachable,
  initialize
}; 