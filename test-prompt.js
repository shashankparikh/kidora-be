const { getBook } = require("./utils/bookHelper");
const {
    buildIllustrationPrompt
} = require("./services/ai/illustrationPromptBuilder");

const book = getBook("bk_1784308483438");

console.log(
    buildIllustrationPrompt(
        book,
        book.story.pages[0]
    )
);