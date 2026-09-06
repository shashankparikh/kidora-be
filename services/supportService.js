const supportStore = require("../db/supportStore");
const previewStore = require("../db/previewStore");
const { all, get } = require("../db/database");
const { sendEmail } = require("./emailService");
const pipeline = require("./orderPipeline");

const ALERT_EMAIL = process.env.ALERT_EMAIL;

// A request from the Support menu on the preview page.
//
// A cancellation is one kind of request alongside "changes" and "question",
// not a separate mechanism — most people who are unhappy want the right book
// rather than their money back, and asking for a fix should be exactly as
// easy as asking for a refund.
//
// The preview moves in step: asking for changes or cancelling takes it out of
// 'live', which stops the nudge sweep chasing somebody who has already
// replied.
async function submit({ orderId, userId, kind, message }) {

    const owns = await get(
        "SELECT child_name FROM orders WHERE id = $1 AND user_id = $2",
        [orderId, userId]
    );

    if (!owns) {
        throw new Error("Order not found.");
    }

    const text = (message || "").trim();

    if (!text) {
        throw new Error("Please tell us what you'd like changed.");
    }

    const request = await supportStore.create({ orderId, userId, kind, message: text });

    // Onto the order's timeline, so an operator reading the history sees the
    // customer's own words rather than only that "something was requested".
    await pipeline.addNote(orderId, {
        kind: "buyer_message",
        message: `[${kind}] ${text}`,
        actorType: "customer",
        actor: userId
    });

    if (kind === "changes" || kind === "cancel") {
        const moved = await pipeline.setStatus(
            orderId,
            kind === "cancel" ? pipeline.STATUS.CANCELLED : pipeline.STATUS.BUYER_COMMENTS,
            { actorType: "customer", actor: userId, message: "Requested via the preview page" }
        ).catch(() => null);

        // A cancellation that went through has already been carried out —
        // nothing is left for a person to do, so it closes itself. Left open
        // it would sit at the top of the queue board wearing a red badge
        // forever, and a badge that never clears is one an operator learns to
        // ignore. A cancellation that did NOT go through (the order was
        // already at the printer, say) stays open, because then it really
        // does need a human.
        if (kind === "cancel" && moved && moved.changed) {
            await supportStore.resolve(request.id, "system").catch(() => {});
        }

        // Only moves a preview that is still live. A request sent after the
        // window has closed is still recorded and still reaches us — it just
        // does not rewrite a decision that has already been made.
        await previewStore.respond(
            orderId,
            kind === "cancel" ? "cancelled" : "changes_requested"
        ).catch(() => {});
    }

    // Operator notification. Best-effort: the request is already saved, and
    // failing the customer's submit because our own alert bounced would be
    // the wrong trade.
    if (ALERT_EMAIL) {
        const label = { changes: "Change request", cancel: "CANCELLATION", question: "Question" }[kind] || kind;
        sendEmail({
            to: ALERT_EMAIL,
            subject: `${label} — order ${orderId}${owns.child_name ? ` (${owns.child_name})` : ""}`,
            html: `<p><strong>${label}</strong> on order ${orderId}</p><p style="white-space:pre-wrap">${text.replace(/</g, "&lt;")}</p>`
        });
    }

    return request;

}

async function listForAdmin({ status, kind } = {}) {
    return supportStore.listAll({ status, kind });
}

async function resolve(id, resolvedBy) {
    const request = await supportStore.resolve(id, resolvedBy);
    if (!request) {
        throw new Error("Request not found, or already resolved.");
    }
    return request;
}

module.exports = { submit, listForAdmin, resolve };
