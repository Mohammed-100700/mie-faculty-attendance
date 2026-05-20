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

4. Seed the database:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new lecturer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Branches
- `GET /api/branches` - Get all branches (protected)
- `POST /api/branches/seed` - Seed default branches (protected)

### Subjects
- `GET /api/subjects` - Get all subjects (protected)
- `POST /api/subjects` - Create custom subject (protected)
- `POST /api/subjects/seed` - Seed default subjects (protected)

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

### QR
- `POST /api/qr/generate` - Generate QR token (protected)
- `POST /api/qr/verify` - Verify QR token (protected)
- `GET /api/qr/branches` - Get branch QR codes (protected)

## Demo Credentials

```
Email: lecturer@mie.com
Password: password123
```
