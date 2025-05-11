const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendee = require('../models/Attendee');

const router = express.Router();

// Endpoint to sync attendee data for offline use
router.get('/sync', asyncHandler(async (req, res) => {
  try {
    // Get all attendees with minimal data needed for offline validation
    const attendees = await Attendee.getAllAttendees();
    
    // Extract only the necessary fields for offline validation
    const offlineData = attendees.map(attendee => ({
      qr_code: attendee.qr_code,
      checked_in: attendee.checked_in || false,
      lunch_distributed: attendee.lunch_distributed || false,
      kit_distributed: attendee.kit_distributed || false
    }));
    
    res.json({
      status: 'success',
      data: offlineData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing offline data:', error);
    res.status(500).json({ error: 'Failed to sync offline data' });
  }
}));

// Endpoint to get attendee by QR code for offline use
router.get('/attendee/:qrCode', asyncHandler(async (req, res) => {
  try {
    const { qrCode } = req.params;
    
    if (!qrCode) {
      return res.status(400).json({ error: 'QR code is required' });
    }
    
    // Find attendee by QR code
    const attendee = await Attendee.getAttendeeByQrCode(qrCode);
    
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }
    
    // Return attendee data for offline use
    res.json({
      qr_code: attendee.qr_code,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      checked_in: attendee.checked_in || false,
      lunch_distributed: attendee.lunch_distributed || false,
      kit_distributed: attendee.kit_distributed || false
    });
  } catch (error) {
    console.error('Error getting attendee for offline use:', error);
    res.status(500).json({ error: 'Failed to get attendee data' });
  }
}));

// Endpoint to process offline sync queue
router.post('/process-queue', asyncHandler(async (req, res) => {
  const { actions } = req.body;
  
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ error: 'No actions provided' });
  }
  
  const results = [];
  
  // Process each action in the queue
  for (const action of actions) {
    try {
      const { qr_code, action_type, timestamp } = action;
      
      if (!qr_code || !action_type) {
        results.push({ 
          qr_code, 
          status: 'error', 
          message: 'Invalid action data',
          synced: false 
        });
        continue;
      }
      
      // Find attendee by QR code
      const attendee = await Attendee.getAttendeeByQrCode(qr_code);
      
      if (!attendee) {
        results.push({ 
          qr_code, 
          status: 'error', 
          message: 'Attendee not found',
          synced: false 
        });
        continue;
      }
      
      // Process based on action type
      if (action_type === 'lunch_distributed') {
        if (attendee.lunch_distributed) {
          results.push({ 
            qr_code, 
            status: 'warning', 
            message: 'Lunch already marked as distributed',
            synced: true 
          });
        } else {
          await Attendee.updateLunchStatus(qr_code, true);
          results.push({ 
            qr_code, 
            status: 'success', 
            message: 'Lunch distribution synced',
            synced: true 
          });
        }
      } else if (action_type === 'kit_distributed') {
        if (attendee.kit_distributed) {
          results.push({ 
            qr_code, 
            status: 'warning', 
            message: 'Kit already marked as distributed',
            synced: true 
          });
        } else {
          await Attendee.updateKitStatus(qr_code, true);
          results.push({ 
            qr_code, 
            status: 'success', 
            message: 'Kit distribution synced',
            synced: true 
          });
        }
      } else {
        results.push({ 
          qr_code, 
          status: 'error', 
          message: 'Unknown action type',
          synced: false 
        });
      }
    } catch (error) {
      console.error('Error processing action:', error);
      results.push({ 
        qr_code: action.qr_code || 'unknown', 
        status: 'error', 
        message: 'Server error processing action',
        synced: false 
      });
    }
  }
  
  res.json({
    status: 'completed',
    results
  });
}));

const offlineRoutes = router;

module.exports = { offlineRoutes }; 