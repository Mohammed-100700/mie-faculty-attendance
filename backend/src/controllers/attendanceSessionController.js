const AttendanceSession = require('../models/AttendanceSession');
const StudentCheckin = require('../models/StudentCheckin');
const Student = require('../models/Student');
const Workbook = require('../models/Workbook');
const Branch = require('../models/Branch');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Generate a short random code
function generateSessionCode(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed confusing chars like 0/O, 1/I
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// @desc    Create a new attendance session
// @route   POST /api/attendance-sessions
const createSession = async (req, res, next) => {
  try {
    const { branch, batch, subject, workbookId, sheetIndex } = req.body;

    // Normalized values for consistent use across all code paths
    const resolvedBatch = batch || 'September';
    const resolvedSubject = (subject || '').trim();

    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch is required.' });
    }

    const branchExists = await Branch.findOne({ name: branch, isActive: true });
    if (!branchExists) {
      return res.status(400).json({ success: false, message: 'Valid active branch is required.' });
    }

    // --- Restored: original unique session-code generation ---
    let sessionCode;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      sessionCode = generateSessionCode(5);
      exists = await AttendanceSession.findOne({ sessionCode });
      attempts++;
    }
    if (exists) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique session code. Please try again.' });
    }

    // --- Handle explicit workbookId / sheetIndex safely ---
    // Require BOTH workbookId and sheetIndex when either one is supplied.
    // Empty/null workbookId counts as missing.
    // Empty/null sheetIndex counts as missing.
    // Validate workbookId is a valid MongoDB ObjectId before Workbook.findOne().
    // Invalid workbookId must return a controlled 400 response, not throw a CastError/500.

    let workbook;
    let resolvedSheetIndex = null;

    // Determine explicit presence — treat undefined, null, and blank string as "not supplied"
    const hasWorkbookId =
      workbookId !== undefined &&
      workbookId !== null &&
      String(workbookId).trim() !== '';
    const hasSheetIndex =
      sheetIndex !== undefined &&
      sheetIndex !== null &&
      String(sheetIndex).trim() !== '';

    if (hasWorkbookId !== hasSheetIndex) {
      // Only one of the two was supplied
      return res.status(400).json({
        success: false,
        message: 'workbookId and sheetIndex must both be provided.',
      });
    }

    // At this point: either both are provided, or neither is provided
    if (hasWorkbookId && hasSheetIndex) {
      // Both supplied — explicit validation path
      if (!mongoose.isValidObjectId(workbookId)) {
        return res.status(400).json({ success: false, message: 'Invalid workbookId.' });
      }

      // Find the lecturer's workbook
      workbook = await Workbook.findOne({ _id: workbookId, lecturerId: req.user._id });
      if (!workbook) {
        return res
          .status(404)
          .json({ success: false, message: 'Workbook not found or does not belong to you.' });
      }

      // Validate sheetIndex:
      // - convert cleanly to Number
      // - be an integer
      // - be >= 0
      // - exist in workbook.sheets
      const idx = Number(sheetIndex);
      if (
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= workbook.sheets.length
      ) {
        return res.status(400).json({ success: false, message: 'Invalid sheetIndex for your workbook.' });
      }

      // Additional validation: the selected sheet's branch/batch/subject must match the session request
      const sheet = workbook.sheets[idx];
      if (
        sheet.branch !== branch ||
        sheet.batch !== (batch || 'September') ||
        sheet.subject !== (subject || '').trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Selected sheet branch/batch/subject do not match the session request.',
          });
      }

      resolvedSheetIndex = idx;
    } else {
      // Neither supplied — use default fallback lookup by lecturer workbook
      // Find the lecturer's workbook
      const workbookResult = await Workbook.findOne({ lecturerId: req.user._id });
      if (!workbookResult) {
        return res
          .status(400)
          .json({ success: false, message: 'No workbook found for your account. Please create a workbook first.' });
      }

      // Find ALL sheets matching the requested branch/batch/subject
      const matchSheets = workbookResult.sheets.filter(
        (s) => s.branch === branch && s.batch === resolvedBatch && s.subject === resolvedSubject
      );

      if (matchSheets.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: 'No matching sheet found in your workbook for this branch/batch/subject combination.' });
      }

      if (matchSheets.length > 1) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Ambiguous: multiple sheets match branch/batch/subject. Please specify which sheet to use by providing workbookId and sheetIndex.',
          });
      }

      // Exactly one match — use the sheet's array index
      resolvedSheetIndex = workbookResult.sheets.indexOf(matchSheets[0]);
      workbook = workbookResult;
    }

    // --- Original unique session-code generation concludes ---
    const now = new Date();

    const session = await AttendanceSession.create({
      lecturerId: req.user._id,
      branch,
      batch: resolvedBatch,
      subject: resolvedSubject,
      sessionDate: now,
      startTime: now,
      sessionCode,
      isActive: true,
      workbookId: workbook._id,
      sheetIndex: resolvedSheetIndex,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session started.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lecturer's sessions
// @route   GET /api/attendance-sessions/my
const getMySessions = async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find({ lecturerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    // Attach checkin counts
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });
        const obj = session.toObject();
        obj.checkinCount = checkinCount;
        return obj;
      })
    );

    res.json({ success: true, count: sessionsWithCounts.length, data: sessionsWithCounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session details
// @route   GET /api/attendance-sessions/:id
const getSession = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });
    const obj = session.toObject();
    obj.checkinCount = checkinCount;

    res.json({ success: true, data: obj });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session by code (public)
// @route   GET /api/attendance-sessions/code/:code
const getSessionByCode = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOne({ sessionCode: req.params.code.toUpperCase() });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found. Check the code and try again.' });
    }

    // Determine checkin mode for public-facing response
    const hasWorkbook = session.workbookId !== null && session.workbookId !== undefined;
    const hasSheet = session.sheetIndex !== null && session.sheetIndex !== undefined;

    let checkinMode;
    if (hasWorkbook && hasSheet) {
      checkinMode = 'linked';
    } else if (!hasWorkbook && !hasSheet) {
      checkinMode = 'legacy';
    } else {
      checkinMode = 'invalid';
    }

    const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });

    res.json({
      success: true,
      data: {
        _id: session._id,
        branch: session.branch,
        subject: session.subject,
        sessionDate: session.sessionDate,
        isActive: session.isActive,
        checkinMode,
        checkinCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close a session
// @route   PUT /api/attendance-sessions/:id/close
const closeSession = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOneAndUpdate(
      { _id: req.params.id, lecturerId: req.user._id },
      { isActive: false, endTime: new Date() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({ success: true, message: 'Session closed.', data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    Student checks in (public)
// @route   POST /api/attendance-sessions/:id/checkin
const studentCheckin = async (req, res, next) => {
  try {
    const { studentName, studentId } = req.body;

    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This session is closed. Attendance checkin is no longer accepted.' });
    }

    // --- Session-type classification ---
    // Treat a session as linked ONLY when BOTH workbookId and sheetIndex are present
    const hasWorkbookLink = session.workbookId !== null && session.workbookId !== undefined;
    const hasSheetLink = session.sheetIndex !== null && session.sheetIndex !== undefined;

    if (hasWorkbookLink !== hasSheetLink) {
      // corrupted / half-linked session — reject with controlled error
      return res.status(400).json({
        success: false,
        message: 'Session has incomplete linkage (workbookId and sheetIndex must both be present or both absent).',
      });
    }

    if (hasWorkbookLink && hasSheetLink) {
      // ====== LINKED SESSION PATH ======
      // studentId means exact mieStudentId
      const mieStudentId = (studentId || '').trim();
      if (!mieStudentId) {
        return res.status(400).json({ success: false, message: 'Student MIE ID is required.' });
      }

      // Exact Student lookup by mieStudentId — no name lookup, no auto-creation
      const student = await Student.findOne({ mieStudentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found with MIE Student ID: ' + mieStudentId });
      }

      // Validate session's exact workbookId and lecturer ownership
      const workbook = await Workbook.findOne({
        _id: session.workbookId,
        lecturerId: session.lecturerId,
      });
      if (!workbook) {
        return res.status(404).json({ success: false, message: 'Session workbook not found or does not belong to you.' });
      }

      // Validate sheetIndex exists in workbook.sheets
      if (!Number.isInteger(session.sheetIndex) || session.sheetIndex < 0 || session.sheetIndex >= workbook.sheets.length) {
        return res.status(400).json({ success: false, message: 'Invalid sheetIndex for your workbook.' });
      }

      // Roster membership MUST use studentRef — embedded comparison
      const sheet = workbook.sheets[session.sheetIndex];
      const isInRoster = sheet.students.some(s => s.studentRef && s.studentRef.equals(student._id));
      if (!isInRoster) {
        return res.status(400).json({ success: false, message: 'Student is not in the roster for this sheet.' });
      }

      // ADD EXPLICIT LINKED DUPLICATE CHECK
      const existing = await StudentCheckin.findOne({
        sessionId: session._id,
        studentRef: student._id,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'You are already checked in for this session.',
        });
      }

      // Create StudentCheckin with canonical data (ignore user-supplied studentName)
      const checkin = await StudentCheckin.create({
        sessionId: session._id,
        studentRef: student._id,
        studentName: student.name,
        studentId: student.mieStudentId,
        ipAddress: req.ip || '',
      });

      const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });

      res.status(201).json({
        success: true,
        message: 'Checked in successfully for ' + session.branch + ' class.',
        data: { checkin, checkinCount },
      });
    } else {
      // ====== LEGACY SESSION PATH ======
      // studentName is required for legacy sessions
      if (!studentName || !studentName.trim()) {
        return res.status(400).json({ success: false, message: 'Student name is required.' });
      }

      // Preserve existing name-based check-in behavior
      // Explicit duplicate check by sessionId + studentName
      const existing = await StudentCheckin.findOne({
        sessionId: session._id,
        studentName: studentName.trim(),
      });

      if (existing) {
        return res.status(400).json({ success: false, message: 'You are already checked in for this session.' });
      }

      const checkin = await StudentCheckin.create({
        sessionId: session._id,
        studentName: studentName.trim(),
        studentId: (studentId || '').trim(),
        ipAddress: req.ip || '',
      });

      const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });

      res.status(201).json({
        success: true,
        message: 'Checked in successfully for ' + session.branch + ' class.',
        data: { checkin, checkinCount },
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You are already checked in for this session.' });
    }
    next(error);
  }
};

// @desc    Get checkins for a session
// @route   GET /api/attendance-sessions/:id/checkins
const getCheckins = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const checkins = await StudentCheckin.find({ sessionId: session._id })
      .sort({ checkedInAt: 1 });

    res.json({ success: true, count: checkins.length, data: checkins });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance reports filtered by batch/branch/subject
// @route   GET /api/attendance-sessions/reports
const getReports = async (req, res, next) => {
  try {
    const { batch, branch, subject } = req.query;
    const filter = {};

    if (batch) filter.batch = batch;
    if (branch) filter.branch = branch;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };

    const sessions = await AttendanceSession.find(filter)
      .populate('lecturerId', 'name email')
      .sort({ sessionDate: -1 })
      .limit(200);

    // Attach checkin counts
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });
        const checkins = await StudentCheckin.find({ sessionId: session._id })
          .sort({ checkedInAt: 1 })
          .select('studentName studentId checkedInAt');
        const obj = session.toObject();
        obj.checkinCount = checkinCount;
        obj.checkins = checkins;
        return obj;
      })
    );

    res.json({ success: true, count: sessionsWithCounts.length, data: sessionsWithCounts });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getMySessions,
  getSession,
  getSessionByCode,
  closeSession,
  studentCheckin,
  getCheckins,
  getReports,
};
