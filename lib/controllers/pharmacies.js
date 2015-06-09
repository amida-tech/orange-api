"use strict";
var express = require("express");
var pharmacies = module.exports = express();
var errors = require("../errors.js").ERRORS;

// CRUD helpers
var crud = require("./helpers/crud.js");
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "phone", "address", "hours"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "pharmacies"),
    returnData = crud.returnData;

pharmacies.post("/", filterInput, function (req, res, next) {
    // middleware assures us we have read access to the patient, but here we need
    // to specifically check for write access
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);

    req.patient.createPharmacy(req.data, returnData(res, next));
}, formatObjectCode(201));

pharmacies.get("/:pharmacyid", function (req, res, next) {
    req.patient.findPharmacyById(req.params.pharmacyid, returnData(res, next));
}, formatObject);

pharmacies.delete("/:pharmacyid", function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findPharmacyByIdAndDelete(req.params.pharmacyid, returnData(res, next));
}, formatObject);

pharmacies.put("/:pharmacyid", filterInput, function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findPharmacyByIdAndUpdate(req.params.pharmacyid, req.data, returnData(res, next));
}, formatObject);

pharmacies.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.pharmacies);
}, formatList);
