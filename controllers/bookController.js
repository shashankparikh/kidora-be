const bookService = require("../services/bookService");
const { getBook, updateBook, toPublicBook } = require("../utils/bookHelper");

async function createBook(req, res) {

    const book = await bookService.createBook();

    res.json({
        success: true,
        message: "Storybook created successfully.",
        ...book,
        book: await toPublicBook(book.book)
    });

}

async function getBookById(req, res) {

    try {

        const book = await getBook(req.params.bookId);

        res.json({

            success: true,

            book: await toPublicBook(book)

        });

    } catch (error) {

        res.status(404).json({

            success: false,

            message: error.message

        });

    }

}

async function claimBook(req, res) {

    try {

        const book = await updateBook(req.params.bookId, { userId: req.user.id });

        res.json({
            success: true,
            book: await toPublicBook(book)
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });

    }

}

module.exports = {
    createBook,
    getBookById,
    claimBook
};
