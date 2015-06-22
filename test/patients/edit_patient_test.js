"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    common.beforeEach();
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
        var editMyPatient = function (data, modifications) {
            return common.testMyPatient(data).then(curry(editPatient)(modifications));
        };
        var editOtherPatient = function (data, access, modifications) {
            return common.testOtherPatient(data, access).then(curry(editPatient)(modifications));
        };

        common.itRequiresAuthentication(curry(edit)({}));
        common.itRequiresValidPatientId(curry(edit)({}));

        it("should not let me edit patients shared read-only", function () {
            return expect(editOtherPatient({}, "read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me edit patients not shared with me", function () {
            return expect(editOtherPatient({}, "none", {})).to.be.an.api.error(403, "unauthorized");
        });

        // dry up so we can do the same thing when a patient is shared with us
        var allowsChangingAccess = function () {
            describe("changing my access", function () {
                // patient ID of patient we can access, and access token
                var patientId, accessToken;
                beforeEach(function () {
                    return auth.createTestUser().then(common.createMyPatient({})).then(function (patient) {
                        patientId = patient._id;
                        accessToken = patient.user.accessToken;
                    });
                });

                // checker functions to check access was actually changed
                var checkWrite = function () {
                    return expect(edit({}, patientId, accessToken)).to.be.a.patient.success;
                };
                var checkWriteFails = function () {
                    return expect(edit({}, patientId, accessToken)).to.be.an.api.error(403, "unauthorized");
                };
                var checkRead = function () {
                    return expect(common.show(patientId, accessToken)).to.be.a.patient.success;
                };
                var checkDeleted = function () {
                    return expect(common.show(patientId, accessToken)).to.be.an.api.error(404, "invalid_patient_id");
                };

                describe("to write", function () {
                    var endpoint;
                    beforeEach(function () { endpoint = edit({ access: "write" }, patientId, accessToken); });

                    it("should be successful", function () { return expect(endpoint).to.be.a.patient.success; });
                    it("should still give me access", function () { return endpoint.then(checkWrite); });
                });

                describe("to read", function () {
                    var endpoint;
                    beforeEach(function () { endpoint = edit({ access: "read" }, patientId, accessToken); });

                    it("should be successful", function () { return expect(endpoint).to.be.a.patient.success; });
                    it("should still give me read access", function () { return endpoint.then(checkRead); });
                    it("should not give write access anymore", function () { return endpoint.then(checkWriteFails); });
                });

                describe("to none", function () {
                    var endpoint;
                    beforeEach(function () { endpoint = edit({ access: "none" }, patientId, accessToken); });

                    it("should be successful", function () { return expect(endpoint).to.be.a.patient.success; });
                    it("should delete the patient", function () { return endpoint.then(checkDeleted); });
                });
            });
        };

        describe("with my patient", function () {
            it("should let me change the name", function () {
                return expect(editMyPatient({}, { name: "newname" })).to.be.a.patient.success;
            });

            allowsChangingAccess();
        });
        describe("with a patient I have write access to", function () {
            it("should let me change the name", function () {
                return expect(editOtherPatient({}, "write", { name: "newname" })).to.be.a.patient.success;
            });
            allowsChangingAccess();
        });
    });
});
