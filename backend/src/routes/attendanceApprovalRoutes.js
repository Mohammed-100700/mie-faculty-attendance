const express = require('express');
const router = express.Router();
const {
  getPendingClassLogs,
  getAllClassLogs,
  approveClassLog,
  rejectClassLog,
} = require('../controllers/attendanceApprovalController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.get('/pending', protect, authorizeRole('Academic Manager'), getPendingClassLogs);
router.get('/all', protect, authorizeRole('Academic Manager'), getAllClassLogs);
router.put('/:id/approve', protect, authorizeRole('Academic Manager'), approveClassLog);
router.put('/:id/reject', protect, authorizeRole('Academic Manager'), rejectClassLog);

module.exports = router;
