"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    crud            = require("../helpers/crud.js"),
    auth            = require("../helpers/auth.js");

var Patient = mongoose.model("Patient");
var patients = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["name", "birthdate", "sex"];
var keys = inputKeys.concat(["access", "avatar"]);
// Don't want to be able to specify access on initial creation
var initialFilterInput = crud.filterInputGenerator(inputKeys),
    filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "patients"),
    returnData = crud.returnData;

// Create new patient with current user given write access by default
patients.post("/", auth.authenticate, initialFilterInput, function (req, res, next) {
    Patient.createForUser(req.data, req.user, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// List all patients
patients.get("/", auth.authenticate, function (req, res, next) {
    Patient.findForUser({}, req.user, returnData(res, next));
}, formatList);

// View single patient
patients.get("/:id", auth.authenticate, function (req, res, next) {
    // Requires user to have at least read access to patient
    Patient.findByIdForUser(req.params.id, req.user, "read", returnData(res, next));
}, formatObject);

// Update single patient
patients.put("/:id", auth.authenticate, filterInput, function (req, res, next) {
    // Requires user to have write access to patient
    Patient.findByIdAndUpdateForUser(req.params.id, req.data, req.user, returnData(res, next));
}, formatObject);

// Delete single patient
patients.delete("/:id", auth.authenticate, function (req, res, next) {
    // Requires user to be the owner of the patient
    Patient.findByIdAndDeleteForUser(req.params.id, req.user, returnData(res, next));
}, formatObject);
