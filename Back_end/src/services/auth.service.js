const bcrypt = require("bcrypt");
const { pool } = require("../config/postgres");
const { AppError } = require("../utils/errors");
const userRepository = require("../repositories/user.repository");
const revokedRefreshTokenRepository = require("../repositories/revokedRefreshToken.repository");
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { hashToken } = require("../utils/hash");


function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

//Register a new user 
async function register(name, email, password) {
  //The name must in body and valid e,mail is requird
  //Strong password is required (at least 8 characters, one uppercase, one lowercase, one number, and one special character)
  //Email should be unique 
  //The email must be valid and unique

  if (!name || !email || !isStrongPassword(password)) {
    throw new AppError(400, "INVALID_INPUT", "Name, valid email and strong password are required");
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "Email already registered");
  }

  const hash = await bcrypt.hash(password, 12);
  return userRepository.createUser(name, email, hash);
}


//Login which returns access token and refresh token

async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return {
    user,
    accessToken: createAccessToken(user.id),
    refreshToken: createRefreshToken(user.id, user.token_version),
  };
}




async function refresh(rawRefreshToken) {
  // 1️⃣ Verify JWT signature & expiry safely
  const payload = verifyRefreshTokenSafe(rawRefreshToken);

  // 2️⃣ Check revocation list
  const tokenHash = hashToken(rawRefreshToken);
  const isRevoked = await revokedRefreshTokenRepository.isRevoked(tokenHash);
  if (isRevoked) {
    await invalidateUserSessions(payload.sub);
    throw new AppError(401, "TOKEN_REUSED", "Revoked refresh token was reused; sessions invalidated");
  }

  // 3️⃣ Load user and ensure token version matches
  const user = await userRepository.findById(payload.sub);
  if (!user || payload.ver !== user.token_version) {
    throw new AppError(401, "TOKEN_INVALID", "Refresh token is no longer valid");
  }

  // 4️⃣ Revoke the current token to prevent replay attacks
  await revokeRefreshToken(user.id, tokenHash, new Date(payload.exp * 1000));

  // 5️⃣ Issue fresh tokens (controller will set them as cookies)
  return {
    accessToken: createAccessToken(user.id),
    refreshToken: createRefreshToken(user.id, user.token_version),
  };
}


//verify the refresh token and return the payload


function verifyRefreshTokenSafe(token) {
  try {
    return verifyRefreshToken(token);
  } catch (err) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token");
  }
}


//increase the version of an  token by old_version+1

async function invalidateUserSessions(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await userRepository.incrementTokenVersion(userId, client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => { });
    throw e;
  } finally {
    client.release();
  }
}

//adding revoked refresh token into an db and mark it as revoked 
//if it is comes in it throws error  

async function revokeRefreshToken(userId, tokenHash, expiresAt) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await revokedRefreshTokenRepository.revoke(userId, tokenHash, expiresAt, client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => { });
    throw e;
  } finally {
    client.release();
  }
}

//generate access token if the refresh is alive and not revoked
async function refreshUsingToken(refreshToken) {
  const payload = verifyRefreshTokenSafe(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const alreadyRevoked = await revokedRefreshTokenRepository.isRevoked(tokenHash);
  if (alreadyRevoked) {
    throw new AppError(401, "REFRESH_TOKEN_REVOKED", "Refresh token has been revoked already!");
  }

  const accessToken = createAccessToken(payload.sub);
  return { accessToken };
}

//revokes the tokens from the user and mark it as an revoked
async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    await revokedRefreshTokenRepository.revoke(payload.sub, tokenHash, new Date(payload.exp * 1000));
  } catch (_) {
    // Swallow errors – logout must be idempotent.
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  refreshUsingToken,
};
