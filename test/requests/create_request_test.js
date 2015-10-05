"use strict";
var chakram         = require("chakram"),
    curry           = require("curry"),
    auth            = require("../common/auth.js"),
    closeRequest    = require("./close_request_test.js").closeRequest;

var expect = chakram.expect;

describe("Requests", function () {
    describe("Creating a New Request", function () {
        // make a new request
        var create = module.exports.create = function (data, accessToken) {
            return chakram.post("http://localhost:5000/v1/requested", data, auth.genAuthHeaders(accessToken));
        };

        // check it requires authentication
        auth.itRequiresAuthentication(curry(create)({}));

        describe("with test data", function () {
            // setup two users to test with (beforeEach so we can play around with requests)
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

            it("requires an email address", function () {
                return expect(create({
                    email: undefined
                }, me.accessToken)).to.be.an.api.error(400, "email_required");
            });
            it("rejects a null email address", function () {
                return expect(create({
                    email: null
                }, me.accessToken)).to.be.an.api.error(400, "email_required");
            });
            it("rejects a blank email address", function () {
                return expect(create({
                    email: ""
                }, me.accessToken)).to.be.an.api.error(400, "email_required");
            });
            it("rejects an email address not corresponding to an existing user", function () {
                return expect(create({
                    email: "not@auser.com"
                }, me.accessToken)).to.be.an.api.error(400, "invalid_email");
            });
            it("accepts a valid email address corresponding to an existing user", function () {
                return expect(create({
                    email: otherUser.email
                }, me.accessToken)).to.be.a.requested.createSuccess;
            });
            it("rejects an email address for a user we've already requested access from", function () {
                // create
                return create({
                    email: otherUser.email
                }, me.accessToken).then(function (resp) {
                    expect(resp).to.be.a.requested.createSuccess;

                    // duplicate create that should error
                    return expect(create({
                        email: otherUser.email
                    }, me.accessToken)).to.be.an.api.error(400, "already_requested");
                });
            });

            it("accepts an email address for a user we've got a closed request to", function () {
                // create
                return create({
                    email: otherUser.email
                }, me.accessToken).then(function (resp) {
                    expect(resp).to.be.a.requested.createSuccess;

                    // close
                    return closeRequest({
                        status: "accepted"
                    }, resp.body.id, otherUser.accessToken).then(function() {

                        // create again
                        return expect(create({
                            email: otherUser.email
                        }, me.accessToken)).to.be.an.api.error(400, "already_requested");
                    });
                });
            });
        });

        // everything else tested in lifecycle test
    });
});
