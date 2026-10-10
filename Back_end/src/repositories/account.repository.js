const { pool } = require("../config/postgres");

async function create(
  userId,
  accountNumber,
  balance = 0,
  client = pool
) {
  const result = await client.query(
    `
      WITH created_account AS (
        INSERT INTO bank_accounts (
          user_id,
          account_number,
          balance
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          user_id,
          account_number,
          balance,
          currency,
          created_at
      )
      SELECT
        created_account.id,
        created_account.account_number,
        created_account.balance,
        created_account.currency,
        created_account.created_at,
        created_account.user_id AS owner_id,
        users.name AS owner_name
      FROM created_account
      JOIN users ON users.id = created_account.user_id
    `,
    [userId, accountNumber, balance]
  );

  return result.rows[0];
}

async function listByUser(userId) {
  const result = await pool.query(
    `
      SELECT
        bank_accounts.id,
        bank_accounts.account_number,
        bank_accounts.balance,
        bank_accounts.currency,
        bank_accounts.created_at,
        bank_accounts.user_id AS owner_id,
        users.name AS owner_name
      FROM bank_accounts
      JOIN users ON users.id = bank_accounts.user_id
      WHERE bank_accounts.user_id = $1
      ORDER BY bank_accounts.created_at
    `,
    [userId]
  );

  return result.rows;
}

async function findOwnedForUpdate(client, accountId, userId) {
  const result = await client.query(
    `
      SELECT
        id,
        user_id,
        balance,
        currency
      FROM bank_accounts
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
    `,
    [accountId, userId]
  );

  return result.rows[0] || null;
}

async function findForUpdate(client, accountId) {
  const result = await client.query(
    `
      SELECT
        id,
        user_id,
        balance,
        currency
      FROM bank_accounts
      WHERE id = $1
      FOR UPDATE
    `,
    [accountId]
  );

  return result.rows[0] || null;
}

async function findByNumber(accountNumber, client = pool) {
  const result = await client.query(
    `
      SELECT id, user_id, balance, currency
      FROM bank_accounts
      WHERE account_number = $1
    `,
    [accountNumber]
  );
  return result.rows[0] || null;
}

// Export the new function

module.exports = {
  create,
  listByUser,
  findOwnedForUpdate,
  findForUpdate,
  findByNumber,
};