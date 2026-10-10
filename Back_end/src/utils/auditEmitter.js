const EventEmitter = require("events");

class AuditEventEmitter extends EventEmitter {}

const auditEmitter = new AuditEventEmitter();
// Prevent memory leak warnings for many concurrent SSE connections
auditEmitter.setMaxListeners(500);

module.exports = auditEmitter;
