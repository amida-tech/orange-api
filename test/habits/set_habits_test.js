"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    curry       = require("curry"),
    Q           = require("q"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Habits", function () {
    common.beforeEach();
    describe("View Patient Habits (/patients/:patientid/habits)", function () {
        // basic endpoint
        var edit = function (modifications, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/habits", patientId);
            return chakram.put(url, modifications, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user, try and edit the patient's habits with the
        // given modifications
        var editHabits = function (modifications, patient) {
            return edit(modifications, patient._id, patient.user.accessToken);
        };

        // helpers to create patients before editing their habits
        var editOtherPatientHabits = function (access, modifications) {
            return patients.testOtherPatient({}, access).then(curry(editHabits)(modifications));
        };

        patients.itRequiresAuthentication(curry(edit)({}));
        patients.itRequiresValidPatientId(curry(edit)({}));

        it("should not let me edit the habits of a patient shared read-only", function () {
            return expect(editOtherPatientHabits("read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me edit the habits of a patient not shared with me", function () {
            return expect(editOtherPatientHabits("none", {})).to.be.an.api.error(403, "unauthorized");
        });

        describe("with my patient", function () {
            // patient ID of patient we can access, and access token
            var patientId, accessToken;
            beforeEach(function () {
                return auth.createTestUser().then(patients.createMyPatient({})).then(function (patient) {
                    patientId = patient._id;
                    accessToken = patient.user.accessToken;
                });
            });

            it("lets the user set time fields to valid times", function () {
                return expect(edit({ dinner: "13:05" }, patientId, accessToken)).to.be.a.habits.success;
            });
            it("doesn't lets the user set time fields to invalid times", function () {
                return expect(edit({ wake: "13:95" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_wake");
            });
            it("doesn't lets the user set time fields to non-time values", function () {
                return expect(edit({ lunch: "foo" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_lunch");
            });
        });
        describe("with a patient shared read-write", function () {
            // patient ID of patient we can access, and access token
            var patientId, accessToken;
            beforeEach(function () {
                var createMe = auth.createTestUser().then(function (user) {
                    accessToken = user.accessToken;
                    return user;
                });
                var createPatient = patients.createOtherPatient({}, "write");
                return Q.all([createMe, auth.createTestUser()]).spread(createPatient).then(function (patient) {
                    patientId = patient._id;
                    accessToken = patient.user.accessToken;
                });
            });

            it("lets the user set time fields to valid times", function () {
                return expect(edit({ dinner: "13:05" }, patientId, accessToken)).to.be.a.habits.success;
            });
            it("doesn't lets the user set time fields to invalid times", function () {
                return expect(edit({ wake: "13:95" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_wake");
            });
            it("doesn't lets the user set time fields to non-time values", function () {
                return expect(edit({ lunch: "foo" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_lunch");
            });
        });
    });
});
