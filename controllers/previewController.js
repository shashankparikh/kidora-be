const previewService = require("../services/previewService");
const previewStore = require("../db/previewStore");
const supportService = require("../services/supportService");
const pipeline = require("../services/orderPipeline");

// ── operator ────────────────────────────────────────────────────────────

async function uploadPreview(req, res) {
    try {
        const preview = await previewService.uploadPages(
            req.params.orderId,
            req.files,
            req.admin?.name || null
        );
        res.json({ success: true, preview });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

async function releasePreview(req, res) {
    try {
        const preview = await previewService.releaseAndNotify(
            req.params.orderId,
            req.admin?.name || null
        );
        res.json({ success: true, preview });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

async function unreleasePreview(req, res) {

    const preview = await previewStore.unrelease(req.params.orderId);

    if (!preview) {
        return res.status(400).json({
            success: false,
            message: "Only a live preview can be pulled back."
        });
    }

    // Taking a preview back off a customer is one of the few actions here
    // that changes what they can see, so it belongs on the order's history
    // with a name against it. Previously it left no trace at all.
    await pipeline.addNote(req.params.orderId, {
        kind: "system_note",
        message: "Preview pulled back from the customer",
        actorType: "admin",
        actor: req.admin?.name || null
    });

    res.json({ success: true, preview });

}

async function listPreviews(req, res) {
    const previews = await previewStore.listByStatus(req.query.status || undefined);
    res.json({ success: true, previews });
}

// Previews now approved and ready to print — either because the customer
// pressed "Looks good", or because their window closed without an answer.
async function listReadyToPrint(req, res) {
    res.json({
        success: true,
        previews: await previewStore.listByStatus("approved")
    });
}

// The scheduled sweep: send any due nudges, then approve anything whose
// window has closed. Protected by a shared secret rather than the admin
// session, because it is called by a scheduler and not by a person.
async function runSweep(req, res) {

    const secret = process.env.SWEEP_SECRET;

    if (!secret || req.get("x-sweep-secret") !== secret) {
        return res.status(401).json({ success: false, message: "Not authorised." });
    }

    const nudges = await previewService.runNudgeSweep();
    const approvals = await previewService.autoApproveExpired();

    // Logged as well as returned — the scheduler's own run history is the
    // only other place this is visible, and it is not somewhere you would
    // think to look when a customer asks why they never got a reminder.
    console.log(
        `[sweep] nudged ${nudges.nudged}, failed ${nudges.failed}, auto-approved ${approvals.approved}`
    );

    res.json({ success: true, nudges, approvals });

}

async function adminPreviewPages(req, res) {
    const preview = await previewStore.getByOrderId(req.params.orderId);
    if (!preview) {
        return res.status(404).json({ success: false, message: "No preview for this order." });
    }
    res.json({
        success: true,
        preview: { ...preview, pages: await previewService.signedPages(preview) }
    });
}

// ── customer ────────────────────────────────────────────────────────────

// 404 for a draft as well as for a missing preview. An operator's unreleased
// work should be indistinguishable from nothing existing yet.
// Served on the customer's own preview url, to whoever is holding a session.
// An operator gets any order and sees drafts; a customer gets their own order
// only, and their visit is what stamps first_viewed_at. The two paths are
// separate functions on the service for that reason — see getForOperator.
async function getMyPreview(req, res) {

    const preview = req.admin
        ? await previewService.getForOperator(req.params.orderId)
        : await previewService.getForCustomer(req.params.orderId, req.user.id);

    if (!preview) {
        return res.status(404).json({
            success: false,
            message: req.admin
                ? "No preview has been uploaded for this order yet."
                : "No preview is ready for this order yet."
        });
    }

    res.json({ success: true, preview });

}

// "Looks good" — the happy path, and deliberately the simplest thing here.
async function approvePreview(req, res) {
    try {
        const preview = await previewService.getForCustomer(req.params.orderId, req.user.id);
        if (!preview) {
            return res.status(404).json({ success: false, message: "No preview to approve." });
        }
        const updated = await previewStore.respond(req.params.orderId, "approved");
        if (!updated) {
            return res.status(409).json({
                success: false,
                message: "This preview has already been answered."
            });
        }
        await pipeline.setStatus(req.params.orderId, pipeline.STATUS.PREVIEW_APPROVED, {
            actorType: "customer",
            actor: req.user.id,
            message: "Customer approved the preview"
        });

        res.json({ success: true, preview: { status: updated.status } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

// Everything from the Support menu: change requests, questions, cancellations.
async function submitSupportRequest(req, res) {
    try {
        const request = await supportService.submit({
            orderId: req.params.orderId,
            userId: req.user.id,
            kind: req.body?.kind,
            message: req.body?.message
        });
        res.json({ success: true, request });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

module.exports = {
    uploadPreview,
    releasePreview,
    unreleasePreview,
    listPreviews,
    listReadyToPrint,
    runSweep,
    adminPreviewPages,
    getMyPreview,
    approvePreview,
    submitSupportRequest
};
