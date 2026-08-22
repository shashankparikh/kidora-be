const { updateBook } = require("../utils/bookHelper");
const { uploadBuffer } = require("./s3Service");

// file.mimetype here is the content-sniffed type set by
// middleware/validateImageUpload.js, not the client-declared one — the
// extension we store follows what the bytes actually are, not whatever
// filename the client sent (see BACKLOG.md P0.4).
const EXTENSION_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

async function savePhotos(bookId, files) {

    const uploaded = await Promise.all(
        files.map((file, index) => {

            const extension = EXTENSION_BY_MIME[file.mimetype] || "";
            const newFileName = "original-" + (index + 1) + extension;

            const key = `books/${bookId}/${newFileName}`;

            return uploadBuffer(key, file.buffer, file.mimetype);

        })
    );

    // Store the bare S3 key, not the object's public URL — child photos are
    // private (see BACKLOG.md P0.1); the API layer signs a short-lived URL
    // for these keys at read time (see utils/bookHelper.toPublicBook).
    const keys = uploaded.map((result) => result.key);

    updateBook(bookId, {
        status: "PHOTO_UPLOADED",

        child: {
            // `photo` (singular) is kept as the first image so the
            // AI character/illustration pipeline and PDF cover — which
            // were built around a single reference photo — keep working
            // unchanged. `photos` is the full set for anything that
            // needs all of them.
            photo: keys[0],
            photos: keys
        }
    });


    return keys;
}


module.exports = {
    savePhotos
};