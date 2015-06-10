"use strict";
var mongoose    = require("mongoose"),
    expect      = require("chai").expect,
    async       = require("async"),
    util        = require("util"),
    requests    = require("./requests.js"),
    factories   = require("./factories.js"),
    auth        = require("./auth.js"),
    crud        = require("./crud.js"),
    patients    = require("../patients/common.js");

var Patient = mongoose.model("Patient");

module.exports = function PatientsCrud (className, modelName, collectionName, urlName) {
    this.className = className;
    this.modelName = modelName;
    this.collectionName = collectionName;
    if (typeof urlName === "undefined") this.urlName = urlName = collectionName;

    // keep track of count of overall number of records for all patients
    // TODO: maybe redesign this to track per patient
    this.count = 0;
    this.performCount = function (callback) {
        // see mongo docs, but this counts the total number of subdocuments (e.g., doctors)
        // across all patients in the collection
        Patient.aggregate({ $unwind: "$" + collectionName }, {
            $group: {
                _id: '',
                count: { $sum: 1 }
            }
        }, function (err, res) {
            if (err) return callback(err);
            if (res.length === 0) return callback(null, 0);
            return callback(null, res[0].count);
        });
    };
    this.countFunc = function (callback) {
        this.performCount(function (err, count) {
            if (err) return callback(err);
            this.count = count;
            callback();
        }.bind(this));
    };
    // check count has been updated by a certain amount
    this.checkCount = function (delta, callback) {
        this.performCount(function (err, count) {
            if (err) return callback(err);
            expect(count).to.eql(this.count + delta);
            callback();
        }.bind(this));
    };

    this.endpoint = function (patientId) {
        return this.genericEndpoint(patientId, "");
    }.bind(this);

    this.genericEndpoint = function (patientId, resourceId) {
        // we ensure patientId and resourceId are getter functionsj
        if (!(patientId && patientId.constructor && patientId.call && patientId.apply))
            patientId = (function (val) { return function() { return val; } })(patientId);
        if (!(resourceId && resourceId.constructor && resourceId.call && resourceId.apply))
            resourceId = (function (val) { return function() { return val; } })(resourceId);

        // getter function
        return function () {
            return util.format("/patients/%s/%s/%s", patientId(), urlName, resourceId());
        };
    }.bind(this);

    this.resourceEndpoint = function (patientId) {
        return this.genericEndpoint(patientId, resourceIdFor.bind(this)(patientId))
    }.bind(this);

    // checks a POST endpoint creates resources belonging to patients successfully
    this.creates = function (keys, generateChecker) {
        // setup test patients and users
        auth.setupTestUser(this);
        patients.setupTestPatients(this.user, 1, this);

        // check that requests fail when we don't have write authorization for whatever
        // reason
        var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
            // keep track of number of resources
            before(this.countFunc.bind(this));

            describe("the response", function () {
                requests.failsToCreate(this.endpoint(patientId), factories[modelName](), responseCode, errors, accessToken);
            }.bind(this));

            describe("the database", function () {
                it("has no more records than before", function (done) {
                    this.checkCount(0, done);
                }.bind(this));
            }.bind(this));
        }.bind(this);

        var authChecker = function (patientId) {
            generateChecker(function success(data) {
                // keep track of number of resources
                before(this.countFunc.bind(this));

                describe("the response", function () {
                    requests.successfullyCreates(this.endpoint(patientId), keys, data, this.accessTokenGetter);
                }.bind(this));

                describe("the database", function () {
                    it("has exactly one record inserted", function (done) {
                        this.checkCount(1, done);
                    }.bind(this));
                }.bind(this));
            }.bind(this), function error(data, responseCode, errors) {
                // keep track of number of resources
                before(this.countFunc.bind(this));

                describe("the response", function () {
                    requests.failsToCreate(this.endpoint(patientId), data, responseCode, errors, this.accessTokenGetter);
                }.bind(this));

                describe("the database", function () {
                    it("has no more records than before", function (done) {
                        this.checkCount(0, done);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this);

        patients.requiresPatientAuthorization("write", noAuthChecker, authChecker, this);
    };

    // called after patients.setupTestPatients: for each patient, it creates n resources
    this.setupResources = function (context, n) {
        var collections = ['myPatientsWrite', 'myPatientsRead', 'myPatientsNone', 'otherPatientsWrite', 'otherPatientsRead', 'otherPatientsNone'];
        var resources = context.resources = {};
        before(function (done) {
            // to run in parallel
            var createFunctions = [];
            for (var i = 0; i < collections.length; i++) {
                for (var j = 0; j < n; j++) {
                    // TODO: clean up this block
                    createFunctions.push(function (i, j) {
                        return function (callback) {
                            var patientsSlug = collections[i];
                            var patient = context[patientsSlug][j];

                            patient["create" + className](factories[modelName](), function (err, resource) {
                                if (err) return callback(err);
                                if (typeof resources[patient._id] === 'undefined')
                                    resources[patient._id] = [resource];
                                else
                                    resources[patient._id].push(resource);
                                callback();
                            });
                        };
                    }(i, j));
                }
            }
            async.parallel(createFunctions, done);
        });
    };

    function resourceIdFor(patientId) {
        return function () {
            if (!!(patientId && patientId.constructor && patientId.call && patientId.apply)) patientId = patientId();

            // if we have a resource, return that
            if (patientId in this.resources)
                return this.resources[patientId][0]._id;
            else
                // garbage result for checking authentication
                return 99999;
        }.bind(this);
    };

    // checks a GET view endpoint returns information on single resources
    this.shows = function (keys) {
        // setup test patients, users and resources
        auth.setupTestUser(this);
        patients.setupTestPatients(this.user, 1, this);
        this.setupResources(this, 1);

        // check that requests fail when we don't have read authorization for whatever
        // reason
        var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
            requests.failsToShow(this.resourceEndpoint(patientId), responseCode, errors, accessToken);
        }.bind(this);

        var authChecker = function (patientId) {
            describe(util.format("with valid %s ID", modelName), function () {
                requests.successfullyShows(this.resourceEndpoint(patientId), keys, this.accessTokenGetter);
            }.bind(this));

            describe(util.format("with invalid %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToShow(this.genericEndpoint(patientId, "invaliddoctorid"), 404, error, this.accessTokenGetter);
            }.bind(this));

            describe(util.format("with nonexistent %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToShow(this.genericEndpoint(patientId, 999999), 404, error, this.accessTokenGetter);
            }.bind(this));

        }.bind(this);

        patients.requiresPatientAuthorization("read", noAuthChecker, authChecker, this);
    };

    // checks a DELETE resource endpoint deletes a single resource and returns its information
    this.deletes = function (keys) {
        // setup test patients, users and resources
        auth.setupTestUser(this);
        patients.setupTestPatients(this.user, 1, this);
        this.setupResources(this, 1);

        var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
            // keep track of number of resources
            before(this.countFunc.bind(this));

            describe("the response", function () {
                requests.failsToDelete(this.resourceEndpoint(patientId), responseCode, errors, accessToken);
            }.bind(this));

            describe("the database", function () {
                it("has no fewer records than before", function (done) {
                    this.checkCount(0, done);
                }.bind(this));
            }.bind(this));
        }.bind(this);

        var authChecker = function (patientId) {
            // keep track of number of resources
            before(this.countFunc.bind(this));

            describe(util.format("with valid %s ID", modelName), function () {
                describe("the response", function () {
                    requests.successfullyDeletes(this.resourceEndpoint(patientId), keys, this.accessTokenGetter);
                }.bind(this));

                describe("the database", function () {
                    it("has exactly one record removed", function (done) {
                        this.checkCount(-1, done);
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            describe(util.format("with invalid %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToDelete(this.genericEndpoint(patientId, "invaliddoctorid"), 404, error, this.accessTokenGetter);
            }.bind(this));

            describe(util.format("with nonexistent %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToDelete(this.genericEndpoint(patientId, 999999), 404, error, this.accessTokenGetter);
            }.bind(this));
        }.bind(this);

        patients.requiresPatientAuthorization("write", noAuthChecker, authChecker, this);
    };

    // checks an edit (PUT) resource endpoint edits a single resource
    this.edits = function (keys, testEdit, generateChecker) {
        // setup test patients, users and resources
        auth.setupTestUser(this);
        patients.setupTestPatients(this.user, 1, this);
        this.setupResources(this, 1);

        var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
            // keep track of number of resources
            before(this.countFunc.bind(this));

            requests.failsToEdit(this.resourceEndpoint(patientId), testEdit, responseCode, errors, accessToken);
            // TODO: verify no change
        }.bind(this);

        var authChecker = function (patientId) {
            describe(util.format("with invalid %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToEdit(this.genericEndpoint(patientId, "invaliddoctorid"), testEdit, 404, error, this.accessTokenGetter);
            }.bind(this));

            describe(util.format("with nonexistent %s ID", modelName), function () {
                var error = util.format("invalid_%s_id", modelName);
                requests.failsToEdit(this.genericEndpoint(patientId, 999999), testEdit, 404, error, this.accessTokenGetter);
            }.bind(this));

            generateChecker(function success(data) {
                requests.successfullyEdits(this.resourceEndpoint(patientId), keys, data, this.accessTokenGetter);

                // TODO: verify actually changed
            }.bind(this), function error(data, responseCode, errors) {
                requests.failsToEdit(this.resourceEndpoint(patientId), data, responseCode, errors, this.accessTokenGetter);

                // TODO: verify no change
            }.bind(this));
        }.bind(this);

        patients.requiresPatientAuthorization("write", noAuthChecker, authChecker, this);
    };

    // GET a whole collection of endpoints
    this.lists = function (keys) {
        // setup test patients, users and resources
        auth.setupTestUser(this);
        patients.setupTestPatients(this.user, 1, this);
        this.setupResources(this, 1);

        var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
            requests.failsToList(this.endpoint(patientId), {}, responseCode, errors, accessToken);
        }.bind(this);

        var authChecker = function (patientId) {
            requests.successfullyLists(this.endpoint(patientId), this.collectionName, keys, {}, this.accessTokenGetter);
        }.bind(this);

        patients.requiresPatientAuthorization("read", noAuthChecker, authChecker, this);
    };
};
