const crypto = require("crypto");

function requestIdMiddleware(req, res, next) {
  const requestId = req.get("X-Request-ID") || crypto.randomUUID();

  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);

  next();
}

module.exports = {
  requestIdMiddleware,
};