const { verifyAccessToken } = require("../utils/jwt");
const { AppError } = require("../utils/errors");
const env = require("../config/env");
const { pool } = require("../config/postgres");

async function authenticate(req, res, next) {
  try {
    let accessToken = req.cookies?.accessToken;

    if (!accessToken && req.headers.authorization?.startsWith("Bearer ")) {
      accessToken = req.headers.authorization.substring(7).trim();
    }

    if (!accessToken && req.query?.token) {
      accessToken = req.query.token;
    }

    // In development mode, allow direct browser/Postman testing for /stream
    if (!accessToken && env.nodeEnv === "development") {
      if (req.query?.userId) {
        req.user = { id: req.query.userId };
        return next();
      }
      if (req.path === "/stream") {
        try {
          const userResult = await pool.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
          if (userResult.rows.length > 0) {
            req.user = { id: userResult.rows[0].id };
            return next();
          }
        } catch (dbErr) {
          // ignore and proceed to standard auth check
        }
      }
    }

    if (!accessToken) {
      throw new AppError(
        401,
        "401",
        "Access token is required"
      );
    }

    const payload = verifyAccessToken(accessToken);

    req.user = {
      id: payload.sub,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError(
        401,
        "401",
        "Invalid or expired access token"
      )
    );
  }
}

module.exports = {
  authenticate
};