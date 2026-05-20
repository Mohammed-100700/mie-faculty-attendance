const mongoose = require('mongoose');

const qrTokenSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      enum: ['Dhanmondi', 'Uttara'],
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('QRToken', qrTokenSchema);
