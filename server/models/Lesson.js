// server/models/Lesson.js
const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
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
  duration: {
    type: Number,
    required: [true, 'Please add duration in minutes']
  },
  imageUrl: {
    type: String,
    default: 'default-lesson.jpg'
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
  sections: [{
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    quizzes: [{
      question: {
        type: String
      },
      options: [{
        type: String
      }],
      correctAnswer: {
        type: Number
      }
    }]
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  listeners: {
    type: Number,
    default: 0
  },
  tags: [String],
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
LessonSchema.pre('save', function(next) {
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

module.exports = mongoose.model('Lesson', LessonSchema);