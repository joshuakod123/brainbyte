// server/controllers/streakController.js
const UserStreak = require('../models/UserStreak');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get user streak data
// @route   GET /api/streaks/
// @access  Private
exports.getUserStreak = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  
  let streak = await UserStreak.findOne({ userId });
  
  if (!streak) {
    // If no streak record exists, create one
    streak = await UserStreak.create({
      userId,
      currentStreak: 1,
      highestStreak: 1,
      lastActiveDate: new Date(),
      activeDays: [new Date()],
      totalActiveDays: 1
    });
  }
  
  res.status(200).json({
    success: true,
    data: streak
  });
});

// @desc    Update user streak
// @route   PUT /api/streaks/update
// @access  Private
exports.updateStreak = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  
  // Find the user's streak record
  let streak = await UserStreak.findOne({ userId });
  
  if (!streak) {
    // If no streak record exists, create one
    streak = await UserStreak.create({
      userId,
      currentStreak: 1,
      highestStreak: 1,
      lastActiveDate: new Date(),
      activeDays: [new Date()],
      totalActiveDays: 1
    });
  } else {
    // Check if this is a new day
    const now = new Date();
    const lastActive = new Date(streak.lastActiveDate);
    
    // Calculate the difference in days
    const timeDiff = now - lastActive;
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // Format today's date to use as a string key for checking if already recorded
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already recorded today
    const alreadyRecordedToday = streak.activeDays.some(date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    
    if (!alreadyRecordedToday) {
      // If it's the next consecutive day (1 day difference)
      if (dayDiff === 1) {
        streak.currentStreak += 1;
        streak.highestStreak = Math.max(streak.currentStreak, streak.highestStreak);
      } 
      // If more than 1 day has passed, reset streak
      else if (dayDiff > 1) {
        streak.currentStreak = 1;
      }
      // If it's the same day, we don't increment the streak
      
      // Record activity for today
      streak.activeDays.push(today);
      streak.totalActiveDays += 1;
      streak.lastActiveDate = now;
      
      // Save updated streak
      await streak.save();
    }
  }
  
  res.status(200).json({
    success: true,
    data: streak
  });
});

// @desc    Get user badges
// @route   GET /api/streaks/badges
// @access  Private
exports.getUserBadges = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  
  const streak = await UserStreak.findOne({ userId });
  
  if (!streak) {
    return next(new ErrorResponse('No streak data found for this user', 404));
  }
  
  res.status(200).json({
    success: true,
    data: streak.badges
  });
});

// @desc    Reset user streak (admin or for testing)
// @route   DELETE /api/streaks/reset
// @access  Private/Admin
exports.resetStreak = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  
  // Check if admin or same user
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new ErrorResponse('Not authorized to reset this streak', 403));
  }
  
  await UserStreak.findOneAndDelete({ userId });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});