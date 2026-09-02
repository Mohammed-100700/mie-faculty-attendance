const Workbook = require('../models/Workbook');

// Sanitize helper — strip HTML tags and limit length
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

// @desc    Get workbook
// @route   GET /api/workbook
const getWorkbook = async (req, res, next) => {
  try {
    let workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      workbook = await Workbook.create({
        lecturerId: req.user._id,
        staffEmail: req.user.email,
        sheets: [],
      });
    }
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new sheet
// @route   POST /api/workbook/sheets
const addSheet = async (req, res, next) => {
  try {
    const { batch, branch, subject, year } = req.body;
    if (!batch || !branch || !subject) {
      return res.status(400).json({ success: false, message: 'Batch, branch, and subject are required.' });
    }

    // Sanitize inputs
    const cleanBatch = sanitize(batch, 50);
    const cleanBranch = sanitize(branch, 50);
    const cleanSubject = sanitize(subject, 100);
    const cleanYear = year ? sanitize(String(year), 4) : String(new Date().getFullYear());

    if (!cleanBatch || !cleanBranch || !cleanSubject) {
      return res.status(400).json({ success: false, message: 'Invalid batch, branch, or subject.' });
    }

    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      return res.status(404).json({ success: false, message: 'Workbook not found.' });
    }

    // Check for duplicate (same year + batch + branch + subject)
    const exists = workbook.sheets.find(
      (s) => s.year === cleanYear && s.batch === cleanBatch && s.branch === cleanBranch && s.subject === cleanSubject
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'This sheet already exists.' });
    }

    workbook.sheets.push({
      name: `${cleanYear} / ${cleanBatch} / ${cleanBranch} / ${cleanSubject}`,
      year: cleanYear,
      batch,
      branch,
      subject,
      tests: [],
      students: [],
    });

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sheet
// @route   DELETE /api/workbook/sheets/:sheetIndex
const deleteSheet = async (req, res, next) => {
  try {
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    workbook.sheets.splice(req.params.sheetIndex, 1);
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a test to a sheet
// @route   POST /api/workbook/sheets/:sheetIndex/tests
const addTest = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { testName } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const cleanName = sanitize(testName, 100);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Test name is required.' });
    }
    let maxMarks = req.body.maxMarks ? parseInt(req.body.maxMarks) : 100;
    if (isNaN(maxMarks) || maxMarks < 1 || maxMarks > 1000) maxMarks = 100;

    // Validate assessmentDate — required for new assessments
    let assessmentDate = null;
    if (!req.body.assessmentDate) {
      return res.status(400).json({ success: false, message: 'Assessment date is required.' });
    }
    const parsedDate = new Date(req.body.assessmentDate);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment date.' });
    }
    assessmentDate = parsedDate;

    const colIndex = sheet.tests.length + 1;
    sheet.tests.push({ name: cleanName, colIndex, maxMarks, approved: false, approvedAt: null, assessmentDate });
    // Add mark entry for this test to all existing students
    for (const student of sheet.students) {
      student.marks.push({ colIndex, value: '' });
    }
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a test
// @route   DELETE /api/workbook/sheets/:sheetIndex/tests/:testIndex
const deleteTest = async (req, res, next) => {
  try {
    const { sheetIndex, testIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const deletedColIndex = sheet.tests[testIndex].colIndex;
    sheet.tests.splice(testIndex, 1);
    // Recalculate colIndexes
    sheet.tests.forEach((t, i) => { t.colIndex = i + 1; });
    // Remove mark entries for deleted test from all students
    for (const student of sheet.students) {
      student.marks = student.marks.filter((m) => m.colIndex !== deletedColIndex);
      // Recalculate student mark colIndexes
      student.marks.forEach((m, i) => { m.colIndex = i + 1; });
    }

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a student to a sheet
// @route   POST /api/workbook/sheets/:sheetIndex/students
const addStudent = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { name, ncukId } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const cleanName = sanitize(name, 100);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Student name is required.' });
    }

    const cleanNcukId = ncukId ? sanitize(ncukId, 50) : '';

    const marks = sheet.tests.map((t, i) => ({ colIndex: i + 1, value: '' }));
    sheet.students.push({ name: cleanName, ncukId: cleanNcukId, marks });
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a student's NCUK ID
// @route   PUT /api/workbook/sheets/:sheetIndex/students/:studentIndex/ncukId
const updateStudentNcukId = async (req, res, next) => {
  try {
    const { sheetIndex, studentIndex } = req.params;
    const { ncukId } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });
    const student = sheet.students[studentIndex];
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    student.ncukId = ncukId ? sanitize(ncukId, 50) : '';

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a student
// @route   DELETE /api/workbook/sheets/:sheetIndex/students/:studentIndex
const deleteStudent = async (req, res, next) => {
  try {
    const { sheetIndex, studentIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    sheet.students.splice(studentIndex, 1);
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a student's mark
// @route   PUT /api/workbook/sheets/:sheetIndex/students/:studentIndex/marks/:colIndex
const updateMark = async (req, res, next) => {
  try {
    const { sheetIndex, studentIndex, colIndex } = req.params;
    const { value } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });
    const student = sheet.students[studentIndex];
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const mark = student.marks.find((m) => m.colIndex === parseInt(colIndex));
    if (mark) mark.value = sanitize(value, 20);

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle test approval
// @route   PUT /api/workbook/sheets/:sheetIndex/tests/:testIndex/toggle
const toggleTestApproval = async (req, res, next) => {
  try {
    const { sheetIndex, testIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const test = sheet.tests[testIndex];

    test.approved = !test.approved;
    test.approvedAt = test.approved ? new Date() : null;

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync marks — add missing mark entries for students when tests were added after them
// @route   POST /api/workbook/sync-marks
const syncMarks = async (req, res, next) => {
  try {
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    let fixed = 0;
    for (const sheet of workbook.sheets) {
      const testColIndexes = sheet.tests.map((t) => t.colIndex);
      for (const student of sheet.students) {
        const existingColIndexes = student.marks.map((m) => m.colIndex);
        for (const colIdx of testColIndexes) {
          if (!existingColIndexes.includes(colIdx)) {
            student.marks.push({ colIndex: colIdx, value: '' });
            fixed++;
          }
        }
        student.marks.sort((a, b) => a.colIndex - b.colIndex);
      }
    }

    await workbook.save();
    res.json({ success: true, message: `Synced ${fixed} missing mark entries.`, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all workbooks (for Executive Office view)
// @route   GET /api/workbook/all
const getAllWorkbooks = async (req, res, next) => {
  try {
    const workbooks = await Workbook.find({})
      .populate('lecturerId', 'name email')
      .lean();

    let result;

    if (req.user.role === 'Academic Manager') {
      const managedBranch = req.user.managedBranch;
      if (!managedBranch) {
        return res.json({ success: true, data: [] });
      }

      const filteredWorkbooks = workbooks.filter((wb) => {
        const matchingSheets = wb.sheets?.filter(
          (s) => s.branch === managedBranch
        );
        return matchingSheets && matchingSheets.length > 0;
      });

      result = filteredWorkbooks.map((wb) => {
        const matchingSheets = wb.sheets?.filter(
          (s) => s.branch === managedBranch
        );
        return {
          lecturerId: wb.lecturerId._id,
          lecturerName: wb.lecturerId.name,
          lecturerEmail: wb.lecturerId.email,
          sheets: matchingSheets,
          lastEmailSentAt: wb.lastEmailSentAt,
          createdAt: wb.createdAt,
          updatedAt: wb.updatedAt,
        };
      });
    } else {
      // Executive Office (or any other role): preserve current behavior
      result = workbooks
        .filter((wb) => wb.sheets && wb.sheets.length > 0 && wb.lecturerId)
        .map((wb) => ({
          lecturerId: wb.lecturerId._id,
          lecturerName: wb.lecturerId.name,
          lecturerEmail: wb.lecturerId.email,
          sheets: wb.sheets,
          lastEmailSentAt: wb.lastEmailSentAt,
          createdAt: wb.createdAt,
          updatedAt: wb.updatedAt,
        }));
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkbook,
  addSheet,
  deleteSheet,
  addTest,
  deleteTest,
  addStudent,
  deleteStudent,
  updateMark,
  updateStudentNcukId,
  toggleTestApproval,
  syncMarks,
  getAllWorkbooks,
};
