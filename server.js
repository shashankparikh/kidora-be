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

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
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