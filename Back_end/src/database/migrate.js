const fs = require("fs");
const path = require("path");

const { pool } = require("../config/postgres");

const MIGRATIONS_DIRECTORY = path.join(__dirname, "../../migrations");

async function createMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

async function hasMigrationBeenApplied(client, migrationName) {
  const result = await client.query(
    "SELECT 1 FROM schema_migrations WHERE name = $1",
    [migrationName]
  );

  return result.rowCount > 0;
}

async function applyMigration(client, migrationName) {
  const migrationPath = path.join(
    MIGRATIONS_DIRECTORY,
    migrationName
  );

  const migrationSQL = fs.readFileSync(migrationPath, "utf8");

  await client.query("BEGIN");

  try {
    await client.query(migrationSQL);

    await client.query(
      "INSERT INTO schema_migrations (name) VALUES ($1)",
      [migrationName]
    );

    await client.query("COMMIT");

    console.log(`Applied migration: ${migrationName}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    await createMigrationsTable(client);

    const migrationFiles = getMigrationFiles();

    for (const migrationName of migrationFiles) {
      const alreadyApplied = await hasMigrationBeenApplied(
        client,
        migrationName
      );

      if (alreadyApplied) {
        continue;
      }

      await applyMigration(client, migrationName);
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();