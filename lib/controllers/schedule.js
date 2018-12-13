"use strict";
var express = require("express"),
    auth    = require("./helpers/auth.js"),
    crud    = require("./helpers/crud.js");

const guard = auth.roleGuard;

// view a schedule indicating when the user should take their medication, including
// both the past and the future
// in the past, include a match up to dosing events and various statistics (see API
// documentation for full details)
var router = module.exports = express.Router({ mergeParams: true });

// keys we want to return for each schedule item (each 'event')
var keys = module.exports.keys = ["type", "date", "medication_id", "took_medication", "delay", "dose_id",
                                  "happened", "take_with_food", "take_with_medications", "take_without_medications",
                                  "notification", "scheduled"];

// view a patient's schedule
router.get("/", guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("read"), function (req, res, next) {
    var start = req.query.start_date, end = req.query.end_date, medId = req.query.medication_id;

    req.patient.generateSchedule(start, end, req.user, medId, req.user._id, function (err, result) {
        if (err) return next(err);

        // filter output items
        var schedule = result.schedule.map(function (item) {
            return crud.filter(item, keys);
        });

        res.send({
            schedule: schedule,
            statistics: result.statistics,
            success: true
        });
    });
});
