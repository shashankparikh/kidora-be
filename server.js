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
const reviewRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/admin");
const newsletterRoutes = require("./routes/newsletter");
const privacyPolicyRoutes = require("./routes/privacyPolicy");
const faqRoutes = require("./routes/faq");
const aboutRoutes = require("./routes/about");
const refundPolicyRoutes = require("./routes/refundPolicy");
const careersRoutes = require("./routes/careers");
const contactRoutes = require("./routes/contact");

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// kidora-admin runs as its own separate Vite app/origin — defaults to the
// next port over from the customer site's 5173, overridable via env.
const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:5174";
const ALLOWED_ORIGINS = [FRONTEND_URL, ADMIN_URL];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// Serve generated storybook files
app.use(
    "/storage",
    express.static(
        path.join(__dirname, "storage")
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `✅ Server running on http://localhost:${PORT}`
    );
});
