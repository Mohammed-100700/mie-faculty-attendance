const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const User = require('../models/User');
const QRToken = require('../models/QRToken');
const Workbook = require('../models/Workbook');
const { v4: uuidv4 } = require('uuid');

// @desc    Seed all default data (branches, subjects, QR tokens, demo users, workbook templates)
// @route   POST /api/seed
// Protected by ADMIN_SEED_SECRET — no JWT required, but must supply the secret key
const seedAll = async (req, res, next) => {
  try {
    const { secret } = req.body;

    // Validate the admin seed secret
    if (!process.env.ADMIN_SEED_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'ADMIN_SEED_SECRET is not configured on the server.',
      });
    }

    if (!secret || secret !== process.env.ADMIN_SEED_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing seed secret.',
      });
    }

    const results = {};

    // ── 0. Fix stale unique index on Workbook.lecturerId ─────────
    // The old schema had `unique: true` on lecturerId; the new schema
    // uses `sparse: true` so multiple template docs can have null.
    // Mongoose never drops indexes automatically, so we drop it manually.
    try {
      const wbCollection = mongoose.connection.collection('workbooks');
      const indexes = await wbCollection.indexes();
      const uniqueLecturerIdx = indexes.find(
        (idx) => idx.key && idx.key.lecturerId === 1 && idx.unique
      );
      if (uniqueLecturerIdx) {
        await wbCollection.dropIndex(uniqueLecturerIdx.name);
        results.indexFix = `Dropped stale unique index '${uniqueLecturerIdx.name}' on workbooks.lecturerId`;
      } else {
        results.indexFix = 'No stale unique index found (already clean)';
      }
    } catch (idxError) {
      results.indexFix = `Index check note: ${idxError.message}`;
    }
    // Re-sync indexes with the updated schema
    await Workbook.syncIndexes();

    // ── 1. Branches ──────────────────────────────────────────────
    const defaultBranches = [
      { name: 'Dhanmondi', code: 'DHN' },
      { name: 'Uttara', code: 'UTT' },
    ];
    const branchDocs = [];
    for (const b of defaultBranches) {
      const doc = await Branch.findOneAndUpdate(
        { code: b.code },
        { ...b, isActive: true },
        { upsert: true, new: true }
      );
      branchDocs.push(doc);
    }
    results.branches = { count: branchDocs.length, data: branchDocs };

    // ── 2. Subjects ──────────────────────────────────────────────
    const defaultSubjects = [
      'Integrated Mathematics',
      'Technical Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Economics',
      'Business Studies',
      'Global Studies',
      'Sociology',
    ];
    const subjectDocs = [];
    for (const name of defaultSubjects) {
      const doc = await Subject.findOneAndUpdate(
        { name, isDefault: true },
        {
          name,
          programme: 'NCUK IFY',
          createdBy: null,
          isDefault: true,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      subjectDocs.push(doc);
    }
    results.subjects = { count: subjectDocs.length, data: subjectDocs };

    // ── 3. QR Tokens ─────────────────────────────────────────────
    const qrTokens = [];
    for (const branch of branchDocs) {
      const existing = await QRToken.findOne({ branch: branch.name });
      if (!existing) {
        const token = await QRToken.create({
          branch: branch.name,
          token: uuidv4(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
        });
        qrTokens.push(token);
      } else {
        qrTokens.push(existing);
      }
    }
    results.qrTokens = { count: qrTokens.length };

    // ── 4. Demo Users ────────────────────────────────────────────
    const sampleSubjectIds = subjectDocs.slice(0, 3).map((s) => s._id);

    const demoUsers = [
      {
        name: 'Demo Lecturer',
        email: 'lecturer@mie.com',
        password: 'password123',
        phone: '+880 1700-000000',
        role: 'Lecturer',
        branches: ['Dhanmondi', 'Uttara'],
        subjects: sampleSubjectIds,
      },
      {
        name: 'Academic Manager',
        email: 'manager@mie.com',
        password: 'password123',
        phone: '+880 1700-000001',
        role: 'Academic Manager',
        managedBranch: 'Dhanmondi',
      },
      {
        name: 'Executive Office',
        email: 'executive@mie.com',
        password: 'password123',
        phone: '+880 1700-000002',
        role: 'Executive Office',
      },
    ];

    const createdUsers = [];
    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (user) {
        // Update existing demo user to ensure password/fields are correct
        user.password = u.password;
        user.name = u.name;
        user.phone = u.phone;
        user.role = u.role;
        if (u.branches) user.branches = u.branches;
        if (u.subjects) user.subjects = u.subjects;
        if (u.managedBranch) user.managedBranch = u.managedBranch;
        await user.save();
      } else {
        user = await User.create(u);
      }
      createdUsers.push({ email: user.email, role: user.role });
    }
    results.demoUsers = { count: createdUsers.length, data: createdUsers };

    // ── 5. Workbook Templates ────────────────────────────────────
    // Create default workbook template workbooks for the demo lecturer
    const demoLecturer = await User.findOne({ email: 'lecturer@mie.com' });

    const workbookTemplates = [
      {
        name: 'USHB Year 1 Semester 1',
        programme: 'USHB',
        year: 1,
        semester: 1,
        classes: [
          { name: 'USHB Y1S1 - Dhanmondi', term: 'September 2025', startDate: '2025-09-01', endDate: '2026-01-15' },
          { name: 'USHB Y1S1 - Uttara', term: 'September 2025', startDate: '2025-09-01', endDate: '2026-01-15' },
        ],
      },
      {
        name: 'USHB Year 1 Semester 2',
        programme: 'USHB',
        year: 1,
        semester: 2,
        classes: [
          { name: 'USHB Y1S2 - Dhanmondi', term: 'February 2026', startDate: '2026-02-01', endDate: '2026-06-15' },
          { name: 'USHB Y1S2 - Uttara', term: 'February 2026', startDate: '2026-02-01', endDate: '2026-06-15' },
        ],
      },
      {
        name: 'UNEC Year 1 Semester 2',
        programme: 'UNEC',
        year: 1,
        semester: 2,
        classes: [
          { name: 'UNEC Y1S2 - Dhanmondi', term: 'February 2026', startDate: '2026-02-01', endDate: '2026-06-15' },
        ],
      },
      {
        name: 'IELTS',
        programme: 'IELTS',
        year: null,
        semester: null,
        classes: [
          { name: 'IELTS - Dhanmondi', term: 'Rolling', startDate: '2025-09-01', endDate: '2026-12-31' },
          { name: 'IELTS - Uttara', term: 'Rolling', startDate: '2025-09-01', endDate: '2026-12-31' },
        ],
      },
      {
        name: 'NCUK IFY',
        programme: 'NCUK',
        year: 1,
        semester: null,
        classes: [
          { name: 'NCUK IFY - Dhanmondi', term: 'September 2025', startDate: '2025-09-01', endDate: '2026-06-30' },
          { name: 'NCUK IFY - Uttara', term: 'September 2025', startDate: '2025-09-01', endDate: '2026-06-30' },
        ],
      },
      {
        name: 'NAPT',
        programme: 'NAPT',
        year: null,
        semester: null,
        classes: [
          { name: 'NAPT - Dhanmondi', term: 'Rolling', startDate: '2025-09-01', endDate: '2026-12-31' },
        ],
      },
    ];

    // Store workbook templates as a special "template" workbook linked to a system user
    // We use a dedicated collection-like approach: store templates in a separate field
    // For simplicity, we'll store them as a special Workbook with lecturerId = null (template)
    let templateCount = 0;
    for (const tpl of workbookTemplates) {
      await Workbook.findOneAndUpdate(
        { staffEmail: `template:${tpl.name}`, lecturerId: null },
        {
          lecturerId: null,
          staffEmail: `template:${tpl.name}`,
          sheets: [],
          templateName: tpl.name,
          programme: tpl.programme,
          year: tpl.year,
          semester: tpl.semester,
          classes: tpl.classes,
          isTemplate: true,
        },
        { upsert: true, new: true }
      );
      templateCount++;
    }
    results.workbookTemplates = { count: templateCount };

    // ── Done ──────────────────────────────────────────────────────
    res.json({
      success: true,
      message: 'Database seeded successfully.',
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { seedAll };
