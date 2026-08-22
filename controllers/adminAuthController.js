const crypto = require("crypto");

const { signAdminToken } = require("../utils/tokens");

// No fallback — a missing env var used to silently fall back to a
// guessable "shashank"/"shashank" login (see BACKLOG.md P0.3). Failing at
// import time means a misconfigured deploy never boots with an open admin
// panel; it fails loudly in the deploy logs instead.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error(
        "ADMIN_USERNAME and ADMIN_PASSWORD must be set — no default admin login is allowed."
    );
}

// Constant-time comparison so a login attempt can't be used to brute-force
// the credential one byte at a time via response-time differences.
function safeEqual(a, b) {

    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    if (bufA.length !== bufB.length) {
        // timingSafeEqual requires equal-length buffers; a length
        // mismatch is itself not a useful timing oracle here (username/
        // password lengths aren't secret in the way byte *content* is).
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);

}

function login(req, res) {

    const { username, password } = req.body || {};

    const valid =
        safeEqual(username || "", ADMIN_USERNAME) &&
        safeEqual(password || "", ADMIN_PASSWORD);

    if (!valid) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const token = signAdminToken({ username });

    res.json({
        success: true,
        token,
        admin: { username }
    });

}

module.exports = {
    login
};
