import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBDT, formatDate, getMonthName } from './formatCurrency';

export const exportSalaryReportPDF = (reportData) => {
  const doc = new jsPDF();
  const { lecturer, month, year, ratePerClass, totalClasses, totalPayableAmount, branchBreakdown, detailedLogs } = reportData;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('MIE Faculty Attendance', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Monthly Salary Report', 14, 30);

  doc.setFontSize(10);
  doc.text(`Lecturer: ${lecturer.name}`, 14, 42);
  doc.text(`Email: ${lecturer.email}`, 14, 48);
  doc.text(`Period: ${getMonthName(month)} ${year}`, 14, 54);
  doc.text(`Rate per Class: ${formatBDT(ratePerClass)}`, 14, 60);

  doc.setFontSize(12);
  doc.text('Summary', 14, 72);

  const summaryData = [
    ['Total Classes', totalClasses.toString()],
    ['Total Payable Amount', formatBDT(totalPayableAmount)],
  ];

  autoTable(doc, {
    startY: 76,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  if (Object.keys(branchBreakdown).length > 0) {
    doc.text('Branch Breakdown', 14, doc.lastAutoTable.finalY + 12);
    const branchData = Object.entries(branchBreakdown).map(([branch, data]) => [
      branch, data.classes, formatBDT(data.amount),
    ]);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Branch', 'Classes', 'Amount']],
      body: branchData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    });
  }

  if (detailedLogs.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('Detailed Class Logs', 14, 20);
    const logData = detailedLogs.map((log) => [
      formatDate(log.date),
      log.entries?.map((e) => `${e.branch}: ${e.classes}`).join(', '),
      log.totalClasses,
      formatBDT(log.payableAmount),
    ]);
    autoTable(doc, {
      startY: 24,
      head: [['Date', 'Branches', 'Total', 'Amount']],
      body: logData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 7 },
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | MIE Faculty Portal`, 14, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  doc.save(`Salary_Report_${getMonthName(month)}_${year}.pdf`);
};
