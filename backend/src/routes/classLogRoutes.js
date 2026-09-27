const express = require('express');
const router = express.Router();
const {
  createClassLog,
  getMyClassLogs,
  getClassLog,
  updateClassLog,
  deleteClassLog,
} = require('../controllers/classLogController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRole('Lecturer'), createClassLog);
router.get('/my', protect, authorizeRole('Lecturer'), getMyClassLogs);
router.get('/:id', protect, authorizeRole('Lecturer'), getClassLog);
router.put('/:id', protect, authorizeRole('Lecturer'), updateClassLog);
router.delete('/:id', protect, authorizeRole('Lecturer'), deleteClassLog);

module.exports = router;
