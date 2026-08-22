const fs = require("fs");
const path = require("path");

const { getObjectBuffer } = require("./s3Service");

function isRemoteUrl(value) {
    return /^https?:\/\//i.test(value || "");
}

function isS3Key(value) {
    return /^books\//.test(value || "");
}

// `photoRefOrUrl` is one of three shapes depending on when the book was
// created:
//   - a bare S3 key ("books/<id>/...") — current books, read via our own
//     AWS credentials rather than a public URL, so this keeps working
//     whether the bucket is public or private (see BACKLOG.md P0.1).
//   - a full public S3 URL — books created before keys replaced URLs here.
//   - a bare filename relative to the book's local storage folder — books
//     created before the S3 migration.
async function readImageBytes(bookId, photoRefOrUrl) {

    if (isS3Key(photoRefOrUrl)) {
        return getObjectBuffer(photoRefOrUrl);
    }

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
    isS3Key,
    readImageBytes
};
