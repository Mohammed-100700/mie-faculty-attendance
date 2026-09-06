const User = require('../models/User');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');

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
      .select('-password -resetPasswordToken -resetPasswordExpires')
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
    const { name, email, phone, password, role, branches, subjects, managedBranch } =
      req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.',
      });
    }

    // Reject Super Admin creation
    if (role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot create another Super Admin account.',
      });
    }

    // Validate role is one of the normal roles
    const validRoles = ['Lecturer', 'Academic Manager', 'Executive Office'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Lecturer, Academic Manager, or Executive Office.',
      });
    }

    // Check duplicate email (following existing auth behavior)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // Build user data - let pre-save hook hash the password
    const userData = {
      name,
      email,
      password,
      role,
    };

    // Role-specific assignments following schema conventions
    if (role === 'Lecturer') {
      userData.branches = branches || [];
      userData.subjects = subjects || [];
      userData.managedBranch = null;
    } else if (role === 'Academic Manager') {
      userData.managedBranch = managedBranch || null;
      // Should not retain irrelevant Lecturer assignment data
      userData.branches = [];
      userData.subjects = [];
    } else if (role === 'Executive Office') {
      userData.managedBranch = null;
      // no lecturer assignments
    }

    const user = await User.create(userData);

    // Exclude sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: userResponse,
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
    const {
      name,
      email,
      phone,
      role,
      branches,
      subjects,
      managedBranch,
    } = req.body;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
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

    // Protect: cannot edit Super Admin through this endpoint
    if (user.role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit a Super Admin account through this endpoint.',
      });
    }

    // Editable fields
    if (name !== undefined) user.name = name;

    if (email !== undefined) {
      // Check duplicate email (excluding current user)
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists.',
        });
      }
      user.email = email;
    }

    if (phone !== undefined) user.phone = phone;

    // Role change handling
    if (role !== undefined) {
      // Cannot set role to Super Admin
      if (role === 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot change role to Super Admin.',
        });
      }

      const validRoles = ['Lecturer', 'Academic Manager', 'Executive Office'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role.',
        });
      }

      user.role = role;

      // Sanitize irrelevant assignment fields based on new role
      if (role === 'Lecturer') {
        user.branches = branches || [];
        user.subjects = subjects || [];
        user.managedBranch = null;
      } else if (role === 'Academic Manager') {
        user.managedBranch = managedBranch || null;
        user.branches = [];
        user.subjects = [];
      } else if (role === 'Executive Office') {
        user.managedBranch = null;
        user.branches = [];
        user.subjects = [];
      }
    }

    const updatedUser = await user.save();

    // Exclude sensitive fields from response
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: userResponse,
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
    const { isActive } = req.body;

    // Validate isActive is actually Boolean
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
    if (user.role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change status of a Super Admin account.',
      });
    }

    user.isActive = isActive;
    await user.save();

    // Exclude sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.json({
      success: true,
      message: 'User status updated successfully.',
      data: userResponse,
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
    const { temporaryPassword } = req.body;

    // Validate temporary password against requirements (min 6 chars)
    if (!temporaryPassword || temporaryPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Temporary password must be at least 6 characters.',
      });
    }

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
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
    if (user.role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot reset password of a Super Admin account.',
      });
    }

    // Set temporary password - pre-save hook will hash it automatically
    user.password = temporaryPassword;
    await user.save(); // pre-save hook runs bcrypt hash

    // Exclude sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.json({
      success: true,
      message: 'User password reset successfully.',
      data: userResponse,
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
};