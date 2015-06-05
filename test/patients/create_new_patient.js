"use strict";

var async = require('async');
var mongoose = require('mongoose');

var User = mongoose.model('User');
var Patient = mongoose.model('Patient');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    authenticate = common.authenticate,
    wrappers = common.wrappers('/v1/patients', 'post');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('../auth/helpers.js');
var createUser = authHelpers.createUser;

describe('create new patient (POST /patients)', function () {
    // check proper creation/no creation  of patients
    var prevCount = 0;
    beforeEach(function (done) {
        Patient.count({}, function (err, count) {
            if (err) return done(err);
            prevCount = count;
            done();
        });
    });

    function checkCountDelta(delta) {
        return function (d, callback) {
            Patient.count({}, function (err, count) {
                if (err) return callback(err);
                if (count !== prevCount + delta) return callback(new Error("Expected count " + count + "to equal " + (prevCount + delta)));
                // chain e.g., response through
                callback(null, d);
            });
        };
    }

    // check access: "write" is present in a response
    function checkWriteAccess(res, callback) {
        if (res.body.access !== "write") return callback(new Error("Expected access " + res.body.access + " to be write"));
        // chain response through to next callback
        callback(null, res);
    }

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

        describe('without name', function () {
            it('gives an error', function (done) {
                async.seq(function (callback) {
                    sendFailure({}, user.accessToken, 400, ['name_required'], callback);
                }, checkCountDelta(0))(done);
            });
        });

        describe('with name', function () {
            it('successfully creates a patient', function (done) {
                async.seq(function (callback) {
                    sendSuccess({
                        name: factories.patient().name
                    }, user.accessToken, 201, ['id', 'name', 'access'], callback);
                }, checkCountDelta(1), checkWriteAccess)(done);
            });
        });
    });

});
