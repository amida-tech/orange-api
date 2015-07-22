"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../../common/auth.js"),
    common      = require("../common.js"),
    patients    = require("../../patients/common.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Cascade Delete Medication", function () {
        // setup a test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // setup test medication
        var medication;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication"
            }).then(function (m) {
                medication = m;
            });
        });

        // setup test dose and journal entry for that medication
        var entryId, doseId;
        before(function () {
            return Q.nbind(patient.createJournalEntry, patient)({
                date: (new Date()).toISOString(),
                text: "example journal entry",
                medication_ids: [medication._id]
            }).then(function (e) {
                entryId = e._id;
            });
        });
        before(function () {
            return Q.nbind(patient.createDose, patient)({
                medication_id: medication._id,
                date: (new Date()).toISOString()
            }).then(function (d) {
                doseId = d._id;
            });
        });

        // functions to try and retrieve that dose and journal entry (to check
        // for their existence)
        var Patient = mongoose.model("Patient");
        var entryExists = function () {
            return Q.npost(Patient, "findOne", [{ _id: patient._id }]).then(function (p) {
                return !!p.entries.filter(function (e) {
                    return e._id === entryId;
                })[0];
            });
        };
        var doseExists = function () {
            return Q.npost(Patient, "findOne", [{ _id: patient._id }]).then(function (p) {
                return !!p.doses.filter(function (d) {
                    return d._id === doseId;
                })[0];
            });
        };

        describe("initially", function () {
            it("has a dose", function () {
                return expect(doseExists()).to.be.true;
            });

            it("has an entry", function () {
                return expect(entryExists()).to.be.true;
            });
        });

        describe("after deleting the medication", function () {
            before(function () {
                return Q.npost(patient, "findMedicationByIdAndDelete", [medication._id]);
            });

            it("has no dose", function () {
                return expect(doseExists()).to.be.false;
            });

            it("has no entry", function () {
                return expect(entryExists()).to.be.false;
            });
        });
    });
});
