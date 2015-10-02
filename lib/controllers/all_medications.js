"use strict";
var express     = require("express"),
    async       = require("async"),
    mongoose    = require("mongoose"),
    crud        = require("./helpers/crud.js"),
    list        = require("./helpers/list.js"),
    medications = require("./medications.js"),
    sKeys       = require("./schedule.js").keys,
    listQuery   = require("../models/helpers/list.js").query;

var Patient = mongoose.model("Patient");
var Medication = mongoose.model("Medication");

var router = module.exports = express.Router({
    mergeParams: true
});

// Helpers to DRY up CRUD controllers: see helpers/crud.js
var formatList = crud.formatListGenerator(medications.keys.concat(["patient_id"]), "medications"),
    returnListData = crud.returnListData;

// View a listing of all medications for all patients the user has access to
var paramParser = list.parseListParameters(["id", "name"], ["name"]);
router.get("/medications", paramParser, function(req, res, next) {
    // find all patients the user has access to
    Patient.findForUser({}, req.user, function (err, patients) {
        if (err) return next(err);

        // store patients in response object so we can use them in the next
        // middleware for calling getData on medications
        res.patients = {};
        patients.forEach(function (patient) {
            res.patients[patient._id] = patient;
        });

        // map over all user's patients, find all their medications the user has access to
        // and concatenate the results
        var medications = patients.reduce(function (meds, patient) {
            // authorize at patient level
            if (patient.authorize(req.user, "read") !== null) return meds;

            return meds.concat(patient.medications.filter(function (medication) {
                // authorize at med level
                return medication.authorize("read", req.user, patient) === null;
            }).map(function (medication) {
                // include patient ID for patient med belongs to
                medication.patientId = patient._id;
                return medication;
            }));
        }, []);

        // filter, sort and limit medication list by parameters sent
        // patient is not one fixed value, but we don't need to pass it to list.query as it's only
        // sent to a default filter, which we're not specifying here (default filters are normally
        // used to list an individual patient's medication: they filter to only show medications the
        // user has access to, but we're doing that manully above)
        // see lib/models/patient/resources.js
        return listQuery(medications, req.listParameters, Medication, {}, {}, req.user, null,
                         returnListData(res, next));
    });
}, function (req, res, next) {
    // call getData on each medication with the relevant patient
    // formatList normally does this automatically using req.patient, but req.patient isn't set here
    // (and medications belong to different patients anyway)
    var patient;
    res.data = res.data.map(function (medication) {
        patient = res.patients[medication.patientId];
        if (typeof patient === "undefined" || patient === null) patient = { tz: "Etc/UTC" };
        return medication.getData(patient);
    });
    next();
}, formatList);

// View a schedule for all medications for all patients the user has access to
router.get("/schedule", function (req, res, next) {
    var start = req.query.start_date, end = req.query.end_date;

    // find all patients the user has access to
    Patient.findForUser({}, req.user, function (err, patients) {
        if (err) return next(err);

        // map over all user's patients, generate a schedule for them,
        // and combine the results
        return async.concat(patients, function (patient, callback) {
            return patient.generateScheduleResults(start, end, req.user, null, req.user._id, function (err, items) {
                if (err) return callback(err);

                // add patient ID
                // iterate over medications
                items = items.map(function (medItems) {
                    // iterate over schedule items
                    return medItems.map(function (item) {
                        item.patient_id = patient._id;
                        return item;
                    });
                });
                return callback(null, items);
            });
        }, function (err, items) {
            if (err) return next(err);

            // calculate schedule statistics
            Patient.formatSchedule(items, function (err, result) {
                if (err) return next(err);

                // filter output items
                var schedule = result.schedule.map(function (item) {
                    return crud.filter(item, sKeys.concat(["patient_id"]));
                });

                res.send({
                    schedule: schedule,
                    statistics: result.statistics,
                    success: true
                });
            });
        });
    });
});
