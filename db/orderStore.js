const crypto = require("crypto");

const pipeline = require("../services/orderPipeline");
const { all, get, run } = require("./database");

function nowIso() {
    return new Date().toISOString();
}

function toPublicOrder(row) {

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        bookId: row.book_id,
        bookTitle: row.book_title,
        coverImageUrl: row.cover_image_url,
        storyTheme: row.story_theme,
        childName: row.child_name,
        status: row.status,

        // What the customer is told, as opposed to where the order sits in
        // our pipeline. Several internal states collapse to one line — a
        // parent does not need to know the difference between "we have made
        // the pages" and "we have not sent them yet", and showing them the
        // raw PREVIEW_GENERATED invites a question we do not want to answer.
        customerStatus: pipeline.CUSTOMER_LABEL[row.status] || row.status,

        // Whether there is a preview for them to open. Joined in as a flag
        // rather than the preview itself: the list only needs to know if the
        // row links somewhere.
        hasPreview: Boolean(row.has_preview),

        total: row.total,
        placedAt: row.placed_at,
        deliveredAt: row.delivered_at,

        // SQLite returned 0/1 for EXISTS; Postgres returns a real boolean.
        // Boolean() normalises both, so this mapping is unchanged.
        hasReview: Boolean(row.has_review)
    };

}

function toAdminOrder(row) {

    const base = toPublicOrder(row);

    if (!base) {
        return null;
    }

    return {
        ...base,
        customerName:
            [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        customerEmail: row.email || null
    };

}

// Orders now enter the fulfilment pipeline at NEW_ORDER.
//
// They used to be created 'delivered', because the product was a digital book
// the customer could read the moment they paid. It is now a printed book that
// somebody has to make, so an order starts at the beginning of the queue —
// see services/orderPipeline.js. delivered_at is left NULL and set when the
// order actually reaches DELIVERED.
async function createOrder({
    userId,
    bookId,
    bookTitle,
    coverImageUrl,
    storyTheme,
    childName,
    total
}) {

    const id = `ord_${crypto.randomUUID()}`;
    const timestamp = nowIso();

    await run(
        `INSERT INTO orders
            (id, user_id, book_id, book_title, cover_image_url, story_theme,
             child_name, status, total, placed_at, delivered_at, updated_at)
         VALUES
            ($1, $2, $3, $4, $5, $6, $7, 'NEW_ORDER', $8, $9, NULL, $9)`,
        [
            id,
            userId,
            bookId,
            bookTitle ?? null,
            coverImageUrl ?? null,
            storyTheme ?? null,
            childName ?? null,
            total,
            timestamp
        ]
    );

    // Deliberately re-read rather than RETURNING *: the public shape needs
    // the has_review flag, which the INSERT cannot compute.
    return getOrderById(id);

}

// has_review is derived via a correlated subquery rather than a join, so
// a single row always maps to a single order regardless of how many
// reviews exist (there should only ever be 0 or 1 thanks to the UNIQUE
// constraint on reviews.order_id, but this keeps the query correct even
// if that ever changes).
const SELECT_WITH_REVIEW_FLAG = `
    SELECT
        o.*,
        EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id) AS has_review,
        EXISTS(
            SELECT 1 FROM previews p
            WHERE p.order_id = o.id AND p.status <> 'draft'
        ) AS has_preview
    FROM orders o
`;

// Admin listing also needs to know who placed the order, so this joins
// the users table on top of the review flag above.
const SELECT_ADMIN = `
    SELECT
        o.*,
        EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id) AS has_review,
        EXISTS(
            SELECT 1 FROM previews p
            WHERE p.order_id = o.id AND p.status <> 'draft'
        ) AS has_preview,
        u.first_name,
        u.last_name,
        u.email
    FROM orders o
    JOIN users u ON u.id = o.user_id
`;

async function getOrderById(id) {
    const row = await get(`${SELECT_WITH_REVIEW_FLAG} WHERE o.id = $1`, [id]);
    return toPublicOrder(row);
}

async function getOrderByIdForUser(id, userId) {
    const row = await get(
        `${SELECT_WITH_REVIEW_FLAG} WHERE o.id = $1 AND o.user_id = $2`,
        [id, userId]
    );
    return toPublicOrder(row);
}

async function listOrdersForUser(userId) {
    const rows = await all(
        `${SELECT_WITH_REVIEW_FLAG} WHERE o.user_id = $1 ORDER BY o.placed_at DESC`,
        [userId]
    );
    return rows.map(toPublicOrder);
}

// Admin-facing: every order across every customer, optionally filtered by
// the raw DB status value (callers translate any display-level aliasing,
// e.g. "success" -> "delivered", before calling this).
async function listAllOrders({ status, statuses } = {}) {

    const conditions = [];
    const params = [];

    if (status) {
        params.push(status);
        conditions.push(`o.status = $${params.length}`);
    }

    // A group of statuses — what the admin Orders filters are made of. An
    // empty array would produce `IN ()`, which pg rejects, so it is treated
    // as no filter rather than as "match nothing".
    if (Array.isArray(statuses) && statuses.length) {
        params.push(statuses);
        conditions.push(`o.status = ANY($${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await all(
        `${SELECT_ADMIN} ${where} ORDER BY o.placed_at DESC`,
        params
    );

    return rows.map(toAdminOrder);

}

module.exports = {
    createOrder,
    getOrderById,
    getOrderByIdForUser,
    listOrdersForUser,
    listAllOrders
};
