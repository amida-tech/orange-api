"use strict";

var mongoose = require("mongoose");
var async = require("async");
var errors = require("../errors.js").ERRORS;
var autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
var MedicationSchema = module.exports = new mongoose.Schema({
    // provide sensible defaults for everything optional apart from doctorId and pharmacyId
    _id:            { type: Number, required: true },
    name:           { type: String, required: true },
    rxNorm:         { type: String, default: "" },
    rxNumber:       { type: String, default: "" },
    ndc:            { type: String, default: "" },
    dose:           {
        quantity:   { type: Number, default: 1 },
        unit:       { type: String, default: "dose" }
    },
    route:          { type: String, default: "" },
    form:           { type: String, default: "" },
    quantity:       { type: Number, default: 1 },
    type:           { type: String, default: "" },
    schedule:       { type: mongoose.Schema.Types.Mixed, default: {} },
    doctorId:       { type: Number, ref: 'Patient.Doctor', default: null },
    pharmacyId:     { type: Number, ref: 'Patient.Pharmacy', default: null }
});
/*eslint-enable key-spacing */

MedicationSchema.plugin(autoIncrementId, { slug: "medicationId" }); // auto incrementing IDs

MedicationSchema.methods.setData = function (data) {
    // require name to not be blank
    if (typeof data.name !== 'undefined') {
        if (data.name.length === 0) return errors.NAME_REQUIRED;
        this.name = data.name;
    }

    // we use snake_case in API requests and camelCase internally here
    // only do optional keys here, see name setter above
    var mappings = {
        name: "name",
        rxNorm: "rx_norm",
        rxNumber: "rx_number",
        ndc: "ndc",
        dose: "dose",
        route: "route",
        form: "form",
        quantity: "quantity",
        type: "type",
        schedule: "schedule",
        doctorId: "doctor_id",
        pharmacyId: "pharmacy_id"
    };
    for (var key in mappings) {
        // ignore prototypical values
        if (mappings.hasOwnProperty(key)) {
            var dataKey = mappings[key];
            // store data if it's present
            if (typeof data[dataKey] !== 'undefined') this[key] = data[dataKey];
        };
    }
};

// invert the mapping performed above
MedicationSchema.methods.getData = function () {
    // TODO: perhaps automate inverting mapping above (and maybe even just automate
    // the snakecase/camelcase conversion)
    var mappings = {
        _id: "_id",
        name: "name",
        rx_norm: "rxNorm",
        rx_number: "rxNumber",
        ndc: "ndc",
        dose: "dose",
        route: "route",
        form: "form",
        quantity: "quantity",
        type: "type",
        schedule: "schedule",
        doctor_id: "doctorId",
        pharmacy_id: "pharmacyId",
        doctor: "doctor",
        pharmacy: "pharmacy"
    };
    var data = {};
    for (var key in mappings) {
        // ignore prototypical values
        if (mappings.hasOwnProperty(key)) {
            var internalKey = mappings[key];
            // store data if it's present
            if (typeof this[internalKey] !== 'undefined') data[key] = this[internalKey];
        };
    }
    // if we have the full doctor object, we don't need doctor_id
    if ('doctor' in data) delete data.doctor_id;
    if ('pharmacy' in data) delete data.pharmacy_id;
    return data;
};

// expand out (populate) doctor and pharmacy into fully-featured objects
MedicationSchema.methods.expand = function (callback) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    var Doctor = mongoose.model("Doctor"), Pharmacy = mongoose.model("Pharmacy");
    async.parallel({
        doctor: async.apply(Doctor.findById.bind(Doctor), this.doctorId),
        pharmacy: async.apply(Pharmacy.findById.bind(Pharmacy), this.pharmacyId)
    }, function (err, results) {
        if (err) return callback(err);
        // even if null, that's okay as we'll return null
        this.doctor = results.doctor;
        this.pharmacy = results.pharmacy;
        callback(null, this);
    }.bind(this));
};
