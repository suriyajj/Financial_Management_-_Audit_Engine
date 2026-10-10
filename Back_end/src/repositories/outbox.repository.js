async function claimBatch(client, limit = 20) {
  const result = await client.query(
    `
      SELECT
        id,
        event_type,
        aggregate_id,
        payload,
        attempts
      FROM outbox_events
      WHERE status = 'PENDING'
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

  const eventIds = events.map((event) => event.id);

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

async function markProcessed(client, eventId) {
  await client.query(
    `
      UPDATE outbox_events
      SET
        status = 'PROCESSED',
        processed_at = NOW(),
        last_error = NULL
      WHERE id = $1
    `,
    [eventId]
  );
}

async function markFailed(client, eventId, error) {
  const errorMessage = String(error).slice(0, 2000);

  await client.query(
    `
      UPDATE outbox_events
      SET
        attempts = attempts + 1,
        last_error = $2,
        status = CASE WHEN attempts + 1 >= 6 THEN 'FAILED' ELSE 'PENDING' END
      WHERE id = $1
    `,
    [eventId, errorMessage]
  );
}

async function resetProcessing(client) {
  await client.query(
    `
      UPDATE outbox_events
      SET status = 'PENDING'
      WHERE status = 'PROCESSING'
    `
  );
}

async function markDone(client, eventId) {
  await client.query(
    `
      UPDATE outbox_events
      SET status = 'DONE', done_at = NOW()
      WHERE id = $1
    `,
    [eventId]
  );
}

module.exports = {
  claimBatch,
  markProcessed,
  markFailed,
  resetProcessing,
  markDone,
};