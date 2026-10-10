const express = require("express");

const logsController = require("../controllers/logs.controller");

const router = express.Router();

// SSE live stream — audit_logs for the authenticated user
router.get("/stream", logsController.stream);

// Immutable transaction / transfer audit logs
router.get("/transactions", logsController.getTransactionLogs);

// HTTP application activity logs
router.get("/activity", logsController.getActivityLogs);

// System error logs
router.get("/errors", logsController.getErrorLogs);

// High-frequency analytical events (e.g. TRANSFER_COMPLETED)
router.get("/events", logsController.getAnalyticalEvents);

// // All 4 log types in a single response body
// router.get("/all", logsController.getAllLogs);

module.exports = router;