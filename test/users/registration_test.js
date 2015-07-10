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
        it("should return a successful response", function () {
            return expect(register()).to.be.a.user.registerSuccess;
        });

        // require email and password
        it("should require an email", function () {
            return expect(register({ email: undefined })).to.be.an.api.error(400, "email_required");
        });
        it("should not accept a blank email", function () {
            return expect(register({ email: "" })).to.be.an.api.error(400, "email_required");
        });
        it("should not accept a null email", function () {
            return expect(register({ email: null })).to.be.an.api.error(400, "email_required");
        });
        it("should require a password", function () {
            return expect(register({ password: undefined })).to.be.an.api.error(400, "password_required");
        });
        it("should not accept a blank password", function () {
            return expect(register({ password: "" })).to.be.an.api.error(400, "password_required");
        });
        it("should not accept a null password", function () {
            return expect(register({ password: null })).to.be.an.api.error(400, "password_required");
        });
        it("should not require a name", function () {
            return expect(register({ name: undefined })).to.be.a.user.registerSuccess;
        });
        it("should accept a blank name", function () {
            return expect(register({ name: "" })).to.be.a.user.registerSuccess;
        });

        // require valid email
        it("should not accept an invalid email", function () {
            return expect(register({ email: "foobar" })).to.be.an.api.error(400, "invalid_email");
        });

        // duplication
        it("should not allow duplicate email addresses", function () {
            // create existing user then check we can't reregister with same email address
            return fixtures.create("User").then(function (user) {
                return expect(register({email: user.email})).to.be.an.api.error(400, "user_already_exists");
            });
        });

        it("should create a patient for me", function () {
            // auth.genAuthHeaders sends client secret
            var headers = auth.genAuthHeaders(undefined);

            // build but don't save user with full data
            var newUser = fixtures.build("User");
            // register user at endpoint
            var registerUser = function (user) {
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
            });
        });
    });
});
