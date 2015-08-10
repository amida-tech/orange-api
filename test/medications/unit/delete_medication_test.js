"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
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

        // setup a test doctor and pharmacy
        var doctorId, pharmacyId;
        before(function () {
            return Q.nbind(patient.createDoctor, patient)({
                name: "test doctor"
            }).then(function (d) {
                doctorId = d._id;
            });
        });
        before(function () {
            return Q.nbind(patient.createPharmacy, patient)({
                name: "test pharmacy"
            }).then(function (p) {
                pharmacyId = p._id;
            });
        });

        // setup test medication for that doctor and pharmacy
        var medication;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication",
                doctorId: doctorId,
                pharmacyId: pharmacyId
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
                date: (new Date()).toISOString(),
                taken: true
            }).then(function (d) {
                doseId = d._id;
            });
        });

        // functions to try and retrieve that pharmacy, doctor, dose and journal entry
        // and check for their existence
        var Patient = mongoose.model("Patient");
        var resourceExists = function (collectionName, wantedId) {
            return Q.npost(Patient, "findOne", [{ _id: patient._id }]).then(function (p) {
                return !!p[collectionName].filter(function (e) {
                    return e._id === wantedId;
                })[0];
            });
        };
        var entryExists = function () {
            return resourceExists("entries", entryId);
        };
        var doseExists = function () {
            return resourceExists("doses", doseId);
        };
        var doctorExists = function () {
            return resourceExists("doctors", doctorId);
        };
        var pharmacyExists = function () {
            return resourceExists("pharmacies", pharmacyId);
        };


        describe("initially", function () {
            it("has a dose", function () {
                return expect(doseExists()).to.be.true;
            });

            it("has an entry", function () {
                return expect(entryExists()).to.be.true;
            });

            it("has a doctor", function () {
                return expect(doctorExists()).to.be.true;
            });

            it("has a pharmacy", function () {
                return expect(pharmacyExists()).to.be.true;
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

            it("has a doctor", function () {
                return expect(doctorExists()).to.be.true;
            });

            it("has a pharmacy", function () {
                return expect(pharmacyExists()).to.be.true;
            });
        });
    });
});
