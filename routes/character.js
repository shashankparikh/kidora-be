const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {

    res.json({
        success: true,
        message: "Mock character generated successfully.",
        character: {
            id: 1,
            name: "Harvi",
            age: 1,
            hair: "Black",
            eyes: "Brown",
            outfit: "Yellow beach dress",
            accessories: [
                "Sun hat",
                "Small backpack"
            ],
            image: "/generated/harvi-character.png"
        }
    });

});

module.exports = router;