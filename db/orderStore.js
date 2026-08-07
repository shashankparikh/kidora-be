const crypto = require("crypto");

const db = require("./database");

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
        total: row.total,
        placedAt: row.placed_at,
        deliveredAt: row.delivered_at,
        hasReview: Boolean(row.has_review)
    };

}

// Orders are always created "delivered" — see the comment on the orders
// table in database.js for why. deliveredAt mirrors placedAt for the
// same reason.
function createOrder({
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

    db.prepare(
        `INSERT INTO orders
            (id, user_id, book_id, book_title, cover_image_url, story_theme, child_name, status, total, placed_at, delivered_at, updated_at)
         VALUES
            (@id, @userId, @bookId, @bookTitle, @coverImageUrl, @storyTheme, @childName, 'delivered', @total, @placedAt, @deliveredAt, @updatedAt)`
    ).run({
        id,
        userId,
        bookId,
        bookTitle: bookTitle ?? null,
        coverImageUrl: coverImageUrl ?? null,
        storyTheme: storyTheme ?? null,
        childName: childName ?? null,
        total,
        placedAt: timestamp,
        deliveredAt: timestamp,
        updatedAt: timestamp
    });

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
        EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id) AS has_review
    FROM orders o
`;

function getOrderById(id) {
    const row = db.prepare(`${SELECT_WITH_REVIEW_FLAG} WHERE o.id = ?`).get(id);
    return toPublicOrder(row);
}

function getOrderByIdForUser(id, userId) {
    const row = db.prepare(`${SELECT_WITH_REVIEW_FLAG} WHERE o.id = ? AND o.user_id = ?`).get(id, userId);
    return toPublicOrder(row);
}

function listOrdersForUser(userId) {
    const rows = db.prepare(
        `${SELECT_WITH_REVIEW_FLAG} WHERE o.user_id = ? ORDER BY o.placed_at DESC`
    ).all(userId);
    return rows.map(toPublicOrder);
}

module.exports = {
    createOrder,
    getOrderById,
    getOrderByIdForUser,
    listOrdersForUser
};
