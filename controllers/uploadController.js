const uploadService = require("../services/uploadService");


function uploadPhoto(req, res) {

    const bookId = req.params.bookId;


    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success:false,
            message:"No image uploaded"
        });
    }


    const filenames = uploadService.savePhotos(
        bookId,
        req.files
    );


    res.json({
        success:true,
        message:"Photos uploaded successfully",
        bookId,
        filenames
    });

}


module.exports = {
    uploadPhoto
};