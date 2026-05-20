const express = require('express');
const router = express.Router();
const {
  createClassLog,
  getMyClassLogs,
  getClassLog,
  updateClassLog,
  deleteClassLog,
} = require('../controllers/classLogController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createClassLog);
router.get('/my', protect, getMyClassLogs);
router.get('/:id', protect, getClassLog);
router.put('/:id', protect, updateClassLog);
router.delete('/:id', protect, deleteClassLog);

module.exports = router;
