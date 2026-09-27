const AttendanceSession = require('../models/AttendanceSession');
const StudentCheckin = require('../models/StudentCheckin');
const Student = require('../models/Student');
const Workbook = require('../models/Workbook');
const { assertAssignedBranch, assertAssignedSubject } = require('../utils/lecturerAssignmentScope');
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

// A session is cancelled when cancelledAt holds a real timestamp.
// Cancellation is auditable and non-destructive: it is never a delete.
// Defined before every use because it is shared across handlers.
const isCancelledSession = (session) =>
  session.cancelledAt !== null && session.cancelledAt !== undefined;

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

    // --- Build rosterSnapshot from selected sheet, BEFORE session creation ---
    // This is computed once and reused; never re-queried from workbook later.
    const selectedSheet = workbook.sheets[resolvedSheetIndex];

    // --- Assignment enforcement ---
    // The selected workbook sheet is authoritative for branch and subject, not
    // the request body, so a crafted payload cannot substitute another branch or
    // subject. Both checks run before any session data is derived. A branch or
    // subject that was removed from the lecturer, or whose Branch/Subject record
    // is inactive, raises a controlled 403 and creates nothing.
    await assertAssignedBranch(req, selectedSheet.branch);
    await assertAssignedSubject(req, selectedSheet.subject);

    const year = String(selectedSheet.year || '').trim();

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Selected sheet must have an academic year.',
      });
    }

    // Validate every roster row and build the immutable snapshot
    const rosterRows = selectedSheet.students;

    // Validate roster integrity: check for missing identity data and duplicates
    const refSeen = new Set();

    for (const row of rosterRows) {
      const mieId = String(row.mieStudentId || '').trim();
      const name = String(row.name || '').trim();

      if (!row.studentRef || !mieId || !name) {
        return res.status(400).json({
          success: false,
          message:
            'Roster integrity error: roster entry is missing required identity data.',
        });
      }

      const refStr = String(row.studentRef);

      if (refSeen.has(refStr)) {
        return res.status(409).json({
          success: false,
          message:
            'Roster integrity error: duplicate studentRef detected in workbook sheet.',
        });
      }

      refSeen.add(refStr);
    }

    // Build the immutable rosterSnapshot exactly once
    const rosterSnapshot = rosterRows.map((student) => ({
      studentRef: student.studentRef,
      mieStudentId: (student.mieStudentId || '').trim(),
      studentName: (student.name || '').trim(),
    }));

    // --- Unique session-code generation (after rosterSnapshot) ---
    // Every retry reuses the SAME precomputed rosterSnapshot; never re-queried.
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

    // --- Session creation uses the same precomputed rosterSnapshot ---
    const now = new Date();

    const session = await AttendanceSession.create({
      lecturerId: req.user._id,
      branch,
      batch: resolvedBatch,
      subject: resolvedSubject,
      year,
      sessionDate: now,
      startTime: now,
      sessionCode,
      isActive: true,
      workbookId: workbook._id,
      sheetIndex: resolvedSheetIndex,
      rosterSnapshot,
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
        // Expose the boolean state only. The cancellation reason and actor
        // are private audit metadata and are never returned on this public route.
        isCancelled: isCancelledSession(session),
        checkinMode,
        checkinCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a session without deleting it, its roster snapshot, or its checkins
// @route   PUT /api/attendance-sessions/:id/cancel
const cancelSession = async (req, res, next) => {
  try {
    // Read only to establish ownership (404) and to keep the reason-validation
    // ordering. This document is intentionally NOT used to derive any written
    // value: doing so would reintroduce a stale-value race.
    const ownedSession = await AttendanceSession.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!ownedSession) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // --- Validate the cancellation reason (controlled 400, never a 500) ---
    const { reason } = req.body || {};

    if (typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be a string.',
      });
    }

    const normalizedReason = reason.trim();

    if (normalizedReason.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be at least 3 characters.',
      });
    }

    if (normalizedReason.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be 300 characters or fewer.',
      });
    }

    const now = new Date();

    // --- Single atomic conditional update ---
    // The cancelledAt: null guard is what makes cancellation safe: MongoDB
    // matches it atomically, so of two concurrent requests only one can match
    // and write. The loser matches nothing and can never overwrite the
    // winner's cancellation metadata.
    const cancelledSession = await AttendanceSession.findOneAndUpdate(
      { _id: req.params.id, lecturerId: req.user._id, cancelledAt: null },
      [
        {
          $set: {
            isActive: false,
            cancelledAt: now,
            cancelledBy: req.user._id,
            cancellationReason: normalizedReason,
            // $ifNull treats null and missing identically and is evaluated
            // against the current stored document at write time, so an existing
            // endTime is preserved and only a null/missing one is stamped.
            endTime: { $ifNull: ['$endTime', now] },
          },
        },
      ],
      { new: true }
    );

    if (!cancelledSession) {
      // Distinguish an already-cancelled session from a missing/non-owned one.
      const existingSession = await AttendanceSession.findOne({
        _id: req.params.id,
        lecturerId: req.user._id,
      });

      if (existingSession) {
        return res.status(409).json({
          success: false,
          message: 'Session is already cancelled.',
        });
      }

      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({ success: true, message: 'Session cancelled.', data: cancelledSession });
  } catch (error) {
    next(error);
  }
};

// @desc    Close a session
// @route   PUT /api/attendance-sessions/:id/close
const closeSession = async (req, res, next) => {
  try {
    // Single atomic write. The cancelledAt: null guard keeps a cancelled
    // session immutable; a miss is re-read below to distinguish 409 from 404.
    const session = await AttendanceSession.findOneAndUpdate(
      { _id: req.params.id, lecturerId: req.user._id, cancelledAt: null },
      { isActive: false, endTime: new Date() },
      { new: true }
    );

    if (!session) {
      const existing = await AttendanceSession.findOne({
        _id: req.params.id,
        lecturerId: req.user._id,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Session is already cancelled.',
        });
      }

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

    // Cancellation is audited separately from closure and is checked first,
    // because cancelling also clears isActive.
    if (isCancelledSession(session)) {
      return res.status(409).json({
        success: false,
        message: 'This session is cancelled. Attendance checkin is no longer accepted.',
      });
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

    // Block public self-checkin for lecturer-managed snapshot-backed sessions
    // Must occur BEFORE Student.findOne(), Workbook query, or StudentCheckin operations
    if (session.rosterSnapshot !== undefined) {
      return res.status(400).json({
        success: false,
        message:
          'Student self check-in is not available for lecturer-managed attendance sessions.'
      });
    }

    if (hasWorkbookLink && hasSheetLink) {
      // ====== LINKED SESSION PATH ======
      // studentId means exact mieStudentId
      if (!studentId || !(studentId || '').trim()) {
        return res.status(400).json({ success: false, message: 'Student MIE ID is required.' });
      }

      // Resolve Student exactly once, before branching into snapshot-backed vs pre-C10
      // This variable is shared by both paths.
      const mieStudentId = (studentId || '').trim();
      if (!mieStudentId) {
        return res.status(400).json({ success: false, message: 'Student MIE ID is required.' });
      }

      const student = await Student.findOne({ mieStudentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found with MIE Student ID: ' + mieStudentId });
      }


      // Determine if this is a C10 snapshot-backed session or pre-C10
      const isSnapshotBackend = session.rosterSnapshot !== undefined;

      if (isSnapshotBackend) {
        // --- C10 SNAPSHOT-BACKED PATH ---
        // Validate snapshot integrity
        if (!Array.isArray(session.rosterSnapshot)) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot is not a valid array.',
          });
        }

        let snapshotValid = true;
        const seenRefs = new Set();

        for (const entry of session.rosterSnapshot) {
          if (!entry.studentRef) {
            snapshotValid = false;
            break;
          }
          const mieId = (entry.mieStudentId || '').trim();
          if (!mieId) {
            snapshotValid = false;
            break;
          }
          const sName = (entry.studentName || '').trim();
          if (!sName) {
            snapshotValid = false;
            break;
          }
          const refStr = String(entry.studentRef);
          if (seenRefs.has(refStr)) {
            snapshotValid = false;
            break;
          }
          seenRefs.add(refStr);
        }

        if (!snapshotValid) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot is corrupt or has missing/duplicate fields.',
          });
        }

        // Membership MUST be determined with studentRef from snapshot
        const snapshotEntry = session.rosterSnapshot.find(
          row => String(row.studentRef) === String(student._id)
        );

        if (!snapshotEntry) {
          return res.status(400).json({ success: false, message: 'Student is not in the roster for this session.' });
        }

        // Duplicate prevention
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

        // Create StudentCheckin with canonical data from snapshot
        const checkin = await StudentCheckin.create({
          sessionId: session._id,
          studentRef: student._id,
          studentName: snapshotEntry.studentName,
          studentId: snapshotEntry.mieStudentId,
          ipAddress: req.ip || '',
        });

        const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });

        res.status(201).json({
          success: true,
          message: 'Checked in successfully for ' + session.branch + ' class.',
          data: { checkin, checkinCount },
        });
      } else {
        // --- PRE-C10 LINKED FALLBACK ---
        // session.rosterSnapshot === undefined
        // Preserve the CURRENT C7/C9 workbook-backed behavior exactly
        // The student variable from the common lookup is reused here

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

        // Create StudentCheckin with canonical data
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
      }
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

const canonicalRef = (ref) => new mongoose.Types.ObjectId(ref).toString();

// @desc    Save manual attendance for a snapshot-backed session
// @route   PUT /api/attendance-sessions/:id/attendance
const saveAttendance = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Cancellation is audited separately from closure and is checked first,
    // because cancelling also clears isActive.
    if (isCancelledSession(session)) {
      return res.status(409).json({
        success: false,
        message: 'Cannot modify attendance for a cancelled session.',
      });
    }

    // Check if session is active
    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot modify attendance for a closed session.' });
    }

    // Check if session is C10 snapshot-backed
    if (session.rosterSnapshot === undefined || !Array.isArray(session.rosterSnapshot)) {
      return res.status(400).json({ success: false, message: 'Manual attendance is only available for snapshot-backed sessions.' });
    }

    // Validate snapshot integrity before any writes
    // C10: every rosterSnapshot entry must have studentRef, mieStudentId, studentName, no duplicates
    if (session.rosterSnapshot.length > 0) {
      const seenRefs = new Set();
      for (const entry of session.rosterSnapshot) {
        if (!entry.studentRef) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot entry is missing studentRef.',
          });
        }
        if (!entry.mieStudentId || entry.mieStudentId.trim() === '') {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot entry is missing mieStudentId.',
          });
        }
        if (!entry.studentName || entry.studentName.trim() === '') {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot entry is missing studentName.',
          });
        }
        const refStr = canonicalRef(String(entry.studentRef));
        if (seenRefs.has(refStr)) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: duplicate studentRef in rosterSnapshot.',
          });
        }
        seenRefs.add(refStr);
      }
    }

    // Validate request body
    const { presentStudentRefs } = req.body;
    if (presentStudentRefs === undefined) {
      return res.status(400).json({ success: false, message: 'presentStudentRefs is required.' });
    }

    // presentStudentRefs must be an array
    if (!Array.isArray(presentStudentRefs)) {
      return res.status(400).json({ success: false, message: 'presentStudentRefs must be an array.' });
    }

    // Canonicalize presentStudentRefs
    const presentStudentRefsCanonical = [];
    for (const ref of presentStudentRefs) {
      if (!mongoose.isValidObjectId(ref)) {
        return res.status(400).json({ success: false, message: 'Invalid ObjectId in presentStudentRefs.' });
      }
      presentStudentRefsCanonical.push(canonicalRef(ref));
    }

    // Reject duplicate canonical refs
    const refSet = new Set();
    for (const ref of presentStudentRefsCanonical) {
      if (refSet.has(ref)) {
        return res.status(400).json({ success: false, message: 'Duplicate studentRef in presentStudentRefs.' });
      }
      refSet.add(ref);
    }

    // Every ref must belong to rosterSnapshot (membership by canonical studentRef only)
    const rosterRefSet = new Set();
    for (const entry of session.rosterSnapshot) {
      rosterRefSet.add(canonicalRef(String(entry.studentRef)));
    }

    for (const ref of presentStudentRefsCanonical) {
      if (!rosterRefSet.has(ref)) {
        return res.status(400).json({ success: false, message: 'Student is not in the roster for this session.' });
      }
    }

    // --- Validate existing checkin integrity before writes ---

    const existingCheckins = await StudentCheckin.find({ sessionId: session._id }).select('studentRef _id');

    // Every existing checkin MUST have a non-null studentRef
    for (const c of existingCheckins) {
      if (!c.studentRef) {
        return res.status(409).json({
          success: false,
          message: 'Checkin integrity error: a checkin record is missing studentRef.',
        });
      }
    }

    // Every existing checkin.studentRef MUST belong to rosterSnapshot
    const existingCheckinRefs = new Set();
    for (const c of existingCheckins) {
      existingCheckinRefs.add(canonicalRef(String(c.studentRef)));
    }
    for (const ref of existingCheckinRefs) {
      if (!rosterRefSet.has(ref)) {
        return res.status(409).json({
          success: false,
          message:
            'Checkin integrity error: a checkin record has studentRef not in current roster.',
        });
      }
    }

    // No duplicate StudentCheckin studentRef values for the session
    const refCounts = {};
    for (const c of existingCheckins) {
      const r = canonicalRef(String(c.studentRef));
      refCounts[r] = (refCounts[r] || 0) + 1;
    }
    for (const [r, c] of Object.entries(refCounts)) {
      if (c > 1) {
        return res.status(409).json({
          success: false,
          message: 'Checkin integrity error: duplicate studentRef values in checkins for this session.',
        });
      }
    }

    // --- Synchronize StudentCheckin records ---

    // Canonical selected set
    const selectedSet = new Set(presentStudentRefsCanonical);

    // Students to add: in roster and selected, but not already checked in
    const toAdd = [];
    for (const entry of session.rosterSnapshot) {
      const refStr = canonicalRef(String(entry.studentRef));
      if (selectedSet.has(refStr)) {
        // This student should be present
        if (!existingCheckinRefs.has(refStr)) {
          toAdd.push({
            sessionId: session._id,
            studentRef: entry.studentRef,
            studentName: entry.studentName,
            studentId: entry.mieStudentId,
          });
        }
        // If already checked in, preserve existing checkedInAt (do nothing)
      }
    }

    // Students to remove: checked in but not in selected set
    const toRemove = [];
    for (const c of existingCheckins) {
      if (c.studentRef && !selectedSet.has(canonicalRef(String(c.studentRef)))) {
        toRemove.push(c._id);
      }
    }

    // Shared timestamp for new records
    const now = new Date();

    // Perform bulk writes
    const bulkOps = [];

    // Delete operations for removed students
    for (const removeId of toRemove) {
      bulkOps.push({
        deleteOne: { filter: { _id: removeId } },
      });
    }

    // Insert operations for added students
    for (const add of toAdd) {
      bulkOps.push({
        insertOne: {
          document: {
            sessionId: add.sessionId,
            studentRef: add.studentRef,
            studentName: add.studentName,
            studentId: add.studentId,
            checkedInAt: now,
            ipAddress: '',
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await StudentCheckin.bulkWrite(bulkOps);
    }

    // Re-fetch checkins to build response
    const checkins = await StudentCheckin.find({ sessionId: session._id })
      .sort({ checkedInAt: 1 })
      .select('studentRef studentName studentId checkedInAt');

    // Build checkin map keyed by canonical String(studentRef)
    const checkinMap = new Map();
    for (const c of checkins) {
      if (c.studentRef) {
        checkinMap.set(canonicalRef(String(c.studentRef)), c);
      }
    }

    // Build attendance rows in original snapshot order
    const attendanceRows = [];
    let presentCount = 0;

    for (const snapshotStudent of session.rosterSnapshot) {
      const studentRefStr = canonicalRef(String(snapshotStudent.studentRef));
      const matchingCheckin = checkinMap.get(studentRefStr);
      const status = matchingCheckin ? 'present' : 'absent';

      attendanceRows.push({
        studentRef: snapshotStudent.studentRef,
        mieStudentId: snapshotStudent.mieStudentId,
        studentName: snapshotStudent.studentName,
        ncukId: null,
        status,
        checkedInAt: matchingCheckin ? matchingCheckin.checkedInAt : null,
      });

      if (status === 'present') {
        presentCount++;
      }
    }

    const absentCount = session.rosterSnapshot.length - presentCount;

    // NCUK enrichment: bulk fetch current Student records by snapshot studentRef
    // one Student.find query, no N+1
    const studentRefs = session.rosterSnapshot.map(s => s.studentRef);
    const students = await Student.find({ _id: { $in: studentRefs } }).select('ncukId');
    const ncukIdMap = new Map();
    for (const s of students) {
      ncukIdMap.set(canonicalRef(String(s._id)), s.ncukId || null);
    }

    // Attach ncukId to each row
    const rowsWithNcuk = attendanceRows.map(row => ({
      ...row,
      ncukId: ncukIdMap.get(canonicalRef(String(row.studentRef))) || null,
    }));

    // Align PUT response contract with GET: mode, summary, data
    res.json({
      success: true,
      mode: 'linked',
      summary: {
        rosterCount: session.rosterSnapshot.length,
        presentCount,
        absentCount,
      },
      data: rowsWithNcuk,
    });
  } catch (error) {
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

    // --- Classify session linkage ---
    const hasWorkbookLink =
      session.workbookId !== null && session.workbookId !== undefined;
    const hasSheetLink =
      session.sheetIndex !== null && session.sheetIndex !== undefined;

    // both present => linked
    // both absent => legacy
    // only one present => controlled integrity error
    if (hasWorkbookLink !== hasSheetLink) {
      return res.status(400).json({
        success: false,
        message:
          'Session has incomplete linkage (workbookId and sheetIndex must both be present or both absent).',
      });
    }

    if (hasWorkbookLink && hasSheetLink) {
      // ====== LINKED PATH ======
      // Distinguish C10 snapshot-backed vs pre-C10 linked sessions
      if (session.rosterSnapshot !== undefined) {
        // --- C10 SNAPSHOT-BACKED PATH ---
        // Derive attendance ONLY from rosterSnapshot — do NOT query Workbook

        // Validate snapshot integrity
        if (!Array.isArray(session.rosterSnapshot)) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot is not a valid array.',
          });
        }

        let snapshotValid = true;
        const seenRefs = new Set();

        for (const entry of session.rosterSnapshot) {
          if (!entry.studentRef) {
            snapshotValid = false;
            break;
          }
          const mieId = (entry.mieStudentId || '').trim();
          if (!mieId) {
            snapshotValid = false;
            break;
          }
          const sName = (entry.studentName || '').trim();
          if (!sName) {
            snapshotValid = false;
            break;
          }
          const refStr = String(entry.studentRef);
          if (seenRefs.has(refStr)) {
            snapshotValid = false;
            break;
          }
          seenRefs.add(refStr);
        }

        if (!snapshotValid) {
          return res.status(409).json({
            success: false,
            message: 'Snapshot integrity error: rosterSnapshot is corrupt or has missing/duplicate fields.',
          });
        }

        // Fetch StudentCheckin rows once
        const checkins = await StudentCheckin.find({
          sessionId: session._id,
        }).sort({ checkedInAt: 1 });

        // Validate checkins
        // Every checkin MUST have a non-null studentRef
        for (const checkin of checkins) {
          if (!checkin.studentRef) {
            return res.status(409).json({
              success: false,
              message:
                'Checkin integrity error: a checkin record is missing studentRef.',
            });
          }
        }

        // Every checkin.studentRef MUST exist in rosterSnapshot
        const rosterRefSet = new Set();
        for (const entry of session.rosterSnapshot) {
          rosterRefSet.add(String(entry.studentRef));
        }

        for (const checkin of checkins) {
          const refStr = String(checkin.studentRef);
          if (!rosterRefSet.has(refStr)) {
            return res.status(409).json({
              success: false,
              message:
                'Checkin integrity error: a checkin record has studentRef not in current roster.',
            });
          }
        }

        // Build checkin Map: keyed by String(studentRef)
        const checkinMap = new Map();
        for (const checkin of checkins) {
          checkinMap.set(String(checkin.studentRef), checkin);
        }

        // Derive attendance in ORIGINAL snapshot order
        const attendanceRows = [];
        let presentCount = 0;

        for (const snapshotStudent of session.rosterSnapshot) {
          const studentRefStr = String(snapshotStudent.studentRef);
          const matchingCheckin = checkinMap.get(studentRefStr);
          const status = matchingCheckin ? 'present' : 'absent';

          attendanceRows.push({
            studentRef: snapshotStudent.studentRef,
            mieStudentId: snapshotStudent.mieStudentId,
            studentName: snapshotStudent.studentName,
            status,
            checkedInAt: matchingCheckin ? matchingCheckin.checkedInAt : null,
          });

          if (status === 'present') {
            presentCount++;
          }
        }

        const absentCount = session.rosterSnapshot.length - presentCount;

        // NCUK enrichment: bulk fetch current Student records by snapshot studentRef
        const studentRefs = session.rosterSnapshot.map(s => s.studentRef);
        const students = await Student.find({ _id: { $in: studentRefs } }).select('ncukId');
        const ncukIdMap = new Map();
        for (const s of students) {
          ncukIdMap.set(canonicalRef(String(s._id)), s.ncukId || null);
        }
        // Attach ncukId to each row using canonical studentRef strings
        const rowsWithNcuk = attendanceRows.map(row => ({
          ...row,
          ncukId: ncukIdMap.get(canonicalRef(String(row.studentRef))) || null,
        }));

        res.json({
          success: true,
          mode: 'linked',
          summary: {
            rosterCount: session.rosterSnapshot.length,
            presentCount,
            absentCount,
          },
          data: rowsWithNcuk,
        });
      } else {
        // --- PRE-C10 LINKED FALLBACK ---
        // session.rosterSnapshot === undefined
        // Retain the existing C9 workbook-backed implementation exactly

        // 1. Validate workbook ownership
        const workbook = await Workbook.findOne({
          _id: session.workbookId,
          lecturerId: session.lecturerId,
        });
        if (!workbook) {
          return res.status(404).json({
            success: false,
            message:
              'Session workbook not found or does not belong to you.',
          });
        }

        // 2. Validate sheetIndex
        if (
          !Number.isInteger(session.sheetIndex) ||
          session.sheetIndex < 0 ||
          session.sheetIndex >= workbook.sheets.length
        ) {
          return res.status(400).json({
            success: false,
            message: 'Invalid sheetIndex for your workbook.',
          });
        }

        // 3. linked roster integrity
        const roster = workbook.sheets[session.sheetIndex].students;

        // Every roster row MUST have studentRef
        for (const rosterStudent of roster) {
          if (!rosterStudent.studentRef) {
            return res.status(409).json({
              success: false,
              message:
                'Roster integrity error: a roster entry is missing studentRef.',
            });
          }
        }

        // Detect duplicate studentRef values in roster
        const refSeen = new Set();
        for (const rosterStudent of roster) {
          const refStr = rosterStudent.studentRef.toString();
          if (refSeen.has(refStr)) {
            return res.status(409).json({
              success: false,
              message:
                'Roster integrity error: duplicate studentRef detected in workbook sheet.',
            });
          }
          refSeen.add(refStr);
        }

        // 4. linked checkin integrity
        const checkins = await StudentCheckin.find({
          sessionId: session._id,
        }).sort({ checkedInAt: 1 });

        // Every checkin MUST have a non-null studentRef
        for (const checkin of checkins) {
          if (!checkin.studentRef) {
            return res.status(409).json({
              success: false,
              message:
                'Checkin integrity error: a checkin record is missing studentRef.',
            });
          }
        }

        // Every checkin.studentRef MUST be in the roster identity Set
        const rosterRefSet = new Set();
        for (const rosterStudent of roster) {
          rosterRefSet.add(rosterStudent.studentRef.toString());
        }

        for (const checkin of checkins) {
          const refStr = checkin.studentRef.toString();
          if (!rosterRefSet.has(refStr)) {
            return res.status(409).json({
              success: false,
              message:
                'Checkin integrity error: a checkin record has studentRef not in current roster.',
            });
          }
        }

        // 5. Build checkin Map: keyed by String(studentRef)
        const checkinMap = new Map();
        for (const checkin of checkins) {
          checkinMap.set(checkin.studentRef.toString(), checkin);
        }

        // 6. Derive attendance from roster in original order
        const attendanceRows = [];
        let presentCount = 0;

        for (const rosterStudent of roster) {
          const studentRefStr = rosterStudent.studentRef.toString();
          const matchingCheckin = checkinMap.get(studentRefStr);
          const status = matchingCheckin ? 'present' : 'absent';

          attendanceRows.push({
            studentRef: rosterStudent.studentRef,
            mieStudentId: rosterStudent.mieStudentId,
            studentName: rosterStudent.name,
            status,
            checkedInAt: matchingCheckin ? matchingCheckin.checkedInAt : null,
          });

          if (status === 'present') {
            presentCount++;
          }
        }

        const absentCount = roster.length - presentCount;

        res.json({
          success: true,
          mode: 'linked',
          summary: {
            rosterCount: roster.length,
            presentCount,
            absentCount,
          },
          data: attendanceRows,
        });
      }
    } else {
      // ====== LEGACY PATH ======

      const checkins = await StudentCheckin.find({
        sessionId: session._id,
      }).sort({ checkedInAt: 1 });

      res.json({
        success: true,
        mode: 'legacy',
        count: checkins.length,
        data: checkins,
      });
    }
  } catch (error) {
    next(error);
  }
};

const getAuthorizedReportFilter = (req, res) => {
  const { year, batch, branch, subject } = req.query;
  const filter = {};

  if (req.user.role === 'Academic Manager') {
    const managedBranch = req.user.managedBranch;

    if (!managedBranch) {
      res.status(400).json({
        success: false,
        message: 'Academic Manager must have a managed branch assigned.',
      });
      return null;
    }

    if (branch && branch !== managedBranch) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to access reports for another branch.',
      });
      return null;
    }

    filter.branch = managedBranch;
  } else if (branch) {
    filter.branch = branch;
  }

  if (year) filter.year = year;
  if (batch) filter.batch = batch;
  if (subject) filter.subject = { $regex: subject, $options: 'i' };

  return filter;
};

// @desc    Get attendance reports filtered by year/batch/branch/subject
// @route   GET /api/attendance-sessions/reports
const getReports = async (req, res, next) => {
  try {
    const filter = getAuthorizedReportFilter(req, res);
    if (!filter) return;

    // Cancelled sessions stay in the management audit view, so cancellation
    // metadata is populated here. No cancellation filter is applied.
    const sessions = await AttendanceSession.find(filter)
      .populate('lecturerId', 'name email')
      .populate('cancelledBy', 'name email')
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
        obj.year = obj.year || 'Unspecified';
        obj.checkinCount = checkinCount;
        obj.checkins = checkins;
        obj.isCancelled = isCancelledSession(session);
        return obj;
      })
    );

    res.json({ success: true, count: sessionsWithCounts.length, data: sessionsWithCounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get per-student attendance reports from immutable roster snapshots
// @route   GET /api/attendance-sessions/reports/students
const getStudentReports = async (req, res, next) => {
  try {
    const filter = getAuthorizedReportFilter(req, res);
    if (!filter) return;

    const sessions = await AttendanceSession.find(filter)
      .populate('lecturerId', 'name email')
      .sort({ sessionDate: -1 })
      .lean();
    // --- Classify every matched session exactly once ---
    // Cancellation is evaluated FIRST so a cancelled legacy session is counted
    // as cancelled, never as legacy. Only snapshot-backed, non-cancelled
    // sessions contribute to eligibility, present/absent totals, percentages,
    // and student histories.
    const eligibleSessions = [];
    let excludedCancelledSessionCount = 0;
    let excludedLegacySessionCount = 0;

    for (const session of sessions) {
      if (isCancelledSession(session)) {
        excludedCancelledSessionCount++;
        continue;
      }

      if (Array.isArray(session.rosterSnapshot)) {
        eligibleSessions.push(session);
        continue;
      }

      excludedLegacySessionCount++;
    }

    const sessionIds = eligibleSessions.map((session) => session._id);
    const checkins = sessionIds.length
      ? await StudentCheckin.find({ sessionId: { $in: sessionIds } }).select('sessionId studentRef').lean()
      : [];

    const presentBySessionAndStudent = new Set(
      checkins
        .filter((checkin) => checkin.studentRef)
        .map((checkin) => `${String(checkin.sessionId)}:${canonicalRef(String(checkin.studentRef))}`)
    );
    const reportStudents = new Map();

    for (const session of eligibleSessions) {
      for (const snapshotStudent of session.rosterSnapshot) {
        if (!snapshotStudent.studentRef) continue;

        const studentRef = canonicalRef(String(snapshotStudent.studentRef));
        const present = presentBySessionAndStudent.has(`${String(session._id)}:${studentRef}`);
        let row = reportStudents.get(studentRef);

        if (!row) {
          row = {
            studentRef,
            mieStudentId: snapshotStudent.mieStudentId,
            ncukId: null,
            studentName: snapshotStudent.studentName,
            eligibleSessions: 0,
            presentCount: 0,
            absentCount: 0,
            attendancePercentage: 0,
            history: [],
          };
          reportStudents.set(studentRef, row);
        }

        row.eligibleSessions++;
        if (present) row.presentCount++;
        else row.absentCount++;
        row.history.push({
          sessionId: String(session._id),
          sessionDate: session.sessionDate,
          year: session.year || 'Unspecified',
          batch: session.batch,
          branch: session.branch,
          subject: session.subject,
          lecturerId: session.lecturerId && session.lecturerId._id
            ? String(session.lecturerId._id)
            : String(session.lecturerId),
          lecturer: session.lecturerId && session.lecturerId._id
            ? { name: session.lecturerId.name, email: session.lecturerId.email }
            : null,
          status: present ? 'present' : 'absent',
        });
      }
    }

    const studentRefs = Array.from(reportStudents.keys()).map((studentRef) => new mongoose.Types.ObjectId(studentRef));
    const canonicalStudents = studentRefs.length
      ? await Student.find({ _id: { $in: studentRefs } }).select('mieStudentId ncukId name').lean()
      : [];

    for (const student of canonicalStudents) {
      const row = reportStudents.get(canonicalRef(String(student._id)));
      if (!row) continue;
      row.mieStudentId = student.mieStudentId || row.mieStudentId;
      row.ncukId = student.ncukId || null;
      row.studentName = student.name || row.studentName;
    }

    const data = Array.from(reportStudents.values());
    for (const row of data) {
      row.attendancePercentage = row.eligibleSessions
        ? (row.presentCount / row.eligibleSessions) * 100
        : 0;
      row.history.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
    }
    data.sort((a, b) =>
      a.studentName.localeCompare(b.studentName) || a.mieStudentId.localeCompare(b.mieStudentId)
    );

    res.json({
      success: true,
      count: data.length,
      excludedLegacySessionCount,
      excludedCancelledSessionCount,
      data,
    });
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
  cancelSession,
  saveAttendance,
  studentCheckin,
  getCheckins,
  getReports,
  getStudentReports,
};
