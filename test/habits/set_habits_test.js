"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    curry       = require("curry"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Habits", function () {
    describe("SET Patient Habits (PUT /patients/:patientid/habits)", function () {
        // basic endpoint
        var edit = function (modifications, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/habits", patientId);
            return chakram.put(url, modifications, auth.genAuthHeaders(accessToken));
        };
        // given a patient and user, try and show the patient's habits
        var editHabits = function (modifications, patient) {
            return edit(modifications, patient._id, patient.user.accessToken);
        };

        patients.itRequiresAuthentication(curry(edit)({}));
        patients.itRequiresValidPatientId(curry(edit)({}));
        patients.itRequiresWriteAuthorization(curry(editHabits)({}));

        // patient ID of patient we can access, and access token
        var patientId, accessToken;
        beforeEach(function () {
            return auth.createTestUser().then(patients.createMyPatient({})).then(function (patient) {
                patientId = patient._id;
                accessToken = patient.user.accessToken;
            });
        });

        it("lets the user set time fields to valid times", function () {
            return expect(edit({ dinner: "01:05 pm" }, patientId, accessToken)).to.be.a.habits.success;
        });
        it("doesn't lets the user set time fields to invalid times", function () {
            return expect(edit({ wake: "01:95 pm" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_wake");
        });
        it("doesn't lets the user set time fields to non-time values", function () {
            return expect(edit({ lunch: "foo" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_lunch");
        });
        it("lets the user set time fields to null to reset them", function () {
            return edit({ lunch: null }, patientId, accessToken).then(function (response) {
                expect(response).to.be.a.habits.success;
                expect(response.body.lunch).to.be.null;
            });
        });

        it("lets me set a time zone", function () {
            return expect(edit({ tz: "Europe/London" }, patientId, accessToken)).to.be.a.habits.success;
        });
        it("doesn't let me set an invalid time zone", function () {
            return expect(edit({ tz: "foo/bar" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_tz");
        });
        it("doesn't let me set a null time zone", function () {
            return expect(edit({ tz: null }, patientId, accessToken)).to.be.an.api.error(400, "invalid_tz");
        });
        it("doesn't let me set a blank time zone", function () {
            return expect(edit({ tz: "" }, patientId, accessToken)).to.be.an.api.error(400, "invalid_tz");
        });
    });
});
