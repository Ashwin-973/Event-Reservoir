const { executeQuery } = require('../config/db');

// Create a new attendee
const createAttendee = async (attendeeData) => {
  const { name, email, phone, qr_code } = attendeeData;
  
  const query = `
    INSERT INTO attendees (name, email, phone, qr_code)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const result = await executeQuery(query, [name, email, phone, qr_code]);
  console.log("Attendee created", result)
  return result[0];
};

// Get attendee by QR code
const getAttendeeByQrCode = async (qrCode) => {
  const query = `
    SELECT * FROM attendees
    WHERE qr_code = $1
  `;
  
  const result = await executeQuery(query, [qrCode]);
  return result[0] || null;
};

// Get attendee by email
const getAttendeeByEmail = async (email) => {
  const query = `
    SELECT * FROM attendees
    WHERE email = $1
  `;
  
  const result = await executeQuery(query, [email]);
  return result[0] || null;
};

// Update attendee check-in status - wtf... should'nt I just set boolean to true?
const updateCheckInStatus = async (qrCode, status) => {
  const query = `
    UPDATE attendees
    SET checked_in = $2
    WHERE qr_code = $1
    RETURNING *
  `;
  
  const result = await executeQuery(query, [qrCode, status]);
  return result[0];
};

// Update lunch distribution status
const updateLunchStatus = async (qrCode, status) => {
  const query = `
    UPDATE attendees
    SET lunch_distributed = $2
    WHERE qr_code = $1
    RETURNING *
  `;
  
  const result = await executeQuery(query, [qrCode, status]);
  return result[0];
};

// Update kit distribution status
const updateKitStatus = async (qrCode, status) => {
  const query = `
    UPDATE attendees
    SET kit_distributed = $2
    WHERE qr_code = $1
    RETURNING *
  `;
  
  const result = await executeQuery(query, [qrCode, status]);
  return result[0];
};

// Get all attendees
const getAllAttendees = async () => {
  const query = `
    SELECT * FROM attendees
    ORDER BY name
  `;
  
  return await executeQuery(query);
};

// Get dashboard stats
const getDashboardStats = async () => {
  console.log("Getting dashboard stats")
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
};

// Search attendees
const searchAttendees = async (searchTerm) => {
  const query = `
    SELECT * FROM attendees
    WHERE 
      name ILIKE $1 OR
      email ILIKE $1 OR
      phone ILIKE $1
    ORDER BY name
  `;
  
  return await executeQuery(query, [`%${searchTerm}%`]);
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