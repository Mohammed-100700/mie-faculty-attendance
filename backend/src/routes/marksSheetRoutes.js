const express = require('express');
const router = express.Router();
const {
  connectSheet,
  getMySheet,
  updateApprovals,
  markEmailSent,
  resetColumn,
  disconnectSheet,
} = require('../controllers/marksSheetController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRole('Lecturer'), connectSheet);
router.get('/my', protect, authorizeRole('Lecturer'), getMySheet);
router.put('/reset-column', protect, authorizeRole('Lecturer'), resetColumn);
router.delete('/', protect, authorizeRole('Lecturer'), disconnectSheet);

// Webhook from Google Apps Script (no auth — uses sheetId internally)
router.post('/webhook', updateApprovals);
router.post('/email-sent', markEmailSent);

module.exports = router;
