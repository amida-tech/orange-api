"use strict";
var async       = require("async"),
    journal     = require("../journal.js"),
    doctors     = require("../doctors.js"),
    pharmacies  = require("../pharmacies.js"),
    medications = require("../medications.js"),
    doses       = require("../doses.js"),
    crud        = require("./crud.js"),
    shared      = require("../patients/shared.js"),
    core        = require("../patients/core.js");

module.exports = function (patient, user, next) {
    // add patient data
    var data = crud.filter(patient, core.keys);
    data.id = patient._id;

    // add patient habits
    data.habits = patient.habits;

    // add list of patient's journal entries, showing only those for which the user
    // has read access to all reference medications
    data.entries = patient.entries.filter(function (entry) {
        return entry.medicationIds.every(function (medId) {
            var med = patient.medications.id(medId);
            return med.authorize("read", user, patient) === null;
        });
    }).map(function (entry) {
        var output = crud.filter(entry.getData(patient), journal.keys);
        output.id = entry._id;
        return output;
    });

    // add list of patient's doctors
    data.doctors = patient.doctors.map(function (doctor) {
        var output = crud.filter(doctor.getData(patient), doctors.keys);
        output.id = doctor._id;
        return output;
    });

    // add list of patient's pharmacies
    data.pharmacies = patient.pharmacies.map(function (pharmacy) {
        var output = crud.filter(pharmacy.getData(patient), pharmacies.keys);
        output.id = pharmacy._id;
        return output;
    });

    // add list of patient's medications, showing only those for which the user has
    // access
    data.medications = patient.medications.filter(function (medication) {
        return medication.authorize("read", user, patient) === null;
    }).map(function (medication) {
        var output = crud.filter(medication.getData(patient), medications.keys);
        output.id = medication._id;
        return output;
    });

    // add list of patient's doses, showing only those for which the user has access
    // to the corresponding medication
    data.doses = patient.doses.filter(function (dose) {
        var med = patient.medications.id(dose.medicationId);
        return med.authorize("read", user, patient) === null;
    }).map(function (dose) {
        var output = crud.filter(dose.getData(patient), doses.keys);
        output.id = dose._id;
        return output;
    });

    // add list of patient's shares
    var addShares = function (results, done) {
        async.map(patient.shares, function (share, callback) {
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

    async.seq(addShares)(data, next);
};
