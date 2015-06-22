"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var adherences = module.exports = express();

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["medication_id", "date", "notes", "medication"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "adherences"),
    returnData = crud.returnData;

// record new adherence event belonging to the specified patient and medication
// (specified by patient_id in the URL and medication_id in the POST data respectively)
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
adherences.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createAdherence(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get an adherence event belonging to the specified patient
adherences.get("/:adherenceid", function (req, res, next) {
    req.patient.findAdherenceById(req.params.adherenceid, returnData(res, next));
}, formatObject);

// remove a single adherence event belonging to the specified patient (write access required)
adherences.delete("/:adherenceid", auth.requireWrite, function (req, res, next) {
    req.patient.findAdherenceByIdAndDelete(req.params.adherenceid, returnData(res, next));
}, formatObject);

// update an adherence event belonging to the specified patient (write access required)
adherences.put("/:adherenceid", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findAdherenceByIdAndUpdate(req.params.adherenceid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all adherences belonging to the specified patient
adherences.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.adherences);
}, formatList);
