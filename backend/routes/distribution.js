const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendee = require('../models/Attendee');
const Email = require('../models/Email');
const {sendDistributionEmail} = require('../services/emailService');
const { verifyQrCode } = require('../services/qrCodeService');

const router = express.Router();

// Distribute lunch to an attendee
router.post('/lunch', asyncHandler(async (req, res) => {
  const { qrCode } = req.body;
  
  if (!qrCode) {
    return res.status(400).json({ error: 'QR code is required' });
  }
  
  // Verify if QR code exists
  if (!verifyQrCode(qrCode)) {
    return res.status(404).json({ error: 'Invalid QR code' });
  }
  
  // Find attendee by QR code
  const attendee = await Attendee.getAttendeeByQrCode(qrCode);
  
  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }
  
  // Check if already collected lunch
  if (attendee.lunch_distributed) {
    return res.status(400).json({ 
      status: 'already_distributed',
      error: 'Attendee already collected lunch',
      attendee: {
        name: attendee.name,
        email: attendee.email
      }
    });
  }
  
  // Mark lunch as distributed
  const updatedAttendee = await Attendee.updateLunchStatus(qrCode, true);
  
  const timestamp = new Date().toISOString();

  await Email.createEmailRecord({
    attendee_id: attendee.id,
    email_type: 'lunch distribution'
  });
  // Send check-in confirmation email
  sendDistributionEmail(updatedAttendee,'lunch', timestamp)
    .then(result => console.log(`Lunch Distribution email ${result.success ? 'sent' : 'failed'} to ${updatedAttendee.email}`))
    .catch(err => console.error('Error sending Lunch Distribution email:', err));
  res.json({
    status: 'success',
    message: 'Lunch distributed successfully',
    attendee: {
      name: updatedAttendee.name,
      email: updatedAttendee.email
    }
  });
}));

// Distribute kit to an attendee
router.post('/kit', asyncHandler(async (req, res) => {
  const { qrCode } = req.body;
  
  if (!qrCode) {
    return res.status(400).json({ error: 'QR code is required' });
  }
  
  // Verify if QR code exists
  if (!verifyQrCode(qrCode)) {
    return res.status(404).json({ error: 'Invalid QR code' });
  }
  
  // Find attendee by QR code
  const attendee = await Attendee.getAttendeeByQrCode(qrCode);
  
  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }
  
  // Check if already collected kit
  if (attendee.kit_distributed) {
    return res.status(400).json({ 
      status: 'already_distributed',
      error: 'Attendee already collected kit',
      attendee: {
        name: attendee.name,
        email: attendee.email
      }
    });
  }
  
  // Mark kit as distributed
  const updatedAttendee = await Attendee.updateKitStatus(qrCode, true);
  
  const timestamp = new Date().toISOString();

  await Email.createEmailRecord({
    attendee_id: attendee.id,
    email_type: 'kit distribution'
  });
  // Send check-in confirmation email
  sendDistributionEmail(updatedAttendee,'kit', timestamp)
    .then(result => console.log(`Kit Distribution email ${result.success ? 'sent' : 'failed'} to ${updatedAttendee.email}`))
    .catch(err => console.error('Error sending Kit Distribution email:', err));
  res.json({
    status: 'success',
    message: 'Kit distributed successfully',
    attendee: {
      name: updatedAttendee.name,
      email: updatedAttendee.email
    }
  });
}));

const distributionRoutes = router;

module.exports = { distributionRoutes }; 