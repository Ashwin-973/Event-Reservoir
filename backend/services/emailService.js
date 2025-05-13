const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
// dotenv.config({path: path.join(__dirname, '../.env')});
dotenv.config({path:"C:\\Users\\Ashwi\\Documents\\Full Stack\\fullStack\\Event Reservoir\\backend\\.env"});
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASSWORD);
console.log(process.env.EMAIL_FROM);
// Create email templates directory if it doesn't exist
const emailTemplatesDir = path.join(__dirname, '../email-templates');
if (!fs.existsSync(emailTemplatesDir)) {
  fs.mkdirSync(emailTemplatesDir, { recursive: true });
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Queue for handling bulk emails without hitting rate limits
let emailQueue = [];
let isProcessingQueue = false;
const RATE_LIMIT = 50; // Maximum emails per minute (adjust based on provider limits)

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Event Reservoir <noreply@eventreservoir.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};


const processEmailQueue = async () => {
  if (emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`Processing email queue: ${emailQueue.length} emails remaining`);
  
  try {
    // Process a batch of emails (respecting rate limits)
    const batch = emailQueue.splice(0, RATE_LIMIT);
    
    // Process emails in parallel with individual error handling
    const results = await Promise.all(
      batch.map(async (emailTask) => {
        try {
          const result = await sendEmail(emailTask.options);
          if (emailTask.callback) await emailTask.callback(result);
          return { success: true, to: emailTask.options.to };
        } catch (error) {
          console.error(`Failed to send email to ${emailTask.options.to}:`, error);
          return { success: false, to: emailTask.options.to, error };
        }
      })
    );
    
    console.log(`Processed ${batch.length} emails: ${results.filter(r => r.success).length} succeeded, ${results.filter(r => !r.success).length} failed`);
    
    // If more emails in queue, schedule next batch after delay
    if (emailQueue.length > 0) {
      setTimeout(() => {
        isProcessingQueue = false;
        processEmailQueue();
      }, 60000); // Wait 1 minute before processing next batch
    } else {
      isProcessingQueue = false;
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
    isProcessingQueue = false;
    
    // Retry after delay if there are still emails to process
    if (emailQueue.length > 0) {
      setTimeout(processEmailQueue, 60000);
    }
  }
};


const queueEmail = (options, callback) => {
  emailQueue.push({ options, callback });
  console.log("Email queue : ", emailQueue);
  
  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processEmailQueue();
  }
};

const sendRegistrationEmail = async (attendee) => {
  const qrCodePath = path.join(__dirname, `../storage/qrcodes/${attendee.qr_code}.png`);
  
  // Create HTML content using template literals
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Registration Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
        .qr-code { text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${attendee.name},</p>
          <p>Thank you for registering for our event. Your registration has been confirmed.</p>
          <p>Please use the QR code below for check-in at the event:</p>
          
          <div class="qr-code">
            <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;">
          </div>
          
          <p>Your registration details:</p>
          <ul>
            <li><strong>Name:</strong> ${attendee.name}</li>
            <li><strong>Email:</strong> ${attendee.email}</li>
            <li><strong>Phone:</strong> ${attendee.phone || 'Not provided'}</li>
          </ul>
          
          <p>We look forward to seeing you at the event!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailOptions = {
    to: attendee.email,
    subject: 'Event Registration Confirmation',
    html: htmlContent,
    attachments: [
      {
        filename: 'qrcode.png',
        path: qrCodePath,
        cid: 'qrcode' // Use same CID in the HTML
      }
    ]
  };

  // Add to queue instead of sending immediately
  queueEmail(emailOptions);
  
  return { queued: true, to: attendee.email };
};

const processBulkEmails = async (attendees) => {
  console.log(`Queueing ${attendees.length} registration emails`);
  
  // Queue all emails
  attendees.forEach(attendee => {
     sendRegistrationEmail(attendee);
  });
  
  return { 
    queued: attendees.length,
    message: `${attendees.length} registration emails have been queued for sending`
  };
};


const sendCheckInEmail = async (attendee, timestamp) => {
  const formattedTime = new Date(timestamp).toLocaleString();
  
const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Check-in Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Check-in Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${attendee.name},</p>
          <p>You have successfully checked in to our event at <strong>${formattedTime}</strong>.</p>
          <p>Enjoy the event!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailOptions = {
    to: attendee.email,
    subject: 'Event Check-in Confirmation',
    html: htmlContent
  };

  return await sendEmail(emailOptions);
};

const sendDistributionEmail = async (attendee, type, timestamp) => {
  const formattedTime = new Date(timestamp).toLocaleString();
  const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${typeCapitalized} Distribution Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${typeCapitalized} Collection Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${attendee.name},</p>
          <p>This is to confirm that you collected your ${type} at <strong>${formattedTime}</strong>.</p>
          <p>Enjoy the event!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailOptions = {
    to: attendee.email,
    subject: `${typeCapitalized} Collection Confirmation`,
    html: htmlContent
  };

  return await sendEmail(emailOptions);
};

// Verify email configuration on service initialization
const verifyEmailConfig = async () => {
  console.log(process.env.EMAIL_USER);
  console.log(process.env.EMAIL_PASS);  
  console.log(process.env.EMAIL_FROM);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ Email credentials not configured. Email functionality will not work.');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error);
    return false;
  }
};

// Verify on startup
verifyEmailConfig();

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  processBulkEmails,
  sendCheckInEmail,
  sendDistributionEmail,
  queueEmail
}; 