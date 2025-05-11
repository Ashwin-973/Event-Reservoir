/**
 * Script to start the offline sync service
 * 
 * This script:
 * 1. Initializes SQLite database
 * 2. Syncs attendee data every 5 minutes when online
 * 3. Syncs offline actions every 30 seconds when online
 * 4. Creates backups every 10 minutes
 */

const syncService = require('./syncOfflineData');

console.log('Starting offline sync service...');

// Initialize the service
syncService.initialize()
  .then(() => {
    console.log('Offline sync service started successfully.');
    console.log('- Attendee data sync: every 5 minutes');
    console.log('- Actions sync: every 30 seconds');
    console.log('- Database backup: every 10 minutes');
  })
  .catch(error => {
    console.error('Failed to start offline sync service:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down offline sync service...');
  process.exit(0);
}); 