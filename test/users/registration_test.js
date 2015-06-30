"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js");
var expect = chakram.expect;

describe("Users", function () {
    describe("Registration Endpoint (POST /user)", function () {
        // the endpoint
        var register = function (data) {
            return fixtures.build("User", data).then(function (user) {
                return chakram.post("http://localhost:3000/v1/user", user);
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
    });
});
