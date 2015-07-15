"use strict";
var express     = require("express"),
    async       = require("async"),
    auth        = require("../helpers/auth.js"),
    crud        = require("../helpers/crud.js"),
    journal     = require("../journal.js"),
    doctors     = require("../doctors.js"),
    pharmacies  = require("../pharmacies.js"),
    medications = require("../medications.js"),
    doses       = require("../doses.js"),
    shared      = require("./shared.js"),
    core        = require("./core.js");

var dump = module.exports = express.Router({ mergeParams: true });

// View JSON dump of all patient data the user has access to
dump.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // add patient data
    var data = crud.filter(req.patient, core.keys);
    data.id = req.patient._id;

    // add patient habits
    data.habits = req.patient.habits;

    // add list of patient's journal entries, showing only those for which the user
    // has read access to all reference medications
    data.entries = req.patient.entries.filter(function (entry) {
        return entry.medicationIds.every(function (medId) {
            var med = req.patient.medications.id(medId);
            return med.authorize("read", req.user, req.patient) === null;
        });
    }).map(function (entry) {
        var output = crud.filter(entry.getData(req.patient), journal.keys);
        output.id = entry._id;
        return output;
    });

    // add list of patient's doctors
    data.doctors = req.patient.doctors.map(function (doctor) {
        var output = crud.filter(doctor.getData(req.patient), doctors.keys);
        output.id = doctor._id;
        return output;
    });

    // add list of patient's pharmacies
    data.pharmacies = req.patient.pharmacies.map(function (pharmacy) {
        var output = crud.filter(pharmacy.getData(req.patient), pharmacies.keys);
        output.id = pharmacy._id;
        return output;
    });

    // add list of patient's medications, showing only those for which the user has
    // access
    data.medications = req.patient.medications.filter(function (medication) {
        return medication.authorize("read", req.user, req.patient) === null;
    }).map(function (medication) {
        var output = crud.filter(medication.getData(req.patient), medications.keys);
        output.id = medication._id;
        return output;
    });

    // add list of patient's doses, showing only those for which the user has access
    // to the corresponding medication
    data.doses = req.patient.doses.filter(function (dose) {
        var med = req.patient.medications.id(dose.medicationId);
        return med.authorize("read", req.user, req.patient) === null;
    }).map(function (dose) {
        var output = crud.filter(dose.getData(req.patient), doses.keys);
        output.id = dose._id;
        return output;
    });


    // add list of patient's shares
    var addShares = function (results, done) {
        async.map(req.patient.shares, function (share, callback) {
            // format for API output
            share.format(function (err, output) {
                if (err) return callback(err);

                // filter keys and add ID
                output = crud.filter(output, shared.keys);
                output.id = share._id;
                callback(null, output);
            });
        }, function (err, shares) {
            if (err) return done(err);

            results.shares = shares;
            done(null, results);
        });
    };

    async.seq(addShares)(data, function (err, results) {
        if (err) return next(err);

        results.success = true;
        res.send(results);
    });
});
