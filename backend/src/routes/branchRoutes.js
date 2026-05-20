const express = require('express');
const router = express.Router();
const { getBranches, seedBranches } = require('../controllers/branchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getBranches);
router.post('/seed', protect, seedBranches);

module.exports = router;
