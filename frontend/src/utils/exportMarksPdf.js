import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function sanitizeFilename(value) {
  return String(value).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Helper: render individual report header + student info.
// Returns the Y position after the header area so callers can position content below it.
function renderIndividualHeader(doc, PAGE_MARGIN, PAGE_WIDTH, student, subject, year, branch, batch, lecturer, assessments) {
  const usableWidth = PAGE_WIDTH - 2 * PAGE_MARGIN;

  const studentName = student.name || '—';
  const ncukId = student.ncukId || '';
  const today = new Date();

  // Build assessment data for this student
  const studentMarks = student.marks || [];

  // Create a map of colIndex -> mark value for quick lookup
  const markMap = {};
  studentMarks.forEach((m) => {
    markMap[m.colIndex] =
      m.value !== undefined && m.value !== null ? String(m.value) : '';
  });

  // Calculate valid assessments (those with marks entered) and their max marks
  const validAssessments = [];
  let totalObtained = 0;
  let totalMaximum = 0;

  assessments.forEach((test) => {
    const markValue = markMap[test.colIndex];
    const maxMarks = test.maxMarks || 0;

    if (markValue !== '' && markValue !== undefined && markValue !== '—') {
      const obtained = parseFloat(markValue);
      if (!isNaN(obtained)) {
        validAssessments.push({
          name: test.name,
          maxMarks,
          obtained,
        });
        totalObtained += obtained;
        totalMaximum += maxMarks;
      }
    }
  });

  const overallPercentage = totalMaximum > 0
    ? ((totalObtained / totalMaximum) * 100).toFixed(1)
    : '—';

  // ---- HEADER ----
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'MIE Pathways',
    PAGE_MARGIN + usableWidth / 2,
    18,
    { align: 'center' }
  );

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'ACADEMIC PROGRESS REPORT',
    PAGE_MARGIN + usableWidth / 2,
    28,
    { align: 'center' }
  );

  // Thin blue rule
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, 33, PAGE_WIDTH - PAGE_MARGIN, 33);

  // Module line
  const module = subject || '—';
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Module: ${module}`, PAGE_MARGIN + usableWidth / 2, 41, { align: 'center' });

  // ---- STUDENT INFORMATION BOX ----
  const boxY = 47;
  const boxH = 38;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(210, 218, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, boxY, usableWidth, boxH, 2, 2, 'FD');

  const leftX = PAGE_MARGIN + 4;
  const rightX = PAGE_MARGIN + usableWidth / 2 + 4;
  const labelColor = [120, 130, 145];
  const valueColor = [30, 30, 30];

  const branchVal = branch || '—';
  const batchVal = batch || '—';
  const yearVal = year || new Date().getFullYear();
  const lecturerVal = lecturer || '—';
  const formattedDate = today.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Row 1
  let rowY = boxY + 9;
  doc.setFontSize(8);
  doc.setTextColor(...labelColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Name', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName, leftX + 32, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Branch', rightX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(branchVal, rightX + 18, rowY);

  // Row 2
  rowY += 9;
  const ncukIdDisplay = ncukId ? ncukId : '—';
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('NCUK ID', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(ncukIdDisplay, leftX + 32, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Batch', rightX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(batchVal, rightX + 18, rowY);

  // Row 3
  rowY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Academic Year', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(String(yearVal), leftX + 32, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Lecturer', rightX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(lecturerVal, rightX + 18, rowY);

  // Row 4
  rowY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Report Date', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedDate, leftX + 32, rowY);

  // ---- ASSESSMENT PERFORMANCE ----
  const tableStartY = boxY + boxH + 10;

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSESSMENT PERFORMANCE', PAGE_MARGIN, tableStartY - 2);

  const tableRows = validAssessments.map((asm) => [
    asm.name,
    asm.obtained.toFixed(1),
    asm.maxMarks,
    ((asm.obtained / asm.maxMarks) * 100).toFixed(1),
  ]);

  autoTable(doc, {
    startY: tableStartY + 2,
    head: [['Assessment', 'Marks Obtained', 'Maximum Marks', 'Percentage']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
      textColor: [40, 40, 40],
      lineColor: [220, 225, 232],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 48, halign: 'left' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
    },
  });

  // ---- OVERALL PERFORMANCE ----
  const tableFinalY = Number.isFinite(doc.lastAutoTable?.finalY)
    ? doc.lastAutoTable.finalY
    : 100;

  const perfY = tableFinalY + 14;
  const perfBoxW = usableWidth / 2 - 5;

  // Left column: TOTAL MARKS
  const leftBoxX = PAGE_MARGIN;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(210, 218, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftBoxX, perfY - 4, perfBoxW, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL MARKS', leftBoxX + perfBoxW / 2, perfY + 1, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalObtained.toFixed(1)} / ${totalMaximum.toFixed(1)}`, leftBoxX + perfBoxW / 2, perfY + 12, { align: 'center' });

  // Right column: OVERALL PERCENTAGE
  const rightBoxX = PAGE_MARGIN + perfBoxW + 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, perfY - 4, perfBoxW, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.setFont('helvetica', 'normal');
  doc.text('OVERALL PERCENTAGE', rightBoxX + perfBoxW / 2, perfY + 1, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(`${overallPercentage}%`, rightBoxX + perfBoxW / 2, perfY + 12, { align: 'center' });

  // ---- FOOTER ----
  const footerY = doc.internal.pageSize.height - 14;

  doc.setDrawColor(210, 218, 230);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, footerY - 4, PAGE_WIDTH - PAGE_MARGIN, footerY - 4);

  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'MIE Pathways | Academic Progress Report',
    PAGE_MARGIN,
    footerY
  );
  doc.text(
    `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`,
    PAGE_WIDTH - PAGE_MARGIN,
    footerY,
    { align: 'right' }
  );
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    'This report is generated from marks recorded by the faculty.',
    PAGE_MARGIN,
    footerY + 4
  );

  // Filename
  const safeName = sanitizeFilename(studentName);
  const safeSubject = sanitizeFilename(module);
  const safeYear = sanitizeFilename(year || new Date().getFullYear());
  doc.save(`MIE-${safeName}-${safeSubject}-${safeYear}-Progress-Report.pdf`);

  // Return the Y position after the summary card so callers can continue laying out
  return perfY + 30;
}

// Helper: render class report header/metadata area.
// Returns the Y position after the metadata area so the table/summary starts below it.
function renderClassHeader(doc, PAGE_MARGIN, PAGE_WIDTH, sheet, students, tests, lecturerName) {
  const usableWidth = PAGE_WIDTH - 2 * PAGE_MARGIN;

  const branchVal = sheet.branch || '—';
  const batchVal = sheet.batch || '—';
  const subjectVal = sheet.subject || '—';
  const yearVal = sheet.year || new Date().getFullYear();
  const lecturerVal = lecturerName || '—';

  // Generation date
  const generationDate = new Date();

  // ---- HEADER ----
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'MIE Pathways',
    PAGE_MARGIN + usableWidth / 2,
    14,
    { align: 'center' }
  );

  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'CLASS MARKS REPORT',
    PAGE_MARGIN + usableWidth / 2,
    22,
    { align: 'center' }
  );

  // Internal report label
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'INTERNAL REPORT',
    PAGE_MARGIN + usableWidth / 2,
    27,
    { align: 'center' }
  );

  // Thin blue rule
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, 31, PAGE_WIDTH - PAGE_MARGIN, 31);

  // Module line
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`Module: ${subjectVal}`, PAGE_MARGIN + usableWidth / 2, 38, { align: 'center' });

  // ---- METADATA (two-column layout) ----
  const metaY = 44;
  const labelColor = [120, 130, 145];
  const valueColor = [30, 30, 30];
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + usableWidth / 2 + 5;

  // Left column
  let rowY = metaY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Branch', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(branchVal, leftX + 18, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Academic Year', rightX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(String(yearVal), rightX + 28, rowY);

  // Right column
  rowY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Batch', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(batchVal, leftX + 18, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Lecturer', rightX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(lecturerVal, rightX + 28, rowY);

  // Generated date row
  rowY += 7;
  const genDate = generationDate.toLocaleDateString('en-GB');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Generated', leftX, rowY);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(genDate, leftX + 18, rowY);

  // ---- SUMMARY BLOCKS ----
  let validStudentPcts = [];
  students.forEach((student) => {
    const studentMarks = student.marks || [];
    const markMap = {};
    studentMarks.forEach((m) => {
      markMap[m.colIndex] =
        m.value !== undefined && m.value !== null ? String(m.value) : '';
    });

    let obtainedSum = 0;
    let maxSum = 0;
    tests.forEach((test) => {
      const markValue = markMap[test.colIndex];
      const maxMarks = test.maxMarks || 0;

      if (markValue !== '' && markValue !== undefined && markValue !== '—') {
        const obtained = parseFloat(markValue);
        if (!isNaN(obtained)) {
          obtainedSum += obtained;
          maxSum += maxMarks;
        }
      }
    });

    if (maxSum > 0) {
      validStudentPcts.push((obtainedSum / maxSum) * 100);
    }
  });

  const classAverage =
    validStudentPcts.length > 0
      ? (validStudentPcts.reduce((a, b) => a + b, 0) /
          validStudentPcts.length)
        .toFixed(1)
      : '—';

  const summaryY = rowY + 10;
  const blockW = usableWidth / 3 - 4;

  const summaryBlocks = [
    { label: 'STUDENTS', value: String(students.length) },
    { label: 'ASSESSMENTS', value: String(tests.length) },
    { label: 'CLASS AVERAGE', value: `${classAverage}%` },
  ];

  summaryBlocks.forEach((block, i) => {
    const bx = PAGE_MARGIN + i * (blockW + 6);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(210, 218, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, summaryY - 3, blockW, 18, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(110, 120, 135);
    doc.setFont('helvetica', 'normal');
    doc.text(block.label, bx + blockW / 2, summaryY + 2, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(block.value, bx + blockW / 2, summaryY + 12, { align: 'center' });
  });

  // ---- MARKS TABLE ----
  // Build column headers with max marks
  const columnHeaders = tests.map((test) => `${test.name} (${test.maxMarks || 100})`);

  // Build rows for each student
  const rows = students.map((student) => {
    const studentMarks = student.marks || [];
    const markMap = {};
    studentMarks.forEach((m) => {
      markMap[m.colIndex] =
        m.value !== undefined && m.value !== null ? String(m.value) : '—';
    });

    const overallObtained = [];
    const overallMaximum = [];

    tests.forEach((test) => {
      const markValue = markMap[test.colIndex];
      const maxMarks = test.maxMarks || 0;

      if (markValue !== '' && markValue !== undefined && markValue !== '—') {
        const obtained = parseFloat(markValue);
        if (!isNaN(obtained)) {
          overallObtained.push(obtained);
          overallMaximum.push(maxMarks);
        }
      }
    });

    const overallPct = overallMaximum.length > 0
      ? ((overallObtained.reduce((a, b) => a + b, 0) /
          overallMaximum.reduce((a, b) => a + b, 0)) *
          100)
        .toFixed(1)
      : '—';

    const row = [student.name || '—', student.ncukId || '—'];
    tests.forEach((test) => {
      row.push(markMap[test.colIndex] || '—');
    });
    row.push(overallPct);

    return row;
  });

  // Table headers: Student Name, NCUK ID, then assessment columns, then Overall %
  const headers = ['Student Name', 'NCUK ID'].concat(columnHeaders).concat(['Overall %']);

  const tableStartY = summaryY + 26;

  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: 'center',
      textColor: [40, 40, 40],
      lineColor: [220, 225, 232],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      ...tests.reduce((acc, _, i) => {
        acc[i + 2] = { cellWidth: 'auto' };
        return acc;
      }, {}),
      [tests.length + 2]: { cellWidth: 'auto' },
    },
  });

  const tableFinalY = Number.isFinite(autoTable.endY) ? autoTable.endY : 100;

  // ---- FOOTER ----
  const footerY = doc.internal.pageSize.height - 10;

  doc.setDrawColor(210, 218, 230);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, footerY - 4, PAGE_WIDTH - PAGE_MARGIN, footerY - 4);

  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'MIE Pathways | Class Marks Report',
    PAGE_MARGIN,
    footerY
  );
  doc.text(
    `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`,
    PAGE_WIDTH - PAGE_MARGIN,
    footerY,
    { align: 'right' }
  );

  // Filename
  const safeBranch = sanitizeFilename(branchVal);
  const safeBatch = sanitizeFilename(batchVal);
  const safeSubject = sanitizeFilename(subjectVal);
  const safeYear = sanitizeFilename(yearVal);
  doc.save(`MIE-${safeBranch}-${safeBatch}-${safeSubject}-${safeYear}-Marks-Report.pdf`);

  // Return the Y position after the full header area (table included)
  return tableFinalY + 20;
}

export function exportIndividualPdf({ student, sheet, lecturerName }) {

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  // Explicit page margins — do not rely on doc.pageRect which may be undefined
  const PAGE_MARGIN = 15;
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;

  // Extract fields directly from sheet object — no positional order dependency
  const studentObj = student;
  const subject = sheet.subject;
  const year = sheet.year;
  const branch = sheet.branch;
  const batch = sheet.batch;
  const lecturer = lecturerName || '—';
  const assessments = sheet.tests || [];

  const returnedY = renderIndividualHeader(
    doc,
    PAGE_MARGIN,
    PAGE_WIDTH,
    studentObj,
    subject,
    year,
    branch,
    batch,
    lecturer,
    assessments
  );

  // The function already saved the PDF inside renderIndividualHeader.
  // Return the final Y just in case the caller needs it; the PDF is already saved.
  return returnedY;
}

export function exportClassPdf({ sheet, students, tests, lecturerName }) {

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Explicit page margins — do not rely on doc.pageRect which may be undefined
  const PAGE_MARGIN = 15;
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;

  // Extract fields directly from sheet object — no positional order dependency
  const branch = sheet.branch;
  const batch = sheet.batch;
  const subject = sheet.subject;
  const year = sheet.year;
  const lecturer = lecturerName || '—';

  const returnedY = renderClassHeader(
    doc,
    PAGE_MARGIN,
    PAGE_WIDTH,
    sheet,
    students,
    tests,
    lecturer
  );

  // The PDF is already saved inside renderClassHeader.
  return returnedY;
}
