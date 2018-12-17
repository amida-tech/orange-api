"use strict";
var chakram         = require("chakram"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    showMedication  = require("../medications/view_medication_test.js").show;

var expect = chakram.expect;

describe("Users", function () {
    describe("Clinician Access", function () {
        // setup a test non-clinician user with
        var user;
        before(function () {
            return auth.createTestUser(undefined, true).then(function (u) {
                user = u;
            });
        });

        // setup a test patient for that user
        var patient;
        before(function () {
            return patients.createMyPatient({}, user).then(function (p) {
                patient = p;
            });
        });

        // setup a test medication owned by the patient
        var medication;
        before(function () {
            var create = Q.nbind(patient.createMedication, patient);
            return create({
                name: "foobar"
            }).then(function (m) {
                medication = m;
            });
        });


        // setup a test clinician user
        var clinician;
        before(function () {
            return auth.createTestUser({
                role: "clinician"
            }).then(function (u) {
                clinician = u;
            });
        });

        it("grants access to the patient", function () {
            return expect(patients.show(patient._id, clinician.accessToken)).to.be.a.patient.success;
        });

        it("grants access to the medication", function () {
            var endpoint = showMedication(medication._id, patient._id, clinician.accessToken);
            return expect(endpoint).to.be.a.medication.viewSuccess;
        });
    });
});
