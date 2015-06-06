"use strict";
var request = require('supertest');
var mongoose = require('mongoose');
var app = require('../../app.js');
var async = require('async');
var sinon = require('sinon');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    wrappers = common.wrappers('/v1/auth/token', 'post');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('./helpers.js');
var createUser = authHelpers.createUser,
    checkAuthenticated = authHelpers.checkAuthenticated;

describe('POST /auth/token', function () {
    var user;
    before(function (done) {
        createUser(function (err, u) {
            if (err) return done(err);
            console.log("CREATE USER TRETURNS");
            console.log(u);
            user = u;
            done();
        });
    });

    // success
    describe('with valid credentials', function () {
        it('returns a valid access token', function (done) {
            console.log(user);
            async.seq(function (callback) {
                // retrieve access token
                sendSuccess({
                    email: user.email,
                    password: user.rawPassword
                }, null, 201, ['access_token'], callback);
                // then check we're authenticated
            }, checkAuthenticated)(done);
        });
    });

    // wrong_email_password
    describe('with wrong password', function () {
        it('returns an error', function (done) {
            sendFailure({
                email: user.email,
                password: user.wrongPassword
            }, null, 401, ['wrong_email_password'], done);
        });
    });
    describe('with email not corresponding to user', function () {
        it('returns an error', function (done) {
            sendFailure({
                email: user.wrongEmail,
                password: user.password
            }, null, 401, ['wrong_email_password'], done);
        });
    });

    // email_required
    describe('with no email address', function () {
        it('returns an error', function (done) {
            sendFailure({
                password: user.rawPassword
            }, null, 400, ['email_required'], done);
        });
    });

    // password_required
    describe('with no password', function () {
        it('returns an error', function (done) {
            sendFailure({
                email: user.email
            }, null, 400, ['password_required'], done);
        });
    });

    // login_attempts_exceeded
    var TIMES_TO_TRY = 10;
    var TIME_EPSILON = 100;
    var TIME_TO_WAIT = 3600 * 1000 + TIME_EPSILON; // in ms
    describe("when we've tried the incorrect password too many times", function () {
        // attempt to log in too many times
        function attemptLogins(done) {
            async.timesSeries(TIMES_TO_TRY, function (n, next) {
                console.log("USERRRRRRRRRRRRRRRRRRRRRRR");
                console.log(user);
                sendFailure({
                    email: user.email,
                    password: user.wrongPassword
                }, null, 401, ['wrong_email_password'], next);
            }, done);
        }

        before(function (done) {
            // we want a new user to do this with, because the old one will have different counts
            async.series([function (cb) {
                createUser(function (err, u) {
                    if (err) return cb(err);
                    user = u;
                    cb();
                });
            }, attemptLogins], done);
        });

        it('locks us out', function (done) {
            sendFailure({
                email: user.email,
                password: user.rawPassword
            }, null, 403, ['login_attempts_exceeded'], done);
        });

        it('lets us try again later', function (done) {
            var clock = sinon.useFakeTimers(Date.now());
            clock.tick(TIME_TO_WAIT);
            async.seq(function (callback) {
                // retrieve access token
                sendSuccess({
                    email: user.email,
                    password: user.rawPassword
                }, null, 201, ['access_token'], callback);
            }, checkAuthenticated, function (_, callback) {
                // restore time
                clock.restore();
                callback();
            })(done);
        });
    });
});
