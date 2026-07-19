const fs = require("fs");
const path = require("path");

function createReferenceFolders(bookId) {

    const bookFolder = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );

    const characterFolder = path.join(
        bookFolder,
        "character"
    );

    const pagesFolder = path.join(
        bookFolder,
        "pages"
    );

    fs.mkdirSync(characterFolder, {
        recursive: true
    });

    fs.mkdirSync(pagesFolder, {
        recursive: true
    });

    return {
        characterFolder,
        pagesFolder
    };

}

module.exports = {
    createReferenceFolders
};