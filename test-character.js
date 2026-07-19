require("dotenv").config();

const path = require("path");

const {
    analyzeChildPhoto
} = require("./services/ai/characterVisionService");

async function main() {

    try {

        const photoPath = path.join(
            __dirname,
            "storage",
            "books",
            "bk_1784136462542",
            "original.jpeg"
        );

        const profile = await analyzeChildPhoto(photoPath);

        console.log("\nCharacter Profile:\n");
        console.log(profile);

    } catch (err) {

        console.error(err);

    }

}

main();