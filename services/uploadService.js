const fs = require("fs");
const path = require("path");
const { updateBook } = require("../utils/bookHelper");


function getBookFolder(bookId) {

    return path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );

}


function savePhotos(bookId, files) {

    const bookFolder = getBookFolder(bookId);

    const newFileNames = files.map((file, index) => {

        const newFileName = "original-" + (index + 1) + path.extname(file.originalname);

        const destination = path.join(
            bookFolder,
            newFileName
        );

        fs.renameSync(
            file.path,
            destination
        );

        return newFileName;

    });


    updateBook(bookId, {
        status: "PHOTO_UPLOADED",

        child: {
            // `photo` (singular) is kept as the first image so the
            // AI character/illustration pipeline and PDF cover — which
            // were built around a single reference photo — keep working
            // unchanged. `photos` is the full set for anything that
            // needs all of them.
            photo: newFileNames[0],
            photos: newFileNames
        }
    });


    return newFileNames;
}


module.exports = {
    savePhotos
};