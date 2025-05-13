-- Email tracking table for Event Reservoir
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  attendee_id INTEGER REFERENCES attendees(id),
  email_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  error_message TEXT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_emails_attendee ON emails(attendee_id);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_type ON emails(email_type);

-- Email types:
-- - registration: Sent when an attendee is registered
-- - check_in: Sent when an attendee checks in
-- - lunch_distribution: Sent when lunch is distributed
-- - kit_distribution: Sent when a kit is distributed

-- Status types:
-- - pending: Email is queued for sending
-- - sent: Email was sent successfully
-- - failed: Email failed to send
-- - retrying: Email is being retried after a failure 