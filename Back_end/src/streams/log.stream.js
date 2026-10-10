const { getMongoDB } = require("../config/mongodb");
const auditEmitter = require("../utils/auditEmitter");

const activeStreams = new Set();

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds
const POLLING_INTERVAL = 1_500;   // 1.5 seconds

function setSSEHeaders(res) {
  res.status(200);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();
}

function sendSSEEvent(res, eventName, data) {
  if (res.writableEnded || res.destroyed) {
    return;
  }

  // Named SSE event (compatible with addEventListener('log', ...))
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);

  // For 'log' events, also send a default message frame (compatible with onmessage = ...)
  if (eventName === "log") {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function sendHeartbeat(res) {
  if (res.writableEnded || res.destroyed) {
    return;
  }
  res.write(": heartbeat\n\n");
}

async function startLogStream(req, res, userId) {
  setSSEHeaders(res);

  sendSSEEvent(res, "connected", {
    message: "Audit log live stream connected successfully",
    userId,
    timestamp: new Date().toISOString(),
  });

  let cleanedUp = false;
  let heartbeatTimer = null;
  let pollingTimer = null;

  // Track sent log IDs to prevent duplicate SSE events
  const seenLogIds = new Set();

  function cleanup() {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    activeStreams.delete(cleanup);

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }

    auditEmitter.off("audit_log", onAuditLog);

    req.off("aborted", cleanup);
    req.off("close", cleanup);
    res.off("close", cleanup);
    res.off("error", cleanup);
  }

  // Real-time listener for in-process audit log emissions
  function onAuditLog(log) {
    if (cleanedUp || res.writableEnded || res.destroyed) return;

    const idStr = log._id ? log._id.toString() : null;
    if (idStr && seenLogIds.has(idStr)) return;

    if (Array.isArray(log.userIds) && log.userIds.includes(userId)) {
      if (idStr) seenLogIds.add(idStr);
      sendSSEEvent(res, "log", log);
    }
  }

  auditEmitter.on("audit_log", onAuditLog);

  activeStreams.add(cleanup);
  req.on("aborted", cleanup);
  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);

  // Send periodic heartbeat to keep the SSE connection alive
  heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL);

  let lastCheck = new Date(Date.now() - 60_000); // look back 1 minute for initial buffer

  try {
    const database = getMongoDB();
    const auditLogsCollection = database.collection("audit_logs");

    // Send recent existing logs immediately so the stream shows data right away
    const recentLogs = await auditLogsCollection
      .find({ userIds: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    if (!cleanedUp && !res.writableEnded && !res.destroyed) {
      // Send in chronological order (oldest to newest)
      for (const log of recentLogs.reverse()) {
        const idStr = log._id ? log._id.toString() : null;
        if (idStr) seenLogIds.add(idStr);
        sendSSEEvent(res, "log", log);
      }
    }

    lastCheck = new Date();

    // Continuous polling for logs written by background workers or other processes
    pollingTimer = setInterval(async () => {
      if (cleanedUp || res.writableEnded || res.destroyed) return;

      try {
        const newLogs = await auditLogsCollection
          .find({
            userIds: userId,
            createdAt: { $gte: lastCheck },
          })
          .sort({ createdAt: 1 })
          .toArray();

        if (newLogs.length > 0) {
          let maxTime = lastCheck.getTime();
          for (const log of newLogs) {
            const idStr = log._id ? log._id.toString() : null;
            if (idStr && !seenLogIds.has(idStr)) {
              seenLogIds.add(idStr);
              sendSSEEvent(res, "log", log);
            }
            if (log.createdAt && log.createdAt.getTime() > maxTime) {
              maxTime = log.createdAt.getTime();
            }
          }
          lastCheck = new Date(maxTime);
        }
      } catch (err) {
        // Logging error shouldn't crash the stream
      }
    }, POLLING_INTERVAL);
  } catch (error) {
    console.error("Error initializing audit log stream:", error.message);
  }
}

async function closeAllStreams() {
  const cleanupFunctions = [...activeStreams];
  for (const cleanup of cleanupFunctions) {
    cleanup();
  }
}

function activeStreamCount() {
  return activeStreams.size;
}

module.exports = {
  startLogStream,
  closeAllStreams,
  activeStreamCount,
};