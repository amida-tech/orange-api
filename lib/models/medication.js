"use strict";
var mongoose        = require("mongoose"),
    async           = require("async"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their medications
var MedicationSchema = module.exports = new mongoose.Schema({
    // provide sensible defaults for everything optional apart from doctorId and pharmacyId
    // so we can directly return values over the API
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
    doctorId:       { type: Number, ref: "Patient.Doctor", default: null },
    pharmacyId:     { type: Number, ref: "Patient.Pharmacy", default: null }
});
/*eslint-enable key-spacing */

MedicationSchema.plugin(autoIncrementId, { slug: "medicationId" }); // auto incrementing IDs

// mapping between API keys and mongoose keys
// we use snake_case in API requests and camelCase internally here
var MAPPINGS = {
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

// the reverse of the above mapping, but here we do include optional keys
var REVERSE_MAPPINGS = {
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

// given a raw data object, update ourselves with it
// note we don't call save here
MedicationSchema.methods.setData = function (data) {
    for (var key in MAPPINGS) {
        // ignore prototypical values
        if (MAPPINGS.hasOwnProperty(key)) {
            var dataKey = MAPPINGS[key];
            // store data if it's present
            if (typeof data[dataKey] !== "undefined") this[key] = data[dataKey];
        }
    }
};

// invert the mapping performed above to format data for the API
// TODO: maybe abstract this out: we need to do this on every model it just so happens
// this is currently the only model with keys of more than one word
MedicationSchema.methods.getData = function () {
    var data = {};
    for (var key in REVERSE_MAPPINGS) {
        // ignore prototypical values
        if (REVERSE_MAPPINGS.hasOwnProperty(key)) {
            var internalKey = REVERSE_MAPPINGS[key];
            // store data if it's present
            if (typeof this[internalKey] !== "undefined") data[key] = this[internalKey];
        }
    }

    // if we have the full doctor object, we don't need doctor_id
    if ("doctor" in data) delete data.doctor_id;
    if ("pharmacy" in data) delete data.pharmacy_id;

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
