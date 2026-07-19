const bookService = require("../services/bookService");

function createBook(req, res) {

    const book = bookService.createBook();

    res.json({
        success: true,
        message: "Storybook created successfully.",
        ...book
    });

}

const { getBook } = require("../utils/bookHelper");

function getBookById(req, res) {

    try {

        const book = getBook(req.params.bookId);

        res.json({

            success: true,

            book

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
    getBookById
};
