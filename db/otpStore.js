const crypto = require("crypto");

const { all, get, run } = require("./database");

function nowIso() {
    return new Date().toISOString();
}

async function createOtp({ email, codeHash, expiresAt, ipAddress }) {

    const id = `otp_${crypto.randomUUID()}`;

    await run(
        `INSERT INTO email_otps
            (id, email, code_hash, attempts, expires_at, consumed_at,
             created_at, ip_address)
         VALUES ($1, $2, $3, 0, $4, NULL, $5, $6)`,
        [id, email.toLowerCase(), codeHash, expiresAt, nowIso(), ipAddress ?? null]
    );

    return id;

}

// Every unconsumed, unexpired code for this address, newest first.
//
// Returns a LIST rather than just the latest because a customer who clicks
// "resend" often then types the code from the first email — the one that
// arrived while the second was still in flight. Checking every live code
// makes that work instead of failing for a reason nobody could diagnose.
async function liveOtpsFor(email) {
    return all(
        `SELECT * FROM email_otps
         WHERE email = $1
           AND consumed_at IS NULL
           AND expires_at > $2
         ORDER BY created_at DESC`,
        [email.toLowerCase(), nowIso()]
    );
}

async function countRecentFor(email, sinceIso) {
    const row = await get(
        `SELECT COUNT(*)::int AS n FROM email_otps
         WHERE email = $1 AND created_at > $2`,
        [email.toLowerCase(), sinceIso]
    );
    return row ? row.n : 0;
}

async function recordAttempt(id) {
    await run(
        "UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1",
        [id]
    );
}

async function consume(id) {
    await run(
        "UPDATE email_otps SET consumed_at = $1 WHERE id = $2",
        [nowIso(), id]
    );
}

// Burns every live code for an address. Called when one is accepted, and
// when an attacker exhausts the attempt budget — in the second case it
// deliberately invalidates the real customer's code too, because at that
// point somebody is guessing and a fresh code is the safe path.
async function invalidateAllFor(email) {
    await run(
        `UPDATE email_otps SET consumed_at = $1
         WHERE email = $2 AND consumed_at IS NULL`,
        [nowIso(), email.toLowerCase()]
    );
}

// Housekeeping. Expired rows have no value and the table would otherwise
// grow forever — every sign-in attempt writes one.
async function deleteExpiredBefore(cutoffIso) {
    const { changes } = await run(
        "DELETE FROM email_otps WHERE expires_at < $1",
        [cutoffIso]
    );
    return changes;
}

module.exports = {
    createOtp,
    liveOtpsFor,
    countRecentFor,
    recordAttempt,
    consume,
    invalidateAllFor,
    deleteExpiredBefore
};
