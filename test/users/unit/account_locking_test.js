"use strict";
var async       = require("async"),
    chai        = require("chai"),
    sinon       = require("sinon"),
    Q           = require("q"),
    fixtures    = require("../fixtures.js"),
    errors      = require("../../../lib/errors.js").ERRORS;

var expect = chai.expect;

describe("Users", function () {
    describe("Account locking when we've tried the wrong password too many times", function () {
        // setup user and repeatedly try and authenticate with the wrong password
        var user;
        before(function () {
            return fixtures.create("User").then(function (u) {
                user = u;
            }).then(function () {
                var deferred = Q.defer();
                // try and authenticate 25 times
                async.timesSeries(25, function (n, next) {
                    user.authenticate(user.rawPassword + "asd", function (err) {
                        // ignore wrong_email_password and login_attempts_exceeded
                        if (err && err !== errors.WRONG_PASSWORD && err !== errors.LOGIN_ATTEMPTS_EXCEEDED)
                            return next(err);
                        next();
                    });
                }, function (err) {
                    if (err) return deferred.reject(err);
                    deferred.resolve();
                });
                return deferred.promise;
            });
        });


        it("locks us out", function (done) {
            user.authenticate(user.rawPassword, function (err) {
                expect(err).to.equal(errors.LOGIN_ATTEMPTS_EXCEEDED);
                done();
            });
        });

        describe("when a time period has passed", function () {
            // fake time with sinon
            var clock;
            beforeEach(function () {
                clock = sinon.useFakeTimers(Date.now());
                clock.tick(10 * 60 * 60 * 1000);
            });
            afterEach(function () {
                clock.restore();
            });

            describe("with the right password", function () {
                // try authenticating again
                it("lets us back in", function (done) {
                    user.authenticate(user.rawPassword, done);
                });
            });

            describe("with the wrong password", function () {
                // try authenticating again
                it("doesn't lock us out again immediately", function (done) {
                    user.authenticate(user.rawPassword + "a", function (err) {
                        expect(err).to.equal(errors.WRONG_PASSWORD);
                        done();
                    });
                });
            });
        });
    });
});
