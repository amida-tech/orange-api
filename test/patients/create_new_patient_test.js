"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Patients", function () {
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

        // validation
        it("should require a name", function () {
            return expect(createPatient({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("should not accept a blank name", function () {
            return expect(createPatient({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("doesn't require a sex and defaults to unspecified", function () {
            return createPatient({ sex: undefined }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.sex).to.equal("unspecified");
            });
        });
        it("allows a null sex and changes it to unspecified", function () {
            return createPatient({ sex: null }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.sex).to.equal("unspecified");
            });
        });
        it("rejects a blank sex", function () {
            return expect(createPatient({ sex: "" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("rejects an invalid sex", function () {
            return expect(createPatient({ sex: "foo" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("accepts a valid sex", function () {
            return expect(createPatient({ sex: "male" })).to.be.a.patient.createSuccess;
        });
        it("doesn't require a birthdate and defaults to null", function () {
            return createPatient({ birthdate: undefined }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.birthdate).to.equal(null);
            });
        });
        it("allows a null birthdate and leaves it as null", function () {
            return createPatient({ birthdate: null }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.birthdate).to.equal(null);
            });
        });
        it("rejects a blank birthdate", function () {
            return expect(createPatient({ birthdate: "" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("rejects an invalid birthdate", function () {
            return expect(createPatient({ birthdate: "foo" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("accepts a valid birthdate", function () {
            return expect(createPatient({ birthdate: "1995-01-01" })).to.be.a.patient.createSuccess;
        });
    });
});
