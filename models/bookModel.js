function createBookModel(bookId) {

    return {
        id: bookId,

        status: "NEW",

        userId: null,

        child: {
            name: "",
            age: null,
            photo: null
        },

        theme: "",

        character: null,

        story: null,


        pdf: null,

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()
    };

}

module.exports = {
    createBookModel
};