const Subject = require('../models/Subject');

// @desc    Get all subjects (default + user's custom)
// @route   GET /api/subjects
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({
      isActive: true,
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom subject
// @route   POST /api/subjects
const createSubject = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required.',
      });
    }

    // Check if subject already exists
    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      $or: [{ isDefault: true }, { createdBy: req.user._id }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This subject already exists.',
      });
    }

    const subject = await Subject.create({
      name,
      programme: 'NCUK IFY',
      createdBy: req.user._id,
      isDefault: false,
      isActive: true,
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

module.exports = { getSubjects, createSubject };
