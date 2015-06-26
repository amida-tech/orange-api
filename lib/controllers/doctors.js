"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var doctors = module.exports = express();

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "phone", "address", "notes"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doctors"),
    returnData = crud.returnData;

// create new doctor belonging to the specified patient
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
doctors.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createDoctor(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a doctor belonging to the specified patient
doctors.get("/:doctorid", function (req, res, next) {
    req.patient.findDoctorById(req.params.doctorid, returnData(res, next));
}, formatObject);

// remove a doctor belonging to the specified patient (write access required)
doctors.delete("/:doctorid", auth.requireWrite, function (req, res, next) {
    req.patient.findDoctorByIdAndDelete(req.params.doctorid, returnData(res, next));
}, formatObject);

// update a doctor belonging to the specified patient (write access required)
doctors.put("/:doctorid", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findDoctorByIdAndUpdate(req.params.doctorid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all doctors belonging to the specified patient
doctors.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.doctors);
}, formatList);
