"use strict";
var request = require('supertest');
var mongoose = require('mongoose');
var app = require('../../app.js');
var async = require('async');

var User = mongoose.model('User');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    wrappers = common.wrappers('/v1/user', 'post');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('../auth/helpers.js');
var createUser = authHelpers.createUser;

describe('registration (POST /user)', function () {
    // keep track of num users so we can check added/not added
    var prevCount = 0;
    beforeEach(function (done) {
        User.count({}, function (err, count) {
            if (err) return done(err);
            prevCount = count;
            done();
        });
    });

    function checkCountDelta(delta) {
        return function (res, callback) {
            User.count({}, function (err, count) {
                if (err) return callback(err);
                if (count !== prevCount + delta) return callback(new Error("Expected count " + count + "to equal " + (prevCount + delta)));
                callback();
            });
        };
    }

    // success
    describe('with valid credentials', function () {
        describe('with full data', function () {
            it('registers successfully', function (done) {
                var user = factories.user();
                console.log(user);
                async.seq(function (callback) {
                    sendSuccess({
                        email: user.email,
                        password: user.rawPassword,
                        name: user.name
                    }, null, 201, ['email', 'name'], callback);
                }, checkCountDelta(1))(done);
            });
        });

        describe('with minimum working data', function () {
            it('registers successfully', function (done) {
                var user = factories.user();
                async.seq(function (callback) {
                    sendSuccess({
                        email: user.email,
                        password: user.rawPassword
                    }, null, 201, ['email', 'name'], callback);
                }, checkCountDelta(1))(done);
            });
        });
    });

    // email_required
    describe('with no email', function () {
        it('returns an error', function (done) {
            var user = factories.user();
            async.seq(function (callback) {
                sendFailure({
                    password: user.rawPassword,
                    name: user.name
                }, null, 400, ['email_required'], callback);
            }, checkCountDelta(0))(done);
        });
    });

    // password_required
    describe('with no password', function () {
        it('returns an error', function (done) {
            var user = factories.user();
            async.seq(function (callback) {
                sendFailure({
                    email: user.email,
                    name: user.name
                }, null, 400, ['password_required'], callback);
            }, checkCountDelta(0))(done);
        });
    });

    // invalid_email
    describe('with an invalid email', function () {
        it('returns an error', function (done) {
            var user = factories.user();
            async.seq(function (callback) {
                sendFailure({
                    email: user.invalidEmail,
                    password: user.rawPassword,
                    name: user.name
                }, null, 400, ['invalid_email'], callback);
            }, checkCountDelta(0))(done);
        });
    });

    // user_already_exists
    describe('with an existing email', function () {
        it('returns an error', function (done) {
            async.seq(createUser, function (user, callback) {
                console.log("output from createUser");
                console.log(user);
                sendFailure({
                    email: user.email,
                    password: user.rawPassword,
                    name: user.name
                }, null, 400, ['user_already_exists'], callback);
            })(done);
            // not using checkCountDelta because of bug in createUser
        });
    });
});
