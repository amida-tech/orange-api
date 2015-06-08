"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var crud = new Crud("Patient");

// check we successfuly return a response
var showsSuccessfully = function (patientId) {
    crud.successfullyShows(common.endpoint(patientId), ["id", "name", "access"], this.accessTokenGetter);
    // TODO: check access
};
// check we get an error response with the specified error
var showFails = function (patientId, responseCode, errors, accessToken) {
    crud.failsToShow(common.endpoint(patientId), responseCode, errors, accessToken);
};

describe("view patient info (GET /patients/:id)", function () {
    // setup test patients
    auth.setupTestUser(this);
    common.setupTestPatients(this.user, 1, this); // auth.setupTestUser has to be called first

    // wrapper that passes the relevant patients to us
    common.requiresPatientAuthorization('read', showFails, showsSuccessfully.bind(this), this);
});
