const dotenv = require('dotenv');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

dotenv.config({path:"C:\\Users\\Ashwi\\Documents\\Full Stack\\fullStack\\Event Reservoir\\backend\\.env"});

// Database connection URL
const {PGHOST,PGUSER,PGPASSWORD,PGDATABASE}=process.env
const DATABASE_URL=`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`



// Execute a test query to verify database connection
const verifyDatabaseConnection = async () => {
  try {
    const sql = neon(DATABASE_URL);
    const result = await sql('SELECT 1 as connection_test');
    console.log('✅ Database connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// SQL query executor function
const executeQuery = async (query, params = []) => {
  try {
    const sql = neon(DATABASE_URL);
    // console.log(`Executing query: ${query.trim().split('\n')[0]}...`);
    const result = await sql(query, params);
    // console.log(`Query successful, returned ${result?.length || 0} rows`);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Failed query:', query);
    console.error('Failed params:', params);
    throw error;
  }
};

// Initialize database tables
/*const initializeTables = async () => {
  try {
    // Create attendees table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS attendees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        qr_code VARCHAR(100) NOT NULL UNIQUE,
        checked_in BOOLEAN DEFAULT FALSE,
        lunch_distributed BOOLEAN DEFAULT FALSE,
        kit_distributed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create emails table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        attendee_id INTEGER REFERENCES attendees(id),
        email_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        error_message TEXT
      )
    `);
    
    // Create indexes
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
      CREATE INDEX IF NOT EXISTS idx_attendees_qr_code ON attendees(qr_code);
    `);
    
    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    return false;
  }
};*/

// Initialize database tables and verify connection on startup
(async () => {
  const connected = await verifyDatabaseConnection();
  if (connected) {
    console.log("Connection with DB successful")
  } else {
    console.warn('⚠️ Application started with database connection issues');
  }
})();

module.exports = {
  executeQuery,
  verifyDatabaseConnection
}; 