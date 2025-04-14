const ErrorResponse = require('../utils/errorResponse');

/**
 * Custom error handler middleware
 * Formats errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered for ${field}. Please use another value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Return formatted error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    // Include stack trace only in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
