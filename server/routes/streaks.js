// server/routes/streaks.js
const express = require('express');
const {
  getUserStreak,
  updateStreak,
  getUserBadges,
  resetStreak
} = require('../controllers/streakController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Routes
router.route('/').get(getUserStreak);
router.route('/update').put(updateStreak);
router.route('/badges').get(getUserBadges);
router.route('/reset').delete(authorize('admin'), resetStreak);

module.exports = router;