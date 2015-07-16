"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    describe("Close Request made to the Current User", function () {
        // delete a request made to a user
        var closeRequest = module.exports.closeRequest = function (data, requestId, accessToken) {
            var url = util.format("http://localhost:3000/v1/requests/%d", requestId);
            return chakram.delete(url, data, auth.genAuthHeaders(accessToken));
        };

        // check it requires authentication
        auth.itRequiresAuthentication(curry(closeRequest)({}, 1));

        describe("with test user", function () {
            // setup a user for me and a user for another
            var me, otherUser;
            beforeEach(function () {
                return auth.createTestUser().then(function (u) {
                    me = u;
                });
            });
            beforeEach(function () {
                return auth.createTestUser().then(function (u) {
                    otherUser = u;
                });
            });

            // setup an example request
            var requestId;
            beforeEach(function () {
                return Q.npost(me, "makeRequest", [otherUser.email]).then(function () {
                    // need the request id from the POV of otherUser, so we find otherUser
                    // again
                    return Q.npost(mongoose.model("User"), "findOne", [{_id: otherUser._id}]);
                }).then(function (u) {
                    requestId = u.requests[0]._id;
                });
            });


            // check it requires a valid request ID
            it("rejects invalid request ids", function () {
                return expect(closeRequest({
                    status: "accepted"
                }, "foo", otherUser.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });
            it("rejects request ids not corresponding to real requests", function () {
                return expect(closeRequest({
                    status: "accepted"
                }, 9999, otherUser.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });

            it("requires a status key", function () {
                return expect(closeRequest({
                }, requestId, otherUser.accessToken)).to.be.an.api.error(400, "invalid_status");
            });
            it("rejects a null status", function () {
                return expect(closeRequest({
                    status: null
                }, requestId, otherUser.accessToken)).to.be.an.api.error(400, "invalid_status");
            });
            it("rejects a blank status", function () {
                return expect(closeRequest({
                    status: ""
                }, requestId, otherUser.accessToken)).to.be.an.api.error(400, "invalid_status");
            });
            it("rejects an invalid status", function () {
                return expect(closeRequest({
                    status: "foo"
                }, requestId, otherUser.accessToken)).to.be.an.api.error(400, "invalid_status");
            });
            it("accepts an 'accepted' status", function () {
                return expect(closeRequest({
                    status: "accepted"
                }, requestId, otherUser.accessToken)).to.be.a.requests.success;
            });
            it("accepts an 'rejected' status", function () {
                return expect(closeRequest({
                    status: "rejected"
                }, requestId, otherUser.accessToken)).to.be.a.requests.success;
            });


            // everything else tested in lifecycle test
        });
    });
});
