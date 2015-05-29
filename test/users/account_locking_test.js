"use strict";
var supertest = require('supertest');
var api = supertest('http://localhost:3000/v1');
var mongoose = require('mongoose');
var sinon = require('sinon');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys;

var TIMES_TO_TRY = 10;
var TIME_EPSILON = 100;
var TIME_TO_WAIT = 3600 * 1000 + TIME_EPSILON; // in ms

describe("account locking", function () {
    describe("when we have tried incorrect passwords too many times", function () {
        var user, password;
        before(function (done) {
            // Setup user for us to test
            user = factories.user();
            // store password separately as user.password becomes the hash
            password = user.password;
            user.save(function (err, data) {
                if (err) {
                    done(err);
                }

                // repeatedly try to get an access token with the wrong password
                function attemptAuthentication(attemptNo) {
                    api.post('/auth/token')
                        .send({
                            email: user.email,
                            password: password + "wrongpassword"
                        })
                        .expect(403)
                        .end(function (err, res) {
                            if (err) {
                                done(err);
                            }
                            if (attemptNo + 1 < TIMES_TO_TRY) {
                                attemptAuthentication(attemptNo + 1);
                            } else {
                                done();
                            }
                        });
                }
                attemptAuthentication(0);
            });
        });

        it("locks us out", function (done) {
            api.post('/auth/token')
                .send({
                    email: user.email,
                    password: password
                })
                .expect(403)
                .expect(failure(403, ['login_attempts_exceeded']))
                .end(done);
        });

        it("lets us try again later", function (done) {
            // use sinon to mock the passing of time
            var clock = sinon.useFakeTimers(Date.now());
            clock.tick(TIME_TO_WAIT);
            api.post('/auth/token')
                .send({
                    email: user.email,
                    password: password
                })
                .expect(success)
                .expect(keys(['access_token']))
                .end(function (err, res) {
                    clock.restore();
                    done();
                });
        });
    });
});
