const ClassLog = require('../models/ClassLog');

const calculateMonthlySalary = async (lecturerId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const logs = await ClassLog.find({
    lecturerId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: -1 });

  let totalClasses = 0;
  let totalPayableAmount = 0;
  const branchMap = {};

  for (const log of logs) {
    totalClasses += log.totalClasses;
    totalPayableAmount += log.payableAmount;

    for (const entry of log.entries) {
      if (!branchMap[entry.branch]) {
        branchMap[entry.branch] = { classes: 0, amount: 0 };
      }
      branchMap[entry.branch].classes += entry.classes;
      branchMap[entry.branch].amount += entry.classes * log.ratePerClassAtSubmission;
    }
  }

  return {
    totalClasses,
    totalPayableAmount,
    branchBreakdown: branchMap,
    detailedLogs: logs,
  };
};

const getDashboardSummary = async (lecturerId) => {
  const now = new Date();
  return await calculateMonthlySalary(lecturerId, now.getMonth() + 1, now.getFullYear());
};

module.exports = { calculateMonthlySalary, getDashboardSummary };
