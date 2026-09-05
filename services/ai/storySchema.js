const EXPECTED_PAGE_COUNT = 4;

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

// Checks the shape the rest of the pipeline actually depends on:
// illustrationService/imageAI read page.page + page.title, pdfService
// reads story.title + page.title + page.text — see BACKLOG.md P2.3. Not a
// full JSON-schema validator; just enough to catch a well-formed-but-
// wrong-shaped reply before it reaches those consumers with a confusing
// failure several steps later.
function assertValidStoryShape(story) {

    if (!story || typeof story !== "object") {
        throw new Error("Story response was not a JSON object.");
    }

    for (const field of ["title", "coverTitle", "summary", "moral"]) {
        if (!isNonEmptyString(story[field])) {
            throw new Error(`Story response is missing "${field}".`);
        }
    }

    if (!Array.isArray(story.pages) || story.pages.length !== EXPECTED_PAGE_COUNT) {
        throw new Error(
            `Story response must have exactly ${EXPECTED_PAGE_COUNT} pages.`
        );
    }

    story.pages.forEach((page, index) => {

        const expectedPageNumber = index + 1;

        if (!page || typeof page !== "object") {
            throw new Error(`Story page ${expectedPageNumber} is not an object.`);
        }

        if (page.page !== expectedPageNumber) {
            throw new Error(
                `Story page ${expectedPageNumber} has page number ${page.page}.`
            );
        }

        if (!isNonEmptyString(page.title)) {
            throw new Error(`Story page ${expectedPageNumber} is missing a title.`);
        }

        if (!isNonEmptyString(page.text)) {
            throw new Error(`Story page ${expectedPageNumber} is missing text.`);
        }

    });

}

module.exports = {
    assertValidStoryShape,
    EXPECTED_PAGE_COUNT
};
