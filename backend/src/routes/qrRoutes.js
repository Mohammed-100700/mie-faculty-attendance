const express = require('express');
const router = express.Router();
const { generateQR, verifyQR, getBranchQRCodes } = require('../controllers/qrController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.post('/generate', protect, authorizeRole('Lecturer'), generateQR);
router.post('/verify', protect, authorizeRole('Lecturer'), verifyQR);
router.get('/branches', protect, authorizeRole('Lecturer'), getBranchQRCodes);

module.exports = router;
