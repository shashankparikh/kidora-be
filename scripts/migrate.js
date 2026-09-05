#!/usr/bin/env node
/**
 * Apply db/migrations/*.sql in filename order.
 *
 *     npm run migrate
 *
 * Deliberately NOT run on boot. The old SQLite database.js executed its
 * schema on every start, which was safe for one process holding one file.
 * Several containers starting at once against one Postgres would race on
 * DDL, so applying migrations is an explicit step.
 *
 * Each file runs inside a transaction and is recorded in schema_migrations,
 * so re-running is a no-op and a failure leaves nothing half-applied.
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { pool } = require("../db/database");

const DIR = path.join(__dirname, "..", "db", "migrations");

async function main() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
    `);

    const applied = new Set(
        (await pool.query("SELECT filename FROM schema_migrations")).rows
            .map((r) => r.filename)
    );

    const files = fs.readdirSync(DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();

    if (files.length === 0) {
        console.log("No migrations found in db/migrations/");
        return;
    }

    let ran = 0;

    for (const file of files) {

        if (applied.has(file)) {
            console.log(`  skip    ${file} (already applied)`);
            continue;
        }

        const sql = fs.readFileSync(path.join(DIR, file), "utf8");
        const client = await pool.connect();

        try {

            await client.query("BEGIN");
            await client.query(sql);
            await client.query(
                "INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, $2)",
                [file, new Date().toISOString()]
            );
            await client.query("COMMIT");

            console.log(`  applied ${file}`);
            ran += 1;

        } catch (err) {

            await client.query("ROLLBACK").catch(() => {});
            console.error(`  FAILED  ${file}\n          ${err.message}`);
            throw err;

        } finally {
            client.release();
        }

    }

    console.log(ran === 0 ? "\nAlready up to date." : `\n${ran} migration(s) applied.`);

}

main()
    .then(() => pool.end())
    .catch((err) => {
        pool.end();
        console.error("\nMigration failed:", err.message);
        process.exit(1);
    });
