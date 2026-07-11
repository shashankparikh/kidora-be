const express = require("express");
const multer = require("multer");

const router = express.Router();

const uploadController = require("../controllers/uploadController");


const upload = multer({
    dest:"temp/"
});


router.post(
    "/books/:bookId/upload",
    upload.single("photo"),
    uploadController.uploadPhoto
);


module.exports = router;