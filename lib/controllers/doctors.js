"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js"),
    auth            = require("./helpers/auth.js");

var doctors = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["name", "phone", "address", "notes", "title"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doctors"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

// create new doctor belonging to the specified patient
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
doctors.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createDoctor(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a doctor belonging to the specified patient
doctors.get("/:doctorid", auth.authorize("read"), function (req, res, next) {
    req.patient.findDoctorById(req.params.doctorid, returnData(res, next));
}, formatObject);

// remove a doctor belonging to the specified patient (write access required)
doctors.delete("/:doctorid", auth.authorize("write"), function (req, res, next) {
    req.patient.findDoctorByIdAndDelete(req.params.doctorid, returnData(res, next));
}, formatObject);

// update a doctor belonging to the specified patient (write access required)
doctors.put("/:doctorid", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.findDoctorByIdAndUpdate(req.params.doctorid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all doctors belonging to the specified patient
var paramParser = list.parseListParameters(["id", "name"], ["name"]);
doctors.get("/", auth.authorize("read"), paramParser, function (req, res, next) {
    req.patient.queryDoctors(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
