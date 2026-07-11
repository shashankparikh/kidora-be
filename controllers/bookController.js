const bookService = require("../services/bookService");

function createBook(req, res) {

    const book = bookService.createBook();

    res.json({
        success: true,
        message: "Storybook created successfully.",
        ...book
    });

}

module.exports = {
    createBook
};