const fs = require("fs");
const path = require("path");

function isRemoteUrl(value) {
    return /^https?:\/\//i.test(value || "");
}

// `photoRefOrUrl` is either a full S3 URL (current books) or a bare
// filename relative to the book's local storage folder (books created
// before the S3 migration) — this lets both keep working unchanged.
async function readImageBytes(bookId, photoRefOrUrl) {

    if (isRemoteUrl(photoRefOrUrl)) {

        const response = await fetch(photoRefOrUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch image: ${photoRefOrUrl} (${response.status})`
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        return Buffer.from(arrayBuffer);

    }

    const localPath = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId,
        photoRefOrUrl
    );

    return fs.readFileSync(localPath);

}

module.exports = {
    isRemoteUrl,
    readImageBytes
};
