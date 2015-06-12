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
            // TODO: refactor
            var getAccessToken = function (user) {
                return user.accessToken;
            };
            // TODO: use the damn factory
            return auth.createTestUser().then(getAccessToken).then(curry(create)(data));
        };

        // check access token authentication
        auth.itRequiresAuthentication(function () { return curry(create)({}); });

        it("should return a successful response", function () {
            it(function () {
                // TODO
                expect(createPatient({})).to.be.an.api.postSuccess;
            });
        });

        it("should be more than a genericSuccess (see TODO above)");

        it("should probably do some more things");
    });
});
