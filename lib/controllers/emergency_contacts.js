"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js"),
    auth            = require("./helpers/auth.js");

var emergencyContacts = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["firstName", "lastName", "relation", "primaryPhone", "secondaryPhone", "email", "primaryPhoneProtocols", "secondaryPhoneProtocols"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "emergencyContacts"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

// create new emergency contact belonging to the specified patient
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
emergencyContacts.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createEmergencyContact(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a emergency contact belonging to the specified patient
emergencyContacts.get("/:emergencyContactId", auth.authorize("read"), function (req, res, next) {
    req.patient.findEmergencyContactById(req.params.emergencyContactId, returnData(res, next));
}, formatObject);

// remove a emergency contact belonging to the specified patient (write access required)
emergencyContacts.delete("/:emergencyContactId", auth.authorize("write"), function (req, res, next) {
    req.patient.findEmergencyContactByIdAndDelete(req.params.emergencyContactId, returnData(res, next));
}, formatObject);

// update a emergency contact belonging to the specified patient (write access required)
emergencyContacts.put("/:emergencyContactId", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.findEmergencyContactByIdAndUpdate(req.params.emergencyContactId, req.data, returnData(res, next));
}, formatObject);

// view a listing of all emergency contacts belonging to the specified patient
var paramParser = list.parseListParameters(["id", "firstName"], ["firstName"]);
emergencyContacts.get("/", auth.authorize("read"), paramParser, function (req, res, next) {
    req.patient.queryEmergencyContacts(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
