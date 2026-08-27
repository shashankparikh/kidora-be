const crypto = require("crypto");

const { all, get, run } = require("./database");

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
        return "An OopsyInk parent";
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

async function createReview({
    orderId, userId, bookId, childName, storyTheme, rating, title, comment
}) {

    const id = `rev_${crypto.randomUUID()}`;
    const timestamp = nowIso();

    await run(
        `INSERT INTO reviews
            (id, order_id, user_id, book_id, child_name, story_theme, rating,
             title, comment, status, created_at, updated_at)
         VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $10)`,
        [
            id,
            orderId,
            userId,
            bookId,
            childName ?? null,
            storyTheme ?? null,
            rating,
            title ?? null,
            comment ?? null,
            timestamp
        ]
    );

    // Re-read rather than RETURNING *: the public shape joins the author's
    // name off the users table, which the INSERT has no access to.
    return getReviewById(id);

}

const SELECT_WITH_AUTHOR = `
    SELECT r.*, u.first_name, u.last_name, u.email
    FROM reviews r
    JOIN users u ON u.id = r.user_id
`;

async function getReviewById(id) {
    const row = await get(`${SELECT_WITH_AUTHOR} WHERE r.id = $1`, [id]);
    return toPublicReview(row);
}

async function getReviewByOrderId(orderId) {
    const row = await get(`${SELECT_WITH_AUTHOR} WHERE r.order_id = $1`, [orderId]);
    return toPublicReview(row);
}

async function listApprovedReviews({ theme, limit } = {}) {

    const conditions = ["r.status = 'approved'"];
    const params = [];

    if (theme) {
        params.push(theme);
        conditions.push(`r.story_theme = $${params.length}`);
    }

    let query =
        `${SELECT_WITH_AUTHOR} WHERE ${conditions.join(" AND ")} ` +
        "ORDER BY r.created_at DESC";

    if (limit) {
        params.push(limit);
        query += ` LIMIT $${params.length}`;
    }

    const rows = await all(query, params);

    return rows.map(toPublicReview);

}

// 1-5 breakdown + average, approved reviews only — used for the summary
// block above the review grid (e.g. "4.9, based on 312 reviews").
async function getSummary() {

    // COUNT(*) is bigint, and node-postgres returns bigint as a STRING so
    // that values beyond Number.MAX_SAFE_INTEGER survive the trip. Without
    // the ::int cast, `totalScore += row.rating * row.count` still works
    // (multiplication coerces) but `totalCount += row.count` concatenates —
    // "0" + "5" + "3" — and the average comes out as a fraction of a
    // nonsense number. Casting in SQL fixes it once, at the source.
    const rows = await all(
        `SELECT rating, COUNT(*)::int AS count
         FROM reviews
         WHERE status = 'approved'
         GROUP BY rating`
    );

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let totalScore = 0;

    for (const row of rows) {
        breakdown[row.rating] = row.count;
        totalCount += row.count;
        totalScore += row.rating * row.count;
    }

    return {
        average:
            totalCount > 0
                ? Math.round((totalScore / totalCount) * 10) / 10
                : 0,
        count: totalCount,
        breakdown
    };

}

// Admin-facing: every review across every customer, optionally filtered
// by status (pending / approved / rejected). Superset of the old
// listPendingReviews — the admin moderation screen wants to see all
// three buckets, not just the pending queue.
async function listAllReviews({ status } = {}) {

    const conditions = [];
    const params = [];

    if (status) {
        params.push(status);
        conditions.push(`r.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `${SELECT_WITH_AUTHOR} ${where} ORDER BY r.created_at DESC`;

    const rows = await all(query, params);

    return rows.map(toPublicReview);

}

async function setReviewStatus(id, status) {

    await run(
        "UPDATE reviews SET status = $1, updated_at = $2 WHERE id = $3",
        [status, nowIso(), id]
    );

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
