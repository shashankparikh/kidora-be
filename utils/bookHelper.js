const fs = require("fs");
const path = require("path");


function getBookFile(bookId) {

    return path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId,
        "book.json"
    );

}


function updateBook(bookId, updates) {

    const bookFile = getBookFile(bookId);


    const book = JSON.parse(
        fs.readFileSync(bookFile, "utf-8")
    );


    const updatedBook = {

        ...book,

        ...updates,

        child: {
            ...book.child,
            ...(updates.child || {})
        },

        updatedAt: new Date().toISOString()
    };


    fs.writeFileSync(
        bookFile,
        JSON.stringify(updatedBook, null, 2)
    );


    return updatedBook;
}


module.exports = {
    updateBook
};