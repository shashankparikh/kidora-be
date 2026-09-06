const crypto = require("crypto");

const { all, get, run, tx } = require("../db/database");

// The fulfilment pipeline.
//
// Ordered roughly as an order moves through it, though not every order visits
// every state — a buyer asking for changes goes back to PREVIEW_GENERATED,
// and a cancellation can end things early.
const STATUS = {
    NEW_ORDER:             "NEW_ORDER",
    PREVIEW_GENERATED:     "PREVIEW_GENERATED",
    PENDING_REVIEW:        "PENDING_REVIEW",
    BUYER_COMMENTS:        "BUYER_COMMENTS",
    PREVIEW_APPROVED:      "PREVIEW_APPROVED",
    PREVIEW_AUTO_APPROVED: "PREVIEW_AUTO_APPROVED",
    BOOK_GENERATED:        "BOOK_GENERATED",
    PRINTING:              "PRINTING",
    SHIPPED:               "SHIPPED",
    DELIVERED:             "DELIVERED",
    CANCELLED:             "CANCELLED"
};

// PREVIEW_APPROVED and PREVIEW_AUTO_APPROVED sit at the same point in the
// pipeline and could have been one state. They are kept apart because the
// difference matters to whoever prints the book: an auto-approval means
// nobody ever opened the preview, and that is worth a closer look before
// committing to paper than a book the parent actually said yes to.
const AUTO_APPROVED_NEEDS_CARE = STATUS.PREVIEW_AUTO_APPROVED;

// What each state means for the person waiting for a book. Several internal
// states collapse to one customer-facing line — a buyer does not need to know
// the difference between "we have made the pages" and "we have not sent them
// yet", and showing them would invite questions we do not want to answer.
const CUSTOMER_LABEL = {
    NEW_ORDER:             "We've started on the book",
    PREVIEW_GENERATED:     "We've started on the book",
    PENDING_REVIEW:        "Your preview is ready",
    BUYER_COMMENTS:        "We're making your changes",
    PREVIEW_APPROVED:      "Approved — off to be made",
    PREVIEW_AUTO_APPROVED: "Approved — off to be made",
    BOOK_GENERATED:        "Your book is being prepared",
    PRINTING:              "At the printer",
    SHIPPED:               "On its way to you",
    DELIVERED:             "Delivered",
    CANCELLED:             "Cancelled"
};

// The states where the ball is in our court. The queue board sorts on this
// (see adminController.orderQueue) and labels on it (see the admin app's
// statusMeta.ts, which mirrors this list) — an operator opening that screen
// is looking for work to do, and recency alone puts finished orders on top
// simply because they were the last thing touched.
const NEEDS_US = [
    STATUS.NEW_ORDER,
    STATUS.PREVIEW_GENERATED,
    STATUS.BUYER_COMMENTS,
    STATUS.PREVIEW_APPROVED,
    STATUS.PREVIEW_AUTO_APPROVED,
    STATUS.BOOK_GENERATED,
    STATUS.PRINTING
];

// Which states an operator can move an order into by hand, from where.
// Deliberately not a full state machine — the pipeline is not always linear
// and an operator sometimes needs to correct a mistake — but it stops the
// obviously wrong moves, like un-cancelling or shipping something unprinted.
const MANUAL_TRANSITIONS = {
    NEW_ORDER:             [STATUS.PREVIEW_GENERATED, STATUS.CANCELLED],
    PREVIEW_GENERATED:     [STATUS.PENDING_REVIEW, STATUS.CANCELLED],
    PENDING_REVIEW:        [STATUS.PREVIEW_GENERATED, STATUS.CANCELLED],
    BUYER_COMMENTS:        [STATUS.PREVIEW_GENERATED, STATUS.CANCELLED],
    PREVIEW_APPROVED:      [STATUS.BOOK_GENERATED, STATUS.CANCELLED],
    PREVIEW_AUTO_APPROVED: [STATUS.BOOK_GENERATED, STATUS.CANCELLED],
    BOOK_GENERATED:        [STATUS.PRINTING],
    PRINTING:              [STATUS.SHIPPED],
    SHIPPED:               [STATUS.DELIVERED],
    DELIVERED:             [],
    CANCELLED:             []
};

function nowIso() {
    return new Date().toISOString();
}

// The single place an order's status changes.
//
// The row and its event are written in one transaction, so the history can
// never disagree with the current state — an audit trail with gaps in it is
// worse than none, because it is trusted.
async function setStatus(orderId, toStatus, { actorType = "system", actor = null, message = null } = {}) {

    if (!STATUS[toStatus]) {
        throw new Error(`Not a known order status: ${toStatus}`);
    }

    return tx(async (client) => {

        const current = await client.query(
            "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
            [orderId]
        );

        if (!current.rows[0]) {
            throw new Error("Order not found.");
        }

        const fromStatus = current.rows[0].status;

        // Re-entering the same state is a no-op rather than an error. Both
        // the sweep and an operator can arrive at the same conclusion, and
        // the second one should not fail.
        if (fromStatus === toStatus) {
            return { changed: false, fromStatus, toStatus };
        }

        await client.query(
            "UPDATE orders SET status = $2, updated_at = $3 WHERE id = $1",
            [orderId, toStatus, nowIso()]
        );

        await client.query(
            `INSERT INTO order_events
                (id, order_id, kind, from_status, to_status, message, actor_type, actor, created_at)
             VALUES ($1, $2, 'status_change', $3, $4, $5, $6, $7, $8)`,
            [`evt_${crypto.randomUUID()}`, orderId, fromStatus, toStatus, message, actorType, actor, nowIso()]
        );

        return { changed: true, fromStatus, toStatus };

    });

}

// A note against an order that does not move it: internal team notes, and
// messages from the buyer. Same table as status changes so the timeline is
// one ordered story rather than two lists a reader has to interleave.
async function addNote(orderId, { kind, message, actorType = "admin", actor = null }) {

    if (!["internal_note", "buyer_message", "system_note"].includes(kind)) {
        throw new Error(`Not a valid note kind: ${kind}`);
    }

    const row = await get(
        `INSERT INTO order_events
            (id, order_id, kind, message, actor_type, actor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [`evt_${crypto.randomUUID()}`, orderId, kind, message, actorType, actor, nowIso()]
    );

    return row;

}

async function timeline(orderId) {
    return all(
        "SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at DESC",
        [orderId]
    );
}

// The activity feed across every order — what the queue screen shows down one
// side so an operator can see what has moved since they last looked.
async function recentActivity(limit = 50) {
    return all(
        `SELECT e.*, o.child_name, o.book_title
         FROM order_events e
         JOIN orders o ON o.id = e.order_id
         ORDER BY e.created_at DESC
         LIMIT $1`,
        [Math.min(Number(limit) || 50, 200)]
    );
}

// How many orders sit in each state. Drives the queue's tab counts, and is
// the one number an operator looks at to know whether anything is stuck.
async function counts() {
    const rows = await all("SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status");
    const out = Object.fromEntries(Object.keys(STATUS).map((s) => [s, 0]));
    rows.forEach((r) => { out[r.status] = r.n; });
    return out;
}

module.exports = {
    STATUS,
    CUSTOMER_LABEL,
    NEEDS_US,
    MANUAL_TRANSITIONS,
    AUTO_APPROVED_NEEDS_CARE,
    setStatus,
    addNote,
    timeline,
    recentActivity,
    counts
};
