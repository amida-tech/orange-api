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
    wrappers = common.wrappers('/v1/patients', 'get');
var send = wrappers.send,
    sendSuccess = wrappers.sendSuccess,
    sendFailure = wrappers.sendFailure;
var authHelpers = require('../auth/helpers.js');
var createUser = authHelpers.createUser;

describe('view list of patients (GET /patients)', function () {
    // create n patients for a given user
    function createPatients(user, times, callback) {
            async.times(times, function (n, next) {
                Patient.createForUser(factories.patient(), user, next);
            }, callback);
        }
        // create n patients for a given user, and share with another user
    function createSharePatients(creator, sharee, access, times, callback) {
        var patients;
        createPatients(creator, times, function (err, patients) {
            if (err) return callback(err);
            async.each(patients, function (patient, cb) {
                // share with user
                patient.share(sharee, access, cb);
            }, function (err) {
                if (err) return callback(err);
                // return patients not shares
                callback(null, patients);
            });
        });
    }

    // setup test users and patients
    var currentUser, otherUser;
    var currentPatients, otherPatients, sharedWritePatients, sharedReadPatients;
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
            // setup current user's patients
            function (callback) {
                createPatients(currentUser, 20, function (err, patients) {
                    if (err) return callback(err);
                    currentPatients = patients;
                    callback();
                });
            },
            // setup other user's patients not shared with current user
            function (callback) {
                createPatients(otherUser, 20, function (err, patients) {
                    if (err) return callback(err);
                    otherPatients = patients;
                    callback();
                });
            },
            // setup other user's patients shared with write access
            function (callback) {
                createSharePatients(otherUser, currentUser, 'write', 20, function (err, patients) {
                    if (err) return callback(err);
                    sharedWritePatients = patients;
                    callback();
                });
            },
            // setup other user's patients shared with read access
            function (callback) {
                createSharePatients(otherUser, currentUser, 'read', 20, function (err, patients) {
                    if (err) return callback(err);
                    sharedReadPatients = patients;
                    callback();
                });
            },
        ], done);
    });

    function checkCount(res, callback) {
        if (res.body.count !== res.body.patients.length) return callback(new Error("specified count " + res.body.count + " not equal to " + res.body.patients.length));
        callback(null, res);
    }

    function checkPatientIn(patientIds, patient, callback) {
        if (patientIds.indexOf(patient.id) >= 0) return callback();
        console.log(patientIds);
        console.log([patient.id]);
        callback(new Error("patient " + patient.id + " not found in specified lists"));
    }

    function checkPatientsIn(patientLists) {
        // map to list of IDs here for efficiency (can then just use normal comparison rather than .equals)
        var patientIds = [];
        for (var i = 0; i < patientLists.length; i++) {
            for (var j = 0; j < patientLists[i].length; j++) {
                patientIds.push(patientLists[i][j]._id);
            }
        }

        return function (res, callback) {
            async.each(res.body.patients, async.apply(checkPatientIn, patientIds), function (err) {
                if (err) return callback(err);
                callback(null, res);
            });
        };
    }

    var keyChecker = common.keysData(['id', 'name', 'access']);

    function checkPatients(res, callback) {
        for (var i = 0; i < res.body.patients.length; i++) {
            if (keyChecker(res.body.patients[i])) {
                console.log(res.body.patients[i]);
                console.log(keyChecker(res.body.patients[i]));
                return callback(new Error("invalid patient response (logged)"));
            }
            callback(null, res);
        }
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
        it('returns some patients I have access to', function (done) {
            async.seq(function (callback) {
                sendSuccess({}, currentUser.accessToken, 200, ['patients', 'count'], callback);
            }, checkCount, checkPatients, checkPatientsIn([currentPatients, sharedReadPatients, sharedWritePatients]))(done);
        });

        describe('with pagination', function () {
            describe('with a limit parameter', function () {
                it('returns the right number of results');
            });
            describe('with an offest parameter', function () {
                it('offsets by the right number results');
            });
        });
        describe('with sorting', function () {
            it('sorts by id in ascending order');
            describe('with descending', function () {
                it('sorts by id in descending order');
            });
            describe('with sort by name', function () {
                it('sorts by name in ascending order');
                describe('with descending', function () {
                    it('sorts by name in descending order');
                });
            });
        });
        describe('with filtering', function () {
            it('filters by name');
        });
    });
});
