"use strict";
var express = require("express"),
    fuzzy   = require("fuzzy"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js"),
    query   = require("./helpers/query.js"),
    errors  = require("../errors.js").ERRORS;

var pharmacies = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["name", "phone", "address", "hours", "notes"];
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
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = query.parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);
    // number of results to skip initially (for pagination)
    var offset = query.parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);
    // key to sort by
    var sortBy = query.parseString(req.query.sort_by, ["id", "name"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);
    // order to sort in
    var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);
    // name to sort by
    var name = req.query.name;

    // all data initially
    res.data = req.patient.pharmacies;

    // search data if we need to
    if (typeof name !== "undefined" && name !== null && name.length !== 0) {
        // use fuzzy library for fuzzy matching
        res.data = res.data.filter(function (pharmacy) {
            return fuzzy.test(name, pharmacy.name);
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "name") {
        // sort by string name
        res.data.sort(function (pharmacyA, pharmacyB) {
            return pharmacyA.name.localeCompare(pharmacyB.name);
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (pharmacyA, pharmacyB) {
            return pharmacyA.id - pharmacyB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatList);
