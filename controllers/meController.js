const fs = require("fs");
const path = require("path");

const booksDir = path.join(__dirname, "..", "storage", "books");

function listMyBooks(req, res) {

    try {

        if (!fs.existsSync(booksDir)) {
            return res.json({ success: true, books: [] });
        }

        const books = fs.readdirSync(booksDir)
            .map((bookId) => {
                const bookFile = path.join(booksDir, bookId, "book.json");
                if (!fs.existsSync(bookFile)) {
                    return null;
                }
                try {
                    return JSON.parse(fs.readFileSync(bookFile, "utf8"));
                } catch {
                    return null;
                }
            })
            .filter((book) => book && book.userId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, books });

    } catch (error) {

        res.status(500).json({ success: false, message: error.message });

    }

}

module.exports = {
    listMyBooks
};
