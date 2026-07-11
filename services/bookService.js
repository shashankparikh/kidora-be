const fs = require("fs");
const path = require("path");

const { createBookModel } = require("../models/bookModel");


function createBook() {

    const bookId = "bk_" + Date.now();


    const bookPath = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );


    // Create book folder
    fs.mkdirSync(bookPath, { recursive: true });


    // Create book metadata
    const book = createBookModel(bookId);


    // Save book.json
    const bookFile = path.join(
        bookPath,
        "book.json"
    );


    fs.writeFileSync(
        bookFile,
        JSON.stringify(book, null, 2)
    );


    return {
        bookId,
        folder: bookPath,
        book
    };

}


module.exports = {
    createBook
};