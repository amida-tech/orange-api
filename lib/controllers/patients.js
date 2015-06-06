"use strict";
var express = require("express");
var mongoose = require("mongoose");
var patients = module.exports = express();

var Patient = mongoose.model("Patient");
var authenticate = require("./auth.js").authenticate;

// CRUD helpers
var crud = require("./helpers/crud.js");
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "access"];
var initialFilterInput = crud.filterInputGenerator(["name"]), // don't want to be able to specify access initially
    filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "patients"),
    returnData = crud.returnData;

// Create new patient with current user given write access by default
patients.post("/", authenticate, initialFilterInput, function (req, res, next) {
    Patient.createForUser(req.data, req.user, returnData(res, next));
}, formatObjectCode(201));

// List all patients
patients.get("/", authenticate, function (req, res, next) {
    Patient.findForUser({}, req.user, returnData(res, next));
}, formatList);

// View single patient
patients.get("/:id", authenticate, function (req, res, next) {
    // Requires user to have at least read access to patient
    Patient.findByIdForUser(req.params.id, req.user, "read", returnData(res, next));
}, formatObject);

// Update single patient
patients.put("/:id", authenticate, filterInput, function (req, res, next) {
    // Requires user to have write access to patient
    Patient.findByIdAndUpdateForUser(req.params.id, req.data, req.user, returnData(res, next));
}, formatObject);

// Delete single patient
patients.delete("/:id", authenticate, function (req, res, next) {
    // Requires user to have write access to patient
    Patient.findByIdAndDeleteForUser(req.params.id, req.user, returnData(res, next));
}, formatObject);
