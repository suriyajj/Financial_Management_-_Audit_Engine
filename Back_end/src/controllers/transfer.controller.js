const transferService = require("../services/transfer.service");
const { AppError } = require("../utils/errors");
const accountRepository = require("../repositories/account.repository");





async function create(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next(
        new AppError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required"
        )
      );
    }

    // Accept the key from the header (preferred) or from the request body as a fallback.
    // If the client does not supply one, auto-generate a UUID server-side.
    const idempotencyKey = req.get("Idempotency-Key") || req.body.idempotencyKey || require("crypto").randomUUID();

    const fromAccount = await accountRepository.findByNumber(req.body.fromAccountNumber);
    if (!fromAccount) {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Source account not found");
    }
    if (fromAccount.user_id !== req.user.id) {
      throw new AppError(403, "ACCOUNT_ACCESS_DENIED", "You do not have permission to transfer from this account");
    }
    const toAccount = await accountRepository.findByNumber(req.body.toAccountNumber);
    if (!toAccount) {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Destination account not found");
    }
    const transfer = await transferService.transfer(
      req.user.id,
      fromAccount.id,
      toAccount.id,
      req.body.amount,
      idempotencyKey
    );

    res.status(201).json({
      status: 201,
      message: "Transfer completed successfully",
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const transfers = await transferService.list(req.user.id);

    res.status(200).json({
      status: 200,
      message: "Transactions fetched successfully",
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
};