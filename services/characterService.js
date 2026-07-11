const { updateBook } = require("../utils/bookHelper");


function generateCharacter(bookId, data = {}) {

    console.log("Character Input:", data);

    const character = {

        name: data.name || "Child",

        age: data.age || 1,

        hair: "Soft black hair",

        eyes: "Bright brown eyes",

        face: "Cute round face with a cheerful smile",

        outfit:
    data.theme?.toLowerCase().includes("beach")
        ? "Yellow beach dress with a white sun hat"
        : "Comfortable explorer outfit",

        accessories: [
            "Sun hat",
            "Small backpack"
        ],

        personality: [
            "Curious",
            "Happy",
            "Brave explorer"
        ],

        stylePrompt:
            "Cute children's storybook illustration style, " +
            "consistent character appearance, warm colors"
    };


    const updatedBook = updateBook(bookId, {

    status: "CHARACTER_GENERATED",

    theme: data.theme || "",

    child: {
        name: data.name || "Child",
        age: data.age || 1
    },

    character

});


    return updatedBook;

}


module.exports = {
    generateCharacter
};