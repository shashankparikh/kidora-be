const crypto = require("crypto");

const db = require("./database");

function nowIso() {
    return new Date().toISOString();
}

function toPublicUser(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        mobileNumber: row.mobile_number,
        avatarUrl: row.avatar_url,
        role: row.role,
        emailVerified: Boolean(row.email_verified),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function createUser({
    email,
    firstName = null,
    lastName = null,
    mobileNumber = null,
    avatarUrl = null,
    passwordHash = null,
    emailVerified = false
}) {

    const id = `usr_${crypto.randomUUID()}`;
    const timestamp = nowIso();

    db.prepare(
        `INSERT INTO users
            (id, email, first_name, last_name, mobile_number, avatar_url, password_hash, role, email_verified, created_at, updated_at)
         VALUES
            (@id, @email, @firstName, @lastName, @mobileNumber, @avatarUrl, @passwordHash, 'customer', @emailVerified, @createdAt, @updatedAt)`
    ).run({
        id,
        email: email.toLowerCase(),
        firstName,
        lastName,
        mobileNumber,
        avatarUrl,
        passwordHash,
        emailVerified: emailVerified ? 1 : 0,
        createdAt: timestamp,
        updatedAt: timestamp
    });

    return getUserById(id);

}

function getUserById(id) {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return row ?? null;
}

function getUserByEmail(email) {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    return row ?? null;
}

function updateUser(id, updates) {

    const fields = [];
    const params = { id, updatedAt: nowIso() };

    const columnMap = {
        firstName: "first_name",
        lastName: "last_name",
        mobileNumber: "mobile_number",
        avatarUrl: "avatar_url",
        emailVerified: "email_verified"
    };

    for (const [key, column] of Object.entries(columnMap)) {
        if (updates[key] !== undefined) {
            fields.push(`${column} = @${key}`);
            params[key] = key === "emailVerified" ? (updates[key] ? 1 : 0) : updates[key];
        }
    }

    if (fields.length === 0) {
        return getUserById(id);
    }

    db.prepare(
        `UPDATE users SET ${fields.join(", ")}, updated_at = @updatedAt WHERE id = @id`
    ).run(params);

    return getUserById(id);

}

function createAuthAccount({ userId, provider, providerAccountId }) {

    const id = `auth_${crypto.randomUUID()}`;

    db.prepare(
        `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, created_at)
         VALUES (@id, @userId, @provider, @providerAccountId, @createdAt)`
    ).run({
        id,
        userId,
        provider,
        providerAccountId,
        createdAt: nowIso()
    });

    return id;

}

function findAuthAccount({ provider, providerAccountId }) {
    const row = db.prepare(
        "SELECT * FROM auth_accounts WHERE provider = ? AND provider_account_id = ?"
    ).get(provider, providerAccountId);
    return row ?? null;
}

function createRefreshSession({ userId, refreshTokenHash, userAgent, ipAddress, expiresAt }) {

    const id = `sess_${crypto.randomUUID()}`;

    db.prepare(
        `INSERT INTO refresh_sessions
            (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at)
         VALUES
            (@id, @userId, @refreshTokenHash, @userAgent, @ipAddress, @expiresAt, NULL, @createdAt)`
    ).run({
        id,
        userId,
        refreshTokenHash,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
        createdAt: nowIso()
    });

    return id;

}

function findRefreshSessionByHash(refreshTokenHash) {
    const row = db.prepare(
        "SELECT * FROM refresh_sessions WHERE refresh_token_hash = ?"
    ).get(refreshTokenHash);
    return row ?? null;
}

function revokeRefreshSession(id) {
    db.prepare(
        "UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?"
    ).run(nowIso(), id);
}

function revokeAllRefreshSessionsForUser(userId) {
    db.prepare(
        "UPDATE refresh_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL"
    ).run(nowIso(), userId);
}

module.exports = {
    toPublicUser,
    createUser,
    getUserById,
    getUserByEmail,
    updateUser,
    createAuthAccount,
    findAuthAccount,
    createRefreshSession,
    findRefreshSessionByHash,
    revokeRefreshSession,
    revokeAllRefreshSessionsForUser
};
