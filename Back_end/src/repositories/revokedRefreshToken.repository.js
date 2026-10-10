const { pool } = require("../config/postgres");

async function revoke(
  userId,
  tokenHash,
  expiresAt,
  client = pool
) {
  await client.query(
    `
      INSERT INTO revoked_refresh_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (token_hash) DO NOTHING
    `,
    [userId, tokenHash, expiresAt]
  );
}

async function isRevoked(tokenHash) {
  const result = await pool.query(
    `
      SELECT 1
      FROM revoked_refresh_tokens
      WHERE token_hash = $1
    `,
    [tokenHash]
  );

  return result.rowCount > 0;
}

async function removeExpired() {
  const result = await pool.query(
    `
      DELETE FROM revoked_refresh_tokens
      WHERE expires_at <= NOW()
    `
  );

  return result.rowCount;
}

module.exports = {
  revoke,
  isRevoked,
  removeExpired,
};