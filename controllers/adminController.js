const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");
const settingsStore = require("../db/settingsStore");
const supportService = require("../services/supportService");
const pipeline = require("../services/orderPipeline");
const { all } = require("../db/database");
const paymentService = require("../services/paymentService");
const previewStore = require("../db/previewStore");
const previewService = require("../services/previewService");
const supportStore = require("../db/supportStore");

async function listOrders(req, res) {

    const { status, group } = req.query;

    const orders = await orderService.listAllOrders({
        status: status || undefined,
        group: group || undefined
    });

    res.json({
        success: true,
        orders
    });

}

async function listReviews(req, res) {

    const { status } = req.query;

    const reviews = await reviewService.listAllReviews({ status: status || undefined });

    res.json({
        success: true,
        reviews
    });

}

async function moderateReview(req, res) {

    try {

        const review = await reviewService.moderateReview(req.params.reviewId, req.body.status);

        res.json({
            success: true,
            review
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

async function listPayments(req, res) {

    res.json({
        success: true,
        payments: await paymentService.listAllPayments()
    });

}

// Captured-but-unlinked Razorpay payments — see services/paymentService.js's
// listOrphanedPayments. Surfaced here so an operator can see what's stuck
// before deciding whether to wait for the automatic sweep or refund one
// immediately below.
async function listOrphanedPayments(req, res) {

    const payments = await paymentService.listOrphanedPayments();

    res.json({
        success: true,
        payments
    });

}

// Refunds one specific orphaned payment right now, by its internal
// payment id (as returned by listOrphanedPayments above) — see
// paymentService.refundOrphanedPaymentById for the guardrails (only ever
// touches a payment that's genuinely still an orphaned capture).
async function refundOrphanedPayment(req, res) {

    try {

        const result = await paymentService.refundOrphanedPaymentById(
            req.params.paymentId,
            req.admin?.name || null
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

// Manual trigger for the same sweep server.js runs on a timer — mainly
// useful for confirming the feature works right after deploying it,
// without waiting for the interval, or for running it once right after
// go-live rather than waiting up to the full interval for the first pass.
async function reconcileOrphanedPayments(req, res) {

    const summary = await paymentService.reconcileOrphanedPayments();

    res.json({
        success: true,
        ...summary
    });

}

async function getSettings(req, res) {

    res.json({
        success: true,
        settings: await settingsStore.getSettings()
    });

}

async function updateSettings(req, res) {

    try {

        // req.body is passed through as-is; settingsStore rejects unknown
        // keys and bad values, so validation lives in one place rather than
        // being duplicated here and drifting.
        const settings = await settingsStore.updateSettings(
            req.body,
            req.admin?.name || null
        );

        res.json({ success: true, settings });

    } catch (error) {

        // A rejected setting is operator error, not a server fault.
        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

async function listSupportRequests(req, res) {
    const requests = await supportService.listForAdmin({
        status: req.query.status || undefined,
        kind: req.query.kind || undefined
    });
    res.json({ success: true, requests });
}

async function resolveSupportRequest(req, res) {
    try {
        const request = await supportService.resolve(
            req.params.id,
            req.admin?.name || null
        );
        res.json({ success: true, request });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

// The fulfilment queue: every order with its status, plus how many sit in
// each state. One call, because an operator opening this screen wants the
// whole board rather than a page of it — at this volume that is cheap, and
// when it stops being cheap the counts are what tell you.
async function orderQueue(req, res) {

    const { status } = req.query;
    const params = [];
    let where = "";

    if (status) {
        params.push(status);
        where = "WHERE o.status = $1";
    }

    const orders = await all(
        `SELECT o.id, o.status, o.child_name, o.book_title, o.story_theme,
                o.total, o.placed_at, o.updated_at,
                u.first_name, u.last_name, u.email,
                p.status AS preview_status, p.released_at, p.first_viewed_at,
                p.respond_by, p.nudges_sent,
                (SELECT COUNT(*)::int FROM support_requests sr
                  WHERE sr.order_id = o.id AND sr.status = 'open') AS open_requests,
                (SELECT e.created_at FROM order_events e
                  WHERE e.order_id = o.id ORDER BY e.created_at DESC LIMIT 1) AS last_activity_at,
                (SELECT e.message FROM order_events e
                  WHERE e.order_id = o.id ORDER BY e.created_at DESC LIMIT 1) AS last_activity
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN previews p ON p.order_id = o.id
         ${where}
         ORDER BY
             -- Work first, recency second. An open support request outranks
             -- everything: a customer is waiting on a person, not a process.
             CASE
                 WHEN EXISTS (SELECT 1 FROM support_requests sr
                               WHERE sr.order_id = o.id AND sr.status = 'open') THEN 0
                 WHEN o.status = ANY($${params.length + 1}) THEN 1
                 ELSE 2
             END,
             o.updated_at DESC`,
        [...params, pipeline.NEEDS_US]
    );

    res.json({
        success: true,
        orders,
        counts: await pipeline.counts(),
        statuses: Object.keys(pipeline.STATUS),
        transitions: pipeline.MANUAL_TRANSITIONS
    });

}

// One order, everything about it: the order, its preview, its support
// requests, and the full timeline.
async function orderDetail(req, res) {

    const { orderId } = req.params;

    // The preview is joined here as well as on the queue. Without it the
    // detail panel cannot tell "no preview" from "a preview it was not told
    // about", and shows the former — which is worse than showing nothing,
    // because it reads as a fact.
    const order = (await all(
        `SELECT o.*, u.first_name, u.last_name, u.email,
                p.status AS preview_status, p.released_at, p.first_viewed_at,
                p.respond_by, p.nudges_sent
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN previews p ON p.order_id = o.id
         WHERE o.id = $1`,
        [orderId]
    ))[0];

    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
    }

    // The operator releases these pages to a customer; sending them blind is
    // how the wrong book reaches the wrong child. Signed URLs, same as the
    // customer gets, so what admin sees is literally what was uploaded.
    const preview = order.preview_status ? await previewStore.getByOrderId(orderId) : null;

    res.json({
        success: true,
        order,
        previewPages: preview ? await previewService.signedPages(preview) : [],
        timeline: await pipeline.timeline(orderId),
        requests: await supportService.listForAdmin({}).then(
            (rs) => rs.filter((r) => r.orderId === orderId)
        ),
        allowedTransitions: pipeline.MANUAL_TRANSITIONS[order.status] || []
    });

}

// Moving an order by hand. Guarded by MANUAL_TRANSITIONS so the obviously
// wrong moves are refused — un-cancelling, or shipping something unprinted.
async function advanceOrder(req, res) {
    try {

        const { orderId } = req.params;
        const { status, message } = req.body || {};

        const current = (await all("SELECT status FROM orders WHERE id = $1", [orderId]))[0];
        if (!current) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const allowed = pipeline.MANUAL_TRANSITIONS[current.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot move from ${current.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}.`
            });
        }

        // Moving back to PREVIEW_GENERATED means "this is ours again". The
        // preview has to come back with it, or the order reads as unsent
        // while the customer can still open the old pages and the 72h window
        // keeps counting down to auto-approve on work we have withdrawn.
        if (status === pipeline.STATUS.PREVIEW_GENERATED) {
            await previewStore.unrelease(orderId);
        }

        const result = await pipeline.setStatus(orderId, status, {
            actorType: "admin",
            actor: req.admin?.name || null,
            message: message || null
        });

        // Cancelling settles whatever the customer had asked for, one way or
        // another. Their request stays on the record — it just stops counting
        // as outstanding work, the same as when a customer cancels themselves
        // (see services/supportService.js).
        if (status === pipeline.STATUS.CANCELLED) {
            const open = await supportStore.listForOrder(orderId);
            for (const request of open.filter((r) => r.status === "open")) {
                await supportStore.resolve(request.id, req.admin?.name || "admin").catch(() => {});
            }
        }

        res.json({ success: true, ...result });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

// A note the team leaves for itself against an order.
async function addOrderNote(req, res) {
    try {
        const note = await pipeline.addNote(req.params.orderId, {
            kind: "internal_note",
            message: (req.body?.message || "").trim(),
            actorType: "admin",
            actor: req.admin?.name || null
        });
        if (!note.message) {
            return res.status(400).json({ success: false, message: "Note is empty." });
        }
        res.json({ success: true, note });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

async function recentActivity(req, res) {
    res.json({
        success: true,
        events: await pipeline.recentActivity(req.query.limit)
    });
}

module.exports = {
    listPayments,
    orderQueue,
    orderDetail,
    advanceOrder,
    addOrderNote,
    recentActivity,
    listSupportRequests,
    resolveSupportRequest,
    listOrders,
    listReviews,
    moderateReview,
    getSettings,
    updateSettings,
    listOrphanedPayments,
    refundOrphanedPayment,
    reconcileOrphanedPayments
};
