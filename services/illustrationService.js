const { getBook, updateBook } = require("../utils/bookHelper");
const { generateIllustration } = require("./ai/imageAI");

// Delay helper used only for retries
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateIllustrations(bookId) {

    console.log("\n==============================");
    console.log("Starting illustration generation...");
    console.log("==============================\n");

    const book = getBook(bookId);

    if (!book.story || !book.story.pages) {
        throw new Error(
            "Story not found. Generate the story first."
        );
    }

    const updatedPages = [];

    for (const page of book.story.pages) {

        console.log(`\nStarting Page ${page.page}...`);

        let success = false;
        let illustrationUrl = null;

        // Retry up to 3 times for temporary OpenAI errors
        for (let attempt = 1; attempt <= 3; attempt++) {

            try {

                console.log(
                    `Generating Page ${page.page} - Attempt ${attempt}`
                );

                // Generate the illustration and upload it to S3
                illustrationUrl = await generateIllustration(
                    book,
                    page
                );

                success = true;

                console.log(
                    `✅ Page ${page.page} illustration generated.`
                );

                break;

            } catch (error) {

                console.error(
                    `❌ Page ${page.page} failed on Attempt ${attempt}`
                );

                console.error(error.message);

                if (attempt < 3) {

                    console.log(
                        "Waiting 5 seconds before retry..."
                    );

                    await sleep(5000);

                }

            }

        }

        if (!success) {

            throw new Error(
                `Failed to generate illustration for Page ${page.page} after 3 attempts.`
            );

        }

        updatedPages.push({

            ...page,

            illustration: illustrationUrl

        });

    }

    console.log("\nUpdating book.json...");

    const updatedBook = updateBook(bookId, {

        story: {

            ...book.story,

            pages: updatedPages

        }

    });

    console.log(
        "✅ All illustrations generated successfully."
    );

    return updatedBook;

}

module.exports = {
    generateIllustrations
};