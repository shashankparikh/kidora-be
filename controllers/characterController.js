const characterService = require("../services/characterService");
const { toPublicBook } = require("../utils/bookHelper");

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

            book: await toPublicBook(book)

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