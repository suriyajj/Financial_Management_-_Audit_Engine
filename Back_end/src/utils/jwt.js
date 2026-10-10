const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../config/env");

function createAccessToken(userId) {
  return jwt.sign(
    {
      sub: userId,
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn,
    }
  );
}

function createRefreshToken(userId, tokenVersion) {
  return jwt.sign(
    {
      sub: userId,
      jti: crypto.randomUUID(),
      ver: tokenVersion,
    },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(
    token,
    env.jwt.accessSecret
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(
    token,
    env.jwt.refreshSecret
  );
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};