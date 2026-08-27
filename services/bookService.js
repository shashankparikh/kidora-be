const crypto = require("crypto");

const { createBookModel } = require("../models/bookModel");
const bookStore = require("../db/bookStore");


async function createBook() {

    // Was "bk_" + Date.now() — a millisecond timestamp is guessable within
    // a day's worth of requests, and storage/ used to be served statically,
    // so a guessed id was a direct read of a child's name/age/photo. A
    // random UUID makes guessing infeasible regardless of how it's served.
    const bookId = "bk_" + crypto.randomUUID();


    const book = createBookModel(bookId);

    await bookStore.createBook(book);


    return {
        bookId,
        book
    };

}


module.exports = {
    createBook
};
