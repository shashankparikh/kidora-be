const illustrationService = require("../services/illustrationService");

async function generateIllustrations(req, res) {

    try {

        const book =
            await illustrationService.generateIllustrations(
                req.params.bookId
            );

        res.json({

            success: true,

            message: "Illustrations generated successfully.",

            book

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

}

module.exports = {
    generateIllustrations
};