const crypto = require("crypto");

const db = require("./database");

function nowIso() {
    return new Date().toISOString();
}

// firstName + last-initial ("Riya K.") — matches the format of the
// original hand-written testimonials, and avoids putting a customer's
// full last name on a public page.
function formatAuthorName(firstName, lastName) {

    const first = (firstName || "").trim();
    const lastInitial = (lastName || "").trim().charAt(0);

    if (!first) {
        return "A Kidora parent";
    }

    return lastInitial ? `${first} ${lastInitial}.` : first;

}

function toPublicReview(row) {

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        orderId: row.order_id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        childName: row.child_name,
        storyTheme: row.story_theme,
        status: row.status,
        author: formatAuthorName(row.first_name, row.last_name),
        authorEmail: row.email || undefined,
        createdAt: row.created_at
    };

}

function createReview({ orderId, userId, bookId, childName, storyTheme, rating, title, comment }) {

    const id = `rev_${crypto.randomUUID()}`;
    const timestamp = nowIso();

    db.prepare(
        `INSERT INTO reviews
            (id, order_id, user_id, book_id, child_name, story_theme, rating, title, comment, status, created_at, updated_at)
         VALUES
            (@id, @orderId, @userId, @bookId, @childName, @storyTheme, @rating, @title, @comment, 'pending', @createdAt, @updatedAt)`
    ).run({
        id,
        orderId,
        userId,
        bookId,
        childName: childName ?? null,
        storyTheme: storyTheme ?? null,
        rating,
        title: title ?? null,
        comment: comment ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
    });

    return getReviewById(id);

}

const SELECT_WITH_AUTHOR = `
    SELECT r.*, u.first_name, u.last_name, u.email
    FROM reviews r
    JOIN users u ON u.id = r.user_id
`;

function getReviewById(id) {
    const row = db.prepare(`${SELECT_WITH_AUTHOR} WHERE r.id = ?`).get(id);
    return toPublicReview(row);
}

function getReviewByOrderId(orderId) {
    const row = db.prepare(`${SELECT_WITH_AUTHOR} WHERE r.order_id = ?`).get(orderId);
    return toPublicReview(row);
}

function listApprovedReviews({ theme, limit } = {}) {

    const conditions = ["r.status = 'approved'"];
    const params = {};

    if (theme) {
        conditions.push("r.story_theme = @theme");
        params.theme = theme;
    }

    let query = `${SELECT_WITH_AUTHOR} WHERE ${conditions.join(" AND ")} ORDER BY r.created_at DESC`;

    if (limit) {
        query += " LIMIT @limit";
        params.limit = limit;
    }

    return db.prepare(query).all(params).map(toPublicReview);

}

// 1-5 breakdown + average, approved reviews only — used for the summary
// block above the review grid (e.g. "4.9, based on 312 reviews").
function getSummary() {

    const rows = db.prepare(
        "SELECT rating, COUNT(*) as count FROM reviews WHERE status = 'approved' GROUP BY rating"
    ).all();

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let totalScore = 0;

    for (const row of rows) {
        breakdown[row.rating] = row.count;
        totalCount += row.count;
        totalScore += row.rating * row.count;
    }

    return {
        average: totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0,
        count: totalCount,
        breakdown
    };

}

// Admin-facing: every review across every customer, optionally filtered
// by status (pending / approved / rejected). Superset of the old
// listPendingReviews — the admin moderation screen wants to see all
// three buckets, not just the pending queue.
function listAllReviews({ status } = {}) {

    const conditions = [];
    const params = {};

    if (status) {
        conditions.push("r.status = @status");
        params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `${SELECT_WITH_AUTHOR} ${where} ORDER BY r.created_at DESC`;

    return db.prepare(query).all(params).map(toPublicReview);

}

function setReviewStatus(id, status) {

    db.prepare(
        "UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?"
    ).run(status, nowIso(), id);

    return getReviewById(id);

}

module.exports = {
    createReview,
    getReviewById,
    getReviewByOrderId,
    listApprovedReviews,
    getSummary,
    listAllReviews,
    setReviewStatus
};
