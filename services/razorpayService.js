const crypto = require("crypto");

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const RAZORPAY_ORDERS_URL = `${RAZORPAY_API_BASE}/orders`;

// No official `razorpay` npm package here on purpose — it's a thin wrapper
// around a handful of REST calls, and this codebase already talks to
// third-party REST APIs with plain `fetch` elsewhere (see
// services/analyticsService.js for GA4's Measurement Protocol). Avoiding
// the dependency also sidesteps needing an `npm install` at all to ship
// this.
function getCredentials() {
    return {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    };
}

// True once real Razorpay credentials are in .env. Until then,
// paymentController returns a clear 503 instead of a confusing failure
// deep inside a fetch call — see routes/payments.js.
function isConfigured() {
    const { keyId, keySecret } = getCredentials();
    return Boolean(keyId && keySecret);
}

function isWebhookConfigured() {
    return Boolean(getCredentials().webhookSecret);
}

function authHeader() {
    const { keyId, keySecret } = getCredentials();
    const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return `Basic ${token}`;
}

// Creates a Razorpay Order — the object the Checkout widget opens against.
// amountInRupees is whatever pricingService computed; Razorpay's API takes
// the smallest currency unit (paise for INR), so this is where that
// conversion happens, in exactly one place.
async function createOrder({ amountInRupees, currency = "INR", receipt, notes }) {

    if (!isConfigured()) {
        throw new Error("Razorpay is not configured.");
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    const response = await fetch(RAZORPAY_ORDERS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authHeader()
        },
        body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt,
            notes
        })
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error?.description || `Razorpay order creation failed (${response.status}).`;
        throw new Error(message);
    }

    return body;

}

// Full refund of a captured payment — used only for the orphaned-capture
// dead end (see services/paymentService.js's reconcileOrphanedPayments):
// Razorpay took the money but this app never created an order for it.
// Deliberately no `amount` field in the request body: Razorpay refunds
// the payment's entire captured amount when it's omitted, which is
// always what's wanted here — there's no partial-refund case in this
// codebase (no cancellations, no returns), so there's nothing to
// under- or over-specify.
async function refundPayment({ razorpayPaymentId, notes }) {

    if (!isConfigured()) {
        throw new Error("Razorpay is not configured.");
    }

    const response = await fetch(`${RAZORPAY_API_BASE}/payments/${razorpayPaymentId}/refund`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authHeader()
        },
        body: JSON.stringify({ notes })
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error?.description || `Razorpay refund failed (${response.status}).`;
        throw new Error(message);
    }

    return body;

}

// Constant-time comparison of two hex digests. Regular `===` on secret
// material is a timing side-channel — small, but free to close.
function safeCompareHex(expectedHex, actualHex) {

    if (typeof actualHex !== "string" || actualHex.length !== expectedHex.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));

}

// The browser-side confirmation. Razorpay Checkout hands the frontend
// razorpay_order_id/razorpay_payment_id/razorpay_signature on success, but
// those three values reaching our server prove nothing by themselves —
// anyone could POST fabricated ones. Razorpay's documented fix: re-derive
// the signature server-side from order_id|payment_id signed with the
// account's key secret (never sent to the browser) and compare.
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {

    const { keySecret } = getCredentials();

    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

    return safeCompareHex(expected, razorpaySignature);

}

// The webhook's independent authenticity check — a *different* secret
// than the payment signature above (the webhook signing secret, generated
// separately in the Razorpay dashboard when the webhook is created), and
// computed over the raw request body rather than a handful of extracted
// fields, since that's what Razorpay itself signs. Callers must pass the
// exact bytes Express received, before any JSON parsing/re-stringifying
// — see routes/payments.js's route-local express.raw().
function verifyWebhookSignature({ rawBody, signature }) {

    const { webhookSecret } = getCredentials();

    if (!webhookSecret) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

    return safeCompareHex(expected, signature);

}

module.exports = {
    isConfigured,
    isWebhookConfigured,
    createOrder,
    refundPayment,
    verifyPaymentSignature,
    verifyWebhookSignature
};
