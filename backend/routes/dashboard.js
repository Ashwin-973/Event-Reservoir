const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendee = require('../models/Attendee');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await Attendee.getDashboardStats();
  res.json(stats);
}));

// Get all attendees
router.get('/attendees', asyncHandler(async (req, res) => {
  const attendees = await Attendee.getAllAttendees();
  
  const attendeesWithQrUrls = attendees.map(attendee => ({
    ...attendee,
    qrCodeUrl: `/qrcodes/${attendee.qr_code}.png`
  }));
  
  res.json(attendeesWithQrUrls);
}));

// Search attendees
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const attendees = await Attendee.searchAttendees(q);
  
  const attendeesWithQrUrls = attendees.map(attendee => ({
    ...attendee,
    qrCodeUrl: `/qrcodes/${attendee.qr_code}.png`
  }));
  
  res.json(attendeesWithQrUrls);
}));

const dashboardRoutes = router;

module.exports = { dashboardRoutes }; 