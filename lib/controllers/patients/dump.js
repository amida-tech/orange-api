"use strict";
var express         = require("express"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js");

const guard = auth.roleGuard;

var dump = module.exports = express.Router({ mergeParams: true });

// View JSON dump of all patient data the user has access to
dump.get("/", auth.authenticate, guard(["admin", "clinician"]), auth.authorize("read"), function (req, res, next) {
    generateDump(req.patient, req.user, req.query.start_date, req.query.end_date, function (err, results) {
        if (err) return next(err);

        results.success = true;
        res.send(results);
    });
});
