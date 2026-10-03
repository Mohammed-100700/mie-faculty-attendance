const Branch = require('../models/Branch');

// @desc    Get all branches
// @route   GET /api/branches
const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBranches };
