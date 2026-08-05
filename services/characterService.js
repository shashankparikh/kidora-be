const fs = require("fs");
const path = require("path");

const {
    analyzeChildPhoto
} = require("./ai/characterVisionService");

const {
    readImageBytes
} = require("./imageStorage");

const {
    getBook,
    updateBook
} = require("../utils/bookHelper");


function createReferenceFolders(bookId) {

    const characterFolder = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId,
        "character"
    );

    const pagesFolder = path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId,
        "pages"
    );

    fs.mkdirSync(
        characterFolder,
        { recursive: true }
    );

    fs.mkdirSync(
        pagesFolder,
        { recursive: true }
    );

}


async function generateCharacter(
    bookId,
    data = {}
) {

    // -------------------------
    // LOAD BOOK
    // -------------------------

    const book = getBook(bookId);


    // -------------------------
    // VALIDATION
    // -------------------------

    if (!book) {
        throw new Error(
            "Book not found."
        );
    }


    if (!book.child.photo) {

        throw new Error(
            "Please upload a child photo before generating the character."
        );

    }


    // -------------------------
    // FIND CHILD PHOTO
    // -------------------------

    const photoBytes = await readImageBytes(
        bookId,
        book.child.photo
    );


    // -------------------------
    // AI PHOTO ANALYSIS
    // -------------------------

    const aiProfile =
        await analyzeChildPhoto(
            photoBytes
        );


    console.log(
        "AI Profile:"
    );

    console.log(
        aiProfile
    );


    // -------------------------
    // CREATE FOLDERS
    // -------------------------

    createReferenceFolders(
        bookId
    );


    // -------------------------
    // BUILD CHARACTER PROFILE
    // -------------------------

    const character = {

        profile: {

            name:
                data.name
                ||
                "Child",

            age:
                data.age
                ||
                1,

            gender:
                data.gender
                ||
                "Unknown",

            personality:
                Array.isArray(
                    data.traits
                )
                    ?
                    data.traits
                    :
                    [],

            specialNotes:
                data.specialNotes
                ||
                "",

            hair:
                aiProfile.hair,

            eyes:
                aiProfile.eyes,

            skinTone:
                aiProfile.skinTone,

            face:
                aiProfile.face,

            expression:
                aiProfile.expression,

            clothing:
                aiProfile.clothing,

            accessories:
                aiProfile.accessories,

            stylePrompt:
                aiProfile.stylePrompt

        },


        visual: {

            status:
                "NOT_GENERATED",

            referenceImages: {

                front:
                    null,

                side:
                    null,

                smiling:
                    null,

                sitting:
                    null

            }

        }

    };


    // -------------------------
    // UPDATE BOOK
    // -------------------------

    const updatedBook =
        updateBook(
            bookId,
            {

                status:
                    "CHARACTER_GENERATED",

                theme:
                    data.theme
                    ||
                    "",

                child: {

    name:
        data.name
        ||
        "Child",

    age:
        data.age
        ||
        1,

    gender:
        data.gender
        ||
        "Prefer not to say",

    traits:
        Array.isArray(
            data.traits
        )
            ?
            data.traits
            :
            [],

    specialNotes:
        data.specialNotes
        ||
        ""

},

                character

            }
        );


    return updatedBook;

}


module.exports = {
    generateCharacter
};