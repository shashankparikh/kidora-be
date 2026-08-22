const { detectImageType } = require("../utils/imageSignature");

// Runs after multer's memoryStorage populates req.files[].buffer, before
// any file reaches disk or S3. multer's fileSize limit (see routes/
// upload.js) already bounds request size; this checks *content* — the
// declared mimetype/extension are attacker-controlled and are not
// trusted here (see BACKLOG.md P0.4).
function validateImageUpload(req, res, next) {

    const files = req.files || [];

    for (const file of files) {

        const detected = detectImageType(file.buffer);

        if (!detected) {
            return res.status(400).json({
                success: false,
                message: `"${file.originalname}" isn't a supported image type. Only JPEG, PNG, and WebP are allowed.`
            });
        }

        // Normalize to the sniffed type so downstream code (S3 Content-Type,
        // extension picked by uploadService) reflects what the file
        // actually is, not what the client claimed.
        file.mimetype = detected;

    }

    next();

}

module.exports = validateImageUpload;
