const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySessions,
  getSession,
  getSessionByCode,
  closeSession,
  cancelSession,
  saveAttendance,
  studentCheckin,
  getCheckins,
  getReports,
  getStudentReports,
} = require('../controllers/attendanceSessionController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

// Public routes (no auth required) — specific paths FIRST
router.get('/code/:code', getSessionByCode);

// Reports (Executive Office) — specific path before /:id
router.get('/reports', protect, authorizeRole('Executive Office', 'Academic Manager'), getReports);
router.get('/reports/students', protect, authorizeRole('Executive Office', 'Academic Manager'), getStudentReports);

// Protected routes (lecturer only) — specific paths FIRST
router.post('/', protect, authorizeRole('Lecturer'), createSession);
router.get('/my', protect, authorizeRole('Lecturer'), getMySessions);

// Generic /:id routes — MUST come after all specific paths
router.get('/:id', protect, authorizeRole('Lecturer'), getSession);
router.get('/:id/checkins', protect, authorizeRole('Lecturer'), getCheckins);
router.put('/:id/close', protect, authorizeRole('Lecturer'), closeSession);
router.put('/:id/cancel', protect, authorizeRole('Lecturer'), cancelSession);
router.put('/:id/attendance', protect, authorizeRole('Lecturer'), saveAttendance);
router.post('/:id/checkin', studentCheckin);

module.exports = router;
