import { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';

const autoTable = autoTableModule?.default || autoTableModule;

const displayValue = (value, fallback = '—') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const sanitizeFilename = (value) => {
  const safe = String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || 'student';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const getLecturerName = (lecturer) => {
  if (typeof lecturer === 'string') return displayValue(lecturer);
  return displayValue(lecturer?.name);
};

const percentage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '0.0';
};

export function exportStudentAttendancePdf(student, filter = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - (margin * 2);
  const history = Array.isArray(student.history) ? student.history : [];
  const studentName = displayValue(student.studentName, 'Unknown student');
  const mieStudentId = displayValue(student.mieStudentId);
  const ncukId = displayValue(student.ncukId);
  const eligibleSessions = Number(student.eligibleSessions) || 0;
  const presentCount = Number(student.presentCount) || 0;
  const absentCount = Number(student.absentCount) || 0;
  const attendancePercentage = percentage(student.attendancePercentage);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('MIE Pathways', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('STUDENT ATTENDANCE REPORT', pageWidth / 2, 24, { align: 'center' });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  const metadata = [
    ['Student Name', studentName, 'Academic Year', displayValue(filter.year, 'All Years')],
    ['MIE ID', mieStudentId, 'Batch', displayValue(filter.batch, 'All Batches')],
    ['NCUK ID', ncukId, 'Branch', displayValue(filter.branch, 'All Branches')],
    ['Generated', new Date().toLocaleDateString('en-GB'), 'Subject', displayValue(filter.subject, 'All Subjects')],
  ];
  const leftLabelX = margin + 4;
  const leftValueX = margin + 34;
  const rightLabelX = margin + (usableWidth / 2) + 4;
  const rightValueX = rightLabelX + 29;
  const infoTop = 36;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 225, 232);
  doc.roundedRect(margin, infoTop, usableWidth, 38, 2, 2, 'FD');
  metadata.forEach((row, index) => {
    const y = infoTop + 8 + (index * 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text(row[0], leftLabelX, y);
    doc.text(row[2], rightLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(doc.splitTextToSize(row[1], 50)[0], leftValueX, y);
    doc.text(doc.splitTextToSize(row[3], 50)[0], rightValueX, y);
  });

  const summaryTop = 81;
  const gap = 3;
  const boxWidth = (usableWidth - (gap * 3)) / 4;
  const summary = [
    ['ELIGIBLE', eligibleSessions],
    ['PRESENT', presentCount],
    ['ABSENT', absentCount],
    ['ATTENDANCE', `${attendancePercentage}%`],
  ];
  summary.forEach(([label, value], index) => {
    const x = margin + (index * (boxWidth + gap));
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 225, 232);
    doc.roundedRect(x, summaryTop, boxWidth, 20, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text(label, x + (boxWidth / 2), summaryTop + 6, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), x + (boxWidth / 2), summaryTop + 15, { align: 'center' });
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('ATTENDANCE HISTORY', margin, 111);

  const tableRows = history.map((entry) => [
    formatDate(entry.sessionDate),
    displayValue(entry.year, 'Unspecified'),
    displayValue(entry.batch),
    displayValue(entry.branch),
    displayValue(entry.subject),
    getLecturerName(entry.lecturer),
    entry.status === 'present' ? 'Present' : 'Absent',
  ]);

  autoTable(doc, {
    startY: 115,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [['Date', 'Year', 'Batch', 'Branch', 'Subject', 'Lecturer', 'Status']],
    body: tableRows,
    tableWidth: usableWidth,
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      cellPadding: 1.5,
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      valign: 'middle',
      textColor: [40, 40, 40],
      lineColor: [225, 228, 234],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: {
      6: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 6) return;
      data.cell.styles.fontStyle = 'bold';
      data.cell.styles.textColor = data.cell.raw === 'Present'
        ? [21, 128, 61]
        : [185, 28, 28];
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 225, 232);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('MIE Pathways | Student Attendance Report', margin, pageHeight - 8);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const filename = [
    'MIE',
    sanitizeFilename(studentName),
    sanitizeFilename(filter.year || 'All-Years'),
    'Attendance-Report.pdf',
  ].join('-');
  doc.save(filename);
}
