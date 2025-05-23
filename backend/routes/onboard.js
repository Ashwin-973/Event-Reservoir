const express = require('express');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { parseCSV } = require('../services/csvService');
const { generateQrCode } = require('../services/qrCodeService');
const { sendRegistrationEmail, processBulkEmails } = require('../services/emailService');
const Attendee = require('../models/Attendee');
const Email = require('../models/Email');

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../storage/uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Upload CSV and process attendees
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // Parse CSV
    const attendees = await parseCSV(req.file.path);
    console.log("Attendees", attendees);
    
    if (!attendees || attendees.length === 0) {
      return res.status(400).json({ 
        error: 'No valid attendee records found in CSV. Please check the file format and ensure it has "Name", "Email", and "Phone" columns.'
      });
    }
    
    // Process each attendee
    const processedAttendees = [];
    const errors = [];
    
    for (const attendeeData of attendees) {
      try {
        // Check if attendee already exists
        const existingAttendee = await Attendee.getAttendeeByEmail(attendeeData.email);
        
        if (existingAttendee) {
          errors.push(`Attendee with email ${attendeeData.email} already exists`);
          continue;
        }
        
        // Generate QR code
        const { qrCode, filePath } = await generateQrCode(attendeeData);
        
        // Create attendee in database
        const attendee = await Attendee.createAttendee({
          ...attendeeData,
          qr_code: qrCode
        });
        
        // Record email in database for tracking
        await Email.createEmailRecord({
          attendee_id: attendee.id,
          email_type: 'registration'
        });

        // Add attendee to processed list
        processedAttendees.push({
          ...attendee,
          qrCodeUrl: filePath
        });

        console.log("Attendees processed : ", processedAttendees);
      } catch (error) {
        console.error("Error processing attendee:", error);
        errors.push(`Error processing attendee ${attendeeData.email}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Send registration emails in bulk
    if (processedAttendees.length > 0) {
      processBulkEmails(processedAttendees)
        .then(result => console.log('Email sending started:', result))
        .catch(err => console.error('Error sending emails:', err));
    }
    
    res.status(201).json({
      success: true,
      processed: processedAttendees.length,
      errors: errors.length > 0 ? errors : null,
      attendees: processedAttendees,
      emailStatus: processedAttendees.length > 0 ? 'Confirmation emails are being sent' : null
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file: ' + error.message });
  }
}));

// Get all attendees with QR codes
router.get('/', asyncHandler(async (req, res) => {
  const attendees = await Attendee.getAllAttendees();
  
  const attendeesWithQrUrls = attendees.map(attendee => ({
    ...attendee,
    qrCodeUrl: `/qrcodes/${attendee.qr_code}.png`
  }));
  
  res.json(attendeesWithQrUrls);
}));

const onboardRoutes = router;

module.exports = { onboardRoutes }; 