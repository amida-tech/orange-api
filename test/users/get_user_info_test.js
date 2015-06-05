"use strict";

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    authenticate = common.authenticate,
    wrappers = common.wrappers('/v1/user', 'get');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('../auth/helpers.js');
var createUser = authHelpers.createUser;

describe('view user info (GET /user)', function () {
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
        it('returns data', function (done) {
            authenticate(function (err, user) {
                if (err) return done(err);
                sendSuccess({}, user.accessToken, 200, ['email', 'name'], done);
            });
        });
    });
});
