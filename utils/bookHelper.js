
const bookStore = require("../db/bookStore");
const { getSignedGetUrl } = require("../services/s3Service");
const { isS3Key } = require("../services/imageStorage");

// bookId reaches here straight from req.params on every route. It's no
// longer used to build a book.json path (books live in SQLite now — see
// BACKLOG.md P1.1), but it's still used to build the PDF storage folder
// path below, so the same path-traversal guard applies.
const SAFE_BOOK_ID = /^[a-zA-Z0-9_-]+$/;

async function getBook(bookId) {

    if (!SAFE_BOOK_ID.test(bookId || "")) {
        throw new Error("Book not found");
    }

    const book = await bookStore.getBook(bookId);

    if (!book) {
        throw new Error("Book not found");
    }

    return book;

}

function mergeBook(book, updates) {

    return {
        ...book,
        ...updates,

        child: {
            ...(book.child || {}),
            ...(updates.child || {})
        },

        characterProfile: {
            ...(book.characterProfile || {}),
            ...(updates.characterProfile || {})
        },

        story: {
            ...(book.story || {}),
            ...(updates.story || {})
        },

        metadata: {
            ...(book.metadata || {}),
            ...(updates.metadata || {})
        },

        updatedAt: new Date().toISOString()
    };

}

// Read-merge-write happens inside one SQLite transaction (see
// db/bookStore.mutateBook) so a concurrent update on the same book can't
// interleave and lose part of either write.
async function updateBook(bookId, updates) {

    if (!SAFE_BOOK_ID.test(bookId || "")) {
        throw new Error("Book not found");
    }

    return await bookStore.mutateBook(
        bookId,
        (book) => mergeBook(book, updates)
    );

}

async function signIfKey(value) {

    if (isS3Key(value)) {
        return getSignedGetUrl(value);
    }

    return value;

}

// Books store bare S3 keys for private objects (see BACKLOG.md P0.1) so
// nothing that expires gets persisted to disk — this swaps those keys for
// a fresh short-lived signed URL right before a book is handed to a
// client. Call this at every response boundary, never on the value read
// from getBook/updateBook directly.
async function toPublicBook(book) {

    if (!book) {
        return book;
    }

    const photo = await signIfKey(book.child?.photo);

    const photos = book.child?.photos
        ? await Promise.all(book.child.photos.map(signIfKey))
        : book.child?.photos;

    const pages = book.story?.pages
        ? await Promise.all(book.story.pages.map(async (page) => ({
            ...page,
            illustration: await signIfKey(page.illustration)
        })))
        : book.story?.pages;

    return {
        ...book,
        child: book.child ? { ...book.child, photo, photos } : book.child,
        story: book.story ? { ...book.story, pages } : book.story
    };

}

module.exports = {
    getBook,
    updateBook,
    toPublicBook
};
