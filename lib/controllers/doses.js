"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var doses = module.exports = express();

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["medication_id", "date", "notes", "medication"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doses"),
    returnData = crud.returnData;

// Usually we just return medication_id, but when viewing a specific
// journal entry we expand this out to medication
function populateEntry (req, res, next) {
    // TODO: filter keys on this, and expand out pharmacy and doctor
    // as subfields as well
    res.data.expand(req.patient);
    next();
}

// record new dose event belonging to the specified patient and medication
// (specified by patient_id in the URL and medication_id in the POST data respectively)
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
doses.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createDose(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a dose event belonging to the specified patient
doses.get("/:doseid", function (req, res, next) {
    req.patient.findDoseById(req.params.doseid, returnData(res, next));
}, populateEntry, formatObject);

// remove a single dose event belonging to the specified patient (write access required)
doses.delete("/:doseid", auth.requireWrite, function (req, res, next) {
    req.patient.findDoseByIdAndDelete(req.params.doseid, returnData(res, next));
}, formatObject);

// update a dose event belonging to the specified patient (write access required)
doses.put("/:doseid", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findDoseByIdAndUpdate(req.params.doseid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all dose events belonging to the specified patient
doses.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.doses);
}, formatList);
