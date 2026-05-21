const Workbook = require('../models/Workbook');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Get or create workbook
// @route   GET /api/workbook
const getWorkbook = async (req, res, next) => {
  try {
    let workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      workbook = await Workbook.create({
        lecturerId: req.user._id,
        staffEmail: req.user.email,
        sheets: [],
      });
    }
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff email
// @route   PUT /api/workbook/staff-email
const updateStaffEmail = async (req, res, next) => {
  try {
    const { staffEmail } = req.body;
    const workbook = await Workbook.findOneAndUpdate(
      { lecturerId: req.user._id },
      { staffEmail },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new sheet (batch)
// @route   POST /api/workbook/sheets
const addSheet = async (req, res, next) => {
  try {
    const { name } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      return res.status(404).json({ success: false, message: 'Workbook not found.' });
    }

    // Default structure with branches and subjects
    workbook.sheets.push({
      name,
      branches: [
        {
          name: 'Dhanmondi',
          subjects: [
            { name: 'Mathematics', tests: [] },
            { name: 'Physics', tests: [] },
          ],
        },
        {
          name: 'Uttara',
          subjects: [
            { name: 'Mathematics', tests: [] },
            { name: 'Physics', tests: [] },
          ],
        },
      ],
      students: [],
    });

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sheet
// @route   DELETE /api/workbook/sheets/:sheetIndex
const deleteSheet = async (req, res, next) => {
  try {
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    workbook.sheets.splice(req.params.sheetIndex, 1);
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a test to a branch/subject
// @route   POST /api/workbook/sheets/:sheetIndex/tests
const addTest = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { branchName, subjectName, testName } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const branch = sheet.branches.find((b) => b.name === branchName);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

    const subject = branch.subjects.find((s) => s.name === subjectName);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    // Calculate colIndex
    let colIndex = 0;
    for (const b of sheet.branches) {
      for (const s of b.subjects) {
        colIndex += s.tests.length;
      }
    }
    // Add tests from prior branches to get correct colIndex
    for (const b of sheet.branches) {
      if (b.name === branchName) {
        for (const s of b.subjects) {
          if (s.name === subjectName) break;
          colIndex += s.tests.length;
        }
        break;
      }
      for (const s of b.subjects) {
        colIndex += s.tests.length;
      }
    }
    colIndex += subject.tests.length + 1;

    subject.tests.push({ name: testName, colIndex, approved: false, approvedAt: null });
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a test
// @route   DELETE /api/workbook/sheets/:sheetIndex/tests/:testIndex
const deleteTest = async (req, res, next) => {
  try {
    const { sheetIndex, branchName, subjectName, testIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const branch = sheet.branches.find((b) => b.name === branchName);
    const subject = branch.subjects.find((s) => s.name === subjectName);
    subject.tests.splice(testIndex, 1);

    // Recalculate colIndexes
    let idx = 0;
    for (const b of sheet.branches) {
      for (const s of b.subjects) {
        for (const t of s.tests) {
          t.colIndex = ++idx;
        }
      }
    }

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a student
// @route   POST /api/workbook/sheets/:sheetIndex/students
const addStudent = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { name } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    // Count total tests for marks array
    let totalTests = 0;
    for (const b of sheet.branches) {
      for (const s of b.subjects) {
        totalTests += s.tests.length;
      }
    }

    const marks = [];
    for (let i = 1; i <= totalTests; i++) {
      marks.push({ colIndex: i, value: '' });
    }

    sheet.students.push({ name, marks });
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a student
// @route   DELETE /api/workbook/sheets/:sheetIndex/students/:studentIndex
const deleteStudent = async (req, res, next) => {
  try {
    const { sheetIndex, studentIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    sheet.students.splice(studentIndex, 1);
    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a student's mark
// @route   PUT /api/workbook/sheets/:sheetIndex/students/:studentIndex/marks/:colIndex
const updateMark = async (req, res, next) => {
  try {
    const { sheetIndex, studentIndex, colIndex } = req.params;
    const { value } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const student = sheet.students[studentIndex];
    const mark = student.marks.find((m) => m.colIndex === parseInt(colIndex));
    if (mark) mark.value = value;

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle test approval
// @route   PUT /api/workbook/sheets/:sheetIndex/tests/toggle
const toggleTestApproval = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { branchName, subjectName, testIndex } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const branch = sheet.branches.find((b) => b.name === branchName);
    const subject = branch.subjects.find((s) => s.name === subjectName);
    const test = subject.tests[testIndex];

    test.approved = !test.approved;
    test.approvedAt = test.approved ? new Date() : null;

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Get approved tests for a sheet
// @route   GET /api/workbook/sheets/:sheetIndex/approved-tests
const getApprovedTests = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const approved = [];

    for (const branch of sheet.branches) {
      for (const subject of branch.subjects) {
        for (const test of subject.tests) {
          if (test.approved) {
            const students = sheet.students.map((s) => {
              const mark = s.marks.find((m) => m.colIndex === test.colIndex);
              return { name: s.name, mark: mark ? mark.value : '-' };
            });
            approved.push({
              branch: branch.name,
              subject: subject.name,
              test: test.name,
              students,
            });
          }
        }
      }
    }

    res.json({ success: true, data: approved });
  } catch (error) {
    next(error);
  }
};

// @desc    Send email for selected tests
// @route   POST /api/workbook/sheets/:sheetIndex/send
const sendEmail = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const staffEmail = workbook.staffEmail;
    const lecturerName = req.user.name;

    // Group approved tests by branch > subject
    const groups = {};
    const allTestColumns = [];

    for (const branch of sheet.branches) {
      for (const subject of branch.subjects) {
        for (const test of subject.tests) {
          if (test.approved) {
            const key = branch.name + '|' + subject.name;
            if (!groups[key]) groups[key] = { branch: branch.name, subject: subject.name, tests: [] };

            const students = sheet.students.map((s) => {
              const mark = s.marks.find((m) => m.colIndex === test.colIndex);
              return { name: s.name, mark: mark && mark.value !== '' ? mark.value : '-' };
            });

            groups[key].tests.push({ name: test.name, students });
            allTestColumns.push({ testName: test.name, students });
          }
        }
      }
    }

    if (allTestColumns.length === 0) {
      return res.status(400).json({ success: false, message: 'No tests approved. Check the boxes for tests to send.' });
    }

    // Build HTML email
    const groupKeys = Object.keys(groups);
    let summaryLine = '';
    for (let g = 0; g < groupKeys.length; g++) {
      const grp = groups[groupKeys[g]];
      if (g > 0) summaryLine += ' • ';
      summaryLine += grp.branch + ' / ' + grp.subject + ' (' + grp.tests.length + ')';
    }
    const totalStudents = sheet.students.length;
    const totalTests = allTestColumns.length;

    let html = '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:700px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">';

    // Header
    html += '<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:20px 24px;">';
    html += '<h2 style="margin:0;font-size:18px;letter-spacing:-0.3px;">Marks Update</h2>';
    html += '<p style="margin:4px 0 0;opacity:0.85;font-size:13px;">' + lecturerName + ' • ' + sheet.name + ' Batch • ' + new Date().toLocaleDateString() + '</p>';
    html += '<p style="margin:6px 0 0;opacity:0.7;font-size:12px;">' + summaryLine + '</p>';
    html += '</div>';

    // Each group (Branch + Subject) gets a section
    for (let g = 0; g < groupKeys.length; g++) {
      const grp = groups[groupKeys[g]];
      const numTests = grp.tests.length;
      const numStudents = grp.tests[0].students.length;

      // Group header
      html += '<div style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">';
      html += '<span style="display:inline-block;background:#2563eb;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;">' + grp.branch + '</span>';
      html += '<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;">' + grp.subject + '</span>';
      html += '</div>';

      // Vertical table: students = rows, tests = columns
      html += '<table style="width:100%;border-collapse:collapse;">';
      html += '<thead><tr style="background:#f1f5f9;">';
      html += '<th style="padding:10px 14px;text-align:left;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;">Student</th>';
      for (let t = 0; t < numTests; t++) {
        html += '<th style="padding:10px 14px;text-align:center;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;min-width:70px;">' + grp.tests[t].name + '</th>';
      }
      html += '</tr></thead><tbody>';

      for (let r = 0; r < numStudents; r++) {
        const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        html += '<tr style="background:' + bg + '">';
        html += '<td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;">' + grp.tests[0].students[r].name + '</td>';
        for (let t = 0; t < numTests; t++) {
          const mark = grp.tests[t].students[r] ? grp.tests[t].students[r].mark : '-';
          html += '<td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;font-weight:500;color:#2563eb;">' + mark + '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
    }

    // Footer
    html += '<p style="color:#94a3b8;font-size:11px;margin:0;padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;">MIE Faculty Attendance • ' + totalStudents + ' student(s) • ' + totalTests + ' test(s)</p>';
    html += '</div>';

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: staffEmail,
      subject: 'Marks: ' + sheet.name + ' Batch - ' + lecturerName,
      html,
    });

    // Reset approvals and update timestamp
    for (const branch of sheet.branches) {
      for (const subject of branch.subjects) {
        for (const test of subject.tests) {
          if (test.approved) {
            test.approved = false;
            test.approvedAt = null;
          }
        }
      }
    }
    workbook.lastEmailSentAt = new Date();
    await workbook.save();

    res.json({ success: true, message: 'Email sent to ' + staffEmail + ' with ' + totalTests + ' test column(s).' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkbook,
  updateStaffEmail,
  addSheet,
  deleteSheet,
  addTest,
  deleteTest,
  addStudent,
  deleteStudent,
  updateMark,
  toggleTestApproval,
  getApprovedTests,
  sendEmail,
};
