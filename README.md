# Event Reservoir - Event Management Application

Event Reservoir is a comprehensive event management solution designed to streamline event operations. It handles attendee onboarding, registration tracking, and resource distribution using unique QR codes.

## Features

- **CSV-based Attendee Onboarding**: Import attendees from CSV files and generate unique QR codes
- **Registration Tracking**: Scan QR codes to check in attendees and prevent double registration
- **Lunch/Kit Distribution**: Track distribution of resources and prevent multiple collections
- **Central Dashboard**: View event statistics and search/filter attendee records

## Tech Stack

- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Express.js
- **Database**: Neon PostgreSQL (Serverless)
- **QR Code**: Generated with the `qrcode` package and stored in the filesystem

## Prerequisites

- Node.js v14 or later
- Neon PostgreSQL account (or another PostgreSQL database)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/event-reservoir.git
cd event-reservoir
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
touch .env
```

Edit the `.env` file to include:

```env
PORT=5000
DATABASE_URL=your_neon_postgres_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
touch .env
```

Edit the `.env` file to include:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The application should now be running with:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Usage

1. **Upload Attendees**: Go to the "Upload CSV" page to import attendees
2. **Check In**: Use the "Check In" page to scan QR codes and register attendees
3. **Distribution**: Use the "Distribution" page to track lunch and kit distribution
4. **Dashboard**: View event statistics and search for attendees

## CSV Format

The application expects CSV files with the following columns:
- `name`: Full name of the attendee (required)
- `email`: Email address (required)
- `phone`: Phone number (optional)

Example:
```csv
Name,Email,Phone
John Doe,john@example.com,1234567890
Jane Smith,jane@example.com,0987654321
```

## License

[MIT](LICENSE) 