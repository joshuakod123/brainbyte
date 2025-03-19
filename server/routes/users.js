const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProgress
} = require('../controllers/users');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Add middleware to protect and authorize routes
router.use(protect);

// Routes accessible by admin only
router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

// This route is accessible by both admin and the user themselves
router.route('/:id/progress').get(getUserProgress);

module.exports = router;