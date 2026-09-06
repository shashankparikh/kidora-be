const crypto = require("crypto");

const { all, get, run } = require("./database");

// How long a parent has to respond once a preview is released, and when we
// nudge them along the way. Stored on the row at release time rather than
// computed at read time, so changing these numbers cannot move the deadline
// for previews already out with customers.
//
//   0h   preview released, email sent
//   24h  first nudge — "anything you'd like changed?"
//   48h  second nudge — "we'll print soon if we don't hear"
//   72h  window closes
const RESPONSE_WINDOW_HOURS = Number(process.env.PREVIEW_RESPONSE_HOURS || 72);
const NUDGE_HOURS = [24, 48];

function nowIso() {
    return new Date().toISOString();
}

function toPreview(row) {

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        orderId: row.order_id,
        status: row.status,
        pages: row.pages ? JSON.parse(row.pages) : [],
        releasedAt: row.released_at,
        firstViewedAt: row.first_viewed_at,
        respondBy: row.respond_by,
        nudgesSent: row.nudges_sent,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

}

// One preview per order, so this is an upsert: re-uploading replaces the
// pages rather than creating a second preview the operator then has to choose
// between. Re-uploading also drops it back to draft — new pages have not been
// looked at, and a preview that was live should not silently start showing
// different images to a parent who is mid-decision.
async function upsertDraft({ orderId, pages }) {

    const now = nowIso();

    const row = await get(
        `INSERT INTO previews (id, order_id, status, pages, created_at, updated_at)
         VALUES ($1, $2, 'draft', $3, $4, $4)
         ON CONFLICT (order_id) DO UPDATE
             SET pages = $3,
                 status = 'draft',
                 released_at = NULL,
                 respond_by = NULL,
                 nudges_sent = 0,
                 updated_at = $4
         RETURNING *`,
        [`prv_${crypto.randomUUID()}`, orderId, JSON.stringify(pages || []), now]
    );

    return toPreview(row);

}

async function getByOrderId(orderId) {
    const row = await get("SELECT * FROM previews WHERE order_id = $1", [orderId]);
    return toPreview(row);
}

async function getById(id) {
    const row = await get("SELECT * FROM previews WHERE id = $1", [id]);
    return toPreview(row);
}

// The operator deciding a preview is good enough to show. Only a draft can be
// released — releasing an already-live preview would silently reset the
// parent's response window, and releasing one they have already answered
// would reopen a closed decision.
async function release(orderId) {

    const now = new Date();
    const respondBy = new Date(now.getTime() + RESPONSE_WINDOW_HOURS * 3600_000);

    const row = await get(
        `UPDATE previews
         SET status = 'live', released_at = $2, respond_by = $3,
             nudges_sent = 0, updated_at = $2
         WHERE order_id = $1 AND status = 'draft'
         RETURNING *`,
        [orderId, now.toISOString(), respondBy.toISOString()]
    );

    return toPreview(row);

}

// Pulls a live preview back out of the customer's hands, back to draft.
// For the case where an operator releases something and immediately spots a
// problem with it.
// Pulling a preview back out of the customer's hands. Reachable from
// 'changes_requested' as well as 'live', because that is the ordinary case:
// the parent asks for a change, the operator withdraws the preview to redo a
// page. Leaving it out meant the order moved back to PREVIEW_GENERATED while
// the customer could still open the old pages and the 72h clock kept running
// toward auto-approve.
//
// The counters reset with it. What follows a re-release is a fresh window,
// so nudges must fire again and "not opened yet" must mean this preview, not
// the one it replaced. The event log keeps the history; this row is state.
async function unrelease(orderId) {

    const row = await get(
        `UPDATE previews
         SET status = 'draft', released_at = NULL, respond_by = NULL,
             first_viewed_at = NULL, nudges_sent = 0, updated_at = $2
         WHERE order_id = $1 AND status IN ('live', 'changes_requested')
         RETURNING *`,
        [orderId, nowIso()]
    );

    return toPreview(row);

}

// Recorded once, on the first open. Never overwritten — the useful fact is
// whether and when they first looked, not when they last did.
async function markViewed(orderId) {
    await run(
        `UPDATE previews SET first_viewed_at = $2, updated_at = $2
         WHERE order_id = $1 AND first_viewed_at IS NULL`,
        [orderId, nowIso()]
    );
}

// The parent's answer. Guarded on status = 'live' so a decision cannot be
// changed after the fact, and so a preview that was pulled back to draft
// cannot be answered against.
async function respond(orderId, status) {

    if (!["approved", "changes_requested", "cancelled"].includes(status)) {
        throw new Error(`Not a valid preview response: ${status}`);
    }

    const row = await get(
        `UPDATE previews SET status = $2, updated_at = $3
         WHERE order_id = $1 AND status = 'live'
         RETURNING *`,
        [orderId, status, nowIso()]
    );

    return toPreview(row);

}

// Operator view: everything waiting on somebody, oldest first.
async function listByStatus(status) {

    const rows = status
        ? await all("SELECT * FROM previews WHERE status = $1 ORDER BY updated_at ASC", [status])
        : await all("SELECT * FROM previews ORDER BY updated_at DESC");

    return rows.map(toPreview);

}

// Live previews that are due a nudge: released at least `afterHours` ago and
// not yet nudged that many times. nudges_sent is the guard against a restart
// or an overlapping sweep sending the same reminder twice — the count only
// ever goes up, and only for previews still awaiting an answer.
async function dueForNudge(afterHours, nudgeNumber) {
    const cutoff = new Date(Date.now() - afterHours * 3600_000).toISOString();
    const rows = await all(
        `SELECT * FROM previews
         WHERE status = 'live'
           AND released_at IS NOT NULL
           AND released_at <= $1
           AND nudges_sent < $2
         ORDER BY released_at ASC`,
        [cutoff, nudgeNumber]
    );
    return rows.map(toPreview);
}

async function recordNudge(id, nudgeNumber) {
    const { changes } = await run(
        `UPDATE previews SET nudges_sent = $2, updated_at = $3
         WHERE id = $1 AND nudges_sent < $2`,
        [id, nudgeNumber, nowIso()]
    );
    return changes > 0;
}

// Live previews whose window has closed with no answer. Returned rather than
// acted on here — what happens to them is a policy decision that belongs in
// the service, not the store.
async function expired() {
    const rows = await all(
        `SELECT * FROM previews
         WHERE status = 'live' AND respond_by IS NOT NULL AND respond_by <= $1
         ORDER BY respond_by ASC`,
        [nowIso()]
    );
    return rows.map(toPreview);
}

module.exports = {
    RESPONSE_WINDOW_HOURS,
    NUDGE_HOURS,
    dueForNudge,
    recordNudge,
    expired,
    upsertDraft,
    getByOrderId,
    getById,
    release,
    unrelease,
    markViewed,
    respond,
    listByStatus
};
