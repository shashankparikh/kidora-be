const { getBook, updateBook } = require("../utils/bookHelper");
const aiService = require("./ai/aiService");
const { assertWithinDailyCap } = require("./spendGuard");

async function generateStory(bookId) {

    const book = await getBook(bookId);

    if (!book) {
        throw new Error("Book not found.");
    }

    const allowedStatuses = [
        "CHARACTER_GENERATED",
        "STORY_GENERATED"
    ];

    if (!allowedStatuses.includes(book.status)) {
        throw new Error(
            "Character must be generated before creating a story."
        );
    }

    await assertWithinDailyCap();

    const story = await aiService.generateStory(book);

    return await updateBook(bookId, {
        status: "STORY_GENERATED",
        story
    });

}

module.exports = {
    generateStory
};