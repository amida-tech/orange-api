"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

describe("Users", function () {
    describe("Registration Endpoint (POST /user)", function () {
        // the endpoint
        var register = function (data) {
            return fixtures.build("User", data).then(function (user) {
                // auth.genAuthHeaders(undefined) sets X-Client-Secret for us, and doesn't set any
                // access token header
                return chakram.post("http://localhost:3000/v1/user", user, auth.genAuthHeaders(undefined));
            });
        };

        // all valid data
        it("returns a successful response", function () {
            return expect(register()).to.be.a.user.registerSuccess;
        });

        // require email and password
        it("requires an email", function () {
            return expect(register({ email: undefined })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a blank email", function () {
            return expect(register({ email: "" })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a null email", function () {
            return expect(register({ email: null })).to.be.an.api.error(400, "email_required");
        });
        it("requires a password", function () {
            return expect(register({ password: undefined })).to.be.an.api.error(400, "password_required");
        });
        it("rejects a blank password", function () {
            return expect(register({ password: "" })).to.be.an.api.error(400, "password_required");
        });
        it("rejects a null password", function () {
            return expect(register({ password: null })).to.be.an.api.error(400, "password_required");
        });
        it("does not require a first name", function () {
            return expect(register({ first_name: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank first name", function () {
            return expect(register({ first_name: "" })).to.be.a.user.registerSuccess;
        });
        it("does not require a last name", function () {
            return expect(register({ last_name: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank last name", function () {
            return expect(register({ last_name: "" })).to.be.a.user.registerSuccess;
        });
        it("does not require a phone", function () {
            return expect(register({ phone: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank phone", function () {
            return expect(register({ phone: "" })).to.be.a.user.registerSuccess;
        });

        // require valid email
        it("rejects an invalid email", function () {
            return expect(register({ email: "foobar" })).to.be.an.api.error(400, "invalid_email");
        });

        // duplication
        it("does not allow duplicate email addresses", function () {
            // create existing user then check we can't reregister with same email address
            return fixtures.create("User").then(function (user) {
                return expect(register({email: user.email})).to.be.an.api.error(400, "user_already_exists");
            });
        });

        it("creates a patient for me", function () {
            // auth.genAuthHeaders sends client secret
            var headers = auth.genAuthHeaders(undefined);

            // build but don't save user with full data
            var newUser = fixtures.build("User", {
                firstName: "Test",
                lastName: "User",
                phone: "6177140900"
            });
            // register user at endpoint
            var registerUser = function (inst) {
                // camel case keys override
                var user = inst.toObject();
                user.first_name = user.firstName;
                user.last_name = user.lastName;

                return chakram.post("http://localhost:3000/v1/user", user, headers).then(function () {
                    return user;
                });
            };
            // use user credentials to authenticate and get access token
            // need to do this via HTTP rather than using user to avoid duplication errors
            var token = function (user) {
                // auth.genAuthHeaders sends client secret
                return chakram.post("http://localhost:3000/v1/auth/token", user, headers).then(function (resp) {
                    return resp.body.access_token;
                });
            };
            // get list of all patients
            var list = function (accessToken) {
                var authHeaders = auth.genAuthHeaders(accessToken);
                return chakram.get("http://localhost:3000/v1/patients", authHeaders);
            };
            return newUser.then(registerUser).then(token).then(list).then(function (response) {
                // check we have exactly one patient
                expect(response.body.patients.length).to.equal(1);
                // check it has the right name and phone number
                var patient = response.body.patients[0];
                expect(patient.first_name).to.equal("Test");
                expect(patient.last_name).to.equal("User");
                expect(patient.phone).to.equal("6177140900");
            });
        });
    });
});
