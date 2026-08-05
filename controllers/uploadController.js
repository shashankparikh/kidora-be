const uploadService = require("../services/uploadService");


async function uploadPhoto(req, res) {

    const bookId = req.params.bookId;


    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success:false,
            message:"No image uploaded"
        });
    }


    try {

        const filenames = await uploadService.savePhotos(
            bookId,
            req.files
        );

        res.json({
            success:true,
            message:"Photos uploaded successfully",
            bookId,
            filenames
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

}


module.exports = {
    uploadPhoto
};