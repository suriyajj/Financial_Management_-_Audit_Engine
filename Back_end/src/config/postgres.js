const { Pool } = require("pg");

const env = require("./env");

const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  database: env.postgres.database,
  user: env.postgres.user,
  password: env.postgres.password,
  max: env.postgres.maxConnections,
});

async function testPostgresConnection() {
  const client = await pool.connect();

  try {
    await client.query("SELECT NOW()");
    console.log("PostgreSQL connected");
  } finally {
    client.release();
  }
}

async function closePostgres() {
  await pool.end();
  console.log("PostgreSQL connection pool closed");
}

module.exports = {
  pool,
  testPostgresConnection,
  closePostgres,
};