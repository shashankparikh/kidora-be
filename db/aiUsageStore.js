const { get, run } = require("./database");

function todayKey() {
    return new Date().toISOString().slice(0, 10); // UTC "YYYY-MM-DD"
}

async function getTodayCount() {

    const row = await get(
        "SELECT call_count FROM ai_usage WHERE usage_date = $1",
        [todayKey()]
    );

    return row ? row.call_count : 0;

}

// Atomically reserve one call against today's cap. Returns true if the
// reservation succeeded, false if the cap is already reached.
//
// This replaces a read-then-write pair (getTodayCount, then incrementToday)
// which was a check-then-act race even under SQLite — just an extremely
// narrow one, because the two statements ran back to back against a local
// file. Against a pooled network database the window widens to a round
// trip, which is easily enough for concurrent requests to each read 199 and
// each decide they are under a cap of 200.
//
// The WHERE on the DO UPDATE is what makes it atomic: Postgres takes a row
// lock for the conflicting insert, so the increment and the limit test
// happen together. No row comes back when the guard fails, which is the
// signal the cap is reached.
async function reserveCall(cap) {

    const row = await get(
        `INSERT INTO ai_usage (usage_date, call_count)
         VALUES ($1, 1)
         ON CONFLICT (usage_date) DO UPDATE
             SET call_count = ai_usage.call_count + 1
             WHERE ai_usage.call_count < $2
         RETURNING call_count`,
        [todayKey(), cap]
    );

    return Boolean(row);

}

async function incrementToday() {

    // The increment is qualified as ai_usage.call_count rather than left
    // bare. Postgres resolves an unqualified name in a DO UPDATE SET
    // expression against the target table, but the qualified form is the
    // one that says out loud we mean the stored row and not EXCLUDED —
    // which is the proposed row, and always 1 here.
    await run(
        `INSERT INTO ai_usage (usage_date, call_count)
         VALUES ($1, 1)
         ON CONFLICT (usage_date)
         DO UPDATE SET call_count = ai_usage.call_count + 1`,
        [todayKey()]
    );

}

// Whether an operator alert has already gone out for today's cap being
// hit — without this, every request blocked for the rest of the day
// (there can be many, that's the whole point of the cap) would each fire
// its own alert email.
async function hasAlertedToday() {

    const row = await get(
        "SELECT alerted_at FROM ai_usage WHERE usage_date = $1",
        [todayKey()]
    );

    return Boolean(row && row.alerted_at);

}

async function markAlertedToday() {

    // Upsert, not a plain UPDATE — if the cap is 0 from the start of the
    // day, incrementToday() (the only other writer) never runs, so no row
    // would exist yet for a bare UPDATE to affect, and this would silently
    // no-op, defeating the dedup in hasAlertedToday().
    await run(
        `INSERT INTO ai_usage (usage_date, call_count, alerted_at)
         VALUES ($1, 0, $2)
         ON CONFLICT (usage_date) DO UPDATE SET alerted_at = $2`,
        [todayKey(), new Date().toISOString()]
    );

}

module.exports = {
    getTodayCount,
    reserveCall,
    incrementToday,
    hasAlertedToday,
    markAlertedToday
};
