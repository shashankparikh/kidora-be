const pdfService = require("../services/pdfService");


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
    generatePDF
};