const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
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
  let query = Course.find(JSON.parse(queryStr));

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
  const total = await Course.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Populate lessons
  query = query.populate({
    path: 'lessons',
    select: 'title duration'
  });

  // Executing query
  const courses = await query;

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
    count: courses.length,
    pagination,
    data: courses
  });
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate({
    path: 'lessons',
    select: 'title duration description order'
  });

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin only)
exports.createCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course
  });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin only)
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin only)
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get courses by category
// @route   GET /api/courses/category/:category
// @access  Public
exports.getCoursesByCategory = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({ category: req.params.category });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses
  });
});

// @desc    Get user's enrolled courses
// @route   GET /api/courses/user
// @access  Private
exports.getUserCourses = asyncHandler(async (req, res, next) => {
  const enrollments = await Enrollment.find({ userId: req.user.id }).populate({
    path: 'courseId',
    select: 'title subtitle description imageUrl author category level totalDuration rating'
  });

  // Format the response
  const courses = enrollments.map(enrollment => {
    return {
      ...enrollment.courseId._doc,
      enrollmentId: enrollment._id,
      progress: enrollment.progress,
      enrollmentDate: enrollment.enrollmentDate,
      lastAccessedDate: enrollment.lastAccessedDate,
      status: enrollment.status,
      isPaid: enrollment.isPaid
    };
  });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses
  });
});

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
exports.enrollInCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({ userId, courseId });
  if (existingEnrollment) {
    return res.status(200).json({
      success: true,
      message: 'User already enrolled in this course',
      data: existingEnrollment
    });
  }

  // Create enrollment
  const enrollment = await Enrollment.create({
    userId,
    courseId,
    // If the course is free or the user has made a payment, set isPaid to true
    isPaid: course.price === 0 // You'll need to check payment status as well
  });

  // Increment course students count
  course.students += 1;
  await course.save();

  res.status(201).json({
    success: true,
    data: enrollment
  });
});

// @desc    Update user's course progress
// @route   PUT /api/courses/:id/progress
// @access  Private
exports.updateCourseProgress = asyncHandler(async (req, res, next) => {
  const courseId = req.params.id;
  const userId = req.user.id;
  const { progress, status } = req.body;

  // Find the enrollment
  let enrollment = await Enrollment.findOne({ userId, courseId });

  if (!enrollment) {
    return next(
      new ErrorResponse(`Enrollment not found for this course`, 404)
    );
  }

  // Update fields
  if (progress !== undefined) {
    enrollment.progress = progress;
  }

  if (status) {
    enrollment.status = status;
  }

  // If progress is 100%, update status to completed and set completion date
  if (enrollment.progress === 100) {
    enrollment.status = 'completed';
    enrollment.completionDate = Date.now();
  }

  // Always update lastAccessedDate
  enrollment.lastAccessedDate = Date.now();

  await enrollment.save();

  res.status(200).json({
    success: true,
    data: enrollment
  });
});