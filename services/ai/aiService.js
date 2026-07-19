const { generateBeachStory } = require("./themes/beachStory");
const geminiService = require("./geminiService");

async function generateStory(book) {

    try {

        return await geminiService.generateStory(book);

    } catch (err) {

        console.error("Gemini failed, using fallback story.");
        console.error(err.message);

        switch ((book.theme || "").toLowerCase()) {

            case "beach adventure":
                return generateBeachStory(book);

            default:
                return generateBeachStory(book);
        }

    }

}

module.exports = {
    generateStory
};