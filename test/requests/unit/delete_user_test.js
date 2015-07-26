"use strict";
var chakram         = require("chakram"),
    mongoose        = require("mongoose"),
    Q               = require("q"),
    auth            = require("../../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    // test that when users are deleted, the corresponding requests (both in
    // requests and requested) are cancelled/closed
    describe("Delete Cascade", function () {
        // setup three users
        var alice, bob, carol;
        before(function () {
            return auth.createTestUser().then(function (u) {
                alice = u;
            });
        });
        before(function () {
            return auth.createTestUser().then(function (u) {
                bob = u;
            });
        });
        before(function () {
            return auth.createTestUser().then(function (u) {
                carol = u;
            });
        });

        // make requests from alice to bob and alice to carol
        before(function () {
            return Q.npost(alice, "makeRequest", [bob.email]);
        });
        before(function () {
            return Q.npost(alice, "makeRequest", [carol.email]);
        });

        // update users from DB after making requests (for deletion)
        var User = mongoose.model("User");
        before(function () {
            return Q.npost(User, "findOne", [alice._id]).then(function (user) {
                alice = user;
            });
        });
        before(function () {
            return Q.npost(User, "findOne", [bob._id]).then(function (user) {
                bob = user;
            });
        });
        before(function () {
            return Q.npost(User, "findOne", [carol._id]).then(function (user) {
                carol = user;
            });
        });

        // update users from DB and then return the status of the request from
        // userA to userB or vice versa, returning null if not present
        // key should be requests or requested
        var requestStatus = function (key, userA, userB) {
            return Q.npost(User, "findOne", [userA._id]).then(function (user) {
                var request = user[key].filter(function (r) {
                    return r.email === userB.email;
                })[0];
                if (typeof request === "undefined" || request === null) return null;
                return request.status;
            });
        };

        describe("bob (user to whom request was made) is deleted", function () {
            it("alice should initially have a request made to bob", function () {
                return expect(requestStatus("requested", alice, bob)).to.equal("pending");
            });

            describe("after deletion", function () {
                before(function () {
                    return Q.npost(bob, "remove");
                });

                it("alice's request to bob should be denied", function () {
                    return expect(requestStatus("requested", alice, bob)).to.equal("denied");
                });
            });
        });

        describe("alice (user who made request) is deleted", function () {
            it("carol should initially have a request from alice", function () {
                expect(requestStatus("requests", carol, alice)).to.equal("pending");
            });

            describe("after deletion", function () {
                before(function () {
                    return Q.npost(alice, "remove");
                });

                it("carol's request from alice should be cancelled", function () {
                    expect(requestStatus("requests", carol, alice)).to.equal("cancelled");
                });
            });
        });
    });
});
