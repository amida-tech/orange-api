"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

const guard = auth.roleGuard;

var habits = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses
var keys = ["wake", "sleep", "breakfast", "lunch", "dinner", "tz"];
var filterInput = crud.filterInputGenerator(keys),
    returnData = crud.returnData,
    formatObject = crud.formatObjectGenerator(keys, true)(200);

// view a patient's habits (wake up time, lunch time, etc)
habits.get("/", guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("read"), function (req, res, next) {
    // store habits data in res.data for formatObject to access
    res.data = req.patient.habits;
    next();
}, formatObject);

// edit a patient's habits (requires write access)
habits.put("/", guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.updateHabits(req.data, returnData(res, next));
}, formatObject);
