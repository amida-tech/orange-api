"use strict";
var express = require("express");
var habits = module.exports = express();
var errors = require("../errors.js").ERRORS;

// Fields we want to output in JSON responses
var keys = ["wake", "sleep", "breakfast", "lunch", "dinner"];

// CRUD helpers
var crud = require("./helpers/crud.js");
var filterInput = crud.filterInputGenerator(keys),
    formatObject = crud.formatObjectGenerator(keys)(200);


habits.get("/", function (req, res, next) {
    res.data = req.patient.habits;
    console.log(res.data);
    next();
}, formatObject);
