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
  },
  { timestamps: true }
);

// Prevent duplicate checkins: same name per session
studentCheckinSchema.index(
  { sessionId: 1, studentName: 1 },
  { unique: true }
);

module.exports = mongoose.model('StudentCheckin', studentCheckinSchema);
