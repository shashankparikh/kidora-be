// One-off publisher for the local `assets/` folder (hero.jpeg, and any
// future widget art) up to S3 under the `assets/` prefix that
// ASSETS_BASE_URL points at. Re-run any time a file in assets/ changes.
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { uploadBuffer } = require("../services/s3Service");

const MIME_TYPES = {
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
};

async function main() {

    const assetsDir = path.join(__dirname, "..", "assets");

    const files = fs.readdirSync(assetsDir);

    for (const filename of files) {

        const filePath = path.join(assetsDir, filename);

        if (!fs.statSync(filePath).isFile()) {
            continue;
        }

        const extension = path.extname(filename).toLowerCase();
        const contentType = MIME_TYPES[extension] || "application/octet-stream";

        const buffer = fs.readFileSync(filePath);

        const url = await uploadBuffer(
            `assets/${filename}`,
            buffer,
            contentType
        );

        console.log(`Uploaded ${filename} -> ${url}`);

    }

}

main().catch((err) => {
    console.error("Upload failed:", err.message);
    process.exit(1);
});
