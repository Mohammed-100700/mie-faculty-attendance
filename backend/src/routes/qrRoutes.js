const express = require('express');
const router = express.Router();
const { generateQR, verifyQR, getBranchQRCodes } = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateQR);
router.post('/verify', protect, verifyQR);
router.get('/branches', protect, getBranchQRCodes);

module.exports = router;
