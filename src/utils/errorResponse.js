/**
 * Custom error response class
 * Extends the standard Error object with status code
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;
