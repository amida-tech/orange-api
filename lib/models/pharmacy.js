"use strict";

var mongoose = require("mongoose");
var errors = require("../errors.js").ERRORS;

/*eslint-disable key-spacing */
// As per README matches the HH:MM format specified in ISO 8601
var TIME_REGEXP = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
var HoursItem = {
    open:      { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] },
    close:     { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] }
};
var PharmacySchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    phone:      { type: String },
    address:    { type: String },
    hours: {
        monday: HoursItem,
        tuesday: HoursItem,
        wednesday: HoursItem,
        thursday: HoursItem,
        friday: HoursItem,
        saturday: HoursItem,
        sunday: HoursItem
    }
});
/*eslint-enable key-spacing */

// store empty phones and addresses rather than undefined ones
PharmacySchema.pre("save", function (next) {
    if (typeof this.phone === "undefined") this.phone = "";
    if (typeof this.address === "undefined") this.address = "";
    // hours is initalised to an object containing {monday: {}, tuesday: {}, ...}
    // by mongoose
    next();
});

PharmacySchema.methods.getId = function (callback) {
    mongoose.model("Counter").nextInSeq("pharmacyId", function (err, counter) {
        if (err) return callback(err);
        this._id = counter;
        callback(null, this);
    }.bind(this));
};

PharmacySchema.methods.setData = function (data) {
    if (typeof data.name !== 'undefined') {
        if (data.name.length === 0) return errors.NAME_REQUIRED;
        this.name = data.name;
    }

    if (typeof data.phone !== 'undefined') this.phone = data.phone;
    if (typeof data.address !== 'undefined') this.address = data.address;
    if (typeof data.hours !== 'undfined') this.hours = data.hours;
};
