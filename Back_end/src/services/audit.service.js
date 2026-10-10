const { getMongoDB } = require("../config/mongodb");
const auditEmitter = require("../utils/auditEmitter");

// ── Transfer audit log ────────────────────────────────────────────────────────

async function writeTransferAudit(event) {
  const payload = event.payload;

  const auditDocument = {
    _id: event.id,
    eventType: event.event_type,

    userIds: [
      payload.fromUserId,
      payload.toUserId,
    ],

    transferId: payload.transferId,

    fromAccountId: payload.fromAccountId,
    toAccountId: payload.toAccountId,

    fromUserId: payload.fromUserId,
    toUserId: payload.toUserId,

    amount: payload.amount,
    currency: payload.currency,
    status: payload.status,

    createdAt: new Date(),
  };

  try {
    const database = getMongoDB();
    await database.collection("audit_logs").insertOne(auditDocument);
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }

  // Broadcast to active SSE streams immediately
  try {
    auditEmitter.emit("audit_log", auditDocument);
  } catch (emitError) {
    // Non-fatal
  }
}

// ── System error log ──────────────────────────────────────────────────────────

async function writeSystemError(error, req) {
  const statusCode = error.statusCode || 500;

  const errorDocument = {
    userId: req?.user?.id || null,
    requestId: req?.requestId || null,
    method: req?.method || null,
    path: req?.path || null,
    statusCode,
    errorCode: error.code || "INTERNAL_SERVER_ERROR",
    message: error.message,
    // Only include stack traces for server errors (never expose to client)
    stack: statusCode >= 500 ? (error.stack || null) : null,
    createdAt: new Date(),
  };

  try {
    const database = getMongoDB();
    await database.collection("system_error_logs").insertOne(errorDocument);
  } catch (dbError) {
    // Logging must never crash the process
  }
}

// ── Analytical event ──────────────────────────────────────────────────────────

async function writeAnalyticalEvent(eventName, userId, metadata = {}) {
  const eventDocument = {
    event: eventName,
    userId,
    ...metadata,
    createdAt: new Date(),
  };

  try {
    const database = getMongoDB();
    await database.collection("analytical_events").insertOne(eventDocument);
  } catch (dbError) {
    // Non-critical — must not affect core flow
  }
}

module.exports = {
  writeTransferAudit,
  writeSystemError,
  writeAnalyticalEvent,
};