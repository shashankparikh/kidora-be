const express = require("express");

const router = express.Router();

const pdfController = require("../controllers/pdfController");


router.post(
    "/books/:bookId/pdf",
    pdfController.generatePDF
);


module.exports = router;