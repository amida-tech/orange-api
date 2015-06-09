"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var crud = new Crud("Patient");

// check creation succeeds for a given set of patient data
var createsSuccessfully = function (data, accessToken) {
    crud.successfullyCreates("/patients", ["id", "name", "access"], data, accessToken);
    // TODO: test access status is write
};
// check creation fails with the specified error for a given set of patient data
var createFails = async.apply(crud.failsToCreate, "/patients");

describe("create new patient (POST /patients)", function () {
    auth.setupTestUser(this);
    auth.requiresAuthentication(async.apply(createFails, {})); // no data

    describe("with name", function () {
        createsSuccessfully({ name: factories.name() }, this.accessTokenGetter);
    }.bind(this));

    describe("without name", function () {
        createFails({}, 400, "name_required", this.accessTokenGetter);
    }.bind(this));

    describe("with blank name", function () {
        createFails({name: ""}, 400, "name_required", this.accessTokenGetter);
    }.bind(this));
});
