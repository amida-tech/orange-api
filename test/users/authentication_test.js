"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    request     = require("supertest")("http://localhost:3000/v1/"),
    auth        = require("../common/auth.js");

// check we get a valid access token back, and that we can use that to access the rest of the API
var authenticatesSuccessfully = function (data) {
    describe("getting access token", function () {
        return requests.successfullyCreates("/auth/token", ["access_token"], data);
    });
    describe("verifying access token", function () {
        it("allows us to access the user info with the access token", function (done) {
            request.post("/auth/token").send(data).end(function (err, res) {
                if (err) return done(err);
                var authHeader = "Bearer " + res.body.access_token;
                // will err out as status code is 401 without valid access code
                request.get("/user").set("Authorization", authHeader).end(done);
            });
        });
    });
};
// check we get the desired error and error code back
var authenticationFails = async.apply(requests.failsToCreate, "/auth/token");

describe("obtaining tokens (POST /auth/token)", function () {
    // create user to test with
    var user = auth.newUser();
    before(function (done) { user.save(done); });

    describe("with valid credentials", function () {
        authenticatesSuccessfully({
            email: user.email,
            password: user.password
        });
    });

    describe("with wrong password", function () {
        authenticationFails({
            email: user.email,
            password: user.password + "a"
        }, 401, "wrong_email_password");
    });

    describe("with wrong email", function () {
        authenticationFails({
            email: user.email + "a",
            password: user.password + "a"
        }, 401, "wrong_email_password");
    });

    describe("with no email", function () {
        authenticationFails({ password: user.password }, 400, "email_required");
    });

    describe("with no password", function () {
        authenticationFails({ email: user.email }, 400, "password_required");
    });

    describe("with login attempts exceeded", function () {
        // try password wrong too many times
        before(function (done) {
            // whether we've locked the account yet
            var locked = false;
            async.until(function () {
                return locked;
            }, function (callback) {
                // try and authenticate with wrong details
                request.post("/auth/token").send({
                    email: user.email,
                    password: user.password + "a" // wrong password
                }).expect(401).end(function (err, res) {
                    // will get 403 once locked
                    if (res.status === 403) locked = true;
                    else if (err) return callback(err);
                    callback();
                });
            }, done);
        });

        describe("when locked out", function () {
            authenticationFails({
                email: user.email,
                password: user.password
            }, 403, 'login_attempts_exceeded')
        });

        // TODO: how can we test this without having access to the app?
        // We'd normally use sinon but we're just talking over HTTP now...
        // Maybe unit test
        it("lets us back in after a time period");
    });
});
