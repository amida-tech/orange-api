"use strict";
var mongoose        = require("mongoose"),
    extend          = require("xtend"),
    TIME_REGEXP     = require("./helpers/time.js").TIME_REGEXP,
    errors          = require("../errors.js").ERRORS,
    autoIncrementId = require("./helpers/increment_plugin.js"),
    fuzzy           = require("./helpers/fuzzy_plugin.js");

// validates HH:MM strings
var hoursValidator = function (val) {
    return (typeof val === "undefined") || val === null || (TIME_REGEXP.test(val.toString()));
};

// a schema to be nested inside a Patient representing their pharmacies
/*eslint-disable key-spacing */
// opening and closing times for a specific pharmacy on one day of the week
var HoursItem = {
    open:      { type: String, validate: [hoursValidator, "INVALID_HOURS"] },
    close:     { type: String, validate: [hoursValidator, "INVALID_HOURS"] }
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
    },
    notes:      { type: String, default: ""}
});
/*eslint-enable key-spacing */

// fuzzy matching on name field
PharmacySchema.plugin(fuzzy, { fields: ["name"] });

PharmacySchema.plugin(autoIncrementId, { slug: "pharmacyId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
PharmacySchema.methods.setData = function (data) {
    if (typeof data.name !== "undefined") this.name = data.name;
    if (typeof data.phone !== "undefined") this.phone = data.phone;
    if (typeof data.address !== "undefined") this.address = data.address;
    if (typeof data.notes !== "undefined") this.notes = data.notes;

    if (typeof data.hours !== "undefined") {
        // non-object values are invalid
        if (typeof data.hours !== "object") return errors.INVALID_HOURS;

        // null values reset all days
        if (data.hours === null) {
            this.hours = null;
        } else {
            // combine new with previous hours
            var days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
            for (var i = 0; i < days.length; i++) {
                var day = days[i];

                // ignore undefined values
                if (typeof data.hours[day] === "undefined") continue;

                // non-object values are invalid
                if (typeof data.hours[day] !== "object") return errors.INVALID_HOURS;

                // null values reset that day
                if (data.hours[day] === null) this.hours[day] = {};

                // otherwise we combine with the old data
                this.hours[day] = extend(this.hours[day], data.hours[day]);
            }
        }
    }
};

// return an object containing our data
PharmacySchema.methods.getData = function () {
    var data = {
        _id: this._id,
        name: this.name,
        phone: this.phone,
        address: this.address,
        hours: this.hours,
        notes: this.notes
    };

    // if hours is null, return a default object instead
    // we perform this check here rather than setting hours to a default value in the pre
    // save callback because mongoose is weird (specifically setting hours to this default object
    // will cause this.hours to appear null anyway because of the intracies in mongoose's
    // handling of nested schemata)
    // when hours is set to null, mongoose makes this.hours an object that looks and feels
    // like null for all intents and purposes (console.log, util.format, json, etc) but
    // isn't actually null and contains getter methods for monday/tuesday/etc
    if (this.toJSON().hours === null) {
        data.hours = {
            monday: {},
            tuesday: {},
            wednesday: {},
            thursday: {},
            friday: {},
            saturday: {},
            sunday: {}
        };
    }

    return data;
};

// use null values to reset optional fields
PharmacySchema.pre("save", function (next) {
    if (this.phone === null) this.phone = "";
    if (this.address === null) this.address = "";
    if (this.notes === null) this.notes = "";

    next();
});
