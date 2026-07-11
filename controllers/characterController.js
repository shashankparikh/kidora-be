const characterService = require("../services/characterService");


function generateCharacter(req, res) {

    try {

        const bookId = req.params.bookId;

        const character =
            characterService.generateCharacter(
                bookId,
                req.body
            );


        res.json({

            success:true,

            message:"Character generated successfully",

            book:character

        });


    } catch(error) {

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

}


module.exports = {
    generateCharacter
};