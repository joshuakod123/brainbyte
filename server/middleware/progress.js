// server/middleware/progress.js
const asyncHandler = require('./async');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Middleware to track user's lesson progress
 * This middleware should be applied after protect middleware
 */
exports.trackProgress = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  
  // Skip tracking for non-GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Skip if no user is authenticated
  if (!req.user || !req.user.id) {
    return next();
  }
  
  try {
    // Find the lesson
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      return next(new ErrorResponse(`Lesson not found with id of ${lessonId}`, 404));
    }
    
    // Find the user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    // Check if user already has progress record for this lesson
    const progressIndex = user.progress.findIndex(
      p => p.lessonId.toString() === lessonId
    );
    
    if (progressIndex !== -1) {
      // Update last accessed timestamp
      user.progress[progressIndex].lastAccessed = Date.now();
    } else {
      // Create new progress record
      user.progress.push({
        lessonId,
        completed: false,
        lastAccessed: Date.now(),
        score: 0
      });
    }
    
    // Save user without validation
    await user.save({ validateBeforeSave: false });
    
    next();
  } catch (error) {
    // Log error but don't interrupt the request
    console.error('Error tracking lesson progress:', error);
    next();
  }
});

/**
 * Middleware to check if user has completed prerequisites
 * This middleware should be applied after protect middleware
 */
exports.checkPrerequisites = asyncHandler(async (req, res, next) => {
  const lessonId = req.params.id;
  
  // Skip for non-GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Skip if no user is authenticated
  if (!req.user || !req.user.id) {
    return next();
  }
  
  try {
    // Find the lesson with prerequisites populated
    const lesson = await Lesson.findById(lessonId).populate('prerequisites');
    
    if (!lesson) {
      return next(new ErrorResponse(`Lesson not found with id of ${lessonId}`, 404));
    }
    
    // If no prerequisites, continue
    if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
      return next();
    }
    
    // Find the user with progress
    const user = await User.findById(req.user.id);
    
    // Get list of completed lesson IDs
    const completedLessonIds = user.progress
      .filter(p => p.completed)
      .map(p => p.lessonId.toString());
    
    // Check if all prerequisites are completed
    const allPrerequisitesCompleted = lesson.prerequisites.every(
      prerequisite => completedLessonIds.includes(prerequisite._id.toString())
    );
    
    if (!allPrerequisitesCompleted) {
      // Add a response flag instead of blocking access
      res.locals.prerequisitesCompleted = false;
      res.locals.incompletePrerequisites = lesson.prerequisites.filter(
        prerequisite => !completedLessonIds.includes(prerequisite._id.toString())
      );
    } else {
      res.locals.prerequisitesCompleted = true;
    }
    
    next();
  } catch (error) {
    // Log error but don't interrupt the request
    console.error('Error checking prerequisites:', error);
    next();
  }
});