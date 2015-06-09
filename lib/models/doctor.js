"use strict";

var mongoose = require("mongoose");
var errors = require("../errors.js").ERRORS;

/*eslint-disable key-spacing */
var DoctorSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    // basic loose regexp for phone number matching
    phone:      { type: String },
    address:    { type: String }
});
/*eslint-enable key-spacing */

// store empty phones and addresses rather than undefined ones
DoctorSchema.pre("save", function (next) {
    if (typeof this.phone === "undefined") this.phone = "";
    if (typeof this.address === "undefined") this.address = "";
    next();
});

DoctorSchema.methods.getId = function (callback) {
    mongoose.model("Counter").nextInSeq("doctorid", function (err, counter) {
        if (err) return callback(err);
        this._id = counter;
        callback(null, this);
    }.bind(this));
};

DoctorSchema.methods.setData = function (data) {
    if (typeof data.name !== 'undefined') {
        if (data.name.length === 0) return errors.NAME_REQUIRED;
        this.name = data.name;
    }

    if (typeof data.phone !== 'undefined') this.phone = data.phone;
    if (typeof data.address !== 'undefined') this.address = data.address;
};
