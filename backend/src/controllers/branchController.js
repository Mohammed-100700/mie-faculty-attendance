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

// @desc    Seed default branches
// @route   POST /api/branches/seed
const seedBranches = async (req, res, next) => {
  try {
    const defaultBranches = [
      { name: 'Dhanmondi', code: 'DHN' },
      { name: 'Uttara', code: 'UTT' },
    ];

    const results = [];
    for (const branch of defaultBranches) {
      const result = await Branch.findOneAndUpdate(
        { code: branch.code },
        { ...branch, isActive: true },
        { upsert: true, new: true }
      );
      results.push(result);
    }

    res.json({
      success: true,
      message: 'Branches seeded successfully.',
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBranches, seedBranches };
