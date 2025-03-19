const Lesson = require('../models/Lesson');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all lessons
// @route   GET /api/lessons
// @access  Public
exports.getLessons = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Lesson.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Lesson.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const lessons = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: lessons.length,
    pagination,
    data: lessons
  });
});

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Public
exports.getLesson = asyncHandler(async (req, res, next) => {
  const lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    return next(
      new ErrorResponse(`Lesson not found with id of ${req.params.id}`, 404)
    );
  }

  // Increment listeners count
  lesson.listeners += 1;
  await lesson.save();

  res.status(200).json({
    success: true,
    data: lesson
  });
});

// @desc    Create new lesson
// @route   POST /api/lessons
// @access  Private (Admin only)
exports.createLesson = asyncHandler(async (req, res, next) => {
  const lesson = await Lesson.create(req.body);

  res.status(201).json({
    success: true,
    data: lesson
  });
});

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private (Admin only)
exports.updateLesson = asyncHandler(async (req, res, next) => {
  let lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    return next(
      new ErrorResponse(`Lesson not found with id of ${req.params.id}`, 404)
    );
  }

  lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: lesson
  });
});

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Admin only)
exports.deleteLesson = asyncHandler(async (req, res, next) => {
  const lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    return next(
      new ErrorResponse(`Lesson not found with id of ${req.params.id}`, 404)
    );
  }

  await lesson.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get lessons by category
// @route   GET /api/lessons/category/:category
// @access  Public
exports.getLessonsByCategory = asyncHandler(async (req, res, next) => {
  const lessons = await Lesson.find({ category: req.params.category });

  res.status(200).json({
    success: true,
    count: lessons.length,
    data: lessons
  });
});

// @desc    Update user's lesson progress
// @route   PUT /api/lessons/:id/progress
// @access  Private
exports.updateLessonProgress = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  const userId = req.user.id;
  const { completed, score } = req.body;

  // Check if lesson exists
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    return next(
      new ErrorResponse(`Lesson not found with id of ${lessonId}`, 404)
    );
  }

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found`, 404));
  }

  // Check if user already has progress record for this lesson
  const progressIndex = user.progress.findIndex(
    p => p.lessonId.toString() === lessonId
  );

  if (progressIndex !== -1) {
    // Update existing progress
    user.progress[progressIndex].completed = completed || user.progress[progressIndex].completed;
    user.progress[progressIndex].lastAccessed = Date.now();
    
    if (score !== undefined) {
      user.progress[progressIndex].score = score;
    }
  } else {
    // Create new progress record
    user.progress.push({
      lessonId,
      completed: completed || false,
      lastAccessed: Date.now(),
      score: score || 0
    });
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: user.progress.find(p => p.lessonId.toString() === lessonId)
  });
});