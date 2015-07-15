"use strict";
var chakram         = require("chakram"),
    curry           = require("curry"),
    fixtures        = require("./fixtures.js"),
    auth            = require("../common/auth.js"),
    tokenEndpoint   = require("./common.js").token;

var expect = chakram.expect;

describe("Users", function () {
    describe("EDIT User Info (PUT /user)", function () {
        // simple endpoint
        var update = function (modifications, accessToken) {
            return chakram.put("http://localhost:3000/v1/user", modifications, auth.genAuthHeaders(accessToken));
        };

        // create a user with the specified data modifications (to the factory default), generate
        // an access token and then use that token to edit the user with the specified modifications
        var token, user, credentials;
        var updateUser = function (data, modifications) {
            var updateWithMods = curry(update)(modifications);
            // also store access token so we can check if it's revoked later
            // and user so we can try authentication
            return fixtures.create("User", data).then(function (u) {
                user = u;
                credentials = {
                    email: user.email,
                    password: user.rawPassword
                };
                return user;
            }).then(auth.genAccessToken).then(function (t) {
                token = t;
                return token;
            }).then(updateWithMods);
        };

        // check access token authentication
        auth.itRequiresAuthentication(curry(update)({}));

        describe("changing first_name", function () {
            var request;
            beforeEach(function () {
                request = updateUser({}, { first_name: "newname" });
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("does not revoke our access tokens", function () {
                return request.then(auth.checkTokenWorks(token));
            });
            it("still lets us authenticate", function () {
                return request.then(function () {
                    return expect(tokenEndpoint(credentials)).to.be.an.api.postSuccess;
                });
            });

            it("allows a null first_name", function () {
                return updateUser({}, { first_name: null }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.first_name).to.equal("");
                });
            });
            it("allows a blank first_name", function () {
                return updateUser({}, { first_name: "" }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.first_name).to.equal("");
                });
            });
        });

        describe("changing last_name", function () {
            var request;
            beforeEach(function () {
                request = updateUser({}, { last_name: "newname" });
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("does not revoke our access tokens", function () {
                return request.then(auth.checkTokenWorks(token));
            });
            it("stills let us authenticate", function () {
                return request.then(function () {
                    return expect(tokenEndpoint(credentials)).to.be.an.api.postSuccess;
                });
            });

            it("allows a null last_name", function () {
                return updateUser({}, { last_name: null }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.last_name).to.equal("");
                });
            });
            it("allows a blank last_name", function () {
                return updateUser({}, { last_name: "" }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.last_name).to.equal("");
                });
            });
        });

        describe("changing phone", function () {
            var request;
            beforeEach(function () {
                request = updateUser({}, { phone: "1231231212" });
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("does not revoke our access tokens", function () {
                return request.then(auth.checkTokenWorks(token));
            });
            it("stills let us authenticate", function () {
                return request.then(function () {
                    return expect(tokenEndpoint(credentials)).to.be.an.api.postSuccess;
                });
            });

            it("allows a null phone", function () {
                return updateUser({}, { phone: null }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.phone).to.equal("");
                });
            });
            it("allows a blank phone", function () {
                return updateUser({}, { phone: "" }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.phone).to.equal("");
                });
            });
        });


        describe("changing password", function () {
            var request, oldCredentials, newCredentials;
            beforeEach(function () {
                request = updateUser({}, { password: "newpassword" });
                oldCredentials = {
                    email: user.email,
                    password: user.rawPassword
                };
                newCredentials = {
                    email: user.email,
                    password: "newpassword"
                };
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("revokes our access tokens", function () {
                return request.then(auth.checkTokenFails(token));
            });
            it("does not let us authenticate with the old password", function () {
                return request.then(function () {
                    return expect(tokenEndpoint(oldCredentials)).to.be.an.api.error(401, "wrong_email_password");
                });
            });
            it("lets us authenticate with the new password", function () {
                return request.then(function () {
                    return expect(tokenEndpoint(newCredentials)).to.be.an.api.postSuccess;
                });
            });
            it("does not allow a null password", function () {
                return expect(updateUser({}, { password: null })).to.be.an.api.error(400, "password_required");
            });
            it("does not allow an empty password", function () {
                return expect(updateUser({}, { password: "" })).to.be.an.api.error(400, "password_required");
            });
        });
    });
});
