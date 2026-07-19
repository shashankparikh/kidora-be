const illustrationService = require("./services/illustrationService");

async function main() {

    try {

        const book = await illustrationService.generateIllustrations(
            "bk_1784136462542"
        );

        console.log("Illustrations generated successfully!");

        console.log(book.story.pages);

    } catch (err) {

        console.error(err);

    }

}

main();