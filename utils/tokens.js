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

// Deliberately a different secret from customer tokens (see BACKLOG.md
// P0.3) — admin and customer auth are separate trust domains, and sharing
// a signing key means a leak of one secret compromises both. verifyAdmin/
// signAdminToken below never fall back to getAccessSecret().
function getAdminSecret() {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
        throw new Error("ADMIN_JWT_SECRET is not set.");
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
// operator login from env), so this just signs a scoped JWT rather than
// reusing signAccessToken's user-row-shaped claims. Signed with its own
// secret (getAdminSecret), not the customer one.
function signAdminToken(admin) {
    return jwt.sign(
        { sub: admin.username, role: "admin", scope: "admin" },
        getAdminSecret(),
        { expiresIn: ADMIN_TOKEN_TTL }
    );
}

function verifyAdminToken(token) {
    const claims = jwt.verify(token, getAdminSecret());
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
