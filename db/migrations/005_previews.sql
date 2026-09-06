-- The preview a parent sees before their book goes to print, and whatever
-- they send back about it.
--
-- A preview is uploaded against an order by an operator and is NOT visible to
-- the customer until it is explicitly released. That is the whole point of the
-- status column: pages can sit in S3 for as long as the operator needs to look
-- at them, and nothing reaches a parent until somebody decides it is good
-- enough. Nothing here is generated on demand.
CREATE TABLE IF NOT EXISTS previews (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,

    -- draft              uploaded, operator only, invisible to the customer
    -- live               released; the parent can see it and respond
    -- approved           parent pressed "Looks good" — proceed to print
    -- changes_requested  parent asked for something to change
    -- cancelled          parent asked to cancel
    status     TEXT NOT NULL DEFAULT 'draft',

    -- A JSON array of S3 keys, in page order. A blob rather than a child
    -- table because the shape is still moving and the pages are only ever
    -- read together — the same reasoning as books.data.
    pages      TEXT NOT NULL DEFAULT '[]',

    released_at      TEXT,
    -- Set the first time the parent opens it. The response window is measured
    -- from release, not from this — a parent who never looks should not get an
    -- indefinite window — but knowing whether they looked at all is the
    -- difference between "they hated it" and "they never saw it".
    first_viewed_at  TEXT,
    -- Released + the response window. Stored rather than computed so changing
    -- the window later cannot silently move the deadline for previews already
    -- out with customers.
    respond_by       TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_previews_status ON previews(status);

-- Everything that arrives through the Support menu on the preview page:
-- change requests, questions, and cancellations. Cancellation is one kind of
-- request rather than its own mechanism, because it sits alongside "request
-- changes" — most people who are unhappy want the right book rather than
-- their money back, and the two should be equally easy to ask for.
CREATE TABLE IF NOT EXISTS support_requests (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- changes | cancel | question
    kind       TEXT NOT NULL,
    message    TEXT NOT NULL,

    -- open | resolved
    status     TEXT NOT NULL DEFAULT 'open',
    resolved_at TEXT,
    resolved_by TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_requests_order  ON support_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
