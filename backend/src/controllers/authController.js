const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

    const token = generateToken(user._id);

    const populatedUser = await User.findById(user._id).populate('subjects');

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        _id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        phone: populatedUser.phone,
        role: populatedUser.role,
        branches: populatedUser.branches,
        subjects: populatedUser.subjects,
        managedBranch: populatedUser.managedBranch,
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
    const user = await User.findById(req.user._id).populate('subjects');
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'branches', 'subjects'];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).populate('subjects');

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — generate a 6-digit reset PIN
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset PIN has been generated.',
      });
    }

    // Generate a random 6-digit PIN
    const crypto = require('crypto');
    const pin = crypto.randomInt(100000, 999999).toString();

    user.resetPasswordToken = pin;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Return the PIN directly in the response (no email needed)
    return res.json({
      success: true,
      message: 'Reset PIN generated. Use it within 15 minutes.',
      pin, // 6-digit PIN displayed on screen
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using PIN
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, pin, newPassword } = req.body;

    if (!email || !pin || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, PIN, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired PIN.' });
    }

    // Check PIN match and expiry
    if (user.resetPasswordToken !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired PIN.' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'PIN has expired. Please request a new one.' });
    }

    // Reset password and clear the token
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const token = generateToken(user._id);
    const populatedUser = await User.findById(user._id).populate('subjects');

    return res.json({
      success: true,
      message: 'Password reset successful.',
      data: {
        _id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        branches: populatedUser.branches,
        subjects: populatedUser.subjects,
        managedBranch: populatedUser.managedBranch,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, updateProfile, forgotPassword, resetPassword };
