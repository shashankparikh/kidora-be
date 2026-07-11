const fs = require("fs");
const path = require("path");

function createBook() {

    const bookId = "bk_" + Date.now();

    const bookPath = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );

    fs.mkdirSync(bookPath, { recursive: true });

    return {
        bookId,
        folder: bookPath
    };
}

module.exports = {
    createBook
};