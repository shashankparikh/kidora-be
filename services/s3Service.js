const {
    S3Client,
    PutObjectCommand
} = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;

const s3 = new S3Client({ region: REGION });

function getPublicUrl(key) {
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function uploadBuffer(key, buffer, contentType) {

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType
        })
    );

    return getPublicUrl(key);

}

module.exports = {
    uploadBuffer,
    getPublicUrl
};
