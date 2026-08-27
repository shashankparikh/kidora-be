const { Pool } = require("pg");

// Replaces better-sqlite3. The storefront runs on a host with an ephemeral
// filesystem, so a local .db file does not survive a restart or a deploy —
// see db/migrations/001_init.sql for the schema and the type choices.
//
// better-sqlite3 was SYNCHRONOUS; every Postgres driver is not. So the store
// modules below db/ are all async now, and so is anything that calls them.
// The three helpers here are named after the better-sqlite3 calls they
// replace (.get / .all / .run) to keep that port readable.

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is not set. Copy it from the Supabase dashboard " +
        "(Project Settings -> Database -> Connection string -> URI). Use the " +
        "pooler host unless the platform gives you IPv6."
    );
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Supabase terminates TLS with a certificate this process has no local
    // root for. The connection is still encrypted; what is skipped is proving
    // the host is who it says. Set DATABASE_CA to the project's certificate
    // to verify properly.
    ssl: process.env.DATABASE_CA
        ? { ca: process.env.DATABASE_CA }
        : { rejectUnauthorized: false },

    // Free-tier Postgres allows few connections and this runs as a single
    // container, so a small pool avoids "too many clients" under a burst.
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
});

// An idle client dropped by the server reaches us as an error event, not a
// rejected query. Without this listener Node treats it as unhandled and
// exits, taking the whole service down for something the pool recovers from
// on its own.
pool.on("error", (err) => {
    console.error("Idle Postgres client error:", err.message);
});

async function all(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

async function get(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0];
}

async function run(sql, params = []) {
    const result = await pool.query(sql, params);
    return { changes: result.rowCount };
}

// SQLite gave us atomicity for free inside a synchronous function. Postgres
// does not, so read-modify-write sequences (bookStore.mutateBook is the one
// that matters) have to hold a single client across the whole sequence.
async function tx(fn) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const result = await fn(client);

        await client.query("COMMIT");

        return result;

    } catch (err) {

        await client.query("ROLLBACK").catch(() => {});

        throw err;

    } finally {
        client.release();
    }

}

module.exports = { pool, all, get, run, tx };
