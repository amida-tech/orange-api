"use strict";
var express = require("express"),
    moment  = require("moment"),
    crud    = require("./helpers/crud.js"),
    errors  = require("../errors.js").ERRORS;

// a getter function to get the zerorpc client is passed in
module.exports = function (zerorpc) {
    // view a schedule indicating when the user should take their medication, including
    // both the past and the future
    // in the past, include a match up to dosing events and various statistics (see API
    // documentation for full details)
    var controller = express();

    // keys we want to return for each schedule item (each 'event')
    var keys = ["type", "date", "medication_id", "took_medication", "delay", "dose_id"];

    // helper function to calculate mean average from an array of numbers
    var mean = function (nums) {
        var sum = nums.reduce(function (total, num) {
            return total + num;
        });
        return sum / nums.length;
    };

    // view a patient's schedule
    controller.get("/", function (req, res, next) {
        // parse medication_id
        var medicationId = req.query.medication_id;
        if (typeof medicationId === "undefined" || medicationId.length === 0) medicationId = null;

        // ScheduleGenerator handles start and end date validation for us, but we set defaults
        var start = req.query.start_date, end = req.query.end_date;
        // find today in the user's timezone
        var today = moment.tz(req.patient.habits.tz);
        // note that dates specified by the user are strings (which ScheduleGenerator parses), but
        // we default to moment objects (which ScheduleGenerator leaves alone)
        if (typeof start !== "string" || start.length === 0) start = today; // default to today
        if (typeof end !== "string" || end.length === 0) end = moment(today).add(6, "days"); // one week later

        // a list of medications we should generate the schedule for, defaulting to all
        var medications = req.patient.medications;

        // if an individual medication has been specified to generate for, check that exists and belongs
        // to this patient, and then use that
        if (medicationId !== null) {
            var medication = req.patient.medications.id(medicationId);
            if (typeof medication === "undefined" || medication === null)
                return next(errors.INVALID_RESOURCE_MEDICATION_ID);
            medications = [medication];
        }

        // generate schedule events
        var schedule = [];
        medications.forEach(function (medication) {
            // generate schedule for when to take medication
            var events = medication.generateSchedule(start, end, req.patient.habits);

            // add medication ID to each event
            events = events.map(function (item) {
                item.medication_id = medication._id;
                return item;
            });

            // TODO: include dose/schedule matcher
            // for now, we just assume the user didn't take their medication
            events = events.map(function (item) {
                item.took_medication = false;
                return item;
            });
            // TODO: use ScheduleMatcher as below
            // zerorpc getter may not be initialised at first so we call the getter here
            // var sm = new ScheduleMatcher(zerorpc());
            // sm.match([5, 7, 15, 17, 25, 27, 35, 37], [8, 9, 12, 16, 28, 34, 36], callback);

            // add to schedule
            schedule = schedule.concat(events);
        });

        // make sure we're only outputting what we're expecting
        schedule = schedule.map(function (item) {
            return crud.filter(item, keys);
        });

        // order schedule
        schedule = schedule.sort(function (itemA, itemB) {
            var timeA = moment(itemA.date);
            var timeB = moment(itemB.date);

            if (timeA.isBefore(timeB)) return -1;
            else if (timeB.isBefore(timeA)) return 1;
            else return 0;
        });

        // generate schedule statistics
        var statistics = {};
        var medEvents = schedule.filter(function (item) {
            return item.took_medication;
        });

        // if the patient didn't take any meds, we can't generate any stats
        if (medEvents.length === 0) {
            statistics.took_medication = null;
            statistics.delay = null;
            statistics.delta = null;
        } else {
            // calculate percentage of events for which the patient took their meds
            statistics.took_medication = 100 * medEvents.length / schedule.length;

            // calculate mean and absolute value of mean of all delays
            var delays = medEvents.map(function (item) {
                return item.delay;
            });
            var absDelays = delays.map(function (delay) {
                return Math.abs(delay);
            });
            statistics.delay = mean(delays);
            statistics.delta = mean(absDelays);
        }

        // send output
        res.send({
            schedule: schedule,
            statistics: statistics,
            // errors are bubbled up the chain, so at this point we can assume
            // a successful response
            success: true
        });
    });

    return controller;
};
