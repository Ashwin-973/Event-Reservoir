# Event Reservoir

Event Reservoir is a comprehensive event management application designed for competition organizers. It provides tools for attendee management, check-in, resource distribution, and real-time dashboard analytics.

## Features

- **CSV-based Attendee Onboarding**: Import attendee lists from CSV files
- **QR Code Generation**: Generate unique QR codes for each attendee
- **Check-in System**: Streamline the check-in process using QR codes
- **Resource Distribution**: Track lunch and kit distribution
- **Offline Mode**: Continue operations without internet connectivity
- **Dashboard Analytics**: Real-time statistics and attendee search

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL (Neon) for cloud database
- SQLite for offline storage
- QR code generation and validation

### Frontend
- React with Vite
- Tailwind CSS for styling
- HTML5 QR Scanner for QR code scanning
- Offline-first design with SQLite synchronization

## Getting Started

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

3. Start the offline sync service (optional):
```bash
cd backend
npm run sync
```

## Offline Functionality

Event Reservoir includes robust offline capabilities:

- **Preloaded Data**: Attendee data is automatically synced to a local SQLite database
- **Offline Validation**: QR codes can be validated without an internet connection
- **Sync Queue**: Actions performed offline are synced when internet is restored
- **Automatic Backups**: Regular backups protect against data loss

For detailed instructions on using the offline mode, see [OFFLINE_README.md](./OFFLINE_README.md).

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