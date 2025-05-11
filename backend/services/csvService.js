const fs = require('fs');
const csv = require('csv-parser');

// Parse CSV file and return array of attendees
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Validate required fields
        if (!data.name || !data.email) {
          return; // Skip invalid entries
        }
        
        // Clean data
        const attendee = {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone ? data.phone.trim() : null
        };
        
        results.push(attendee);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

module.exports = {
  parseCSV
}; 