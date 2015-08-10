"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    crud            = require("../helpers/crud.js"),
    list            = require("../helpers/list.js"),
    auth            = require("../helpers/auth.js"),
    errors          = require("../../errors.js").ERRORS;

var Patient = mongoose.model("Patient");
var patients = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var initialKeys = ["first_name", "last_name", "birthdate", "sex", "access_anyone", "access_prime", "access_family",
                    "phone"];
var inputKeys = initialKeys.concat(["access", "group"]);
var keys = module.exports.keys = inputKeys.concat(["avatar", "creator", "me"]);
// Don't want to be able to specify access on initial creation
var initialFilterInput = crud.filterInputGenerator(initialKeys),
    filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "patients"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

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

var paramParser = list.parseListParameters(["id", "first_name", "last_name"],
        ["first_name", "last_name", "group", "creator"]);
patients.get("/", auth.authenticate, paramParser, function (req, res, next) {
    // validate group parameter if present
    var group = req.listParameters.filters.group;
    // optional
    if (typeof group === "undefined" || group === null) return next();
    // must be one of these 4 values
    if (["owner", "anyone", "family", "prime"].indexOf(group) < 0) return next(errors.INVALID_GROUP);

    next();
}, function (req, res, next) {
    // the model handles the querying for us
    Patient.findForUser({
        limit: req.listParameters.limit,
        offset: req.listParameters.offset,
        sortBy: req.listParameters.sortBy,
        sortOrder: req.listParameters.sortOrder,
        firstName: req.listParameters.filters.first_name,
        lastName: req.listParameters.filters.last_name,
        group: req.listParameters.filters.group,
        creator: req.listParameters.filters.creator
    }, req.user, returnListData(res, next));
}, formatList);
