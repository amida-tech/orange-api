"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Users", function () {
    describe("View User Info (GET /user)", function () {
        var view, viewUser; // the endpoint
        before(function () {
            view = function (accessToken) {
                return chakram.get("http://localhost:3000/v1/user", auth.genAuthHeaders(accessToken));
            };
            // create a user with the specified data modifications (to the factory default), generate
            // an access token and then use that token to view the user
            viewUser = function (data) {
                return fixtures.create("User", data).then(function (user) {
                    // generate access token
                    var deferred = Q.defer();
                    user.generateSaveAccessToken(function (err, t) {
                        if (err) return deferred.reject(err);
                        deferred.resolve(t);
                    });
                    return deferred.promise;
                }).then(view);
            };
        });

        // check access token authentication
        auth.itRequiresAuthentication(function () { return view; });

        describe("when user name is present", function () {
            it("should return a successful response", function () {
                return expect(viewUser({})).to.be.a.user.success;
            });
        });

        describe("when user name is not present", function () {
            it("should return a successful response", function () {
                return expect(viewUser({name: undefined})).to.be.a.user.success;
            });
        });
    });
});
