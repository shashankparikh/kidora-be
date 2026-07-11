const bookRoutes = require("./routes/books");
const characterRoutes = require("./routes/character");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const imageRoutes = require("./routes/image");

const app = express();

app.use(cors());
app.use(express.json());

// Upload routes
app.use("/upload", imageRoutes);
app.use("/generate-character", characterRoutes);
app.use("/books", bookRoutes);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.send("🚀 Storybook Backend is Running!");
});

app.get("/health", (req, res) => {
    res.json({
        status: "success",
        message: "Backend is healthy",
        timestamp: new Date()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});