const contactService = require("../services/contactService");


function getContact(req, res) {

    const data = contactService.getContact();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getContact
};
