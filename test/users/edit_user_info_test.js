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
            return chakram.put("http://localhost:5000/v1/user", modifications, auth.genAuthHeaders(accessToken));
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
                    email: user.email
                };
                return user;
            }).then((u) => auth.genAccessToken(u, true)).then(function (t) {
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

        describe("changing npi as user", function () {
            var request;
            beforeEach(function () {
                request = updateUser({role: "user" }, { npi: "1245319599" });
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("does not revoke our access tokens", function () {
                return request.then(auth.checkTokenWorks(token));
            });

            it("doesn't actually do anything", function () {
                return request.then(function (response) {
                    expect(response.body.npi).to.be.an("undefined");
                });
            });
        });

        describe("changing npi as clinician", function () {
            var request;
            beforeEach(function () {
                request = updateUser({role: "clinician" }, { npi: "1245319599" });
            });

            it("returns a successful response", function () {
                return expect(request).to.be.a.user.success;
            });
            it("does not revoke our access tokens", function () {
                return request.then(auth.checkTokenWorks(token));
            });

            it("returns the new npi", function () {
                return request.then(function (response) {
                    expect(response.body.npi).to.equal("1245319599");
                });
            });
            it("allows a null npi", function () {
                return updateUser({role: "clinician"}, { npi: null }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.npi).to.equal("");
                });
            });
            it("allows a blank npi", function () {
                return updateUser({role: "clinician"}, { npi: "" }).then(function (response) {
                    expect(response).to.be.a.user.success;
                    expect(response.body.npi).to.equal("");
                });
            });
        });
    });
});
