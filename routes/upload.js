const express = require("express");
const multer = require("multer");

const router = express.Router();

const uploadController = require("../controllers/uploadController");
const { uploadLimiter } = require("../middleware/generationRateLimit");
const validateImageUpload = require("../middleware/validateImageUpload");


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file — see BACKLOG.md P0.4
        files: 4
    }
});


router.post(
    "/books/:bookId/upload",
    uploadLimiter,
    upload.array("photos", 4),
    // A file over the 10MB limit (or a 5th file) makes multer call next(err)
    // with a MulterError, which would otherwise fall through to Express's
    // default HTML error page — a real global error handler is P1.3 in
    // BACKLOG.md, but this route's own limits deserve a JSON response now.
    (err, req, res, next) => {

        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: err.code === "LIMIT_FILE_SIZE"
                    ? "Each photo must be under 10 MB."
                    : "Invalid upload."
            });
        }

        next(err);

    },
    validateImageUpload,
    uploadController.uploadPhoto
);


module.exports = router;