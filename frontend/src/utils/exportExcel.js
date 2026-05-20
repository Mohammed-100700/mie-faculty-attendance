import * as XLSX from 'xlsx';
import { formatBDT, formatDate, getMonthName } from './formatCurrency';

export const exportSalaryReportExcel = (reportData) => {
  const { lecturer, month, year, ratePerClass, totalClasses, totalPayableAmount, branchBreakdown, detailedLogs } = reportData;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['MIE Faculty Attendance - Monthly Salary Report'],
    [],
    ['Lecturer', lecturer.name],
    ['Email', lecturer.email],
    ['Period', `${getMonthName(month)} ${year}`],
    ['Rate per Class', ratePerClass],
    [],
    ['Metric', 'Value'],
    ['Total Classes', totalClasses],
    ['Total Payable Amount', totalPayableAmount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Branch Breakdown
  const branchData = [['Branch', 'Classes', 'Amount']];
  for (const [branch, data] of Object.entries(branchBreakdown)) {
    branchData.push([branch, data.classes, data.amount]);
  }
  const wsBranch = XLSX.utils.aoa_to_sheet(branchData);
  wsBranch['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsBranch, 'Branch Breakdown');

  // Sheet 3: Detailed Logs
  const logData = [['Date', 'Branches', 'Classes', 'Amount']];
  for (const log of detailedLogs) {
    logData.push([
      formatDate(log.date),
      log.entries?.map((e) => `${e.branch}: ${e.classes}`).join(', '),
      log.totalClasses,
      log.payableAmount,
    ]);
  }
  const wsLogs = XLSX.utils.aoa_to_sheet(logData);
  wsLogs['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Detailed Logs');

  XLSX.writeFile(wb, `Salary_Report_${getMonthName(month)}_${year}.xlsx`);
};
