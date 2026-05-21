const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "September / Dhanmondi / Mathematics"
  batch: { type: String, required: true }, // e.g. "September"
  branch: { type: String, required: true }, // e.g. "Dhanmondi"
  subject: { type: String, required: true }, // e.g. "Mathematics"
  tests: [
    {
      name: { type: String, required: true },
      colIndex: { type: Number, required: true },
      approved: { type: Boolean, default: false },
      approvedAt: { type: Date, default: null },
    },
  ],
  students: [
    {
      name: { type: String, required: true },
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
      required: true,
      unique: true,
    },
    staffEmail: {
      type: String,
      required: true,
    },
    sheets: [sheetSchema],
    lastEmailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workbook', workbookSchema);
