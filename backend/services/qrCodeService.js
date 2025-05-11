const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Ensure storage directory exists
const qrCodeDir = path.join(__dirname, '../storage/qrcodes');
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}

// Generate a unique identifier & it's the QR code in itself
const generateUniqueId = () => {
  return uuidv4();
};

// Generate QR code and save as image
const generateQrCode = async (data) => {
  const uniqueId = generateUniqueId();
  const filePath = path.join(qrCodeDir, `${uniqueId}.png`);
  
  // Create QR code with the unique ID
  await qrcode.toFile(filePath, uniqueId, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300
  });
  
  return {
    qrCode: uniqueId,
    filePath: `/qrcodes/${uniqueId}.png`
  };
};

// Verify if QR code is valid
const verifyQrCode = (qrCode) => {
  // Check if QR code file exists
  const filePath = path.join(qrCodeDir, `${qrCode}.png`);
  return fs.existsSync(filePath);
};

module.exports = {
  generateQrCode,
  verifyQrCode
}; 