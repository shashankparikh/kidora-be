const { getBook, updateBook } = require("../utils/bookHelper");
const { generateIllustration } = require("./ai/imageAI");
const userStore = require("../db/userStore");
const { sendEmail } = require("./emailService");
const { storyReadyEmail } = require("./emailTemplates");
const { assertWithinDailyCap, DailyCapError } = require("./spendGuard");
const settingsStore = require("../db/settingsStore");

const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Delay helper used only for retries
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Best-effort, fire-and-forget — only fires for books claimed by a logged
// in user (anonymous books have no userId, so no one to email). Never
// throws, so a missing user or failed send can't fail generation.
async function sendStoryReadyEmail(book) {

    if (!book.userId) {
        return;
    }

    const user = await userStore.getUserById(book.userId);

    if (!user) {
        // book.userId is set but points at no real user row — a real data
        // inconsistency (see BACKLOG.md P2.4: this used to fail silently,
        // indistinguishable from the normal "book is still anonymous"
        // case above).
        console.warn(
            `[illustrationService] Skipping story-ready email for book ${book.id}: userId ${book.userId} has no matching user.`
        );
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

    const book = await getBook(bookId);

    if (!book.story || !book.story.pages) {
        throw new Error(
            "Story not found. Generate the story first."
        );
    }

    // How many pages actually get an illustration. This is the single
    // biggest lever on cost per lead: every page is a paid image call, so
    // previewing three pages instead of four is a 25% saving on every
    // visitor who never buys. Operators set it from the admin console.
    const { preview_page_count: pageLimit } = await settingsStore.getSettings();

    const updatedPages = [];

    for (const [index, page] of book.story.pages.entries()) {

        // Past the limit the page still travels with the book — it keeps its
        // text and page number, and simply has no illustration. Dropping it
        // instead would make the story read as though it ends early, and the
        // frontend could not tell "not drawn yet" from "does not exist".
        if (index >= pageLimit) {
            updatedPages.push({ ...page, illustration: null });
            continue;
        }

        console.log(`\nStarting Page ${page.page}...`);

        let success = false;
        let illustrationUrl = null;

        // Retry up to 3 times for temporary OpenAI errors
        for (let attempt = 1; attempt <= 3; attempt++) {

            try {

                console.log(
                    `Generating Page ${page.page} - Attempt ${attempt}`
                );

                await assertWithinDailyCap();

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

                if (error instanceof DailyCapError) {
                    throw error;
                }

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

    const updatedBook = await updateBook(bookId, {

        status: "ILLUSTRATIONS_READY",

        story: {

            ...book.story,

            pages: updatedPages

        }

    });

    console.log(
        "✅ All illustrations generated successfully."
    );

    // Best-effort, and explicitly so. This is now an async call (it reads
    // the user row over the network), and the book is already finished and
    // saved by this point. An unhandled rejection here would take the whole
    // process down over a notification, discarding a run that succeeded.
    await sendStoryReadyEmail(updatedBook).catch((err) => {
        console.error(
            `[illustrationService] story-ready email failed for book ${bookId}:`,
            err.message
        );
    });

    return updatedBook;

}

module.exports = {
    generateIllustrations
};