"use strict";
var mongoose        = require("mongoose"),
    fuzzy           = require("./helpers/fuzzy_plugin.js"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their doctors
var DoctorSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    // sensible defaults for optional keys so we don't return nulls through
    // the API or leave keys undefined
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" },
    notes:      { type: String, default: "" },
    title:      { type: String, default: "" }
});
/*eslint-enable key-spacing */

// fuzzy matching on name field
DoctorSchema.plugin(fuzzy, { fields: ["name"] });

DoctorSchema.plugin(autoIncrementId, { slug: "doctorId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
DoctorSchema.methods.setData = function (data) {
    if (typeof data.name !== "undefined") this.name = data.name;
    if (typeof data.phone !== "undefined") this.phone = data.phone;
    if (typeof data.address !== "undefined") this.address = data.address;
    if (typeof data.notes !== "undefined") this.notes = data.notes;
    if (typeof data.title !== "undefined") this.title = data.title;
};

// output Doctor for API
DoctorSchema.methods.getData = function () {
    return {
        _id: this._id,
        name: this.name,
        phone: this.phone,
        address: this.address,
        notes: this.notes,
        title: this.title
    };
};

// use null values to reset optional fields
DoctorSchema.pre("save", function (next) {
    if (this.phone === null) this.phone = "";
    if (this.address === null) this.address = "";
    if (this.notes === null) this.notes = "";
    if (this.title === null) this.title = "";
    next();
});
