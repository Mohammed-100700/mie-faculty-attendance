const mongoose = require('mongoose');

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
    // Each sheet = one batch (September, December, March, or custom)
    sheets: [
      {
        name: { type: String, required: true }, // e.g. "September 2026"
        // Branches in this sheet
        branches: [
          {
            name: { type: String, required: true }, // e.g. "Dhanmondi"
            // Subjects under this branch
            subjects: [
              {
                name: { type: String, required: true }, // e.g. "Mathematics"
                // Tests under this subject
                tests: [
                  {
                    name: { type: String, required: true }, // e.g. "Quiz 1"
                    colIndex: { type: Number, required: true },
                    approved: { type: Boolean, default: false },
                    approvedAt: { type: Date, default: null },
                  },
                ],
              },
            ],
          },
        ],
        // Students in this sheet (batch)
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
      },
    ],
    lastEmailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workbook', workbookSchema);
