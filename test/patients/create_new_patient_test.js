"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    fixtures    = require("./fixtures.js"),
    common      = require("./common.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Patients", function () {
    common.beforeEach();
    describe("Create New Patient (POST /patients)", function () {
        // simple endpoint
        var create = function (data, accessToken) {
            return chakram.post("http://localhost:3000/v1/patients", data, auth.genAuthHeaders(accessToken));
        };

        // setup a test user and access token, then create a patient (with the specified
        // data modifications to the factory default) for that user
        var createPatient = function (data) {
            // create full patient data from factory
            return auth.createTestUser().then(function (user) {
                return fixtures.build("Patient", data).then(function (patient) {
                    return create(patient, user.accessToken);
                });
            });
        };

        // check access token authentication
        auth.itRequiresAuthentication(curry(create)({}));

        it("should return a successful response", function () {
            return expect(createPatient({})).to.be.a.patient.createSuccess;
        });

        it("should require a name", function () {
            return expect(createPatient({ name: undefined })).to.be.an.api.error(400, "name_required");
        });

        it("should not accept a blank name", function () {
            return expect(createPatient({ name: "" })).to.be.an.api.error(400, "name_required");
        });
    });
});
