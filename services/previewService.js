const { all, get } = require("../db/database");
const previewStore = require("../db/previewStore");
const { uploadBuffer, getSignedGetUrl } = require("./s3Service");
const { sendEmail } = require("./emailService");
const pipeline = require("./orderPipeline");
const {
    previewReadyEmail,
    previewNudgeEmail,
    previewFinalNudgeEmail
} = require("./emailTemplates");

const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Everything the three emails need, in one query. Kept here rather than in a
// store because it spans orders and users and exists only for this feature.
async function orderContext(orderId) {
    return get(
        `SELECT o.id, o.child_name, o.book_title, u.email, u.first_name
         FROM orders o JOIN users u ON u.id = o.user_id
         WHERE o.id = $1`,
        [orderId]
    );
}

function previewUrl(orderId) {
    // Per order, and deliberately not /preview/:id — that path belongs to
    // the wizard's own result page on the storefront.
    return `${APP_URL}/orders/${orderId}/preview`;
}

// Operator uploads the pages they generated. Stored under the order so a
// preview is always traceable to the order it belongs to, and replacing them
// drops the preview back to draft (see previewStore.upsertDraft).
async function uploadPages(orderId, files, actor = null) {

    if (!files || files.length === 0) {
        throw new Error("No preview pages supplied.");
    }

    const keys = [];

    for (const [i, file] of files.entries()) {
        const ext = (file.mimetype || "image/jpeg").split("/")[1] || "jpg";
        const key = `previews/${orderId}/page-${String(i + 1).padStart(2, "0")}.${ext}`;
        await uploadBuffer(key, file.buffer, file.mimetype || "image/jpeg");
        keys.push(key);
    }

    const existing = await previewStore.getByOrderId(orderId);
    const preview = await previewStore.upsertDraft({ orderId, pages: keys });

    // The upload is recorded in its own right, not as a side effect of the
    // status change. Re-uploading over an order already sitting at
    // PREVIEW_GENERATED is a no-op transition, so relying on setStatus alone
    // meant a replacement — the operator redoing a page a customer complained
    // about — left no trace of who did it or when.
    await pipeline.addNote(orderId, {
        kind: "system_note",
        message: existing
            ? `Preview pages replaced (${keys.length} page${keys.length === 1 ? "" : "s"})`
            : `${keys.length} preview page${keys.length === 1 ? "" : "s"} uploaded`,
        actorType: "admin",
        actor
    });

    await pipeline.setStatus(orderId, pipeline.STATUS.PREVIEW_GENERATED, {
        actorType: "admin",
        actor,
        message: `${keys.length} preview page(s) uploaded`
    });

    return preview;

}

// Release, then tell the customer. The email is sent AFTER the status flips,
// so a send failure leaves a released preview the operator can re-notify —
// rather than a customer holding a link to something still marked draft.
async function releaseAndNotify(orderId, actor = null) {

    const preview = await previewStore.release(orderId);

    if (!preview) {
        throw new Error("No draft preview to release for this order.");
    }

    await pipeline.setStatus(orderId, pipeline.STATUS.PENDING_REVIEW, {
        actorType: "admin",
        actor,
        message: "Preview released to the customer"
    });

    const ctx = await orderContext(orderId);

    if (ctx) {
        const { subject, html } = previewReadyEmail({
            name: ctx.first_name,
            childName: ctx.child_name,
            previewUrl: previewUrl(orderId),
            hours: previewStore.RESPONSE_WINDOW_HOURS
        });
        const delivery = await sendEmail({ to: ctx.email, subject, html });
        if (delivery?.skipped) {
            console.error(
                `[previewService] released ${orderId} but the email did not send: ${delivery.error || "email not configured"}`
            );
        }
    }

    return preview;

}

// Signed URLs, generated per request and short-lived. The bucket stays
// private — a child's face and name are on these pages, so a preview must not
// be reachable by anyone who happens to have the S3 path.
async function signedPages(preview) {
    return Promise.all(preview.pages.map((key) => getSignedGetUrl(key)));
}

// What the customer is allowed to see. A draft returns nothing at all rather
// than an empty preview, so an operator's unreleased work is indistinguishable
// from no preview existing.
async function getForCustomer(orderId, userId) {

    const owns = await get(
        "SELECT 1 FROM orders WHERE id = $1 AND user_id = $2",
        [orderId, userId]
    );

    if (!owns) {
        return null;
    }

    const preview = await previewStore.getByOrderId(orderId);

    if (!preview || preview.status === "draft") {
        return null;
    }

    await previewStore.markViewed(orderId);

    return {
        status: preview.status,
        respondBy: preview.respondBy,
        pages: await signedPages(preview)
    };

}

// The same preview, read by an operator rather than its owner.
//
// Deliberately NOT getForCustomer with the ownership check switched off. Two
// differences matter:
//
//   - It never calls markViewed. first_viewed_at is the evidence behind
//     "nobody opened this preview" on an auto-approved order, and an operator
//     checking their own work must not be able to overwrite that. Silently
//     turning that flag would make the warning banner lie exactly when it is
//     most load-bearing — the moment before a book goes to print.
//
//   - It returns drafts. Seeing the pages before releasing them is the whole
//     reason an operator opens this.
async function getForOperator(orderId) {

    const preview = await previewStore.getByOrderId(orderId);

    if (!preview) {
        return null;
    }

    return {
        status: preview.status,
        respondBy: preview.respondBy,
        firstViewedAt: preview.firstViewedAt,
        releasedAt: preview.releasedAt,
        pages: await signedPages(preview),
        // So the storefront can say plainly whose view this is. A page that
        // looks identical to the customer's but silently behaves differently
        // is how an operator ends up believing a customer saw something.
        viewedAsOperator: true
    };

}

// The 24h and 48h reminders. Idempotent by way of nudges_sent, so a restart
// or two overlapping runs cannot send the same reminder twice.
async function runNudgeSweep() {

    const summary = { nudged: 0, failed: 0 };

    for (const [index, afterHours] of previewStore.NUDGE_HOURS.entries()) {

        const nudgeNumber = index + 1;
        const due = await previewStore.dueForNudge(afterHours, nudgeNumber);

        for (const preview of due) {

            // Claim it first. If another run already sent this one, move on.
            if (!await previewStore.recordNudge(preview.id, nudgeNumber)) {
                continue;
            }

            try {
                const ctx = await orderContext(preview.orderId);
                if (!ctx) continue;

                const hoursLeft = Math.max(
                    0,
                    Math.round((new Date(preview.respondBy) - Date.now()) / 3600_000)
                );

                const build = nudgeNumber === 1 ? previewNudgeEmail : previewFinalNudgeEmail;
                const { subject, html } = build({
                    name: ctx.first_name,
                    childName: ctx.child_name,
                    previewUrl: previewUrl(preview.orderId),
                    hoursLeft
                });

                await sendEmail({ to: ctx.email, subject, html });
                summary.nudged += 1;

            } catch (error) {
                summary.failed += 1;
                console.error(
                    `[previewService] nudge ${nudgeNumber} failed for ${preview.orderId}:`,
                    error.message
                );
            }

        }

    }

    return summary;

}

// Previews whose window has closed with nobody answering: approved, and sent
// to print.
//
// Silence is treated as consent here, and deliberately so. The customer paid
// for a book and has always intended to receive one — the preview window is a
// courtesy we extend on top of that, not a condition they have to satisfy to
// get what they bought. Holding their book hostage to an email they never
// opened would be the worse outcome for them.
//
// Two reminders go out before this happens, at 24 and 48 hours, and the
// second one says plainly that we are about to print.
async function autoApproveExpired() {

    const due = await previewStore.expired();
    const summary = { approved: 0, orderIds: [] };

    for (const preview of due) {
        // respond() is guarded on status = 'live', so a customer answering in
        // the same moment wins and this becomes a no-op for that row.
        const updated = await previewStore.respond(preview.orderId, "approved");
        if (updated) {
            await pipeline.setStatus(
                preview.orderId,
                pipeline.STATUS.PREVIEW_AUTO_APPROVED,
                {
                    actorType: "system",
                    message: "Response window closed with no reply — approved automatically"
                }
            );
            summary.approved += 1;
            summary.orderIds.push(preview.orderId);
        }
    }

    return summary;

}

module.exports = {
    uploadPages,
    releaseAndNotify,
    getForCustomer,
    getForOperator,
    signedPages,
    runNudgeSweep,
    autoApproveExpired,
    previewUrl
};
