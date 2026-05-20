const express = require('express');
const router = express.Router();
const { getMonthlyReport, getSummary } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/monthly', protect, getMonthlyReport);
router.get('/summary', protect, getSummary);

module.exports = router;
