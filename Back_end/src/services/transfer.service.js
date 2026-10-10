const crypto = require("crypto");

const { pool } = require("../config/postgres");
const accountRepository = require("../repositories/account.repository");
const transferRepository = require("../repositories/transfer.repository");
const { AppError } = require("../utils/errors");
const { writeAnalyticalEvent } = require("./audit.service");

function validateTransferInput(
  fromAccountId,
  toAccountId,
  amount,
  idempotencyKey
) {
  const value = Number(amount);

  if (
    typeof fromAccountId !== "string" ||
    typeof toAccountId !== "string" ||
    fromAccountId === toAccountId ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isSafeInteger(Math.round(value * 100)) ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length === 0 ||
    idempotencyKey.length > 100
  ) {
    throw new AppError(
      400,
      "INVALID_TRANSFER",
      "Valid source, destination, positive amount and Idempotency-Key are required"
    );
  }

  return value;
}

async function lockTransferAccounts(
  client,
  fromAccountId,
  toAccountId
) {
  // Always acquire row locks in UUID order.
  // This reduces the possibility of deadlocks when opposite
  // transfers happen concurrently.
  const accountIds = [
    fromAccountId,
    toAccountId,
  ].sort();

  const firstAccount = await accountRepository.findForUpdate(
    client,
    accountIds[0]
  );

  const secondAccount = await accountRepository.findForUpdate(
    client,
    accountIds[1]
  );


  if (!firstAccount || !secondAccount) {
    throw new AppError(
      404,
      "ACCOUNT_NOT_FOUND",
      "Account not found"
    );
  }

  const sender =
    firstAccount.id === fromAccountId
      ? firstAccount
      : secondAccount;

  const receiver =
    firstAccount.id === toAccountId
      ? firstAccount
      : secondAccount;

  return {
    sender,
    receiver,
  };
}



function validateTransferAccounts(
  sender,
  receiver,
  userId,
  amount
) {
  if (sender.user_id !== userId) {
    throw new AppError(
      403,
      "ACCOUNT_ACCESS_DENIED",
      "You can transfer only from your own account"
    );
  }



  if (sender.currency !== receiver.currency) {
    throw new AppError(
      400,
      "CURRENCY_MISMATCH",
      "Accounts must use the same currency"
    );
  }

  if (Number(sender.balance) < amount) {
    throw new AppError(
      422,
      "INSUFFICIENT_BALANCE",
      "Insufficient account balance"
    );
  }
}

async function updateBalances(
  client,
  sender,
  receiver,
  amount
) {
  await client.query(
    `
      UPDATE bank_accounts
      SET balance = balance - $1
      WHERE id = $2
    `,
    [amount, sender.id]
  );

  await client.query(
    `
      UPDATE bank_accounts
      SET balance = balance + $1
      WHERE id = $2
    `,
    [amount, receiver.id]
  );
}

async function createTransferAndOutboxEvent(
  client,
  sender,
  receiver,
  amount,
  idempotencyKey
) {
  const transferId = crypto.randomUUID();
  const formattedAmount = amount.toFixed(2);

  const transfer = await transferRepository.create(client, {
    id: transferId,
    fromAccountId: sender.id,
    toAccountId: receiver.id,
    amount: formattedAmount,
    currency: sender.currency,
    idempotencyKey,
  });

  const payload = {
    transferId,
    fromAccountId: sender.id,
    toAccountId: receiver.id,
    fromUserId: sender.user_id,
    toUserId: receiver.user_id,
    amount: formattedAmount,
    currency: sender.currency,
    status: "COMPLETED",
  };

  await client.query(
    `
      INSERT INTO outbox_events (
        event_type,
        aggregate_id,
        payload
      )
      VALUES (
        'TRANSFER_CREATED',
        $1,
        $2
      )
    `,
    [transferId, payload]
  );

  return transfer;
}

async function transfer(
  userId,
  fromAccountId,
  toAccountId,
  amount,
  idempotencyKey
) {
  const value = validateTransferInput(
    fromAccountId,
    toAccountId,
    amount,
    idempotencyKey
  );

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const existingTransfer =
      await transferRepository.findByIdempotency(
        client,
        idempotencyKey,
        fromAccountId
      );

    if (existingTransfer) {
      await client.query("COMMIT");
      return existingTransfer;
    }

    const { sender, receiver } =
      await lockTransferAccounts(
        client,
        fromAccountId,
        toAccountId
      );

    validateTransferAccounts(
      sender,
      receiver,
      userId,
      value
    );

    await updateBalances(
      client,
      sender,
      receiver,
      value
    );

    const transferRecord =
      await createTransferAndOutboxEvent(
        client,
        sender,
        receiver,
        value,
        idempotencyKey
      );

    await client.query("COMMIT");

    // Emit analytical events for both parties (fire-and-forget)
    const meta = {
      transferId: transferRecord.id,
      fromAccountId,
      toAccountId,
      amount: value,
      currency: sender.currency,
    };
    writeAnalyticalEvent("TRANSFER_COMPLETED", sender.user_id, { ...meta, role: "SENDER" });
    writeAnalyticalEvent("TRANSFER_RECEIVED", receiver.user_id, { ...meta, role: "RECEIVER" });

    return transferRecord;
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => { });
    }

    if (error && error.code === "23505") {
      throw new AppError(
        409,
        "DUPLICATE_TRANSFER",
        "A transfer with this Idempotency-Key already exists"
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

async function list(userId) {
  return transferRepository.listForUser(userId);
}

module.exports = {
  transfer,
  list
};