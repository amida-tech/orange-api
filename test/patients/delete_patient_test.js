"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var crud = new Crud("Patient");

// check we successfuly remove the patient and return a response
var deletesSuccessfully = function (patientId) {
    crud.successfullyDeletes(common.endpoint(patientId), ["id", "name", "access"], this.accessTokenGetter);
    // TODO: check access
};
// check we get an error response with the specified error and don't remove the patient
var deleteFails = function (patientId, responseCode, errors, accessToken) {
    crud.failsToDelete(common.endpoint(patientId), responseCode, errors, accessToken);
};

describe("delete a patient (DELETE /patients/:id)", function () {
    // setup test patients
    auth.setupTestUser(this);
    common.setupTestPatients(this.user, 1, this); // auth.setupTestUser has to be called first

    // wrapper that passes the relevant patients to us
    common.requiresPatientAuthorization('write', deleteFails, deletesSuccessfully.bind(this), this);
});
