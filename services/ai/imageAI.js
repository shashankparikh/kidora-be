require("dotenv").config();

const fs = require("fs");
const path = require("path");

const OpenAI = require("openai");
const { toFile } = require("openai");

const {
    buildIllustrationPrompt
} = require("./illustrationPromptBuilder");

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

    const referenceImagePath = path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "books",
        book.id,
        book.child.photo
    );

    if (!fs.existsSync(referenceImagePath)) {
        throw new Error(
            `Reference image not found: ${referenceImagePath}`
        );
    }

    console.log("Using reference image:");
    console.log(referenceImagePath);

    // --------------------------------------------------
    // 3. Detect correct MIME type
    // --------------------------------------------------

    const extension =
        path.extname(referenceImagePath).toLowerCase();

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
        fs.readFileSync(referenceImagePath);

    const referenceImage = await toFile(
        referenceBuffer,
        path.basename(referenceImagePath),
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
    // 6. Prepare destination folder
    // --------------------------------------------------

    const pagesFolder = path.join(
        __dirname,
        "..",
        "..",
        "storage",
        "books",
        book.id,
        "pages"
    );

    fs.mkdirSync(
        pagesFolder,
        {
            recursive: true
        }
    );

    const imagePath = path.join(
        pagesFolder,
        `page-${page.page}.png`
    );

    // --------------------------------------------------
    // 7. Save image
    // --------------------------------------------------

    const generatedImageBuffer =
        Buffer.from(
            response.data[0].b64_json,
            "base64"
        );

    fs.writeFileSync(
        imagePath,
        generatedImageBuffer
    );

    console.log("Saved:");
    console.log(imagePath);

    return imagePath;

}

module.exports = {
    generateIllustration
};