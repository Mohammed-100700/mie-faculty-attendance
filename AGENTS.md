# Project Overview

MIE Faculty Class Attendance & Salary Tracker — a full-stack web application for MIE Pathways lecturers to log class attendance and track monthly salary. Features: JWT-based authentication, class logging (manual and QR check-in), salary reporting (PDF/Excel export), subject management, branch support (Dhanmondi/Uttara), and marks management with Google Sheets integration.

# Tech Stack

**Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, Recharts, jsPDF, SheetJS (xlsx)

**Backend:** Node.js 18+, Express.js, MongoDB, Mongoose, bcryptjs, jsonwebtoken, express-rate-limit, express-validator, helmet, cors, qrcode

**Database:** MongoDB (local or Atlas via connection string)

**Auth:** JWT tokens, bcrypt password hashing, 6-digit PIN-based password reset

**API:** Axios on frontend (with Vite proxy routing `/api` → localhost:5000), Express routes on backend

**Build:** Frontend `npm run build` (Vite), Backend `npm run start` / `npm run dev` (nodemon)

# Repository Structure

```
mie-faculty-attendance/
├── backend/              # Node/Express API server
│   ├── src/
│   │   ├── config/       # db.js — MongoDB connection
│   │   ├── controllers/# auth, classLog, subject, workbook, qr, etc.
│   │   ├── middleware/   # authMiddleware.js — JWT protect + role check
│   │   ├── models/       # User, Branch, Subject, ClassLog, AttendanceSession, QRToken, StudentCheckin, MarksSheet, Workbook
│   │   ├── routes/       # All API routes mounted under /api/
│   │   ├── app.js        # Express app configuration
│   │   └── server.js     # Entry point — loads .env, connects DB, starts server
│   └── package.json
├── frontend/             # React Vite client
│   ├── src/
│   │   ├── api/          # Axios services (authApi, classLogApi, workbookApi, etc.)
│   │   ├── components/   # UI components (ClassLogTable, ExportButtons, StatCard, etc.)
│   │   ├── context/      # AuthContext.jsx
│   │   ├── pages/        # 20+ page components (Login, Dashboard, MarksManagement, etc.)
│   │   ├── App.jsx       # React Router + ProtectedRoute setup
│   │   └── main.jsx      # App entry point
│   └── package.json
├── README.md             # Project documentation
└── DEPLOY.md             # Render/Vercel deployment guide
```

# User Roles

Three roles exist in the system, each with distinct responsibilities:

- **Lecturer:** Can register/login, submit class logs, view own logs, manage marks sheets (add sheets/tests/students, enter marks), check QR tokens for branch check-in, view own dashboard
- **Academic Manager:** Lecturer capabilities + can approve/reject branch-specific class log entries for their managed branch (Dhanmondi or Uttara), view pending/all logs for their branch, view dashboard with approval counts
- **Executive Office:** Lecturer + AM capabilities + can view all attendance sessions/reports across all branches/batches/subjects, export PDF/Excel reports for management, view all workbook marks sheets (read-only)

# Local Development

**Backend:**
```
cd backend
npm run dev        # runs with nodemon
```
Default port: **5000** (configured via PORT env var, defaults to 5000 in server.js)

**Frontend:**
```
cd frontend
npm run dev        # runs vite dev server
```
Default port: **5173** (Vite default; proxies `/api` → http://localhost:5000)

**MongoDB:** Connection string provided via `MONGO_URI` environment variable. The app uses `mongoose.connect(process.env.MONGO_URI)` in `backend/src/config/db.js`. Local development can use `mongodb://localhost:27017/mie_faculty_attendance`.

**Frontend API configuration:** The Vite dev server proxies `/api` → `http://localhost:5000` (vite.config.js). For local development, set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env`. The axios.js fallback is `http://localhost:5001/api`. The proxy must be running for `/api` requests to route correctly.

**.env files:** Must never be committed. The project has `backend/.env.example` and `frontend/.env.example` for reference only.

# Environment & Secrets Rules

- Never print, expose, commit, or overwrite `.env` secrets
- Never place credentials (MongoDB URIs, JWT secrets, API keys) in source code or git history
- Never change MongoDB connection strings without explicit user approval
- Never seed, delete, reset, or migrate production/existing database data without explicit approval
- `backend/.env` and `frontend/.env` (if they exist) contain sensitive values — treat them as secret

# Development Rules

1. This is an existing application. Preserve the current architecture unless there is a clear reason to change it.
2. Inspect existing implementations before creating new components, APIs, models, or utilities.
3. Do not duplicate functionality that already exists.
4. Do not refactor unrelated code while implementing a feature.
5. Fix verified problems, not speculative ones.
6. Keep frontend and backend API contracts synchronized.
7. Preserve role-based authorization behavior.
8. Preserve existing database compatibility unless a migration is intentionally planned.
9. Do not update dependencies or run npm audit fix --force unless explicitly requested.
10. Do not delete data, seed the database, or change schemas destructively without explicit permission.
11. Prefer small, reviewable changes.
12. Do not automatically commit changes unless explicitly asked.

# Verification Rules

Before declaring a coding task complete:
- inspect git status
- ensure only intended files changed
- run relevant checks (e.g., `npm run build` for frontend changes)
- test affected backend/frontend behavior where practical
- report any checks that could not be performed

# Git Workflow

- `main` should remain stable
- Development should normally happen on a feature/recovery branch (e.g., `opencode-recovery`)
- Never force-push or reset `main`
- Do not commit automatically unless requested

# Known Project Context

- Existing MongoDB/database and login are working locally
- Backend successfully runs locally (port 5000)
- Frontend successfully runs locally (port 5173, proxies `/api` → localhost:5000)
- Existing user login has been verified locally
- MarksManagement.jsx is the active marks-management implementation
- The obsolete MarksManagement.jsx.clean backup was intentionally removed
- The most recent pre-recovery project work included making GET /api/subjects accessible for registration

# Notes for Future Agents

This application is in a recoverable state. Core features including authentication, class logging, dashboard, and basic reporting have been implemented and function locally. The codebase is well-structured with clear separation of concerns. New work should follow the existing patterns and preserve the role-based authorization, API contracts, and database schema unless a deliberate migration is planned. The most recent pre-recovery project work included making GET /api/subjects accessible for registration.