// server/models/Enrollment.js
const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  lastAccessedDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  progress: {
    type: Number, // Percentage of course completed
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped'],
    default: 'active'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  certificate: {
    issued: {
      type: Boolean,
      default: false
    },
    issuedDate: {
      type: Date
    },
    certificateUrl: {
      type: String
    }
  }
});

// Create a compound index to ensure a user can only enroll in a course once
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', EnrollmentSchema);