import { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';

const autoTable = autoTableModule?.default || autoTableModule;

const displayValue = (value, fallback = '—') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const sanitizeFilename = (value, fallback = 'student') => {
  const safe = String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || fallback;
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
    sanitizeFilename(filter.year, 'All-Years'),
    sanitizeFilename(filter.batch, 'All-Batches'),
    sanitizeFilename(filter.branch, 'All-Branches'),
    sanitizeFilename(filter.subject, 'All-Subjects'),
    'Attendance-Report.pdf',
  ].join('-');
  doc.save(filename);
}

const PRESENT_MARK = 'P';
const ABSENT_MARK = 'A';
const MISSING_MARK = '—';

const classLecturerName = (lecturer) => {
  const name = getLecturerName(lecturer);
  return name === '—' ? 'Unknown lecturer' : name;
};

const sortClassStudents = (rows) =>
  [...(rows || [])].sort((a, b) =>
    String(a.studentName || '').localeCompare(String(b.studentName || ''))
    || String(a.studentRef || '').localeCompare(String(b.studentRef || ''))
  );

const sessionTime = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const buildClassSessions = (rows) => {
  const sessions = new Map();

  rows.forEach((row) => {
    (row.history || []).forEach((entry) => {
      const sessionId = String(entry.sessionId === undefined || entry.sessionId === null ? '' : entry.sessionId);
      if (!sessionId || sessions.has(sessionId)) return;
      sessions.set(sessionId, {
        sessionId,
        time: sessionTime(entry.sessionDate),
        dateLabel: formatDate(entry.sessionDate),
      });
    });
  });

  const ordered = Array.from(sessions.values()).sort((a, b) =>
    a.time - b.time
    || a.dateLabel.localeCompare(b.dateLabel)
    || a.sessionId.localeCompare(b.sessionId)
  );

  const totalsByDate = {};
  ordered.forEach((session) => {
    totalsByDate[session.dateLabel] = (totalsByDate[session.dateLabel] || 0) + 1;
  });

  const usedByDate = {};
  return ordered.map((session) => {
    if (totalsByDate[session.dateLabel] === 1) {
      return { ...session, label: session.dateLabel };
    }
    usedByDate[session.dateLabel] = (usedByDate[session.dateLabel] || 0) + 1;
    return { ...session, label: `${session.dateLabel} #${usedByDate[session.dateLabel]}` };
  });
};

const sessionStatusMarks = (row, sessions) => {
  const markBySession = new Map((row.history || []).map((entry) => [
    String(entry.sessionId === undefined || entry.sessionId === null ? '' : entry.sessionId),
    entry.status === 'present' ? PRESENT_MARK : ABSENT_MARK,
  ]));
  return sessions.map((session) => markBySession.get(session.sessionId) || MISSING_MARK);
};

export function exportClassAttendancePdf({ lecturer, attendanceClass, classStudents } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - (margin * 2);
  const context = attendanceClass || {};
  const rows = sortClassStudents(classStudents);
  const sessions = buildClassSessions(rows);
  const lecturerLabel = classLecturerName(lecturer);
  const year = displayValue(context.year, 'Unspecified');
  const batch = displayValue(context.batch);
  const branch = displayValue(context.branch);
  const subject = displayValue(context.subject);

  const totalEligible = rows.reduce((sum, row) => sum + (Number(row.eligibleSessions) || 0), 0);
  const totalPresent = rows.reduce((sum, row) => sum + (Number(row.presentCount) || 0), 0);
  const totalAbsent = rows.reduce((sum, row) => sum + (Number(row.absentCount) || 0), 0);
  const averageAttendance = rows.length
    ? rows.reduce((sum, row) => sum + (Number(row.attendancePercentage) || 0), 0) / rows.length
    : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('MIE Pathways', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('CLASS ATTENDANCE REPORT', pageWidth / 2, 24, { align: 'center' });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  const metadata = [
    ['Lecturer', lecturerLabel, 'Academic Year', year],
    ['Batch', batch, 'Branch', branch],
    ['Subject', subject, 'Generated', new Date().toLocaleDateString('en-GB')],
  ];
  const leftLabelX = margin + 4;
  const leftValueX = margin + 34;
  const rightLabelX = margin + (usableWidth / 2) + 4;
  const rightValueX = rightLabelX + 29;
  const infoTop = 36;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 225, 232);
  doc.roundedRect(margin, infoTop, usableWidth, 32, 2, 2, 'FD');
  metadata.forEach((row, index) => {
    const y = infoTop + 9 + (index * 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text(row[0], leftLabelX, y);
    doc.text(row[2], rightLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(doc.splitTextToSize(row[1], 55)[0], leftValueX, y);
    doc.text(doc.splitTextToSize(row[3], 55)[0], rightValueX, y);
  });

  const summaryTop = 75;
  const summaryGap = 3;
  const summaryBoxWidth = (usableWidth - (summaryGap * 4)) / 5;
  const summary = [
    ['SESSIONS', sessions.length],
    ['STUDENTS', rows.length],
    ['PRESENT', totalPresent],
    ['ABSENT', totalAbsent],
    ['AVG ATTENDANCE', `${percentage(averageAttendance)}%`],
  ];
  summary.forEach(([label, value], index) => {
    const x = margin + (index * (summaryBoxWidth + summaryGap));
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 225, 232);
    doc.roundedRect(x, summaryTop, summaryBoxWidth, 20, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text(label, x + (summaryBoxWidth / 2), summaryTop + 6, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), x + (summaryBoxWidth / 2), summaryTop + 15, { align: 'center' });
  });

  const tableMargin = { left: margin, right: margin, bottom: 18 };
  const tableStyles = {
    fontSize: 7,
    cellPadding: 1.5,
    valign: 'middle',
    textColor: [40, 40, 40],
    lineColor: [225, 228, 234],
    lineWidth: 0.1,
    overflow: 'linebreak',
  };
  const headStyles = {
    fillColor: [37, 99, 235],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 6.5,
    cellPadding: 1.5,
  };

  const drawHeading = (text, requestedY, subtitle) => {
    let y = requestedY;
    if (y > pageHeight - 45) {
      doc.addPage();
      y = margin + 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(text, margin, y);
    y += 4;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(110, 120, 135);
      doc.text(subtitle, margin, y);
      y += 4;
    }
    return y;
  };

  let cursorY = 105;

  if (rows.length === 0) {
    cursorY = drawHeading('STUDENT SUMMARY', cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('No students recorded for this class.', margin, cursorY + 4);
  } else {
    cursorY = drawHeading('STUDENT SUMMARY', cursorY);

    const summaryBody = rows.map((row) => [
      displayValue(row.ncukId),
      displayValue(row.studentName, 'Unknown student'),
      String(Number(row.eligibleSessions) || 0),
      String(Number(row.presentCount) || 0),
      String(Number(row.absentCount) || 0),
      `${percentage(row.attendancePercentage)}%`,
    ]);
    const summaryFoot = [[
      'Class totals',
      `${rows.length} student${rows.length === 1 ? '' : 's'}`,
      String(totalEligible),
      String(totalPresent),
      String(totalAbsent),
      `${percentage(averageAttendance)}%`,
    ]];

    autoTable(doc, {
      startY: cursorY,
      margin: tableMargin,
      head: [['NCUK ID', 'Student', 'Eligible', 'Present', 'Absent', 'Attendance']],
      body: summaryBody,
      foot: summaryFoot,
      tableWidth: usableWidth,
      theme: 'striped',
      showHead: 'everyPage',
      showFoot: 'everyPage',
      headStyles,
      footStyles: {
        fillColor: [239, 246, 255],
        textColor: [30, 64, 175],
        fontStyle: 'bold',
        fontSize: 6.5,
        cellPadding: 1.5,
      },
      styles: tableStyles,
      columnStyles: {
        0: { cellWidth: 26, fontSize: 6.5 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
    });

    cursorY = doc.lastAutoTable.finalY + 8;

    const registerStartY = drawHeading(
      'ATTENDANCE REGISTER',
      cursorY,
      'P = Present   |   A = Absent   |   Sessions are listed oldest first'
    );

    const registerHead = ['NCUK ID', 'Student', ...sessions.map((session) => session.label)];
    const registerBody = rows.map((row) => [
      displayValue(row.ncukId),
      displayValue(row.studentName, 'Unknown student'),
      ...sessionStatusMarks(row, sessions),
    ]);

    autoTable(doc, {
      startY: registerStartY,
      margin: tableMargin,
      head: [registerHead],
      body: registerBody,
      tableWidth: 'auto',
      theme: 'grid',
      showHead: 'everyPage',
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1],
      headStyles,
      styles: tableStyles,
      columnStyles: {
        0: { fontSize: 6.5 },
        1: { fontSize: 6.5 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index < 2) return;
        data.cell.styles.halign = 'center';
        data.cell.styles.fontStyle = 'bold';
        if (data.cell.raw === PRESENT_MARK) {
          data.cell.styles.textColor = [21, 128, 61];
        } else if (data.cell.raw === ABSENT_MARK) {
          data.cell.styles.textColor = [185, 28, 28];
        } else {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.textColor = [150, 150, 150];
        }
      },
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 225, 232);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('MIE Pathways | Class Attendance Report', margin, pageHeight - 8);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const filename = [
    'MIE',
    sanitizeFilename(year, 'Unspecified-Year'),
    sanitizeFilename(batch, 'All-Batches'),
    sanitizeFilename(branch, 'All-Branches'),
    sanitizeFilename(subject, 'All-Subjects'),
    'Class-Attendance.pdf',
  ].join('-');
  doc.save(filename);
}
