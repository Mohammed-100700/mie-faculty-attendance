const mongoose = require('mongoose');

const rosterSnapshotStudentSchema = new mongoose.Schema(
  {
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Student',
    },
    mieStudentId: {
      type: String,
      required: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

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
    year: {
      type: String,
      trim: true,
      default: null,
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
    workbookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workbook',
      default: null,
    },
    sheetIndex: {
      type: Number,
      default: null,
    },
    rosterSnapshot: {
      type: [rosterSnapshotStudentSchema],
      default: undefined,
    },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ lecturerId: 1, createdAt: -1 });
attendanceSessionSchema.index({ batch: 1, branch: 1, subject: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
