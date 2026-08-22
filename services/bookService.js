const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { createBookModel } = require("../models/bookModel");
const bookStore = require("../db/bookStore");


function createBook() {

    // Was "bk_" + Date.now() — a millisecond timestamp is guessable within
    // a day's worth of requests, and storage/ used to be served statically,
    // so a guessed id was a direct read of a child's name/age/photo. A
    // random UUID makes guessing infeasible regardless of how it's served.
    const bookId = "bk_" + crypto.randomUUID();


    // Still create the physical folder — it's used later for the
    // generated PDF (services/pdfService.js). Book metadata itself lives
    // in SQLite now, not book.json (see BACKLOG.md P1.1).
    const bookPath = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );

    fs.mkdirSync(bookPath, { recursive: true });


    const book = createBookModel(bookId);

    bookStore.createBook(book);


    return {
        bookId,
        book
    };

}


module.exports = {
    createBook
};
