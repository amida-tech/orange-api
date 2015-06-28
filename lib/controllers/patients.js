"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    imageType       = require("image-type"),
    crud            = require("./helpers/crud.js"),
    auth            = require("./helpers/auth.js");

var authenticate    = auth.authenticate,
    findPatient     = auth.findPatient;

var patients = module.exports = express();

var Patient = mongoose.model("Patient");

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

// View patient avatar
// id must be patientid for findPatient middleware to work
patients.get("/:patientid/avatar(.\\w+)?", authenticate, findPatient, function (req, res, next) {
    // get patient avatar (or default avatar if they haven't set one yet)
    req.patient.getAvatar(function (err, avatar, contentType) {
        if (err) return next(err);

        // set Content-Type header
        res.header("Content-Type", contentType);

        // avatar is a stream containing the image data we can pipe straight to response
        avatar.pipe(res);
    });
});

// Create new patient with current user given write access by default
patients.post("/", authenticate, initialFilterInput, function (req, res, next) {
    Patient.createForUser(req.data, req.user, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// List all patients
patients.get("/", authenticate, function (req, res, next) {
    Patient.findForUser({}, req.user, returnData(res, next));
}, formatList);

// The following /:id routes must come after the /:id/slug (e.g., avatar) routes otherwise
// they'll override them

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
