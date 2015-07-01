"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var pharmacies = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["name", "phone", "address", "hours", "notes"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "pharmacies"),
    returnData = crud.returnData;

// Create a new pharmacy for the specified patient (requires write access)
pharmacies.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createPharmacy(req.data, returnData(res, next));
}, formatObjectCode(201));

// View a single pharmacy for the specified patient
pharmacies.get("/:pharmacyid", auth.authorize("read"), function (req, res, next) {
    req.patient.findPharmacyById(req.params.pharmacyid, returnData(res, next));
}, formatObject);

// Remove a single pharmacy for the specified patient
pharmacies.delete("/:pharmacyid", auth.authorize("write"), function (req, res, next) {
    req.patient.findPharmacyByIdAndDelete(req.params.pharmacyid, returnData(res, next));
}, formatObject);

// Update a single pharmacy for the specified patient
pharmacies.put("/:pharmacyid", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.findPharmacyByIdAndUpdate(req.params.pharmacyid, req.data, returnData(res, next));
}, formatObject);

// Get a listing of all pharmacies for the specified patient
pharmacies.get("/", auth.authorize("read"), function (req, res, next) {
    returnData(res, next)(null, req.patient.pharmacies);
}, formatList);
