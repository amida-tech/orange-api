"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var medications = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule",
    "doctor_id", "pharmacy_id", "doctor", "pharmacy", "fill_date", "access_anyone", "access_family", "access_prime"];
var keys = inputKeys.concat(["number_left"]); // output-only fields
var filterInput = crud.filterInputGenerator(inputKeys),
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

// authorize read-only the user against the patient, and then with the specified access
// level against the medication
function authorize(access) {
    return function (req, res, next) {
        // first authorize read access against the patient
        auth.authorize("read")(req, res, function (err) {
            if (err) return next(err);

            // find medication from params and authenticate
            // TODO: we're making duplicate find calls for every medication endpoint
            req.patient.findMedicationById(req.params.medicationid, function (err, medication) {
                if (err) return next(err);
                medication.authorize(access, req.user, req.patient, next);
            });
        });
    };
}

// Create a new medication for the specified patient (requires write access)
medications.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createMedication(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single medication for the specified patient
medications.get("/:medicationid", authorize("read"), function (req, res, next) {
    req.patient.findMedicationById(req.params.medicationid, returnData(res, next));
}, populateMedication, formatObject);

// Remove a single medication for the specified patient (requires write access)
medications.delete("/:medicationid", authorize("write"), function (req, res, next) {
    req.patient.findMedicationByIdAndDelete(req.params.medicationid, returnData(res, next));
}, formatObject);

// Update a single medication for the specified patient (requires write access)
medications.put("/:medicationid", authorize("write"), filterInput, function (req, res, next) {
    req.patient.findMedicationByIdAndUpdate(req.params.medicationid, req.data, returnData(res, next));
}, formatObject);

// View a listing of all medications for the specified patient
medications.get("/", auth.authorize("read"), function (req, res, next) {
    // TODO: filter in here
    returnData(res, next)(null, req.patient.medications);
}, formatList);
