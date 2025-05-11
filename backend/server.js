const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { onboardRoutes } = require('./routes/onboard');
const { checkinRoutes } = require('./routes/checkin');
const { distributionRoutes } = require('./routes/distribution');
const { dashboardRoutes } = require('./routes/dashboard');
const { offlineRoutes } = require('./routes/offline');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve QR codes statically from the specified directory
app.use('/qrcodes', express.static(path.join(__dirname, 'storage/qrcodes')));

// Routes
app.use('/api/onboard', onboardRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/distribute', distributionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/offline', offlineRoutes);

// Health check route for offline detection
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// Basic route
app.get('/', (req, res) => {
  res.send('Event Management API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 