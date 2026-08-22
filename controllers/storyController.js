const storyService = require("../services/storyService");
const { toPublicBook } = require("../utils/bookHelper");

async function generateStory(req, res) {

    try {

        const book = await storyService.generateStory(
            req.params.bookId
        );

        res.json({

            success: true,

            message: "Story generated successfully.",

            book: await toPublicBook(book)

        });

    } catch (error) {

        console.error(error);

        res.status(400).json({

            success: false,

            message: error.message

        });

    }

}

module.exports = {
    generateStory
};