const express = require("express");

const router = express.Router();

const pdfController = require("../controllers/pdfController");
const { pdfLimiter } = require("../middleware/generationRateLimit");


router.post(
    "/books/:bookId/pdf",
    pdfLimiter,
    pdfController.generatePDF
);

router.get(
    "/books/:bookId/pdf",
    pdfController.downloadPdf
);


module.exports = router;