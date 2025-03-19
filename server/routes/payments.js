const express = require('express');
const {
  getUserPayments,
  createPayment,
  processPaymentWebhook,
  checkPaymentStatus,
  getPayment,
  processPayment
} = require('../controllers/payments');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Public webhooks
router.route('/webhook').post(processPaymentWebhook);

// Protected routes - require authentication
router.use(protect);

router.route('/user').get(getUserPayments);
router.route('/create').post(createPayment);
router.route('/process').post(processPayment);
router.route('/check/:courseId').get(checkPaymentStatus);
router.route('/:id').get(getPayment);

module.exports = router;