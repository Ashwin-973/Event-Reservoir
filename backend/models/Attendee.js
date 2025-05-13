const { executeQuery } = require('../config/db');

// Create a new attendee
const createAttendee = async (attendeeData) => {
  const { name, email, phone, qr_code } = attendeeData;
  
  try {
    console.log('Creating attendee with data:', { name, email, phone, qr_code });
    
    const query = `
      INSERT INTO attendees (name, email, phone, qr_code)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await executeQuery(query, [name, email, phone, qr_code]);
    console.log("Attendee created", result);
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create attendee: No result returned from database');
    }
    
    return result[0];
  } catch (error) {
    console.error('Error creating attendee:', error);
    throw error;
  }
};

// Get attendee by QR code
const getAttendeeByQrCode = async (qrCode) => {
  try {
    const query = `
      SELECT * FROM attendees
      WHERE qr_code = $1
    `;
    
    const result = await executeQuery(query, [qrCode]);
    return result[0] || null;
  } catch (error) {
    console.error('Error getting attendee by QR code:', error);
    throw error;
  }
};

// Get attendee by email
const getAttendeeByEmail = async (email) => {
  try {
    console.log('Checking if attendee exists with email:', email);
    
    const query = `
      SELECT * FROM attendees
      WHERE email = $1
    `;
    
    const result = await executeQuery(query, [email]);
    console.log('Attendee lookup result:', result && result.length ? 'Found' : 'Not found');
    
    return result[0] || null;
  } catch (error) {
    console.error('Error getting attendee by email:', error);
    throw error;
  }
};

// Update attendee check-in status
const updateCheckInStatus = async (qrCode, status) => {
  try {
    const query = `
      UPDATE attendees
      SET checked_in = $2
      WHERE qr_code = $1
      RETURNING *
    `;
    
    const result = await executeQuery(query, [qrCode, status]);
    return result[0];
  } catch (error) {
    console.error('Error updating check-in status:', error);
    throw error;
  }
};

// Update lunch distribution status
const updateLunchStatus = async (qrCode, status) => {
  try {
    const query = `
      UPDATE attendees
      SET lunch_distributed = $2
      WHERE qr_code = $1
      RETURNING *
    `;
    
    const result = await executeQuery(query, [qrCode, status]);
    return result[0];
  } catch (error) {
    console.error('Error updating lunch status:', error);
    throw error;
  }
};

// Update kit distribution status
const updateKitStatus = async (qrCode, status) => {
  try {
    const query = `
      UPDATE attendees
      SET kit_distributed = $2
      WHERE qr_code = $1
      RETURNING *
    `;
    
    const result = await executeQuery(query, [qrCode, status]);
    return result[0];
  } catch (error) {
    console.error('Error updating kit status:', error);
    throw error;
  }
};

// Get all attendees
const getAllAttendees = async () => {
  try {
    const query = `
      SELECT * FROM attendees
      ORDER BY name
    `;
    
    return await executeQuery(query);
  } catch (error) {
    console.error('Error getting all attendees:', error);
    throw error;
  }
};

// Get dashboard stats
const getDashboardStats = async () => {
  try {
    console.log("Getting dashboard stats");
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN checked_in = true THEN 1 ELSE 0 END) as checked_in_count,
        SUM(CASE WHEN lunch_distributed = true THEN 1 ELSE 0 END) as lunch_distributed_count,
        SUM(CASE WHEN kit_distributed = true THEN 1 ELSE 0 END) as kit_distributed_count
      FROM attendees
    `;
    
    const result = await executeQuery(query);
    return result[0];
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
};

// Search attendees
const searchAttendees = async (searchTerm) => {
  try {
    const query = `
      SELECT * FROM attendees
      WHERE 
        name ILIKE $1 OR
        email ILIKE $1 OR
        phone ILIKE $1
      ORDER BY name
    `;
    
    return await executeQuery(query, [`%${searchTerm}%`]);
  } catch (error) {
    console.error('Error searching attendees:', error);
    throw error;
  }
};

module.exports = {
  createAttendee,
  getAttendeeByQrCode,
  getAttendeeByEmail,
  updateCheckInStatus,
  updateLunchStatus,
  updateKitStatus,
  getAllAttendees,
  getDashboardStats,
  searchAttendees
}; 