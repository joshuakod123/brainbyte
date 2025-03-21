// server/models/UserStreak.js
const mongoose = require('mongoose');

const UserStreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  highestStreak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: Date.now
  },
  activeDays: [{
    type: Date
  }],
  totalActiveDays: {
    type: Number,
    default: 0
  },
  badges: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    icon: {
      type: String
    },
    dateEarned: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to check if a user has a specific badge
UserStreakSchema.methods.hasBadge = function(badgeName) {
  return this.badges.some(badge => badge.name === badgeName);
};

// Pre-save middleware to update badges based on streak and activity
UserStreakSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = Date.now();
  
  // Check for badges based on streak
  const earnedBadges = [];
  
  // Streak badges
  if (this.currentStreak >= 30 && !this.hasBadge('unstoppable')) {
    earnedBadges.push({
      name: 'unstoppable',
      description: 'Maintained a 30-day streak',
      icon: '🔥'
    });
  } else if (this.currentStreak >= 14 && !this.hasBadge('electrifying')) {
    earnedBadges.push({
      name: 'electrifying',
      description: 'Maintained a 14-day streak',
      icon: '⚡'
    });
  } else if (this.currentStreak >= 7 && !this.hasBadge('stellar')) {
    earnedBadges.push({
      name: 'stellar',
      description: 'Maintained a 7-day streak',
      icon: '✨'
    });
  } else if (this.currentStreak >= 3 && !this.hasBadge('growing')) {
    earnedBadges.push({
      name: 'growing',
      description: 'Maintained a 3-day streak',
      icon: '🌱'
    });
  }
  
  // Activity badges (total days active)
  if (this.totalActiveDays >= 100 && !this.hasBadge('century')) {
    earnedBadges.push({
      name: 'century',
      description: 'Logged in for 100 days',
      icon: '🏆'
    });
  } else if (this.totalActiveDays >= 50 && !this.hasBadge('halfway')) {
    earnedBadges.push({
      name: 'halfway',
      description: 'Logged in for 50 days',
      icon: '🌟'
    });
  } else if (this.totalActiveDays >= 25 && !this.hasBadge('committed')) {
    earnedBadges.push({
      name: 'committed',
      description: 'Logged in for 25 days',
      icon: '👏'
    });
  } else if (this.totalActiveDays >= 10 && !this.hasBadge('regular')) {
    earnedBadges.push({
      name: 'regular',
      description: 'Logged in for 10 days',
      icon: '👍'
    });
  }
  
  // Award new badges
  if (earnedBadges.length > 0) {
    this.badges.push(...earnedBadges);
  }
  
  next();
});

module.exports = mongoose.model('UserStreak', UserStreakSchema);