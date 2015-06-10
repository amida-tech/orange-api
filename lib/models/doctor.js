"use strict";
var mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their doctors
var DoctorSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    // sensible defaults for optional keys so we don't return nulls through
    // the API or leave keys undefined
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" }
});
/*eslint-enable key-spacing */

DoctorSchema.plugin(autoIncrementId, { slug: "doctorId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
DoctorSchema.methods.setData = function (data) {
    if (typeof data.name !== "undefined") {
        if (data.name.length === 0) return errors.NAME_REQUIRED;
        this.name = data.name;
    }

    if (typeof data.phone !== "undefined") this.phone = data.phone;
    if (typeof data.address !== "undefined") this.address = data.address;
};
