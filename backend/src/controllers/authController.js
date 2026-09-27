const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

module.exports = { login, getMe, updateProfile };
