"use strict";
var chakram         = require("chakram"),
    curry           = require("curry"),
    mongoose        = require("mongoose"),
    auth            = require("../common/auth.js"),
    closeRequest    = require("./close_request_test.js").closeRequest;

var expect = chakram.expect;

var User = mongoose.model("User");

describe("Requests", function () {
    describe("Bulk Creating a New Request as a programAdministrator", function () {
        // make a new request
        var create = module.exports.create = function (data, accessToken) {
            return chakram.post("http://localhost:5000/v1/requested/bulkclinicianrequest", data, auth.genAuthHeaders(accessToken));
        };

        // check it requires authentication
        auth.itRequiresAuthentication(curry(create)({}));
        // TODO GAO test that only programAdministrator can use this

        describe("with test data", function () {
            // setup two users to test with (beforeEach so we can play around with requests)
            var programAdmin, clinicianUsers = [], patientUser;
            before(function () {
                return auth.createTestUser({
                    role: "programAdministrator"
                }).then(function (u) {
                    programAdmin = u;
                });
            });
            before(function () {
                var createUserPromises = [];
                /*eslint-disable no-loop-func */
                for (var i = 0; i < 30; i++) {
                    var createUser = auth.createTestUser({
                        role: "clinician"
                    }).then(function (u) {
                        clinicianUsers.push(u);
                    });
                    createUserPromises.push(createUser);
                }
                /*eslint-enable no-loop-func */
                return Promise.all(createUserPromises);
            });
            before(function () {
                return auth.createTestUser(undefined, true).then(function (u) {
                    patientUser = u;
                });
            });

            // TODO GAO test more than just the successful condition
            it("executes successfully when called correctly", function () {
                return create({
                    patientEmail: patientUser.email,
                    clinicianEmails: clinicianUsers.map(c => c.email)
                }, programAdmin.accessToken).then((response) => {
                    expect(response).to.have.status(200);
                    return User.findOne({ email: patientUser.email }).exec().then((updatedPatientUser) => {
                        expect(updatedPatientUser.requests.length).to.equal(30);

                        const requestEmails = updatedPatientUser.requests.map(r => r.email);
                        const clinicianEmails = clinicianUsers.map(c => c.email);

                        requestEmails.forEach((r) => {
                            expect(clinicianEmails.includes(r)).to.equal(true);
                        });

                        clinicianEmails.forEach((r) => {
                            expect(requestEmails.includes(r)).to.equal(true);
                        });
                    });
                });
            });
        });
    });
});
