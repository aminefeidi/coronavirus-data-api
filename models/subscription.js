const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
    object: {
        endpoint: String,
        expirationTime: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },
    subjectId:Number
});