"use strict";

var mongoose = require("mongoose");
var errors = require("../errors.js").ERRORS;
var TIME_REGEXP = require("./helpers/time.js").TIME_REGEXP;

/*eslint-disable key-spacing */
var HoursItem = {
    open:      { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] },
    close:     { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] }
};
var PharmacySchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" },
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
