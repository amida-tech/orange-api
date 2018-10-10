"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    auth            = require("./helpers/auth.js"),
    list            = require("./helpers/list.js");

var pharmacies = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["name", "phone", "address", "hours", "notes"];
// TODO: Get google api key and use for geolocation
var keys = module.exports.keys = inputKeys.concat([/*"lat", "lon"*/]);
var filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "pharmacies"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

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
var paramParser = list.parseListParameters(["id", "name"], ["name"]);
pharmacies.get("/", auth.authorize("read"), paramParser, function (req, res, next) {
    req.patient.queryPharmacies(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
