const { writeSystemError } = require("../services/audit.service");

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const errorCode  = error.code || "INTERNAL_SERVER_ERROR";

  const message =
    statusCode >= 500
      ? "Internal server error"
      : error.message;

  // Persist to MongoDB system_error_logs (fire-and-forget, never throws)
  writeSystemError(error, req);

  res.status(statusCode).json({
    status: statusCode,
    message,
    error: {
      code: errorCode,
      message,
    },
    requestId: req.requestId,
  });
}

module.exports = {
  errorMiddleware,
};