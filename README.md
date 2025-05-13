# Event Reservoir

Event Reservoir is a comprehensive event management application designed for competition organizers. It provides tools for attendee management, check-in, resource distribution, and real-time dashboard analytics with robust offline capabilities.

## TL;DR

Event Reservoir is an event management system designed to streamline attendee registration, check-in, and resource distribution with an offline-first architecture. The application enables CSV-based attendee imports, QR code generation for efficient check-ins, tracks lunch and kit distribution, and features a real-time analytics dashboard. Its standout feature is the ability to function without internet connectivity by storing data locally and automatically synchronizing when connectivity is restored. The system also includes an automated email notification system that sends personalized messages throughout the event lifecycle.

## Features

- **CSV-based Attendee Onboarding**: Import and validate attendee lists from CSV files
- **QR Code Generation**: Automatically create unique QR codes for each attendee
- **Check-in System**: Streamline the check-in process using QR code scanning
- **Resource Distribution Tracking**: Monitor lunch and kit distribution to prevent duplications
- **Offline-First Operation**: Continue all operations without internet connectivity
- **Automatic Data Synchronization**: Seamlessly sync offline actions when connection returns
- **Local Backup System**: Protect against data loss with automatic local backups
- **Email Notification System**: Automated emails for registration, check-in, and resource collection
- **Real-time Dashboard Analytics**: Up-to-date statistics and attendee search capabilities
- **Multi-station Support**: Consistent operation across multiple check-in/distribution points

## Tech Stack

### Frontend
- **Framework**: React with Vite build tool
- **UI/Styling**: Tailwind CSS with custom components
- **State Management**: React Context API
- **QR Scanning**: HTML5-QR-Code library
- **Offline Detection**: Navigator.onLine API with fetch() fallback
- **Data Storage**: IndexedDB for offline data persistence
- **Data Fetching**: Axios with request interceptors

### Backend
- **Runtime**: Node.js with Express.js
- **API Structure**: RESTful endpoints organized by domain
- **Email Service**: Nodemailer with Gmail SMTP and rate-limited queue
- **File Processing**: Multer for CSV uploads
- **QR Generation**: QRCode.js for generating unique identifiers
- **Authentication**: JWT-based authentication
- **Logging**: Custom logging service

### Database
- **Primary Database**: PostgreSQL (via Neon) for cloud-based storage
- **Offline Storage**: IndexedDB in browser
- **Backup System**: JSON exports with point-in-time recovery
- **Schema Design**: Normalized relational structure with proper constraints

## Folder Structure

```
event-reservoir/
├── backend/                  # Node.js Express server
│   ├── config/               # Database and app configuration
│   ├── email-templates/      # HTML email templates
│   ├── middleware/           # Express middleware functions
│   ├── models/               # Database models
│   ├── routes/               # API route definitions
│   │   ├── checkin.js        # Check-in endpoint handlers
│   │   ├── dashboard.js      # Dashboard data endpoints
│   │   ├── distribution.js   # Resource distribution endpoints
│   │   ├── offline.js        # Offline sync endpoints
│   │   └── onboard.js        # Attendee onboarding handlers
│   ├── schema/               # Database schema definitions
│   ├── scripts/              # Utility and maintenance scripts
│   ├── services/             # Business logic services
│   │   ├── csvService.js     # CSV parsing and validation
│   │   ├── emailService.js   # Email generation and delivery
│   │   ├── qrCodeService.js  # QR code generation
│   │   └── sqliteService.js  # Offline database operations
│   ├── storage/              # File storage (QR codes, uploads, backups)
│   ├── .env                  # Environment variables (not in repo)
│   ├── package.json          # Backend dependencies
│   └── server.js             # Express app entry point
│
├── frontend/                 # React Vite application
│   ├── public/               # Static assets
│   ├── src/                  # Application source code
│   │   ├── assets/           # Images, fonts, etc.
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utility functions and hooks
│   │   ├── pages/            # Route-level page components
│   │   ├── services/         # API and data services
│   │   │   └── offlineService.js # Offline functionality
│   │   ├── App.jsx           # Main application component
│   │   ├── globals.css       # Global styles
│   │   └── main.jsx          # Application entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
│
└── README.md                 # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- PostgreSQL database (or Neon PostgreSQL)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/event-reservoir.git
cd event-reservoir
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Update .env with your database credentials
```

4. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

## Offline Mode Setup and Testing

The offline functionality works automatically without additional configuration, but you can test it using these methods:

### Testing Offline Mode

1. **Browser Testing**:
   - Open the app in your browser
   - Use Chrome DevTools: Network tab > check "Offline"
   - Or turn off your internet connection

2. **Simulating Intermittent Connectivity**:
   - Start using the app online to load initial data
   - Disconnect from the internet
   - Continue scanning QR codes and processing attendees
   - Reconnect to see automatic synchronization

### Offline Features

1. **Attendee Data Syncing**:
   - Attendee data is automatically downloaded every 5 minutes
   - This data is stored in the browser's IndexedDB
   - Manual sync is available through the "Sync Data" button

2. **Offline QR Scanning**:
   - QR codes are validated against local database when offline
   - UI shows an "Offline Mode Active" indicator
   - Actions are logged in a local sync queue

3. **Sync Queue**:
   - All offline actions are stored locally
   - When internet is restored, actions are automatically synced
   - The Dashboard shows pending sync actions

4. **Local Backups**:
   - Data is automatically backed up every 10 minutes
   - Backups can be triggered manually from the Dashboard

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# PostgreSQL Database Configuration
PGHOST=your-db-host.example.com
PGUSER=your_username
PGDATABASE=your_database
PGPASSWORD=your_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your_secret_key_at_least_32_chars
JWT_EXPIRES_IN=1d

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Event Reservoir <noreply@eventreservoir.com>

# Backup Configuration
BACKUP_INTERVAL=10 # minutes
```

## Production Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy the backend to your preferred hosting service
3. Set up a production database
4. Configure environment variables for production

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- HTML5-QR-Code for the QR scanning functionality
- Tailwind CSS for the UI framework
- Neon for PostgreSQL database hosting 