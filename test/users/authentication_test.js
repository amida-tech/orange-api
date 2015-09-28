"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js"),
    token       = require("./common.js").token;
var expect = chakram.expect;

describe("Users", function () {
    describe("Retrieve Authentication Token (POST /auth/token)", function () {
        // valid user to try testing with: beforeEach to avoid lock out errors
        var user;
        beforeEach(function () {
            return fixtures.create("User").then(function (u) {
                user = u;
            });
        });

        // require email and password
        it("requires an email", function () {
            return expect(token({ password: user.rawPassword })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a blank email", function () {
            return expect(token({ email: "", password: user.rawPassword })).to.be.an.api.error(400, "email_required");
        });
        it("requires a password", function () {
            return expect(token({ email: user.email })).to.be.an.api.error(400, "password_required");
        });
        it("rejects a blank password", function () {
            return expect(token({ email: user.email, password: "" })).to.be.an.api.error(400, "password_required");
        });

        describe("with the right credentials", function () {
            it("returns a working access token", function () {
                var request = token({ email: user.email, password: user.rawPassword });
                return expect(request).to.be.an.authentication.success.then(function (response) {
                    // verify it authenticates us to GET /user
                    var accessToken = response.body.access_token;
                    var getInfo = chakram.get("http://localhost:5000/v1/user", auth.genAuthHeaders(accessToken));
                    return expect(getInfo).to.be.an.api.getSuccess;
                });
            });
        });

        // require valid credentials
        it("rejects the wrong email", function () {
            var request = token({ email: user.email + "a", password: user.rawPassword });
            return expect(request).to.be.an.api.error(401, "wrong_email_password");
        });
        it("rejects the hashed password", function () {
            var request = token({ email: user.email, password: user.password });
            return expect(request).to.be.an.api.error(401, "wrong_email_password");
        });
        describe("with the wrong password", function () {
            it("returns an error", function () {
                var request = token({ email: user.email, password: user.rawPassword + "a" });
                return expect(request).to.be.an.api.error(401, "wrong_email_password");
            });

            // this functionality is fully tested in unit/account_locking_test.js
            it("eventually lock us out", function () {
                // generate promises to try and fail authentication
                var promises = [];
                for (var i = 0; i < 25; i++) {
                    /*eslint-disable no-loop-func */
                    var promise = function () {
                        return token({ email: user.email, password: user.rawPassword + "a" });
                    };
                    /*eslint-enable no-loop-func */
                    promises.push(promise);
                }

                // run sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q()).then(function (response) {
                    // check we've been logged out
                    expect(response).to.be.an.api.error(403, "login_attempts_exceeded");
                });
            });
        });
    });
});
