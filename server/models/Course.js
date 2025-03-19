// server/models/Course.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [50, 'Title cannot be more than 50 characters']
  },
  subtitle: {
    type: String,
    required: [true, 'Please add a subtitle'],
    trim: true,
    maxlength: [100, 'Subtitle cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price for the course']
  },
  discountPrice: {
    type: Number
  },
  imageUrl: {
    type: String,
    default: 'default-course.jpg'
  },
  author: {
    type: String,
    required: [true, 'Please add an author']
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: [
      'Physics',
      'Chemistry',
      'Biology',
      'Astronomy',
      'Earth Science',
      'Mathematics',
      'Technology',
      'Art'
    ]
  },
  level: {
    type: String,
    required: [true, 'Please specify a difficulty level'],
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  totalDuration: {
    type: Number, // In minutes
    default: 0
  },
  students: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
    default: 4.5
  },
  published: {
    type: Boolean,
    default: true
  },
  slug: {
    type: String,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a slug from the title
CourseSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    next();
    return;
  }
  
  this.slug = this.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-');
  
  next();
});

module.exports = mongoose.model('Course', CourseSchema);