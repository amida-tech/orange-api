"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Show Single Patient (GET /patients/:patientid)", function () {
        // given a patient and user, try and show the user in the frontend
        var showPatient = module.exports.showPatient = function (patient) {
            return common.show(patient._id, patient.user.accessToken);
        };

        // helpers to create patients before showing them
        var showAPatient = module.exports.showAPatient = function (data) {
            return common.testMyPatient(data).then(showPatient);
        };

        common.itRequiresAuthentication(common.show);
        common.itRequiresValidPatientId(common.show);
        common.itRequiresReadAuthorization(curry(showPatient));

        // authorization test
        it("lets me view my patients", function () {
            return expect(showAPatient({})).to.be.a.patient.success;
        });
    });
});
