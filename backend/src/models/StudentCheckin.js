const mongoose = require('mongoose');

const studentCheckinSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: String,
      trim: true,
      default: '',
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate checkins: same name per session (legacy)
studentCheckinSchema.index(
  { sessionId: 1, studentName: 1 },
  { unique: true }
);

// Registry-linked check-in: one per session with a studentRef
studentCheckinSchema.index(
  { sessionId: 1, studentRef: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentRef: { $type: 'objectId' },
    },
  }
);

module.exports = mongoose.model('StudentCheckin', studentCheckinSchema);
