const crypto = require("crypto");

const db = require("./database");

function nowIso() {
    return new Date().toISOString();
}

function toPayment(row) {

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        bookId: row.book_id,
        razorpayOrderId: row.razorpay_order_id,
        razorpayPaymentId: row.razorpay_payment_id,
        status: row.status,
        amount: row.amount,
        currency: row.currency,
        addOnIds: row.add_on_ids ? JSON.parse(row.add_on_ids) : [],
        couponCode: row.coupon_code,
        orderId: row.order_id,
        failureReason: row.failure_reason,
        refundId: row.refund_id,
        refundedAt: row.refunded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

}

// One row per "intent to pay" — created the moment the Razorpay order is
// created (before the customer has actually paid), so a payment that
// never completes still leaves an auditable trail instead of vanishing.
// addOnIds/couponCode are stored here (not just on the eventual order) so
// the webhook path — which never sees the browser's checkout state — has
// everything it needs to recompute the same order.
function createPayment({
    userId,
    bookId,
    razorpayOrderId,
    amount,
    currency,
    addOnIds,
    couponCode
}) {

    const id = `pay_${crypto.randomUUID()}`;
    const timestamp = nowIso();

    db.prepare(
        `INSERT INTO payments
            (id, user_id, book_id, razorpay_order_id, razorpay_payment_id, status, amount, currency, add_on_ids, coupon_code, order_id, failure_reason, created_at, updated_at)
         VALUES
            (@id, @userId, @bookId, @razorpayOrderId, NULL, 'created', @amount, @currency, @addOnIds, @couponCode, NULL, NULL, @createdAt, @updatedAt)`
    ).run({
        id,
        userId,
        bookId,
        razorpayOrderId,
        amount,
        currency,
        addOnIds: JSON.stringify(addOnIds || []),
        couponCode: couponCode ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
    });

    return getPaymentByRazorpayOrderId(razorpayOrderId);

}

function getPaymentByRazorpayOrderId(razorpayOrderId) {
    const row = db.prepare("SELECT * FROM payments WHERE razorpay_order_id = ?").get(razorpayOrderId);
    return toPayment(row);
}

function getPaymentByRazorpayPaymentId(razorpayPaymentId) {
    const row = db.prepare("SELECT * FROM payments WHERE razorpay_payment_id = ?").get(razorpayPaymentId);
    return toPayment(row);
}

function getPaymentById(id) {
    const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
    return toPayment(row);
}

// "Orphaned" = Razorpay actually captured the money (status 'captured')
// but no order ever got linked to it (order_id IS NULL) — the dead end
// described in BACKLOG.md's payments review: it means both finalization
// paths (the browser's /payments/verify call and the webhook) failed to
// complete, e.g. the browser tab died AND the webhook was misconfigured,
// or order creation itself threw after claimCapture already flipped the
// status. This is the query both the admin "orphaned payments" view and
// the automatic reconciliation sweep are built on.
function findOrphanedCapturedPayments() {
    const rows = db.prepare(
        "SELECT * FROM payments WHERE status = 'captured' AND order_id IS NULL ORDER BY updated_at ASC"
    ).all();
    return rows.map(toPayment);
}

// The idempotency gate the whole double-finalization problem hinges on:
// the browser's /payments/verify call and the async webhook can both try
// to finalize the same razorpay_order_id, sometimes nearly simultaneously.
// The `WHERE status != 'captured'` makes this UPDATE a no-op for whichever
// caller loses the race — result.changes tells the caller whether *it*
// was the one that actually flipped the row, so only that caller goes on
// to create the real order. Safe without extra locking because
// better-sqlite3 is synchronous and single-threaded per process, so
// SQLite itself serializes the two UPDATEs.
//
// This deliberately does NOT set order_id yet — the order doesn't exist
// at the moment a caller wins this claim, it's created right after. See
// linkOrder below for the follow-up write, kept as a separate statement
// (rather than folding order_id into this UPDATE) precisely so it isn't
// gated behind the same "status != 'captured'" condition, which would
// never match once this call has already flipped the status.
//
// Also excludes 'refunding'/'refunded' — without that, a Razorpay webhook
// that arrives late (their retries can span hours) for a payment the
// orphaned-payment sweep already refunded would re-claim it and create a
// real order for money that's already been sent back to the customer.
// Once a payment reaches either of those states it's done for good; the
// worst case for a late webhook/verify call is the generic
// paymentFailureError() below, not a free order.
function claimCapture({ razorpayOrderId, razorpayPaymentId }) {

    const result = db.prepare(
        `UPDATE payments
         SET status = 'captured', razorpay_payment_id = @razorpayPaymentId, updated_at = @updatedAt
         WHERE razorpay_order_id = @razorpayOrderId AND status NOT IN ('captured', 'refunding', 'refunded')`
    ).run({
        razorpayOrderId,
        razorpayPaymentId,
        updatedAt: nowIso()
    });

    return {
        wasFirstCapture: result.changes > 0,
        payment: getPaymentByRazorpayOrderId(razorpayOrderId)
    };

}

// Only ever called by whichever caller won claimCapture above, right
// after it finishes creating the real order — links the two records
// together for admin/debugging traceability.
function linkOrder({ razorpayOrderId, orderId }) {

    db.prepare(
        `UPDATE payments
         SET order_id = @orderId, updated_at = @updatedAt
         WHERE razorpay_order_id = @razorpayOrderId`
    ).run({
        razorpayOrderId,
        orderId,
        updatedAt: nowIso()
    });

}

function markFailed({ razorpayOrderId, reason }) {

    db.prepare(
        `UPDATE payments
         SET status = 'failed', failure_reason = @reason, updated_at = @updatedAt
         WHERE razorpay_order_id = @razorpayOrderId AND status != 'captured'`
    ).run({
        razorpayOrderId,
        reason: reason ?? null,
        updatedAt: nowIso()
    });

    return getPaymentByRazorpayOrderId(razorpayOrderId);

}

// The refund equivalent of claimCapture above: an atomic gate so a
// payment can only ever be claimed for refunding once, no matter whether
// it's the automatic sweep or an admin's manual click that gets there
// first, and no matter how many times either runs. The WHERE clause is
// the whole safety net — it only succeeds against a payment that is
// still 'captured' AND still unlinked, so it can never fire against a
// payment that a legitimate order has since been created for (which
// would mean refunding money for a book the customer actually received).
function claimRefund({ razorpayOrderId }) {

    const result = db.prepare(
        `UPDATE payments
         SET status = 'refunding', updated_at = @updatedAt
         WHERE razorpay_order_id = @razorpayOrderId AND status = 'captured' AND order_id IS NULL`
    ).run({
        razorpayOrderId,
        updatedAt: nowIso()
    });

    return {
        wasClaimed: result.changes > 0,
        payment: getPaymentByRazorpayOrderId(razorpayOrderId)
    };

}

function markRefunded({ razorpayOrderId, refundId }) {

    db.prepare(
        `UPDATE payments
         SET status = 'refunded', refund_id = @refundId, refunded_at = @refundedAt, updated_at = @refundedAt
         WHERE razorpay_order_id = @razorpayOrderId AND status = 'refunding'`
    ).run({
        razorpayOrderId,
        refundId,
        refundedAt: nowIso()
    });

    return getPaymentByRazorpayOrderId(razorpayOrderId);

}

// Reverts the claim back to 'captured' so a Razorpay-side failure (rate
// limit, transient API error, the payment somehow already refunded
// directly in the dashboard) doesn't strand the row in 'refunding'
// forever — the next sweep or manual attempt can pick it back up.
// failure_reason is overwritten with the latest attempt's error so an
// admin looking at the row sees why it's still unresolved, not a stale
// reason from some earlier, unrelated issue.
function markRefundFailed({ razorpayOrderId, reason }) {

    db.prepare(
        `UPDATE payments
         SET status = 'captured', failure_reason = @reason, updated_at = @updatedAt
         WHERE razorpay_order_id = @razorpayOrderId AND status = 'refunding'`
    ).run({
        razorpayOrderId,
        reason: reason ?? null,
        updatedAt: nowIso()
    });

    return getPaymentByRazorpayOrderId(razorpayOrderId);

}

module.exports = {
    createPayment,
    getPaymentByRazorpayOrderId,
    getPaymentByRazorpayPaymentId,
    getPaymentById,
    findOrphanedCapturedPayments,
    claimCapture,
    linkOrder,
    markFailed,
    claimRefund,
    markRefunded,
    markRefundFailed
};
