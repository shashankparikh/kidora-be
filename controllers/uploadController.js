const uploadService = require("../services/uploadService");


function uploadPhoto(req, res) {

    const bookId = req.params.bookId;


    if (!req.file) {
        return res.status(400).json({
            success:false,
            message:"No image uploaded"
        });
    }


    const filename = uploadService.savePhoto(
        bookId,
        req.file
    );


    res.json({
        success:true,
        message:"Photo uploaded successfully",
        bookId,
        filename
    });

}


module.exports = {
    uploadPhoto
};