var mongoose    = require("mongoose"),
    expect      = require("chai").expect,
    async       = require("async"),
    util        = require("util"),
    requests    = require("../common/requests.js"),
    factories   = require("../common/factories.js"),
    auth        = require("../common/auth.js"),
    crud        = require("../common/crud.js"),
    patients    = require("../patients/common.js");

var keys = ["wake", "sleep", "breakfast", "lunch", "dinner"];

describe("view patient habits (GET /patients/:patientid/habits)", function () {
    // setup test patients, users and resources
    auth.setupTestUser(this);
    patients.setupTestPatients(this.user, 1, this);

    function endpoint (patientId) {
        return function () {
            // patientId may be a getter function
            if (!!(patientId && patientId.constructor && patientId.call && patientId.apply)) patientId = patientId();
            console.log( util.format("/patients/%s/habits", patientId));
            return util.format("/patients/%s/habits", patientId);
        };
    };

    var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
        requests.failsToShow(endpoint(patientId), responseCode, errors, accessToken);
    }.bind(this);

    var authChecker = function (patientId) {
        requests.successfullyShows(endpoint(patientId), keys, this.accessTokenGetter);
    }.bind(this);

    patients.requiresPatientAuthorization("read", noAuthChecker, authChecker, this);
});
