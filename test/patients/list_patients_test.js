"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var crud = new Crud("Patient", "patients");

// check we get a list of patients back as expected
var listsSuccessfully = function (data, accessToken) {
    crud.successfullyLists("/patients", ["id", "name", "access"], data, accessToken);
};
// check we get an error back
var listFails = async.apply(crud.failsToList, "/patients");

describe("list patients (GET /patients)", function () {
    auth.setupTestUser(this);
    auth.requiresAuthentication(async.apply(listFails, {})); // no data
    common.setupTestPatients(this.user, 20, this); // auth.setupTestUser has to be called first

    listsSuccessfully({}, this.accessTokenGetter);


    // TODO test and implement all these
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

    /*
    describe("with name", function () {
        createsSuccessfully({ name: factories.name() }, this.accessTokenGetter);
    }.bind(this));

    describe("without name", function () {
        createFails({}, 400, "name_required", this.accessTokenGetter);
    }.bind(this));
    */
});
