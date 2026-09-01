const { getBook } = require("../utils/bookHelper");
const orderService = require("./orderService");
const orderStore = require("../db/orderStore");
const paymentStore = require("../db/paymentStore");
const pricingService = require("./pricingService");
const razorpayService = require("./razorpayService");

const CAPTURE_RACE_RETRY_COUNT = 5;
const CAPTURE_RACE_RETRY_DELAY_MS = 300;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Step 1 of the checkout flow: price the order server-side (never trust
// the frontend's displayed total — see pricingService), open a Razorpay
// Order against that price, and record a `payments` row up front (status
// 'created') so there's an audit trail even for a payment the customer
// never completes.
async function createPaymentIntent({ userId, bookId, addOnIds, couponCode }) {

    if (!razorpayService.isConfigured()) {
        const error = new Error("Payments aren't configured yet. Please try again in a bit.");
        error.status = 503;
        throw error;
    }

    const book = getBook(bookId);

    if (!book) {
        throw new Error("Book not found.");
    }

    if (book.userId && book.userId !== userId) {
        throw new Error("This storybook belongs to a different account.");
    }

    if (!book.story) {
        throw new Error("This storybook isn't ready yet.");
    }

    const pricing = pricingService.computeOrderTotal({
        themeId: book.theme,
        addOnIds,
        couponCode
    });

    const razorpayOrder = await razorpayService.createOrder({
        amountInRupees: pricing.total,
        currency: "INR",
        receipt: `book_${bookId}`,
        notes: { bookId, userId }
    });

    paymentStore.createPayment({
        userId,
        bookId,
        razorpayOrderId: razorpayOrder.id,
        amount: pricing.total,
        currency: razorpayOrder.currency,
        addOnIds: addOnIds || [],
        couponCode: couponCode || null
    });

    return {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: pricing.total,
        currency: razorpayOrder.currency
    };

}

// Shared by both finalization paths (browser /verify + webhook) so a
// captured payment only ever turns into one order no matter which path
// gets there first. paymentStore.claimCapture is the atomic gate: exactly
// one caller "wins" per razorpay_order_id, and only the winner creates
// the order — the loser polls briefly for the winner's order_id to show
// up rather than creating a duplicate.
async function createOrderForCapturedPayment({ payment, razorpayPaymentId, gaClientId }) {

    const { wasFirstCapture, payment: capturedPayment } = paymentStore.claimCapture({
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId
    });

    if (!wasFirstCapture) {

        for (let attempt = 0; attempt < CAPTURE_RACE_RETRY_COUNT; attempt += 1) {

            const current = paymentStore.getPaymentByRazorpayOrderId(payment.razorpayOrderId);

            if (current?.orderId) {
                return orderStore.getOrderById(current.orderId);
            }

            await sleep(CAPTURE_RACE_RETRY_DELAY_MS);

        }

        // Still not linked after retrying — the winner (browser verify or
        // webhook, whichever got there first) is presumably still
        // finishing up, or failed outright. There's nothing more useful to
        // return here; the order will appear on the customer's Orders
        // page once it lands.
        const finalCheck = paymentStore.getPaymentByRazorpayOrderId(payment.razorpayOrderId);
        return finalCheck?.orderId ? orderStore.getOrderById(finalCheck.orderId) : null;

    }

    // amount is what Razorpay actually captured (recorded on the payment
    // at intent-creation time), not re-derived from pricingService here —
    // this is what was actually charged, and that's what the order should
    // reflect even if theme pricing changed in the interim.
    const order = await orderService.createOrder({
        userId: payment.userId,
        bookId: payment.bookId,
        gaClientId,
        total: capturedPayment.amount
    });

    paymentStore.linkOrder({ razorpayOrderId: payment.razorpayOrderId, orderId: order.id });

    return order;

}

// A single friendly message for every way payment confirmation can fail —
// deliberately vague about *why* (bad signature vs. unknown order vs.
// someone else's payment) since none of those distinctions are useful or
// safe to expose to the client, only that the money is safe either way.
function paymentFailureError() {
    return new Error(
        "We couldn't confirm this payment. If any amount was deducted, it will be refunded automatically — please contact support if you don't see it reversed within a few days."
    );
}

// Step 3 of the checkout flow, browser path: the Checkout widget's
// `handler` callback hands the frontend three values that prove nothing
// on their own (anyone could POST fabricated ones) — this is where they
// actually get verified, before any order is created.
async function verifyAndFinalizePayment({ userId, razorpayOrderId, razorpayPaymentId, razorpaySignature, gaClientId }) {

    const signatureValid = razorpayService.verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
    });

    if (!signatureValid) {
        throw paymentFailureError();
    }

    const payment = paymentStore.getPaymentByRazorpayOrderId(razorpayOrderId);

    if (!payment || payment.userId !== userId) {
        throw paymentFailureError();
    }

    const order = await createOrderForCapturedPayment({ payment, razorpayPaymentId, gaClientId });

    if (!order) {
        throw paymentFailureError();
    }

    return order;

}

// The webhook path — Razorpay's server-to-server safety net for when the
// browser dies between a successful payment and the /verify call
// completing. The caller (controllers/paymentController.js) has already
// checked the webhook signature before this runs.
async function finalizeFromWebhook({ event, payload }) {

    if (event !== "payment.captured") {
        // Only payment.captured actually finalizes an order; every other
        // event Razorpay might send (payment.failed, order.paid, ...) is
        // acknowledged (200 at the route level) but otherwise ignored.
        return;
    }

    const paymentEntity = payload?.payload?.payment?.entity;

    if (!paymentEntity?.order_id || !paymentEntity?.id) {
        return;
    }

    const payment = paymentStore.getPaymentByRazorpayOrderId(paymentEntity.order_id);

    if (!payment) {
        // A payment.captured for an order_id this app never created a
        // `payments` row for — shouldn't happen, since every Razorpay
        // order it creates goes through createPaymentIntent first. Log
        // and move on rather than throwing, since throwing here would
        // make Razorpay retry a webhook that will never succeed.
        console.error(`Razorpay webhook: no payment record for order ${paymentEntity.order_id}`);
        return;
    }

    await createOrderForCapturedPayment({
        payment,
        razorpayPaymentId: paymentEntity.id,
        gaClientId: null
    });

}

// The refund dead end this whole section closes: an orphaned payment is
// one Razorpay actually captured (real money moved) but that never got
// linked to an order — see paymentStore.findOrphanedCapturedPayments'
// comment for how that can happen. Both the manual admin action and the
// automatic sweep below fund a full refund through this one function, so
// there's exactly one place that talks to Razorpay's refund API and one
// place that decides how a refund failure is recorded.
//
// claimRefund is the same atomic-UPDATE pattern as claimCapture: it can
// only succeed against a payment that is still 'captured' with no
// order_id, so calling this twice concurrently (sweep + admin click
// racing each other, or two sweep ticks overlapping) results in exactly
// one Razorpay refund call, not two.
async function refundOrphanedPayment(payment) {

    const { wasClaimed } = paymentStore.claimRefund({ razorpayOrderId: payment.razorpayOrderId });

    if (!wasClaimed) {
        // Someone else (the other trigger path, or a previous run) got
        // there first, or the payment isn't actually orphaned anymore
        // (e.g. it got linked to an order in the meantime) — nothing for
        // this caller to do.
        return { refunded: false, reason: "already claimed or no longer orphaned" };
    }

    try {

        const refund = await razorpayService.refundPayment({
            razorpayPaymentId: payment.razorpayPaymentId,
            notes: { reason: "orphaned_capture_reconciliation", bookId: payment.bookId }
        });

        paymentStore.markRefunded({ razorpayOrderId: payment.razorpayOrderId, refundId: refund.id });

        return { refunded: true, refundId: refund.id };

    } catch (error) {

        // Hands the claim back so the next sweep (or a retried admin
        // click) can try again — see markRefundFailed's comment. Not
        // rethrown to the caller of reconcileOrphanedPayments, which
        // needs to keep processing the rest of the batch; the manual
        // single-payment path below does rethrow, since there an admin
        // is watching and wants to see the actual error.
        paymentStore.markRefundFailed({ razorpayOrderId: payment.razorpayOrderId, reason: error.message });

        throw error;

    }

}

// Admin-triggered: refund one specific orphaned payment right now, by its
// internal id (as shown in listOrphanedPayments), rather than waiting for
// the next automatic sweep.
async function refundOrphanedPaymentById(paymentId) {

    const payment = paymentStore.getPaymentById(paymentId);

    if (!payment) {
        throw new Error("No payment found with that id.");
    }

    if (payment.status !== "captured" || payment.orderId) {
        // Deliberately refuses anything that isn't the specific orphaned-
        // capture case this feature exists for — in particular, a
        // payment that already has an order_id is a real, delivered
        // purchase; refunding that would need to also cancel/void the
        // order, notify the customer, etc., which is a different feature
        // this endpoint isn't meant to do.
        throw new Error("This payment isn't an orphaned capture — nothing to refund here.");
    }

    return refundOrphanedPayment(payment);

}

// For the admin dashboard: every currently-orphaned captured payment, so
// an operator can see what's stuck before (or instead of) waiting for the
// automatic sweep.
function listOrphanedPayments() {
    return paymentStore.findOrphanedCapturedPayments();
}

// The automatic half — see server.js for what schedules this. Only
// touches payments that have been orphaned for at least `olderThanMinutes`,
// which has to be comfortably longer than both (a) createOrderForCapturedPayment's
// own CAPTURE_RACE_RETRY_COUNT * CAPTURE_RACE_RETRY_DELAY_MS window
// (~1.5s) and (b) realistic webhook delivery lag (Razorpay's webhook
// isn't instant) — otherwise this could refund a payment that was only
// ever "orphaned" for the few seconds it normally takes the browser
// /verify call or the webhook to land. Failures are logged and skipped
// rather than aborting the batch, so one bad payment (e.g. Razorpay
// already refunded it manually from the dashboard) doesn't block the
// rest.
async function reconcileOrphanedPayments({ olderThanMinutes = 15 } = {}) {

    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

    const candidates = paymentStore.findOrphanedCapturedPayments()
        .filter((payment) => payment.updatedAt <= cutoff);

    const summary = { attempted: candidates.length, refunded: 0, failed: 0 };

    for (const payment of candidates) {

        try {
            await refundOrphanedPayment(payment);
            summary.refunded += 1;
        } catch (error) {
            summary.failed += 1;
            console.error(`Orphaned-payment reconciliation: refund failed for ${payment.razorpayOrderId}:`, error.message);
        }

    }

    return summary;

}

module.exports = {
    createPaymentIntent,
    verifyAndFinalizePayment,
    finalizeFromWebhook,
    listOrphanedPayments,
    refundOrphanedPaymentById,
    reconcileOrphanedPayments
};
