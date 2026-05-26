const ClassLog = require('../models/ClassLog');

// @desc    Get class logs where the AM's branch entry is still Pending
// @route   GET /api/attendance/pending
const getPendingClassLogs = async (req, res, next) => {
  try {
    const managedBranch = req.user.managedBranch;

    if (!managedBranch) {
      return res.status(400).json({
        success: false,
        message: 'No managed branch assigned to this Academic Manager.',
      });
    }

    const logs = await ClassLog.find({
      entries: {
        $elemMatch: { branch: managedBranch, approvalStatus: 'Pending' },
      },
    })
      .populate('lecturerId', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logs where the AM's branch entry is Approved or Rejected
// @route   GET /api/attendance/all
const getAllClassLogs = async (req, res, next) => {
  try {
    const managedBranch = req.user.managedBranch;

    if (!managedBranch) {
      return res.status(400).json({
        success: false,
        message: 'No managed branch assigned to this Academic Manager.',
      });
    }

    const logs = await ClassLog.find({
      entries: {
        $elemMatch: {
          branch: managedBranch,
          approvalStatus: { $in: ['Approved', 'Rejected'] },
        },
      },
    })
      .populate('lecturerId', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve the AM's branch entry within a class log
// @route   PUT /api/attendance/:id/approve
const approveClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    // Find the specific entry for the AM's branch
    const entry = log.entries.find((e) => e.branch === req.user.managedBranch);
    if (!entry) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve entries for your managed branch.',
      });
    }

    if (entry.approvalStatus === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'This branch entry is already approved.',
      });
    }

    // Approve only this branch's entry
    entry.approvalStatus = 'Approved';
    entry.approvedBy = req.user._id;
    entry.approvedAt = new Date();
    entry.rejectionReason = '';

    // recalculateApprovalStatus() runs automatically via pre('save')
    await log.save();

    await log.populate('lecturerId', 'name email');

    res.json({
      success: true,
      message: `Approved ${req.user.managedBranch} entry.`,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject the AM's branch entry within a class log
// @route   PUT /api/attendance/:id/reject
const rejectClassLog = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required.',
      });
    }

    const log = await ClassLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    // Find the specific entry for the AM's branch
    const entry = log.entries.find((e) => e.branch === req.user.managedBranch);
    if (!entry) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject entries for your managed branch.',
      });
    }

    if (entry.approvalStatus === 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'This branch entry is already rejected.',
      });
    }

    // Reject only this branch's entry
    entry.approvalStatus = 'Rejected';
    entry.rejectionReason = rejectionReason.trim();
    entry.approvedBy = null;
    entry.approvedAt = null;

    // recalculateApprovalStatus() runs automatically via pre('save')
    await log.save();

    await log.populate('lecturerId', 'name email');

    res.json({
      success: true,
      message: `Rejected ${req.user.managedBranch} entry.`,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingClassLogs,
  getAllClassLogs,
  approveClassLog,
  rejectClassLog,
};
