"use strict";
var chakram         = require("chakram"),
    curry           = require("curry"),
    Q               = require("q"),
    util            = require("util"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    create          = require("./create_request_test.js").create,
    listRequested   = require("./list_requested_test.js").listRequested,
    cancelRequest   = require("./cancel_request_test.js").cancelRequest,
    listRequests    = require("./list_requests_test.js").listRequests,
    closeRequest    = require("./close_request_test.js").closeRequest;

var expect = chakram.expect;

describe("Requests", function () {
    // test lifecycle for making a request from start to end
    describe("Request Creation Lifecycle", function () {
        // setup a user for me and a user for another
        var me, otherUser;
        before(function () {
            return auth.createTestUser().then(function (u) {
                me = u;
            });
        });
        before(function () {
            return auth.createTestUser().then(function (u) {
                otherUser = u;
            });
        });

        it("shows I have no requests made initially", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });

        it("shows the other user has no pending requests initially", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });

        it("lets me create a request", function () {
            return create({
                email: otherUser.email
            }, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.createSuccess;
                expect(response.body.email).to.equal(otherUser.email);
            });
        });

        it("shows that I have made a request", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requested[0].email).to.equal(otherUser.email);
            });
        });

        it("shows that the other user has received a request", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requests[0].email).to.equal(me.email);
            });
        });

        it("shows I have not received any requests", function () {
            return listRequests({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });

        it("shows the other user has not made any requests", function () {
            return listRequested({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });
    });

    // test lifecycle for the user who made a request cancelling a request
    describe("Request Cancellation Lifecycle", function () {
        // setup a user for me and a user for another
        var me, otherUser;
        before(function () {
            return auth.createTestUser().then(function (u) {
                me = u;
            });
        });
        before(function () {
            return auth.createTestUser().then(function (u) {
                otherUser = u;
            });
        });

        // setup an example request
        var request;
        before(function () {
            return Q.npost(me, "makeRequest", [otherUser.email]).then(function (r) {
                request = r;
            });
        });

        it("initially shows that I have made a request", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requested[0].email).to.equal(otherUser.email);
            });
        });

        it("initially shows that the other user has received a request", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requests[0].email).to.equal(me.email);
            });
        });

        // as opposed to 'closing' it
        it("returns an error if the other user tries to *cancel* the request", function () {
            return expect(cancelRequest(request._id, otherUser.accessToken)).to.be.an.api.error(404, "invalid_request_id");
        });

        it("still shows that I have made a request", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requested[0].email).to.equal(otherUser.email);
            });
        });

        it("still shows that the other user has received a request", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requests[0].email).to.equal(me.email);
            });
        });

        it("lets me cancel the request", function () {
            return cancelRequest(request._id, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.success;
                expect(response.body.id).to.equal(request._id);
                expect(response.body.email).to.equal(otherUser.email);
            });
        });

        it("shows I no longer have any requests made", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });

        it("shows the other user no longer has any pending requests made", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });
    });

    // test lifecycle for the user who made a request closing a request
    describe("Request Closing Lifecycle", function () {
        // setup a user for me and a user for another
        var me, otherUser;
        before(function () {
            return auth.createTestUser().then(function (u) {
                me = u;
            });
        });
        before(function () {
            return auth.createTestUser().then(function (u) {
                otherUser = u;
            });
        });

        // setup an example request
        before(function () {
            return Q.npost(me, "makeRequest", [otherUser.email]);
        });

        it("initially shows that I have made a request", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requested[0].email).to.equal(otherUser.email);
            });
        });

        var requestId;
        it("initially shows that the other user has received a request", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requests[0].email).to.equal(me.email);
                requestId = response.body.requests[0].id;
            });
        });

        // as opposed to 'cancelling' it
        it("returns an error if I try to *close* the request", function () {
            return expect(closeRequest({
                status: "rejected"
            }, requestId, me.accessToken)).to.be.an.api.error(404, "invalid_request_id");
        });

        it("still shows that I have made a request", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requested[0].email).to.equal(otherUser.email);
            });
        });

        it("still shows that the other user has received a request", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(1);
                expect(response.body.count).to.equal(1);
                expect(response.body.requests[0].email).to.equal(me.email);
            });
        });

        it("lets the other user close the request", function () {
            return closeRequest({
                status: "rejected"
            }, requestId, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.success;
                expect(response.body.id).to.equal(requestId);
                expect(response.body.email).to.equal(me.email);
            });
        });

        it("shows I no longer have any requests made", function () {
            return listRequested({}, me.accessToken).then(function (response) {
                expect(response).to.be.a.requested.listSuccess;
                expect(response.body.requested.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });

        it("shows the other user no longer has any pending requests made", function () {
            return listRequests({}, otherUser.accessToken).then(function (response) {
                expect(response).to.be.a.requests.listSuccess;
                expect(response.body.requests.length).to.equal(0);
                expect(response.body.count).to.equal(0);
            });
        });
    });
});
