const User = require('../models/User');
const { calculateMonthlySalary, getDashboardSummary } = require('../services/salaryService');

const getMonthlyReport = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const lecturer = await User.findById(req.user._id);
    const salaryData = await calculateMonthlySalary(req.user._id, month, year);

    res.json({
      success: true,
      data: {
        lecturer: { name: lecturer.name, email: lecturer.email },
        month,
        year,
        ratePerClass: lecturer.ratePerClass,
        ...salaryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const lecturer = await User.findById(req.user._id);
    const summary = await getDashboardSummary(req.user._id);

    res.json({
      success: true,
      data: {
        ratePerClass: lecturer.ratePerClass,
        ...summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMonthlyReport, getSummary };
