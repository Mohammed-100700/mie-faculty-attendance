const express = require('express');
const router = express.Router();
const { getSubjects, createSubject } = require('../controllers/subjectController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.get('/', getSubjects);
router.post('/', protect, authorizeRole('Lecturer'), createSubject);

module.exports = router;
