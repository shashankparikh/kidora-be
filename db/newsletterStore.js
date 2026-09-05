const crypto = require("crypto");

const { get, run } = require("./database");

function nowIso() {
    return new Date().toISOString();
}

async function subscribe(email) {

    const id = `sub_${crypto.randomUUID()}`;

    // ON CONFLICT DO NOTHING is Postgres's INSERT OR IGNORE — re-subscribing
    // with the same email is a no-op, not an error, since from the visitor's
    // side "sign me up" should always feel like it worked.
    await run(
        `INSERT INTO newsletter_subscribers (id, email, subscribed_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [id, email, nowIso()]
    );

    return { email };

}

async function isSubscribed(email) {

    const row = await get(
        "SELECT 1 FROM newsletter_subscribers WHERE email = $1",
        [email]
    );

    return Boolean(row);

}

module.exports = {
    subscribe,
    isSubscribed
};
