const fs = require("fs");
const path = require("path");
const { updateBook } = require("../utils/bookHelper");


function getBookFolder(bookId) {

    return path.join(
        __dirname,
        "..",
        "storage",
        "books",
        bookId
    );

}


function savePhoto(bookId, file) {

    const bookFolder = getBookFolder(bookId);

    const newFileName = "original" + path.extname(file.originalname);

    const destination = path.join(
        bookFolder,
        newFileName
    );


    fs.renameSync(
        file.path,
        destination
    );
	
updateBook(bookId, {
    status: "PHOTO_UPLOADED",

    child: {
        photo: newFileName
    }
});


    return newFileName;
}


module.exports = {
    savePhoto
};