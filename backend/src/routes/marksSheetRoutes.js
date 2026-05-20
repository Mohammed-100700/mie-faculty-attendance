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
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, connectSheet);
router.get('/my', protect, getMySheet);
router.put('/reset-column', protect, resetColumn);
router.delete('/', protect, disconnectSheet);

// Webhook from Google Apps Script (no auth — uses sheetId internally)
router.post('/webhook', updateApprovals);
router.post('/email-sent', markEmailSent);

module.exports = router;
