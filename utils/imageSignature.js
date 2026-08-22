// Hand-rolled rather than pulling in a dependency (e.g. file-type) — the
// three formats we accept have short, well-documented magic-byte
// signatures, and this is a security check worth being able to read in
// full at a glance rather than trusting a third-party package's parsing.
const SIGNATURES = [
    { mime: "image/jpeg", check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
    { mime: "image/png", check: (buf) => buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    // WebP: "RIFF" .... "WEBP" — bytes 4-7 are a file-size field, skipped.
    { mime: "image/webp", check: (buf) => buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP" }
];

// Returns the real MIME type based on file content, or null if the bytes
// don't match any allowed image format — regardless of what filename,
// extension, or Content-Type the client claimed (see BACKLOG.md P0.4).
function detectImageType(buffer) {

    const match = SIGNATURES.find(({ check }) => check(buffer));

    return match ? match.mime : null;

}

module.exports = {
    detectImageType
};
