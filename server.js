require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const uploadRoutes = require("./routes/upload");
const bookRoutes = require("./routes/books");
const characterRoutes = require("./routes/character");
const storyRoutes = require("./routes/story");
const illustrationRoutes = require("./routes/illustration");
const pdfRoutes = require("./routes/pdf");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(cors());
app.use(express.json());

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