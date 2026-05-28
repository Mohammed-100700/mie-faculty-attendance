const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branch: {
      type: String,
      enum: ['Dhanmondi', 'Uttara'],
      required: true,
    },
    batch: {
      type: String,
      enum: ['September', 'December', 'March', 'June'],
      default: 'September',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    sessionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ lecturerId: 1, createdAt: -1 });
attendanceSessionSchema.index({ batch: 1, branch: 1, subject: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
