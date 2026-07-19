const characterService = require("../services/characterService");

async function generateCharacter(req, res) {

    try {

        const bookId = req.params.bookId;

        const book = await characterService.generateCharacter(
            bookId,
            req.body
        );

        res.json({

            success: true,

            message: "Character generated successfully",

            book

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

module.exports = {
    generateCharacter
};