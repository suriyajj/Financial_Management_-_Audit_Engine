const { pool } = require("../config/postgres");

async function findByEmail(email) {
  const normalizedEmail = email.toLowerCase();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash,
        token_version,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        token_version
      FROM users
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createUser(name, email, passwordHash) {
  const normalizedEmail = email.toLowerCase();

  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        email
    `,
    [name, normalizedEmail, passwordHash]
  );

  return result.rows[0];
}

async function incrementTokenVersion(id, client = pool) {
  const result = await client.query(
    `
      UPDATE users
      SET
        token_version = token_version + 1,
        updated_at = NOW()
      WHERE id = $1
      RETURNING token_version
    `,
    [id]
  );

  return result.rows[0];
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  incrementTokenVersion,
};