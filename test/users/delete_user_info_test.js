"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    common      = require("./common.js"),
    auth        = require("../common/auth.js"),
    tokenEndpoint   = require("./common.js").token;

var expect = chakram.expect;

describe("Users", function () {
    common.beforeEach();
    describe("Delete User (DELETE /user)", function () {
        // simple endpoint
        var remove = function (accessToken) {
            return chakram.delete("http://localhost:3000/v1/user", {}, auth.genAuthHeaders(accessToken));
        };
        // create a user with the specified data modifications (to the factory default), generate
        // an access token and then use that token to delete the user
        // also store token and user
        var token, user;
        var removeUser = function (data) {
            return fixtures.create("User", data).then(function (u) {
                user = u;
                return u;
            }).then(auth.genAccessToken).then(function (t) {
                token = t;
                return t;
            }).then(remove);
        };

        // check access token authentication
        auth.itRequiresAuthentication(remove);

        describe("with a valid user", function () {
            var request;
            beforeEach(function () {
                request = removeUser({});
            });

            it("should return a successful response", function () {
                return expect(request).to.be.a.user.success;
            });

            it("should invalidate our access token", function () {
                return request.then(auth.checkTokenFails(token));
            });

            it("should not let us get another access token", function () {
                return request.then(function () {
                    return expect(tokenEndpoint({
                        email: user.email,
                        password: user.rawPassword
                    })).to.be.an.api.error(401, "wrong_email_password");
                });
            });
        });
    });
});
