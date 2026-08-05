const path = require("path");
const { updateBook } = require("../utils/bookHelper");
const { uploadBuffer } = require("./s3Service");


async function savePhotos(bookId, files) {

    const uploadedUrls = await Promise.all(
        files.map((file, index) => {

            const newFileName = "original-" + (index + 1) + path.extname(file.originalname);

            const key = `books/${bookId}/${newFileName}`;

            return uploadBuffer(key, file.buffer, file.mimetype);

        })
    );


    updateBook(bookId, {
        status: "PHOTO_UPLOADED",

        child: {
            // `photo` (singular) is kept as the first image so the
            // AI character/illustration pipeline and PDF cover — which
            // were built around a single reference photo — keep working
            // unchanged. `photos` is the full set for anything that
            // needs all of them.
            photo: uploadedUrls[0],
            photos: uploadedUrls
        }
    });


    return uploadedUrls;
}


module.exports = {
    savePhotos
};