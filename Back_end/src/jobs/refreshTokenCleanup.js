const cron = require("node-cron");

const {
  removeExpired,
} = require("../repositories/revokedRefreshToken.repository");

const CLEANUP_SCHEDULE = "*/5 * * * *";
const CLEANUP_TIMEZONE = "Asia/Kolkata";

let cleanupJob = null;

// Helper to retry an async operation up to a maximum number of attempts
async function retryAsync(fn, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      // optional: small delay before retry
      await new Promise(res => setTimeout(res, 100));
    }
  }
}
function startRefreshTokenCleanup() {
  if (cleanupJob) {
    return;
  }

  console.log(` [RefreshTokenCleanup] Starting cron job with schedule: "${CLEANUP_SCHEDULE}" (Timezone: ${CLEANUP_TIMEZONE})`);

  async function executeCleanup(isInitial = false) {
    const timestamp = new Date().toLocaleTimeString("en-IN", { timeZone: CLEANUP_TIMEZONE, hour12: false });
    try {
      const removedCount = await retryAsync(() => removeExpired(), 3);
      const executionType = isInitial ? "Initial startup check" : "Cron job executed";

      console.log(
        `[${timestamp}] [RefreshTokenCleanup] Reminder: ${executionType} — Removed ${removedCount} expired record(s) | Status: HEALTHY`
      );
    } catch (error) {
      console.error(
        `[${timestamp}]  [RefreshTokenCleanup] Reminder: Refresh-token cleanup failed — ${error.message}`
      );
    }
  }

  cleanupJob = cron.schedule(
    CLEANUP_SCHEDULE,
    () => executeCleanup(false),
    {
      timezone: CLEANUP_TIMEZONE,
    }
  );

  // Run an initial check on startup
  executeCleanup(true).catch(() => { });
}

function stopRefreshTokenCleanup() {
  if (!cleanupJob) {
    return;
  }

  cleanupJob.stop();
  cleanupJob = null;
}

module.exports = {
  startRefreshTokenCleanup,
  stopRefreshTokenCleanup,
};