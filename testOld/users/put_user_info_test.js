"use strict";
var mongoose = require('mongoose');
var request = require('supertest');
var app = require('../../app.js');

var User = mongoose.model('User');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    authenticate = common.authenticate,
    wrappers = common.wrappers('/v1/user', 'put');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('../auth/helpers.js');
var createUser = authHelpers.createUser;

describe('set user info (PUT /user)', function () {
    describe('with no access token', function () {
        it('gives an error', function (done) {
            sendFailure({}, null, 401, ['access_token_required'], done);
        });
    });

    describe('with invalid access token', function () {
        it('gives an error', function (done) {
            sendFailure({}, 'notanaccesstoken', 401, ['invalid_access_token'], done);
        });
    });

    describe('with valid access token', function () {
        var user;
        before(function (done) {
            // create a user and generate access token
            authenticate(function (err, u) {
                if (err) return done(err);
                user = u;
                done();
            });
        });

        describe('changing name', function () {
            it('gives a successul response', function (done) {
                sendSuccess({
                    name: user.name + "foo"
                }, user.accessToken, 200, ['email', 'name'], done);
            });
            it('updates the name', function (done) {
                User.findById(user.id, function (err, result) {
                    if (err) return done(err);
                    // check name updated to new one
                    if (result.name !== user.name + "foo") return done(new Error("expected " + result.name + " to equal " + user.name + "foo"));
                    done();
                });
            });
            it('does not revoke access tokens', function (done) {
                // check we can authenticate still
                request(app).get('/v1/user').set('Authorization', user.authHeader).expect(200, done);
            });
        });

        describe('changing password', function () {
            it('gives a successul response', function (done) {
                sendSuccess({
                    password: "test"
                }, user.accessToken, 200, ['email', 'name'], done);
            });
            it('updates the password', function (done) {
                User.findById(user.id, function (err, result) {
                    if (err) return done(err);
                    result.authenticate('test', function (err, success) {
                        if (err) return done(err);
                        // check we can authenticate with new password
                        if (success !== true) return done(new Error("password not updated"));
                        done();
                    });
                });
            });
            it('revokes access tokens', function (done) {
                // check we get a failure when trying to use old access token
                request(app).get('/v1/user').set('Authorization', user.authHeader).expect(401, done);
            });
        });
    });
});
