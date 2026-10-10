const http = require("http");

const app = require("./app");
const env = require("./config/env");

const {
  pool,
  closePostgres,
} = require("./config/postgres");

const {
  connectMongoDB,
  closeMongoDB,
} = require("./config/mongodb");

const {
  startOutboxWorker,
  stopOutboxWorker,
} = require("./workers/outbox.worker");

const {
  startRefreshTokenCleanup,
  stopRefreshTokenCleanup,
} = require("./jobs/refreshTokenCleanup");

const {
  startAuditLogCron,
  stopAuditLogCron,
} = require("./jobs/auditLogCron");

const {
  closeAllStreams,
} = require("./streams/log.stream");

let server = null;
let shuttingDown = false;

async function startServer() {
  server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(env.port, () => {
      console.log(
        `Server running on http://localhost:${env.port}`
      );

      resolve();
    });
  });
}

async function startApplication() {
  await pool.query("SELECT 1");

  console.log("PostgreSQL connected");

  await connectMongoDB();

  console.log("MongoDB is connected successfully!");

  await startServer();

  await startOutboxWorker();

  startRefreshTokenCleanup();

  startAuditLogCron();

  console.log("Background services started");
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `${signal} received. Shutting down...`
  );

  stopRefreshTokenCleanup();

  stopAuditLogCron();

  await stopOutboxWorker();

  await closeAllStreams();

  if (server) {
    await closeHttpServer();
  }

  await closeMongoDB();

  await closePostgres();

  console.log("Shutdown completed");

  process.exit(0);
}

function closeHttpServer() {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

function handleShutdownError(error) {
  console.error(
    "Shutdown failed:",
    error
  );

  process.exit(1);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch(handleShutdownError);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch(handleShutdownError);
});

startApplication().catch(async (error) => {
  console.error(
    "Startup failed:",
    error
  );

  await closeMongoDB().catch(() => {});

  await closePostgres().catch(() => {});

  process.exit(1);
});