"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Habits", function () {
    describe("View Patient Habits (/patients/:patientid/habits)", function () {
        // basic endpoint
        var show = function (patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/habits", patientId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user, try and show the patient's habits
        var showHabits = function (patient) {
            return show(patient._id, patient.user.accessToken);
        };

        // helpers to create patients before showing their habits
        var showPatientHabits = function () {
            return patients.testMyPatient({}).then(showHabits);
        };

        patients.itRequiresAuthentication(show);
        patients.itRequiresValidPatientId(show);
        patients.itRequiresReadAuthorization(showHabits);

        it("lets me view my patient's habits", function () {
            return expect(showPatientHabits()).to.be.a.habits.success;
        });
    });
});
