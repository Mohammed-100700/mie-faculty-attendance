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

    // Set temporary password and invalidate every previously issued token
    // - pre-save hook will hash the password
    user.password = temporaryPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
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
    const { name, code } = req.body;

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
    const { name, code } = req.body;

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
    const { isActive } = req.body;

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
    const { name, programme } = req.body;

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
    const { name, programme } = req.body;

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
    const { isActive } = req.body;

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