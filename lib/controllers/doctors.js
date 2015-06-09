"use strict";
var express = require("express");
var doctors = module.exports = express();
var errors = require("../errors.js").ERRORS;

// CRUD helpers
var crud = require("./helpers/crud.js");
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "phone", "address"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doctors"),
    returnData = crud.returnData;


// create new doctor belonging to the specified patient
doctors.post("/", filterInput, function (req, res, next) {
    // middleware assures us we have read access to the patient, but here we need
    // to specifically check for write access
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);

    req.patient.createDoctor(req.data, returnData(res, next));
}, formatObjectCode(201));

doctors.get("/:doctorid", function (req, res, next) {
    req.patient.findDoctorById(req.params.doctorid, returnData(res, next));
}, formatObject);

doctors.delete("/:doctorid", function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findDoctorByIdAndDelete(req.params.doctorid, returnData(res, next));
}, formatObject);

doctors.put("/:doctorid", filterInput, function (req, res, next) {
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);
    req.patient.findDoctorByIdAndUpdate(req.params.doctorid, req.data, returnData(res, next));
}, formatObject);

doctors.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.doctors);
}, formatList);
