import { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';
import { formatDate, getMonthName } from './formatCurrency';

const autoTable = autoTableModule?.default || autoTableModule;

const statusColors = {
  Pending: [251, 191, 36],   // amber
  Approved: [34, 197, 94],   // green
  Rejected: [239, 68, 68],   // red
};

const normalizeBranchFilter = (value) => {
  const branch = String(value || '').trim();
  return branch && branch.toLowerCase() !== 'all' ? branch : '';
};

const sanitizeFilename = (value, fallback = 'report') => {
  const safe = String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || fallback;
};

function buildRows(logs, managedBranch) {
  const branchFilter = normalizeBranchFilter(managedBranch);
  const rows = [];
  logs.forEach((log) => {
    const d = new Date(log.date);
    log.entries?.forEach((entry) => {
      if (branchFilter && entry.branch !== branchFilter) return;
      rows.push([
        formatDate(log.date),
        entry.branch,
        String(entry.classes ?? 0),
        entry.approvalStatus,
        log.remarks || (entry.rejectionReason ? entry.rejectionReason : '—'),
      ]);
    });
  });
  return rows;
}

function buildManagerRows(logs, managedBranch) {
  const branchFilter = normalizeBranchFilter(managedBranch);
  const rows = [];
  logs.forEach((log) => {
    log.entries?.forEach((entry) => {
      if (branchFilter && entry.branch !== branchFilter) return;
      rows.push([
        formatDate(log.date),
        log.lecturerId?.name || '—',
        entry.branch,
        String(entry.classes ?? 0),
        entry.approvalStatus,
        log.remarks || (entry.rejectionReason ? entry.rejectionReason : '—'),
      ]);
    });
  });
  return rows;
}

function countStats(logs, managedBranch) {
  const branchFilter = normalizeBranchFilter(managedBranch);
  let totalClasses = 0;
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  logs.forEach((log) => {
    log.entries?.forEach((entry) => {
      if (branchFilter && entry.branch !== branchFilter) return;
      totalClasses += entry.classes;
      if (entry.approvalStatus === 'Approved') approved++;
      else if (entry.approvalStatus === 'Rejected') rejected++;
      else pending++;
    });
  });
  return { totalClasses, approved, rejected, pending };
}

export function exportLecturerPdf(logs, month, year, userName) {
  const doc = new jsPDF();
  const rows = buildRows(logs);
  const stats = countStats(logs);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('MIE Faculty Attendance Report', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Lecturer: ${userName || '—'}`, 14, 30);
  doc.text(`Period: ${getMonthName(parseInt(month))} ${year}`, 14, 37);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 44);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Total Entries: ${rows.length}  |  Total Classes: ${stats.totalClasses}  |  Approved: ${stats.approved}  |  Pending: ${stats.pending}  |  Rejected: ${stats.rejected}`,
    14,
    53,
  );

  // Table
  autoTable(doc, {
    startY: 58,
    head: [['Date', 'Branch', 'Classes', 'Status', 'Remarks']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 25 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
    },
    willDrawCell: (data) => {
      if (data.column.index === 3 && data.row.section === 'body') {
        const status = data.cell.raw;
        const color = statusColors[status];
        if (color) {
          doc.setTextColor(...color);
          doc.setFont(undefined, 'bold');
        }
      }
    },
    didDrawCell: (data) => {
      if (data.column.index === 3 && data.row.section === 'body') {
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
      }
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`MIE Faculty Attendance System  |  Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`attendance-report-${month}-${year}.pdf`);
}

export function exportManagerPdf(logs, month, year, managedBranch, lecturerName) {
  const doc = new jsPDF();
  const isLecturerSpecific = !!lecturerName;
  const branchFilter = normalizeBranchFilter(managedBranch);
  const branchLabel = branchFilter || 'All Branches';
  const rows = isLecturerSpecific ? buildRows(logs, branchFilter) : buildManagerRows(logs, branchFilter);
  const stats = countStats(logs, branchFilter);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('MIE Attendance Report', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(0);
  if (isLecturerSpecific) {
    doc.text(`Lecturer: ${lecturerName}`, 14, 30);
    doc.text(`Branch: ${branchLabel}`, 14, 37);
  } else {
    doc.text(`Branch scope: ${branchLabel}`, 14, 30);
  }
  doc.text(`Period: ${getMonthName(parseInt(month))} ${year}`, 14, 44);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 51);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Total Entries: ${rows.length}  |  Total Classes: ${stats.totalClasses}  |  Approved: ${stats.approved}  |  Pending: ${stats.pending}  |  Rejected: ${stats.rejected}`,
    14,
    60,
  );

  // Table — omit Lecturer column when exporting for a specific lecturer
  const head = isLecturerSpecific
    ? [['Date', 'Branch', 'Classes', 'Status', 'Remarks']]
    : [['Date', 'Lecturer', 'Branch', 'Classes', 'Status', 'Remarks']];
  const statusColIndex = isLecturerSpecific ? 3 : 4;

  autoTable(doc, {
    startY: 65,
    head,
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: isLecturerSpecific
      ? {
          0: { cellWidth: 28 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
        }
      : {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
        },
    willDrawCell: (data) => {
      if (data.column.index === statusColIndex && data.row.section === 'body') {
        const status = data.cell.raw;
        const color = statusColors[status];
        if (color) {
          doc.setTextColor(...color);
          doc.setFont(undefined, 'bold');
        }
      }
    },
    didDrawCell: (data) => {
      if (data.column.index === statusColIndex && data.row.section === 'body') {
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
      }
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`MIE Faculty Attendance System | ${branchLabel} | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  const fileScope = isLecturerSpecific ? lecturerName : branchLabel;
  const filePrefix = `attendance-report-${sanitizeFilename(fileScope)}`;
  doc.save(`${filePrefix}-${month}-${year}.pdf`);
}
