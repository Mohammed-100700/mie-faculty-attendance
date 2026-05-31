const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "2026 / September / Dhanmondi / Mathematics"
  year: { type: String, default: String(new Date().getFullYear()) },
  batch: { type: String, required: true }, // e.g. "September"
  branch: { type: String, required: true }, // e.g. "Dhanmondi"
  subject: { type: String, required: true }, // e.g. "Mathematics"
  tests: [
    {
      name: { type: String, required: true },
      colIndex: { type: Number, required: true },
      maxMarks: { type: Number, default: 100 },
      approved: { type: Boolean, default: false },
      approvedAt: { type: Date, default: null },
    },
  ],
  students: [
    {
      name: { type: String, required: true },
      ncukId: { type: String, default: '' },
      marks: [
        {
          colIndex: { type: Number, required: true },
          value: { type: String, default: '' },
        },
      ],
    },
  ],
});

const workbookSchema = new mongoose.Schema(
  {
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      sparse: true,
    },
    staffEmail: {
      type: String,
      required: true,
    },
    sheets: [sheetSchema],
    lastEmailSentAt: { type: Date, default: null },
    // Template fields (used when isTemplate = true)
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, default: null },
    programme: { type: String, default: null },
    year: { type: Number, default: null },
    semester: { type: Number, default: null },
    classes: [
      {
        name: { type: String },
        term: { type: String },
        startDate: { type: String },
        endDate: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workbook', workbookSchema);
