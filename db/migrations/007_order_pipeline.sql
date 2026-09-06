-- The fulfilment pipeline, and an append-only record of everything that
-- happens to an order.
--
-- orders.status was deliberately left free-form when the table was created
-- ("so a real fulfillment pipeline can introduce intermediate states later
-- without a schema change"), so this extends that column rather than adding a
-- second one. One source of truth; what the customer is shown is a mapping
-- applied at read time, not a separate stored value that can drift.

-- Existing rows were created under the old model, where a digital book was
-- delivered the instant it was paid for. They genuinely are delivered.
UPDATE orders SET status = 'DELIVERED' WHERE status = 'delivered';

-- Everything that has happened to an order, in order: status changes, notes
-- the team leaves for each other, and messages from the buyer.
--
-- Append-only. Nothing here is ever updated or deleted — when an operator is
-- asked why a book shipped late, or why a refund was given, the answer has to
-- be a record rather than a recollection. It also means a wrong status can be
-- corrected by adding a new event rather than by rewriting history.
CREATE TABLE IF NOT EXISTS order_events (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- status_change | internal_note | buyer_message | system_note
    kind        TEXT NOT NULL,

    -- Populated for status_change. from_status is nullable because the very
    -- first event on an order has nothing to come from.
    from_status TEXT,
    to_status   TEXT,

    message     TEXT,

    -- system | admin | customer — who caused this. Kept separate from the
    -- name so "was this a person or the sweep" is answerable without parsing
    -- a string, which matters most for auto-approvals.
    actor_type  TEXT NOT NULL DEFAULT 'system',
    actor       TEXT,

    created_at  TEXT NOT NULL
);

-- The queue view reads by order, newest first.
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at DESC);
-- The activity feed reads across all orders, newest first.
CREATE INDEX IF NOT EXISTS idx_order_events_recent ON order_events(created_at DESC);
-- The queue groups and filters by status.
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
