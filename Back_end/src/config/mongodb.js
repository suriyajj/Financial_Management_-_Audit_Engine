const { MongoClient } = require("mongodb");

const env = require("./env");

console.log("MongoDB URI:", env.mongodb.uri);

const mongoClient = new MongoClient(env.mongodb.uri, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
});

let database = null;

async function connectMongoDB() {
  await mongoClient.connect();

  database = mongoClient.db(env.mongodb.database);

  await createAuditLogIndexes();
}

async function createAuditLogIndexes() {
  const auditLogsCollection = database.collection("audit_logs");

  await auditLogsCollection.createIndex({
    userIds: 1,
    createdAt: -1,
  });

  await auditLogsCollection.createIndex({
    createdAt: -1,
  });
}

function getMongoDB() {
  if (!database) {
    throw new Error("MongoDB is not connected");
  }

  return database;
}

async function closeMongoDB() {
  if (!database) {
    return;
  }

  await mongoClient.close();

  database = null;
}

module.exports = {
  connectMongoDB,
  getMongoDB,
  closeMongoDB
};