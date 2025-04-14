/**
 * Async handler to wrap async route handlers
 * Eliminates need for try/catch blocks in controller functions
 * @param {Function} fn Function to be wrapped
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
