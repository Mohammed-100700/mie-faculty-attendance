const ClassLog = require('../models/ClassLog');

// @desc    Create a new class log
// @route   POST /api/class-logs
const createClassLog = async (req, res, next) => {
  try {
    const { date, entries, remarks } = req.body;

    const totalClasses = entries.reduce((sum, e) => sum + parseInt(e.classes), 0);

    const classLog = await ClassLog.create({
      lecturerId: req.user._id,
      date: new Date(date),
      entries,
      totalClasses,
      remarks: remarks || '',
    });

    res.status(201).json({
      success: true,
      message: 'Class log submitted successfully.',
      data: classLog,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all class logs for current lecturer
// @route   GET /api/class-logs/my
const getMyClassLogs = async (req, res, next) => {
  try {
    const { month, year, branch } = req.query;
    const filter = { lecturerId: req.user._id };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (branch) filter['entries.branch'] = branch;

    const logs = await ClassLog.find(filter)
      .populate('entries.approvedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single class log
// @route   GET /api/class-logs/:id
const getClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    }).populate('entries.approvedBy', 'name');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a class log
// @route   PUT /api/class-logs/:id
const updateClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    const { date, entries, remarks } = req.body;

    if (date) log.date = new Date(date);

    if (entries) {
      log.entries = entries;
      log.totalClasses = entries.reduce((sum, e) => sum + parseInt(e.classes), 0);
      // Reset ALL entries' approval to Pending — AMs must re-approve
      log.entries.forEach((e) => {
        e.approvalStatus = 'Pending';
        e.approvedBy = null;
        e.approvedAt = null;
        e.rejectionReason = '';
      });
    }

    if (remarks !== undefined) log.remarks = remarks;

    await log.save();
    await log.populate('entries.approvedBy', 'name');

    res.json({
      success: true,
      message: 'Class log updated successfully.',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a class log
// @route   DELETE /api/class-logs/:id
const deleteClassLog = async (req, res, next) => {
  try {
    const log = await ClassLog.findOne({
      _id: req.params.id,
      lecturerId: req.user._id,
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Class log not found.' });
    }

    await ClassLog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class log deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClassLog,
  getMyClassLogs,
  getClassLog,
  updateClassLog,
  deleteClassLog,
};
