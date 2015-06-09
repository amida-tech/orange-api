"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var crud = new Crud("Patient");

// check we successfuly edit the patient and return a response
var editsSuccessfully = function (patientId, data) {
    crud.successfullyEdits(common.endpoint(patientId), ["id", "name", "access"], data, this.accessTokenGetter);
    // TODO: check access
};
// check we can edit successfully for all fields given we should have access to a patient
var authorizedPatientChecker = function (patientId, access) {
    describe("when changing name", function () {
        editsSuccessfully.bind(this)(patientId, {name: "newname"});
    }.bind(this));

    describe("when changing name to blank", function () {
        editFails.bind(this)(patientId, {name: ""}, 400, "name_required", this.accessTokenGetter);
    }.bind(this));

    // by virtue of common.requiresPatientAuthorization, we're only calling this on patients
    // we have write access to
    describe("when changing access", function () {
        describe("changing to invalid access", function () {
            editFails.bind(this)(patientId, {access: "invalidaccess"}, 400, "invalid_access", this.accessTokenGetter);
        }.bind(this));

        describe("changing to read access", function () {
            editsSuccessfully.bind(this)(patientId, {access: "read"});
            // TODO: check access
        }.bind(this));

        describe("changing to no access", function () {
            editsSuccessfully.bind(this)(patientId, {access: "none"});
            // TODO: check access
        }.bind(this));
    }.bind(this));
};

// check we get an error response with the specified error
var editFails = function (patientId, data, responseCode, errors, accessToken) {
    crud.failsToEdit(common.endpoint(patientId), data, responseCode, errors, accessToken);
};
// check we can't perform even a basic edit on a patient (to test authorization)
var basicEditFails = function (patientId, responseCode, errors, accessToken) {
    editFails(patientId, {name: 'newname'}, responseCode, errors, accessToken);
};

describe("edit a patient (PUT /patients/:id)", function () {
    // setup test patients
    auth.setupTestUser(this);
    // creating 3 patients so we can play around with changing statuses above
    common.setupTestPatients(this.user, 3, this); // auth.setupTestUser has to be called first

    // wrapper that passes the relevant patients to us
    common.requiresPatientAuthorization('write', basicEditFails, authorizedPatientChecker, this);
});
