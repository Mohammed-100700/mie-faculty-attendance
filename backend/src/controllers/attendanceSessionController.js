const AttendanceSession = require('../models/AttendanceSession');
const StudentCheckin = require('../models/StudentCheckin');
const crypto = require('crypto');

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
    const { branch, batch, subject } = req.body;

    if (!branch || !['Dhanmondi', 'Uttara'].includes(branch)) {
      return res.status(400).json({ success: false, message: 'Valid branch (Dhanmondi or Uttara) is required.' });
    }

    // Generate unique code
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

    const now = new Date();
    const session = await AttendanceSession.create({
      lecturerId: req.user._id,
      branch,
      batch: batch || 'September',
      subject: (subject || '').trim(),
      sessionDate: now,
      startTime: now,
      sessionCode,
      isActive: true,
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

    const checkinCount = await StudentCheckin.countDocuments({ sessionId: session._id });

    res.json({
      success: true,
      data: {
        _id: session._id,
        branch: session.branch,
        subject: session.subject,
        sessionDate: session.sessionDate,
        isActive: session.isActive,
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

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ success: false, message: 'Student name is required.' });
    }

    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (!session.isActive) {
      return res.status(400).json({ success: false, message: 'This session is closed. Attendance checkin is no longer accepted.' });
    }

    // Check for duplicate
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
      message: `Checked in successfully for ${session.branch} class.`,
      data: { checkin, checkinCount },
    });
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
