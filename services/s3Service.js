const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a page
// load or a preview session, short enough that a leaked link goes stale.

const s3 = new S3Client({ region: REGION });

function getPublicUrl(key) {
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// Only ever used for objects meant to be public (CMS/marketing assets under
// the assets/ prefix — see scripts/uploadStaticAssets.js). Child photos and
// generated illustrations must go through getSignedUrl instead; see
// BACKLOG.md P0.1.
async function uploadBuffer(key, buffer, contentType) {

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType
        })
    );

    return { key, url: getPublicUrl(key) };

}

// Time-limited read access to a private object, handed to the browser
// instead of a permanent public URL. Signing doesn't require the object or
// bucket to actually be private — this is safe to call even before the
// bucket's public access block is turned on.
async function getSignedGetUrl(key, expiresInSeconds = SIGNED_URL_TTL_SECONDS) {

    return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: expiresInSeconds }
    );

}

// Authenticated read using our own AWS credentials — works whether the
// bucket is public or private, and avoids depending on the object being
// reachable over plain HTTP the way fetch(publicUrl) does.
async function getObjectBuffer(key) {

    const response = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );

    const chunks = [];

    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);

}

module.exports = {
    uploadBuffer,
    getPublicUrl,
    getSignedGetUrl,
    getObjectBuffer
};
