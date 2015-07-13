"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    auth        = require("../common/auth.js"),
    view        = require("./common.js").view;

var expect = chakram.expect;

describe("Users", function () {
    describe("View User Info (GET /user)", function () {
        // create a user with the specified data modifications (to the factory default), generate
        // an access token and then use that token to view the user
        var viewUser = function (data) {
            return fixtures.create("User", data).then(auth.genAccessToken).then(view);
        };

        // check access token authentication
        auth.itRequiresAuthentication(view);

        describe("when user name is present", function () {
            it("should return a successful response", function () {
                return expect(viewUser({})).to.be.a.user.success;
            });
        });

        describe("when user name is not present", function () {
            it("should return a successful response", function () {
                return expect(viewUser({
                    first_name: undefined,
                    last_name: undefined
                })).to.be.a.user.success;
            });
        });
    });
});
