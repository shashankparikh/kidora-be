-- Razorpay payments. Ported from the payments table that
-- db/database.js created inline under better-sqlite3.
--
-- A payment row is created before the customer is sent to Razorpay and
-- finalised by whichever path arrives first — the browser's /payments/verify
-- call or the asynchronous webhook. See db/paymentStore.js's claimCapture for
-- how that race is resolved.
--
-- add_on_ids and coupon_code are duplicated here rather than derived from the
-- eventual order, because the webhook path never sees the browser's in-memory
-- checkout state and needs everything required to price the order on its own.
--
-- status also covers the refund dead end: 'captured' with order_id still NULL
-- means Razorpay took the money but neither finalisation path created an order
-- for it (see services/paymentService.js reconcileOrphanedPayments). That is
-- what refund_id, refunded_at and the transient 'refunding' status exist for.
--
-- TYPE NOTE, consistent with orders.total in 001_init.sql: amount is DOUBLE
-- PRECISION rather than NUMERIC. node-postgres returns NUMERIC as a *string*
-- to preserve arbitrary precision, which would silently turn arithmetic on a
-- payment amount into string concatenation.
CREATE TABLE IF NOT EXISTS payments (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id             TEXT NOT NULL,
    razorpay_order_id   TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    status              TEXT NOT NULL DEFAULT 'created',
    amount              DOUBLE PRECISION NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'INR',
    add_on_ids          TEXT NOT NULL DEFAULT '[]',
    coupon_code         TEXT,
    order_id            TEXT REFERENCES orders(id),
    failure_reason      TEXT,
    refund_id           TEXT,
    refunded_at         TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id  ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
