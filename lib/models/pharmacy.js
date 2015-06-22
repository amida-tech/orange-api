"use strict";
var mongoose        = require("mongoose"),
    TIME_REGEXP     = require("./helpers/time.js").TIME_REGEXP,
    autoIncrementId = require("./helpers/increment_plugin.js");

// a schema to be nested inside a Patient representing their pharmacies
/*eslint-disable key-spacing */
// opening and closing times for a specfic pharmacy on one day of the week
var HoursItem = {
    open:      { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] },
    close:     { type: String, validate: [TIME_REGEXP, "INVALID_HOURS"] }
};
var PharmacySchema = module.exports = new mongoose.Schema({
    name:       { type: String, required: true },
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" },
    // mongoose will default to an object containing {monday: null, tuesday: null, ...}
    // which is exactly what we want to return to the client when we have no actual data
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

PharmacySchema.plugin(autoIncrementId, { slug: "pharmacyId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
PharmacySchema.methods.setData = function (data) {
    if (typeof data.name !== "undefined") this.name = data.name;
    if (typeof data.phone !== "undefined") this.phone = data.phone;
    if (typeof data.address !== "undefined") this.address = data.address;
    if (typeof data.hours !== "undefined") this.hours = data.hours;
};
