const express = require('express');
const router = express.Router();
const { getSubjects, createSubject, seedSubjects } = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSubjects);
router.post('/', protect, createSubject);
router.post('/seed', protect, seedSubjects);

module.exports = router;
