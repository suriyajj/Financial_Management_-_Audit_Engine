// src/jobs/auditLogCron.js
const cron = require("node-cron");
const { pool } = require("../config/postgres");
const { writeTransferAudit } = require("../services/audit.service");
const outboxRepository = require("../repositories/outbox.repository");

// Run every 7 minutes for reconciliation of failed or stuck events
const AUDIT_CRON_SCHEDULE = process.env.AUDIT_CRON_SCHEDULE || "*/7 * * * *";
const AUDIT_CRON_TIMEZONE = process.env.TZ || "Asia/Kolkata";
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 6;

let auditJob = null;
let lastRunTime = null;
let lastProcessedCount = 0;
let isProcessing = false;

/**
 * Retry an async function up to MAX_ATTEMPTS times.
 * Attempts 1–5: retry with 3^n second delay (3s, 9s, 27s, 81s, 243s).
 * Attempt 6: throws the error.
 */
async function retryAsync(fn, maxAttempts = MAX_ATTEMPTS) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      const delayMs = Math.pow(3, attempt) * 1000; // 3^1=3s, 3^2=9s, 3^3=27s, 3^4=81s, 3^5=243s
      console.warn(
        `[AuditLogCron] Attempt ${attempt}/${maxAttempts} failed - retrying in ${delayMs / 1000}s. Error: ${err.message}`
      );
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

/**
 * Claim failed or stuck outbox events for reconciliation.
 */
async function claimReconciliationEvents(client, limit = BATCH_SIZE) {
  const result = await client.query(
    `
      SELECT id, event_type, aggregate_id, payload, attempts
      FROM outbox_events
      WHERE 
        status = 'FAILED'
        OR (status = 'PROCESSING' AND created_at < NOW() - INTERVAL '2 minutes')
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    `,
    [limit]
  );

  const events = result.rows;
  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((e) => e.id);
  await client.query(
    `
      UPDATE outbox_events
      SET status = 'PROCESSING'
      WHERE id = ANY($1::uuid[])
    `,
    [eventIds]
  );

  return events;
}

async function processEvent(event) {
  const client = await pool.connect();
  try {
    // 1. Write audit log to MongoDB with retry
    await retryAsync(() => writeTransferAudit(event));

    // 2. Mark event as PROCESSED in Postgres
    await outboxRepository.markProcessed(client, event.id);
  } catch (err) {
    console.error(`[AuditCron] Failed to reconcile event ${event.id}:`, err.message);
    try {
      await outboxRepository.markFailed(client, event.id, err.message);
    } catch (markErr) {
      console.error(`[AuditCron] Failed to mark event as failed:`, markErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function processBatch() {
  if (isProcessing) {
    console.log("[AuditCron] Previous reconciliation batch is still running, skipping.");
    return 0;
  }

  isProcessing = true;
  lastRunTime = new Date();
  let processed = 0;

  const client = await pool.connect();
  let events = [];

  try {
    await client.query("BEGIN");
    events = await claimReconciliationEvents(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => { });
    console.error("[AuditCron] Transaction error claiming events:", err.message);
  } finally {
    client.release();
  }

  if (events.length > 0) {
    for (const ev of events) {
      try {
        await processEvent(ev);
        processed++;
      } catch (err) {
        // Individual error logged in processEvent
      }
    }
  }

  const timestamp = new Date().toLocaleTimeString("en-IN", { timeZone: AUDIT_CRON_TIMEZONE, hour12: false });
  if (events.length > 0) {
    console.log(
      `[${timestamp}] [AuditLogCron] Reminder: Cron job executed — Claimed ${events.length} event(s), Reconciled: ${processed} | Status: HEALTHY`
    );
  } else {
    console.log(
      `[${timestamp}] [AuditLogCron] Reminder: Cron job executed — 0 pending/failed events (All systems synced) | Status: HEALTHY`
    );
  }

  lastProcessedCount = processed;
  isProcessing = false;
  return processed;
}

function startAuditLogCron() {
  if (auditJob) {
    console.log("[AuditLog] Cron job is already active.");
    return;
  }

  console.log(` [AuditLog] Starting cron job with schedule: "${AUDIT_CRON_SCHEDULE}" (Timezone: ${AUDIT_CRON_TIMEZONE})`);

  auditJob = cron.schedule(
    AUDIT_CRON_SCHEDULE,
    async () => {
      try {
        await processBatch();
      } catch (err) {
        const timestamp = new Date().toLocaleTimeString("en-IN", { timeZone: AUDIT_CRON_TIMEZONE, hour12: false });
        console.error(`[${timestamp}]  [AuditLogCron] Reminder: Error during execution:`, err.message);
      }
    },
    { timezone: AUDIT_CRON_TIMEZONE }
  );

  // Trigger an initial batch check immediately on startup
  processBatch().catch((err) => {
    console.error("[AuditLogCron] Initial batch reconciliation check error:", err.message);
  });
}

function stopAuditLogCron() {
  if (!auditJob) return;
  auditJob.stop();
  auditJob = null;
  console.log("[AuditCron] Audit log cron job stopped.");
}

function isAuditCronRunning() {
  return auditJob !== null;
}

function getCronStatus() {
  return {
    isRunning: Boolean(auditJob),
    schedule: AUDIT_CRON_SCHEDULE,
    timezone: AUDIT_CRON_TIMEZONE,
    lastRun: lastRunTime ? lastRunTime.toISOString() : null,
    lastProcessedCount,
    isProcessing,
  };
}

async function triggerAuditCronNow() {
  return await processBatch();
}

module.exports = {
  startAuditLogCron,
  stopAuditLogCron,
  isAuditCronRunning,
  getCronStatus,
  triggerAuditCronNow,
};
