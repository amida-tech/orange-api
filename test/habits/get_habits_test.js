"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Habits", function () {
    common.beforeEach();
    describe("View Patient Habits (/patients/:patientid/habits)", function () {
        // basic endpoint
        var show = function (patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/habits", patientId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user, try and show the patient's habits
        var showHabits = function (patient) {
            return show(patient._id, patient.user.accessToken);
        };

        // helpers to create patients before showing their habits
        var showMyPatientHabits = function () {
            return patients.testMyPatient({}).then(showHabits);
        };
        var showOtherPatientHabits = function (access) {
            return patients.testOtherPatient({}, access).then(showHabits);
        };

        patients.itRequiresAuthentication(show);
        patients.itRequiresValidPatientId(show);

        it("should let me view my patient's habits", function () {
            return expect(showMyPatientHabits()).to.be.a.habits.success;
        });
        it("should let me view the habits of a patient shared read-only", function () {
            return expect(showOtherPatientHabits("read")).to.be.a.habits.success;
        });
        it("should let me view the habits of a patient shared read-write", function () {
            return expect(showOtherPatientHabits("write")).to.be.a.habits.success;
        });
        it("should not let me view the habits of a patient not shared with me", function () {
            return expect(showOtherPatientHabits("none")).to.be.an.api.error(403, "unauthorized");
        });
    });
});
