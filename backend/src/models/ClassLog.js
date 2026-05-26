const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    branch: { type: String, enum: ['Dhanmondi', 'Uttara'], required: true },
    classes: { type: Number, required: true, min: 1 },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

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
    entries: [entrySchema],
    totalClasses: {
      type: Number,
      default: 0,
    },
    // Denormalized summary — recalculated from entries on every save
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
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
classLogSchema.index({ 'entries.branch': 1, 'entries.approvalStatus': 1 });

// Compute overall approvalStatus from per-entry statuses
classLogSchema.methods.recalculateApprovalStatus = function () {
  if (!this.entries || this.entries.length === 0) {
    this.approvalStatus = 'Pending';
    return;
  }

  const anyRejected = this.entries.some((e) => e.approvalStatus === 'Rejected');
  if (anyRejected) {
    this.approvalStatus = 'Rejected';
    return;
  }

  const allApproved = this.entries.every((e) => e.approvalStatus === 'Approved');
  this.approvalStatus = allApproved ? 'Approved' : 'Pending';
};

// Auto-recalculate before every save
classLogSchema.pre('save', function (next) {
  this.recalculateApprovalStatus();
  next();
});

module.exports = mongoose.model('ClassLog', classLogSchema);
