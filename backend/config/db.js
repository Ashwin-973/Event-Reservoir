const dotenv = require('dotenv');

const { neon } = require('@neondatabase/serverless');

dotenv.config({path:"C:\\Users\\Ashwi\\Documents\\Full Stack\\fullStack\\Event Reservoir\\backend\\.env"});

// Database connection URL
const {PGHOST,PGUSER,PGPASSWORD,PGDATABASE}=process.env
const DATABASE_URL=`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`

// SQL query executor function
const executeQuery = async (query, params = []) => {
  try {
    const sql = neon(DATABASE_URL);
    console.log("Connection successful")
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Initialize database tables

module.exports = {
  executeQuery,
}; 