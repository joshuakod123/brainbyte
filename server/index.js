// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/error');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || 'https://brainbyte.com' 
    : 'http://localhost:3000',
  credentials: true
}));

// Import routes with proper validation
const authRoutes = require('./routes/auth');
console.log('Auth routes type:', typeof authRoutes);

const userRoutes = require('./routes/users');
console.log('User routes type:', typeof userRoutes);

const lessonRoutes = require('./routes/lessons');
console.log('Lesson routes type:', typeof lessonRoutes);

const courseRoutes = require('./routes/courses');
console.log('Course routes type:', typeof courseRoutes);

const paymentRoutes = require('./routes/payments');
console.log('Payment routes type:', typeof paymentRoutes);

// Import streak routes
const streakRoutes = require('./routes/streaks');
console.log('Streak routes type:', typeof streakRoutes);

// Connect to MongoDB with improved error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/brainbyte', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // In development, continue without DB for frontend testing
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1); // Exit with failure in production
    }
  });

// Mount routes - only if they're valid middleware
if (typeof authRoutes === 'function') {
  app.use('/api/auth', authRoutes);
} else {
  console.error('Auth routes is not a valid middleware!');
}

if (typeof userRoutes === 'function') {
  app.use('/api/users', userRoutes);
} else {
  console.error('User routes is not a valid middleware!');
}

if (typeof lessonRoutes === 'function') {
  app.use('/api/lessons', lessonRoutes);
} else {
  console.error('Lesson routes is not a valid middleware!');
}

if (typeof courseRoutes === 'function') {
  app.use('/api/courses', courseRoutes);
} else {
  console.error('Course routes is not a valid middleware!');
}

if (typeof paymentRoutes === 'function') {
  app.use('/api/payments', paymentRoutes);
} else {
  console.error('Payment routes is not a valid middleware!');
}

// Mount streak routes
if (typeof streakRoutes === 'function') {
  app.use('/api/streaks', streakRoutes);
} else {
  console.error('Streak routes is not a valid middleware!');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Set up server with better error handling
const PORT = process.env.PORT || 5001;
let server;

try {
  server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

module.exports = server; // For testing purposes