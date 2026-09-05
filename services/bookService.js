const crypto = require("crypto");

const { createBookModel } = require("../models/bookModel");
const bookStore = require("../db/bookStore");


async function createBook({ userId = null } = {}) {

    // Was "bk_" + Date.now() — a millisecond timestamp is guessable within
    // a day's worth of requests, and storage/ used to be served statically,
    // so a guessed id was a direct read of a child's name/age/photo. A
    // random UUID makes guessing infeasible regardless of how it's served.
    const bookId = "bk_" + crypto.randomUUID();


    const book = createBookModel(bookId);

    // Stamped at creation rather than at claim time. Generation now requires
    // a signed-in customer, and the story-ready email is addressed from this
    // field — a book with no owner is one nobody can be told about.
    book.userId = userId;

    await bookStore.createBook(book);


    return {
        bookId,
        book
    };

}


module.exports = {
    createBook
};
