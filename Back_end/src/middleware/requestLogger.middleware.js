const { getMongoDB } = require("../config/mongodb");
const { sanitize } = require("../utils/sanitizeLog");

function requestLoggerMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const applicationLog = sanitize({
      requestId: req.requestId,
      // userId is available only on authenticated routes
      userId: req.user?.id || null,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      createdAt: new Date(),
    });

    try {
      const database = getMongoDB();

      database
        .collection("application_logs")
        .insertOne(applicationLog)
        .catch(() => {
          // Logging failures must not affect the completed request.
        });
    } catch (error) {
      // MongoDB may not be available during shutdown.
    }
  });

  next();
}

module.exports = {
  requestLoggerMiddleware,
};