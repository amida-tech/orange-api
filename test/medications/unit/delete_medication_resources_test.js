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
    describe("Cascade Delete Medication Resources", function () {
        // setup a test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // setup a test doctors and pharmacy
        var doctor, pharmacy;
        before(function () {
            return Q.nbind(patient.createDoctor, patient)({
                name: "test doctor"
            }).then(function (d) {
                doctor = d;
            });
        });
        before(function () {
            return Q.nbind(patient.createPharmacy, patient)({
                name: "test pharmacy"
            }).then(function (p) {
                pharmacy = p;
            });
        });

        // setup test medication for that doctor and pharmacy
        var medId;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication",
                doctor_id: doctor._id,
                pharmacy_id: pharmacy._id
            }).then(function (m) {
                medId = m._id;
            });
        });

        // function to retrieve med (for checking presence of various fields
        // after deleting other resources)
        var Patient = mongoose.model("Patient");
        var medication = function () {
            return Q.npost(Patient, "findOne", [{ _id: patient._id }]).then(function (p) {
                return p.medications.filter(function (m) {
                    return m._id === medId;
                })[0];
            });
        };

        describe("initially", function () {
            it("has a doctor ID", function () {
                return medication().then(function (med) {
                    expect(med.doctorId).to.equal(doctor._id);
                });
            });

            it("has a pharmacy ID", function () {
                return medication().then(function (med) {
                    expect(med.pharmacyId).to.equal(pharmacy._id);
                });
            });
        });

        describe("after deleting all child resources", function () {
            before(function () {
                return Q.npost(patient, "findDoctorByIdAndDelete", [doctor._id]);
            });
            before(function () {
                return Q.npost(patient, "findPharmacyByIdAndDelete", [pharmacy._id]);
            });

            it("has null doctor ID", function () {
                return medication().then(function (med) {
                    expect(med.doctorId).to.be.null;
                });
            });

            it("has null pharmacy ID", function () {
                return medication().then(function (med) {
                    expect(med.pharmacyId).to.be.null;
                });
            });
        });
    });
});
