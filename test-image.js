const { getBook } =
    require("./utils/bookHelper");

const {
    generateIllustration
} = require("./services/ai/imageAI");

async function main() {

    try {

        const book = getBook(
            "bk_1784312364631"
        );

        const page =
            book.story.pages[0];

        const imagePath =
            await generateIllustration(
                book,
                page
            );

        console.log(
            "Test completed successfully."
        );

        console.log(imagePath);

    } catch (error) {

        console.error(error);

    }

}

main();