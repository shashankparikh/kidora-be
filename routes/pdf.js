const express = require("express");

const router = express.Router();

const { requireAuth } = require("../middleware/auth");

const pdfController = require("../controllers/pdfController");
const { pdfLimiter } = require("../middleware/generationRateLimit");


router.post(
    "/books/:bookId/pdf",
    requireAuth,
    pdfLimiter,
    pdfController.generatePDF
);

// Deliberately NOT behind requireAuth, unlike the POST above.
//
// This is a download, not a generation call — it spends nothing, and the
// frontend reaches it with a raw fetch and a window.open fallback, neither
// of which carries an Authorization header. Gating it would 401 every PDF
// download for a protection the book id already approximates: ids are random
// UUIDs, so the URL is not guessable.
//
// That is obscurity, not authorisation, and it is worth fixing properly —
// but with a signed short-lived link, not by gating a URL the browser
// navigates to directly.
router.get(
    "/books/:bookId/pdf",
    pdfController.downloadPdf
);


module.exports = router;