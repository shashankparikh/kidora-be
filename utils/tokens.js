const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not set.");
    }
    return secret;
}

function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        getAccessSecret(),
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, getAccessSecret());
}

// Refresh tokens are opaque random strings, not JWTs — only their hash is
// ever stored, so a leaked database never yields a usable token.
function generateRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
}

function hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
}

module.exports = {
    signAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    refreshExpiryDate,
    REFRESH_TOKEN_TTL_MS
};
