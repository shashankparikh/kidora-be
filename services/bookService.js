const crypto = require("crypto");

const { createBookModel } = require("../models/bookModel");
const bookStore = require("../db/bookStore");
const { updateBook } = require("../utils/bookHelper");


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


// Saves what the wizard collected. No AI, no generation, no spend.
//
// This replaces the /character call the wizard used to make. That endpoint
// analysed the child's photo with a vision model and generated a character
// profile before anything had been paid for; the book is now written offline
// after payment, so all the wizard needs to do is record the answers.
async function saveDetails(bookId, data) {

    const name = (data?.name || "").trim();

    if (!name) {
        throw new Error("Please tell us the child's name.");
    }

    return updateBook(bookId, {
        status: "DETAILS_SAVED",
        theme: data.theme || "",
        child: {
            name,
            age: Number(data.age) || 1,
            gender: data.gender || "Prefer not to say",
            traits: Array.isArray(data.traits) ? data.traits : [],
            specialNotes: (data.specialNotes || "").trim()
        }
    });

}

module.exports = {
    saveDetails,
    createBook
};
