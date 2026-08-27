const pdfService = require("../services/pdfService");
const { getBook } = require("../utils/bookHelper");
const { getObjectBuffer } = require("../services/s3Service");


async function downloadPdf(req, res) {

    try {

        const book = await getBook(req.params.bookId);

        if (!book.pdf) {
            return res.status(404).json({
                success: false,
                message: "PDF not generated yet."
            });
        }

        // book.pdf is an S3 key (see services/pdfService.js). Streamed
        // through this endpoint using our own credentials rather than
        // handed out as a signed S3 link: the download stays on our domain,
        // and the object never needs to be reachable directly.
        const pdfBytes = await getObjectBuffer(book.pdf);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="storybook.pdf"'
        );
        res.send(pdfBytes);

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });

    }

}


async function generatePDF(req, res) {

    try {

        const book = await pdfService.generatePDF(
            req.params.bookId
        );


        res.json({

            success: true,

            message: "PDF generated successfully.",

            book

        });


    } catch (error) {


        res.status(400).json({

            success: false,

            message: error.message

        });


    }

}


module.exports = {
    generatePDF,
    downloadPdf
};