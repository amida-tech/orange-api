"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
    curry       = require("curry"),
    util        = require("util"),
    auth        = require("../common/auth.js");

var expect  = chakram.expect,
    User    = mongoose.model("User");

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
            // setup two test users to test with (beforeEach so we can make requests as
            // we only allow one open request per user at a time)
            var userA, userB, request;
            beforeEach(function () {
                return auth.createTestUser().then(function (u) {
                    userA = u;
                });
            });
            beforeEach(function () {
                return auth.createTestUser().then(function (u) {
                    userB = u;
                });
            });

            // check it requires a valid request ID
            it("rejects invalid request ids", function () {
                return expect(cancelRequest("foo", userA.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });
            it("rejects request ids not corresponding to real requests", function () {
                return expect(cancelRequest(9999, userA.accessToken)).to.be.an.api.error(404, "invalid_request_id");
            });

            describe("with an accepted request", function () {
                // setup accepted request from userA to userB
                beforeEach(function () {
                    return Q.npost(userA, "makeRequest", [userB.email]).then(function (r) {
                        request = r;
                        // update userB from DB to find their request id
                        return Q.npost(User, "findOne", [userB._id]).then(function (user) {
                            var rid = user.requests.filter(function (req) {
                                return req.email === userA.email;
                            })[0]._id;
                            return Q.npost(user, "closeRequest", [rid, "accepted"]);
                        });
                    });
                });

                it("rejects trying to cancel that request", function () {
                    var endpoint = cancelRequest(request._id, userA.accessToken);
                    return expect(endpoint).to.be.an.api.error(404, "invalid_request_id");
                });
            });

            describe("with a rejected request", function () {
                // setup rejected request from userA to userB
                beforeEach(function () {
                    return Q.npost(userA, "makeRequest", [userB.email]).then(function (r) {
                        request = r;
                        // update userB from DB to find their request id
                        return Q.npost(User, "findOne", [userB._id]).then(function (user) {
                            var rid = user.requests.filter(function (req) {
                                return req.email === userA.email;
                            })[0]._id;
                            return Q.npost(user, "closeRequest", [rid, "rejected"]);
                        });
                    });
                });

                it("rejects trying to cancel that request", function () {
                    var endpoint = cancelRequest(request._id, userA.accessToken);
                    return expect(endpoint).to.be.an.api.error(404, "invalid_request_id");
                });
            });

            describe("with a cancelled request", function () {
                // setup cancelled request from userA to userB
                beforeEach(function () {
                    return Q.npost(userA, "makeRequest", [userB.email]).then(function (r) {
                        request = r;
                        return Q.npost(userA, "cancelRequest", [r._id]);
                    });
                });

                it("rejects trying to cancel that request", function () {
                    var endpoint = cancelRequest(request._id, userA.accessToken);
                    return expect(endpoint).to.be.an.api.error(404, "invalid_request_id");
                });
            });


            // everything else tested in lifecycle test
        });
    });
});
