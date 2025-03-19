const express = require('express');
const {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonsByCategory,
  updateLessonProgress
} = require('../controllers/lessons');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { trackProgress, checkPrerequisites } = require('../middleware/progress');

// Public routes
router.route('/').get(getLessons);
router.route('/category/:category').get(getLessonsByCategory);

// Protected routes for all authenticated users
router.route('/:id')
  .get(protect, checkPrerequisites, trackProgress, getLesson);

router.route('/:id/progress')
  .put(protect, updateLessonProgress);

// Admin-only routes
router.route('/')
  .post(protect, authorize('admin'), createLesson);

router.route('/:id')
  .put(protect, authorize('admin'), updateLesson)
  .delete(protect, authorize('admin'), deleteLesson);

module.exports = router;