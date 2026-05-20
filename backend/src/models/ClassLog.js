const mongoose = require('mongoose');

const classLogSchema = new mongoose.Schema(
  {
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lecturer ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Class date is required'],
    },
    entries: [
      {
        branch: { type: String, enum: ['Dhanmondi', 'Uttara'], required: true },
        classes: { type: Number, required: true, min: 1 },
      },
    ],
    totalClasses: {
      type: Number,
      default: 0,
    },
    ratePerClassAtSubmission: {
      type: Number,
      required: true,
    },
    payableAmount: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

classLogSchema.index({ lecturerId: 1, date: -1 });
classLogSchema.index({ 'entries.branch': 1 });

module.exports = mongoose.model('ClassLog', classLogSchema);
