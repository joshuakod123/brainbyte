// server/controllers/payments.js
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all payments for a user
// @route   GET /api/payments/user
// @access  Private
exports.getUserPayments = asyncHandler(async (req, res, next) => {
  const payments = await Payment.find({ userId: req.user.id })
    .populate({
      path: 'courseId',
      select: 'title price imageUrl'
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get a single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id).populate({
    path: 'courseId',
    select: 'title price imageUrl'
  });

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the payment or is admin
  if (payment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse('Not authorized to access this payment', 403)
    );
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Create a new payment
// @route   POST /api/payments/create
// @access  Private
exports.createPayment = asyncHandler(async (req, res, next) => {
  // Add user ID to request body
  req.body.userId = req.user.id;

  // Check if the course exists
  const course = await Course.findById(req.body.courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.body.courseId}`, 404)
    );
  }

  // Create payment
  const payment = await Payment.create(req.body);

  // If payment is successful, enroll the user in the course
  if (payment.status === 'completed') {
    await enrollUserInCourse(req.user.id, req.body.courseId);
  }

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Process payment webhook (for external payment providers)
// @route   POST /api/payments/webhook
// @access  Public
exports.processPaymentWebhook = asyncHandler(async (req, res, next) => {
  // This would handle webhook responses from payment providers like Stripe or PayPal
  const { paymentId, status, transactionId } = req.body;

  if (!paymentId) {
    return next(new ErrorResponse('No payment ID provided', 400));
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    return next(new ErrorResponse(`Payment not found with id of ${paymentId}`, 404));
  }

  // Update payment status
  payment.status = status;
  if (transactionId) {
    payment.transactionId = transactionId;
  }

  await payment.save();

  // If payment is successful, enroll the user in the course
  if (status === 'completed') {
    await enrollUserInCourse(payment.userId, payment.courseId);
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Check if user has paid for a course
// @route   GET /api/payments/check/:courseId
// @access  Private
exports.checkPaymentStatus = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  // Check if the course is free
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  if (!course.price || course.price === 0) {
    return res.status(200).json({
      success: true,
      isPaid: true,
      message: 'This is a free course'
    });
  }

  // Check if user is a premium member
  const user = await User.findById(userId);
  if (user.isPremium) {
    return res.status(200).json({
      success: true,
      isPaid: true,
      message: 'User has premium access'
    });
  }

  // Check for completed payment
  const payment = await Payment.findOne({
    userId,
    courseId,
    status: 'completed'
  });

  res.status(200).json({
    success: true,
    isPaid: !!payment,
    message: payment ? 'User has purchased this course' : 'User has not purchased this course'
  });
});

// @desc    Process a payment for a course
// @route   POST /api/payments/process
// @access  Private
exports.processPayment = asyncHandler(async (req, res, next) => {
  const { courseId, paymentMethod, cardDetails } = req.body;
  
  // Validate required fields
  if (!courseId || !paymentMethod) {
    return next(
      new ErrorResponse('Please provide courseId and paymentMethod', 400)
    );
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${courseId}`, 404)
    );
  }

  // Check if payment already exists
  const existingPayment = await Payment.findOne({
    userId: req.user.id,
    courseId,
    status: 'completed'
  });

  if (existingPayment) {
    return res.status(400).json({
      success: false,
      message: 'You have already purchased this course',
      data: existingPayment
    });
  }

  // In a real application, this is where you would integrate with a payment gateway
  // Like Stripe, PayPal, etc. to handle the actual payment processing
  
  // For this example, we'll simulate a successful payment
  const payment = await Payment.create({
    userId: req.user.id,
    courseId,
    amount: course.price,
    currency: 'USD',
    status: 'completed', // In a real app, this would be 'pending' until confirmed
    paymentMethod,
    transactionId: `tx_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
  });

  // Enroll the user in the course
  await enrollUserInCourse(req.user.id, courseId);

  res.status(200).json({
    success: true,
    data: payment
  });
});

// Helper function to enroll a user in a course after successful payment
const enrollUserInCourse = async (userId, courseId) => {
  try {
    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    
    if (existingEnrollment) {
      // Update enrollment to isPaid if not already
      if (!existingEnrollment.isPaid) {
        existingEnrollment.isPaid = true;
        await existingEnrollment.save();
      }
      return existingEnrollment;
    }
    
    // Create new enrollment
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      isPaid: true
    });

    // Increment course students count
    const course = await Course.findById(courseId);
    if (course) {
      course.students += 1;
      await course.save();
    }

    return enrollment;
  } catch (error) {
    console.error(`Error enrolling user ${userId} in course ${courseId}:`, error);
    throw error;
  }
};