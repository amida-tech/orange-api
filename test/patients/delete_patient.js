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
    wrappersGen = common.wrappers;
var authHelpers = require('../auth/helpers.js');

describe('remove patient (DELETE /patients/:id)', function () {
    // check proper deletion of patients
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

    // setup users and patients to test with
    var currentUser, otherUser;
    var currentPatient, otherPatient, sharedPatient;
    var currentWrapper, otherWrapper, sharedWrapper; // DRY rest wrappers for calling endpoints
    before(function (done) {
        async.series([
            // setup current user
            function (callback) {
                authenticate(function (err, u) {
                    if (err) return callback(err);
                    currentUser = u;
                    callback();
                });
            },
            // setup other user
            function (callback) {
                // stateless so can authenticate to get created user
                authenticate(function (err, u) {
                    if (err) return callback(err);
                    otherUser = u;
                    callback();
                });
            },
            // setup patient
            function (callback) {
                Patient.createForUser(factories.patient(), currentUser, function (err, p) {
                    if (err) return callback(err);
                    currentPatient = p;
                    callback();
                });
            },
            // setup other user's patient
            function (callback) {
                Patient.createForUser(factories.patient(), otherUser, function (err, p) {
                    if (err) return callback(err);
                    otherPatient = p;
                    callback();
                });
            },
            // setup patient of other user shared read-only with me
            function (callback) {
                Patient.createForUser(factories.patient(), otherUser, function (err, p) {
                    if (err) return callback(err);
                    sharedPatient = p;
                    sharedPatient.share(currentUser, 'read', callback);
                });
            },
            // setup endpoint helpers for both patients
            function (callback) {
                currentWrapper = wrappersGen('/v1/patients/' + currentPatient._id, 'delete');
                otherWrapper = wrappersGen('/v1/patients/' + otherPatient._id, 'delete');
                sharedWrapper = wrappersGen('/v1/patients/' + sharedPatient._id, 'delete');
                callback();
            }
        ], done);
    });

    describe('with no access token', function () {
        it('gives an error', function (done) {
            async.parallel([
                function (cb) {
                    currentWrapper.sendFailure({}, null, 401, ['access_token_required'], cb);
                },
                function (cb) {
                    otherWrapper.sendFailure({}, null, 401, ['access_token_required'], cb);
                },
                function (cb) {
                    sharedWrapper.sendFailure({}, null, 401, ['access_token_required'], cb);
                }
            ], done);
        });
    });

    describe('with invalid access token', function () {
        it('gives an error', function (done) {
            async.parallel([
                function (cb) {
                    currentWrapper.sendFailure({}, 'notanaccesstoken', 401, ['invalid_access_token'], cb);
                },
                function (cb) {
                    otherWrapper.sendFailure({}, 'notanaccesstoken', 401, ['invalid_access_token'], cb);
                },
                function (cb) {
                    sharedWrapper.sendFailure({}, 'notanaccesstoken', 401, ['invalid_access_token'], cb);
                }
            ], done);

        });
    });

    describe('with valid access token', function () {
        describe('with invalid patient ID', function () {
            it('gives an error', function (done) {
                // relying on the fact we generated sharedPatient last, and IDs auto increment
                var endpoint = '/v1/patients/' + (sharedPatient._id + 1);
                wrappersGen(endpoint, 'delete').sendFailure({}, currentUser.accessToken, 404, ['invalid_patient_id'], done);
            });
        });

        describe('with write access to patient', function () {
            it('successfully deletes the patient', function (done) {
                async.seq(function (callback) {
                    currentWrapper.sendSuccess({}, currentUser.accessToken, 200, ['id', 'name', 'access'], callback);
                }, checkCountDelta(-1))(done);
            });
            // TODO: test all other resources belonging to patient are deleted here
        });

        describe('with read access to (shared) patient', function () {
            it("doesn't delete the patient", function (done) {
                async.seq(function (callback) {
                    sharedWrapper.sendFailure({}, currentUser.accessToken, 403, ['unauthorized'], callback);
                }, checkCountDelta(0))(done);
            });
        });

        describe('with no access to patient', function () {
            it("doesn't delete the patient", function (done) {
                async.seq(function (callback) {
                    otherWrapper.sendFailure({}, currentUser.accessToken, 403, ['unauthorized'], callback);
                }, checkCountDelta(0))(done);
            });
        });
    });
});
