const path = require("path");
const fs = require("fs");

const pdfService = require("../services/pdfService");
const { getBook, getBookFolder } = require("../utils/bookHelper");


function downloadPdf(req, res) {

    try {

        const book = getBook(req.params.bookId);

        if (!book.pdf) {
            return res.status(404).json({
                success: false,
                message: "PDF not generated yet."
            });
        }

        const pdfPath = path.join(
            getBookFolder(req.params.bookId),
            book.pdf
        );

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({
                success: false,
                message: "PDF not found."
            });
        }

        res.download(pdfPath, "storybook.pdf");

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