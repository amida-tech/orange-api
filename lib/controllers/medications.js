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

// Usually we just return doctor_id and pharmacy_id fields, but some endpoints use
// this middleware to expand out these into full doctor and pharmacy fields (containing
// their respective objects respectively)
function populateMedication (req, res, next) {
    // TODO: filter keys on this
    res.data.expand(req.patient);
    next();
}

// Create a new medication for the specified patient (requires write access)
medications.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createMedication(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single medication for the specified patient
medications.get("/:medicationid", function (req, res, next) {
    req.patient.findMedicationById(req.params.medicationid, returnData(res, next));
}, populateMedication, formatObject);

// Remove a single medication for the specified patient (requires write access)
medications.delete("/:medicationid", auth.requireWrite, function (req, res, next) {
    req.patient.findMedicationByIdAndDelete(req.params.medicationid, returnData(res, next));
}, formatObject);

// Update a single medication for the specified patient (requires write access)
medications.put("/:medicationid", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findMedicationByIdAndUpdate(req.params.medicationid, req.data, returnData(res, next));
}, formatObject);

// View a listing of all medications for the specified patient
medications.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.medications);
}, formatList);
