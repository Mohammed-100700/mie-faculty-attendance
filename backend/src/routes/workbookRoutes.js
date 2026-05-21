const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWorkbook, updateStaffEmail, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, toggleTestApproval, sendEmail,
} = require('../controllers/workbookController');

router.get('/', protect, getWorkbook);
router.put('/email-settings', protect, updateEmailSettings);
router.post('/sheets', protect, addSheet);
router.delete('/sheets/:sheetIndex', protect, deleteSheet);
router.post('/sheets/:sheetIndex/tests', protect, addTest);
router.delete('/sheets/:sheetIndex/tests/:testIndex', protect, deleteTest);
router.post('/sheets/:sheetIndex/students', protect, addStudent);
router.delete('/sheets/:sheetIndex/students/:studentIndex', protect, deleteStudent);
router.put('/sheets/:sheetIndex/students/:studentIndex/marks/:colIndex', protect, updateMark);
router.put('/sheets/:sheetIndex/tests/:testIndex/toggle', protect, toggleTestApproval);
router.post('/sheets/:sheetIndex/send', protect, sendEmail);

module.exports = router;
