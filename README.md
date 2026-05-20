# MIE Faculty Class Attendance & Salary Tracker

A full-stack MERN web application for MIE Pathways lecturers to log class attendance and track monthly salary.

## Features

- **Authentication**: JWT-based login/register
- **Class Logging**: Manual self check-in and QR check-in
- **Salary Tracking**: Automatic salary calculation based on present classes
- **Reports**: Monthly salary reports with PDF and Excel export
- **Dashboard**: Overview of classes, attendance, and estimated salary
- **Branch Support**: Dhanmondi and Uttara branches
- **Subject Management**: Default NCUK IFY subjects + custom subjects

## Tech Stack

**Frontend**: React, Vite, Tailwind CSS, shadcn/ui, React Router, Axios, Recharts, jsPDF, SheetJS

**Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally

### MongoDB Setup

Make sure MongoDB is running locally on the default port:

```bash
mongod
```

The app will use database: `mie_faculty_attendance`

### Backend Setup

```bash
cd backend
npm install
npm run seed
npm run dev
```

Backend runs on: http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## Demo Credentials

```
Email: lecturer@mie.com
Password: password123
Rate per class: 1500 BDT
```

## How Salary Calculation Works

1. Each lecturer has a `ratePerClass` stored in their profile.
2. When a class log is submitted, the rate is snapshot into `ratePerClassAtSubmission`.
3. Only classes with `attendanceStatus = "Present"` count toward salary.
4. `payableClasses = numberOfClasses` (if Present), `0` (if Absent or Cancelled).
5. `payableAmount = payableClasses * ratePerClassAtSubmission`.
6. Monthly salary = sum of all payable amounts for that month.

## How QR Check-In Works

1. Branch QR tokens are generated for Dhanmondi and Uttara.
2. Lecturer scans/enters a QR token.
3. Backend verifies the token and identifies the branch.
4. Class log form opens with the branch pre-filled.
5. Lecturer completes remaining fields and submits.

## How to Export Reports

1. Navigate to "Monthly Salary Report" page.
2. Select month and year.
3. Click "Export PDF" to download a formatted PDF report.
4. Click "Export Excel" to download an Excel spreadsheet.

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new lecturer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Branches
- `GET /api/branches` - Get all branches
- `POST /api/branches/seed` - Seed default branches

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create custom subject
- `POST /api/subjects/seed` - Seed default subjects

### Class Logs
- `POST /api/class-logs` - Create class log
- `GET /api/class-logs/my` - Get my class logs
- `GET /api/class-logs/:id` - Get single class log
- `PUT /api/class-logs/:id` - Update class log
- `DELETE /api/class-logs/:id` - Delete class log

### Reports
- `GET /api/reports/monthly` - Monthly salary report
- `GET /api/reports/summary` - Dashboard summary
- `GET /api/reports/branch-summary` - Branch breakdown
- `GET /api/reports/subject-summary` - Subject breakdown

### QR
- `POST /api/qr/generate` - Generate QR token
- `POST /api/qr/verify` - Verify QR token
- `GET /api/qr/branches` - Get branch QR codes

## Project Structure

```
mie-faculty-attendance/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth & error middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helpers & seeders
│   │   ├── app.js          # Express app
│   │   └── server.js       # Server entry
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API services
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Export & format utils
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env.example
└── README.md
```

## License

MIT
