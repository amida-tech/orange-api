"use strict";
var express = require("express");
var habits = module.exports = express();
var errors = require("../errors.js").ERRORS;

// Fields we want to output in JSON responses
var keys = ["wake", "sleep", "breakfast", "lunch", "dinner"];

// CRUD helpers
var crud = require("./helpers/crud.js");
var filterInput = crud.filterInputGenerator(keys),
    returnData = crud.returnData,
    formatObject = crud.formatObjectGenerator(keys, true)(200);

habits.get("/", function (req, res, next) {
    res.data = req.patient.habits;
    next();
}, formatObject);

habits.put("/", filterInput, function (req, res, next) {
    // middleware assures us we have read access to the patient, but here we need
    // to specifically check for write access
    if (req.patient.access !== 'write') return next(errors.UNAUTHORIZED);

    req.patient.updateHabits(req.data, returnData(res, next));
}, formatObject);
