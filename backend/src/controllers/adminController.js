const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');

// Administrator-managed user input.
//
// Every value below arrives from a request body, so nothing may be trimmed,
// lowercased, matched, or length-checked before its type is known: a number,
// array, or object used where a string is expected is a controlled 400, never a
// thrown TypeError. The complete proposed user state is validated before a
// single field is assigned to a stored document, so a rejected request leaves
// the user exactly as it was.

const ASSIGNABLE_ROLES = ['Lecturer', 'Academic Manager', 'Executive Office'];
const SUPER_ADMIN_ROLE = 'Super Admin';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

// A canonical id is exactly 24 hex characters. mongoose.isValidObjectId also
// accepts a 12-character string, so the explicit pattern is used for client
// input and every accepted value is re-serialized through ObjectId to get the
// canonical lower-case form used for comparison.
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Practical address shape: no whitespace or @ inside the parts, a dotted domain,
// and an alphabetic TLD of at least two characters. Deliberately stricter than a
// "contains @" check so a typo cannot create an unreachable account.
const EMAIL_PATTERN = /^[^\s@]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const BODY_MESSAGE = 'Request body must be a JSON object.';
const REQUIRED_FIELDS_MESSAGE = 'Name, email, password, and role are required.';
const INVALID_ROLE_MESSAGE =
  'Invalid role. Must be Lecturer, Academic Manager, or Executive Office.';
const INVALID_ROLE_UPDATE_MESSAGE = 'Invalid role.';
const DUPLICATE_EMAIL_MESSAGE = 'A user with this email already exists.';
const NAME_TYPE_MESSAGE = 'Name must be a string.';
const NAME_LENGTH_MESSAGE = `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
const EMAIL_TYPE_MESSAGE = 'Email must be a string.';
const EMAIL_LENGTH_MESSAGE = `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`;
const EMAIL_FORMAT_MESSAGE = 'Email must be a valid email address.';
const PHONE_TYPE_MESSAGE = 'Phone must be a string.';
const PHONE_LENGTH_MESSAGE = `Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`;
const PASSWORD_TYPE_MESSAGE = 'Password must be a string.';
const PASSWORD_MIN_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
const PASSWORD_MAX_MESSAGE = `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
const TEMPORARY_PASSWORD_TYPE_MESSAGE = 'Temporary password must be a string.';
const TEMPORARY_PASSWORD_MIN_MESSAGE = `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
const TEMPORARY_PASSWORD_MAX_MESSAGE = `Temporary password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
const BRANCHES_TYPE_MESSAGE = 'Branches must be an array of branch names.';
const BRANCH_ENTRY_MESSAGE = 'Each branch assignment must be a branch name string.';
const BRANCH_BLANK_MESSAGE = 'Branch names must not be blank.';
const BRANCH_DUPLICATE_MESSAGE = 'The same branch cannot be assigned twice.';
const SUBJECTS_TYPE_MESSAGE = 'Subjects must be an array of subject IDs.';
const SUBJECT_ENTRY_MESSAGE = 'Each subject assignment must be a valid subject ID.';
const SUBJECT_DUPLICATE_MESSAGE = 'The same subject cannot be assigned twice.';
const MANAGED_BRANCH_MESSAGE = 'Managed branch is required for an Academic Manager.';
const BRANCH_NOT_FOUND_MESSAGE = 'Branch not found: ';
const BRANCH_INACTIVE_MESSAGE = 'Branch is inactive: ';
const SUBJECT_NOT_FOUND_MESSAGE = 'Subject not found: ';
const SUBJECT_INACTIVE_MESSAGE = 'Subject is inactive: ';

// These fields are select:false in the User schema, so a response cannot normally
// contain them. Deleting them explicitly keeps that guarantee visible and holds
// even if a future query adds a projection.
const RESPONSE_EXCLUDED_FIELDS = [
  'password',
  'resetPasswordToken',
  'resetPasswordExpires',
  'emailAppPassword',
];

// Controlled 400. The global error handler maps statusCode to the response, so a
// malformed payload is never reported as a 500.
function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Only a JSON object carries named fields. A missing body, an explicit null, an
// array, or a scalar is rejected here so the field validators below never see an
// unexpected shape.
function readBody(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ success: false, message: BODY_MESSAGE });
    return null;
  }
  return req.body;
}

// req.params is always a string, so this only replaces the repeated inline
// pattern test with one named check.
function isObjectIdParam(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

// Remove every credential field before a user document is answered with.
function toSafeUserResponse(user) {
  const safe = user.toObject();
  for (const field of RESPONSE_EXCLUDED_FIELDS) delete safe[field];
  return safe;
}

// A duplicate email found only by the unique index, i.e. two requests that both
// passed the pre-check. The race is reported with the same controlled message as
// the pre-check instead of a raw MongoDB error.
function isDuplicateEmailError(error) {
  if (!error || error.code !== 11000) return false;
  if (error.keyPattern && Object.keys(error.keyPattern).length > 0) {
    return Object.prototype.hasOwnProperty.call(error.keyPattern, 'email');
  }
  if (error.keyValue && Object.keys(error.keyValue).length > 0) {
    return Object.prototype.hasOwnProperty.call(error.keyValue, 'email');
  }
  // An older driver may report neither shape; the only unique index on User
  // besides _id is email.
  return true;
}

function normalizeName(value) {
  if (typeof value !== 'string') throw badRequest(NAME_TYPE_MESSAGE);

  const name = value.trim();
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw badRequest(NAME_LENGTH_MESSAGE);
  }
  return name;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') throw badRequest(EMAIL_TYPE_MESSAGE);

  const email = value.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH) throw badRequest(EMAIL_LENGTH_MESSAGE);
  if (!EMAIL_PATTERN.test(email)) throw badRequest(EMAIL_FORMAT_MESSAGE);
  return email;
}

function normalizePhone(value) {
  if (typeof value !== 'string') throw badRequest(PHONE_TYPE_MESSAGE);

  const phone = value.trim();
  if (phone.length > MAX_PHONE_LENGTH) throw badRequest(PHONE_LENGTH_MESSAGE);
  return phone;
}

// Passwords are never trimmed: a leading or trailing space is part of the
// secret, and the stored length is what the length rules describe.
function normalizePassword(value) {
  if (typeof value !== 'string') throw badRequest(PASSWORD_TYPE_MESSAGE);
  if (value.length < MIN_PASSWORD_LENGTH) throw badRequest(PASSWORD_MIN_MESSAGE);
  if (value.length > MAX_PASSWORD_LENGTH) throw badRequest(PASSWORD_MAX_MESSAGE);
  return value;
}

function normalizeTemporaryPassword(value) {
  if (typeof value !== 'string') throw badRequest(TEMPORARY_PASSWORD_TYPE_MESSAGE);
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(TEMPORARY_PASSWORD_MIN_MESSAGE);
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    throw badRequest(TEMPORARY_PASSWORD_MAX_MESSAGE);
  }
  return value;
}

// Branch assignments are stored by name, matching the immutable Branch.name and
// the way the admin forms and every branch filter already use it.
function normalizeBranchNameList(value) {
  if (!Array.isArray(value)) throw badRequest(BRANCHES_TYPE_MESSAGE);

  const names = [];
  const seen = new Set();
  for (const entry of value) {
    // Rejects numbers, objects, null, and nested arrays in one check.
    if (typeof entry !== 'string') throw badRequest(BRANCH_ENTRY_MESSAGE);

    const name = entry.trim();
    if (!name) throw badRequest(BRANCH_BLANK_MESSAGE);
    if (seen.has(name)) throw badRequest(BRANCH_DUPLICATE_MESSAGE);

    seen.add(name);
    names.push(name);
  }
  return names;
}

function normalizeSubjectIdList(value) {
  if (!Array.isArray(value)) throw badRequest(SUBJECTS_TYPE_MESSAGE);

  const ids = [];
  const seen = new Set();
  for (const entry of value) {
    if (typeof entry !== 'string' || !OBJECT_ID_PATTERN.test(entry)) {
      throw badRequest(SUBJECT_ENTRY_MESSAGE);
    }

    // Compare in canonical form, so the same id written in upper case is caught
    // as a duplicate rather than stored twice.
    const id = new mongoose.Types.ObjectId(entry).toString();
    if (seen.has(id)) throw badRequest(SUBJECT_DUPLICATE_MESSAGE);

    seen.add(id);
    ids.push(id);
  }
  return ids;
}

// The assignments a user already holds. These are the only inactive records that
// may be kept when the same user is updated: a branch or subject that became
// inactive after it was assigned stays assignable to its owner and removable by
// them, but never to anybody else.
function storedAssignments(user) {
  const branchNames = [];
  if (Array.isArray(user.branches)) {
    for (const entry of user.branches) {
      if (typeof entry !== 'string') continue;
      const name = entry.trim();
      if (name) branchNames.push(name);
    }
  }

  const subjectIds = [];
  if (Array.isArray(user.subjects)) {
    for (const entry of user.subjects) {
      // Tolerate a populated document as well as a raw id.
      const raw =
        entry && typeof entry === 'object' && '_id' in entry ? entry._id : entry;
      if (raw === null || raw === undefined) continue;

      const text = String(raw);
      if (!OBJECT_ID_PATTERN.test(text)) continue;
      subjectIds.push(new mongoose.Types.ObjectId(text).toString());
    }
  }

  const managedBranch =
    typeof user.managedBranch === 'string' ? user.managedBranch.trim() : '';

  return {
    branchNames: new Set(branchNames),
    subjectIds: new Set(subjectIds),
    managedBranch,
  };
}

// Resolve every requested branch name in a single query.
//
// isActive is compared against false rather than for truth, matching how the
// admin forms decide a branch is selectable, so a record that predates the flag
// is still usable. The canonical Branch.name is what gets stored.
async function resolveBranchAssignments(names, allowedInactiveNames) {
  if (names.length === 0) return [];

  const records = await Branch.find({ name: { $in: names } })
    .select('name isActive')
    .lean();

  const byName = new Map(records.map((record) => [record.name, record]));

  const resolved = [];
  for (const name of names) {
    const record = byName.get(name);
    if (!record) throw badRequest(`${BRANCH_NOT_FOUND_MESSAGE}${name}`);

    if (record.isActive === false && !allowedInactiveNames.has(name)) {
      throw badRequest(`${BRANCH_INACTIVE_MESSAGE}${name}`);
    }
    resolved.push(record.name);
  }
  return resolved;
}

// Resolve every requested subject id in a single query and return the stored
// ObjectIds, so the assignment is written in the schema's own type.
async function resolveSubjectAssignments(ids, allowedInactiveIds) {
  if (ids.length === 0) return [];

  const records = await Subject.find({ _id: { $in: ids } })
    .select('_id name isActive')
    .lean();

  const byId = new Map(records.map((record) => [record._id.toString(), record]));

  const resolved = [];
  for (const id of ids) {
    const record = byId.get(id);
    if (!record) throw badRequest(`${SUBJECT_NOT_FOUND_MESSAGE}${id}`);

    if (record.isActive === false && !allowedInactiveIds.has(id)) {
      throw badRequest(`${SUBJECT_INACTIVE_MESSAGE}${record.name}`);
    }
    resolved.push(record._id);
  }
  return resolved;
}

// Build the complete academic scope proposed for a role, without writing
// anything. An undefined branches/subjects value means "not supplied", so a
// partial request keeps the stored assignment instead of silently clearing it,
// while managedBranch is always explicit: null for a role that has none.
async function buildAssignmentState(role, body, existing) {
  if (role === 'Executive Office') {
    // The role is validated first, so any academic scope sent for this role is
    // ignored rather than interpreted, and the stored scope is always cleared.
    return { branches: [], subjects: [], managedBranch: null };
  }

  if (role === 'Academic Manager') {
    if (body.managedBranch === undefined || body.managedBranch === null) {
      // Nothing new was selected, so the user must already have a managed
      // branch. Resolve that stored value again: an existing inactive record is
      // allowed to remain, while a deleted or unknown record is never silently
      // preserved.
      if (!existing.managedBranch) throw badRequest(MANAGED_BRANCH_MESSAGE);
      const allowed = new Set([existing.managedBranch]);
      const [managedBranch] = await resolveBranchAssignments(
        [existing.managedBranch],
        allowed
      );
      return { branches: [], subjects: [], managedBranch };
    }

    if (typeof body.managedBranch !== 'string') throw badRequest(MANAGED_BRANCH_MESSAGE);

    const requested = body.managedBranch.trim();
    if (!requested) throw badRequest(MANAGED_BRANCH_MESSAGE);

    const allowed = new Set();
    if (existing.managedBranch) allowed.add(existing.managedBranch);

    const [managedBranch] = await resolveBranchAssignments([requested], allowed);
    return { branches: [], subjects: [], managedBranch };
  }

  // Omitted arrays keep the stored values, but those values are resolved again
  // rather than copied blindly. This preserves existing inactive records while
  // rejecting an assignment whose Branch or Subject record no longer exists.
  const proposedBranches =
    body.branches === undefined
      ? Array.from(existing.branchNames)
      : normalizeBranchNameList(body.branches);
  const proposedSubjects =
    body.subjects === undefined
      ? Array.from(existing.subjectIds)
      : normalizeSubjectIdList(body.subjects);

  // Two queries in total, regardless of how many branches or subjects are named.
  const [branches, subjects] = await Promise.all([
    resolveBranchAssignments(proposedBranches, existing.branchNames),
    resolveSubjectAssignments(proposedSubjects, existing.subjectIds),
  ]);

  return { branches, subjects, managedBranch: null };
}

const EMPTY_ASSIGNMENTS = { branchNames: new Set(), subjectIds: new Set(), managedBranch: '' };

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Super Admin
const dashboard = async (req, res, next) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments({});

    // Active users: isActive=true OR isActive field missing (backward compatibility)
    // Inactive users: isActive=false ONLY
    const activeUsers = await User.countDocuments({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });

    const inactiveUsers = await User.countDocuments({ isActive: false });

    // Role counts - Super Admin excluded from academic role counts
    const lecturers = await User.countDocuments({ role: 'Lecturer' });
    const academicManagers = await User.countDocuments({
      role: 'Academic Manager',
    });
    const executiveOffice = await User.countDocuments({
      role: 'Executive Office',
    });
    const superAdmins = await User.countDocuments({ role: 'Super Admin' });

    // Count actual branches and subjects from DB
    const branches = await Branch.countDocuments({});
    const subjects = await Subject.countDocuments({});

    res.json({
      success: true,
      data: {
        totalUsers,
        superAdmins,
        lecturers,
        academicManagers,
        executiveOffice,
        activeUsers,
        inactiveUsers,
        branches,
        subjects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Super Admin
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password -resetPasswordToken -resetPasswordExpires -emailAppPassword')
      .lean();

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/admin/users
// @access  Super Admin
const createUser = async (req, res, next) => {
  try {
    const body = readBody(req, res);
    if (!body) return;

    if (
      body.name === undefined ||
      body.email === undefined ||
      body.password === undefined ||
      body.role === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: REQUIRED_FIELDS_MESSAGE,
      });
    }

    // Reject Super Admin creation
    if (body.role === SUPER_ADMIN_ROLE) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create another Super Admin account.',
      });
    }

    // Validate role is one of the normal roles. The role is settled before any
    // assignment field is read, so a role that owns no academic scope cannot be
    // given one by a stray payload field.
    if (typeof body.role !== 'string' || !ASSIGNABLE_ROLES.includes(body.role)) {
      return res.status(400).json({
        success: false,
        message: INVALID_ROLE_MESSAGE,
      });
    }

    const name = normalizeName(body.name);
    const email = normalizeEmail(body.email);
    const phone =
      body.phone === undefined ? '' : normalizePhone(body.phone);
    const password = normalizePassword(body.password);

    // Check duplicate email (following existing auth behavior)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: DUPLICATE_EMAIL_MESSAGE,
      });
    }

    // A new account may not inherit a historical inactive assignment, so it
    // starts with no allowed exceptions.
    const assignments = await buildAssignmentState(
      body.role,
      body,
      EMPTY_ASSIGNMENTS
    );

    // Build user data - let pre-save hook hash the password
    const userData = {
      name,
      email,
      phone,
      password,
      role: body.role,
      ...assignments,
    };

    let user;
    try {
      user = await User.create(userData);
    } catch (error) {
      // Another request created this email between the check above and this
      // insert, so the unique index rejected it.
      if (isDuplicateEmailError(error)) {
        return res.status(400).json({
          success: false,
          message: DUPLICATE_EMAIL_MESSAGE,
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: toSafeUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit normal user
// @route   PUT /api/admin/users/:id
// @access  Super Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!isObjectIdParam(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const body = readBody(req, res);
    if (!body) return;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Protect: cannot edit Super Admin through this endpoint
    if (user.role === SUPER_ADMIN_ROLE) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit a Super Admin account through this endpoint.',
      });
    }

    // ---- Validation only. Nothing below this block touches the document. ----

    // Cannot set role to Super Admin
    if (body.role === SUPER_ADMIN_ROLE) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change role to Super Admin.',
      });
    }

    if (
      body.role !== undefined &&
      (typeof body.role !== 'string' || !ASSIGNABLE_ROLES.includes(body.role))
    ) {
      return res.status(400).json({
        success: false,
        message: INVALID_ROLE_UPDATE_MESSAGE,
      });
    }

    const pending = {};

    if (body.name !== undefined) pending.name = normalizeName(body.name);
    if (body.email !== undefined) pending.email = normalizeEmail(body.email);
    if (body.phone !== undefined) {
      pending.phone = normalizePhone(body.phone);
    }

    // Resolve the complete academic scope even when a partial request omits the
    // role. Stored assignments are the allowed exceptions for inactive records,
    // but every retained record must still exist.
    const proposedRole = body.role === undefined ? user.role : body.role;
    const assignments = await buildAssignmentState(
      proposedRole,
      body,
      storedAssignments(user)
    );

    // Check duplicate email (excluding current user). An unchanged email is this
    // user's own record and is therefore accepted.
    if (pending.email !== undefined) {
      const existingUser = await User.findOne({ email: pending.email });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: DUPLICATE_EMAIL_MESSAGE,
        });
      }
    }

    // ---- Everything validated. Assign the proposed state. ----

    if (pending.name !== undefined) user.name = pending.name;
    if (pending.email !== undefined) user.email = pending.email;
    if (pending.phone !== undefined) user.phone = pending.phone;

    user.role = proposedRole;

    // Omitted assignments have already been resolved from the stored values, so
    // every assigned record is canonical and still exists. A role with no
    // academic scope is always cleared explicitly.
    user.branches = assignments.branches;
    user.subjects = assignments.subjects;
    user.managedBranch = assignments.managedBranch;

    let updatedUser;
    try {
      updatedUser = await user.save();
    } catch (error) {
      // Another request claimed this email between the check above and this
      // save, so the unique index rejected it.
      if (isDuplicateEmailError(error)) {
        return res.status(400).json({
          success: false,
          message: DUPLICATE_EMAIL_MESSAGE,
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: toSafeUserResponse(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/admin/users/:id/status
// @access  Super Admin
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;
    const { isActive } = body;

    // Validate isActive is actually Boolean
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.',
      });
    }

    // Validate ObjectId
    if (!isObjectIdParam(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Protect: cannot change status of Super Admin
    if (user.role === SUPER_ADMIN_ROLE) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change status of a Super Admin account.',
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: 'User status updated successfully.',
      data: toSafeUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password (temporary password)
// @route   PATCH /api/admin/users/:id/reset-password
// @access  Super Admin
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;

    // Type-checked before any length test, so a number or an object used as a
    // password is a controlled 400 instead of a thrown TypeError.
    const temporaryPassword = normalizeTemporaryPassword(body.temporaryPassword);

    // Validate ObjectId
    if (!isObjectIdParam(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Protect: cannot reset password of Super Admin
    if (user.role === SUPER_ADMIN_ROLE) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reset password of a Super Admin account.',
      });
    }

    // Set temporary password and invalidate every previously issued token
    // - pre-save hook will hash the password
    user.password = temporaryPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save(); // pre-save hook runs bcrypt hash

    res.json({
      success: true,
      message: 'User password reset successfully.',
      data: toSafeUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Get all branches (active + inactive for Super Admin)
// @route   GET /api/admin/branches
// @access  Super Admin
const getAdminBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({}).sort({ name: 1 });
    res.json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new branch
// @route   POST /api/admin/branches
// @access  Super Admin
const createBranch = async (req, res, next) => {
  try {
    const body = readBody(req, res);
    if (!body) return;
    const { name, code } = body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required.',
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Branch code is required.',
      });
    }

    // Trim strings
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Prevent duplicate name
    const duplicateName = await Branch.findOne({ name: trimmedName });
    if (duplicateName) {
      return res.status(400).json({
        success: false,
        message: 'A branch with this name already exists.',
      });
    }

    // Prevent duplicate code
    const duplicateCode = await Branch.findOne({ code: trimmedCode });
    if (duplicateCode) {
      return res.status(400).json({
        success: false,
        message: 'A branch with this code already exists.',
      });
    }

    // isActive defaults to true per Branch model default
    const branch = await Branch.create({
      name: trimmedName,
      code: trimmedCode,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a branch
// @route   PUT /api/admin/branches/:id
// @access  Super Admin
const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;
    const { name, code } = body;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch ID format.',
      });
    }

    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found.',
      });
    }

    // Branch name is IMMUTABLE - only code may be edited
    // This preserves historical records that reference branch names as strings

    // Edit code only (name is immutable)
    if (code !== undefined) {
      const trimmedCode = code.trim().toUpperCase();
      // Prevent duplicate code (excluding current branch)
      const duplicateCode = await Branch.findOne({
        code: trimmedCode,
        _id: { $ne: branch._id },
      });
      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: 'A branch with this code already exists.',
        });
      }
      branch.code = trimmedCode;
    }

    // Name is NOT editable - immutable to preserve historical references
    // if (name !== undefined) { ... }

    await branch.save();

    res.json({
      success: true,
      message: 'Branch code updated successfully.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle branch status (activate/deactivate)
// @route   PATCH /api/admin/branches/:id/status
// @access  Super Admin
const toggleBranchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;
    const { isActive } = body;

    // Validate isActive is boolean
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.',
      });
    }

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch ID format.',
      });
    }

    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found.',
      });
    }

    // Toggle status
    branch.isActive = isActive;
    await branch.save();

    res.json({
      success: true,
      message: 'Branch status updated successfully.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Get all subjects (active + inactive for Super Admin)
// @route   GET /api/admin/subjects
// @access  Super Admin
const getAdminSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    res.json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new subject
// @route   POST /api/admin/subjects
// @access  Super Admin
const createSubject = async (req, res, next) => {
  try {
    const body = readBody(req, res);
    if (!body) return;
    const { name, programme } = body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required.',
      });
    }

    // Trim name
    const trimmedName = name.trim();

    // Prevent duplicate name (case-insensitive)
    const duplicate = await Subject.findOne({ name: new RegExp(`^${trimmedName}$`, 'i') });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A subject with this name already exists.',
      });
    }

    // isActive defaults to true per Subject model default
    // isDefault must NOT be accepted from client
    // createdBy is set to null for system-seeded, or we could set it to the Super Admin

    const subject = await Subject.create({
      name: trimmedName,
      programme: programme || 'NCUK IFY',
      isActive: true,
      isDefault: false,
      createdBy: null,
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a subject
// @route   PUT /api/admin/subjects/:id
// @access  Super Admin
const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;
    const { name, programme } = body;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format.',
      });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    // SUBJECT NAME IS IMMUTABLE - do not allow renaming
    // Only programme may be edited

    // Edit programme only (name is immutable)
    if (programme !== undefined) {
      const trimmedProg = programme.trim();
      subject.programme = trimmedProg || 'NCUK IFY';
    }

    // Name, isDefault, createdBy, isActive are NOT editable through this endpoint
    // Status has its own separate endpoint

    await subject.save();

    res.json({
      success: true,
      message: 'Subject code/name updated successfully.',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle subject status (activate/deactivate)
// @route   PATCH /api/admin/subjects/:id/status
// @access  Super Admin
const toggleSubjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = readBody(req, res);
    if (!body) return;
    const { isActive } = body;

    // Validate isActive is boolean
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.',
      });
    }

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format.',
      });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    // Toggle status
    subject.isActive = isActive;
    await subject.save();

    res.json({
      success: true,
      message: 'Subject status updated successfully.',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dashboard,
  getUsers,
  createUser,
  updateUser,
  updateStatus,
  resetPassword,
  getAdminBranches,
  createBranch,
  updateBranch,
  toggleBranchStatus,
  getAdminSubjects,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
};
