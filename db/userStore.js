const crypto = require("crypto");

const { get, run } = require("./database");

function nowIso() {
    return new Date().toISOString();
}

// Pure row -> shape mapping, so this one stays synchronous.
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

async function createUser({
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

    // RETURNING * instead of a follow-up SELECT. Under better-sqlite3 the
    // extra read was a local file lookup; against a pooled remote database
    // it is a second network round trip for a row we already have.
    return get(
        `INSERT INTO users
            (id, email, first_name, last_name, mobile_number, avatar_url,
             password_hash, role, email_verified, created_at, updated_at)
         VALUES
            ($1, $2, $3, $4, $5, $6, $7, 'customer', $8, $9, $9)
         RETURNING *`,
        [
            id,
            email.toLowerCase(),
            firstName,
            lastName,
            mobileNumber,
            avatarUrl,
            passwordHash,
            emailVerified ? 1 : 0,
            timestamp
        ]
    );

}

async function getUserById(id) {
    const row = await get("SELECT * FROM users WHERE id = $1", [id]);
    return row ?? null;
}

async function getUserByEmail(email) {
    const row = await get(
        "SELECT * FROM users WHERE email = $1",
        [email.toLowerCase()]
    );
    return row ?? null;
}

async function updateUser(id, updates) {

    const columnMap = {
        firstName: "first_name",
        lastName: "last_name",
        mobileNumber: "mobile_number",
        avatarUrl: "avatar_url",
        emailVerified: "email_verified"
    };

    // Postgres placeholders are positional, so the column list and the
    // params array have to be built in step with each other.
    const fields = [];
    const params = [];

    for (const [key, column] of Object.entries(columnMap)) {
        if (updates[key] !== undefined) {
            params.push(
                key === "emailVerified" ? (updates[key] ? 1 : 0) : updates[key]
            );
            fields.push(`${column} = $${params.length}`);
        }
    }

    if (fields.length === 0) {
        return getUserById(id);
    }

    params.push(nowIso());
    const updatedAtParam = params.length;

    params.push(id);
    const idParam = params.length;

    const row = await get(
        `UPDATE users SET ${fields.join(", ")}, updated_at = $${updatedAtParam}
         WHERE id = $${idParam}
         RETURNING *`,
        params
    );

    return row ?? null;

}

async function createAuthAccount({ userId, provider, providerAccountId }) {

    const id = `auth_${crypto.randomUUID()}`;

    await run(
        `INSERT INTO auth_accounts
            (id, user_id, provider, provider_account_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userId, provider, providerAccountId, nowIso()]
    );

    return id;

}

async function findAuthAccount({ provider, providerAccountId }) {
    const row = await get(
        `SELECT * FROM auth_accounts
         WHERE provider = $1 AND provider_account_id = $2`,
        [provider, providerAccountId]
    );
    return row ?? null;
}

async function createRefreshSession({
    userId,
    refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt
}) {

    const id = `sess_${crypto.randomUUID()}`;

    await run(
        `INSERT INTO refresh_sessions
            (id, user_id, refresh_token_hash, user_agent, ip_address,
             expires_at, revoked_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
        [
            id,
            userId,
            refreshTokenHash,
            userAgent ?? null,
            ipAddress ?? null,
            expiresAt,
            nowIso()
        ]
    );

    return id;

}

async function findRefreshSessionByHash(refreshTokenHash) {
    const row = await get(
        "SELECT * FROM refresh_sessions WHERE refresh_token_hash = $1",
        [refreshTokenHash]
    );
    return row ?? null;
}

async function revokeRefreshSession(id) {
    await run(
        "UPDATE refresh_sessions SET revoked_at = $1 WHERE id = $2",
        [nowIso(), id]
    );
}

async function revokeAllRefreshSessionsForUser(userId) {
    await run(
        `UPDATE refresh_sessions SET revoked_at = $1
         WHERE user_id = $2 AND revoked_at IS NULL`,
        [nowIso(), userId]
    );
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
