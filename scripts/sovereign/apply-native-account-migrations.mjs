#!/usr/bin/env node
/**
 * Apply sovereign native-account migrations to ABRAXAS_DATABASE_URL (standard PostgreSQL).
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "../..");
const migrationsDir = path.join(root, "database/sovereign/migrations");
const databaseUrl = process.env.ABRAXAS_DATABASE_URL?.trim()
  ?? process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("ABRAXAS_DATABASE_URL or DATABASE_URL is required");
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`Applying ${file}…\n`);
    await client.query(sql);
  }
  process.stdout.write("Sovereign native account migrations applied.\n");
} finally {
  await client.end();
}
