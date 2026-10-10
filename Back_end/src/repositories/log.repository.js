const { getMongoDB } = require("../config/mongodb");



function buildDateFilter(from, to) {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  return filter;
}

function parsePagination(query) {
  const limit = Math.min(parseInt(query.limit, 10) || 20, 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

//Transaction audit logs 

async function findTransactionLogs(userId, query = {}) {
  const { limit, page, skip } = parsePagination(query);
  const db = getMongoDB();
  const col = db.collection("audit_logs");

  const filter = {
    userIds: userId,
    ...buildDateFilter(query.from, query.to),
  };

  const [logs, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return { logs, pagination: { page, limit, total } };
}

//Application activity logs

async function findActivityLogs(userId, query = {}) {
  const { limit, page, skip } = parsePagination(query);
  const db = getMongoDB();
  const col = db.collection("application_logs");

  const filter = {
    userId,
    ...buildDateFilter(query.from, query.to),
  };

  const [logs, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return { logs, pagination: { page, limit, total } };
}

//System error logs

async function findErrorLogs(userId, query = {}) {
  const { limit, page, skip } = parsePagination(query);
  const db = getMongoDB();
  const col = db.collection("system_error_logs");

  const filter = {
    userId,
    ...buildDateFilter(query.from, query.to),
  };

  const [logs, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return { logs, pagination: { page, limit, total } };
}

//Analytical events

async function findAnalyticalEvents(userId, query = {}) {
  const { limit, page, skip } = parsePagination(query);
  const db = getMongoDB();
  const col = db.collection("analytical_events");

  const filter = {
    userId,
    ...buildDateFilter(query.from, query.to),
  };

  const [logs, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return { logs, pagination: { page, limit, total } };
}

module.exports = {
  findTransactionLogs,
  findActivityLogs,
  findErrorLogs,
  findAnalyticalEvents,
};
