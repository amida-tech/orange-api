"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Update Single Patient (PUT /patients/:patientid)", function () {
        // simple endpoint
        var edit = function (data, patientId, accessToken) {
            var headers = auth.genAuthHeaders(accessToken);
            return chakram.put("http://localhost:3000/v1/patients/" + patientId, data, headers);
        };

        // given a patient and user, try and edit the user
        var editPatient = function (modifications, patient) {
            return edit(modifications, patient._id, patient.user.accessToken);
        };

        // helpers to create patients before removing them
        var editAPatient = function (data, modifications) {
            return common.testMyPatient(data).then(curry(editPatient)(modifications));
        };

        common.itRequiresAuthentication(curry(edit)({}));
        common.itRequiresValidPatientId(curry(edit)({}));

        // dry up so we can do the same thing when a patient is shared with us
        it("should test changing group and access permission");

        // validations
        it("allows a valid name", function () {
            return expect(editAPatient({}, { name: "newname" })).to.be.a.patient.success;
        });
        it("rejects a blank name", function () {
            return expect(editAPatient({}, { name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("doesn't require any data", function () {
            return expect(editAPatient({}, {})).to.be.a.patient.success;
        });
        it("rejects a blank sex", function () {
            return expect(editAPatient({}, { sex: "" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("rejects an invalid sex", function () {
            return expect(editAPatient({}, { sex: "foo" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("accepts a valid sex", function () {
            return expect(editAPatient({}, { sex: "male" })).to.be.a.patient.success;
        });
        it("rejects a blank birthdate", function () {
            return expect(editAPatient({}, { birthdate: "" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("rejects an invalid birthdate", function () {
            return expect(editAPatient({}, { birthdate: "foo" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("accepts a valid birthdate", function () {
            return expect(editAPatient({}, { birthdate: "1995-01-01" })).to.be.a.patient.success;
        });
    });
});
