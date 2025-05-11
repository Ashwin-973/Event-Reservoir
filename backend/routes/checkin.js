const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendee = require('../models/Attendee');
const { verifyQrCode } = require('../services/qrCodeService');

const router = express.Router();

// Check in an attendee using QR code
router.post('/', asyncHandler(async (req, res) => {
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
  
  // Check if already checked in
  if (attendee.checked_in) {
    return res.status(400).json({ 
      status: 'already_checked_in',
      error: 'Attendee already checked in',
      attendee: {
        name: attendee.name,
        email: attendee.email,
        checkedInAt: attendee.created_at
      }
    });
  }
  
  // Mark as checked in
  const updatedAttendee = await Attendee.updateCheckInStatus(qrCode, true);
  
  res.json({
    status: 'success',
    message: 'Attendee checked in successfully',
    attendee: {
      name: updatedAttendee.name,
      email: updatedAttendee.email
    }
  });
}));

// Get check-in status by QR code
router.get('/:qrCode', asyncHandler(async (req, res) => {
  const { qrCode } = req.params;
  
  // Find attendee by QR code
  const attendee = await Attendee.getAttendeeByQrCode(qrCode);
  
  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }
  
  res.json({
    attendee: {
      name: attendee.name,
      email: attendee.email,
      checkedIn: attendee.checked_in,
      lunchDistributed: attendee.lunch_distributed,
      kitDistributed: attendee.kit_distributed
    }
  });
}));

const checkinRoutes = router;

module.exports = { checkinRoutes }; 