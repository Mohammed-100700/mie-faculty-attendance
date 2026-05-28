const express = require('express');
const router = express.Router();
const {
  createSession,
  getMySessions,
  getSession,
  getSessionByCode,
  closeSession,
  studentCheckin,
  getCheckins,
  getReports,
} = require('../controllers/attendanceSessionController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

// Public routes (no auth required) — specific paths FIRST
router.get('/code/:code', getSessionByCode);

// Reports (Executive Office) — specific path before /:id
router.get('/reports', protect, authorizeRole('Executive Office'), getReports);

// Protected routes (lecturer only) — specific paths FIRST
router.post('/', protect, createSession);
router.get('/my', protect, getMySessions);

// Generic /:id routes — MUST come after all specific paths
router.get('/:id', protect, getSession);
router.get('/:id/checkins', protect, getCheckins);
router.put('/:id/close', protect, closeSession);
router.post('/:id/checkin', studentCheckin);

module.exports = router;
