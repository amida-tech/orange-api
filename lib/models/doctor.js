"use strict";

var mongoose = require("mongoose");
var errors = require("../errors.js").ERRORS;

/*eslint-disable key-spacing */
var DoctorSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    name:       { type: String, required: true },
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" }
});
/*eslint-enable key-spacing */

DoctorSchema.methods.getId = function (callback) {
    mongoose.model("Counter").nextInSeq("doctorId", function (err, counter) {
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
