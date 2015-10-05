"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js"),
    tokenEp     = require("./common.js").token;
var expect = chakram.expect;

describe("Users", function () {
    describe("Reset Password Endpoint (POST /user/reset_password)", function () {
        // the endpoint
        var reset = function (email) {
            // auth.genAuthHeaders(undefined) sets X-Client-Secret for us, and doesn't set any
            // access token header
            return chakram.post("http://localhost:5000/v1/user/reset_password", {
                email: email
            }, auth.genAuthHeaders(undefined));
        };

        // requires an email address
        it("requires an email", function () {
            return expect(reset(undefined)).to.be.an.api.error(400, "email_required");
        });
        it("rejects a blank email", function () {
            return expect(reset("")).to.be.an.api.error(400, "email_required");
        });
        it("rejects a null email", function () {
            return expect(reset(null)).to.be.an.api.error(400, "email_required");
        });
        it("rejects an email not corresponding to a user", function () {
            return expect(reset("this.email.is@not.a.user.com")).to.be.an.api.error(400, "user_not_found");
        });

        // with a valid email address
        describe("with valid test data", function () {
            // setup a test user and test access token
            var user, token;
            before(function () {
                return fixtures.create("User", {}).then(function (u) {
                    user = u;
                    return u;
                }).then(auth.genAccessToken).then(function (t) {
                    token = t;
                    return t;
                });
            });

            it("should initially let us use that access token", function () {
                var getInfo = chakram.get("http://localhost:5000/v1/user", auth.genAuthHeaders(token));
                return expect(getInfo).to.be.an.api.getSuccess;
            });

            it("should initially let us use that password", function () {
                return expect(tokenEp({
                    email: user.email,
                    password: user.rawPassword
                })).to.be.an.authentication.success;
            });

            it("should give us a successful response", function () {
                return reset(user.email).then(function(resp) {
                    expect(resp).to.be.a.user.resetPasswordSuccess;
                });
            });

            it("should not let us use that access token anymore", function () {
                var getInfo = chakram.get("http://localhost:5000/v1/user", auth.genAuthHeaders(token));
                return expect(getInfo).to.be.an.api.error(401, "invalid_access_token");
            });

            it("should have changed the user's password", function () {
                return expect(tokenEp({
                    email: user.email,
                    password: user.rawPassword
                })).to.be.an.api.error(401, "wrong_email_password");
            });

            // TODO: test this here rather than just testing manually
            xit("should have sent the user an email");
        });
    });
});
