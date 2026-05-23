const Workbook = require('../models/Workbook');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Encrypt/decrypt helpers for storing app passwords
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('FATAL: EMAIL_ENCRYPTION_KEY must be exactly 32 characters. Set it in .env');
  process.exit(1);
}

// Sanitize helper — strip HTML tags and limit length
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Create transporter per user
function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email, pass: appPassword },
  });
}

// @desc    Get workbook
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

// @desc    Update lecturer email settings (Gmail + App Password)
// @route   PUT /api/workbook/email-settings
const updateEmailSettings = async (req, res, next) => {
  try {
    const { lecturerEmail, staffEmail } = req.body;
    const update = staffEmail ? { staffEmail: sanitize(staffEmail, 100) } : {};

    // If lecturer provided email + app password, encrypt and store in User model
    if (lecturerEmail && req.body.appPassword) {
      const email = sanitize(lecturerEmail, 100);
      const appPassword = req.body.appPassword.trim();
      if (appPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'App password must be at least 8 characters.' });
      }
      await User.findByIdAndUpdate(req.user._id, {
        email,
        emailAppPassword: encrypt(appPassword),
      });
    }

    const workbook = await Workbook.findOneAndUpdate(
      { lecturerId: req.user._id },
      update,
      { new: true, upsert: true }
    );
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new sheet
// @route   POST /api/workbook/sheets
const addSheet = async (req, res, next) => {
  try {
    const { batch, branch, subject } = req.body;
    if (!batch || !branch || !subject) {
      return res.status(400).json({ success: false, message: 'Batch, branch, and subject are required.' });
    }

    // Sanitize inputs
    const cleanBatch = sanitize(batch, 50);
    const cleanBranch = sanitize(branch, 50);
    const cleanSubject = sanitize(subject, 100);

    if (!cleanBatch || !cleanBranch || !cleanSubject) {
      return res.status(400).json({ success: false, message: 'Invalid batch, branch, or subject.' });
    }

    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) {
      return res.status(404).json({ success: false, message: 'Workbook not found.' });
    }

    // Check for duplicate
    const exists = workbook.sheets.find(
      (s) => s.batch === cleanBatch && s.branch === cleanBranch && s.subject === cleanSubject
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'This sheet already exists.' });
    }

    workbook.sheets.push({
      name: `${cleanBatch} / ${cleanBranch} / ${cleanSubject}`,
      batch,
      branch,
      subject,
      tests: [],
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

// @desc    Add a test to a sheet
// @route   POST /api/workbook/sheets/:sheetIndex/tests
const addTest = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { testName } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const cleanName = sanitize(testName, 100);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Test name is required.' });
    }
    let maxMarks = req.body.maxMarks ? parseInt(req.body.maxMarks) : 100;
    if (isNaN(maxMarks) || maxMarks < 1 || maxMarks > 1000) maxMarks = 100;
    const colIndex = sheet.tests.length + 1;
    sheet.tests.push({ name: cleanName, colIndex, maxMarks, approved: false, approvedAt: null });
    // Add mark entry for this test to all existing students
    for (const student of sheet.students) {
      student.marks.push({ colIndex, value: '' });
    }
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
    const { sheetIndex, testIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const deletedColIndex = sheet.tests[testIndex].colIndex;
    sheet.tests.splice(testIndex, 1);
    // Recalculate colIndexes
    sheet.tests.forEach((t, i) => { t.colIndex = i + 1; });
    // Remove mark entries for deleted test from all students
    for (const student of sheet.students) {
      student.marks = student.marks.filter((m) => m.colIndex !== deletedColIndex);
      // Recalculate student mark colIndexes
      student.marks.forEach((m, i) => { m.colIndex = i + 1; });
    }

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a student to a sheet
// @route   POST /api/workbook/sheets/:sheetIndex/students
const addStudent = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const { name } = req.body;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const cleanName = sanitize(name, 100);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Student name is required.' });
    }

    const marks = sheet.tests.map((t, i) => ({ colIndex: i + 1, value: '' }));
    sheet.students.push({ name: cleanName, marks });
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
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });
    const student = sheet.students[studentIndex];
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const mark = student.marks.find((m) => m.colIndex === parseInt(colIndex));
    if (mark) mark.value = sanitize(value, 20);

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle test approval
// @route   PUT /api/workbook/sheets/:sheetIndex/tests/:testIndex/toggle
const toggleTestApproval = async (req, res, next) => {
  try {
    const { sheetIndex, testIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    const test = sheet.tests[testIndex];

    test.approved = !test.approved;
    test.approvedAt = test.approved ? new Date() : null;

    await workbook.save();
    res.json({ success: true, data: workbook });
  } catch (error) {
    next(error);
  }
};

// @desc    Send email for approved tests in a sheet
// @route   POST /api/workbook/sheets/:sheetIndex/send
const sendEmail = async (req, res, next) => {
  try {
    const { sheetIndex } = req.params;
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    const sheet = workbook.sheets[sheetIndex];
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found.' });

    const approvedTests = sheet.tests.filter((t) => t.approved);
    if (approvedTests.length === 0) {
      return res.status(400).json({ success: false, message: 'No tests approved. Check the boxes for tests to send.' });
    }

    if (!workbook.staffEmail || workbook.staffEmail === 'staff@example.com') {
      return res.status(400).json({ success: false, message: 'Staff email not set. Go to Settings.' });
    }

    // Get lecturer's email credentials
    const lecturer = await User.findById(req.user._id);
    if (!lecturer.email || !lecturer.emailAppPassword) {
      return res.status(400).json({ success: false, message: 'Email not configured. Go to Settings and set up your Gmail.' });
    }

    const lecturerName = req.user.name;
    const subject = `Marks: ${sheet.name} - ${lecturerName}`;

    // Build HTML email
    let testSections = '';
    for (const test of approvedTests) {
      let tableRows = '';
      for (let r = 0; r < sheet.students.length; r++) {
        const student = sheet.students[r];
        const mark = student.marks.find((m) => m.colIndex === test.colIndex);
        const markValue = mark && mark.value !== '' ? mark.value : '-';
        const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        tableRows += `<tr style="background:${bg}">`;
        tableRows += `<td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${student.name}</td>`;
        tableRows += `<td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;font-weight:500;color:#2563eb;">${markValue}</td>`;
        tableRows += '</tr>';
      }

      const maxMarks = test.maxMarks || 100;
      testSections += '<div style="margin-top:16px;">';
      testSections += `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:10px 16px;">`;
      testSections += `<strong style="color:#1e40af;font-size:14px;">${test.name}</strong>`;
      testSections += `<span style="color:#64748b;font-size:12px;margin-left:8px;">(out of ${maxMarks})</span>`;
      testSections += '</div>';
      testSections += '<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">';
      testSections += '<thead><tr style="background:#f1f5f9;">';
      testSections += '<th style="padding:10px 14px;text-align:left;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;">Student</th>';
      testSections += `<th style="padding:10px 14px;text-align:center;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;width:100px;">Mark (out of ${maxMarks})</th>`;
      testSections += '</tr></thead>';
      testSections += `<tbody>${tableRows}</tbody></table></div>`;
    }

    let html = '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
    html += '<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:20px 24px;">';
    html += '<h2 style="margin:0;font-size:18px;letter-spacing:-0.3px;">Marks Update</h2>';
    html += `<p style="margin:4px 0 0;opacity:0.85;font-size:13px;">${lecturerName} • ${new Date().toLocaleDateString()}</p>`;
    html += '</div>';
    html += '<div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">';
    html += `<span style="display:inline-block;background:#2563eb;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;">${sheet.batch}</span>`;
    html += `<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;">${sheet.branch}</span>`;
    html += `<span style="display:inline-block;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;">${sheet.subject}</span>`;
    html += `<span style="margin-left:10px;color:#64748b;font-size:12px;">${approvedTests.length} test(s)</span>`;
    html += '</div>';
    html += '<div style="padding:16px 20px;">';
    html += testSections;
    html += '</div>';
    html += `<p style="color:#94a3b8;font-size:11px;margin:0;padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;">MIE Faculty Attendance • ${sheet.students.length} student(s) • ${approvedTests.length} test(s)</p>`;
    html += '</div>';

    // Send using lecturer's own Gmail
    const appPassword = decrypt(lecturer.emailAppPassword);
    const userTransporter = createTransporter(lecturer.email, appPassword);

    // Verify connection first
    try {
      await userTransporter.verify();
    } catch (verifyErr) {
      return res.status(400).json({
        success: false,
        message: 'Gmail authentication failed. Please check your email and App Password in Settings. Make sure you are using a Gmail App Password (not your regular password) and have 2-Step Verification enabled.',
      });
    }

    await userTransporter.sendMail({
      from: `"${lecturerName}" <${lecturer.email}>`,
      to: workbook.staffEmail,
      subject,
      html,
    });

    // Reset approvals
    for (const test of sheet.tests) {
      if (test.approved) {
        test.approved = false;
        test.approvedAt = null;
      }
    }
    workbook.lastEmailSentAt = new Date();
    await workbook.save();

    res.json({ success: true, message: `Email sent to ${workbook.staffEmail} with ${approvedTests.length} test column(s).` });
  } catch (error) {
    next(error);
  }
};

// @desc    Test email configuration
// @route   POST /api/workbook/test-email
const testEmail = async (req, res, next) => {
  try {
    const lecturer = await User.findById(req.user._id);
    if (!lecturer.email || !lecturer.emailAppPassword) {
      return res.status(400).json({ success: false, message: 'Email not configured. Go to Settings and set up your Gmail.' });
    }

    const appPassword = decrypt(lecturer.emailAppPassword);
    const userTransporter = createTransporter(lecturer.email, appPassword);

    // Verify connection
    try {
      await userTransporter.verify();
    } catch (verifyErr) {
      return res.status(400).json({
        success: false,
        message: 'Gmail authentication failed. Please check your email and App Password in Settings. Make sure you are using a Gmail App Password (not your regular password) and have 2-Step Verification enabled.',
      });
    }

    // Send test email to the lecturer themselves
    await userTransporter.sendMail({
      from: `"MIE Faculty System" <${lecturer.email}>`,
      to: lecturer.email,
      subject: 'Test Email — MIE Faculty System',
      html: `<div style="font-family:Arial,sans-serif;padding:20px;">
        <h2 style="color:#2563eb;">Email Test Successful!</h2>
        <p>Your email is configured correctly. You can now send marks to staff.</p>
        <p><strong>Lecturer:</strong> ${lecturer.name}</p>
        <p><strong>Email:</strong> ${lecturer.email}</p>
        <hr style="border:1px solid #e2e8f0;"/>
        <p style="color:#94a3b8;font-size:12px;">MIE Faculty Attendance System</p>
      </div>`,
    });

    res.json({ success: true, message: `Test email sent to ${lecturer.email}. Check your inbox!` });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync marks — add missing mark entries for students when tests were added after them
// @route   POST /api/workbook/sync-marks
const syncMarks = async (req, res, next) => {
  try {
    const workbook = await Workbook.findOne({ lecturerId: req.user._id });
    if (!workbook) return res.status(404).json({ success: false, message: 'Not found.' });

    let fixed = 0;
    for (const sheet of workbook.sheets) {
      const testColIndexes = sheet.tests.map((t) => t.colIndex);
      for (const student of sheet.students) {
        const existingColIndexes = student.marks.map((m) => m.colIndex);
        for (const colIdx of testColIndexes) {
          if (!existingColIndexes.includes(colIdx)) {
            student.marks.push({ colIndex: colIdx, value: '' });
            fixed++;
          }
        }
        student.marks.sort((a, b) => a.colIndex - b.colIndex);
      }
    }

    await workbook.save();
    res.json({ success: true, message: `Synced ${fixed} missing mark entries.`, data: workbook });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkbook,
  updateEmailSettings,
  addSheet,
  deleteSheet,
  addTest,
  deleteTest,
  addStudent,
  deleteStudent,
  updateMark,
  toggleTestApproval,
  sendEmail,
  syncMarks,
  testEmail,
};
