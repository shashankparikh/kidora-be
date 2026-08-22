const db = require("./database");

function todayKey() {
    return new Date().toISOString().slice(0, 10); // UTC "YYYY-MM-DD"
}

function getTodayCount() {

    const row = db.prepare(
        "SELECT call_count FROM ai_usage WHERE usage_date = ?"
    ).get(todayKey());

    return row ? row.call_count : 0;

}

function incrementToday() {

    db.prepare(
        `INSERT INTO ai_usage (usage_date, call_count)
         VALUES (@date, 1)
         ON CONFLICT(usage_date) DO UPDATE SET call_count = call_count + 1`
    ).run({ date: todayKey() });

}

// Whether an operator alert has already gone out for today's cap being
// hit — without this, every request blocked for the rest of the day
// (there can be many, that's the whole point of the cap) would each fire
// its own alert email.
function hasAlertedToday() {

    const row = db.prepare(
        "SELECT alerted_at FROM ai_usage WHERE usage_date = ?"
    ).get(todayKey());

    return Boolean(row && row.alerted_at);

}

function markAlertedToday() {

    // Upsert, not a plain UPDATE — if the cap is 0 from the start of the
    // day, incrementToday() (the only other writer) never runs, so no row
    // would exist yet for a bare UPDATE to affect, and this would silently
    // no-op, defeating the dedup in hasAlertedToday().
    db.prepare(
        `INSERT INTO ai_usage (usage_date, call_count, alerted_at)
         VALUES (@date, 0, @alertedAt)
         ON CONFLICT(usage_date) DO UPDATE SET alerted_at = @alertedAt`
    ).run({ date: todayKey(), alertedAt: new Date().toISOString() });

}

module.exports = {
    getTodayCount,
    incrementToday,
    hasAlertedToday,
    markAlertedToday
};
