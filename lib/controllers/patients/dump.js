"use strict";
var express         = require("express"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js");

var dump = module.exports = express.Router({ mergeParams: true });

// View JSON dump of all patient data the user has access to
dump.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    generateDump(req.patient, req.user, true, function (err, results) {
        if (err) return next(err);

        results.success = true;
        res.send(results);
    });
});
