const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { all, get, run } = require("./database");

// Same cost factor as customer passwords (services/authService.js). There are
// only a handful of these accounts and they are the keys to every order in
// the system, so there is no argument for making them cheaper to crack.
const BCRYPT_ROUNDS = 12;

function nowIso() {
    return new Date().toISOString();
}

function normalise(username) {
    return String(username || "").trim().toLowerCase();
}

// Never includes password_hash. Callers that need to check a password go
// through verifyPassword below, so the hash has no reason to travel any
// further than this file.
function toAdmin(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        active: row.active === 1,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at
    };
}

async function create({ username, displayName, password }) {

    const name = normalise(username);

    if (!name) {
        throw new Error("A username is required.");
    }
    if (!password || password.length < 12) {
        throw new Error("Operator passwords must be at least 12 characters.");
    }

    const existing = await get("SELECT 1 FROM admin_users WHERE username = $1", [name]);
    if (existing) {
        throw new Error(`There is already an operator called "${name}".`);
    }

    const row = await get(
        `INSERT INTO admin_users
            (id, username, display_name, password_hash, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, $5, $5)
         RETURNING *`,
        [
            `adm_${crypto.randomUUID()}`,
            name,
            (displayName || username).trim(),
            await bcrypt.hash(password, BCRYPT_ROUNDS),
            nowIso()
        ]
    );

    return toAdmin(row);

}

// Returns the operator on a correct password, null otherwise. The bcrypt
// comparison runs even when there is no such user, so a wrong username and a
// wrong password take the same time to reject — otherwise the login form
// tells an attacker which of the two they got right.
const DUMMY_HASH = bcrypt.hashSync("no-such-operator", BCRYPT_ROUNDS);

async function verifyPassword(username, password) {

    const row = await get(
        "SELECT * FROM admin_users WHERE username = $1 AND active = 1",
        [normalise(username)]
    );

    const matches = await bcrypt.compare(
        String(password || ""),
        row ? row.password_hash : DUMMY_HASH
    );

    if (!row || !matches) {
        return null;
    }

    return toAdmin(row);

}

async function recordLogin(id) {
    await run("UPDATE admin_users SET last_login_at = $2 WHERE id = $1", [id, nowIso()]);
}

async function setPassword(username, password) {

    if (!password || password.length < 12) {
        throw new Error("Operator passwords must be at least 12 characters.");
    }

    const row = await get(
        `UPDATE admin_users
         SET password_hash = $2, updated_at = $3
         WHERE username = $1
         RETURNING *`,
        [normalise(username), await bcrypt.hash(password, BCRYPT_ROUNDS), nowIso()]
    );

    return toAdmin(row);

}

// Deactivating rather than deleting: order_events names these people, and an
// operator who disappears from the table makes months of history read as
// though it was written by someone who never existed.
async function setActive(username, active) {

    const row = await get(
        `UPDATE admin_users
         SET active = $2, updated_at = $3
         WHERE username = $1
         RETURNING *`,
        [normalise(username), active ? 1 : 0, nowIso()]
    );

    return toAdmin(row);

}

async function list() {
    const rows = await all("SELECT * FROM admin_users ORDER BY display_name ASC");
    return rows.map(toAdmin);
}

async function countActive() {
    const row = await get("SELECT COUNT(*)::int AS n FROM admin_users WHERE active = 1");
    return row ? row.n : 0;
}

module.exports = {
    create,
    verifyPassword,
    recordLogin,
    setPassword,
    setActive,
    list,
    countActive
};
