"use strict";
var express = require("express"),
    fuzzy   = require("fuzzy"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js"),
    errors  = require("../errors.js").ERRORS;

var doctors = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["name", "phone", "address", "notes"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doctors"),
    returnData = crud.returnData;

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

// parse a positive integer query parameter
var parseNatural = function (raw, defaultValue) {
    // when not specified
    if (typeof raw === "undefined" || raw === null || raw === "") return defaultValue;

    // try and parse
    var value = ~~Number(raw); // ~~ truncates fractional parts
    if (String(value) !== raw || value < 0) return null; // error

    // return parsed value
    return value;
};

// parse a string query paramters and check it's in a list of allowed values
var parseString = function (raw, allowedValues, defaultValue) {
    // when not specified
    if (typeof raw === "undefined" || raw === null || raw === "") return defaultValue;

    if (allowedValues.indexOf(raw) >= 0) return raw;

    // error
    return null;
};

// view a listing of all doctors belonging to the specified patient
doctors.get("/", auth.authorize("read"), function (req, res, next) {
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);

    // number of results to skip initially (for pagination)
    var offset = parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);

    // key to sort by
    var sortBy = parseString(req.query.sort_by, ["id", "name"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);

    // order to sort in
    var sortOrder = parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);

    // name to sort by
    var name = req.query.name;

    // all data initially
    res.data = req.patient.doctors;

    // search data if we need to
    if (typeof name !== "undefined" && name !== null && name.length !== 0) {
        // use fuzzy library for fuzzy matching
        res.data = res.data.filter(function (doctor) {
            return fuzzy.test(name, doctor.name);
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "name") {
        // sort by string name
        res.data.sort(function (doctorA, doctorB) {
            return doctorA.name.localeCompare(doctorB.name);
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (doctorA, doctorB) {
            return doctorA.id - doctorB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatList);
