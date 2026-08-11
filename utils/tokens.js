const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_TOKEN_TTL = "12h";

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

// Admin tokens are a completely separate, lighter-weight scheme from the
// customer auth above — there's no admin-users table yet (just a single
// hardcoded operator login), so this just signs a scoped JWT off the same
// secret rather than reusing signAccessToken's user-row-shaped claims.
function signAdminToken(admin) {
    return jwt.sign(
        { sub: admin.username, role: "admin", scope: "admin" },
        getAccessSecret(),
        { expiresIn: ADMIN_TOKEN_TTL }
    );
}

function verifyAdminToken(token) {
    const claims = jwt.verify(token, getAccessSecret());
    if (claims.scope !== "admin") {
        throw new Error("Not an admin token.");
    }
    return claims;
}

module.exports = {
    signAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    refreshExpiryDate,
    REFRESH_TOKEN_TTL_MS,
    signAdminToken,
    verifyAdminToken
};
