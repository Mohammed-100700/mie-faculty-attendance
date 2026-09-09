const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    mieStudentId: {
      type: String,
      required: true,
      unique: true,
    },
    ncukId: {
      type: String,
      trim: true,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

// Generate a human-readable MIE Student ID from a mongoose ObjectId.
 // The ObjectId becomes the document _id. The suffix is derived from a stable
 // portion of that ObjectId's hex string, and the year portion comes from the
 // ObjectId's generation timestamp. No counter collection, countDocuments,
 // name, branch, or batch is used.
 // The 8-character suffix is deterministic and collision-resistant, but not
 // guaranteed unique. The database unique index on mieStudentId is the final
 // safeguard. Future creation logic will retry with a new ObjectId on
 // duplicate-key collision.
 studentSchema.statics.generateMieStudentId = function (objectId) {
   const idHex = objectId.toString();
   // Extract year (last 2 digits) from ObjectId generation timestamp
   const year = new Date(objectId.getTimestamp()).getFullYear().toString().slice(-2);
   // Take 8 hex characters from positions 16-24 of the ObjectId hex string.
   // These are the PID + counter bytes (the last 4 bytes of the ObjectId).
   const suffix = idHex.substring(16, 24).toUpperCase();
   return `MIE-${year}-${suffix}`;
 };

// Normalize ncukId: null/undefined/blank → null; non-empty → trimmed string.
 studentSchema.pre('validate', function (next) {
   if (this.ncukId != null && this.ncukId.trim() === '') {
     this.ncukId = null;
   } else if (this.ncukId != null) {
     this.ncukId = this.ncukId.trim();
   }
   next();
 });

 // Unique partial index: only one per ncukId string value.
 // Multiple students with ncukId=null are allowed.
 studentSchema.index(
   { ncukId: 1 },
   {
     unique: true,
     partialFilterExpression: {
       ncukId: { $type: 'string' },
     },
   }
 );

 module.exports = mongoose.model('Student', studentSchema);