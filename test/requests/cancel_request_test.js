"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    util        = require("util"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    describe("Cancelling a Request Made by the Current User", function () {
        // delete a request made by a user
        var cancelRequest = module.exports.cancelRequest = function (requestId, accessToken) {
            var url = util.format("http://localhost:3000/v1/requested/%d", requestId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // check it requires authentication
        auth.itRequiresAuthentication(curry(cancelRequest)(1));

        describe("with test user", function () {
            // setup user to test with
            var user;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                });
            });

            // check it requires a valid request ID
            it("rejects invalid request ids", function () {
                return expect(cancelRequest("foo", user.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });
            it("rejects request ids not corresponding to real requests", function () {
                return expect(cancelRequest(9999, user.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });
            xit("rejects request ids corresponding to accepted requests", function () {
            });
            xit("rejects request ids corresponding to denied requests", function () {
            });
            xit("rejects request ids corresponding to cancelled requests", function () {
            });

            // everything else tested in lifecycle test
        });
    });
});
