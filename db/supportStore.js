const crypto = require("crypto");

const { all, get, run } = require("./database");

const KINDS = ["changes", "cancel", "question"];

function nowIso() {
    return new Date().toISOString();
}

function toRequest(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        orderId: row.order_id,
        userId: row.user_id,
        kind: row.kind,
        message: row.message,
        status: row.status,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by,
        createdAt: row.created_at,
        // present only on the admin listing, which joins the customer
        customerName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        customerEmail: row.email || null,
        childName: row.child_name || null
    };
}

async function create({ orderId, userId, kind, message }) {

    if (!KINDS.includes(kind)) {
        throw new Error(`Not a valid support request kind: ${kind}`);
    }

    const now = nowIso();

    const row = await get(
        `INSERT INTO support_requests
            (id, order_id, user_id, kind, message, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'open', $6, $6)
         RETURNING *`,
        [`sup_${crypto.randomUUID()}`, orderId, userId, kind, message, now]
    );

    return toRequest(row);

}

// Admin listing. Joins the customer and the order so an operator can act on a
// request without opening three other screens to find out who sent it and
// which child's book it is about.
const SELECT_WITH_CONTEXT = `
    SELECT s.*, u.first_name, u.last_name, u.email, o.child_name
    FROM support_requests s
    JOIN users u  ON u.id = s.user_id
    JOIN orders o ON o.id = s.order_id
`;

async function listAll({ status, kind } = {}) {

    const where = [];
    const params = [];

    if (status) {
        params.push(status);
        where.push(`s.status = $${params.length}`);
    }
    if (kind) {
        params.push(kind);
        where.push(`s.kind = $${params.length}`);
    }

    const rows = await all(
        `${SELECT_WITH_CONTEXT}
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY s.created_at DESC`,
        params
    );

    return rows.map(toRequest);

}

async function listForOrder(orderId) {
    const rows = await all(
        `${SELECT_WITH_CONTEXT} WHERE s.order_id = $1 ORDER BY s.created_at DESC`,
        [orderId]
    );
    return rows.map(toRequest);
}

async function resolve(id, resolvedBy) {
    const row = await get(
        `UPDATE support_requests
         SET status = 'resolved', resolved_at = $2, resolved_by = $3, updated_at = $2
         WHERE id = $1 AND status = 'open'
         RETURNING *`,
        [id, nowIso(), resolvedBy ?? null]
    );
    return toRequest(row);
}

async function countOpen() {
    const row = await get("SELECT COUNT(*)::int AS n FROM support_requests WHERE status = 'open'");
    return row ? row.n : 0;
}

module.exports = {
    KINDS,
    create,
    listAll,
    listForOrder,
    resolve,
    countOpen
};
