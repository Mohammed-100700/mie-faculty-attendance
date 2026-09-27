const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['Lecturer', 'Academic Manager', 'Executive Office', 'Super Admin'],
      default: 'Lecturer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Incremented to invalidate every JWT previously issued for this user
    tokenVersion: {
      type: Number,
      default: 0,
      select: true,
      validate: {
        validator: Number.isInteger,
        message: 'Token version must be an integer',
      },
    },
    branches: [
      {
        type: String,
        trim: true,
      },
    ],
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    // Branch this Academic Manager oversees (null for Lecturers)
    managedBranch: {
      type: String,
      trim: true,
      default: null,
    },
    // Email settings for sending marks
    emailAppPassword: { type: String, default: null, select: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Explicit allow-list of user fields safe to return to clients and attach to
// req.user. Never add password, emailAppPassword, resetPasswordToken or
// resetPasswordExpires to this projection.
userSchema.statics.SAFE_FIELDS =
  '_id name email phone role isActive branches subjects managedBranch createdAt tokenVersion';

module.exports = mongoose.model('User', userSchema);
