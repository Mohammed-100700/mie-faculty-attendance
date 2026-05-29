const express = require('express');
const router = express.Router();
const { protect, authorizeRole } = require('../middleware/authMiddleware');
const {
  getWorkbook, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, toggleTestApproval, syncMarks, getAllWorkbooks,
} = require('../controllers/workbookController');

// Executive Office: view all lecturers' workbooks (read-only)
router.get('/all', protect, authorizeRole('Executive Office'), getAllWorkbooks);

router.get('/', protect, getWorkbook);
router.post('/sheets', protect, addSheet);
router.delete('/sheets/:sheetIndex', protect, deleteSheet);
router.post('/sheets/:sheetIndex/tests', protect, addTest);
router.delete('/sheets/:sheetIndex/tests/:testIndex', protect, deleteTest);
router.post('/sheets/:sheetIndex/students', protect, addStudent);
router.delete('/sheets/:sheetIndex/students/:studentIndex', protect, deleteStudent);
router.put('/sheets/:sheetIndex/students/:studentIndex/marks/:colIndex', protect, updateMark);
router.put('/sheets/:sheetIndex/tests/:testIndex/toggle', protect, toggleTestApproval);
router.post('/sync-marks', protect, syncMarks);

module.exports = router;
