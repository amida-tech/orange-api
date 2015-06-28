"use strict";
var chakram     = require("chakram"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Show Single Patient (GET /patients/:patientid)", function () {
        // given a patient and user, try and show the user in the frontend
        var showPatient = function (patient) {
            return common.show(patient._id, patient.user.accessToken);
        };

        // helpers to create patients before showing them
        var showMyPatient = module.exports.showMyPatient = function (data) {
            return common.testMyPatient(data).then(showPatient);
        };
        var showOtherPatient = function (data, access) {
            return common.testOtherPatient(data, access).then(showPatient);
        };

        common.itRequiresAuthentication(common.show);
        common.itRequiresValidPatientId(common.show);

        // authorization test
        it("should let me view my patients", function () {
            return expect(showMyPatient({})).to.be.a.patient.success;
        });
        it("should let me view patients shared read-only", function () {
            return expect(showOtherPatient({}, "read")).to.be.a.patient.success;
        });
        it("should let me view patients shared read-write", function () {
            return expect(showOtherPatient({}, "write")).to.be.a.patient.success;
        });
        it("should not let me view patients not shared with me", function () {
            return expect(showOtherPatient({}, "none")).to.be.an.api.error(403, "unauthorized");
        });
    });
});
