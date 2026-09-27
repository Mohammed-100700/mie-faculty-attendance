const ClassLog = require('../models/ClassLog');
const { assertAssignedBranch } = require('../utils/lecturerAssignmentScope');

const MIN_CLASSES = 1;
const MAX_CLASSES = 20;
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_REMARKS_LENGTH = 1000;

const ENTRIES_MESSAGE = 'Entries must be a non-empty array of branch class entries.';
const ENTRY_BRANCH_MESSAGE = 'Each entry must include a branch name.';
const DUPLICATE_BRANCH_MESSAGE = 'A branch can only be submitted once per class log.';
const CLASSES_MESSAGE = `Classes must be a whole number between ${MIN_CLASSES} and ${MAX_CLASSES}.`;
const DATE_MESSAGE = 'Date must be a valid YYYY-MM-DD calendar date.';
const REMARKS_TYPE_MESSAGE = 'Remarks must be a string.';
const REMARKS_LENGTH_MESSAGE = `Remarks must be ${MAX_REMARKS_LENGTH} characters or fewer.`;
const MONTH_YEAR_PAIR_MESSAGE = 'Month requires a year.';
const MONTH_MESSAGE = `Month must be a whole number between ${MIN_MONTH} and ${MAX_MONTH}.`;
const YEAR_MESSAGE = `Year must be a whole number between ${MIN_YEAR} and ${MAX_YEAR}.`;

// Canonical decimal form: a single leading 0 or a digit string that does not
// start with 0. Padding, signs, decimals, exponent notation, and trailing text
// fail, so a query value can never be partially read as a number.
const CANONICAL_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

// A body is only a source of named fields when it is a plain object. A missing
// body, an explicit null, an array, or a scalar becomes an empty payload, so
// validation reports the missing fields with a controlled 400 instead of
// throwing while destructuring.
function toBodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body;
}

// Parse a submitted calendar day in exact YYYY-MM-DD form.
//
// The value is not trimmed and must match the exact pattern, so padded or
// trailing input is rejected rather than quietly corrected. The round trip
// rejects impossible days that the Date parser accepts by rolling them over:
// new Date('2026-02-30') is 2 March, not an error. An accepted day is stored at
// UTC midnight, so the stored calendar day does not depend on a local timezone
// and matches the date-only ISO form the API has always written.
function parseCalendarDay(value) {
  if (typeof value !== 'string') return null;

  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== Number(match[1])) return null;
  if (date.getUTCMonth() + 1 !== Number(match[2])) return null;
  if (date.getUTCDate() !== Number(match[3])) return null;

  return date;
}

// Validate remarks when a value is supplied. Optional, but a supplied value must
// be a string that fits the stored field.
function normalizeRemarks(remarks) {
  if (typeof remarks !== 'string') throw badRequest(REMARKS_TYPE_MESSAGE);

  const trimmed = remarks.trim();
  if (trimmed.length > MAX_REMARKS_LENGTH) throw badRequest(REMARKS_LENGTH_MESSAGE);

  return trimmed;
}

// Parse a canonical decimal query value. Query values arrive as strings, and an
// array or object (a repeated key or a bracket key) is rejected rather than
// coerced into a number.
function parseQueryInteger(value, min, max, message) {
  if (typeof value !== 'string' || !CANONICAL_INTEGER_PATTERN.test(value)) {
    throw badRequest(message);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw badRequest(message);
  }

  return parsed;
}

// Apply the optional month/year filter.
//
// Both absent leaves the list unfiltered. A year without a month means the full
// calendar year, matching the existing lecturer UI's "All" month option. A
// month without a year is ambiguous and rejected. UTC half-open ranges align
// with the UTC-midnight calendar days written by this controller.
function applyMonthYearFilter(filter, query = {}) {
  const { month, year } = query;
  const hasMonth = month !== undefined && month !== null && month !== '';
  const hasYear = year !== undefined && year !== null && year !== '';

  if (!hasMonth && !hasYear) return;
  if (hasMonth && !hasYear) throw badRequest(MONTH_YEAR_PAIR_MESSAGE);

  const parsedYear = parseQueryInteger(year, MIN_YEAR, MAX_YEAR, YEAR_MESSAGE);

  if (!hasMonth) {
    filter.date = {
      $gte: new Date(Date.UTC(parsedYear, 0, 1)),
      $lt: new Date(Date.UTC(parsedYear + 1, 0, 1)),
    };
    return;
  }

  const parsedMonth = parseQueryInteger(month, MIN_MONTH, MAX_MONTH, MONTH_MESSAGE);
  filter.date = {
    $gte: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)),
    $lt: new Date(Date.UTC(parsedYear, parsedMonth, 1)),
  };
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
    const { date, entries, remarks } = toBodyObject(req.body);

    // Every field is validated before the write, so a rejected request creates
    // no class log at all.
    const classDate = parseCalendarDay(date);
    if (!classDate) throw badRequest(DATE_MESSAGE);

    const cleanRemarks =
      remarks === undefined ? '' : normalizeRemarks(remarks);

    const validated = await validateEntries(req, entries);

    const classLog = await ClassLog.create({
      lecturerId: req.user._id,
      date: classDate,
      entries: validated.entries,
      totalClasses: validated.totalClasses,
      remarks: cleanRemarks,
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
    const { branch } = req.query;
    const filter = { lecturerId: req.user._id };

    applyMonthYearFilter(filter, req.query);

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

    const { date, entries, remarks } = toBodyObject(req.body);

    // Validate supplied entries before the document is touched, so a rejected
    // request leaves nothing half-applied. Date-only and remarks-only updates
    // omit entries entirely and skip this check, which keeps historical entries
    // editable after an assignment is removed.
    const validated =
      entries === undefined ? null : await validateEntries(req, entries);

    // Only an omitted date leaves the stored day untouched. An explicitly
    // supplied blank, null, or non-string value is invalid rather than silently
    // behaving like omission.
    if (date !== undefined) {
      const classDate = parseCalendarDay(date);
      if (!classDate) throw badRequest(DATE_MESSAGE);
      log.date = classDate;
    }

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

    // Only an omitted remarks field leaves the stored value alone. A supplied
    // null, array, object, or other non-string value is a controlled 400.
    if (remarks !== undefined) {
      log.remarks = normalizeRemarks(remarks);
    }

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
