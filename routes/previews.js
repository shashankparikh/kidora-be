const express = require("express");
const multer = require("multer");

const router = express.Router();

// This router is mounted under /admin (see server.js) and every route on it
// is an operator action, so it takes the admin session, not a customer's.
// It was wired to requireAuth — the customer middleware — which rejected the
// admin app's own token and made uploading a preview impossible.
const { requireAdminAuth } = require("../middleware/adminAuth");
const previewController = require("../controllers/previewController");

// Preview pages are web derivatives, not the print artefact — a 1200px JPEG
// of about 200KB, not the 300MB CMYK PDF that goes to the printer. 5MB per
// file is generous for that and still small enough that this never needs to
// be a resumable or multipart-to-S3 upload.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 8 }
});

router.post(
    "/orders/:orderId/preview",
    requireAdminAuth,
    upload.array("pages", 8),
    (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message:
                    err.code === "LIMIT_FILE_SIZE"
                        ? "Each preview page must be under 5MB. These are web-sized images, not the print file."
                        : "Too many preview pages — 8 maximum."
            });
        }
        next(err);
    },
    previewController.uploadPreview
);

// Called by a scheduler, not a person — authorised with a shared secret
// header rather than an admin session. Deliberately a POST so it cannot be
// triggered by anything that merely follows links.
router.post("/sweep", previewController.runSweep);

module.exports = router;
