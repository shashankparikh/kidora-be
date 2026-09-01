require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const uploadRoutes = require("./routes/upload");
const bookRoutes = require("./routes/books");
const characterRoutes = require("./routes/character");
const storyRoutes = require("./routes/story");
const illustrationRoutes = require("./routes/illustration");
const pdfRoutes = require("./routes/pdf");
const aiRoutes = require("./routes/ai");
const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const themeRoutes = require("./routes/themes");
const homeRoutes = require("./routes/home");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");
const paymentService = require("./services/paymentService");
const reviewRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/admin");
const newsletterRoutes = require("./routes/newsletter");
const privacyPolicyRoutes = require("./routes/privacyPolicy");
const faqRoutes = require("./routes/faq");
const aboutRoutes = require("./routes/about");
const refundPolicyRoutes = require("./routes/refundPolicy");
const careersRoutes = require("./routes/careers");
const contactRoutes = require("./routes/contact");
const termsRoutes = require("./routes/terms");

const app = express();

// No dev-URL fallback (see BACKLOG.md P2.2) — in production this used to
// mean a missing env var silently allowed http://localhost:5173 instead
// of the real site, while actually locking the real site out. Fail to
// boot instead: a wrong CORS config should be loud, not a 500 in
// production nobody notices until a customer reports it.
const FRONTEND_URL = process.env.FRONTEND_URL;
// kidora-admin runs as its own separate Vite app/origin.
const ADMIN_URL = process.env.ADMIN_URL;

if (!FRONTEND_URL || !ADMIN_URL) {
    throw new Error(
        "FRONTEND_URL and ADMIN_URL must both be set — no default CORS origin is allowed."
    );
}

const ALLOWED_ORIGINS = [FRONTEND_URL, ADMIN_URL];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Mounted before express.json() on purpose: /payments/webhook needs the
// exact raw request body to check Razorpay's signature (see
// routes/payments.js's route-local express.raw()), and Express runs
// body-parsing middleware in registration order across the whole app —
// not scoped per-router. If express.json() below ran first, it would
// already have consumed/parsed the request stream before the webhook
// route ever saw it.
app.use("/payments", paymentRoutes);

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// Serve CMS-style static assets (hero art, widget images, ...). Stands in
// for an S3 bucket during local dev — every img_url built by homeService
// points here, so switching to real S3 later is just swapping the base
// URL in that one place, no route/consumer changes needed.
app.use(
    "/assets",
    express.static(
        path.join(__dirname, "assets")
    )
);

// Routes
app.use("/books", bookRoutes);
app.use("/", uploadRoutes);
app.use("/", characterRoutes);
app.use("/", storyRoutes);
app.use("/", illustrationRoutes);
app.use("/", pdfRoutes);
app.use("/", aiRoutes);
app.use("/auth", authRoutes);
app.use("/me", meRoutes);
app.use("/", themeRoutes);
app.use("/", homeRoutes);
app.use("/orders", orderRoutes);
app.use("/reviews", reviewRoutes);
app.use("/admin", adminRoutes);
app.use("/newsletter", newsletterRoutes);
app.use("/", privacyPolicyRoutes);
app.use("/", faqRoutes);
app.use("/", aboutRoutes);
app.use("/", refundPolicyRoutes);
app.use("/", careersRoutes);
app.use("/", contactRoutes);
app.use("/", termsRoutes);

// Root route
app.get("/", (req, res) => {
    res.send("🚀 Storybook Backend is Running!");
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "success",
        message: "Backend is healthy",
        timestamp: new Date()
    });
});

// Anything that reaches here matched no route above — previously fell
// through to Express's default HTML 404 page (see BACKLOG.md P1.3).
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Not found."
    });
});

// Last-resort catch-all. Express 5 auto-forwards a rejected promise from
// any async route handler here, and every synchronous throw/next(err)
// lands here too — previously fell through to Express's default HTML
// error page, which (a) isn't JSON the frontend can parse and (b) can
// leak a stack trace to the response. Stack traces are logged
// server-side, never sent to the client, regardless of environment.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

    console.error(err);

    res.status(err.status || err.statusCode || 500).json({
        success: false,
        message: err.expose ? err.message : "Something went wrong. Please try again."
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `✅ Server running on http://localhost:${PORT}`
    );
});

// Automatic half of the orphaned-payment refund feature (see
// services/paymentService.js's reconcileOrphanedPayments and
// controllers/adminController.js for the manual half) — a captured
// Razorpay payment that never got linked to an order is real money
// sitting uncredited, so this is a backstop that doesn't depend on
// anyone noticing it in the admin dashboard. No new dependency (no
// node-cron): a single setInterval is enough for one process, and
// reconcileOrphanedPayments' own claimRefund is what keeps it safe even
// if this codebase is ever run as more than one instance against the
// same database. The first run is delayed rather than immediate so a
// fresh deploy doesn't race payments that are only a few seconds old.
const RECONCILE_INTERVAL_MS = 30 * 60 * 1000;
const RECONCILE_FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

function runReconciliation() {

    paymentService.reconcileOrphanedPayments()
        .then(({ attempted, refunded, failed }) => {
            if (attempted > 0) {
                console.log(`Orphaned-payment reconciliation: ${refunded}/${attempted} refunded, ${failed} failed.`);
            }
        })
        .catch((error) => {
            console.error("Orphaned-payment reconciliation sweep failed:", error);
        });

}

setTimeout(() => {
    runReconciliation();
    setInterval(runReconciliation, RECONCILE_INTERVAL_MS);
}, RECONCILE_FIRST_RUN_DELAY_MS);
