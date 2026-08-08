const { getBook, updateBook } = require("../utils/bookHelper");
const { generateIllustration } = require("./ai/imageAI");
const userStore = require("../db/userStore");
const { sendEmail } = require("./emailService");
const { storyReadyEmail } = require("./emailTemplates");

const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Delay helper used only for retries
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Best-effort, fire-and-forget — only fires for books claimed by a logged
// in user (anonymous books have no userId, so no one to email). Never
// throws, so a missing user or failed send can't fail generation.
function sendStoryReadyEmail(book) {

    if (!book.userId) {
        return;
    }

    const user = userStore.getUserById(book.userId);

    if (!user) {
        return;
    }

    const { subject, html } = storyReadyEmail({
        name: user.first_name,
        childName: book.child?.name,
        bookTitle: book.story?.title,
        previewUrl: `${APP_URL}/preview/${book.id}`
    });

    sendEmail({ to: user.email, subject, html });

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

    sendStoryReadyEmail(updatedBook);

    return updatedBook;

}

module.exports = {
    generateIllustrations
};