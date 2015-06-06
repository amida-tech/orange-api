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
        });
    });
});
