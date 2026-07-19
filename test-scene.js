const { getBook } = require("./utils/bookHelper");

const {
    buildScene
} = require("./services/ai/illustrationSceneBuilder");

const book = getBook("bk_1784309188606");

console.log(
    buildScene(
        book.story.pages[0],
        book.theme
    )
);