const mongoose = require('mongoose');
const Workbook = require('../models/Workbook');
const Student = require('../models/Student');
const { assertAssignedBranch, assertAssignedSubject } = require('../utils/lecturerAssignmentScope');

// Sanitize helper — strip HTML tags and limit length
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

// Throw controlled errors with statusCode for use throughout this module
function throwStatus(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
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

    if (!cleanBatch || !cleanBranch || !cleanSubject) {
      return res.status(400).json({ success: false, message: 'Invalid batch, branch, or subject.' });
    }

    // Year is optional and must normalize to a 4-digit value; an absent year
    // still defaults to the current calendar year.
    const suppliedYear = year === undefined || year === null ? '' : sanitize(String(year), 20);
    let cleanYear;
    if (!suppliedYear) {
      cleanYear = String(new Date().getFullYear());
    } else if (/^\d{4}$/.test(suppliedYear)) {
      cleanYear = suppliedYear;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid academic year.' });
    }

    // The lecturer must still be assigned to this branch and subject. This runs
    // before the workbook is loaded and mutated, so a rejected request changes
    // nothing. Both helpers throw a controlled 403 when an assignment is missing
    // or the underlying Branch/Subject record is inactive.
    const assignedBranch = await assertAssignedBranch(req, cleanBranch);
    const assignedSubject = await assertAssignedSubject(req, cleanSubject);

    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      return res.status(404).json({ success: false, message: 'Workbook not found.' });
    }

    // Check for duplicate (same year + batch + branch + subject) using the
    // normalized, database-confirmed values
    const exists = workbook.sheets.find(
      (s) => s.year === cleanYear && s.batch === cleanBatch && s.branch === assignedBranch.name && s.subject === assignedSubject.name
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'This sheet already exists.' });
    }

    workbook.sheets.push({
      name: `${cleanYear} / ${cleanBatch} / ${assignedBranch.name} / ${assignedSubject.name}`,
      year: cleanYear,
      batch: cleanBatch,
      branch: assignedBranch.name,
      subject: assignedSubject.name,
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
    const { name, ncukId, mieStudentId } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    // === IDENTITY RESOLUTION ===
    let resolvedStudent = null;
    let createdNewStudent = false;

    // Helper: attempt to create a Student identity with collision retry
    // Max 2 total attempts. Retries ONLY on mieStudentId duplicate (err.code 11000).
    const createStudentIdentity = async (nameSanitized, ncukIdTrim) => {
      let attempts = 0;
      let lastError = null;
      while (attempts < 2) {
        const objectId = new mongoose.Types.ObjectId();
        const generatedMieId = Student.generateMieStudentId(objectId);
        const studentDoc = new Student({
          _id: objectId,
          mieStudentId: generatedMieId,
          name: nameSanitized,
          ncukId: ncukIdTrim,
        });
        try {
          await studentDoc.save();
          return studentDoc;
        } catch (err) {
          lastError = err;
          // Detect a mieStudentId duplicate using BOTH possible MongoDB shapes
          const isMieIdCollision =
            err.code === 11000 &&
            (err.keyPattern?.mieStudentId || err.keyValue?.mieStudentId);
          if (isMieIdCollision) {
            attempts++;
            continue;
          }
          // If duplicate on ncukId (or any other error), propagate immediately
          return { error: err };
        }
      }
      // attempt 2 failed for ANY reason — propagate the actual last error
      return { error: lastError };
    };

    // CASE A — mieStudentId supplied
    if (mieStudentId !== undefined && mieStudentId !== null && String(mieStudentId).trim() !== '') {
      const cleanMieId = String(mieStudentId).trim();
      const exactStudent = await Student.findOne({ mieStudentId: cleanMieId });
      if (!exactStudent) {
        return res.status(404).json({ success: false, message: 'Student identity not found. Add the student to the registry first, or provide ncukId.' });
      }
      // Link existing Student — use canonical identity data; name is NOT required
      resolvedStudent = exactStudent;
      // Use the registry name and ncukId; do NOT overwrite from workbook input
    }
    // CASE B — no mieStudentId, but ncukId supplied
    else if (ncukId !== undefined && ncukId !== null && String(ncukId).trim() !== '') {
      const cleanNcukId = String(ncukId).trim();
      const exactStudent = await Student.findOne({ ncukId: cleanNcukId });
      if (exactStudent) {
        // Found existing Student by ncukId — link it with canonical data; name is NOT required
        resolvedStudent = exactStudent;
      } else {
        // Not found — create new Student identity; name IS required and sanitized
        createdNewStudent = true;
        const nameSanitized = sanitize(name, 100);
        if (!nameSanitized) {
          return res.status(400).json({ success: false, message: 'Student name is required.' });
        }
        const created = await createStudentIdentity(nameSanitized, cleanNcukId);
        if (created.error) {
          return next(created.error);
        }
        resolvedStudent = created;
      }
    }
    // CASE C — neither mieStudentId nor ncukId supplied (or both empty)
    else {
      createdNewStudent = true;
      const nameSanitized = sanitize(name, 100);
      if (!nameSanitized) {
        return res.status(400).json({ success: false, message: 'Student name is required.' });
      }
      const created = await createStudentIdentity(nameSanitized, null);
      if (created.error) {
        return next(created.error);
      }
      resolvedStudent = created;
    }

    // Build workbook student object from resolved Student
    const cleanNcukId = resolvedStudent.ncukId || '';
    const marks = sheet.tests.map((t, i) => ({ colIndex: i + 1, value: '' }));
    const workbookStudent = {
      name: resolvedStudent.name,
      ncukId: cleanNcukId,
      studentRef: resolvedStudent._id,
      mieStudentId: resolvedStudent.mieStudentId,
      marks,
    };

    sheet.students.push(workbookStudent);

    // Save workbook; if it fails and we created a new Student, best-effort rollback
    try {
      await workbook.save();
    } catch (workbookErr) {
      // If we created a new Student identity in this request, clean it up
      if (createdNewStudent && resolvedStudent && resolvedStudent._id) {
        try {
          await Student.deleteOne({ _id: resolvedStudent._id });
        } catch (_) {
          // Best-effort cleanup; do not hide the original workbook error
        }
      }
      return next(workbookErr);
    }

    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a student's NCUK ID
// @route   PUT /api/workbook/sheets/:sheetIndex/students/:studentIndex/ncukId
const updateStudentNcukId = async (req, res, next) => {
  let dbSession;
  try {
    // 1. ROUTE PARAMETER PARSING — convert strings from req.params
    let sheetIndex = Number(req.params.sheetIndex);
    let studentIndex = Number(req.params.studentIndex);

    if (
      !Number.isInteger(sheetIndex) ||
      sheetIndex < 0 ||
      !Number.isInteger(studentIndex) ||
      studentIndex < 0
    ) {
      throwStatus('Invalid sheet or student index.', 400);
    }

    // 2. INPUT NORMALIZATION
    let { ncukId } = req.body;
    if (ncukId == null || typeof ncukId !== 'string') {
      throwStatus('Invalid NCUK ID: must be a string.', 400);
    }
    ncukId = sanitize(ncukId, 50);
    const isEmpty = ncukId === '';

    // 3. LOAD OWNED WORKBOOK — Mongoose document (no .lean()), so .save() works
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) throwStatus('Not found.', 404);

    // 4. VALIDATE SHEET AND STUDENT INDEXES
    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) throwStatus('Sheet not found.', 404);

    const studentRow = sheet.students[studentIndex];
    if (!studentRow) throwStatus('Student not found.', 404);

    // 5. LEGACY ROW PATH — no studentRef
    if (!studentRow.studentRef) {
      studentRow.ncukId = isEmpty ? '' : ncukId;
      await workbook.save();
      return res.json({ success: true, data: workbook });
    }

    // 6. REAL TRANSACTION SESSION
    dbSession = await mongoose.startSession();
    let updatedWorkbook;

    await dbSession.withTransaction(async () => {
      // Re-fetch owned workbook using .session(dbSession)
      const tWorkbook = await Workbook.findOne({ lecturerId: req.user._id }).session(dbSession);
      if (!tWorkbook) throwStatus('Not found.', 404);

      const tSheet = tWorkbook.sheets[sheetIndex];
      if (!tSheet) throwStatus('Sheet not found.', 404);

      const tStudentRow = tSheet.students[studentIndex];
      if (!tStudentRow) throwStatus('Student not found.', 404);

      // If re-fetched row still has no studentRef, workbook-only update
      if (!tStudentRow.studentRef) {
        tStudentRow.ncukId = isEmpty ? '' : ncukId;
        await tWorkbook.save({ session: dbSession });
        updatedWorkbook = tWorkbook;
        return;
      }

      // Load canonical Student strictly by studentRef using the session
      const canonicalStudent = await Student.findById(tStudentRow.studentRef).session(dbSession);
      if (!canonicalStudent) throwStatus('Integrity error: studentRef has no matching Student document.', 409);

      // Duplicate preflight: for non-empty ID, check another Student already owns it
      if (!isEmpty) {
        const existing = await Student.findOne({
          ncukId,
          _id: { $ne: canonicalStudent._id },
        }).session(dbSession);
        if (existing) {
          throwStatus('Integrity error: NCUK ID already belongs to another student.', 409);
        }
      }

      // Set canonical Student.ncukId
      canonicalStudent.ncukId = isEmpty ? null : ncukId;
      await canonicalStudent.save({ session: dbSession });

      // Set the selected workbook row ncukId
      tStudentRow.ncukId = isEmpty ? '' : ncukId;

      // Save the workbook within the transaction
      await tWorkbook.save({ session: dbSession });
      updatedWorkbook = tWorkbook;
    });

    return res.json({ success: true, data: updatedWorkbook });
  } catch (error) {
    // 7. CONVERT MongoDB duplicate-key 11000 to controlled 409
    if (
      error.code === 11000 &&
      (error.keyPattern?.ncukId || error.keyValue?.ncukId)
    ) {
      const conflictError = new Error(
        'NCUK ID already belongs to another student.'
      );
      conflictError.statusCode = 409;
      return next(conflictError);
    }
    next(error);
  } finally {
    // 8. SESSION CLEANUP
    if (dbSession) await dbSession.endSession();
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
