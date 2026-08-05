require("dotenv").config();

const path = require("path");

const OpenAI = require("openai");
const { toFile } = require("openai");

const {
    buildIllustrationPrompt
} = require("./illustrationPromptBuilder");

const {
    readImageBytes
} = require("../imageStorage");

const {
    uploadBuffer
} = require("../s3Service");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateIllustration(book, page) {

    console.log("");
    console.log("====================================");
    console.log(`Generating illustration - Page ${page.page}`);
    console.log("====================================");

    // --------------------------------------------------
    // 1. Build the illustration prompt
    // --------------------------------------------------

    const scenePrompt = buildIllustrationPrompt(
        book,
        page
    );

    const prompt = `
Create a high-quality children's storybook illustration using
the uploaded child photo as the identity reference.

IMPORTANT IDENTITY RULES:

- Preserve the child's recognizable facial identity.
- Preserve face shape and key facial features.
- Preserve skin tone.
- Preserve eye appearance.
- Preserve hairstyle and hair color.
- Preserve approximate age.
- Preserve distinctive accessories where appropriate.

Do not generate a different-looking child.

Stylize the child as a polished children's storybook character
while keeping the child clearly recognizable from the reference photo.

SCENE:

${scenePrompt}

The reference image determines the child's identity.
The scene prompt determines the setting, action, clothing and environment.

Create one full-page children's storybook illustration.

No text.
No watermark.
`;

    // --------------------------------------------------
    // 2. Locate uploaded child photo
    // --------------------------------------------------

    if (!book.child || !book.child.photo) {
        throw new Error(
            "Child reference photo is missing."
        );
    }

    console.log("Using reference image:");
    console.log(book.child.photo);

    // --------------------------------------------------
    // 3. Detect correct MIME type
    // --------------------------------------------------

    const extension =
        path.extname(book.child.photo).toLowerCase();

    let mimeType;

    switch (extension) {

        case ".jpg":
        case ".jpeg":
            mimeType = "image/jpeg";
            break;

        case ".png":
            mimeType = "image/png";
            break;

        case ".webp":
            mimeType = "image/webp";
            break;

        default:
            throw new Error(
                `Unsupported reference image format: ${extension}`
            );

    }

    // --------------------------------------------------
    // 4. Convert image into an OpenAI uploadable file
    // --------------------------------------------------

    const referenceBuffer =
        await readImageBytes(book.id, book.child.photo);

    const referenceImage = await toFile(
        referenceBuffer,
        path.basename(book.child.photo),
        {
            type: mimeType
        }
    );

    console.log(
        "Sending reference image and scene prompt to OpenAI..."
    );

    // --------------------------------------------------
    // 5. Generate/edit illustration using the reference
    // --------------------------------------------------

    const response = await client.images.edit({

        model: "gpt-image-1",

        image: referenceImage,

        prompt,

        size: "1024x1024"

    });

    if (
        !response.data ||
        !response.data[0] ||
        !response.data[0].b64_json
    ) {

        throw new Error(
            "OpenAI did not return image data."
        );

    }

    console.log(
        "Image generated successfully."
    );

    // --------------------------------------------------
    // 6. Upload generated illustration to S3
    // --------------------------------------------------

    const generatedImageBuffer =
        Buffer.from(
            response.data[0].b64_json,
            "base64"
        );

    const illustrationUrl = await uploadBuffer(
        `books/${book.id}/pages/page-${page.page}.png`,
        generatedImageBuffer,
        "image/png"
    );

    console.log("Saved:");
    console.log(illustrationUrl);

    return illustrationUrl;

}

module.exports = {
    generateIllustration
};