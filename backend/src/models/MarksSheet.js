const mongoose = require('mongoose');

const marksSheetSchema = new mongoose.Schema(
  {
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sheetUrl: {
      type: String,
      required: true,
    },
    sheetId: {
      type: String,
      required: true,
    },
    staffEmail: {
      type: String,
      required: true,
    },
    columns: [
      {
        name: String,
        branch: String,
        subject: String,
        colIndex: Number,
        approved: { type: Boolean, default: false },
        approvedAt: { type: Date, default: null },
      },
    ],
    allApproved: {
      type: Boolean,
      default: false,
    },
    lastEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarksSheet', marksSheetSchema);
