const illustrationService = require("../services/illustrationService");
const { toPublicBook, updateBook } = require("../utils/bookHelper");
const settingsStore = require("../db/settingsStore");

async function generateIllustrations(req, res) {

    const { bookId } = req.params;
    const { preview_mode: previewMode } = await settingsStore.getSettings();

    // EMAIL MODE — hand the visitor back their afternoon.
    //
    // The response goes out before the work starts, so the browser is not
    // holding a multi-minute request open. Generation continues in this
    // process and services/illustrationService.js emails the preview link
    // when it lands.
    //
    // KNOWN LIMITATION, and the reason the book carries an explicit status:
    // once the response is sent there is no open request keeping the
    // instance awake, so on a host that sleeps when idle (Render's free
    // plan does) the run can be killed part-way and no email is ever sent.
    // The book is left at ILLUSTRATIONS_PENDING rather than silently
    // half-finished, so a stuck job is visible instead of merely absent.
    // The durable fix is a job queue with a worker that can resume — the
    // Python engine already has one.
    if (previewMode === "email") {

        await updateBook(bookId, { status: "ILLUSTRATIONS_PENDING" });

        res.status(202).json({
            success: true,
            mode: "email",
            message:
                "We're painting the pages now — we'll email you a link when they're ready."
        });

        illustrationService
            .generateIllustrations(bookId)
            .catch(async (err) => {
                console.error(
                    `[illustrationController] background generation failed for ${bookId}:`,
                    err.message
                );
                // Best-effort: if this write also fails there is nothing
                // further to do, and throwing here would be an unhandled
                // rejection in a detached promise.
                await updateBook(bookId, {
                    status: "ILLUSTRATIONS_FAILED",
                    illustrationError: err.message
                }).catch(() => {});
            });

        return;

    }

    // WEB MODE — the visitor waits and the pages appear in the browser.
    try {

        const book =
            await illustrationService.generateIllustrations(bookId);

        res.json({

            success: true,

            mode: "web",

            message: "Illustrations generated successfully.",

            book: await toPublicBook(book)

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