const { pool } = require("../config/postgres");

async function findByIdempotency(
  client,
  idempotencyKey,
  fromAccountId
) {
  const result = await client.query(
    `
      SELECT
        id,
        from_account_id,
        to_account_id,
        amount,
        currency,
        status,
        idempotency_key,
        created_at
      FROM money_transfers
      WHERE idempotency_key = $1
        AND from_account_id = $2
    `,
    [idempotencyKey, fromAccountId]
  );

  return result.rows[0] || null;
}

async function create(client, transferData) {
  const result = await client.query(
    `
      INSERT INTO money_transfers (
        id,
        from_account_id,
        to_account_id,
        amount,
        currency,
        status,
        idempotency_key
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'COMPLETED',
        $6
      )
      RETURNING
        id,
        from_account_id,
        to_account_id,
        amount,
        currency,
        status,
        idempotency_key,
        created_at
    `,
    [
      transferData.id,
      transferData.fromAccountId,
      transferData.toAccountId,
      transferData.amount,
      transferData.currency,
      transferData.idempotencyKey,
    ]
  );

  return result.rows[0];
}

async function listForUser(userId) {
  const result = await pool.query(
    `
      SELECT
        t.id,
        t.amount,
        t.currency,
        t.status,
        t.created_at,
        fa.account_number AS from_account,
        ta.account_number AS to_account,
        fu.name AS from_user,
        tu.name AS to_user
      FROM money_transfers AS t
      JOIN bank_accounts AS fa
        ON fa.id = t.from_account_id
      JOIN bank_accounts AS ta
        ON ta.id = t.to_account_id
      JOIN users AS fu
        ON fu.id = fa.user_id
      JOIN users AS tu
        ON tu.id = ta.user_id
      WHERE fa.user_id = $1
         OR ta.user_id = $1
      ORDER BY t.created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

module.exports = {
  findByIdempotency,
  create,
  listForUser,
};