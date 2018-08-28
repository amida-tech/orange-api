"use strict";
var express = require("express");

var patients = module.exports = express.Router({ mergeParams: true });

// mount different patient endpoints
patients.use("/:patientid/avatar(.\\w+)?", require("./avatar.js"));
patients.use("/:patientid/base64Avatar(.\\w+)?", require("./avatar.js"));
patients.use("/:patientid/shares", require("./shared.js"));
patients.use("/:patientid.json", require("./dump.js"));
patients.use("/:patientid.pdf", require("./report.js"));
// must be last in the list so it doens't override the other patterns
patients.use(require("./core.js"));
