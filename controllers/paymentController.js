const paymentService = require("../services/paymentService");
const razorpayService = require("../services/razorpayService");

// Step 1: price the order server-side and open a Razorpay Order for the
// frontend's Checkout widget to open against.
async function createOrder(req, res) {

    try {

        const { bookId, addOnIds, couponCode, gaClientId } = req.body;

        if (!bookId) {
            return res.status(400).json({ success: false, message: "bookId is required." });
        }

        const intent = await paymentService.createPaymentIntent({
            userId: req.user.id,
            bookId,
            addOnIds,
            couponCode,
            gaClientId
        });

        res.json({ success: true, ...intent });

    } catch (error) {

        res.status(error.status || 400).json({
            success: false,
            message: error.message
        });

    }

}

// Step 3, browser path: the Checkout widget's `handler` callback lands
// here with the three values Razorpay hands back on success. None of them
// are trusted until paymentService re-derives and checks the signature.
async function verify(req, res) {

    try {

        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            gaClientId
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Missing payment confirmation details."
            });
        }

        const order = await paymentService.verifyAndFinalizePayment({
            userId: req.user.id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            gaClientId
        });

        res.json({ success: true, order });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

// Razorpay's server-to-server safety net — no user session, no auth
// header, just a shared secret. Mounted with express.raw() (see
// routes/payments.js) so req.body here is the exact raw Buffer Razorpay
// sent, which is what the signature was computed over.
async function webhook(req, res) {

    if (!razorpayService.isWebhookConfigured()) {
        // Nothing to verify against yet — reject rather than trusting an
        // unverifiable payload. Razorpay will retry once a webhook secret
        // is configured and this starts returning 200s.
        return res.status(503).send("Webhook not configured.");
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    const signatureValid = razorpayService.verifyWebhookSignature({ rawBody, signature });

    if (!signatureValid) {
        return res.status(400).send("Invalid signature.");
    }

    let payload;

    try {
        payload = JSON.parse(rawBody.toString("utf8"));
    } catch (error) {
        return res.status(400).send("Malformed payload.");
    }

    try {
        await paymentService.finalizeFromWebhook({ event: payload.event, payload });
    } catch (error) {
        // The signature is already verified at this point, so this is an
        // internal error, not a bad request — log it, but still return 200.
        // Returning a non-2xx here would make Razorpay retry indefinitely
        // for an error that a retry won't fix (e.g. a bug), and the
        // browser-side /verify call remains the primary path anyway; this
        // webhook only exists as its backstop.
        console.error("Razorpay webhook processing failed:", error);
    }

    res.status(200).send("ok");

}

module.exports = {
    createOrder,
    verify,
    webhook
};
