const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');

// Single source of truth for "is this lecturer still assigned to X?".
// Branch and subject assignments are administrator-owned data, so every write
// that turns an assignment into an academic record must confirm the assignment
// against the database instead of trusting a client-supplied value.

const BRANCH_SCOPE_MESSAGE = 'You are not assigned to this branch.';
const SUBJECT_SCOPE_MESSAGE = 'You are not assigned to this subject.';

// Controlled error carrying an HTTP status. This mirrors the throwStatus
// convention already used in workbookController: the global error handler maps
// statusCode/message to the response, so a rejection is never a 500.
function assignmentError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

// Client values reach this module from a request body, a workbook sheet, or a
// class-log entry. Only a string can name a branch or subject; anything else
// (number, object, null, array) collapses to '' so it can never match an
// assignment.
function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

// req.user.branches is a list of strings that may contain blank or padded
// values from older records. Every entry is normalized before comparison so
// padding differences cannot smuggle an unassigned branch through.
function assignedBranchNames(user) {
  if (!user || !Array.isArray(user.branches)) return [];
  return user.branches
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry !== '');
}

// req.user.subjects holds ObjectIds, but tolerate populated documents and raw
// id strings too. Entries that are not valid ids are dropped rather than cast,
// so a malformed assignment can never produce a CastError.
function assignedSubjectIds(user) {
  if (!user || !Array.isArray(user.subjects)) return [];

  const ids = [];
  for (const entry of user.subjects) {
    const raw =
      entry && typeof entry === 'object' && '_id' in entry ? entry._id : entry;
    if (raw === null || raw === undefined) continue;
    if (!mongoose.isValidObjectId(raw)) continue;
    ids.push(new mongoose.Types.ObjectId(raw).toString());
  }
  return ids;
}

// Confirm the branch is a current, active assignment of the request user.
// The assignment check runs before the database check so an unassigned branch
// is reported the same way whether or not a Branch document exists.
async function assertAssignedBranch(req, branch) {
  const normalized = normalizeText(branch);
  if (!normalized) throw assignmentError(BRANCH_SCOPE_MESSAGE);

  if (!assignedBranchNames(req && req.user).includes(normalized)) {
    throw assignmentError(BRANCH_SCOPE_MESSAGE);
  }

  const branchRecord = await Branch.findOne({ name: normalized, isActive: true })
    .select('_id name')
    .lean();

  if (!branchRecord) throw assignmentError(BRANCH_SCOPE_MESSAGE);

  return { id: branchRecord._id, name: branchRecord.name };
}

// Confirm the subject names an active Subject document that is currently
// assigned to the request user. The subject is resolved from the database first,
// so a client cannot widen its own scope by naming a subject it was not given.
async function assertAssignedSubject(req, subject) {
  const normalized = normalizeText(subject);
  if (!normalized) throw assignmentError(SUBJECT_SCOPE_MESSAGE);

  const subjectIds = assignedSubjectIds(req && req.user);
  if (subjectIds.length === 0) throw assignmentError(SUBJECT_SCOPE_MESSAGE);

  // Resolve by both administrator-assigned id and canonical name. Subject names
  // are not globally unique, so looking up by name first could select another
  // lecturer's same-named custom subject and incorrectly deny a valid assignment.
  const subjectRecord = await Subject.findOne({
    _id: { $in: subjectIds },
    name: normalized,
    isActive: true,
  })
    .select('_id name')
    .lean();

  if (!subjectRecord) throw assignmentError(SUBJECT_SCOPE_MESSAGE);

  return { id: subjectRecord._id, name: subjectRecord.name };
}

module.exports = {
  BRANCH_SCOPE_MESSAGE,
  SUBJECT_SCOPE_MESSAGE,
  assignmentError,
  normalizeText,
  assignedBranchNames,
  assignedSubjectIds,
  assertAssignedBranch,
  assertAssignedSubject,
};
