const Workbook = require('../models/Workbook');
const User = require('../models/User');
const crypto = require('crypto');

// Encrypt/decrypt helpers for storing app passwords
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('FATAL: EMAIL_ENCRYPTION_KEY must be exactly 32 characters. Set it in .env');
  process.exit(1);
}

// Set SendGrid API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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

// (Email sending now handled client-side via EmailJS)

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
  syncMarks,
};
