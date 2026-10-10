const { startLogStream } = require("../streams/log.stream");
const logRepository = require("../repositories/log.repository");

//SSE live logs streaming

function stream(req, res, next) {
  try {
    startLogStream(req, res, req.user.id);
  } catch (error) {
    next(error);
  }
}

//Transaction Audit logs

async function getTransactionLogs(req, res, next) {
  try {
    const result = await logRepository.findTransactionLogs(
      req.user.id,
      req.query
    );
    res.status(200).json({
      status: 200,
      message: "Transaction audit logs fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

//Application Activity Logs

async function getActivityLogs(req, res, next) {
  try {
    const result = await logRepository.findActivityLogs(
      req.user.id,
      req.query
    );
    res.status(200).json({
      status: 200,
      message: "Activity logs fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

//System error logs 

async function getErrorLogs(req, res, next) {
  try {
    const result = await logRepository.findErrorLogs(
      req.user.id,
      req.query
    );
    res.status(200).json({
      status: 200,
      message: "Error logs fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Analytical events 

async function getAnalyticalEvents(req, res, next) {
  try {
    const result = await logRepository.findAnalyticalEvents(
      req.user.id,
      req.query
    );
    res.status(200).json({
      status: 200,
      message: "Analytical events fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ── All logs combined ─────────────────────────────────────────────────────────

async function getAllLogs(req, res, next) {
  try {
    const userId = req.user.id;

    const [transactionLogs, activityLogs, errorLogs, analyticalEvents] =
      await Promise.all([
        logRepository.findTransactionLogs(userId, req.query),
        logRepository.findActivityLogs(userId, req.query),
        logRepository.findErrorLogs(userId, req.query),
        logRepository.findAnalyticalEvents(userId, req.query),
      ]);

    res.status(200).json({
      status: 200,
      message: "All logs fetched successfully",
      data: {
        transactionLogs,
        activityLogs,
        errorLogs,
        analyticalEvents,
      },
    });
  } catch (error) {
    next(error);
  }
}

//Audit log cron status & health check 

const { getCronStatus, triggerAuditCronNow } = require("../jobs/auditLogCron");
const { pool } = require("../config/postgres");

async function getCronJobStatus(req, res, next) {
  try {
    const cronInfo = getCronStatus();

    const statsResult = await pool.query(`
      SELECT 
        status, 
        COUNT(*)::int as count 
      FROM outbox_events 
      GROUP BY status
    `);

    const outboxStats = {
      PENDING: 0,
      PROCESSING: 0,
      PROCESSED: 0,
      FAILED: 0,
    };

    for (const row of statsResult.rows) {
      outboxStats[row.status] = row.count;
    }

    res.status(200).json({
      status: 200,
      message: "Audit log cron job status fetched successfully",
      data: {
        cron: cronInfo,
        outbox: outboxStats,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function triggerCronJob(req, res, next) {
  try {
    const reconciledCount = await triggerAuditCronNow();
    res.status(200).json({
      status: 200,
      message: `Audit cron reconciliation triggered manually: ${reconciledCount} events processed`,
      data: {
        reconciledCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  stream,
  getTransactionLogs,
  getActivityLogs,
  getErrorLogs,
  getAnalyticalEvents,
  getAllLogs,
  getCronJobStatus,
  triggerCronJob,
};