const bookStore = require("../db/bookStore");
const { toPublicBook } = require("../utils/bookHelper");

// Was a full fs.readdirSync of every book on disk, parsing each one to
// find the ones belonging to this user — didn't survive an ephemeral
// filesystem and got slower with every book ever created (see
// BACKLOG.md P1.1). Now a single indexed query.
async function listMyBooks(req, res) {

    try {

        const books = bookStore.listBooksForUser(req.user.id);

        res.json({
            success: true,
            books: await Promise.all(books.map(toPublicBook))
        });

    } catch (error) {

        res.status(500).json({ success: false, message: error.message });

    }

}

module.exports = {
    listMyBooks
};
