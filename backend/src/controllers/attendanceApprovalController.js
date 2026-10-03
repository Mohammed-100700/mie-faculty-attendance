const ClassLog = require('../models/ClassLog');

const MANAGED_BRANCH_MESSAGE = 'No managed branch assigned to this Academic Manager.';
const LOG_NOT_FOUND_MESSAGE = 'Class log not found.';
const BRANCH_SCOPE_MESSAGE = 'You can only review entries for your managed branch.';
const ALREADY_REVIEWED_MESSAGE = 'This branch entry has already been reviewed.';

const REASON_TYPE_MESSAGE = 'Rejection reason must be a string.';
const REASON_MIN_MESSAGE = 'Rejection reason must be at least 3 characters.';
const REASON_MAX_MESSAGE = 'Rejection reason must be 300 characters or fewer.';
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 300;

// Controlled 400. The global error handler maps statusCode to the response, so a
// malformed payload is never reported as a 500.
function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Every approval endpoint needs a branch to act on. The list endpoints already
// refused an unassigned manager, but approve and reject matched an empty branch
// against the entries and reported a scope error instead of the missing
// assignment. The gate is now shared by all four endpoints and returns null
// after answering, so each handler stops immediately.
function requireManagedBranch(req, res) {
  const managedBranch =
    typeof req.user?.managedBranch === 'string' ? req.user.managedBranch.trim() : '';

  if (!managedBranch) {
    res.status(400).json({ success: false, message: MANAGED_BRANCH_MESSAGE });
    return null;
  }

  return managedBranch;
}

// Build a response copy that contains only the manager's own entry.
//
// The stored document is never edited to produce a response. Entries are filtered
// to the manager's branch, and totalClasses and approvalStatus are recomputed
// from that single scoped entry, so another branch's classes, approval status,
// approver, timestamp, and rejection reason cannot reach an Academic Manager. The
// stored summary keeps its workbook-wide value for the lecturer and for
// Executive Office. A log without a matching entry is dropped entirely rather
// than returned without a reviewable entry.
function scopeLogToBranch(log, managedBranch) {
  const entry = (log.entries || []).find((item) => item.branch === managedBranch);
  if (!entry) return null;

  const { entries, totalClasses, approvalStatus, ...rest } = log;

  return {
    ...rest,
    entries: [entry],
    totalClasses: entry.classes,
    approvalStatus: entry.approvalStatus,
  };
}

// Build the single atomic update that records one branch decision.
//
// A read-modify-save wrote the whole entries array back from a document read
// before the write, so two managers reviewing different branches of the same log
// overwrote each other's decision. This pipeline instead rewrites only the
// matching element and derives the stored summary from the array as it exists at
// write time, which is what makes the decision atomic per document.
//
// $literal keeps the decision values as constants. Without it, a rejection
// reason that begins with '$' would be evaluated as a field path instead of
// stored as text.
function buildReviewPipeline(branch, decision) {
  return [
    {
      $set: {
        entries: {
          $map: {
            input: { $ifNull: ['$entries', []] },
            as: 'entry',
            in: {
              $cond: [
                { $eq: ['$$entry.branch', branch] },
                { $mergeObjects: ['$$entry', { $literal: decision }] },
                '$$entry',
              ],
            },
          },
        },
      },
    },
    {
      // A document update does not run the model's pre-save recalculation, so
      // the stored summary is recomputed here from the already-updated entries,
      // in the same atomic operation. A rejection wins, then all approved,
      // otherwise pending — the same rule as the model method.
      $set: {
        approvalStatus: {
          $cond: [
            { $eq: [{ $size: '$entries' }, 0] },
            'Pending',
            {
              $cond: [
                { $in: ['Rejected', '$entries.approvalStatus'] },
                'Rejected',
                {
                  $cond: [
                    {
                      $eq: [
                        {
                          $size: {
                            $filter: {
                              input: '$entries',
                              as: 'entry',
                              cond: { $ne: ['$$entry.approvalStatus', 'Approved'] },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    'Approved',
                    'Pending',
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ];
}

// Record one decision atomically and answer with the manager-scoped log.
//
// The guard requires a Pending entry for this manager's branch. Because a
// document update is atomic, the first matching request commits and the second
// one no longer matches, so exactly one decision can win for a branch, while a
// decision on a different branch still matches and is preserved.
async function applyDecision(req, res, managedBranch, decision, decisionLabel) {
  const updatedLog = await ClassLog.findOneAndUpdate(
    {
      _id: req.params.id,
      entries: {
        $elemMatch: { branch: managedBranch, approvalStatus: 'Pending' },
      },
    },
    buildReviewPipeline(managedBranch, decision),
    { new: true }
  )
    .populate('lecturerId', 'name email')
    .lean();

  if (!updatedLog) {
    // The guarded update declined, so the reason has to be read back to tell a
    // missing log, a log without this manager's branch, and an entry that was
    // already reviewed apart. Nothing was written on any of these paths.
    const existingLog = await ClassLog.findById(req.params.id).lean();

    if (!existingLog) {
      return res.status(404).json({ success: false, message: LOG_NOT_FOUND_MESSAGE });
    }

    const existingEntry = (existingLog.entries || []).find(
      (item) => item.branch === managedBranch
    );

    if (!existingEntry) {
      return res.status(403).json({ success: false, message: BRANCH_SCOPE_MESSAGE });
    }

    return res.status(409).json({ success: false, message: ALREADY_REVIEWED_MESSAGE });
  }

  return res.json({
    success: true,
    message: `${decisionLabel} ${managedBranch} entry.`,
    data: scopeLogToBranch(updatedLog, managedBranch),
  });
}

// @desc    Get class logs where the AM's branch entry is still Pending
// @route   GET /api/attendance/pending
const getPendingClassLogs = async (req, res, next) => {
  try {
    const managedBranch = requireManagedBranch(req, res);
    if (!managedBranch) return;

    // The query already matches only the manager's own Pending entry, and the
    // response is scoped again so a stored log can never carry another branch's
    // entry into an Academic Manager response.
    const logs = await ClassLog.find({
      entries: {
        $elemMatch: { branch: managedBranch, approvalStatus: 'Pending' },
      },
    })
      .populate('lecturerId', 'name email')
      .sort({ date: -1 })
      .lean();

    const scopedLogs = logs
      .map((log) => scopeLogToBranch(log, managedBranch))
      .filter(Boolean);

    res.json({
      success: true,
      count: scopedLogs.length,
      data: scopedLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logs where the AM's branch entry is Approved or Rejected
// @route   GET /api/attendance/all
const getAllClassLogs = async (req, res, next) => {
  try {
    const managedBranch = requireManagedBranch(req, res);
    if (!managedBranch) return;

    const logs = await ClassLog.find({
      entries: {
        $elemMatch: {
          branch: managedBranch,
          approvalStatus: { $in: ['Approved', 'Rejected'] },
        },
      },
    })
      .populate('lecturerId', 'name email')
      .sort({ date: -1 })
      .lean();

    const scopedLogs = logs
      .map((log) => scopeLogToBranch(log, managedBranch))
      .filter(Boolean);

    res.json({
      success: true,
      count: scopedLogs.length,
      data: scopedLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve the AM's branch entry within a class log
// @route   PUT /api/attendance/:id/approve
const approveClassLog = async (req, res, next) => {
  try {
    const managedBranch = requireManagedBranch(req, res);
    if (!managedBranch) return;

    // One timestamp is shared by the entry and by nothing else, so approvedAt
    // and the refreshed updatedAt describe the same decision.
    const decidedAt = new Date();

    await applyDecision(
      req,
      res,
      managedBranch,
      {
        approvalStatus: 'Approved',
        approvedBy: req.user._id,
        approvedAt: decidedAt,
        rejectionReason: '',
      },
      'Approved'
    );
  } catch (error) {
    next(error);
  }
};

// Validate a rejection reason before any write is attempted.
//
// A reason is stored verbatim for the lecturer to read, so only a trimmed
// string of a reasonable length is accepted. Every other shape is a controlled
// 400, and because this runs before the update, an invalid reason writes
// nothing.
function normalizeRejectionReason(req) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};

  const { rejectionReason } = body;

  if (typeof rejectionReason !== 'string') {
    throw badRequest(REASON_TYPE_MESSAGE);
  }

  const trimmed = rejectionReason.trim();

  if (trimmed.length < MIN_REASON_LENGTH) {
    throw badRequest(REASON_MIN_MESSAGE);
  }

  if (trimmed.length > MAX_REASON_LENGTH) {
    throw badRequest(REASON_MAX_MESSAGE);
  }

  return trimmed;
}

// @desc    Reject the AM's branch entry within a class log
// @route   PUT /api/attendance/:id/reject
const rejectClassLog = async (req, res, next) => {
  try {
    const managedBranch = requireManagedBranch(req, res);
    if (!managedBranch) return;

    // Validated before the update, so a malformed reason cannot reach the
    // stored entry.
    const rejectionReason = normalizeRejectionReason(req);

    await applyDecision(
      req,
      res,
      managedBranch,
      {
        approvalStatus: 'Rejected',
        rejectionReason,
        approvedBy: null,
        approvedAt: null,
      },
      'Rejected'
    );
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
