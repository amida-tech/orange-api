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
                    // explicitly set access_X fields because they're permisisons.X in patient
                    // model so the fixture doesn't handle them
                    var output = patient.toObject();
                    output.access_prime = data.access_prime;
                    output.access_family = data.access_family;
                    output.access_anyone = data.access_anyone;
                    // do the same for first and last name (because they're camelCase internally)
                    output.first_name = patient.first_name;
                    output.last_name = patient.last_name;

                    return create(output, user.accessToken);
                });
            });
        };

        // check access token authentication
        auth.itRequiresAuthentication(curry(create)({}));

        it("should return a successful response", function () {
            return expect(createPatient({})).to.be.a.patient.createSuccess;
        });

        // validation
        it("should require a first name", function () {
            return expect(createPatient({ first_name: undefined })).to.be.an.api.error(400, "first_name_required");
        });
        it("should reject a null first name", function () {
            return expect(createPatient({ first_name: null })).to.be.an.api.error(400, "first_name_required");
        });
        it("should not accept a blank first name", function () {
            return expect(createPatient({ first_name: "" })).to.be.an.api.error(400, "first_name_required");
        });
        it("doesn't require a last name and defaults to blank", function () {
            return createPatient({ last_name: undefined }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.last_name).to.equal("");
            });
        });
        it("accepts a null last name", function () {
            return createPatient({ last_name: null }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.last_name).to.equal("");
            });
        });
        it("accepts a blank last name", function () {
            return createPatient({ last_name: "" }).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.last_name).to.equal("");
            });
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

        it("sets me as the owner", function () {
            return createPatient({}).then(function (response) {
                expect(response).to.be.a.patient.createSuccess;
                expect(response.body.group).to.equal("owner");
            });
        });

        // access levels
        it("lets me set the 'anyone' access level to a valid value", function () {
            return expect(createPatient({
                access_anyone: "read"
            })).to.be.a.patient.createSuccess;
        });
        it("doesn't let me set the 'anyone' access level to null", function () {
            return expect(createPatient({
                access_anyone: null
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("doesn't let me set the 'anyone' access level to blank", function () {
            return expect(createPatient({
                access_anyone: ""
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("doesn't let me set the 'anyone' access level to an invalid value", function () {
            return expect(createPatient({
                access_anyone: "foo"
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("lets me set the 'family' access level to a valid value", function () {
            return expect(createPatient({
                access_family: "read"
            })).to.be.a.patient.createSuccess;
        });
        it("doesn't let me set the 'family' access level to null", function () {
            return expect(createPatient({
                access_family: null
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("doesn't let me set the 'family' access level to blank", function () {
            return expect(createPatient({
                access_family: ""
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("doesn't let me set the 'family' access level to an invalid value", function () {
            return expect(createPatient({
                access_family: "foo"
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("lets me set the 'prime' access level to a valid value", function () {
            return expect(createPatient({
                access_prime: "read"
            })).to.be.a.patient.createSuccess;
        });
        it("doesn't let me set the 'prime' access level to null", function () {
            return expect(createPatient({
                access_prime: null
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
        it("doesn't let me set the 'prime' access level to blank", function () {
            return expect(createPatient({
                access_prime: ""
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
        it("doesn't let me set the 'prime' access level to an invalid value", function () {
            return expect(createPatient({
                access_prime: "foo"
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
    });
});
