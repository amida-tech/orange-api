"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var medications = module.exports = express();

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule",
    "doctor_id", "pharmacy_id", "doctor", "pharmacy"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "medications"),
    returnData = crud.returnData;

// We use snake_case keys in the API and camelCase keys in mongoose, so need
// middleware to convert between the two. The Medication model handles the bulk of
// the work with getData and setData.
// Format (camelCase => snake_case) a single medication
function formatMedication (req, res, next) {
    // getData method on Medication model does this all for us
    res.data = res.data.getData();
    next();
}
// Format a list of medications
function formatMedications (req, res, next) {
    for (var i = 0; i < res.data.length; i++) res.data[i] = res.data[i].getData();
    next();
}

// Usually we just return doctor_id and pharmacy_id fields, but some endpoints use
// this middleware to expand out these into full doctor and pharmacy fields (containing
// their respective objects respectively)
function populateMedication (req, res, next) {
    // TODO: filter keys on this
    res.data.expand(next);
}

// Create a new medication for the specified patient (requires write access)
medications.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createMedication(req.data, returnData(res, next));
}, formatMedication, formatObjectCode(201)); // return 201 status code

// View a single medication for the specified patient
medications.get("/:medicationid", function (req, res, next) {
    req.patient.findMedicationById(req.params.medicationid, returnData(res, next));
}, populateMedication, formatMedication, formatObject);

// Remove a single medication for the specified patient (requires write access)
medications.delete("/:medicationid", auth.requireWrite, function (req, res, next) {
    req.patient.findMedicationByIdAndDelete(req.params.medicationid, returnData(res, next));
}, formatMedication, formatObject);

// Update a single medication for the specified patient (requires write access)
medications.put("/:medicationid", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findMedicationByIdAndUpdate(req.params.medicationid, req.data, returnData(res, next));
}, formatMedication, formatObject);

// View a listing of all medications for the specified patient
medications.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.medications);
}, formatMedications, formatList);
