const express = require('express');
const router = express.Router();
const { protect, authorizeRole } = require('../middleware/authMiddleware');
const {
  getWorkbook, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, updateStudentNcukId, toggleTestApproval, syncMarks, getAllWorkbooks,
} = require('../controllers/workbookController');

// Executive Office or Academic Manager: view all workbooks (read-only)
router.get('/all', protect, authorizeRole('Executive Office', 'Academic Manager'), getAllWorkbooks);

router.get('/', protect, authorizeRole('Lecturer'), getWorkbook);
router.post('/sheets', protect, authorizeRole('Lecturer'), addSheet);
router.delete('/sheets/:sheetIndex', protect, authorizeRole('Lecturer'), deleteSheet);
router.post('/sheets/:sheetIndex/tests', protect, authorizeRole('Lecturer'), addTest);
router.delete('/sheets/:sheetIndex/tests/:testIndex', protect, authorizeRole('Lecturer'), deleteTest);
router.post('/sheets/:sheetIndex/students', protect, authorizeRole('Lecturer'), addStudent);
router.delete('/sheets/:sheetIndex/students/:studentIndex', protect, authorizeRole('Lecturer'), deleteStudent);
router.put('/sheets/:sheetIndex/students/:studentIndex/marks/:colIndex', protect, authorizeRole('Lecturer'), updateMark);
router.put('/sheets/:sheetIndex/students/:studentIndex/ncukId', protect, authorizeRole('Lecturer'), updateStudentNcukId);
router.put('/sheets/:sheetIndex/tests/:testIndex/toggle', protect, authorizeRole('Lecturer'), toggleTestApproval);
router.post('/sync-marks', protect, authorizeRole('Lecturer'), syncMarks);

module.exports = router;
