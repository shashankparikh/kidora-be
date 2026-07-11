const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

// Allow only image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;

    const isValid =
        allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
        allowedTypes.test(file.mimetype);

    if (isValid) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter
});

// Upload API
router.post("/", upload.single("photo"), (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No image uploaded."
        });
    }

    res.json({
        success: true,
        filename: req.file.filename,
        path: req.file.path
    });

});

module.exports = router;