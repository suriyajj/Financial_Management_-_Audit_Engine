const { AppError } = require("../utils/errors");
const accountRepository = require("../repositories/account.repository");

function validateInitialBalance(initialBalance) {
  const balance = Number(initialBalance);

  if (!Number.isFinite(balance) || balance < 0) {
    throw new AppError(
      400,
      "400",
      "Balance must be zero or greater"
    );
  }

  return balance;
}

function generateAccountNumber() {
  return `IN${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

async function create(userId, initialBalance = 0) {
  const balance = validateInitialBalance(initialBalance);
  const accountNumber = generateAccountNumber();

  return accountRepository.create(
    userId,
    accountNumber,
    balance.toFixed(2)
  );
}

async function list(userId) {
  return accountRepository.listByUser(userId);
}

module.exports = {
  create,
  list,
};