const crypto = require("crypto");

const db = require("./database");

function nowIso() {
    return new Date().toISOString();
}

function subscribe(email) {

    const id = `sub_${crypto.randomUUID()}`;

    // INSERT OR IGNORE — re-subscribing with the same email is a no-op,
    // not an error, since from the visitor's side "sign me up" should
    // always feel like it worked.
    db.prepare(
        `INSERT OR IGNORE INTO newsletter_subscribers (id, email, subscribed_at)
         VALUES (@id, @email, @subscribedAt)`
    ).run({ id, email, subscribedAt: nowIso() });

    return { email };

}

function isSubscribed(email) {
    const row = db.prepare(
        "SELECT 1 FROM newsletter_subscribers WHERE email = ?"
    ).get(email);
    return Boolean(row);
}

module.exports = {
    subscribe,
    isSubscribed
};
