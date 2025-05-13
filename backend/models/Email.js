const { executeQuery } = require('../config/db');


const createEmailRecord = async (emailData) => {
  const { attendee_id, email_type, status = 'pending' } = emailData;
  
  const query = `
    INSERT INTO emails (attendee_id, email_type, status)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  
  const result = await executeQuery(query, [attendee_id, email_type, status]);
  return result[0];
};


const updateEmailStatus = async (id, status, errorMessage = null) => {
  let query;
  let params;
  
  if (status === 'sent') {
    query = `
      UPDATE emails
      SET status = $2, sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    params = [id, status];
  } else {
    query = `
      UPDATE emails
      SET status = $2, error_message = $3
      WHERE id = $1
      RETURNING *
    `;
    params = [id, status, errorMessage];
  }
  
  const result = await executeQuery(query, params);
  return result[0];
};


const getPendingEmails = async (limit = 50) => {
  const query = `
    SELECT e.*, a.name, a.email, a.qr_code
    FROM emails e
    JOIN attendees a ON e.attendee_id = a.id
    WHERE e.status = 'pending'
    ORDER BY e.created_at ASC
    LIMIT $1
  `;
  
  return await executeQuery(query, [limit]);
};


const getEmailStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
      SUM(CASE WHEN email_type = 'registration' THEN 1 ELSE 0 END) as registration_count,
      SUM(CASE WHEN email_type = 'check_in' THEN 1 ELSE 0 END) as check_in_count,
      SUM(CASE WHEN email_type = 'lunch_distribution' THEN 1 ELSE 0 END) as lunch_count,
      SUM(CASE WHEN email_type = 'kit_distribution' THEN 1 ELSE 0 END) as kit_count
    FROM emails
  `;
  
  const result = await executeQuery(query);
  return result[0];
};


const getFailedEmails = async (limit = 50) => {
  const query = `
    SELECT e.*, a.name, a.email, a.qr_code
    FROM emails e
    JOIN attendees a ON e.attendee_id = a.id
    WHERE e.status = 'failed'
    ORDER BY e.created_at DESC
    LIMIT $1
  `;
  
  return await executeQuery(query, [limit]);
};


const getEmailsByAttendee = async (attendeeId) => {
  const query = `
    SELECT *
    FROM emails
    WHERE attendee_id = $1
    ORDER BY created_at DESC
  `;
  
  return await executeQuery(query, [attendeeId]);
};

module.exports = {
  createEmailRecord,
  updateEmailStatus,
  getPendingEmails,
  getEmailStats,
  getFailedEmails,
  getEmailsByAttendee
}; 