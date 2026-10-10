const { pool } = require("../config/postgres");

const outboxRepository = require("../repositories/outbox.repository");
const { writeTransferAudit } = require("../services/audit.service");

const BATCH_SIZE = 20;
const POLL_INTERVAL = 1_000;

let running = false;
let timer = null;

async function resetProcessingEvents() {
  const client = await pool.connect();

  try {
    await client.query(
      `
        UPDATE outbox_events
        SET status = 'PENDING'
        WHERE status = 'PROCESSING'
      `
    );
  } finally {
    client.release();
  }
}

async function claimEvents() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const events = await outboxRepository.claimBatch(
      client,
      BATCH_SIZE
    );

    await client.query("COMMIT");

    return events;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function markEventProcessed(eventId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await outboxRepository.markProcessed(
      client,
      eventId
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function markEventFailed(eventId, error) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await outboxRepository.markFailed(
      client,
      eventId,
      error
    );

    await client.query("COMMIT");
  } catch (markFailedError) {
    await client.query("ROLLBACK").catch(() => {});
    throw markFailedError;
  } finally {
    client.release();
  }
}

async function processEvent(event) {
  try {
    await writeTransferAudit(event);

    await markEventProcessed(event.id);
  } catch (error) {
    try {
      await markEventFailed(
        event.id,
        error.message
      );
    } catch (markFailedError) {
      console.error(
        `Failed to mark outbox event ${event.id} as failed:`,
        markFailedError.message
      );
    }
  }
}

async function processBatch() {
  let events;

  try {
    events = await claimEvents();
  } catch (error) {
    console.error(
      "Failed to claim outbox events:",
      error.message
    );

    return;
  }

  if (events.length > 0) {
    const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
    console.log(`[${timestamp}] [OutboxWorker] Processed ${events.length} outbox event(s)`);
  }

  for (const event of events) {
    await processEvent(event);
  }
}

async function startOutboxWorker() {
  if (running) {
    return;
  }

  running = true;

  try {
    await resetProcessingEvents();
    console.log("[OutboxWorker] Started (polling every 1000ms)");
  } catch (error) {
    running = false;

    throw error;
  }

  async function runLoop() {
    if (!running) {
      return;
    }

    await processBatch();

    if (running) {
      timer = setTimeout(
        runLoop,
        POLL_INTERVAL
      );
    }
  }

  await runLoop();
}

async function stopOutboxWorker() {
  running = false;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

module.exports = {
  startOutboxWorker,
  stopOutboxWorker,
};