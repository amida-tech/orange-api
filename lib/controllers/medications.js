"use strict";
var express = require("express");
var medications = module.exports = express();
var errors = require("../errors.js").ERRORS;

// CRUD helpers
var crud = require("./helpers/crud.js");
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule", "doctor_id", "pharmacy_id"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "medications"),
    returnData = crud.returnData;

// middleware to turn snake_case keys into camelCase keys
// TODO: automate this
function formatMedication (req, res, next) {
    // getData method on Medication model does this all for us
    res.data = res.data.getData();
    next();
};

medications.post("/", filterInput, function (req, res, next) {
    // middleware assures us we have read access to the patient, but here we need
    // to specifically check for write access
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);

    req.patient.createMedication(req.data, returnData(res, next));
}, formatMedication, formatObjectCode(201));

medications.get("/:medicationid", function (req, res, next) {
    req.patient.findMedication(req.params.medicationid, returnData(res, next));
}, formatMedication, formatObject);

medications.delete("/:medicationid", function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findMedication(req.params.medicationid, returnData(res, next));
}, formatMedication, formatObject);

medications.put("/:medicationid", filterInput, function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findMedication(req.params.medicationid, req.data, returnData(res, next));
}, formatMedication, formatObject);

medications.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.medications);
}, formatList);
