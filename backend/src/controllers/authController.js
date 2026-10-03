const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Self-service password change accepts exactly these two fields. Every other
// field is rejected instead of ignored, so this endpoint can never be used to
// smuggle an administrator-owned update alongside a password change.
const PASSWORD_CHANGE_FIELDS = ['currentPassword', 'newPassword'];

const MIN_NEW_PASSWORD_LENGTH = 6;
const MAX_NEW_PASSWORD_LENGTH = 128;

// The User pre-save hook hashes with 12 rounds. A self-service change must be
// exactly as strong as an administrator reset, and the pre-save hook is not
// available here because an already hashed password is written directly.
const BCRYPT_ROUNDS = 12;

const PASSWORD_BODY_MESSAGE = 'Request body must be a JSON object.';
const PASSWORD_FIELDS_MESSAGE = 'Only currentPassword and newPassword are accepted.';
const CURRENT_PASSWORD_TYPE_MESSAGE = 'Current password must be a string.';
const CURRENT_PASSWORD_REQUIRED_MESSAGE = 'Current password is required.';
const CURRENT_PASSWORD_MAX_MESSAGE = `Current password must be ${MAX_NEW_PASSWORD_LENGTH} characters or fewer.`;
const NEW_PASSWORD_TYPE_MESSAGE = 'New password must be a string.';
const NEW_PASSWORD_MIN_MESSAGE = `New password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`;
const NEW_PASSWORD_MAX_MESSAGE = `New password must be ${MAX_NEW_PASSWORD_LENGTH} characters or fewer.`;
const INCORRECT_CURRENT_PASSWORD_MESSAGE = 'Current password is incorrect.';
const REUSED_PASSWORD_MESSAGE = 'New password must be different from the current password.';
const CONCURRENT_PASSWORD_CHANGE_MESSAGE =
  'Password was changed in another session. Please sign in again.';
const PASSWORD_USER_NOT_FOUND_MESSAGE = 'User not found.';

// Self-service profile editing is deliberately tiny: a user owns their own
// display name and phone number and nothing else.
const PROFILE_EDITABLE_FIELDS = ['name', 'phone'];
const PROFILE_FIELD_LABELS = { name: 'Name', phone: 'Phone' };

// Assignment and permission fields are administrator-owned. Their mere presence
// in the body is a rejected request, so a crafted `branches: []` can never be
// used to strip assignments.
const ADMIN_ONLY_FIELDS = [
  'branches',
  'subjects',
  'managedBranch',
  'role',
  'isActive',
  'tokenVersion',
  'email',
];

const ADMIN_ONLY_MESSAGE =
  'Assignments and account permissions can only be changed by the System Administrator.';

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Block inactive users from logging in
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    const populatedUser = await User.findById(user._id)
      .select(User.SAFE_FIELDS)
      .populate('subjects');

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        ...populatedUser.toObject(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select(User.SAFE_FIELDS)
      .populate('subjects');

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update own profile (name and phone only)
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Reject administrator-owned fields before any write is attempted.
    for (const field of ADMIN_ONLY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return res.status(403).json({
          success: false,
          message: ADMIN_ONLY_MESSAGE,
        });
      }
    }

    const updates = {};

    for (const field of PROFILE_EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;

      if (typeof body[field] !== 'string') {
        return res.status(400).json({
          success: false,
          message: `${PROFILE_FIELD_LABELS[field]} must be a string.`,
        });
      }

      updates[field] = body[field].trim();
    }

    // A name that normalizes to nothing would fail the schema required check
    // with a confusing message, so it is rejected as a controlled 400 here.
    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    })
      .select(User.SAFE_FIELDS)
      .populate('subjects');

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change own password
// @route   PUT /api/auth/password
// @access  Private (any active authenticated role)
const changePassword = async (req, res, next) => {
  try {
    const body = req.body;

    // Only a JSON object carries named fields. A missing body, an explicit
    // null, an array, or a scalar is rejected before any field is inspected.
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: PASSWORD_BODY_MESSAGE,
      });
    }

    // Nothing is trimmed, lowercased, or length-checked before the key set is
    // known to be exactly the two accepted names.
    for (const field of Object.keys(body)) {
      if (!PASSWORD_CHANGE_FIELDS.includes(field)) {
        return res.status(400).json({
          success: false,
          message: PASSWORD_FIELDS_MESSAGE,
        });
      }
    }

    // Passwords are never trimmed: a leading or trailing space is part of the
    // secret, and the stored length is what the length rules describe. A
    // number, array, object, or null used where a string is expected is a
    // controlled 400, never a thrown TypeError.
    const { currentPassword, newPassword } = body;

    if (typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: CURRENT_PASSWORD_TYPE_MESSAGE,
      });
    }

    if (!currentPassword.length) {
      return res.status(400).json({
        success: false,
        message: CURRENT_PASSWORD_REQUIRED_MESSAGE,
      });
    }

    if (currentPassword.length > MAX_NEW_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: CURRENT_PASSWORD_MAX_MESSAGE,
      });
    }

    if (typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: NEW_PASSWORD_TYPE_MESSAGE,
      });
    }

    if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: NEW_PASSWORD_MIN_MESSAGE,
      });
    }

    if (newPassword.length > MAX_NEW_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: NEW_PASSWORD_MAX_MESSAGE,
      });
    }

    // The hash is required to verify the current password, so it is selected
    // explicitly. It is never read back into a response.
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: PASSWORD_USER_NOT_FOUND_MESSAGE,
      });
    }

    // A wrong current password is a controlled 400 and never a 401: the shared
    // Axios interceptor signs the session out on any 401, which would log out
    // a perfectly valid session over a single typo.
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: INCORRECT_CURRENT_PASSWORD_MESSAGE,
      });
    }

    // Reuse is rejected by comparing against the stored hash, not by comparing
    // the two submitted strings.
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        success: false,
        message: REUSED_PASSWORD_MESSAGE,
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      await bcrypt.genSalt(BCRYPT_ROUNDS)
    );

    // Mirrors the fallback in generateToken so the guard below always carries a
    // concrete version. Older documents can hydrate the schema default `0`
    // without physically storing the field, so version zero must match either
    // representation. The guard is never omitted: an unguarded write would let
    // a concurrent change be silently overwritten.
    const loadedTokenVersion = Number.isInteger(user.tokenVersion)
      ? user.tokenVersion
      : 0;
    const tokenVersionGuard =
      loadedTokenVersion === 0
        ? {
            $or: [
              { tokenVersion: 0 },
              { tokenVersion: { $exists: false } },
            ],
          }
        : { tokenVersion: loadedTokenVersion };

    // --- Single guarded atomic update ---
    // The tokenVersion in the filter is what makes this race-safe. Two
    // concurrent requests both read the same version, MongoDB matches it
    // atomically, so only one commits and bumps it; the loser matches nothing
    // and can never overwrite the winner's password. The already hashed value
    // is written directly, so the pre-save hook never runs and plaintext is
    // never stored. The unused legacy reset fields are cleared in the same
    // write.
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, ...tokenVersionGuard },
      {
        $set: {
          password: hashedPassword,
          tokenVersion: loadedTokenVersion + 1,
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpires: '',
        },
      },
      { new: true }
    )
      .select(User.SAFE_FIELDS)
      .populate('subjects');

    if (!updatedUser) {
      return res.status(409).json({
        success: false,
        message: CONCURRENT_PASSWORD_CHANGE_MESSAGE,
      });
    }

    // The replacement token carries the incremented tokenVersion, so this
    // session stays signed in while every previously issued token fails on its
    // next protected request.
    const token = generateToken(updatedUser);

    res.json({
      success: true,
      message: 'Password changed successfully.',
      data: {
        ...updatedUser.toObject(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, updateProfile, changePassword };
