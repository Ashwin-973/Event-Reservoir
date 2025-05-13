const fs = require('fs');
const csv = require('csv-parser');

// Parse CSV file and return array of attendees
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    console.log(`Starting to parse CSV file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`CSV file does not exist: ${filePath}`);
      return reject(new Error(`File does not exist: ${filePath}`));
    }
    
    fs.createReadStream(filePath)
      .on('error', (error) => {
        console.error(`Error reading CSV file: ${error.message}`);
        reject(error);
      })
      .pipe(csv())
      .on('data', (data) => {
        console.log('CSV row data:', data);
        
        // Check for empty data
        if (Object.keys(data).length === 0) {
          console.warn('Empty row in CSV, skipping');
          return;
        }
        
        // Normalize field names (case-insensitive)
        const normalizedData = {};
        Object.keys(data).forEach(key => {
          normalizedData[key.toLowerCase()] = data[key];
        });
        
        console.log('Normalized data:', normalizedData);
        
        // Check for both original and normalized field names
        const name = normalizedData.name || data.Name;
        const email = normalizedData.email || data.Email;
        const phone = normalizedData.phone || data.Phone;
        
        console.log('Extracted fields:', { name, email, phone });
        
        // Validate required fields
        if (!name || !email) {
          console.warn(`Invalid entry, missing name or email: ${JSON.stringify(data)}`);
          return; // Skip invalid entries
        }
        
        // Clean data
        const attendee = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null
        };
        
        console.log('Created attendee object:', attendee);
        results.push(attendee);
      })
      .on('end', () => {
        console.log(`CSV parsing completed. Total records: ${results.length}`);
        console.log("Final results:", results);
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`Error parsing CSV: ${error.message}`);
        reject(error);
      });
  });
};

module.exports = {
  parseCSV
}; 