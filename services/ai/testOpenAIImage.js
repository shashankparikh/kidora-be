require("dotenv").config();

const fs = require("fs");
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function main() {

    console.log("Generating image...");

    const result = await client.images.generate({

        model: "gpt-image-1",

        prompt:
            "A cute Pixar style illustration of a one year old toddler boy wearing a white t-shirt with black bracelets, smiling, children's storybook, colorful, high quality.",

        size: "1024x1024"

    });

    const imageBase64 = result.data[0].b64_json;

    fs.writeFileSync(
        "openai-test.png",
        Buffer.from(imageBase64, "base64")
    );

    console.log("Image saved as openai-test.png");

}

main().catch(console.error);