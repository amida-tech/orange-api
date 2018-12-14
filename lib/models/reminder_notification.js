"use strict";
const mongoose = require("mongoose");

/*eslint-disable key-spacing */
var ReminderNotificationSchema = module.exports = new mongoose.Schema({
    _id:        { type: String, required: true},
    sent:      { type: Boolean, required: true }
});
/*eslint-enable key-spacing */


module.exports = mongoose.model("ReminderNotification", ReminderNotificationSchema);
