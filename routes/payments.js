const express = require("express");

const router = express.Router();

const paymentController = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/auth");

// This whole router is mounted before the app-wide express.json() in
// server.js (so /webhook below can get the raw body it needs — see its
// comment), which means express.json() never runs for anything under
// /payments. So the two normal JSON routes parse their own body locally,
// route-by-route, rather than relying on a router-wide `router.use(express.json())`
// — that would risk silently swallowing the webhook's raw body too if it
// were ever registered above the webhook route.
router.post(
    "/create-order",
    express.json(),
    requireAuth,
    paymentController.createOrder
);

router.post(
    "/verify",
    express.json(),
    requireAuth,
    paymentController.verify
);

// No requireAuth — this is called by Razorpay's servers, not a logged-in
// browser. Authenticity comes entirely from the x-razorpay-signature
// header check inside paymentController.webhook. express.raw() here is
// what makes that check possible: it hands the controller the exact raw
// bytes Razorpay sent (what the signature was actually computed over)
// instead of an already-parsed-and-re-serializable object.
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    paymentController.webhook
);

module.exports = router;
