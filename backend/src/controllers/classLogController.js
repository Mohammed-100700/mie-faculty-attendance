const ClassLog = require('../models/ClassLog');
const { assertAssignedBranch } = require('../utils/lecturerAssignmentScope');

const MIN_CLASSES = 1;
const MAX_CLASSES = 20;

const ENTRIES_MESSAGE = 'Entries must be a non-empty array of branch class entries.';
const ENTRY_BRANCH_MESSAGE = 'Each entry must include a branch name.';
const DUPLICATE_BRANCH_MESSAGE = 'A branch can only be submitted once per class log.';
const CLASSES_MESSAGE = `Classes must be a whole number between ${MIN_CLASSES} and ${MAX_CLASSES}.`;

// Controlled 400. The global error handler maps statusCode to the response, so a
// malformed payload is never reported as a 500.
function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Convert a submitted class count to a number without accepting partial parses.
// Number('3abc') is NaN, unlike parseInt, so trailing junk is rejected instead
// of silently becoming 3.
function toClassCount(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

// Validate submitted class-log entries and authorize every branch.
//
// Shape is validated for all entries first, so a malformed payload is always
// reported as 400 and can never be masked by an assignment rejection. Only then
// is each branch checked against the lecturer's current, active assignments.
// The returned entries contain exactly the fields the model owns; client-supplied
// approval metadata is dropped rather than trusted.
async function validateEntries(req, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw badRequest(ENTRIES_MESSAGE);
  }

  const seenBranches = new Set();
  const normalizedEntries = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw badRequest(ENTRIES_MESSAGE);
    }

    if (typeof entry.branch !== 'string' || entry.branch.trim() === '') {
      throw badRequest(ENTRY_BRANCH_MESSAGE);
    }

    const branch = entry.branch.trim();
    if (seenBranches.has(branch)) {
      throw badRequest(DUPLICATE_BRANCH_MESSAGE);
    }
    seenBranches.add(branch);

    const classes = toClassCount(entry.classes);
    if (
      !Number.isInteger(classes) ||
      classes < MIN_CLASSES ||
      classes > MAX_CLASSES
    ) {
      throw badRequest(CLASSES_MESSAGE);
    }

    normalizedEntries.push({ branch, classes });
  }

  // Assignment enforcement is delegated to the shared helper so class logs,
  // workbook sheets, and attendance sessions agree on one rule. A branch that
  // was removed from the lecturer, or whose Branch record is inactive, is
  // rejected with a controlled 403.
  for (const entry of normalizedEntries) {
    const assigned = await assertAssignedBranch(req, entry.branch);
    entry.branch = assigned.name;
  }

  // totalClasses is summed only from values that already passed the integer
  // range check above.
  const totalClasses = normalizedEntries.reduce(
    (sum, entry) => sum + entry.classes,
    0
  );

  return { entries: normalizedEntries, totalClasses };
}

// @desc    Create a new class log
// @route   POST /api/class-logs
const createClassLog = async (req, res, next) => {
  try {
    const { date, entries, remarks } = req.body;

    const validated = await validateEntries(req, entries);

    const classLog = await ClassLog.create({
      lecturerId: req.user._id,
      date: new Date(date),
      entries: validated.entries,
      totalClasses: validated.totalClasses,
      remarks: remarks || '',
    });

    res.status(201).json({
      success: true,
      message: 'Class log submitted successfully.',
      data: classLog,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all class logs for current lecturer
// @route   GET /api/class-logs/my
const getMyClassLogs = async (req, res, next) => {
  try {
    const { month, year, branch } = req.query;
    const filter = { lecturerId: req.user._id };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (branch) filter['entries.branch'] = branch;

    const logs = await ClassLog.find(filter)
      .populate('entries.approvedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single class log
// @route   GET /api/class-logs/:id
const getClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    }).populate('entries.approvedBy', 'name');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a class log
// @route   PUT /api/class-logs/:id
const updateClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    const { date, entries, remarks } = req.body;

    // Validate supplied entries before the document is touched, so a rejected
    // request leaves nothing half-applied. Date-only and remarks-only updates
    // omit entries entirely and skip this check, which keeps historical entries
    // editable after an assignment is removed.
    const validated =
      entries === undefined ? null : await validateEntries(req, entries);

    if (date) log.date = new Date(date);

    if (validated) {
      log.entries = validated.entries;
      log.totalClasses = validated.totalClasses;
      // Reset ALL entries' approval to Pending — AMs must re-approve
      log.entries.forEach((e) => {
        e.approvalStatus = 'Pending';
        e.approvedBy = null;
        e.approvedAt = null;
        e.rejectionReason = '';
      });
    }

    if (remarks !== undefined) log.remarks = remarks;

    await log.save();
    await log.populate('entries.approvedBy', 'name');

    res.json({
      success: true,
      message: 'Class log updated successfully.',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a class log
// @route   DELETE /api/class-logs/:id
const deleteClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    await ClassLog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class log deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClassLog,
  getMyClassLogs,
  getClassLog,
  updateClassLog,
  deleteClassLog,
};
