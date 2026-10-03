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

// === WORKBOOK MUTATION INPUT CONTRACT ===
//
// Every mutation below addresses a record positionally, so a malformed index is
// not cosmetic: Number('foo') is NaN, Number('') is 0, and Number('-1') is -1.
// Unvalidated values reached splice() and mark lookup before, where a blank or
// out-of-range index silently removed the wrong entry or produced a 500. One
// parser now guards every position, and it is the only way this module turns a
// route parameter into an array offset.

const INVALID_INDEX_MESSAGES = {
  sheet: 'Invalid sheet index.',
  test: 'Invalid test index.',
  student: 'Invalid student index.',
  column: 'Invalid column index.',
};

// Canonical decimal form: a single leading 0 or a digit string that does not
// start with 0. Signs, spaces, decimals, exponent notation, and trailing text
// fail this test, so they can never be partially parsed into a usable index.
const CANONICAL_INDEX_PATTERN = /^(0|[1-9][0-9]*)$/;

const DEFAULT_MAX_MARKS = 100;
const MIN_MAX_MARKS = 1;
const MAX_MAX_MARKS = 1000;
const MAX_MARKS_MESSAGE = `Max marks must be a whole number between ${MIN_MAX_MARKS} and ${MAX_MAX_MARKS}.`;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parse one positional index. Strings arrive from route params, so a canonical
// digit string is required; numbers are accepted only when they are already
// exact non-negative integers. `0` is a valid index and is preserved. Anything
// else — blank, padded, negative, decimal, exponential, signed, non-finite,
// array, object, boolean, null, undefined — is a controlled 400.
function parseIndex(value, kind) {
  const message = INVALID_INDEX_MESSAGES[kind] || 'Invalid index.';

  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value >= 0) return value;
    throwStatus(message, 400);
  }

  if (typeof value === 'string' && CANONICAL_INDEX_PATTERN.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  throwStatus(message, 400);
}

// Convert a YYYY-MM-DD string to a Date at UTC midnight, or return null when it
// is not a real calendar date. The format test rejects ambiguous input such as
// 03/01/2026, and the round-trip test rejects dates that only look plausible:
// the Date parser silently rolls 2026-02-30 over into March, so the components
// are compared against the supplied year, month, and day.
function parseCalendarDate(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const match = CALENDAR_DATE_PATTERN.exec(trimmed);
  if (!match) return null;

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== Number(match[1])) return null;
  if (date.getUTCMonth() + 1 !== Number(match[2])) return null;
  if (date.getUTCDate() !== Number(match[3])) return null;

  return date;
}

// Resolve the owned workbook and the addressed sheet, then confirm the lecturer
// still holds that sheet's branch and subject assignment. Read paths do not use
// this: historical sheets stay readable, but no mutation reaches an existing
// sheet until the C20E helpers confirm the assignment is current and active.
// Both helpers throw the controlled 403, and this runs before any mutation, so a
// rejected request changes neither the workbook nor the canonical Student.
async function resolveMutableSheet(req, sheetIndex) {
  const workbook = await Workbook.findOne({ lecturerId: req.user._id });
  if (!workbook) throwStatus('Workbook not found.', 404);

  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) throwStatus('Sheet not found.', 404);

  await assertAssignedBranch(req, sheet.branch);
  await assertAssignedSubject(req, sheet.subject);

  return { workbook, sheet };
}

// Best-effort cleanup for a Student identity this request created. Failures are
// swallowed so the real error is never masked by a cleanup problem.
async function discardCreatedStudent(createdNewStudent, student) {
  if (!createdNewStudent || !student || !student._id) return;
  try {
    await Student.deleteOne({ _id: student._id });
  } catch (_) {
    // Best-effort cleanup; do not hide the original workbook error
  }
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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const { workbook } = await resolveMutableSheet(req, sheetIndex);

    workbook.sheets.splice(sheetIndex, 1);
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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const {
      testName,
      maxMarks: rawMaxMarks,
      assessmentDate: rawAssessmentDate,
    } = req.body || {};

    // A supplied test name must be a string that still has content after
    // sanitization, so markup-only or non-string input is treated as missing.
    if (typeof testName !== 'string') {
      return res.status(400).json({ success: false, message: 'Test name is required.' });
    }
    const cleanName = sanitize(testName, 100);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Test name is required.' });
    }

    // maxMarks is optional. Only an absent or blank value keeps the historical
    // default; anything else must be a whole number inside the supported range.
    // Number() is used instead of parseInt so '50abc' is rejected rather than
    // silently stored as 50, and an out-of-range value is reported instead of
    // being quietly replaced with the default.
    let maxMarks = DEFAULT_MAX_MARKS;
    const maxMarksIsBlankString =
      typeof rawMaxMarks === 'string' && rawMaxMarks.trim() === '';
    const maxMarksIsAbsent = rawMaxMarks === undefined || rawMaxMarks === null;

    if (!maxMarksIsAbsent && !maxMarksIsBlankString) {
      // Arrays and objects must not become valid through String() coercion
      // (for example [50] -> '50' and [] -> '').
      if (typeof rawMaxMarks !== 'string' && typeof rawMaxMarks !== 'number') {
        return res.status(400).json({ success: false, message: MAX_MARKS_MESSAGE });
      }

      const parsedMaxMarks =
        typeof rawMaxMarks === 'number' ? rawMaxMarks : Number(rawMaxMarks.trim());
      if (
        !Number.isInteger(parsedMaxMarks) ||
        parsedMaxMarks < MIN_MAX_MARKS ||
        parsedMaxMarks > MAX_MAX_MARKS
      ) {
        return res.status(400).json({ success: false, message: MAX_MARKS_MESSAGE });
      }
      maxMarks = parsedMaxMarks;
    }

    // The assessment date is required and must be a real calendar date. A
    // missing value and an unparsable value keep their distinct messages.
    if (
      rawAssessmentDate === undefined ||
      rawAssessmentDate === null ||
      String(rawAssessmentDate).trim() === ''
    ) {
      return res.status(400).json({ success: false, message: 'Assessment date is required.' });
    }
    const assessmentDate = parseCalendarDate(rawAssessmentDate);
    if (!assessmentDate) {
      return res.status(400).json({ success: false, message: 'Invalid assessment date.' });
    }

    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const testIndex = parseIndex(req.params.testIndex, 'test');
    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

    // Resolve the test before touching it: the deleted column index and the
    // recalculated column indexes must come from the test that is actually
    // being removed.
    const test = sheet.tests[testIndex];
    if (!test) throwStatus('Test not found.', 404);

    const deletedColIndex = test.colIndex;
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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const { name, ncukId, mieStudentId } = req.body || {};

    // Every identity field is optional, but a supplied value must be a string.
    // This stops an array or object from being stringified into a lookup key or
    // from reaching a stored field through String() coercion.
    for (const [field, value] of [
      ['name', name],
      ['ncukId', ncukId],
      ['mieStudentId', mieStudentId],
    ]) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return res.status(400).json({ success: false, message: `Invalid ${field}: must be a string.` });
      }
    }

    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

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

    // A canonical identity that is already linked to this sheet is rejected
    // before the row is appended, so a sheet never lists the same student twice.
    // The comparison is on the stored studentRef, which also means a legacy row
    // without a reference can never match. Only an identity that already existed
    // can match, so the rejection creates nothing; a created identity is cleaned
    // up defensively before the 409 is reported.
    if (
      resolvedStudent._id &&
      sheet.students.some(
        (row) => row.studentRef && String(row.studentRef) === String(resolvedStudent._id)
      )
    ) {
      await discardCreatedStudent(createdNewStudent, resolvedStudent);
      throwStatus('Student already exists in this sheet.', 409);
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
      await discardCreatedStudent(createdNewStudent, resolvedStudent);
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
    // 1. ROUTE PARAMETER PARSING — one shared parser for every positional index,
    // so a malformed value can never become an array offset, a splice() target,
    // or a subdocument lookup. `0` stays valid.
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const studentIndex = parseIndex(req.params.studentIndex, 'student');

    // 2. INPUT NORMALIZATION
    let { ncukId } = req.body || {};
    if (ncukId == null || typeof ncukId !== 'string') {
      throwStatus('Invalid NCUK ID: must be a string.', 400);
    }
    ncukId = sanitize(ncukId, 50);
    const isEmpty = ncukId === '';

    // 3. LOAD OWNED WORKBOOK — Mongoose document (no .lean()), so .save() works
    // 4. VALIDATE AND AUTHORIZE THE INITIAL SHEET before any transaction starts,
    // so a rejected request never opens a session or writes a canonical Student.
    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

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
      if (!tWorkbook) throwStatus('Workbook not found.', 404);

      // Re-resolve the sheet and the row from the re-fetched document, so a
      // concurrent change inside the transaction cannot address a different
      // record than the one that was authorized above.
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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const studentIndex = parseIndex(req.params.studentIndex, 'student');
    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

    const student = sheet.students[studentIndex];
    if (!student) throwStatus('Student not found.', 404);

    // Only the workbook row is removed. The canonical Student document is a
    // shared identity that may be linked from other sheets, so it is never
    // deleted here.
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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const studentIndex = parseIndex(req.params.studentIndex, 'student');
    const colIndex = parseIndex(req.params.colIndex, 'column');

    // Mark columns are 1-based, because a column is always written as its
    // position plus one. A column of 0 can therefore never name a mark entry and
    // is reported as malformed instead of as a missing mark.
    if (colIndex < 1) throwStatus(INVALID_INDEX_MESSAGES.column, 400);

    // A mark value is stored as text, so a non-string body is rejected rather
    // than coerced. A blank string is a legitimate "cleared" mark.
    const { value } = req.body || {};
    if (typeof value !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid mark value: must be a string.' });
    }

    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

    const student = sheet.students[studentIndex];
    if (!student) throwStatus('Student not found.', 404);

    // The mark must already exist. A missing column was previously reported as a
    // successful no-op, which hid real data loss from the client.
    const mark = student.marks.find((m) => m.colIndex === colIndex);
    if (!mark) throwStatus('Mark not found.', 404);

    mark.value = sanitize(value, 20);

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
    const sheetIndex = parseIndex(req.params.sheetIndex, 'sheet');
    const testIndex = parseIndex(req.params.testIndex, 'test');
    const { workbook, sheet } = await resolveMutableSheet(req, sheetIndex);

    const test = sheet.tests[testIndex];
    if (!test) throwStatus('Test not found.', 404);

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
    if (!workbook) throwStatus('Workbook not found.', 404);

    // Authorization is decided for every sheet before any of them is touched.
    // Deciding sheet by sheet would let an allowed sheet be mutated before a
    // later sheet was found to be out of scope, so the two passes are separate:
    // a historical sheet the lecturer is no longer assigned to is skipped
    // instead of failing the sync or being written to.
    const mutableSheets = [];
    let skippedSheetCount = 0;
    for (const sheet of workbook.sheets) {
      try {
        await assertAssignedBranch(req, sheet.branch);
        await assertAssignedSubject(req, sheet.subject);
        mutableSheets.push(sheet);
      } catch (error) {
        if (error.statusCode === 403) {
          skippedSheetCount++;
          continue;
        }
        throw error;
      }
    }

    let fixed = 0;
    for (const sheet of mutableSheets) {
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
    res.json({
      success: true,
      message: `Synced ${fixed} missing mark entries.`,
      skippedSheetCount,
      data: workbook,
    });
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
