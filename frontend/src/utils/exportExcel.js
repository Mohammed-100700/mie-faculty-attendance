import * as XLSX from 'xlsx';
import { formatDate, getMonthName } from './formatCurrency';

function buildRows(logs, managedBranch) {
  const rows = [];
  logs.forEach((log) => {
    log.entries?.forEach((entry) => {
      if (managedBranch && entry.branch !== managedBranch) return;
      rows.push([
        formatDate(log.date),
        entry.branch,
        entry.classes,
        entry.approvalStatus,
        log.remarks || entry.rejectionReason || '',
      ]);
    });
  });
  return rows;
}

function buildManagerRows(logs, managedBranch) {
  const rows = [];
  logs.forEach((log) => {
    log.entries?.forEach((entry) => {
      if (managedBranch && entry.branch !== managedBranch) return;
      rows.push([
        formatDate(log.date),
        log.lecturerId?.name || '',
        log.lecturerId?.email || '',
        entry.branch,
        entry.classes,
        entry.approvalStatus,
        log.remarks || entry.rejectionReason || '',
      ]);
    });
  });
  return rows;
}

export function exportLecturerExcel(logs, month, year) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  let totalClasses = 0;
  let approved = 0, rejected = 0, pending = 0;
  logs.forEach((log) => {
    log.entries?.forEach((e) => {
      totalClasses += e.classes;
      if (e.approvalStatus === 'Approved') approved++;
      else if (e.approvalStatus === 'Rejected') rejected++;
      else pending++;
    });
  });

  const summaryData = [
    ['MIE Faculty Attendance Report'],
    [],
    ['Period', `${getMonthName(parseInt(month))} ${year}`],
    ['Generated', new Date().toLocaleDateString('en-GB')],
    [],
    ['Summary'],
    ['Total Entries', logs.reduce((c, l) => c + (l.entries?.length || 0), 0)],
    ['Total Classes', totalClasses],
    ['Approved', approved],
    ['Pending', pending],
    ['Rejected', rejected],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Detail sheet
  const rows = buildRows(logs);
  const detailData = [['Date', 'Branch', 'Classes', 'Status', 'Remarks'], ...rows];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Attendance');

  XLSX.writeFile(wb, `attendance-report-${month}-${year}.xlsx`);
}

export function exportManagerExcel(logs, month, year, managedBranch, lecturerName) {
  const wb = XLSX.utils.book_new();
  const isLecturerSpecific = !!lecturerName;

  // Summary sheet
  let totalClasses = 0;
  let approved = 0, rejected = 0, pending = 0;
  logs.forEach((log) => {
    log.entries?.forEach((e) => {
      if (managedBranch && e.branch !== managedBranch) return;
      totalClasses += e.classes;
      if (e.approvalStatus === 'Approved') approved++;
      else if (e.approvalStatus === 'Rejected') rejected++;
      else pending++;
    });
  });

  const summaryData = [
    ['MIE Attendance Report'],
    [],
    isLecturerSpecific ? ['Lecturer', lecturerName] : ['Branch', managedBranch || 'All'],
    ['Period', `${getMonthName(parseInt(month))} ${year}`],
    ['Generated', new Date().toLocaleDateString('en-GB')],
    [],
    ['Summary'],
    ['Total Entries', logs.reduce((c, l) => c + (l.entries?.filter((e) => !managedBranch || e.branch === managedBranch).length || 0), 0)],
    ['Total Classes', totalClasses],
    ['Approved', approved],
    ['Pending', pending],
    ['Rejected', rejected],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Detail sheet — omit Lecturer/Email columns when exporting for a specific lecturer
  const rows = isLecturerSpecific ? buildRows(logs, managedBranch) : buildManagerRows(logs, managedBranch);
  const head = isLecturerSpecific
    ? [['Date', 'Branch', 'Classes', 'Status', 'Remarks']]
    : [['Date', 'Lecturer', 'Email', 'Branch', 'Classes', 'Status', 'Remarks']];
  const detailData = [head, ...rows];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = isLecturerSpecific
    ? [{ wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }]
    : [{ wch: 14 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Attendance');

  const filePrefix = isLecturerSpecific ? `attendance-report-${lecturerName.replace(/\s+/g, '-')}` : `attendance-report-${managedBranch || 'all'}`;
  XLSX.writeFile(wb, `${filePrefix}-${month}-${year}.xlsx`);
}
