# MIE Faculty Attendance - Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Make sure MongoDB is running locally:
   ```bash
   mongod
   ```

4. Set `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env`, then create the first administrator:
   ```bash
   npm run create-super-admin
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Branches
- `GET /api/branches` - Get all active branches (public)

### Subjects
- `GET /api/subjects` - Get all active subjects (public)
- `POST /api/subjects` - Create custom subject (Lecturer only)

### Class Logs
- `POST /api/class-logs` - Create class log (protected)
- `GET /api/class-logs/my` - Get my class logs (protected)
- `GET /api/class-logs/:id` - Get single class log (protected)
- `PUT /api/class-logs/:id` - Update class log (protected)
- `DELETE /api/class-logs/:id` - Delete class log (protected)

### Reports
- `GET /api/reports/monthly` - Monthly salary report (protected)
- `GET /api/reports/summary` - Dashboard summary (protected)
- `GET /api/reports/branch-summary` - Branch breakdown (protected)
- `GET /api/reports/subject-summary` - Subject breakdown (protected)
