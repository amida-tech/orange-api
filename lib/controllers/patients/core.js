"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    crud            = require("../helpers/crud.js"),
    query           = require("../helpers/query.js"),
    auth            = require("../helpers/auth.js"),
    errors          = require("../../errors.js").ERRORS;

var Patient = mongoose.model("Patient");
var patients = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var initialKeys = ["first_name", "last_name", "birthdate", "sex", "access_anyone", "access_prime", "access_family"];
var inputKeys = initialKeys.concat(["access", "group"]);
var keys = module.exports.keys = inputKeys.concat(["avatar"]);
// Don't want to be able to specify access on initial creation
var initialFilterInput = crud.filterInputGenerator(initialKeys),
    filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "patients"),
    returnData = crud.returnData;

// Create new patient with current user given write access by default
patients.post("/", auth.authenticate, initialFilterInput, function (req, res, next) {
    Patient.createForUser(req.data, req.user, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

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

patients.get("/", auth.authenticate, function (req, res, next) {
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = query.parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);
    // number of results to skip initially (for pagination)
    var offset = query.parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);
    // key to sort by
    var sortBy = query.parseString(req.query.sort_by, ["id", "first_name", "last_name"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);
    // order to sort in
    var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);
    // name to filter by
    var firstName = req.query.first_name;
    var lastName = req.query.last_name;

    // the model handles the querying for us
    Patient.findForUser({
        limit: limit,
        offset: offset,
        sortBy: sortBy,
        sortOrder: sortOrder,
        firstName: firstName,
        lastName: lastName
    }, req.user, function (err, patients, count) {
        if (err) return next(err);

        // store both data and count
        res.data = patients;
        res.count = count;
        next();
    });
}, formatList);
