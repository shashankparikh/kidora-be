function generateCharacterProfile(book) {

    return {

        name: book.child.name,

        age: book.child.age,

        gender: book.child.gender || "Unknown",

        appearance: {

            hair: "Black hair",

            eyes: "Brown eyes",

            skinTone: "Medium",

            smile: "Warm smile"

        },

        clothing: {

            default: "Blue t-shirt and jeans"

        },

        artStyle: "Pixar children's illustration"

    };

}

module.exports = {
    generateCharacterProfile
};