"use strict";
const mongoose = require("mongoose");

/*eslint-disable key-spacing */
// a schema to be nested inside a User representing requests made to/from another
// user
var ReminderNotificationSchema = module.exports = new mongoose.Schema({
    _id:        { type: String, required: true},
    sent:      { type: Boolean, required: true }
});
/*eslint-enable key-spacing */


module.exports = mongoose.model("ReminderNotification", ReminderNotificationSchema);
